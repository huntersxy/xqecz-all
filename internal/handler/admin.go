package handler

import (
	"xqecz-all/internal/middleware"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// AdminHandler 管理处理器
type AdminHandler struct {
	adminService *service.AdminService
	claimService *service.ClaimService
}

// NewAdminHandler 创建管理处理器实例
func NewAdminHandler(db *sqlx.DB) *AdminHandler {
	return &AdminHandler{
		adminService: service.NewAdminService(db),
		claimService: service.NewClaimService(db),
	}
}

// AuditContent 审核内容
func (h *AdminHandler) AuditContent(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	var req service.AuditRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.adminService.AuditContent(user.ID, uint64(id), req)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "审核完成", result)
}

// GetPendingContent 获取待审核内容
func (h *AdminHandler) GetPendingContent(c *fiber.Ctx) error {
	query := service.PendingQuery{
		Page:     c.Query("page"),
		PageSize: c.Query("page_size"),
	}

	result, err := h.adminService.GetPendingContent(query)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// GetAllContent 获取所有内容
func (h *AdminHandler) GetAllContent(c *fiber.Ctx) error {
	query := service.AllContentQuery{
		Page:        c.Query("page"),
		PageSize:    c.Query("page_size"),
		Tag:         c.Query("tag"),
		ContentType: c.Query("type"),
		AuditStatus: c.Query("audit_status"),
		Keyword:     c.Query("keyword"),
		SortBy:      c.Query("sort_by"),
		Order:       c.Query("order"),
	}

	result, err := h.adminService.GetAllContent(query)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// UpdateContentAuthor 更新内容作者
func (h *AdminHandler) UpdateContentAuthor(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	var req service.UpdateAuthorRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.adminService.UpdateContentAuthor(uint64(id), req)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "更新成功", result)
}

// RegenerateThumbnail 重新生成缩略图
func (h *AdminHandler) RegenerateThumbnail(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	result, err := h.adminService.RegenerateThumbnail(uint64(id))
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "缩略图更新成功", result)
}

// RegenerateAllThumbnails 重新生成所有缩略图
func (h *AdminHandler) RegenerateAllThumbnails(c *fiber.Ctx) error {
	count, err := h.adminService.RegenerateAllThumbnails()
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.SuccessWithMessage(c, "正在后台生成缩略图", fiber.Map{
		"count": count,
	})
}

// PurgeDeletedContent 清理已删除内容
func (h *AdminHandler) PurgeDeletedContent(c *fiber.Ctx) error {
	count, err := h.adminService.PurgeDeletedContent()
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.SuccessWithMessage(c, "清理完成", fiber.Map{
		"deleted_count": count,
	})
}

// CleanOrphanedFiles 清理孤立文件
func (h *AdminHandler) CleanOrphanedFiles(c *fiber.Ctx) error {
	count, files, err := h.adminService.CleanOrphanedFiles()
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.SuccessWithMessage(c, "清理完成", fiber.Map{
		"deleted_count": count,
		"deleted_files": files,
	})
}

// GetUsers 获取用户列表
func (h *AdminHandler) GetUsers(c *fiber.Ctx) error {
	query := service.UsersQuery{
		Page:     c.Query("page"),
		PageSize: c.Query("page_size"),
		Keyword:  c.Query("keyword"),
	}

	result, err := h.adminService.GetUsers(query)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// UpdateUserRole 更新用户角色
func (h *AdminHandler) UpdateUserRole(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的用户ID")
	}

	var req service.UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.adminService.UpdateUserRole(uint64(id), req)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, result)
}

// BanUser 封禁/解封用户
func (h *AdminHandler) BanUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的用户ID")
	}

	var req service.BanUserRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.adminService.BanUser(uint64(id), req)
	if err != nil {
		if err.Error() == "不能封禁管理员" {
			return util.Forbidden(c, err.Error())
		}
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, result)
}

// DeleteUser 删除用户
func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的用户ID")
	}

	if err := h.adminService.DeleteUser(uint64(id)); err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, nil)
}

// GetClaimList 获取认领列表
func (h *AdminHandler) GetClaimList(c *fiber.Ctx) error {
	status := c.Query("status")
	contentID := c.Query("content_id")
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("page_size", 20)

	result, err := h.claimService.GetClaimList(status, contentID, page, pageSize)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// HandleClaim 处理认领申请
func (h *AdminHandler) HandleClaim(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的认领ID")
	}

	var req struct {
		Action string `json:"action"`
		Remark string `json:"remark"`
	}
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.claimService.HandleClaim(user.ID, uint64(id), req.Action, req.Remark)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "处理成功", result)
}
