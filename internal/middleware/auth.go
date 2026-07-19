package middleware

import (
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// AuthUser 认证用户信息
type AuthUser struct {
	ID       uint64 `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

// Auth 认证中间件
func Auth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		sessionID := c.Cookies("session_id")
		if sessionID == "" {
			return util.Unauthorized(c, "未登录")
		}

		// 从Redis获取用户ID
		userID, err := util.GetSession(sessionID)
		if err != nil {
			log.Warn().Err(err).Str("session", sessionID).Msg("Failed to get session")
			return util.Unauthorized(c, "会话已过期，请重新登录")
		}

		// 从数据库获取用户信息
		user, err := GetUserByID(userID)
		if err != nil {
			log.Warn().Err(err).Uint64("user_id", userID).Msg("Failed to get user")
			return util.Unauthorized(c, "用户不存在")
		}

		// 检查用户是否被封禁
		if user.IsBanned {
			return util.Forbidden(c, "账号已被封禁")
		}

		// 将用户信息存入上下文
		c.Locals("user", &AuthUser{
			ID:       user.ID,
			Username: user.Username,
			IsAdmin:  user.IsAdmin,
		})

		return c.Next()
	}
}

// Admin 管理员中间件
func Admin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := c.Locals("user").(*AuthUser)
		if user == nil || !user.IsAdmin {
			return util.Forbidden(c, "需要管理员权限")
		}
		return c.Next()
	}
}

// OptionalAuth 可选认证中间件
func OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		sessionID := c.Cookies("session_id")
		if sessionID == "" {
			return c.Next()
		}

		// 从Redis获取用户ID
		userID, err := util.GetSession(sessionID)
		if err != nil {
			return c.Next()
		}

		// 从数据库获取用户信息
		user, err := GetUserByID(userID)
		if err != nil {
			return c.Next()
		}

		// 检查用户是否被封禁
		if user.IsBanned {
			return c.Next()
		}

		// 将用户信息存入上下文
		c.Locals("user", &AuthUser{
			ID:       user.ID,
			Username: user.Username,
			IsAdmin:  user.IsAdmin,
		})

		return c.Next()
	}
}

// GetAuthUser 从上下文获取认证用户
func GetAuthUser(c *fiber.Ctx) *AuthUser {
	user := c.Locals("user")
	if user == nil {
		return nil
	}
	return user.(*AuthUser)
}

// GetUserByID 从数据库获取用户（需要注入数据库）
var GetUserByID = func(userID uint64) (*User, error) {
	// 这个函数会在初始化时被替换
	return nil, nil
}

// User 用户结构
type User struct {
	ID       uint64 `db:"id"`
	Username string `db:"username"`
	Password string `db:"password"`
	IsAdmin  bool   `db:"is_admin"`
	IsBanned bool   `db:"is_banned"`
}
