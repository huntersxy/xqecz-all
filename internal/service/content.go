package service

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"xqecz-all/internal/config"
	"xqecz-all/internal/repository"
	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

const (
	MAX_RECOMMEND_COUNT = 50
	CACHE_DURATION_1HOUR = time.Hour
	CACHE_DURATION_12HOUR = 12 * time.Hour
)

// ContentService 内容服务
type ContentService struct {
	contentRepo *repository.ContentRepository
	userRepo    *repository.UserRepository
}

// NewContentService 创建内容服务实例
func NewContentService(db *sqlx.DB) *ContentService {
	return &ContentService{
		contentRepo: repository.NewContentRepository(db),
		userRepo:    repository.NewUserRepository(db),
	}
}

// ContentListQuery 内容列表查询参数
type ContentListQuery struct {
	Page        string `json:"page"`
	PageSize    string `json:"page_size"`
	SortBy      string `json:"sort_by"`
	Order       string `json:"order"`
	AuditStatus string `json:"audit_status"`
	Tag         string `json:"tag"`
	ContentType string `json:"type"`
	Keyword     string `json:"keyword"`
}

// MyContentQuery 我的内容查询参数
type MyContentQuery struct {
	Page        string `json:"page"`
	PageSize    string `json:"page_size"`
	SortBy      string `json:"sort_by"`
	Order       string `json:"order"`
	ContentType string `json:"type"`
	AuditStatus string `json:"audit_status"`
}

// SearchQuery 搜索查询参数
type SearchQuery struct {
	Keyword  string `json:"keyword"`
	Page     string `json:"page"`
	PageSize string `json:"page_size"`
}

// RecommendQuery 推荐查询参数
type RecommendQuery struct {
	Count string `json:"count"`
	Page  string `json:"page"`
}

// GetContentList 获取内容列表
func (s *ContentService) GetContentList(query ContentListQuery) (*util.PaginatedResponse, error) {
	pag := util.ParsePagination(query.Page, query.PageSize, 20, 100)

	// 构建缓存键
	cacheKey := generateSortedCacheKey("content_list:", map[string]string{
		"audit_status": query.AuditStatus,
		"tag":          query.Tag,
		"type":         query.ContentType,
		"keyword":      query.Keyword,
		"sort_by":      query.SortBy,
		"order":        query.Order,
		"page":         fmt.Sprintf("%d", pag.Page),
		"page_size":    fmt.Sprintf("%d", pag.PageSize),
	})

	// 检查缓存
	if cached, err := util.GetCache(cacheKey); err == nil {
		var result util.PaginatedResponse
		if err := json.Unmarshal([]byte(cached), &result); err == nil {
			return &result, nil
		}
	}

	// 查询数据库
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

	// 构建响应
	results := make([]map[string]interface{}, 0, len(contents))
	for _, cwu := range contents {
		results = append(results, buildContentSummaryWithUser(&cwu))
	}

	response := util.NewPaginated(results, total, pag.Page, pag.PageSize)

	// 缓存1小时
	go func() {
		data, _ := json.Marshal(response)
		util.SetCache(cacheKey, string(data), CACHE_DURATION_1HOUR)
	}()

	return &response, nil
}

// CreateContentRequest 创建内容请求
type CreateContentRequest struct {
	Title       string
	ContentType string
	Content     string
	FilePath    string
	FileSize    int64
	Url         string
	Tags        string
	IsAdmin     bool
}

