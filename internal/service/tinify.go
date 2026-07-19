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

// TinifyService 图片压缩服务
type TinifyService struct {
	client *http.Client
}

// NewTinifyService 创建Tinify服务实例
func NewTinifyService() *TinifyService {
	return &TinifyService{
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// CompressImage 压缩图片
func (s *TinifyService) CompressImage(originalPath string) (string, error) {
	cfg := config.Get()
	apiKey := cfg.Tinify.APIKey
	if apiKey == "" {
		return "", fmt.Errorf("tinify API key not configured")
	}

	auth := "Basic " + base64.StdEncoding.EncodeToString([]byte("api:"+apiKey))

	// 获取原始文件大小
	origInfo, _ := os.Stat(originalPath)
	origSize := int64(0)
	if origInfo != nil {
		origSize = origInfo.Size()
	}
	log.Info().Str("file", originalPath).Int64("size", origSize).Msg("[Tinify] start compress")

	// 上传到Tinify
	outputURL, err := s.uploadToTinify(originalPath, auth)
	if err != nil {
		return "", fmt.Errorf("upload to tinify: %w", err)
	}
	log.Info().Str("output", outputURL).Msg("[Tinify] upload done")

	// 生成压缩后的文件名
	stem := strings.TrimSuffix(filepath.Base(originalPath), filepath.Ext(originalPath))
	compressedFilename := stem + "_tinified.webp"

	// 目标目录
	destDir := cfg.Server.ImagesDir
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", fmt.Errorf("create images dir: %w", err)
	}
	destPath := filepath.Join(destDir, compressedFilename)

	// 下载压缩后的文件
	if err := s.downloadFromTinify(outputURL, auth, destPath); err != nil {
		return "", fmt.Errorf("download from tinify: %w", err)
	}

	// 获取压缩后的文件大小
	newInfo, _ := os.Stat(destPath)
	newSize := int64(0)
	if newInfo != nil {
		newSize = newInfo.Size()
	}

	if origSize > 0 {
		reduction := float64(origSize-newSize) / float64(origSize) * 100
		log.Info().
			Str("filename", compressedFilename).
			Int64("orig", origSize).
			Int64("new", newSize).
			Float64("reduction", reduction).
			Msg("[Tinify] done")
	}

	return compressedFilename, nil
}

// uploadToTinify 上传文件到Tinify
func (s *TinifyService) uploadToTinify(filePath string, auth string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("open file: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.tinify.com/shrink", strings.NewReader(string(data)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", auth)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("HTTP %d body=%s", resp.StatusCode, string(body))
	}

	location := resp.Header.Get("Location")
	if location == "" {
		return "", fmt.Errorf("no Location header")
	}

	return location, nil
}

// downloadFromTinify 从Tinify下载压缩后的文件
func (s *TinifyService) downloadFromTinify(outputURL string, auth string, destPath string) error {
	payload := `{"convert": {"type": "image/webp"}}`

	req, err := http.NewRequest("POST", outputURL, strings.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", auth)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("HTTP %d body=%s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read body: %w", err)
	}

	if err := os.WriteFile(destPath, body, 0644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	log.Info().Int("bytes", len(body)).Msg("[Tinify] downloaded")
	return nil
}
