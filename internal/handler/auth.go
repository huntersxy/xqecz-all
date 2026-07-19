package handler

import (
	"xqecz-all/internal/middleware"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	authService *service.AuthService
}

// NewAuthHandler 创建认证处理器实例
func NewAuthHandler(db *sqlx.DB) *AuthHandler {
	return &AuthHandler{
		authService: service.NewAuthService(db),
	}
}

// Register 用户注册
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req service.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	userID, err := h.authService.Register(req)
	if err != nil {
		if err.Error() == "用户名已存在" {
			return util.Error(c, 409, err.Error())
		}
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, fiber.Map{
		"user_id": userID,
	})
}

// Login 用户登录
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req service.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	user, sessionID, err := h.authService.Login(req)
	if err != nil {
		return util.Unauthorized(c, err.Error())
	}

	// 设置Cookie
	c.Cookie(&fiber.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		MaxAge:   30 * 24 * 3600, // 30天
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Lax",
	})

	return util.Success(c, fiber.Map{
		"user": fiber.Map{
			"id":       user.ID,
			"username": user.Username,
			"is_admin": user.IsAdmin,
		},
	})
}

// Logout 用户登出
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	sessionID := c.Cookies("session_id")
	if sessionID != "" {
		h.authService.Logout(sessionID)
	}

	// 清除Cookie
	c.Cookie(&fiber.Cookie{
		Name:     "session_id",
		Value:    "",
		MaxAge:   -1,
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Lax",
	})

	return util.SuccessWithMessage(c, "登出成功", nil)
}

// InitAdmin 初始化管理员
func (h *AuthHandler) InitAdmin(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	if req.Username == "" || req.Password == "" {
		return util.BadRequest(c, "用户名和密码不能为空")
	}

	_, err := h.authService.InitAdmin(req.Username, req.Password)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "管理员初始化成功", nil)
}

// GetMe 获取当前用户信息
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	return util.Success(c, fiber.Map{
		"id":       user.ID,
		"username": user.Username,
		"is_admin": user.IsAdmin,
	})
}
