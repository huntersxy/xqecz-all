package middleware

import (
	"strings"
	"sync"
	"time"

	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/rs/zerolog/log"
)

// ---- Auth ----

// AuthUser 认证用户信息
type AuthUser struct {
	ID       uint64 `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

// User 用户结构
type User struct {
	ID       uint64 `db:"id"`
	Username string `db:"username"`
	Password string `db:"password"`
	IsAdmin  bool   `db:"is_admin"`
	IsBanned bool   `db:"is_banned"`
}

// GetUserByID 从数据库获取用户（需要注入数据库）
var GetUserByID = func(userID uint64) (*User, error) {
	return nil, nil
}

// GetAuthUser 从上下文获取认证用户
func GetAuthUser(c *fiber.Ctx) *AuthUser {
	user := c.Locals("user")
	if user == nil {
		return nil
	}
	return user.(*AuthUser)
}

func loadUser(c *fiber.Ctx, sessionID string) *AuthUser {
	userID, err := util.GetSession(sessionID)
	if err != nil {
		return nil
	}
	user, err := GetUserByID(userID)
	if err != nil || user.IsBanned {
		return nil
	}
	return &AuthUser{ID: user.ID, Username: user.Username, IsAdmin: user.IsAdmin}
}

// Auth 认证中间件
func Auth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		sessionID := c.Cookies("session_id")
		if sessionID == "" {
			return util.Unauthorized(c, "未登录")
		}
		u := loadUser(c, sessionID)
		if u == nil {
			return util.Unauthorized(c, "会话已过期，请重新登录")
		}
		c.Locals("user", u)
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
		if sessionID != "" {
			if u := loadUser(c, sessionID); u != nil {
				c.Locals("user", u)
			}
		}
		return c.Next()
	}
}

// ---- CORS ----

func CORS(allowedOrigins []string) fiber.Handler {
	isWildcard := false
	for _, origin := range allowedOrigins {
		if origin == "*" {
			isWildcard = true
			break
		}
	}
	if isWildcard {
		return cors.New(cors.Config{
			AllowOrigins: "*",
			AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
			AllowHeaders: "Authorization,Content-Type,Accept,Origin,Referer,User-Agent,X-API-Key",
			MaxAge:       3600,
		})
	}
	return cors.New(cors.Config{
		AllowOrigins:     strings.Join(allowedOrigins, ","),
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Authorization,Content-Type,Accept,Origin,Referer,User-Agent,X-API-Key",
		AllowCredentials: true,
		MaxAge:           3600,
	})
}

// ---- Error Handler ----

func ErrorHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()
		if err != nil {
			log.Error().Err(err).Str("method", c.Method()).Str("path", c.Path()).Str("ip", c.IP()).Msg("Request error")
			if fiberErr, ok := err.(*fiber.Error); ok {
				return util.Error(c, fiberErr.Code, fiberErr.Message)
			}
			return util.InternalError(c, "服务器内部错误")
		}
		return nil
	}
}

// ---- Rate Limiter ----

type visitor struct {
	tokens   int
	lastSeen time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int
	burst    int
}

func NewRateLimiter(rate int, burst int) *RateLimiter {
	rl := &RateLimiter{visitors: make(map[string]*visitor), rate: rate, burst: burst}
	go func() {
		for {
			time.Sleep(time.Minute)
			rl.mu.Lock()
			for ip, v := range rl.visitors {
				if time.Since(v.lastSeen) > 3*time.Minute {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{tokens: rl.burst - 1, lastSeen: time.Now()}
		return true
	}
	tokensToAdd := int(time.Since(v.lastSeen).Seconds()) * rl.rate
	v.tokens += tokensToAdd
	if v.tokens > rl.burst {
		v.tokens = rl.burst
	}
	v.lastSeen = time.Now()
	if v.tokens > 0 {
		v.tokens--
		return true
	}
	return false
}

func RateLimit(rate int, burst int) fiber.Handler {
	limiter := NewRateLimiter(rate, burst)
	return func(c *fiber.Ctx) error {
		if !limiter.allow(c.IP()) {
			return util.Error(c, 429, "请求过于频繁，请稍后再试")
		}
		return c.Next()
	}
}
