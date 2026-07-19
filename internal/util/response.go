package util

import (
	"github.com/gofiber/fiber/v2"
)

// ApiResponse 统一响应结构
type ApiResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PaginatedResponse 分页响应结构
type PaginatedResponse struct {
	List      interface{} `json:"list"`
	Total     int64       `json:"total"`
	Page      int         `json:"page"`
	PageSize  int         `json:"page_size"`
	TotalPage int64       `json:"total_page"`
}

// Success 成功响应
func Success(c *fiber.Ctx, data interface{}) error {
	return c.JSON(ApiResponse{
		Code: 200,
		Data: data,
	})
}

// SuccessWithMessage 成功响应（带消息）
func SuccessWithMessage(c *fiber.Ctx, msg string, data interface{}) error {
	return c.JSON(ApiResponse{
		Code:    200,
		Message: msg,
		Data:    data,
	})
}

// Error 错误响应
func Error(c *fiber.Ctx, code int, msg string) error {
	return c.Status(code).JSON(ApiResponse{
		Code:    code,
		Message: msg,
	})
}

// ErrorWithData 错误响应（带数据）
func ErrorWithData(c *fiber.Ctx, code int, msg string, data interface{}) error {
	return c.Status(code).JSON(ApiResponse{
		Code:    code,
		Message: msg,
		Data:    data,
	})
}

// BadRequest 400错误
func BadRequest(c *fiber.Ctx, msg string) error {
	return Error(c, 400, msg)
}

// Unauthorized 401错误
func Unauthorized(c *fiber.Ctx, msg string) error {
	return Error(c, 401, msg)
}

// Forbidden 403错误
func Forbidden(c *fiber.Ctx, msg string) error {
	return Error(c, 403, msg)
}

// NotFound 404错误
func NotFound(c *fiber.Ctx, msg string) error {
	return Error(c, 404, msg)
}

// InternalError 500错误
func InternalError(c *fiber.Ctx, msg string) error {
	return Error(c, 500, msg)
}

// Paginated 分页响应
func Paginated(c *fiber.Ctx, list interface{}, total int64, page, pageSize int) error {
	totalPage := (total + int64(pageSize) - 1) / int64(pageSize)
	return Success(c, PaginatedResponse{
		List:      list,
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
		TotalPage: totalPage,
	})
}

// ValidateOr 验证请求
func ValidateOr(c *fiber.Ctx, err error) error {
	if err != nil {
		return BadRequest(c, err.Error())
	}
	return nil
}
