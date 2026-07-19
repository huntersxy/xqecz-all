package service

import (
	"database/sql"
	"errors"
	"os"

	"xqecz-all/internal/config"
	"xqecz-all/internal/repository"
	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

// AdminService 管理服务
type AdminService struct {
	contentRepo *repository.ContentRepository
	userRepo    *repository.UserRepository
	commentRepo *repository.CommentRepository
}

// NewAdminService 创建管理服务实例
func NewAdminService(db *sqlx.DB) *AdminService {
	return &AdminService{
		contentRepo: repository.NewContentRepository(db),
		userRepo:    repository.NewUserRepository(db),
		commentRepo: repository.NewCommentRepository(db),
	}
}

// AuditRequest 审核请求
type AuditRequest struct {
	Status string `json:"status"`
	Remark string `json:"remark"`
}

// PendingQuery 待审核查询参数
type PendingQuery struct {
	Page     string `json:"page"`
	PageSize string `json:"page_size"`
}

// AllContentQuery 所有内容查询参数
type AllContentQuery struct {
	Page        string `json:"page"`
	PageSize    string `json:"page_size"`
	Tag         string `json:"tag"`
	ContentType string `json:"type"`
	AuditStatus string `json:"audit_status"`
	Keyword     string `json:"keyword"`
	SortBy      string `json:"sort_by"`
	Order       string `json:"order"`
}

// UsersQuery 用户列表查询参数
type UsersQuery struct {
	Page     string `json:"page"`
	PageSize string `json:"page_size"`
	Keyword  string `json:"keyword"`
}

// UpdateRoleRequest 更新角色请求
type UpdateRoleRequest struct {
	IsAdmin bool `json:"is_admin"`
}

// BanUserRequest 封禁用户请求
type BanUserRequest struct {
	IsBanned bool `json:"is_banned"`
}

// UpdateAuthorRequest 更新作者请求
type UpdateAuthorRequest struct {
	UserID uint64 `json:"user_id"`
}

// AuditContent 审核内容
func (s *AdminService) AuditContent(adminID uint64, contentID uint64, req AuditRequest) (map[string]interface{}, error) {
	if req.Status == "" {
		return nil, errors.New("审核状态不能为空")
	}

	content, err := s.contentRepo.FindByID(contentID)
	if err != nil {
		return nil, errors.New("内容不存在")
	}

	// 更新审核状态
	if err := s.contentRepo.UpdateAuditStatus(contentID, req.Status); err != nil {
		return nil, err
	}

	// 清除缓存
	go func() {
		util.ClearContentListCache()
		util.ClearContentCache(contentID)
	}()

	return map[string]interface{}{
		"id":          content.ID,
		"title":       content.Title,
		"type":        content.ContentType,
		"audit_status": req.Status,
	}, nil
}

// GetPendingContent 获取待审核内容
func (s *AdminService) GetPendingContent(query PendingQuery) (*util.PaginatedResponse, error) {
	pag := util.ParsePagination(query.Page, query.PageSize, 20, 100)

	contents, total, err := s.contentRepo.GetPending(pag.Page, pag.PageSize)
	if err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, 0, len(contents))
	for _, cwu := range contents {
		results = append(results, buildContentSummaryWithUser(&cwu))
	}

	totalPage := util.TotalPages(total, pag.PageSize)
	return &util.PaginatedResponse{
		List:      results,
		Total:     total,
		Page:      pag.Page,
		PageSize:  pag.PageSize,
		TotalPage: totalPage,
	}, nil
}

// GetAllContent 获取所有内容（管理员）
func (s *AdminService) GetAllContent(query AllContentQuery) (*util.PaginatedResponse, error) {
	pag := util.ParsePagination(query.Page, query.PageSize, 20, 100)

	contents, total, err := s.contentRepo.List(repository.ContentListQuery{
		AuditStatus: query.AuditStatus,
		Tag:         query.Tag,
		ContentType: query.ContentType,
		Keyword:     query.Keyword,
		SortBy:      query.SortBy,
		Order:       query.Order,
		Page:        pag.Page,
		PageSize:    pag.PageSize,
	})
	if err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, 0, len(contents))
	for _, cwu := range contents {
		results = append(results, buildContentSummaryWithUser(&cwu))
	}

	totalPage := util.TotalPages(total, pag.PageSize)
	return &util.PaginatedResponse{
		List:      results,
		Total:     total,
		Page:      pag.Page,
		PageSize:  pag.PageSize,
		TotalPage: totalPage,
	}, nil
}

