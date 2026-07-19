package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORS CORS中间件
func CORS(allowedOrigins []string) fiber.Handler {
	// 检查是否使用通配符
	isWildcard := false
	for _, origin := range allowedOrigins {
		if origin == "*" {
			isWildcard = true
			break
		}
	}

	// 如果是通配符，不能使用AllowCredentials
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
