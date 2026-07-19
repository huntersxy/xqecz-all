package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// 内容类型常量
const (
	ContentTypeVideo = "video"
	ContentTypeImage = "image"
	ContentTypeText  = "text"
	ContentTypeLink  = "link"
)

// 审核状态常量
const (
	AuditStatusPending  = "pending"
	AuditStatusApproved = "approved"
	AuditStatusRejected = "rejected"
)

// Content 内容数据模型
type Content struct {
	ID             uint64         `db:"id" json:"id"`
	Title          string         `db:"title" json:"title"`
	ContentType    string         `db:"type" json:"type"`
	Content        sql.NullString `db:"content" json:"content,omitempty"`
	FilePath       sql.NullString `db:"file_path" json:"file_path,omitempty"`
	FileSize       int64          `db:"file_size" json:"file_size,omitempty"`
	ThumbPath      sql.NullString `db:"thumb_path" json:"thumb_path,omitempty"`
	CompressedPath sql.NullString `db:"compressed_path" json:"compressed_path,omitempty"`
	Url            sql.NullString `db:"url" json:"url,omitempty"`
	Platform       sql.NullString `db:"platform" json:"platform,omitempty"`
	ViewCount      int64          `db:"view_count" json:"view_count"`
	UserID         uint64         `db:"user_id" json:"user_id"`
	BigTagID       sql.NullInt64  `db:"big_tag_id" json:"big_tag_id,omitempty"`
	SmallTagID     sql.NullInt64  `db:"small_tag_id" json:"small_tag_id,omitempty"`
	Tags           sql.NullString `db:"tags" json:"tags,omitempty"`
	AuditStatus    string         `db:"audit_status" json:"audit_status"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
	DeletedAt      sql.NullTime   `db:"deleted_at" json:"-"`
}

// ContentWithUser 带用户信息的内容
type ContentWithUser struct {
	Content
	UserID2  sql.NullInt64  `db:"u_id" json:"-"`
	Username sql.NullString `db:"u_username" json:"-"`
	IsAdmin  sql.NullBool   `db:"u_is_admin" json:"-"`
}

// GetTags 获取标签列表
func (c *Content) GetTags() []string {
	if !c.Tags.Valid || c.Tags.String == "" {
		return []string{}
	}
	var tags []string
	json.Unmarshal([]byte(c.Tags.String), &tags)
	return tags
}

// ContentRepository 内容数据访问层
type ContentRepository struct {
	db *sqlx.DB
}

// NewContentRepository 创建内容仓库实例
func NewContentRepository(db *sqlx.DB) *ContentRepository {
	return &ContentRepository{db: db}
}

// GetDB 获取数据库连接
func (r *ContentRepository) GetDB() *sqlx.DB {
	return r.db
}

// FindByID 根据ID查找内容
func (r *ContentRepository) FindByID(id uint64) (*Content, error) {
	var content Content
	err := r.db.Get(&content, "SELECT * FROM contents WHERE id = ? AND deleted_at IS NULL", id)
	if err != nil {
		return nil, err
	}
	return &content, nil
}

// FindByIDWithUser 根据ID查找内容（带用户信息）
func (r *ContentRepository) FindByIDWithUser(id uint64) (*ContentWithUser, error) {
	var content ContentWithUser
	sql := `SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE c.id = ? AND c.deleted_at IS NULL`
	err := r.db.Get(&content, sql, id)
	if err != nil {
		return nil, err
	}
	return &content, nil
}

// Create 创建内容
func (r *ContentRepository) Create(content *Content) (uint64, error) {
	result, err := r.db.Exec(
		`INSERT INTO contents (title, type, content, file_path, file_size, thumb_path, url, platform, compressed_path, user_id, audit_status, tags, view_count, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 0, NOW(3), NOW(3))`,
		content.Title, content.ContentType, content.Content,
		content.FilePath, content.FileSize, content.ThumbPath,
		content.Url, content.Platform,
		content.UserID, content.AuditStatus, content.Tags,
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

// Update 更新内容
func (r *ContentRepository) Update(content *Content) error {
	_, err := r.db.Exec(
		`UPDATE contents SET title=?, type=?, content=?, file_path=?, file_size=?, thumb_path=?, url=?, platform=?, compressed_path=?, user_id=?, audit_status=?, tags=?, updated_at=NOW(3) WHERE id=?`,
		content.Title, content.ContentType, content.Content,
		content.FilePath, content.FileSize, content.ThumbPath,
		content.Url, content.Platform, content.CompressedPath,
		content.UserID, content.AuditStatus, content.Tags,
		content.ID,
	)
	return err
}

// Delete 删除内容（软删除）
func (r *ContentRepository) Delete(id uint64) error {
	_, err := r.db.Exec("UPDATE contents SET deleted_at = NOW(3), updated_at = NOW(3) WHERE id = ?", id)
	return err
}

// UpdateAuditStatus 更新审核状态
func (r *ContentRepository) UpdateAuditStatus(id uint64, status string) error {
	_, err := r.db.Exec("UPDATE contents SET audit_status = ?, updated_at = NOW(3) WHERE id = ?", status, id)
	return err
}

// UpdateThumbnail 更新缩略图
func (r *ContentRepository) UpdateThumbnail(id uint64, thumbPath string) error {
	_, err := r.db.Exec("UPDATE contents SET thumb_path = ?, updated_at = NOW(3) WHERE id = ?", thumbPath, id)
	return err
}

// UpdateAuthor 更新内容作者
func (r *ContentRepository) UpdateAuthor(id uint64, userID uint64) error {
	_, err := r.db.Exec("UPDATE contents SET user_id = ?, updated_at = NOW(3) WHERE id = ?", userID, id)
	return err
}

// IncrementViewCount 增加浏览次数
func (r *ContentRepository) IncrementViewCount(id uint64) error {
	_, err := r.db.Exec("UPDATE contents SET view_count = view_count + 1 WHERE id = ?", id)
	return err
}

// ContentListQuery 内容列表查询参数
type ContentListQuery struct {
	AuditStatus string
	Tag         string
	ContentType string
	Keyword     string
	SortBy      string
	Order       string
	Page        int
	PageSize    int
}

// List 获取内容列表
func (r *ContentRepository) List(query ContentListQuery) ([]ContentWithUser, int64, error) {
	var conditions []string
	var args []interface{}

	conditions = append(conditions, "c.deleted_at IS NULL")

	// 审核状态过滤
	if query.AuditStatus == AuditStatusApproved {
		conditions = append(conditions, "c.audit_status = ?")
		args = append(args, AuditStatusApproved)
	} else {
		conditions = append(conditions, "c.audit_status IN ('approved', 'pending')")
	}

	// 标签过滤
	if query.Tag != "" {
		for _, t := range strings.Split(query.Tag, ",") {
			t = strings.TrimSpace(t)
			if t != "" {
				conditions = append(conditions, "JSON_CONTAINS(c.tags, ?)")
				args = append(args, fmt.Sprintf(`"%s"`, t))
			}
		}
	}

	// 类型过滤
	if query.ContentType != "" {
		conditions = append(conditions, "c.type = ?")
		args = append(args, query.ContentType)
	}

	// 关键词搜索
	if query.Keyword != "" {
		keyword := sanitizeSearchInput(query.Keyword)
		conditions = append(conditions, "(c.title LIKE ? OR c.content LIKE ?)")
		args = append(args, "%"+keyword+"%", "%"+keyword+"%")
	}

	whereClause := strings.Join(conditions, " AND ")

	// 排序
	sortBy := "created_at"
	order := "desc"
	if query.SortBy != "" {
		allowedFields := map[string]bool{"created_at": true, "updated_at": true, "view_count": true, "id": true}
		if allowedFields[query.SortBy] {
			sortBy = query.SortBy
		}
	}
	if query.Order == "asc" {
		order = "asc"
	}
	orderClause := fmt.Sprintf("c.%s %s", sortBy, order)

	// 计算总数
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM contents c WHERE %s", whereClause)
	var total int64
	err := r.db.Get(&total, countSQL, args...)
	if err != nil {
		return nil, 0, err
	}

	// 查询列表
	offset := (query.Page - 1) * query.PageSize
	dataSQL := fmt.Sprintf(
		`SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE %s ORDER BY %s LIMIT ? OFFSET ?`,
		whereClause, orderClause,
	)
	args = append(args, query.PageSize, offset)

	var contents []ContentWithUser
	err = r.db.Select(&contents, dataSQL, args...)
	if err != nil {
		return nil, 0, err
	}

	return contents, total, nil
}

// ListByUserID 获取用户的内容列表
func (r *ContentRepository) ListByUserID(userID uint64, contentType, auditStatus string, page, pageSize int) ([]ContentWithUser, int64, error) {
	var conditions []string
	var args []interface{}

	conditions = append(conditions, "c.deleted_at IS NULL", "c.user_id = ?")
	args = append(args, userID)

	if contentType != "" {
		conditions = append(conditions, "c.type = ?")
		args = append(args, contentType)
	}
	if auditStatus != "" {
		conditions = append(conditions, "c.audit_status = ?")
		args = append(args, auditStatus)
	}

	whereClause := strings.Join(conditions, " AND ")

	// 计算总数
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM contents c WHERE %s", whereClause)
	var total int64
	err := r.db.Get(&total, countSQL, args...)
	if err != nil {
		return nil, 0, err
	}

	// 查询列表
	offset := (page - 1) * pageSize
	dataSQL := fmt.Sprintf(
		`SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE %s ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
		whereClause,
	)
	args = append(args, pageSize, offset)

	var contents []ContentWithUser
	err = r.db.Select(&contents, dataSQL, args...)
	if err != nil {
		return nil, 0, err
	}

	return contents, total, nil
}