// GetUsers 获取用户列表
func (s *AdminService) GetUsers(query UsersQuery) (*util.PaginatedResponse, error) {
	pag := util.ParsePagination(query.Page, query.PageSize, 20, 100)

	users, total, err := s.userRepo.List(query.Keyword, pag.Page, pag.PageSize)
	if err != nil {
		return nil, err
	}

	userList := make([]map[string]interface{}, 0, len(users))
	for _, u := range users {
		userList = append(userList, map[string]interface{}{
			"id":         u.ID,
			"username":   u.Username,
			"is_admin":   u.IsAdmin,
			"is_banned":  u.IsBanned,
			"created_at": u.CreatedAt.Unix(),
		})
	}

	totalPage := util.TotalPages(total, pag.PageSize)
	return &util.PaginatedResponse{
		List:      userList,
		Total:     total,
		Page:      pag.Page,
		PageSize:  pag.PageSize,
		TotalPage: totalPage,
	}, nil
}

// UpdateUserRole 更新用户角色
func (s *AdminService) UpdateUserRole(id uint64, req UpdateRoleRequest) (map[string]interface{}, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("用户不存在")
	}

	if err := s.userRepo.UpdateRole(id, req.IsAdmin); err != nil {
		return nil, err
	}

	// 清除用户缓存
	go util.ClearUserInfoCache(id)

	return map[string]interface{}{
		"id":       user.ID,
		"is_admin": req.IsAdmin,
	}, nil
}

// BanUser 封禁/解封用户
func (s *AdminService) BanUser(id uint64, req BanUserRequest) (map[string]interface{}, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("用户不存在")
	}

	if user.IsAdmin {
		return nil, errors.New("不能封禁管理员")
	}

	if err := s.userRepo.UpdateBanStatus(id, req.IsBanned); err != nil {
		return nil, err
	}

	// 清除用户缓存
	go util.ClearUserInfoCache(id)

	message := "封禁成功"
	if !req.IsBanned {
		message = "解封成功"
	}

	return map[string]interface{}{
		"id":        user.ID,
		"is_banned": req.IsBanned,
		"message":   message,
	}, nil
}

// DeleteUser 删除用户
func (s *AdminService) DeleteUser(id uint64) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return errors.New("用户不存在")
	}

	// 删除用户的所有内容
	contents, _, _ := s.contentRepo.ListByUserID(id, "", "", 1, 1000)
	for _, content := range contents {
		s.contentRepo.Delete(content.ID)
	}

	// 删除用户
	if err := s.userRepo.Delete(user.ID); err != nil {
		return err
	}

	return nil
}

// UpdateContentAuthor 更新内容作者
func (s *AdminService) UpdateContentAuthor(contentID uint64, req UpdateAuthorRequest) (map[string]interface{}, error) {
	content, err := s.contentRepo.FindByID(contentID)
	if err != nil {
		return nil, errors.New("内容不存在")
	}

	user, err := s.userRepo.FindByID(req.UserID)
	if err != nil {
		return nil, errors.New("目标用户不存在")
	}

	oldUserID := content.UserID
	newUsername := user.Username

	if err := s.contentRepo.UpdateAuthor(contentID, req.UserID); err != nil {
		return nil, err
	}

	// 清除缓存
	go func() {
		util.ClearContentListCache()
		util.ClearContentCache(contentID)
	}()

	return map[string]interface{}{
		"content_id":   contentID,
		"old_user_id":  oldUserID,
		"new_user_id":  req.UserID,
		"new_username": newUsername,
	}, nil
}