// CreateContent 创建内容
func (s *ContentService) CreateContent(userID uint64, req CreateContentRequest) (map[string]interface{}, error) {
	// 验证标题
	if err := util.ValidateTitle(req.Title); err != nil {
		return nil, err
	}

	// 验证文本内容
	if req.ContentType == repository.ContentTypeText {
		if err := util.ValidateTextContent(req.Content); err != nil {
			return nil, err
		}
	}

	// 验证链接
	if req.ContentType == repository.ContentTypeLink && req.Url == "" {
		return nil, errors.New("链接不能为空")
	}

	// 清理输入
	title := util.SanitizeHTML(req.Title)
	content := util.SanitizeHTML(req.Content)

	// 处理标签
	tagsJSON := "[]"
	var cleanTags []string
	if req.Tags != "" {
		tagList := strings.Split(req.Tags, ",")
		for _, t := range tagList {
			t = strings.TrimSpace(t)
			if t != "" {
				cleanTags = append(cleanTags, t)
			}
		}
		if len(cleanTags) > 0 {
			data, _ := json.Marshal(cleanTags)
			tagsJSON = string(data)
		}
	}

	// 审核状态：管理员直接通过，普通用户待审核
	auditStatus := repository.AuditStatusPending
	if req.IsAdmin {
		auditStatus = repository.AuditStatusApproved
	}

	// 创建内容记录
	contentModel := &repository.Content{
		Title:       title,
		ContentType: req.ContentType,
		Content:     sql.NullString{String: content, Valid: content != ""},
		FilePath:    sql.NullString{String: req.FilePath, Valid: req.FilePath != ""},
		FileSize:    req.FileSize,
		Url:         sql.NullString{String: req.Url, Valid: req.Url != ""},
		UserID:      userID,
		AuditStatus: auditStatus,
		Tags:        sql.NullString{String: tagsJSON, Valid: true},
	}

	// 生成缩略图
	var thumbPath string
	if req.FilePath != "" && (req.ContentType == repository.ContentTypeVideo || req.ContentType == repository.ContentTypeImage) {
		cfg := config.Get()
		originalPath := cfg.Server.UploadDir + "/" + req.FilePath
		var err error
		if req.ContentType == repository.ContentTypeVideo {
			thumbPath, err = util.GenerateVideoThumbnail(originalPath, req.FilePath, cfg.Server.ThumbnailDir)
		} else {
			thumbPath, err = util.GenerateImageThumbnail(originalPath, req.FilePath, cfg.Server.ThumbnailDir)
		}
		if err != nil {
			log.Warn().Err(err).Msg("Failed to generate thumbnail")
		} else {
			contentModel.ThumbPath = sql.NullString{String: thumbPath, Valid: true}
		}
	}

	id, err := s.contentRepo.Create(contentModel)
	if err != nil {
		return nil, errors.New("创建内容失败")
	}

	// 清除缓存
	go func() {
		util.ClearContentListCache()
	}()

	return map[string]interface{}{
		"id":           id,
		"title":        title,
		"type":         req.ContentType,
		"content":      content,
		"file_path":    req.FilePath,
		"file_size":    req.FileSize,
		"url":          req.Url,
		"user_id":      userID,
		"audit_status": auditStatus,
		"tags":         cleanTags,
	}, nil
}

// UpdateContentRequest 更新内容请求
type UpdateContentRequest struct {
	Title    string
	Content  string
	FilePath string
	FileSize int64
	Url      string
	Tags     string
	IsAdmin  bool
}

// UpdateContent 更新内容
func (s *ContentService) UpdateContent(userID uint64, contentID uint64, req UpdateContentRequest) (map[string]interface{}, error) {
	// 查询内容
	content, err := s.contentRepo.FindByID(contentID)
	if err != nil {
		return nil, errors.New("内容不存在")
	}

	// 权限检查
	if !req.IsAdmin && content.UserID != userID {
		return nil, errors.New("无权修改此内容")
	}

	// 更新字段
	if req.Title != "" {
		if err := util.ValidateTitle(req.Title); err != nil {
			return nil, err
		}
		content.Title = util.SanitizeHTML(req.Title)
	}

	if req.Content != "" && content.ContentType == repository.ContentTypeText {
		if err := util.ValidateTextContent(req.Content); err != nil {
			return nil, err
		}
		content.Content = sql.NullString{String: util.SanitizeHTML(req.Content), Valid: true}
	}

	if req.Url != "" && content.ContentType == repository.ContentTypeLink {
		content.Url = sql.NullString{String: req.Url, Valid: true}
	}

	if req.Tags != "" {
		tagList := strings.Split(req.Tags, ",")
		var cleanTags []string
		for _, t := range tagList {
			t = strings.TrimSpace(t)
			if t != "" {
				cleanTags = append(cleanTags, t)
			}
		}
		if len(cleanTags) > 0 {
			data, _ := json.Marshal(cleanTags)
			content.Tags = sql.NullString{String: string(data), Valid: true}
		}
	}

	// 如果有新文件，更新文件路径
	if req.FilePath != "" {
		content.FilePath = sql.NullString{String: req.FilePath, Valid: true}
		content.FileSize = req.FileSize

		// 生成新缩略图
		cfg := config.Get()
		originalPath := cfg.Server.UploadDir + "/" + req.FilePath
		var thumbFilename string
		if content.ContentType == repository.ContentTypeVideo {
			thumbFilename, _ = util.GenerateVideoThumbnail(originalPath, req.FilePath, cfg.Server.ThumbnailDir)
		} else if content.ContentType == repository.ContentTypeImage {
			thumbFilename, _ = util.GenerateImageThumbnail(originalPath, req.FilePath, cfg.Server.ThumbnailDir)
		}
		if thumbFilename != "" {
			content.ThumbPath = sql.NullString{String: thumbFilename, Valid: true}
		}
	}

	// 重置为待审核
	content.AuditStatus = repository.AuditStatusPending

	// 保存
	if err := s.contentRepo.Update(content); err != nil {
		return nil, errors.New("更新失败")
	}

	// 清除缓存
	go func() {
		util.ClearContentListCache()
		util.ClearContentCache(contentID)
	}()

	return buildContentDetail(content), nil
}

