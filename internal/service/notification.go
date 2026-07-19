package service

import (
	"fmt"

	"xqecz-all/internal/repository"

	"github.com/jmoiron/sqlx"
)

// 通知类型常量
const (
	NotifTypeComment = "comment"
	NotifTypeReply   = "reply"
	NotifTypeAudit   = "audit"
)

// Notification 通知数据模型
type Notification struct {
	ID        uint64 `db:"id" json:"id"`
	UserID    uint64 `db:"user_id" json:"user_id"`
	Type      string `db:"type" json:"type"`
	Title     string `db:"title" json:"title"`
	Content   string `db:"content" json:"content"`
	RelatedID *uint64 `db:"related_id" json:"related_id,omitempty"`
	IsRead    bool   `db:"is_read" json:"is_read"`
	CreatedAt int64  `db:"created_at" json:"created_at"`
}

// UserDevice 用户设备数据模型
type UserDevice struct {
	ID           uint64 `db:"id" json:"id"`
	UserID       uint64 `db:"user_id" json:"user_id"`
	DeviceToken  string `db:"device_token" json:"device_token"`
	Platform     string `db:"platform" json:"platform"`
	DeviceInfo   string `db:"device_info" json:"device_info"`
	LastActiveAt int64  `db:"last_active_at" json:"last_active_at"`
	LastPushAt   int64  `db:"last_push_at" json:"last_push_at"`
	CreatedAt    int64  `db:"created_at" json:"created_at"`
	UpdatedAt    int64  `db:"updated_at" json:"updated_at"`
}

// NotificationService 通知服务
type NotificationService struct {
	db          *sqlx.DB
	contentRepo *repository.ContentRepository
}

// NewNotificationService 创建通知服务实例
func NewNotificationService(db *sqlx.DB) *NotificationService {
	return &NotificationService{
		db:          db,
		contentRepo: repository.NewContentRepository(db),
	}
}

// Notify 发送通知
func (s *NotificationService) Notify(notifType string, targetUserID uint64, contentID uint64, sender string, text string) error {
	if targetUserID == 0 {
		return nil
	}

	// 获取内容标题
	content, err := s.contentRepo.FindByID(contentID)
	if err != nil {
		return err
	}

	var title, contentText string
	switch notifType {
	case NotifTypeComment:
		title = "新评论通知"
		contentText = fmt.Sprintf("%s 评论了你的内容「%s」：%s", sender, content.Title, truncateString(text, 100))
	case NotifTypeReply:
		title = "回复通知"
		contentText = fmt.Sprintf("%s 回复了你在「%s」下的评论：%s", sender, content.Title, truncateString(text, 100))
	case NotifTypeAudit:
		title = "审核通知"
		if text == "approved" {
			contentText = fmt.Sprintf("你的内容「%s」审核已通过", content.Title)
		} else {
			contentText = fmt.Sprintf("你的内容「%s」审核未通过", content.Title)
		}
	default:
		return fmt.Errorf("未知的通知类型: %s", notifType)
	}

	// 插入通知
	_, err = s.db.Exec(
		"INSERT INTO notifications (user_id, type, title, content, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW(3))",
		targetUserID, notifType, title, contentText, contentID,
	)
	return err
}

// RegisterDevice 注册设备
func (s *NotificationService) RegisterDevice(userID uint64, deviceToken, platform, deviceInfo string) error {
	// 检查是否已存在
	var count int64
	err := s.db.Get(&count,
		"SELECT COUNT(*) FROM user_devices WHERE user_id = ? AND device_token = ?",
		userID, deviceToken,
	)
	if err != nil {
		return err
	}

	if count > 0 {
		// 更新设备信息
		_, err = s.db.Exec(
			"UPDATE user_devices SET platform = ?, device_info = ?, last_active_at = NOW(3), updated_at = NOW(3) WHERE user_id = ? AND device_token = ?",
			platform, deviceInfo, userID, deviceToken,
		)
		return err
	}

	// 创建新设备
	_, err = s.db.Exec(
		"INSERT INTO user_devices (user_id, device_token, platform, device_info, last_active_at, last_push_at, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(3), NOW(3), NOW(3), NOW(3))",
		userID, deviceToken, platform, deviceInfo,
	)
	return err
}

// UnregisterDevice 注销设备
func (s *NotificationService) UnregisterDevice(userID uint64, deviceToken string) error {
	_, err := s.db.Exec(
		"DELETE FROM user_devices WHERE user_id = ? AND device_token = ?",
		userID, deviceToken,
	)
	return err
}

// GetNotifications 获取通知列表
func (s *NotificationService) GetNotifications(userID uint64, page, pageSize int) ([]Notification, int64, error) {
	// 计算总数
	var total int64
	err := s.db.Get(&total,
		"SELECT COUNT(*) FROM notifications WHERE user_id = ?",
		userID,
	)
	if err != nil {
		return nil, 0, err
	}

	// 查询列表
	offset := (page - 1) * pageSize
	var notifications []Notification
	err = s.db.Select(&notifications,
		"SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
		userID, pageSize, offset,
	)
	if err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// GetUnreadCount 获取未读通知数量
func (s *NotificationService) GetUnreadCount(userID uint64) (int64, error) {
	var count int64
	err := s.db.Get(&count,
		"SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
		userID,
	)
	return count, err
}

// MarkAsRead 标记通知为已读
func (s *NotificationService) MarkAsRead(userID uint64, notificationID uint64) error {
	_, err := s.db.Exec(
		"UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
		notificationID, userID,
	)
	return err
}

// MarkAllAsRead 标记所有通知为已读
func (s *NotificationService) MarkAllAsRead(userID uint64) error {
	_, err := s.db.Exec(
		"UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
		userID,
	)
	return err
}

// SendSummaryPush 发送摘要推送
func (s *NotificationService) SendSummaryPush(userID uint64, count int64) error {
	if count == 0 {
		return nil
	}

	// 获取用户设备
	var devices []UserDevice
	err := s.db.Select(&devices,
		"SELECT * FROM user_devices WHERE user_id = ?",
		userID,
	)
	if err != nil {
		return err
	}

	title := "小泉动漫"
	content := fmt.Sprintf("你收到了 %d 条新通知", count)

	for _, device := range devices {
		// 这里需要实现实际的推送逻辑
		// 暂时只更新最后推送时间
		_, _ = s.db.Exec(
			"UPDATE user_devices SET last_push_at = NOW(3) WHERE id = ?",
			device.ID,
		)
		_ = content
		_ = title
	}

	return nil
}

// truncateString 截断字符串
func truncateString(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}
