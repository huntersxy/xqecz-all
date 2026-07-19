package util

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"html"
	"strings"
	"unicode/utf8"
)

const (
	SessionIDLength = 32
	CookieMaxAge    = 30 * 24 * 3600 // 30天
)

// GenerateRandomString 生成随机字符串
func GenerateRandomString(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes)
}

// GenerateSessionID 生成会话ID
func GenerateSessionID() string {
	return GenerateRandomString(SessionIDLength)
}

// SHA256Hash 计算SHA256哈希
func SHA256Hash(data string) string {
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:])
}

// SanitizeHTML HTML转义
func SanitizeHTML(s string) string {
	return html.EscapeString(s)
}

// ValidateTitle 验证标题
func ValidateTitle(title string) error {
	title = strings.TrimSpace(title)
	if utf8.RuneCountInString(title) < 1 || utf8.RuneCountInString(title) > 200 {
		return ErrInvalidTitle
	}
	return nil
}

// ValidateTextContent 验证文本内容
func ValidateTextContent(text string) error {
	if utf8.RuneCountInString(text) > 10000 {
		return ErrContentTooLong
	}
	return nil
}

// SanitizeSearchInput 清理搜索输入（防止LIKE注入）
func SanitizeSearchInput(input string) string {
	input = strings.TrimSpace(input)
	// 转义LIKE特殊字符
	input = strings.ReplaceAll(input, "\\", "\\\\")
	input = strings.ReplaceAll(input, "%", "\\%")
	input = strings.ReplaceAll(input, "_", "\\_")
	return input
}

// 自定义错误
var (
	ErrInvalidTitle  = &ValidationError{"标题长度必须在1-200个字符之间"}
	ErrContentTooLong = &ValidationError{"内容长度不能超过10000个字符"}
)

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
