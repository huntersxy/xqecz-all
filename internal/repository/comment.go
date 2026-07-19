package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// Comment 评论数据模型
type Comment struct {
	ID        uint64       `db:"id" json:"id"`
	ContentID uint64       `db:"content_id" json:"content_id"`
	UserID    uint64       `db:"user_id" json:"user_id"`
	Text      string       `db:"text" json:"text"`
	ParentID  sql.NullInt64 `db:"parent_id" json:"parent_id,omitempty"`
	IsBanned  bool         `db:"is_banned" json:"is_banned"`
	CreatedAt time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt time.Time    `db:"updated_at" json:"updated_at"`
	DeletedAt sql.NullTime `db:"deleted_at" json:"-"`
}

// CommentWithUser 带用户信息的评论
type CommentWithUser struct {
	Comment
	UserID2  sql.NullInt64  `db:"u_id" json:"-"`
	Username sql.NullString `db:"u_username" json:"-"`
}

// CommentReport 评论举报数据模型
type CommentReport struct {
	ID        uint64       `db:"id" json:"id"`
	CommentID uint64       `db:"comment_id" json:"comment_id"`
	UserID    uint64       `db:"user_id" json:"user_id"`
	Reason    string       `db:"reason" json:"reason"`
	Handled   bool         `db:"handled" json:"handled"`
	CreatedAt time.Time    `db:"created_at" json:"created_at"`
	DeletedAt sql.NullTime `db:"deleted_at" json:"-"`
}

// CommentRepository 评论数据访问层
type CommentRepository struct {
	db *sqlx.DB
}

