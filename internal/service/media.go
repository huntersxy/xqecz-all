package service

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"xqecz-all/internal/config"

	"github.com/rs/zerolog/log"
)

// ---- File Upload ----

const (
	IMAGE_MAX_SIZE = 10 * 1024 * 1024
	VIDEO_MAX_SIZE = 500 * 1024 * 1024
)

var (
	IMAGE_EXTENSIONS = []string{".jpg", ".jpeg", ".png", ".gif", ".webp"}
	VIDEO_EXTENSIONS = []string{".mp4", ".avi", ".mov", ".mkv"}
)

type FileUploadConfig struct {
	AllowedExtensions []string
	MaxSize           int64
	UploadDir         string
	UserID            uint64
}

type FileUploadResult struct {
	Filename string `json:"filename"`
	FilePath string `json:"file_path"`
	FileSize int64  `json:"file_size"`
	URL      string `json:"url"`
}

func UploadFile(cfg *FileUploadConfig, filename string, data []byte) (*FileUploadResult, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		ext = ".bin"
	}
	allowed := false
	for _, a := range cfg.AllowedExtensions {
		if strings.ToLower(a) == ext {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, fmt.Errorf("不支持的文件格式: %s", ext)
	}
	if int64(len(data)) > cfg.MaxSize {
		return nil, fmt.Errorf("文件大小超过限制，最大: %d MB", cfg.MaxSize/(1024*1024))
	}
	newFilename := fmt.Sprintf("%d_%d%s", cfg.UserID, time.Now().UnixNano(), ext)
	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		return nil, fmt.Errorf("创建上传目录失败: %v", err)
	}
	filePath := filepath.Join(cfg.UploadDir, newFilename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return nil, fmt.Errorf("保存文件失败: %v", err)
	}
	return &FileUploadResult{Filename: newFilename, FilePath: filePath, FileSize: int64(len(data)), URL: fmt.Sprintf("/uploads/%s", newFilename)}, nil
}

func GetUploadConfig(userID uint64, contentType string) *FileUploadConfig {
	cfg := config.Get()
	if contentType == "image" {
		return &FileUploadConfig{AllowedExtensions: IMAGE_EXTENSIONS, MaxSize: IMAGE_MAX_SIZE, UploadDir: cfg.Server.UploadDir, UserID: userID}
	}
	return &FileUploadConfig{AllowedExtensions: VIDEO_EXTENSIONS, MaxSize: VIDEO_MAX_SIZE, UploadDir: cfg.Server.UploadDir, UserID: userID}
}

// ---- Tinify Compression ----

type TinifyService struct {
	client *http.Client
}

func NewTinifyService() *TinifyService {
	return &TinifyService{client: &http.Client{Timeout: 60 * time.Second}}
}

func (s *TinifyService) CompressImage(originalPath string) (string, error) {
	cfg := config.Get()
	apiKey := cfg.Tinify.APIKey
	if apiKey == "" {
		return "", fmt.Errorf("tinify API key not configured")
	}
	auth := "Basic " + base64.StdEncoding.EncodeToString([]byte("api:"+apiKey))

	origInfo, _ := os.Stat(originalPath)
	origSize := int64(0)
	if origInfo != nil {
		origSize = origInfo.Size()
	}
	log.Info().Str("file", originalPath).Int64("size", origSize).Msg("[Tinify] start")

	outputURL, err := s.uploadToTinify(originalPath, auth)
	if err != nil {
		return "", err
	}

	stem := strings.TrimSuffix(filepath.Base(originalPath), filepath.Ext(originalPath))
	compressedFilename := stem + "_tinified.webp"
	destDir := cfg.Server.ImagesDir
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", err
	}
	destPath := filepath.Join(destDir, compressedFilename)

	if err := s.downloadFromTinify(outputURL, auth, destPath); err != nil {
		return "", err
	}

	newInfo, _ := os.Stat(destPath)
	if newInfo != nil && origSize > 0 {
		reduction := float64(origSize-newInfo.Size()) / float64(origSize) * 100
		log.Info().Str("file", compressedFilename).Float64("reduction", reduction).Msg("[Tinify] done")
	}
	return compressedFilename, nil
}

func (s *TinifyService) uploadToTinify(filePath string, auth string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	req, _ := http.NewRequest("POST", "https://api.tinify.com/shrink", strings.NewReader(string(data)))
	req.Header.Set("Authorization", auth)
	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("tinify upload failed: HTTP %d %s", resp.StatusCode, string(body))
	}
	return resp.Header.Get("Location"), nil
}

func (s *TinifyService) downloadFromTinify(outputURL string, auth string, destPath string) error {
	req, _ := http.NewRequest("POST", outputURL, strings.NewReader(`{"convert": {"type": "image/webp"}}`))
	req.Header.Set("Authorization", auth)
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("tinify download failed: HTTP %d %s", resp.StatusCode, string(body))
	}
	body, _ := io.ReadAll(resp.Body)
	return os.WriteFile(destPath, body, 0644)
}
