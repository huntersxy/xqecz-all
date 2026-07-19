package handler

import (
	"time"

	"xqecz-all/internal/middleware"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

// ContentHandler 内容处理器
type ContentHandler struct {
	contentService  *service.ContentService
	notifService    *service.NotificationService
	claimService    *service.ClaimService
}

// NewContentHandler 创建内容处理器实例
func NewContentHandler(db *sqlx.DB) *ContentHandler {
	return &ContentHandler{
		contentService:  service.NewContentService(db),
		notifService:    service.NewNotificationService(db),
		claimService:    service.NewClaimService(db),
	}
}

// GetContentList 获取内容列表
func (h *ContentHandler) GetContentList(c *fiber.Ctx) error {
	query := service.ContentListQuery{
		Page:        c.Query("page"),
		PageSize:    c.Query("page_size"),
		SortBy:      c.Query("sort_by"),
		Order:       c.Query("order"),
		AuditStatus: c.Query("audit_status"),
		Tag:         c.Query("tag"),
		ContentType: c.Query("type"),
		Keyword:     c.Query("keyword"),
	}

	result, err := h.contentService.GetContentList(query)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// SearchContent 搜索内容
func (h *ContentHandler) SearchContent(c *fiber.Ctx) error {
	query := service.SearchQuery{
		Keyword:  c.Query("keyword"),
		Page:     c.Query("page"),
		PageSize: c.Query("page_size"),
	}

	result, err := h.contentService.SearchContent(query)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, result)
}

// RecommendContent 获取推荐内容
func (h *ContentHandler) RecommendContent(c *fiber.Ctx) error {
	query := service.RecommendQuery{
		Count: c.Query("count"),
		Page:  c.Query("page"),
	}

	result, err := h.contentService.RecommendContent(query)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, fiber.Map{
		"list":  result,
		"count": len(result),
	})
}

// GetAllTags 获取所有标签
func (h *ContentHandler) GetAllTags(c *fiber.Ctx) error {
	tags, err := h.contentService.GetAllTags()
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, tags)
}

// GetContent 获取内容详情
func (h *ContentHandler) GetContent(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	silent := c.Query("silent") == "1" || c.Query("silent") == "true"

	result, err := h.contentService.GetContent(uint64(id), silent)
	if err != nil {
		return util.NotFound(c, err.Error())
	}

	return util.Success(c, result)
}

// UploadContent 上传内容
func (h *ContentHandler) UploadContent(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	// 获取表单数据
	title := c.FormValue("title")
	contentType := c.FormValue("type")
	contentText := c.FormValue("content")
	url := c.FormValue("url")
	tags := c.FormValue("tags")

	// 获取文件
	file, err := c.FormFile("file")
	if err != nil && contentType != "text" && contentType != "link" {
		return util.BadRequest(c, "请上传文件")
	}

	var filePath string
	var fileSize int64

	// 处理文件上传
	if file != nil {
		// 读取文件数据
		fileData, err := file.Open()
		if err != nil {
			return util.BadRequest(c, "读取文件失败")
		}
		defer fileData.Close()

		buf := make([]byte, file.Size)
		_, err = fileData.Read(buf)
		if err != nil {
			return util.BadRequest(c, "读取文件失败")
		}

		// 上传文件
		uploadCfg := service.GetUploadConfig(user.ID, contentType)
		result, err := service.UploadFile(uploadCfg, file.Filename, buf)
		if err != nil {
			return util.BadRequest(c, err.Error())
		}

		filePath = result.Filename
		fileSize = result.FileSize
	}

	// 创建内容
	result, err := h.contentService.CreateContent(user.ID, service.CreateContentRequest{
		Title:       title,
		ContentType: contentType,
		Content:     contentText,
		FilePath:    filePath,
		FileSize:    fileSize,
		Url:         url,
		Tags:        tags,
		IsAdmin:     user.IsAdmin,
	})
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.SuccessWithMessage(c, "上传成功", result)
}