// Search 搜索内容
func (r *ContentRepository) Search(keyword string, page, pageSize int) ([]ContentWithUser, int64, error) {
	keyword = sanitizeSearchInput(keyword)

	whereClause := "c.audit_status IN ('approved', 'pending') AND c.deleted_at IS NULL AND (c.title LIKE ? OR c.content LIKE ?)"
	keywordPattern := "%" + keyword + "%"

	// 计算总数
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM contents c WHERE %s", whereClause)
	var total int64
	err := r.db.Get(&total, countSQL, keywordPattern, keywordPattern)
	if err != nil {
		return nil, 0, err
	}

	// 查询列表
	offset := (page - 1) * pageSize
	dataSQL := fmt.Sprintf(
		`SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE %s ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
		whereClause,
	)

	var contents []ContentWithUser
	err = r.db.Select(&contents, dataSQL, keywordPattern, keywordPattern, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	return contents, total, nil
}

// GetPending 获取待审核内容
func (r *ContentRepository) GetPending(page, pageSize int) ([]ContentWithUser, int64, error) {
	whereClause := "c.audit_status = 'pending' AND c.deleted_at IS NULL"

	// 计算总数
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM contents c WHERE %s", whereClause)
	var total int64
	err := r.db.Get(&total, countSQL)
	if err != nil {
		return nil, 0, err
	}

	// 查询列表
	offset := (page - 1) * pageSize
	dataSQL := fmt.Sprintf(
		`SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE %s ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
		whereClause,
	)

	var contents []ContentWithUser
	err = r.db.Select(&contents, dataSQL, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	return contents, total, nil
}

// GetRecommend 获取推荐内容
func (r *ContentRepository) GetRecommend(start, count int64) ([]ContentWithUser, error) {
	sql := `SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE c.audit_status = 'approved' AND c.deleted_at IS NULL
		ORDER BY c.created_at DESC LIMIT ? OFFSET ?`

	var contents []ContentWithUser
	err := r.db.Select(&contents, sql, count, start)
	if err != nil {
		return nil, err
	}
	return contents, nil
}

// GetRecommendByIDs 根据ID列表获取推荐内容
func (r *ContentRepository) GetRecommendByIDs(ids []uint64) ([]ContentWithUser, error) {
	if len(ids) == 0 {
		return []ContentWithUser{}, nil
	}

	query, args, err := sqlx.In(
		`SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id AND u.deleted_at IS NULL
		WHERE c.id IN (?) AND c.deleted_at IS NULL`,
		ids,
	)
	if err != nil {
		return nil, err
	}

	var contents []ContentWithUser
	err = r.db.Select(&contents, r.db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}
	return contents, nil
}

// GetAllTags 获取所有标签
func (r *ContentRepository) GetAllTags() ([]string, error) {
	var rows []struct {
		Tags string `db:"tags"`
	}
	err := r.db.Select(&rows, "SELECT tags FROM contents WHERE deleted_at IS NULL AND tags IS NOT NULL AND tags != '' AND tags != '[]'")
	if err != nil {
		return nil, err
	}

	tagSet := make(map[string]bool)
	for _, row := range rows {
		// 简单解析JSON数组
		tags := parseJSONArray(row.Tags)
		for _, tag := range tags {
			if tag != "" {
				tagSet[tag] = true
			}
		}
	}

	tags := make([]string, 0, len(tagSet))
	for tag := range tagSet {
		tags = append(tags, tag)
	}
	return tags, nil
}

// GetContentByIDs 根据ID列表获取内容
func (r *ContentRepository) GetContentByIDs(ids []uint64) (map[uint64]*ContentWithUser, error) {
	if len(ids) == 0 {
		return make(map[uint64]*ContentWithUser), nil
	}

	query, args, err := sqlx.In(
		`SELECT c.*, u.id as u_id, u.username as u_username, u.is_admin as u_is_admin
		FROM contents c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.id IN (?)`,
		ids,
	)
	if err != nil {
		return nil, err
	}

	var contents []ContentWithUser
	err = r.db.Select(&contents, r.db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}

	result := make(map[uint64]*ContentWithUser)
	for i := range contents {
		result[contents[i].ID] = &contents[i]
	}
	return result, nil
}

// PurgeDeleted 清理已删除的内容
func (r *ContentRepository) PurgeDeleted() (int64, error) {
	result, err := r.db.Exec("DELETE FROM contents WHERE deleted_at IS NOT NULL")
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// GetAllContents 获取所有内容（包括已删除）
func (r *ContentRepository) GetAllContents() ([]Content, error) {
	var contents []Content
	err := r.db.Select(&contents, "SELECT id, title, type, content, file_path, file_size, thumb_path, compressed_path, url, platform, view_count, user_id, big_tag_id, small_tag_id, tags, audit_status, created_at, updated_at, deleted_at FROM contents")
	if err != nil {
		return nil, err
	}
	return contents, nil
}

// 辅助函数：清理搜索输入
func sanitizeSearchInput(input string) string {
	input = strings.TrimSpace(input)
	input = strings.ReplaceAll(input, "\\", "\\\\")
	input = strings.ReplaceAll(input, "%", "\\%")
	input = strings.ReplaceAll(input, "_", "\\_")
	return input
}

// 辅助函数：解析JSON数组
func parseJSONArray(s string) []string {
	s = strings.TrimSpace(s)
	if s == "" || s == "[]" {
		return nil
	}
	// 简单解析 ["tag1","tag2"] 格式
	s = strings.TrimPrefix(s, "[")
	s = strings.TrimSuffix(s, "]")
	s = strings.ReplaceAll(s, "\"", "")
	parts := strings.Split(s, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}