// NewCommentRepository 创建评论仓库实例
func NewCommentRepository(db *sqlx.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

// FindByID 根据ID查找评论
func (r *CommentRepository) FindByID(id uint64) (*Comment, error) {
	var comment Comment
	err := r.db.Get(&comment, "SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL", id)
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

// Create 创建评论
func (r *CommentRepository) Create(contentID, userID uint64, text string, parentID *uint64) (uint64, error) {
	result, err := r.db.Exec(
		"INSERT INTO comments (content_id, user_id, text, parent_id, is_banned, created_at, updated_at) VALUES (?, ?, ?, ?, 0, NOW(3), NOW(3))",
		contentID, userID, text, parentID,
	)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return uint64(id), nil
}

// Delete 删除评论（软删除）
func (r *CommentRepository) Delete(id uint64) error {
	_, err := r.db.Exec("UPDATE comments SET deleted_at = NOW(3) WHERE id = ?", id)
	return err
}

// UpdateBanStatus 更新评论封禁状态
func (r *CommentRepository) UpdateBanStatus(id uint64, isBanned bool) error {
	_, err := r.db.Exec("UPDATE comments SET is_banned = ? WHERE id = ?", isBanned, id)
	return err
}

// ListByContentID 获取内容的评论列表（带用户信息，分页）
func (r *CommentRepository) ListByContentID(contentID uint64, page, pageSize int) ([]CommentWithUser, int64, error) {
	// 计算根评论总数
	var total int64
	err := r.db.Get(&total,
		"SELECT COUNT(*) FROM comments WHERE content_id = ? AND parent_id IS NULL AND is_banned = 0 AND deleted_at IS NULL",
		contentID,
	)
	if err != nil {
		return nil, 0, err
	}

	// 获取根评论
	offset := (page - 1) * pageSize
	var rootComments []CommentWithUser
	err = r.db.Select(&rootComments,
		`SELECT c.*, u.id as u_id, u.username as u_username
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE c.content_id = ? AND c.parent_id IS NULL AND c.is_banned = 0 AND c.deleted_at IS NULL
		ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
		contentID, pageSize, offset,
	)
	if err != nil {
		return nil, 0, err
	}

	return rootComments, total, nil
}

// ListAllRepliesByContentID 获取内容的所有回复
func (r *CommentRepository) ListAllRepliesByContentID(contentID uint64) ([]CommentWithUser, error) {
	var replies []CommentWithUser
	err := r.db.Select(&replies,
		`SELECT c.*, u.id as u_id, u.username as u_username
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE c.content_id = ? AND c.parent_id IS NOT NULL AND c.is_banned = 0 AND c.deleted_at IS NULL
		ORDER BY c.created_at ASC`,
		contentID,
	)
	if err != nil {
		return nil, err
	}
	return replies, nil
}

// CountByContentID 获取内容的评论总数
func (r *CommentRepository) CountByContentID(contentID uint64) (int64, error) {
	var count int64
	err := r.db.Get(&count,
		"SELECT COUNT(*) FROM comments WHERE content_id = ? AND deleted_at IS NULL",
		contentID,
	)
	return count, err
}

// CreateReport 创建评论举报
func (r *CommentRepository) CreateReport(commentID, userID uint64, reason string) (uint64, error) {
	result, err := r.db.Exec(
		"INSERT INTO comment_reports (comment_id, user_id, reason, handled, created_at) VALUES (?, ?, ?, 0, NOW(3))",
		commentID, userID, reason,
	)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return uint64(id), nil
}

// FindReportByID 根据ID查找举报
func (r *CommentRepository) FindReportByID(id uint64) (*CommentReport, error) {
	var report CommentReport
	err := r.db.Get(&report, "SELECT * FROM comment_reports WHERE id = ?", id)
	if err != nil {
		return nil, err
	}
	return &report, nil
}

// CountReportsByUser 检查用户是否已举报过某评论
func (r *CommentRepository) CountReportsByUser(commentID, userID uint64) (int64, error) {
	var count int64
	err := r.db.Get(&count,
		"SELECT COUNT(*) FROM comment_reports WHERE comment_id = ? AND user_id = ?",
		commentID, userID,
	)
	return count, err
}

// ListUnhandlexReports 获取未处理的举报列表
func (r *CommentRepository) ListUnhandlexReports() ([]CommentReport, error) {
	var reports []CommentReport
	err := r.db.Select(&reports,
		"SELECT * FROM comment_reports WHERE handled = 0 ORDER BY created_at DESC",
	)
	if err != nil {
		return nil, err
	}
	return reports, nil
}

// HandleReport 处理举报
func (r *CommentRepository) HandleReport(id uint64) error {
	_, err := r.db.Exec("UPDATE comment_reports SET handled = 1 WHERE id = ?", id)
	return err
}

// BatchFindByIDs 批量查找评论
func (r *CommentRepository) BatchFindByIDs(ids []uint64) (map[uint64]*CommentWithUser, error) {
	if len(ids) == 0 {
		return make(map[uint64]*CommentWithUser), nil
	}

	query, args, err := sqlx.In(
		`SELECT c.*, u.id as u_id, u.username as u_username
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.id IN (?)`,
		ids,
	)
	if err != nil {
		return nil, err
	}

	var comments []CommentWithUser
	err = r.db.Select(&comments, r.db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}

	result := make(map[uint64]*CommentWithUser)
	for i := range comments {
		result[comments[i].ID] = &comments[i]
	}
	return result, nil
}

// BatchGetCommentCounts 批量获取评论数量
func (r *CommentRepository) BatchGetCommentCounts(contentIDs []uint64) (map[uint64]int64, error) {
	if len(contentIDs) == 0 {
		return make(map[uint64]int64), nil
	}

	query, args, err := sqlx.In(
		"SELECT content_id, COUNT(*) as cnt FROM comments WHERE content_id IN (?) AND deleted_at IS NULL GROUP BY content_id",
		contentIDs,
	)
	if err != nil {
		return nil, err
	}

	var rows []struct {
		ContentID uint64 `db:"content_id"`
		Count     int64  `db:"cnt"`
	}
	err = r.db.Select(&rows, r.db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}

	result := make(map[uint64]int64)
	for _, row := range rows {
		result[row.ContentID] = row.Count
	}
	return result, nil
}

// DeleteByContentID 删除内容的所有评论
func (r *CommentRepository) DeleteByContentID(contentID uint64) error {
	_, err := r.db.Exec("DELETE FROM comments WHERE content_id = ? AND deleted_at IS NULL", contentID)
	return err
}

// 辅助函数：构建评论列表SQL
func buildCommentListSQL(contentID uint64, page, pageSize int) string {
	offset := (page - 1) * pageSize
	return fmt.Sprintf(
		`SELECT c.*, u.id as u_id, u.username as u_username
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE c.content_id = %d AND c.parent_id IS NULL AND c.is_banned = 0 AND c.deleted_at IS NULL
		ORDER BY c.created_at DESC LIMIT %d OFFSET %d`,
		contentID, pageSize, offset,
	)
}
