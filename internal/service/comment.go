package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"xqecz-all/internal/repository"
	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
)

// CommentService 评论服务
type CommentService struct {
	commentRepo *repository.CommentRepository
	contentRepo *repository.ContentRepository
	userRepo    *repository.UserRepository
}

// NewCommentService 创建评论服务实例
func NewCommentService(db *sqlx.DB) *CommentService {
	return &CommentService{
		commentRepo: repository.NewCommentRepository(db),
		contentRepo: repository.NewContentRepository(db),
		userRepo:    repository.NewUserRepository(db),
	}
}

// AddCommentRequest 添加评论请求
type AddCommentRequest struct {
	ContentID uint64 `json:"content_id"`
	Text      string `json:"text"`
	ParentID  *uint64 `json:"parent_id,omitempty"`
}

// ReportCommentRequest 举报评论请求
type ReportCommentRequest struct {
	CommentID uint64 `json:"comment_id"`
	Reason    string `json:"reason"`
}

// CommentListQuery 评论列表查询参数
type CommentListQuery struct {
	Page     string `json:"page"`
	PageSize string `json:"page_size"`
}

// AddComment 添加评论
func (s *CommentService) AddComment(userID uint64, req AddCommentRequest) (map[string]interface{}, error) {
	// 验证内容是否存在且已审核
	content, err := s.contentRepo.FindByID(req.ContentID)
	if err != nil {
		return nil, errors.New("内容不存在或未通过审核")
	}
	if content.AuditStatus != repository.AuditStatusApproved {
		return nil, errors.New("内容不存在或未通过审核")
	}

	// 验证评论内容
	if req.Text == "" {
		return nil, errors.New("评论内容不能为空")
	}
	if len(req.Text) > 5000 {
		return nil, errors.New("评论内容过长（最大5000字符）")
	}

	// 创建评论
	commentID, err := s.commentRepo.Create(req.ContentID, userID, req.Text, req.ParentID)
	if err != nil {
		return nil, errors.New("添加评论失败")
	}

	// 清除评论缓存
	go util.ClearCommentCache(req.ContentID)

	return map[string]interface{}{
		"id":         commentID,
		"content_id": req.ContentID,
		"user_id":    userID,
		"text":       req.Text,
		"parent_id":  req.ParentID,
		"is_banned":  false,
	}, nil
}

// GetComments 获取评论列表
func (s *CommentService) GetComments(contentID uint64, query CommentListQuery) (*util.PaginatedResponse, error) {
	pag := util.ParsePagination(query.Page, query.PageSize, 20, 50)

	// 检查缓存
	cacheKey := fmt.Sprintf("comments:%d:page:%d:size:%d", contentID, pag.Page, pag.PageSize)
	if cached, err := util.GetCache(cacheKey); err == nil {
		var result util.PaginatedResponse
		if err := json.Unmarshal([]byte(cached), &result); err == nil {
			return &result, nil
		}
	}

	// 获取根评论
	rootComments, total, err := s.commentRepo.ListByContentID(contentID, pag.Page, pag.PageSize)
	if err != nil {
		return nil, err
	}

	// 获取所有回复
	allReplies, err := s.commentRepo.ListAllRepliesByContentID(contentID)
	if err != nil {
		return nil, err
	}

	// 构建回复映射
	rootIDMap := make(map[uint64]int)
	for i, c := range rootComments {
		rootIDMap[c.ID] = i
	}

	replyByID := make(map[uint64]int)
	for i, r := range allReplies {
		replyByID[r.ID] = i
	}

	repliesMap := make(map[uint64][]map[string]interface{})
	for _, reply := range allReplies {
		replyItem := map[string]interface{}{
			"id":      reply.ID,
			"user_id": reply.UserID,
			"user": map[string]interface{}{
				"id":       reply.UserID,
				"username": reply.Username.String,
			},
			"text":      reply.Text,
			"parent_id": reply.ParentID.Int64,
			"is_banned": reply.IsBanned,
			"created_at": reply.CreatedAt.Unix(),
		}

		// 找到根评论ID
		rootID := findRootID(reply.ParentID.Int64, allReplies, replyByID, rootIDMap)
		if _, ok := rootIDMap[rootID]; ok {
			repliesMap[rootID] = append(repliesMap[rootID], replyItem)
		}
	}

	// 构建结果
	list := make([]map[string]interface{}, 0, len(rootComments))
	for _, root := range rootComments {
		replies := repliesMap[root.ID]
		if replies == nil {
			replies = []map[string]interface{}{}
		}

		list = append(list, map[string]interface{}{
			"id":      root.ID,
			"user_id": root.UserID,
			"user": map[string]interface{}{
				"id":       root.UserID,
				"username": root.Username.String,
			},
			"text":      root.Text,
			"parent_id": root.ParentID.Int64,
			"replies":   replies,
			"is_banned": root.IsBanned,
			"created_at": root.CreatedAt.Unix(),
		})
	}

	totalPage := util.TotalPages(total, pag.PageSize)
	response := &util.PaginatedResponse{
		List:      list,
		Total:     total,
		Page:      pag.Page,
		PageSize:  pag.PageSize,
		TotalPage: totalPage,
	}

	// 缓存1小时
	go func() {
		data, _ := json.Marshal(response)
		util.SetCache(cacheKey, string(data), time.Hour)
	}()

	return response, nil
}

