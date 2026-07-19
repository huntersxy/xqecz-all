package handler

import (
	"xqecz-all/internal/middleware"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// CommentHandler 评论处理器
type CommentHandler struct {
	commentService *service.CommentService
}

// NewCommentHandler 创建评论处理器实例
func NewCommentHandler(db *sqlx.DB) *CommentHandler {
	return &CommentHandler{
		commentService: service.NewCommentService(db),
	}
}

// GetComments 获取评论列表
func (h *CommentHandler) GetComments(c *fiber.Ctx) error {
	contentID, err := c.ParamsInt("content_id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	query := service.CommentListQuery{
		Page:     c.Query("page"),
		PageSize: c.Query("page_size"),
	}

	result, err := h.commentService.GetComments(uint64(contentID), query)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// GetCommentCount 获取评论数量
func (h *CommentHandler) GetCommentCount(c *fiber.Ctx) error {
	contentID, err := c.ParamsInt("content_id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	count, err := h.commentService.GetCommentCount(uint64(contentID))
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, fiber.Map{
		"content_id": contentID,
		"count":      count,
	})
}

// AddComment 添加评论
func (h *CommentHandler) AddComment(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	var req service.AddCommentRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.commentService.AddComment(user.ID, req)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, result)
}

// DeleteComment 删除评论
func (h *CommentHandler) DeleteComment(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	commentID, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的评论ID")
	}

	if err := h.commentService.DeleteComment(user.ID, uint64(commentID), user.IsAdmin); err != nil {
		if err.Error() == "无权删除此评论" {
			return util.Forbidden(c, err.Error())
		}
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, nil)
}

// ReportComment 举报评论
func (h *CommentHandler) ReportComment(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	var req service.ReportCommentRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.commentService.ReportComment(user.ID, req)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, result)
}

// GetCommentReports 获取评论举报列表（管理员）
func (h *CommentHandler) GetCommentReports(c *fiber.Ctx) error {
	reports, err := h.commentService.GetCommentReports()
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.SuccessWithMessage(c, "获取成功", reports)
}

// HandleReport 处理举报（管理员）
func (h *CommentHandler) HandleReport(c *fiber.Ctx) error {
	reportID, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的举报ID")
	}

	result, err := h.commentService.HandleReport(uint64(reportID))
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, result)
}
