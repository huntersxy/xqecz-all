package main

import (
	"time"

	"xqecz-all/internal/config"
	"xqecz-all/internal/repository"
	"xqecz-all/internal/service"
	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

// startSchedulers 启动所有后台任务
func startSchedulers(db *sqlx.DB) {
	go startRecommendScheduler(db)
	go startTinifyScheduler(db)
}

// startRecommendScheduler 推荐列表更新调度器
func startRecommendScheduler(db *sqlx.DB) {
	log.Info().Msg("[定时任务] 推荐列表更新调度器已启动")

	// 立即执行一次
	generateRecommendList(db)

	// 每5分钟执行一次
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		generateRecommendList(db)
	}
}

// generateRecommendList 生成推荐列表
func generateRecommendList(db *sqlx.DB) {
	log.Info().Msg("[定时任务] 开始生成推荐列表...")

	// 获取所有已审核的内容
	contentRepo := repository.NewContentRepository(db)
	contents, _, err := contentRepo.List(repository.ContentListQuery{
		AuditStatus: "approved",
		Page:        1,
		PageSize:    10000,
	})
	if err != nil {
		log.Error().Err(err).Msg("[定时任务] 获取内容失败")
		return
	}

	if len(contents) == 0 {
		log.Info().Msg("[定时任务] 没有可推荐的内容")
		return
	}

	if !util.IsRedisAvailable() {
		log.Info().Msg("[定时任务] Redis不可用，跳过")
		return
	}

	// 计算分数并添加到临时ZSet
	for _, content := range contents {
		score := calculateTimeScore(content.CreatedAt)
		util.ZAddToTempRecommend(content.ID, score)
	}

	// 替换正式ZSet
	if err := util.SwapRecommendZSet(); err != nil {
		log.Error().Err(err).Msg("[定时任务] 替换失败")
		return
	}

	log.Info().Int("count", len(contents)).Msg("[定时任务] 推荐列表更新完成")
}

// calculateTimeScore 计算时间分数
func calculateTimeScore(createdAt time.Time) float64 {
	now := time.Now()
	daysAgo := now.Sub(createdAt).Hours() / 24

	if daysAgo < 1 {
		return 100.0
	} else if daysAgo < 7 {
		return 50.0 * (1.0 - daysAgo/7.0)
	}
	return 0.0
}

// startTinifyScheduler 图片压缩调度器
func startTinifyScheduler(db *sqlx.DB) {
	cfg := config.Get()
	if !cfg.Tinify.Enabled || cfg.Tinify.APIKey == "" {
		log.Info().Msg("[定时任务] Tinify未配置，跳过压缩调度器")
		return
	}

	log.Info().Msg("[定时任务] 图片压缩调度器已启动")

	// 每10分钟执行一次
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		compressPendingImages(db)
	}
}

// compressPendingImages 压缩待处理的图片
func compressPendingImages(db *sqlx.DB) {
	// 查找需要压缩的图片（有file_path但没有compressed_path的图片）
	var contents []repository.Content
	err := db.Select(&contents,
		`SELECT id, file_path, user_id FROM contents
		WHERE type = 'image'
		AND file_path != ''
		AND (compressed_path IS NULL OR compressed_path = '')
		AND deleted_at IS NULL
		LIMIT 10`,
	)
	if err != nil {
		log.Error().Err(err).Msg("[Tinify] 查询待压缩图片失败")
		return
	}

	if len(contents) == 0 {
		return
	}

	log.Info().Int("count", len(contents)).Msg("[Tinify] 开始压缩图片")

	cfg := config.Get()
	tinifySvc := service.NewTinifyService()

	for _, content := range contents {
		filePath := ""
		if content.FilePath.Valid {
			filePath = content.FilePath.String
		}
		if filePath == "" {
			continue
		}

		originalPath := cfg.Server.UploadDir + "/" + filePath

		// 压缩图片
		compressedFilename, err := tinifySvc.CompressImage(originalPath)
		if err != nil {
			log.Error().Err(err).Uint64("content_id", content.ID).Msg("[Tinify] 压缩失败")
			continue
		}

		// 更新数据库
		_, err = db.Exec(
			"UPDATE contents SET compressed_path = ?, updated_at = NOW(3) WHERE id = ?",
			compressedFilename, content.ID,
		)
		if err != nil {
			log.Error().Err(err).Uint64("content_id", content.ID).Msg("[Tinify] 更新数据库失败")
			continue
		}

		log.Info().
			Uint64("content_id", content.ID).
			Str("compressed", compressedFilename).
			Msg("[Tinify] 压缩完成")

		// 清除缓存
		util.ClearContentCache(content.ID)
	}

	// 清除列表缓存
	util.ClearContentListCache()
}