// GetCommentCount 获取评论数量
func (s *CommentService) GetCommentCount(contentID uint64) (int64, error) {
	// 检查缓存
	cacheKey := fmt.Sprintf("comment_count:%d", contentID)
	if cached, err := util.GetCache(cacheKey); err == nil {
		var count int64
		if err := json.Unmarshal([]byte(cached), &count); err == nil {
			return count, nil
		}
	}

	count, err := s.commentRepo.CountByContentID(contentID)
	if err != nil {
		return 0, err
	}

	// 缓存5分钟
	go func() {
		data, _ := json.Marshal(count)
		util.SetCache(cacheKey, string(data), 5*time.Minute)
	}()

	return count, nil
}

// DeleteComment 删除评论
func (s *CommentService) DeleteComment(userID uint64, commentID uint64, isAdmin bool) error {
	comment, err := s.commentRepo.FindByID(commentID)
	if err != nil {
		return errors.New("评论不存在")
	}

	if !isAdmin && comment.UserID != userID {
		return errors.New("无权删除此评论")
	}

	if err := s.commentRepo.Delete(commentID); err != nil {
		return err
	}

	// 清除评论缓存
	go util.ClearCommentCache(comment.ContentID)

	return nil
}

// ReportComment 举报评论
func (s *CommentService) ReportComment(userID uint64, req ReportCommentRequest) (map[string]interface{}, error) {
	// 验证评论是否存在
	comment, err := s.commentRepo.FindByID(req.CommentID)
	if err != nil {
		return nil, errors.New("评论不存在")
	}

	// 检查是否已举报
	count, _ := s.commentRepo.CountReportsByUser(req.CommentID, userID)
	if count > 0 {
		return nil, errors.New("您已举报过此评论")
	}

	// 不能举报自己的评论
	if comment.UserID == userID {
		return nil, errors.New("不能举报自己的评论")
	}

	reason := req.Reason
	if reason == "" {
		reason = "其他"
	}

	reportID, err := s.commentRepo.CreateReport(req.CommentID, userID, reason)
	if err != nil {
		return nil, errors.New("举报失败")
	}

	return map[string]interface{}{
		"id":         reportID,
		"comment_id": req.CommentID,
		"user_id":    userID,
		"reason":     reason,
	}, nil
}

// GetCommentReports 获取评论举报列表（管理员）
func (s *CommentService) GetCommentReports() ([]map[string]interface{}, error) {
	reports, err := s.commentRepo.ListUnhandlexReports()
	if err != nil {
		return nil, err
	}

	// 批量查询评论和举报者
	commentIDs := make([]uint64, 0, len(reports))
	reporterIDs := make([]uint64, 0, len(reports))
	for _, r := range reports {
		commentIDs = append(commentIDs, r.CommentID)
		reporterIDs = append(reporterIDs, r.UserID)
	}

	commentsMap, _ := s.commentRepo.BatchFindByIDs(commentIDs)
	usersMap, _ := s.userRepo.BatchFindByIDs(reporterIDs)

	result := make([]map[string]interface{}, 0, len(reports))
	for _, report := range reports {
		item := map[string]interface{}{
			"id":         report.ID,
			"comment_id": report.CommentID,
			"user_id":    report.UserID,
			"reason":     report.Reason,
			"handled":    report.Handled,
			"created_at": report.CreatedAt.Unix(),
		}

		if comment, ok := commentsMap[report.CommentID]; ok {
			item["comment"] = map[string]interface{}{
				"id":      comment.ID,
				"user_id": comment.UserID,
				"text":    comment.Text,
				"user": map[string]interface{}{
					"id":       comment.UserID,
					"username": comment.Username.String,
				},
			}
		}

		if user, ok := usersMap[report.UserID]; ok {
			item["user"] = map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
			}
		}

		result = append(result, item)
	}

	return result, nil
}

// HandleReport 处理举报（管理员）
func (s *CommentService) HandleReport(reportID uint64) (map[string]interface{}, error) {
	report, err := s.commentRepo.FindReportByID(reportID)
	if err != nil {
		return nil, errors.New("举报不存在")
	}

	if err := s.commentRepo.HandleReport(reportID); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":         report.ID,
		"comment_id": report.CommentID,
		"user_id":    report.UserID,
		"reason":     report.Reason,
		"handled":    true,
	}, nil
}

// 辅助函数：找到根评论ID
func findRootID(parentID int64, allReplies []repository.CommentWithUser, replyByID map[uint64]int, rootIDMap map[uint64]int) uint64 {
	current := uint64(parentID)
	for i := 0; i < 100; i++ {
		if _, ok := rootIDMap[current]; ok {
			return current
		}
		idx, ok := replyByID[current]
		if !ok {
			break
		}
		if !allReplies[idx].ParentID.Valid {
			break
		}
		current = uint64(allReplies[idx].ParentID.Int64)
	}
	return current
}
