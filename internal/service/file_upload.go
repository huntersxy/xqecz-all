package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"xqecz-all/internal/config"
)

const (
	IMAGE_MAX_SIZE = 10 * 1024 * 1024   // 10 MB
	VIDEO_MAX_SIZE = 500 * 1024 * 1024  // 500 MB
)

var (
	IMAGE_EXTENSIONS = []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
	VIDEO_EXTENSIONS = []string{".mp4", ".avi", ".mov", ".mkv"}
)

// FileUploadConfig 文件上传配置
type FileUploadConfig struct {
	AllowedExtensions []string
	MaxSize           int64
	UploadDir         string
	UserID            uint64
}

// FileUploadResult 文件上传结果
type FileUploadResult struct {
	Filename string `json:"filename"`
	FilePath string `json:"file_path"`
	FileSize int64  `json:"file_size"`
	URL      string `json:"url"`
}

// UploadFile 上传文件
func UploadFile(cfg *FileUploadConfig, filename string, data []byte) (*FileUploadResult, error) {
	// 验证扩展名
	if err := validateExtension(cfg, filename); err != nil {
		return nil, err
	}

	// 验证大小
	if err := validateSize(cfg, int64(len(data))); err != nil {
		return nil, err
	}

	// 获取扩展名
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		ext = ".bin"
	}

	// 生成新文件名
	newFilename := generateFilename(cfg, ext)

	// 确保上传目录存在
	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		return nil, fmt.Errorf("创建上传目录失败: %v", err)
	}

	// 保存文件
	filePath := filepath.Join(cfg.UploadDir, newFilename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return nil, fmt.Errorf("保存文件失败: %v", err)
	}

	return &FileUploadResult{
		Filename: newFilename,
		FilePath: filePath,
		FileSize: int64(len(data)),
		URL:      fmt.Sprintf("/uploads/%s", newFilename),
	}, nil
}

// validateExtension 验证文件扩展名
func validateExtension(cfg *FileUploadConfig, filename string) error {
	ext := strings.ToLower(filepath.Ext(filename))
	for _, allowed := range cfg.AllowedExtensions {
		if strings.ToLower(allowed) == ext {
			return nil
		}
	}
	return fmt.Errorf("不支持的文件格式: %s，支持的格式: %v", ext, cfg.AllowedExtensions)
}

// validateSize 验证文件大小
func validateSize(cfg *FileUploadConfig, size int64) error {
	if size > cfg.MaxSize {
		return fmt.Errorf("文件大小超过限制，最大允许: %d MB", cfg.MaxSize/(1024*1024))
	}
	return nil
}

// generateFilename 生成文件名
func generateFilename(cfg *FileUploadConfig, ext string) string {
	now := time.Now().UnixNano()
	return fmt.Sprintf("%d_%d%s", cfg.UserID, now, ext)
}

// GetUploadConfig 获取上传配置
func GetUploadConfig(userID uint64, contentType string) *FileUploadConfig {
	cfg := config.Get()

	var allowedExts []string
	var maxSize int64

	if contentType == "image" {
		allowedExts = IMAGE_EXTENSIONS
		maxSize = IMAGE_MAX_SIZE
	} else {
		allowedExts = VIDEO_EXTENSIONS
		maxSize = VIDEO_MAX_SIZE
	}

	return &FileUploadConfig{
		AllowedExtensions: allowedExts,
		MaxSize:           maxSize,
		UploadDir:         cfg.Server.UploadDir,
		UserID:            userID,
	}
}
