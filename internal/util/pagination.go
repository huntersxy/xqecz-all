package util

import (
	"math"
	"strconv"
)

// PaginationParams 分页参数
type PaginationParams struct {
	Page     int
	PageSize int
	Offset   int
}

// ParsePagination 解析分页参数
func ParsePagination(pageStr, pageSizeStr string, defaultSize, maxSize int) PaginationParams {
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = defaultSize
	}
	if pageSize > maxSize {
		pageSize = maxSize
	}

	offset := (page - 1) * pageSize

	return PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   offset,
	}
}

// SortClause 构建排序子句
func SortClause(sortBy, order string, allowedFields map[string]bool) string {
	if !allowedFields[sortBy] {
		sortBy = "created_at"
	}

	if order != "asc" && order != "desc" {
		order = "desc"
	}

	return sortBy + " " + order
}

// TotalPages 计算总页数
func TotalPages(total int64, pageSize int) int64 {
	if pageSize <= 0 {
		return 0
	}
	return int64(math.Ceil(float64(total) / float64(pageSize)))
}

// AllowedSortFields 允许的排序字段
var AllowedSortFields = map[string]bool{
	"created_at": true,
	"updated_at": true,
	"id":         true,
	"view_count": true,
}