// PurgeDeletedContent 清理已删除内容
func (s *AdminService) PurgeDeletedContent() (int64, error) {
	count, err := s.contentRepo.PurgeDeleted()
	if err != nil {
		return 0, err
	}

	// 清除缓存
	go func() {
		util.ClearContentListCache()
	}()

	return count, nil
}

// CleanOrphanedFiles 清理孤立文件
func (s *AdminService) CleanOrphanedFiles() (int64, []string, error) {
	cfg := config.Get()

	// 获取数据库中所有文件路径
	var contents []struct {
		FilePath       sql.NullString `db:"file_path"`
		ThumbPath      sql.NullString `db:"thumb_path"`
		CompressedPath sql.NullString `db:"compressed_path"`
	}
	err := s.contentRepo.GetDB().Select(&contents, "SELECT file_path, thumb_path, compressed_path FROM contents")
	if err != nil {
		return 0, nil, err
	}

	// 构建已记录的文件集合
	recorded := make(map[string]bool)
	for _, c := range contents {
		if c.FilePath.Valid && c.FilePath.String != "" {
			recorded[c.FilePath.String] = true
		}
		if c.ThumbPath.Valid && c.ThumbPath.String != "" {
			recorded[c.ThumbPath.String] = true
		}
		if c.CompressedPath.Valid && c.CompressedPath.String != "" {
			recorded[c.CompressedPath.String] = true
		}
	}

	// 扫描目录
	var deletedCount int64
	var deletedFiles []string
	dirs := []string{cfg.Server.UploadDir, cfg.Server.ThumbnailDir, cfg.Server.ImagesDir}

	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			name := entry.Name()
			if !recorded[name] {
				filePath := dir + "/" + name
				if err := os.Remove(filePath); err == nil {
					deletedCount++
					deletedFiles = append(deletedFiles, name)
				}
			}
		}
	}

	return deletedCount, deletedFiles, nil
}

// RegenerateThumbnail 重新生成单个内容的缩略图
func (s *AdminService) RegenerateThumbnail(contentID uint64) (map[string]interface{}, error) {
	cfg := config.Get()

	// 查询内容
	content, err := s.contentRepo.FindByID(contentID)
	if err != nil {
		return nil, errors.New("内容不存在")
	}

	filePath := ""
	if content.FilePath.Valid {
		filePath = content.FilePath.String
	}
	if filePath == "" {
		return nil, errors.New("文件不存在")
	}

	originalPath := cfg.Server.UploadDir + "/" + filePath

	// 删除旧缩略图
	if content.ThumbPath.Valid && content.ThumbPath.String != "" {
		oldThumbPath := cfg.Server.ThumbnailDir + "/" + content.ThumbPath.String
		os.Remove(oldThumbPath)
	}

	// 生成新缩略图
	var thumbFilename string
	if content.ContentType == repository.ContentTypeVideo {
		thumbFilename, err = util.GenerateVideoThumbnail(originalPath, filePath, cfg.Server.ThumbnailDir)
	} else if content.ContentType == repository.ContentTypeImage {
		thumbFilename, err = util.GenerateImageThumbnail(originalPath, filePath, cfg.Server.ThumbnailDir)
	} else {
		return nil, errors.New("仅支持图片和视频内容")
	}

	if err != nil {
		return nil, errors.New("生成缩略图失败: " + err.Error())
	}

	// 更新数据库
	_, err = s.contentRepo.GetDB().Exec(
		"UPDATE contents SET thumb_path = ?, updated_at = NOW(3) WHERE id = ?",
		thumbFilename, contentID,
	)
	if err != nil {
		return nil, errors.New("更新数据库失败")
	}

	util.ClearContentCache(contentID)

	return map[string]interface{}{
		"id":         contentID,
		"thumb_path": thumbFilename,
	}, nil
}

