package docs

import (
	"github.com/gofiber/fiber/v2"
)

//go:embed openapi.json
var openAPIJSON []byte

// swaggerUIPath 指向本服务暴露的 OpenAPI 规范。
const swaggerUIPath = "/api/docs/openapi.json"

// swaggerHTML 通过 CDN 加载 Swagger UI 并指向本服务的 openapi.json。
// 注意：依赖外网 CDN；内网/离线环境可改为自托管 swagger-ui 资源。
const swaggerHTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>xqecz API 文档</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '` + swaggerUIPath + `',
          dom_id: '#swagger-ui',
          deepLinking: true,
        })
      }
    </script>
  </body>
</html>`

// Register 挂载接口文档路由：
//   GET /api/docs            → Swagger UI 页面
//   GET /api/docs/openapi.json → OpenAPI 3.1 规范（JSON）
func Register(app *fiber.App) {
	app.Get("/api/docs/openapi.json", func(c *fiber.Ctx) error {
		c.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
		c.Set(fiber.HeaderCacheControl, "no-store")
		return c.Send(openAPIJSON)
	})
	app.Get("/api/docs", func(c *fiber.Ctx) error {
		c.Set(fiber.HeaderContentType, fiber.MIMETextHTML)
		c.Set(fiber.HeaderCacheControl, "no-store")
		return c.SendString(swaggerHTML)
	})
}
