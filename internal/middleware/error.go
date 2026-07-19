package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"xqecz-all/internal/util"
)

// ErrorHandler 错误处理中间件
func ErrorHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 执行下一个中间件/处理器
		err := c.Next()

		if err != nil {
			// 记录错误日志
			log.Error().
				Err(err).
				Str("method", c.Method()).
				Str("path", c.Path()).
				Str("ip", c.IP()).
				Msg("Request error")

			// 检查是否是Fiber错误
			if fiberErr, ok := err.(*fiber.Error); ok {
				return util.Error(c, fiberErr.Code, fiberErr.Message)
			}

			// 返回500错误
			return util.InternalError(c, "服务器内部错误")
		}

		return nil
	}
}