// DeleteContent 删除内容
func (s *ContentService) DeleteContent(userID uint64, contentID uint64, isAdmin bool) error {
	// 查询内容
	content, err := s.contentRepo.FindByID(contentID)
	if err != nil {
		return errors.New("内容不存在")
	}

	// 权限检查
	if !isAdmin && content.UserID != userID {
		return errors.New("无权删除此内容")
	}

	// 删除文件
	cfg := config.Get()
	if content.FilePath.Valid && content.FilePath.String != "" {
		os.Remove(cfg.Server.UploadDir + "/" + content.FilePath.String)
	}
	if content.ThumbPath.Valid && content.ThumbPath.String != "" {
		os.Remove(cfg.Server.ThumbnailDir + "/" + content.ThumbPath.String)
	}
	if content.CompressedPath.Valid && content.CompressedPath.String != "" {
		os.Remove(cfg.Server.ImagesDir + "/" + content.CompressedPath.String)
	}

	// 删除关联数据
	s.contentRepo.GetDB().Exec("DELETE FROM audit_logs WHERE content_id = ?", contentID)
	s.contentRepo.GetDB().Exec("DELETE FROM comments WHERE content_id = ? AND deleted_at IS NULL", contentID)

	// 删除内容
	if err := s.contentRepo.Delete(contentID); err != nil {
		return errors.New("删除失败")
	}

	// 清除缓存
	go func() {
		util.ClearContentListCache()
		util.ClearContentCache(contentID)
	}()

	return nil
}

// GetMyContentList 获取我的内容列表
func (s *ContentService) GetMyContentList(userID uint64, query MyContentQuery) (*util.PaginatedResponse, error) {
	pag := util.ParsePagination(query.Page, query.PageSize, 20, 100)

	contents, total, err := s.contentRepo.ListByUserID(userID, query.ContentType, query.AuditStatus, pag.Page, pag.PageSize)
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

// GetContent 获取内容详情
func (s *ContentService) GetContent(id uint64, silent bool) (map[string]interface{}, error) {
	cacheKey := fmt.Sprintf("content:%d", id)

	// 检查缓存
	if cached, err := util.GetCache(cacheKey); err == nil {
		var result map[string]interface{}
		if err := json.Unmarshal([]byte(cached), &result); err == nil {
			if !silent {
				go s.contentRepo.IncrementViewCount(id)
			}
			return result, nil
		}
	}

	// 查询数据库
	content, err := s.contentRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("内容不存在")
	}

	// 检查审核状态
	if content.AuditStatus != repository.AuditStatusApproved && content.AuditStatus != repository.AuditStatusPending {
		return nil, errors.New("内容不存在")
	}

	result := buildContentDetail(content)

	// 缓存12小时
	go func() {
		data, _ := json.Marshal(result)
		util.SetCache(cacheKey, string(data), CACHE_DURATION_12HOUR)
	}()

	if !silent {
		go s.contentRepo.IncrementViewCount(id)
	}

	return result, nil
}

