package service

import (
	"fmt"

	"xqecz-all/internal/repository"
	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
)

// Claim 认领数据模型
type Claim struct {
	ID         uint64  `db:"id" json:"id"`
	ContentID  uint64  `db:"content_id" json:"content_id"`
	UserID     uint64  `db:"user_id" json:"user_id"`
	Reason     string  `db:"reason" json:"reason"`
	Status     string  `db:"status" json:"status"`
	ApprovedBy *uint64 `db:"approved_by" json:"approved_by,omitempty"`
	Remark     string  `db:"remark" json:"remark"`
	CreatedAt  int64   `db:"created_at" json:"created_at"`
	UpdatedAt  int64   `db:"updated_at" json:"updated_at"`
}

// ClaimStatus 认领状态常量
const (
	ClaimStatusPending  = "pending"
	ClaimStatusApproved = "approved"
	ClaimStatusRejected = "rejected"
)

// ClaimService 认领服务
type ClaimService struct {
	db          *sqlx.DB
	contentRepo *repository.ContentRepository
	userRepo    *repository.UserRepository
}

// NewClaimService 创建认领服务实例
func NewClaimService(db *sqlx.DB) *ClaimService {
	return &ClaimService{
		db:          db,
		contentRepo: repository.NewContentRepository(db),
		userRepo:    repository.NewUserRepository(db),
	}
}

// CreateClaim 创建认领申请
func (s *ClaimService) CreateClaim(userID uint64, contentID uint64, reason string) (map[string]interface{}, error) {
	// 验证内容是否存在
	content, err := s.contentRepo.FindByID(contentID)
	if err != nil {
		return nil, fmt.Errorf("内容不存在")
	}

	// 不能认领自己的内容
	if content.UserID == userID {
		return nil, fmt.Errorf("不能认领自己的内容")
	}

	// 检查是否已提交过认领申请
	var count int64
	err = s.db.Get(&count,
		"SELECT COUNT(*) FROM claims WHERE content_id = ? AND user_id = ? AND status = 'pending'",
		contentID, userID,
	)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, fmt.Errorf("您已提交过该内容的认领申请")
	}

	// 创建认领申请
	result, err := s.db.Exec(
		"INSERT INTO claims (content_id, user_id, reason, status, approved_by, remark, created_at, updated_at) VALUES (?, ?, ?, 'pending', NULL, '', NOW(3), NOW(3))",
		contentID, userID, reason,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()

	return map[string]interface{}{
		"id":         id,
		"content_id": contentID,
		"reason":     reason,
		"status":     ClaimStatusPending,
	}, nil
}

// GetClaimList 获取认领列表
func (s *ClaimService) GetClaimList(status string, contentID string, page, pageSize int) (*util.PaginatedResponse, error) {
	// 构建查询条件
	conditions := "1=1"
	args := []interface{}{}

	if status != "" {
		conditions += " AND status = ?"
		args = append(args, status)
	}
	if contentID != "" {
		conditions += " AND content_id = ?"
		args = append(args, contentID)
	}

	// 计算总数
	var total int64
	err := s.db.Get(&total, fmt.Sprintf("SELECT COUNT(*) FROM claims WHERE %s", conditions), args...)
	if err != nil {
		return nil, err
	}

	// 查询列表
	offset := (page - 1) * pageSize
	var claims []Claim
	err = s.db.Select(&claims,
		fmt.Sprintf("SELECT * FROM claims WHERE %s ORDER BY created_at DESC LIMIT ? OFFSET ?", conditions),
		append(args, pageSize, offset)...,
	)
	if err != nil {
		return nil, err
	}

	// 批量查询用户和内容
	userIDs := make([]uint64, 0, len(claims))
	contentIDs := make([]uint64, 0, len(claims))
	for _, claim := range claims {
		userIDs = append(userIDs, claim.UserID)
		contentIDs = append(contentIDs, claim.ContentID)
	}

	usersMap, _ := s.userRepo.BatchFindByIDs(userIDs)
	contentsMap, _ := s.contentRepo.GetContentByIDs(contentIDs)

	claimList := make([]map[string]interface{}, 0, len(claims))
	for _, claim := range claims {
		item := map[string]interface{}{
			"id":         claim.ID,
			"reason":     claim.Reason,
			"status":     claim.Status,
			"created_at": claim.CreatedAt,
		}

		if user, ok := usersMap[claim.UserID]; ok {
			item["user"] = map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
			}
		}

		if content, ok := contentsMap[claim.ContentID]; ok {
			item["content"] = map[string]interface{}{
				"id":          content.ID,
				"title":       content.Title,
				"type":        content.ContentType,
				"audit_status": content.AuditStatus,
			}
		}

		claimList = append(claimList, item)
	}

	totalPage := int64(0)
	if pageSize > 0 {
		totalPage = (total + int64(pageSize) - 1) / int64(pageSize)
	}

	return &util.PaginatedResponse{
		List:      claimList,
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
		TotalPage: totalPage,
	}, nil
}

// HandleClaim 处理认领申请
func (s *ClaimService) HandleClaim(adminID uint64, claimID uint64, action string, remark string) (map[string]interface{}, error) {
	// 查询认领申请
	var claim Claim
	err := s.db.Get(&claim, "SELECT * FROM claims WHERE id = ?", claimID)
	if err != nil {
		return nil, fmt.Errorf("认领申请不存在")
	}

	// 检查是否已处理
	if claim.Status != ClaimStatusPending {
		return nil, fmt.Errorf("该申请已处理")
	}

	var newStatus string
	if action == "approve" {
		newStatus = ClaimStatusApproved
		// 更新内容作者
		s.db.Exec(
			"UPDATE contents SET user_id = ?, updated_at = NOW(3) WHERE id = ?",
			claim.UserID, claim.ContentID,
		)
		// 拒绝其他待处理的认领申请
		s.db.Exec(
			"UPDATE claims SET status = 'rejected', updated_at = NOW(3) WHERE content_id = ? AND id != ? AND status = 'pending'",
			claim.ContentID, claimID,
		)
	} else if action == "reject" {
		newStatus = ClaimStatusRejected
	} else {
		return nil, fmt.Errorf("无效的操作类型")
	}

	// 更新认领申请状态
	_, err = s.db.Exec(
		"UPDATE claims SET status = ?, approved_by = ?, remark = ?, updated_at = NOW(3) WHERE id = ?",
		newStatus, adminID, remark, claimID,
	)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":     claimID,
		"status": newStatus,
		"remark": remark,
	}, nil
}
