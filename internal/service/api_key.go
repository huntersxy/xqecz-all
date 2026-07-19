package service

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
)

// ApiKey API密钥数据模型
type ApiKey struct {
	ID          uint64     `db:"id" json:"id"`
	UserID      uint64     `db:"user_id" json:"user_id"`
	Name        string     `db:"name" json:"name"`
	KeyPrefix   string     `db:"key_prefix" json:"key_prefix"`
	KeyHash     string     `db:"key_hash" json:"-"`
	Permissions string     `db:"permissions" json:"permissions"`
	IsActive    bool       `db:"is_active" json:"is_active"`
	LastUsedAt  *time.Time `db:"last_used_at" json:"last_used_at,omitempty"`
	ExpiresAt   *time.Time `db:"expires_at" json:"expires_at,omitempty"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
}

// ApiKeyService API密钥服务
type ApiKeyService struct {
	db *sqlx.DB
}

// NewApiKeyService 创建API密钥服务实例
func NewApiKeyService(db *sqlx.DB) *ApiKeyService {
	return &ApiKeyService{db: db}
}

// CreateApiKeyRequest 创建API密钥请求
type CreateApiKeyRequest struct {
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
	ExpiresAt   *int64   `json:"expires_at,omitempty"`
}

// CreateApiKey 创建API密钥
func (s *ApiKeyService) CreateApiKey(userID uint64, req CreateApiKeyRequest) (map[string]interface{}, error) {
	// 生成API密钥
	apiKey := util.GenerateRandomString(32)
	keyPrefix := apiKey[:8]
	keyHash := hashApiKey(apiKey)

	// 序列化权限
	permissionsJSON := "[]"
	if len(req.Permissions) > 0 {
		permissionsJSON = fmt.Sprintf(`["%s"]`, joinStrings(req.Permissions, `","`))
	}

	// 插入数据库
	result, err := s.db.Exec(
		`INSERT INTO api_keys (user_id, name, key_prefix, key_hash, permissions, is_active, last_used_at, expires_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 1, NULL, ?, NOW(3), NOW(3))`,
		userID, req.Name, keyPrefix, keyHash, permissionsJSON, req.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()

	return map[string]interface{}{
		"id":         id,
		"name":       req.Name,
		"key":        apiKey,
		"key_prefix": keyPrefix,
		"permissions": req.Permissions,
	}, nil
}

// ListApiKeys 获取API密钥列表
func (s *ApiKeyService) ListApiKeys(userID uint64) ([]map[string]interface{}, error) {
	var apiKeys []ApiKey
	err := s.db.Select(&apiKeys,
		"SELECT * FROM api_keys WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, 0, len(apiKeys))
	for _, key := range apiKeys {
		item := map[string]interface{}{
			"id":         key.ID,
			"name":       key.Name,
			"key_prefix": key.KeyPrefix,
			"is_active":  key.IsActive,
			"created_at": key.CreatedAt.Unix(),
		}

		if key.LastUsedAt != nil {
			item["last_used_at"] = key.LastUsedAt.Unix()
		}
		if key.ExpiresAt != nil {
			item["expires_at"] = key.ExpiresAt.Unix()
		}

		result = append(result, item)
	}

	return result, nil
}

// UpdateApiKey 更新API密钥
func (s *ApiKeyService) UpdateApiKey(userID uint64, keyID uint64, name string, isActive bool) error {
	_, err := s.db.Exec(
		"UPDATE api_keys SET name = ?, is_active = ?, updated_at = NOW(3) WHERE id = ? AND user_id = ?",
		name, isActive, keyID, userID,
	)
	return err
}

// DeleteApiKey 删除API密钥
func (s *ApiKeyService) DeleteApiKey(userID uint64, keyID uint64) error {
	_, err := s.db.Exec(
		"UPDATE api_keys SET deleted_at = NOW(3) WHERE id = ? AND user_id = ?",
		keyID, userID,
	)
	return err
}

// ValidateApiKey 验证API密钥
func (s *ApiKeyService) ValidateApiKey(apiKey string) (*ApiKey, error) {
	keyHash := hashApiKey(apiKey)
	keyPrefix := apiKey[:8]

	var key ApiKey
	err := s.db.Get(&key,
		"SELECT * FROM api_keys WHERE key_prefix = ? AND key_hash = ? AND is_active = 1 AND deleted_at IS NULL",
		keyPrefix, keyHash,
	)
	if err != nil {
		return nil, err
	}

	// 检查是否过期
	if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("API密钥已过期")
	}

	// 更新最后使用时间
	s.db.Exec(
		"UPDATE api_keys SET last_used_at = NOW(3) WHERE id = ?",
		key.ID,
	)

	return &key, nil
}

// hashApiKey 哈希API密钥
func hashApiKey(apiKey string) string {
	h := sha256.Sum256([]byte(apiKey))
	return hex.EncodeToString(h[:])
}

// joinStrings 连接字符串
func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