// SearchContent 搜索内容
func (s *ContentService) SearchContent(query SearchQuery) (*util.PaginatedResponse, error) {
	if query.Keyword == "" {
		return nil, errors.New("请输入搜索关键词")
	}

	pag := util.ParsePagination(query.Page, query.PageSize, 20, 100)

	contents, total, err := s.contentRepo.Search(query.Keyword, pag.Page, pag.PageSize)
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

// RecommendContent 获取推荐内容
func (s *ContentService) RecommendContent(query RecommendQuery) ([]map[string]interface{}, error) {
	if query.Count == "" {
		return nil, errors.New("count参数必填")
	}

	count := 0
	fmt.Sscanf(query.Count, "%d", &count)
	if count <= 0 {
		return nil, errors.New("count参数无效，必须是大于0的整数")
	}
	if count > MAX_RECOMMEND_COUNT {
		count = MAX_RECOMMEND_COUNT
	}

	page := 1
	if query.Page != "" {
		fmt.Sscanf(query.Page, "%d", &page)
	}
	if page < 1 {
		page = 1
	}
	start := int64((page - 1) * count)

	// 尝试从Redis ZSet获取推荐ID
	var contentIDs []uint64
	zsetAvailable := false
	if util.IsRedisAvailable() {
		ids, err := util.ZRevRangeRecommend(start, int64(start+int64(count)-1))
		if err == nil && len(ids) > 0 {
			contentIDs = ids
			zsetAvailable = true
		}
	}

	var contents []repository.ContentWithUser
	if zsetAvailable && len(contentIDs) > 0 {
		contents, _ = s.contentRepo.GetRecommendByIDs(contentIDs)
	} else {
		contents, _ = s.contentRepo.GetRecommend(start, int64(count))
	}

	results := make([]map[string]interface{}, 0, len(contents))
	for _, cwu := range contents {
		results = append(results, buildContentDetailWithUser(&cwu))
	}

	return results, nil
}

// GetAllTags 获取所有标签
func (s *ContentService) GetAllTags() ([]string, error) {
	// 检查缓存
	if cached, err := util.GetCache("all_tags"); err == nil {
		var tags []string
		if err := json.Unmarshal([]byte(cached), &tags); err == nil {
			return tags, nil
		}
	}

	tags, err := s.contentRepo.GetAllTags()
	if err != nil {
		return nil, err
	}

	// 缓存1小时
	go func() {
		data, _ := json.Marshal(tags)
		util.SetCache("all_tags", string(data), CACHE_DURATION_1HOUR)
	}()

	return tags, nil
}

// 辅助函数：构建内容详情
func buildContentDetail(content *repository.Content) map[string]interface{} {
	// 辅助函数获取 NullString 值
	getStr := func(ns sql.NullString) string {
		if ns.Valid {
			return ns.String
		}
		return ""
	}

	result := map[string]interface{}{
		"id":           content.ID,
		"title":        content.Title,
		"type":         content.ContentType,
		"content":      getStr(content.Content),
		"file_size":    content.FileSize,
		"url":          getStr(content.Url),
		"platform":     getStr(content.Platform),
		"user_id":      content.UserID,
		"audit_status": content.AuditStatus,
		"view_count":   content.ViewCount,
		"created_at":   content.CreatedAt.Unix(),
		"updated_at":   content.UpdatedAt.Unix(),
	}

	// 解析tags
	tags := content.GetTags()
	if tags == nil {
		tags = []string{}
	}
	result["tags"] = tags

	filePath := getStr(content.FilePath)
	thumbPath := getStr(content.ThumbPath)
	compressedPath := ""
	if content.CompressedPath.Valid {
		compressedPath = content.CompressedPath.String
	}

	// 根据类型添加特定字段
	switch content.ContentType {
	case repository.ContentTypeVideo:
		if filePath != "" {
			result["video"] = "/uploads/" + filePath
		}
		if thumbPath != "" {
			result["thumb"] = "/thumbnails/" + thumbPath
		}
	case repository.ContentTypeImage:
		// 优先使用压缩图，没有则用原图
		if compressedPath != "" {
			result["img"] = "/images/" + compressedPath
		} else if filePath != "" {
			result["img"] = "/uploads/" + filePath
		}
		if thumbPath != "" {
			result["thumb"] = "/thumbnails/" + thumbPath
		}
	case repository.ContentTypeText:
		result["text"] = getStr(content.Content)
	case repository.ContentTypeLink:
		url := getStr(content.Url)
		if url != "" {
			result["url"] = url
		}
		if thumbPath != "" {
			result["thumb"] = "/thumbnails/" + thumbPath
		}
	}

	return result
}

// 辅助函数：构建带用户信息的内容摘要
func buildContentSummaryWithUser(cwu *repository.ContentWithUser) map[string]interface{} {
	result := buildContentDetail(&cwu.Content)

	// 添加用户信息
	if cwu.UserID2.Valid {
		result["user"] = map[string]interface{}{
			"id":       cwu.UserID2.Int64,
			"username": cwu.Username.String,
		}
	}

	return result
}

// 辅助函数：构建带用户信息的内容详情
func buildContentDetailWithUser(cwu *repository.ContentWithUser) map[string]interface{} {
	result := buildContentDetail(&cwu.Content)

	// 添加用户信息
	if cwu.UserID2.Valid {
		result["user"] = map[string]interface{}{
			"id":       cwu.UserID2.Int64,
			"username": cwu.Username.String,
		}
	}

	return result
}

// 辅助函数：生成排序缓存键
func generateSortedCacheKey(prefix string, params map[string]string) string {
	// 按键排序
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var parts []string
	for _, k := range keys {
		if params[k] != "" {
			parts = append(parts, fmt.Sprintf("%s=%s", k, params[k]))
		}
	}
	return prefix + strings.Join(parts, "&")
}
