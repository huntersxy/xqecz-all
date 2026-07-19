package handler

import (
	"xqecz-all/internal/middleware"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// PollHandler 投票处理器
type PollHandler struct {
	pollService *service.PollService
}

// NewPollHandler 创建投票处理器实例
func NewPollHandler(db *sqlx.DB) *PollHandler {
	return &PollHandler{
		pollService: service.NewPollService(db),
	}
}

// GetPollList 获取投票列表
func (h *PollHandler) GetPollList(c *fiber.Ctx) error {
	query := service.PollListQuery{
		Page:     c.Query("page"),
		PageSize: c.Query("page_size"),
	}

	result, err := h.pollService.GetPollList(query)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// GetPoll 获取投票详情
func (h *PollHandler) GetPoll(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的投票ID")
	}

	// 获取用户信息（可选）
	var userID *uint64
	user := middleware.GetAuthUser(c)
	if user != nil {
		userID = &user.ID
	}

	// 获取访客ID
	visitorID := c.Cookies("visitor_id")

	result, err := h.pollService.GetPoll(uint64(id), userID, visitorID)
	if err != nil {
		return util.NotFound(c, err.Error())
	}

	return util.Success(c, result)
}

// VotePoll 投票
func (h *PollHandler) VotePoll(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的投票ID")
	}

	var req service.VotePollRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	// 获取用户信息（可选）
	var userID *uint64
	user := middleware.GetAuthUser(c)
	if user != nil {
		userID = &user.ID
	}

	// 获取或生成访客ID
	visitorID := c.Cookies("visitor_id")
	if visitorID == "" && userID == nil {
		visitorID = util.GenerateRandomString(32)
	}

	if err := h.pollService.VotePoll(uint64(id), userID, visitorID, req); err != nil {
		return util.BadRequest(c, err.Error())
	}

	// 如果是访客投票，设置visitor_id cookie
	if userID == nil && visitorID != "" {
		c.Cookie(&fiber.Cookie{
			Name:     "visitor_id",
			Value:    visitorID,
			MaxAge:   30 * 24 * 3600, // 30天
			Path:     "/",
			HTTPOnly: true,
			SameSite: "Lax",
		})
	}

	return util.Success(c, nil)
}

// CreatePoll 创建投票
func (h *PollHandler) CreatePoll(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	var req service.CreatePollRequest
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.pollService.CreatePoll(user.ID, req)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, result)
}

// DeletePoll 删除投票
func (h *PollHandler) DeletePoll(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的投票ID")
	}

	if err := h.pollService.DeletePoll(user.ID, uint64(id), user.IsAdmin); err != nil {
		if err.Error() == "无权删除" {
			return util.Forbidden(c, err.Error())
		}
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, nil)
}