// RegenerateAllThumbnails 重新生成所有缩略图
func (s *AdminService) RegenerateAllThumbnails() (int64, error) {
	cfg := config.Get()

	// 查询需要生成缩略图的内容
	var contents []repository.Content
	err := s.contentRepo.GetDB().Select(&contents,
		`SELECT id, type, file_path, thumb_path FROM contents
		WHERE deleted_at IS NULL
		AND file_path != ''
		AND (thumb_path IS NULL OR thumb_path = '')
		AND (type = 'image' OR type = 'video')`,
	)
	if err != nil {
		return 0, err
	}

	if len(contents) == 0 {
		return 0, nil
	}

	// 异步生成缩略图
	go func() {
		var success int64
		for _, content := range contents {
			filePath := ""
			if content.FilePath.Valid {
				filePath = content.FilePath.String
			}
			if filePath == "" {
				continue
			}

			originalPath := cfg.Server.UploadDir + "/" + filePath
			var thumbFilename string
			var err error

			if content.ContentType == repository.ContentTypeVideo {
				thumbFilename, err = util.GenerateVideoThumbnail(originalPath, filePath, cfg.Server.ThumbnailDir)
			} else {
				thumbFilename, err = util.GenerateImageThumbnail(originalPath, filePath, cfg.Server.ThumbnailDir)
			}

			if err != nil {
				log.Error().Err(err).Uint64("content_id", content.ID).Msg("Failed to regenerate thumbnail")
				continue
			}

			// 更新数据库
			_, err = s.contentRepo.GetDB().Exec(
				"UPDATE contents SET thumb_path = ?, updated_at = NOW(3) WHERE id = ?",
				thumbFilename, content.ID,
			)
			if err != nil {
				log.Error().Err(err).Uint64("content_id", content.ID).Msg("Failed to update thumb_path")
				continue
			}

			success++
			util.ClearContentCache(content.ID)
		}

		util.ClearContentListCache()
		log.Info().Int64("success", success).Int("total", len(contents)).Msg("Thumbnail regeneration completed")
	}()

	return int64(len(contents)), nil
}

// 辅助函数：构建内容摘要（带用户信息）
func buildContentSummaryWithUserForAdmin(cwu *repository.ContentWithUser) map[string]interface{} {
	getStr := func(ns sql.NullString) string {
		if ns.Valid {
			return ns.String
		}
		return ""
	}

	result := map[string]interface{}{
		"id":           cwu.ID,
		"title":        cwu.Title,
		"type":         cwu.ContentType,
		"content":      getStr(cwu.Content.Content),
		"file_size":    cwu.FileSize,
		"url":          getStr(cwu.Content.Url),
		"platform":     getStr(cwu.Content.Platform),
		"user_id":      cwu.UserID,
		"audit_status": cwu.AuditStatus,
		"view_count":   cwu.ViewCount,
		"created_at":   cwu.CreatedAt.Unix(),
		"updated_at":   cwu.UpdatedAt.Unix(),
	}

	// 解析tags
	tags := cwu.GetTags()
	if tags == nil {
		tags = []string{}
	}
	result["tags"] = tags

	filePath := getStr(cwu.Content.FilePath)
	thumbPath := getStr(cwu.Content.ThumbPath)
	compressedPath := ""
	if cwu.Content.CompressedPath.Valid {
		compressedPath = cwu.Content.CompressedPath.String
	}

	// 根据类型添加图片字段
	switch cwu.ContentType {
	case repository.ContentTypeVideo:
		if filePath != "" {
			result["video"] = "/uploads/" + filePath
		}
		if thumbPath != "" {
			result["thumb"] = "/thumbnails/" + thumbPath
		}
	case repository.ContentTypeImage:
		if compressedPath != "" {
			result["img"] = "/images/" + compressedPath
		} else if filePath != "" {
			result["img"] = "/uploads/" + filePath
		}
		if thumbPath != "" {
			result["thumb"] = "/thumbnails/" + thumbPath
		}
	case repository.ContentTypeLink:
		if thumbPath != "" {
			result["thumb"] = "/thumbnails/" + thumbPath
		}
	}

	// 添加用户信息
	if cwu.UserID2.Valid {
		result["user"] = map[string]interface{}{
			"id":       cwu.UserID2.Int64,
			"username": cwu.Username.String,
		}
	}

	return result
}
