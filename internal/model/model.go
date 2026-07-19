package model

import (
	"database/sql"
	"time"

	"github.com/bytedance/sonic"
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

// Claim状态常量
const (
	ClaimStatusPending  = "pending"
	ClaimStatusApproved = "approved"
	ClaimStatusRejected = "rejected"
)

// 通知类型常量
const (
	NotifTypeComment = "comment"
	NotifTypeReply   = "reply"
	NotifTypeAudit   = "audit"
)

// User 用户模型
type User struct {
	ID        uint64        `db:"id" json:"id"`
	Username  string        `db:"username" json:"username"`
	Password  string        `db:"password" json:"-"`
	IsAdmin   bool          `db:"is_admin" json:"is_admin"`
	IsBanned  bool          `db:"is_banned" json:"is_banned"`
	CreatedAt time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt time.Time     `db:"updated_at" json:"updated_at"`
	DeletedAt sql.NullTime  `db:"deleted_at" json:"-"`
}

// Content 内容模型
type Content struct {
	ID             uint64        `db:"id" json:"id"`
	Title          string        `db:"title" json:"title"`
	ContentType    string        `db:"type" json:"type"`
	Content        string        `db:"content" json:"content,omitempty"`
	FilePath       string        `db:"file_path" json:"file_path,omitempty"`
	FileSize       int64         `db:"file_size" json:"file_size,omitempty"`
	ThumbPath      string        `db:"thumb_path" json:"thumb_path,omitempty"`
	CompressedPath string        `db:"compressed_path" json:"compressed_path,omitempty"`
	Url            string        `db:"url" json:"url,omitempty"`
	Platform       string        `db:"platform" json:"platform,omitempty"`
	ViewCount      int64         `db:"view_count" json:"view_count"`
	UserID         uint64        `db:"user_id" json:"user_id"`
	BigTagID       sql.NullInt64 `db:"big_tag_id" json:"big_tag_id,omitempty"`
	SmallTagID     sql.NullInt64 `db:"small_tag_id" json:"small_tag_id,omitempty"`
	Tags           string        `db:"tags" json:"tags,omitempty"` // JSON string
	AuditStatus    string        `db:"audit_status" json:"audit_status"`
	CreatedAt      time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time     `db:"updated_at" json:"updated_at"`
	DeletedAt      sql.NullTime  `db:"deleted_at" json:"-"`
}

// GetTags 获取标签列表
func (c *Content) GetTags() []string {
	if c.Tags == "" {
		return []string{}
	}
	// 使用sonic解析JSON
	var tags []string
	if err := sonic.UnmarshalString(c.Tags, &tags); err != nil {
		return []string{}
	}
	return tags
}

// SetTags 设置标签列表
func (c *Content) SetTags(tags []string) {
	data, err := sonic.MarshalString(tags)
	if err != nil {
		c.Tags = "[]"
		return
	}
	c.Tags = data
}

// Comment 评论模型
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

// CommentReport 评论举报模型
type CommentReport struct {
	ID        uint64       `db:"id" json:"id"`
	CommentID uint64       `db:"comment_id" json:"comment_id"`
	UserID    uint64       `db:"user_id" json:"user_id"`
	Reason    string       `db:"reason" json:"reason"`
	Handled   bool         `db:"handled" json:"handled"`
	CreatedAt time.Time    `db:"created_at" json:"created_at"`
	DeletedAt sql.NullTime `db:"deleted_at" json:"-"`
}

// Poll 投票模型
type Poll struct {
	ID          uint64       `db:"id" json:"id"`
	Title       string       `db:"title" json:"title"`
	Description string       `db:"description" json:"description,omitempty"`
	Options     string       `db:"options" json:"options"` // JSON array
	VoteCount   int64        `db:"vote_count" json:"vote_count"`
	UserID      uint64       `db:"user_id" json:"user_id"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time    `db:"updated_at" json:"updated_at"`
	DeletedAt   sql.NullTime `db:"deleted_at" json:"-"`
}

// GetOptions 获取选项列表
func (p *Poll) GetOptions() []string {
	if p.Options == "" {
		return []string{}
	}
	var opts []string
	if err := sonic.UnmarshalString(p.Options, &opts); err != nil {
		return []string{}
	}
	return opts
}

// PollVote 投票记录模型
type PollVote struct {
	ID          uint64      `db:"id" json:"id"`
	PollID      uint64      `db:"poll_id" json:"poll_id"`
	UserID      sql.NullInt64 `db:"user_id" json:"user_id,omitempty"`
	VisitorID   string      `db:"visitor_id" json:"visitor_id,omitempty"`
	OptionIndex int         `db:"option_index" json:"option_index"`
	CreatedAt   time.Time   `db:"created_at" json:"created_at"`
}

// Claim 内容认领模型
type Claim struct {
	ID         uint64       `db:"id" json:"id"`
	ContentID  uint64       `db:"content_id" json:"content_id"`
	UserID     uint64       `db:"user_id" json:"user_id"`
	Reason     string       `db:"reason" json:"reason,omitempty"`
	Status     string       `db:"status" json:"status"`
	ApprovedBy sql.NullInt64 `db:"approved_by" json:"approved_by,omitempty"`
	Remark     string       `db:"remark" json:"remark,omitempty"`
	CreatedAt  time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time    `db:"updated_at" json:"updated_at"`
}

// Notification 通知模型
type Notification struct {
	ID        uint64      `db:"id" json:"id"`
	UserID    uint64      `db:"user_id" json:"user_id"`
	Type      string      `db:"type" json:"type"`
	Title     string      `db:"title" json:"title"`
	Content   string      `db:"content" json:"content"`
	RelatedID sql.NullInt64 `db:"related_id" json:"related_id,omitempty"`
	IsRead    bool        `db:"is_read" json:"is_read"`
	CreatedAt time.Time   `db:"created_at" json:"created_at"`
}

// UserDevice 用户设备模型
type UserDevice struct {
	ID           uint64    `db:"id" json:"id"`
	UserID       uint64    `db:"user_id" json:"user_id"`
	DeviceToken  string    `db:"device_token" json:"device_token"`
	Platform     string    `db:"platform" json:"platform"`
	DeviceInfo   string    `db:"device_info" json:"device_info"`
	LastActiveAt time.Time `db:"last_active_at" json:"last_active_at"`
	LastPushAt   time.Time `db:"last_push_at" json:"last_push_at"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

// ContentWithUser 带用户信息的内容查询结果
type ContentWithUser struct {
	ID             uint64        `db:"id" json:"id"`
	Title          string        `db:"title" json:"title"`
	ContentType    string        `db:"type" json:"type"`
	Content        string        `db:"content" json:"content,omitempty"`
	FilePath       string        `db:"file_path" json:"file_path,omitempty"`
	FileSize       int64         `db:"file_size" json:"file_size,omitempty"`
	ThumbPath      string        `db:"thumb_path" json:"thumb_path,omitempty"`
	CompressedPath string        `db:"compressed_path" json:"compressed_path,omitempty"`
	Url            string        `db:"url" json:"url,omitempty"`
	Platform       string        `db:"platform" json:"platform,omitempty"`
	ViewCount      int64         `db:"view_count" json:"view_count"`
	UserID         uint64        `db:"user_id" json:"user_id"`
	BigTagID       sql.NullInt64 `db:"big_tag_id" json:"big_tag_id,omitempty"`
	SmallTagID     sql.NullInt64 `db:"small_tag_id" json:"small_tag_id,omitempty"`
	Tags           string        `db:"tags" json:"tags,omitempty"`
	AuditStatus    string        `db:"audit_status" json:"audit_status"`
	CreatedAt      time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time     `db:"updated_at" json:"updated_at"`
	DeletedAt      sql.NullTime  `db:"deleted_at" json:"-"`
	// joined user fields
	UserID2    sql.NullInt64  `db:"u_id" json:"-"`
	Username   sql.NullString `db:"u_username" json:"-"`
	IsAdmin    sql.NullBool   `db:"u_is_admin" json:"-"`
}

// ToContent 转换为Content
func (c *ContentWithUser) ToContent() Content {
	return Content{
		ID:             c.ID,
		Title:          c.Title,
		ContentType:    c.ContentType,
		Content:        c.Content,
		FilePath:       c.FilePath,
		FileSize:       c.FileSize,
		ThumbPath:      c.ThumbPath,
		CompressedPath: c.CompressedPath,
		Url:            c.Url,
		Platform:       c.Platform,
		ViewCount:      c.ViewCount,
		UserID:         c.UserID,
		BigTagID:       c.BigTagID,
		SmallTagID:     c.SmallTagID,
		Tags:           c.Tags,
		AuditStatus:    c.AuditStatus,
		CreatedAt:      c.CreatedAt,
		UpdatedAt:      c.UpdatedAt,
		DeletedAt:      c.DeletedAt,
	}
}

// CommentWithUser 带用户信息的评论查询结果
type CommentWithUser struct {
	ID        uint64         `db:"id" json:"id"`
	ContentID uint64         `db:"content_id" json:"content_id"`
	UserID    uint64         `db:"user_id" json:"user_id"`
	Text      string         `db:"text" json:"text"`
	ParentID  sql.NullInt64  `db:"parent_id" json:"parent_id,omitempty"`
	IsBanned  bool           `db:"is_banned" json:"is_banned"`
	CreatedAt time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt time.Time      `db:"updated_at" json:"updated_at"`
	DeletedAt sql.NullTime   `db:"deleted_at" json:"-"`
	// joined user fields
	UserID2   sql.NullInt64  `db:"u_id" json:"-"`
	Username  sql.NullString `db:"u_username" json:"-"`
}

// ApiKey API密钥模型
type ApiKey struct {
	ID          uint64       `db:"id" json:"id"`
	UserID      uint64       `db:"user_id" json:"user_id"`
	Name        string       `db:"name" json:"name"`
	KeyPrefix   string       `db:"key_prefix" json:"key_prefix"`
	KeyHash     string       `db:"key_hash" json:"-"`
	Permissions string       `db:"permissions" json:"permissions"` // JSON array
	IsActive    bool         `db:"is_active" json:"is_active"`
	LastUsedAt  sql.NullTime `db:"last_used_at" json:"last_used_at,omitempty"`
	ExpiresAt   sql.NullTime `db:"expires_at" json:"expires_at,omitempty"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time    `db:"updated_at" json:"updated_at"`
	DeletedAt   sql.NullTime `db:"deleted_at" json:"-"`
}

// GetPermissions 获取权限列表
func (k *ApiKey) GetPermissions() []string {
	if k.Permissions == "" {
		return []string{}
	}
	var perms []string
	if err := sonic.UnmarshalString(k.Permissions, &perms); err != nil {
		return []string{}
	}
	return perms
}

// HasPermission 检查是否有指定权限
func (k *ApiKey) HasPermission(perm string) bool {
	for _, p := range k.GetPermissions() {
		if p == perm {
			return true
		}
	}
	return false
}
