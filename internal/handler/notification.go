package handler

import (
	"xqecz-all/internal/middleware"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// NotificationHandler 通知处理器
type NotificationHandler struct {
	notifService *service.NotificationService
}

// NewNotificationHandler 创建通知处理器实例
func NewNotificationHandler(db *sqlx.DB) *NotificationHandler {
	return &NotificationHandler{
		notifService: service.NewNotificationService(db),
	}
}

// RegisterDevice 注册设备
func (h *NotificationHandler) RegisterDevice(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	var req struct {
		DeviceToken string `json:"device_token"`
		Platform    string `json:"platform"`
		DeviceInfo  string `json:"device_info"`
	}
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	if req.DeviceToken == "" {
		return util.BadRequest(c, "设备令牌不能为空")
	}

	if err := h.notifService.RegisterDevice(user.ID, req.DeviceToken, req.Platform, req.DeviceInfo); err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.SuccessWithMessage(c, "设备注册成功", nil)
}

// UnregisterDevice 注销设备
func (h *NotificationHandler) UnregisterDevice(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	token := c.Params("token")
	if token == "" {
		return util.BadRequest(c, "设备令牌不能为空")
	}

	if err := h.notifService.UnregisterDevice(user.ID, token); err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.SuccessWithMessage(c, "设备注销成功", nil)
}

// GetNotifications 获取通知列表
func (h *NotificationHandler) GetNotifications(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("page_size", 20)

	notifications, total, err := h.notifService.GetNotifications(user.ID, page, pageSize)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	totalPage := int64(0)
	if pageSize > 0 {
		totalPage = (total + int64(pageSize) - 1) / int64(pageSize)
	}

	return util.Success(c, fiber.Map{
		"list":      notifications,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"total_page": totalPage,
	})
}

// GetUnreadCount 获取未读通知数量
func (h *NotificationHandler) GetUnreadCount(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	count, err := h.notifService.GetUnreadCount(user.ID)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, fiber.Map{
		"count": count,
	})
}

// MarkAsRead 标记通知为已读
func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的通知ID")
	}

	if err := h.notifService.MarkAsRead(user.ID, uint64(id)); err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, nil)
}

// MarkAllAsRead 标记所有通知为已读
func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	if err := h.notifService.MarkAllAsRead(user.ID); err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, nil)
}
