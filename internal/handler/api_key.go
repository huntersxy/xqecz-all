package handler

import (
	"xqecz-all/internal/middleware"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// ApiKeyHandler API密钥处理器
type ApiKeyHandler struct {
	apiKeyService *service.ApiKeyService
}

// NewApiKeyHandler 创建API密钥处理器实例
func NewApiKeyHandler(db *sqlx.DB) *ApiKeyHandler {
	return &ApiKeyHandler{
		apiKeyService: service.NewApiKeyService(db),
	}
}

// CreateApiKey 创建API密钥
func (h *ApiKeyHandler) CreateApiKey(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	var req service.CreateApiKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	if req.Name == "" {
		return util.BadRequest(c, "密钥名称不能为空")
	}

	result, err := h.apiKeyService.CreateApiKey(user.ID, req)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// ListApiKeys 获取API密钥列表
func (h *ApiKeyHandler) ListApiKeys(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	result, err := h.apiKeyService.ListApiKeys(user.ID)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// UpdateApiKey 更新API密钥
func (h *ApiKeyHandler) UpdateApiKey(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的密钥ID")
	}

	var req struct {
		Name     string `json:"name"`
		IsActive bool   `json:"is_active"`
	}
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	if err := h.apiKeyService.UpdateApiKey(user.ID, uint64(id), req.Name, req.IsActive); err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, nil)
}

// DeleteApiKey 删除API密钥
func (h *ApiKeyHandler) DeleteApiKey(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的密钥ID")
	}

	if err := h.apiKeyService.DeleteApiKey(user.ID, uint64(id)); err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, nil)
}