// UploadImage 上传图片（文章内嵌图片）
func (h *ContentHandler) UploadImage(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	// 获取文件
	file, err := c.FormFile("file")
	if err != nil {
		return util.BadRequest(c, "请上传图片文件")
	}

	// 读取文件数据
	fileData, err := file.Open()
	if err != nil {
		return util.BadRequest(c, "读取文件失败")
	}
	defer fileData.Close()

	buf := make([]byte, file.Size)
	_, err = fileData.Read(buf)
	if err != nil {
		return util.BadRequest(c, "读取文件失败")
	}

	// 上传文件
	uploadCfg := service.GetUploadConfig(user.ID, "image")
	result, err := service.UploadFile(uploadCfg, file.Filename, buf)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.Success(c, fiber.Map{
		"id":          0,
		"filename":    result.Filename,
		"file_size":   result.FileSize,
		"image_url":   result.URL,
		"upload_time": time.Now().Format("2006-01-02T15:04:05"),
	})
}

// GetMyContentList 获取我的内容列表
func (h *ContentHandler) GetMyContentList(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	query := service.MyContentQuery{
		Page:        c.Query("page"),
		PageSize:    c.Query("page_size"),
		SortBy:      c.Query("sort_by"),
		Order:       c.Query("order"),
		ContentType: c.Query("type"),
		AuditStatus: c.Query("audit_status"),
	}

	result, err := h.contentService.GetMyContentList(user.ID, query)
	if err != nil {
		return util.InternalError(c, err.Error())
	}

	return util.Success(c, result)
}

// UpdateContent 更新内容
func (h *ContentHandler) UpdateContent(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	// 获取表单数据
	title := c.FormValue("title")
	contentText := c.FormValue("content")
	url := c.FormValue("url")
	tags := c.FormValue("tags")

	// 获取文件（可选）
	var filePath string
	var fileSize int64
	file, err := c.FormFile("file")
	if err == nil && file != nil {
		// 读取文件数据
		fileData, err := file.Open()
		if err != nil {
			return util.BadRequest(c, "读取文件失败")
		}
		defer fileData.Close()

		buf := make([]byte, file.Size)
		_, err = fileData.Read(buf)
		if err != nil {
			return util.BadRequest(c, "读取文件失败")
		}

		// 上传文件
		uploadCfg := service.GetUploadConfig(user.ID, "image")
		result, err := service.UploadFile(uploadCfg, file.Filename, buf)
		if err != nil {
			return util.BadRequest(c, err.Error())
		}

		filePath = result.Filename
		fileSize = result.FileSize
	}

	result, err := h.contentService.UpdateContent(user.ID, uint64(id), service.UpdateContentRequest{
		Title:    title,
		Content:  contentText,
		FilePath: filePath,
		FileSize: fileSize,
		Url:      url,
		Tags:     tags,
		IsAdmin:  user.IsAdmin,
	})
	if err != nil {
		if err.Error() == "无权修改此内容" {
			return util.Forbidden(c, err.Error())
		}
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "更新成功", result)
}

// DeleteContent 删除内容
func (h *ContentHandler) DeleteContent(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	if err := h.contentService.DeleteContent(user.ID, uint64(id), user.IsAdmin); err != nil {
		if err.Error() == "无权删除此内容" {
			return util.Forbidden(c, err.Error())
		}
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "删除成功", nil)
}

// CreateClaim 创建内容认领
func (h *ContentHandler) CreateClaim(c *fiber.Ctx) error {
	user := middleware.GetAuthUser(c)
	if user == nil {
		return util.Unauthorized(c, "未登录")
	}

	contentID, err := c.ParamsInt("content_id")
	if err != nil {
		return util.BadRequest(c, "无效的内容ID")
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return util.BadRequest(c, "请求参数错误")
	}

	result, err := h.claimService.CreateClaim(user.ID, uint64(contentID), req.Reason)
	if err != nil {
		return util.BadRequest(c, err.Error())
	}

	return util.SuccessWithMessage(c, "提交成功，等待管理员审核", result)
}
