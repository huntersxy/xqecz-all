package util

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// 允许的文件扩展名
var allowedImageExts = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".webp": true,
}

var allowedVideoExts = map[string]bool{
	".mp4":  true,
	".avi":  true,
	".mov":  true,
	".mkv":  true,
	".webm": true,
}

// 文件大小限制
const (
	MaxImageSize = 10 * 1024 * 1024  // 10MB
	MaxVideoSize = 500 * 1024 * 1024 // 500MB
)

// FileType 文件类型
type FileType string

const (
	FileTypeImage FileType = "image"
	FileTypeVideo FileType = "video"
)

// ValidateFileExtension 验证文件扩展名
func ValidateFileExtension(filename string, fileType FileType) error {
	ext := strings.ToLower(filepath.Ext(filename))

	switch fileType {
	case FileTypeImage:
		if !allowedImageExts[ext] {
			return fmt.Errorf("不支持的图片格式，允许的格式：jpg, jpeg, png, gif, webp")
		}
	case FileTypeVideo:
		if !allowedVideoExts[ext] {
			return fmt.Errorf("不支持的视频格式，允许的格式：mp4, avi, mov, mkv, webm")
		}
	default:
		return fmt.Errorf("未知的文件类型")
	}

	return nil
}

// ValidateFileSize 验证文件大小
func ValidateFileSize(size int64, fileType FileType) error {
	switch fileType {
	case FileTypeImage:
		if size > MaxImageSize {
			return fmt.Errorf("图片大小不能超过10MB")
		}
	case FileTypeVideo:
		if size > MaxVideoSize {
			return fmt.Errorf("视频大小不能超过500MB")
		}
	}
	return nil
}

// ValidateMIMEType 验证MIME类型
func ValidateMIMEType(file multipart.File, fileType FileType) error {
	// 读取前512字节检测MIME类型
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		return fmt.Errorf("读取文件失败: %w", err)
	}

	// 重置文件指针
	if _, err := file.Seek(0, 0); err != nil {
		return fmt.Errorf("重置文件指针失败: %w", err)
	}

	// 检测MIME类型
	mimeType := http.DetectContentType(buf[:n])

	switch fileType {
	case FileTypeImage:
		if !strings.HasPrefix(mimeType, "image/") {
			return fmt.Errorf("文件不是有效的图片格式")
		}
	case FileTypeVideo:
		if !strings.HasPrefix(mimeType, "video/") {
			return fmt.Errorf("文件不是有效的视频格式")
		}
	}

	return nil
}

// GenerateUniqueFilename 生成唯一文件名
func GenerateUniqueFilename(ext string) string {
	timestamp := time.Now().UnixMilli()
	random := GenerateRandomString(8)
	return fmt.Sprintf("%d_%s%s", timestamp, random, ext)
}

// SaveUploadedFile 保存上传的文件
func SaveUploadedFile(file *multipart.FileHeader, dst string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// 创建目录
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	// 创建目标文件
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	// 复制文件内容
	_, err = io.Copy(out, src)
	return err
}

// DeleteFile 删除文件（忽略不存在的文件）
func DeleteFile(path string) error {
	if path == "" {
		return nil
	}

	err := os.Remove(path)
	if os.IsNotExist(err) {
		return nil
	}

	if err != nil {
		log.Warn().Err(err).Str("path", path).Msg("Failed to delete file")
	}

	return err
}

// DeleteContentFiles 删除内容相关的所有文件
func DeleteContentFiles(uploadDir, thumbnailDir, filePath, thumbPath, compressedPath string) {
	// 删除原文件
	if filePath != "" {
		DeleteFile(filepath.Join(uploadDir, filePath))
	}

	// 删除缩略图
	if thumbPath != "" {
		DeleteFile(filepath.Join(thumbnailDir, thumbPath))
	}

	// 删除压缩文件
	if compressedPath != "" {
		DeleteFile(filepath.Join(uploadDir, compressedPath))
	}
}
