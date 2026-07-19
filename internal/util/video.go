package util

import (
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/rs/zerolog/log"
)

var (
	ffmpegPath string
	ffmpegOnce sync.Once
	ffmpegSem  = make(chan struct{}, 1) // 同时只允许一个FFmpeg进程
)

// GetFFmpegPath 获取FFmpeg路径
func GetFFmpegPath() string {
	ffmpegOnce.Do(func() {
		path, err := exec.LookPath("ffmpeg")
		if err != nil {
			ffmpegPath = "ffmpeg"
		} else {
			ffmpegPath = path
		}
	})
	return ffmpegPath
}

// CheckFFmpeg 检查FFmpeg是否可用
func CheckFFmpeg() error {
	path := GetFFmpegPath()
	return exec.Command(path, "-version").Run()
}

// GetFFmpegVersion 获取FFmpeg版本
func GetFFmpegVersion() (string, error) {
	path := GetFFmpegPath()
	output, err := exec.Command(path, "-version").Output()
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(output), "\n")
	if len(lines) > 0 {
		return lines[0], nil
	}
	return "", nil
}

// GenerateVideoThumbnail 生成视频缩略图
func GenerateVideoThumbnail(videoPath, filename, thumbnailDir string) (string, error) {
	thumbFilename := strings.TrimSuffix(filename, filepath.Ext(filename)) + "_thumb.webp"
	thumbPath := filepath.Join(thumbnailDir, thumbFilename)

	// 获取信号量
	ffmpegSem <- struct{}{}
	defer func() { <-ffmpegSem }()

	ffmpeg := GetFFmpegPath()
	vf := `select=eq(n\,9),crop=w='if(gte(in_w/in_h,4/3),in_h*4/3,in_w)':h='if(gte(in_w/in_h,4/3),in_h,in_w*3/4)':x='if(gte(in_w/in_h,4/3),(in_w-in_h*4/3)/2,0)':y='if(gte(in_w/in_h,4/3),0,min(in_h*0.08,in_h-in_w*3/4))'`

	cmd := exec.Command(ffmpeg, "-i", videoPath, "-vf", vf, "-vframes", "1", "-c:v", "libwebp", "-quality", "60", "-threads", "1", "-y", thumbPath)
	if err := cmd.Run(); err != nil {
		log.Error().Err(err).Str("video", videoPath).Msg("Failed to generate video thumbnail")
		return "", err
	}

	return thumbFilename, nil
}

// GenerateImageThumbnail 生成图片缩略图
func GenerateImageThumbnail(originalPath, filename, thumbnailDir string) (string, error) {
	thumbFilename := strings.TrimSuffix(filename, filepath.Ext(filename)) + "_thumb.webp"
	thumbPath := filepath.Join(thumbnailDir, thumbFilename)

	// 检查是否已存在
	if _, err := exec.LookPath(thumbPath); err == nil {
		return thumbFilename, nil
	}

	// 获取信号量
	ffmpegSem <- struct{}{}
	defer func() { <-ffmpegSem }()

	ffmpeg := GetFFmpegPath()
	vf := `crop=w='if(gte(in_w/in_h,4/3),in_h*4/3,in_w)':h='if(gte(in_w/in_h,4/3),in_h,in_w*3/4)':x='if(gte(in_w/in_h,4/3),(in_w-in_h*4/3)/2,0)':y='if(gte(in_w/in_h,4/3),0,min(in_h*0.08,in_h-in_w*3/4))',scale=800:-1`

	cmd := exec.Command(ffmpeg, "-i", originalPath, "-vf", vf, "-threads", "1", "-q:v", "8", "-y", thumbPath)
	if err := cmd.Run(); err != nil {
		log.Error().Err(err).Str("image", originalPath).Msg("Failed to generate image thumbnail")
		return "", err
	}

	return thumbFilename, nil
}

// DeleteThumbnail 删除缩略图
func DeleteThumbnail(filename, thumbnailDir string) error {
	thumbFilename := strings.TrimSuffix(filename, filepath.Ext(filename)) + "_thumb.webp"
	thumbPath := filepath.Join(thumbnailDir, thumbFilename)

	return exec.Command("rm", "-f", thumbPath).Run()
}
