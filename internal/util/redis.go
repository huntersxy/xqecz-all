package util

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/bytedance/sonic"
	"github.com/redis/go-redis/v9"
)

var (
	rdb        *redis.Client
	ctx        = context.Background()
	keyPrefix  = "xqecz:" // 默认前缀，可通过 InitRedisWithPrefix 修改
)

// InitRedis 初始化Redis连接
func InitRedis(host string, port int, password string, db int) error {
	return InitRedisWithPrefix(host, port, password, db, "xqecz:")
}

// InitRedisWithPrefix 初始化Redis连接（带前缀）
func InitRedisWithPrefix(host string, port int, password string, db int, prefix string) error {
	keyPrefix = prefix
	rdb = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", host, port),
		Password: password,
		DB:       db,
		PoolSize: 100,
	})

	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("redis connection failed: %w", err)
	}

	return nil
}

// GetRedis 获取Redis客户端
func GetRedis() *redis.Client {
	return rdb
}

// CloseRedis 关闭Redis连接
func CloseRedis() error {
	if rdb != nil {
		return rdb.Close()
	}
	return nil
}

// RedisKey 获取带前缀的key
func RedisKey(key string) string {
	return keyPrefix + key
}

// SetCache 设置缓存
func SetCache(key string, value interface{}, expiration time.Duration) error {
	if rdb == nil {
		return fmt.Errorf("redis not available")
	}
	return rdb.Set(ctx, RedisKey(key), value, expiration).Err()
}

// GetCache 获取缓存
func GetCache(key string) (string, error) {
	if rdb == nil {
		return "", fmt.Errorf("redis not available")
	}
	return rdb.Get(ctx, RedisKey(key)).Result()
}

// SetCacheJSON 设置JSON缓存
func SetCacheJSON(key string, value interface{}, expiration time.Duration) error {
	if rdb == nil {
		return fmt.Errorf("redis not available")
	}
	data, err := sonic.Marshal(value)
	if err != nil {
		return err
	}
	return rdb.Set(ctx, RedisKey(key), data, expiration).Err()
}

// GetCacheJSON 获取JSON缓存
func GetCacheJSON(key string, value interface{}) error {
	if rdb == nil {
		return fmt.Errorf("redis not available")
	}
	data, err := rdb.Get(ctx, RedisKey(key)).Bytes()
	if err != nil {
		return err
	}
	return sonic.Unmarshal(data, value)
}

// DelCache 删除缓存
func DelCache(key string) error {
	if rdb == nil {
		return fmt.Errorf("redis not available")
	}
	return rdb.Del(ctx, RedisKey(key)).Err()
}

// ExistsCache 检查缓存是否存在
func ExistsCache(key string) (bool, error) {
	if rdb == nil {
		return false, fmt.Errorf("redis not available")
	}
	exists, err := rdb.Exists(ctx, RedisKey(key)).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

// SetSession 设置会话
func SetSession(sessionID string, userID uint64) error {
	return SetCache(fmt.Sprintf("session:%s", sessionID), userID,
		time.Duration(CookieMaxAge)*time.Second)
}

// GetSession 获取会话
func GetSession(sessionID string) (uint64, error) {
	val, err := GetCache(fmt.Sprintf("session:%s", sessionID))
	if err != nil {
		return 0, err
	}
	var userID uint64
	if _, err := fmt.Sscanf(val, "%d", &userID); err != nil {
		return 0, err
	}

	// 自动续期：当TTL低于50%（15天）时续期
	key := RedisKey(fmt.Sprintf("session:%s", sessionID))
	if ttl, err := rdb.TTL(ctx, key).Result(); err == nil {
		if ttl < 15*24*time.Hour {
			rdb.Expire(ctx, key, time.Duration(CookieMaxAge)*time.Second)
		}
	}

	return userID, nil
}

// DelSession 删除会话
func DelSession(sessionID string) error {
	return DelCache(fmt.Sprintf("session:%s", sessionID))
}

// DeleteSession 删除会话（别名）
func DeleteSession(sessionID string) error {
	return DelSession(sessionID)
}

// IsRedisAvailable 检查Redis是否可用
func IsRedisAvailable() bool {
	return rdb != nil
}

// ZRevRangeRecommend 获取推荐ZSet（倒序）
func ZRevRangeRecommend(start, end int64) ([]uint64, error) {
	if rdb == nil {
		return nil, fmt.Errorf("redis not available")
	}
	key := "recommend:zset"
	vals, err := rdb.ZRevRange(ctx, key, start, end).Result()
	if err != nil {
		return nil, err
	}
	var ids []uint64
	for _, v := range vals {
		var id uint64
		if _, err := fmt.Sscanf(v, "%d", &id); err == nil {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

// ClearCommentCache 清除评论缓存
func ClearCommentCache(contentID uint64) {
	if rdb == nil {
		return
	}
	// 清除评论列表缓存
	pattern := fmt.Sprintf("comments:%d:*", contentID)
	clearCacheByPattern(pattern)
	// 清除评论数量缓存
	DelCache(fmt.Sprintf("comment_count:%d", contentID))
}

// ClearContentListCache 清除内容列表缓存
func ClearContentListCache() {
	if rdb == nil {
		return
	}
	clearCacheByPattern("content_list:*")
}

// ClearContentCache 清除内容详情缓存
func ClearContentCache(contentID uint64) {
	if rdb == nil {
		return
	}
	DelCache(fmt.Sprintf("content:%d", contentID))
}

// ClearUserInfoCache 清除用户信息缓存
func ClearUserInfoCache(userID uint64) {
	if rdb == nil {
		return
	}
	DelCache(fmt.Sprintf("user:%d", userID))
}

// clearCacheByPattern 根据模式清除缓存
func clearCacheByPattern(pattern string) {
	if rdb == nil {
		return
	}
	iter := rdb.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		rdb.Del(ctx, iter.Val())
	}
}

// SetViewCount 设置查看计数
func SetViewCount(contentID uint64, date string, count int) error {
	key := fmt.Sprintf("views:date:%s:%d", date, contentID)
	return SetCache(key, count, 32*24*time.Hour)
}

// GetViewCount 获取查看计数
func GetViewCount(contentID uint64, date string) (int, error) {
	key := fmt.Sprintf("views:date:%s:%d", date, contentID)
	val, err := GetCache(key)
	if err != nil {
		return 0, nil // 缓存未命中返回0
	}
	var count int
	if _, err := fmt.Sscanf(val, "%d", &count); err != nil {
		return 0, nil
	}
	return count, nil
}

// GetAllPeriodViewCounts 批量获取所有时间段的查看计数
func GetAllPeriodViewCounts(contentIDs []uint64) (map[uint64]map[string]int, error) {
	if rdb == nil {
		return nil, fmt.Errorf("redis not available")
	}

	result := make(map[uint64]map[string]int)
	now := time.Now()

	// 构建所有需要查询的key
	var keys []string
	keyMap := make(map[string]struct {
		contentID uint64
		date      string
	})

	for _, contentID := range contentIDs {
		for days := 0; days < 30; days++ {
			date := now.AddDate(0, 0, -days).Format("2006-01-02")
			key := RedisKey(fmt.Sprintf("views:date:%s:%d", date, contentID))
			keys = append(keys, key)
			keyMap[key] = struct {
				contentID uint64
				date      string
			}{contentID, date}
		}
	}

	// 批量获取
	values, err := rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, err
	}

	// 解析结果
	for i, val := range values {
		if val == nil {
			continue
		}
		info := keyMap[keys[i]]
		if result[info.contentID] == nil {
			result[info.contentID] = make(map[string]int)
		}
		var count int
		if _, err := fmt.Sscanf(val.(string), "%d", &count); err == nil {
			result[info.contentID][info.date] = count
		}
	}

	return result, nil
}

// SetRecommendZSet 设置推荐ZSet
func SetRecommendZSet(key string, members []redis.Z) error {
	if rdb == nil {
		return fmt.Errorf("redis not available")
	}

	// 使用临时key，然后原子交换
	tempKey := key + ":temp"
	pipe := rdb.Pipeline()

	// 清空临时key
	pipe.Del(ctx, tempKey)

	// 写入临时key
	if len(members) > 0 {
		pipe.ZAdd(ctx, tempKey, members...)
	}

	// 原子交换
	pipe.Rename(ctx, tempKey, key)

	_, err := pipe.Exec(ctx)
	return err
}

// GetRecommendZSet 获取推荐ZSet
func GetRecommendZSet(key string, count int64) ([]string, error) {
	if rdb == nil {
		return nil, fmt.Errorf("redis not available")
	}
	return rdb.ZRevRange(ctx, key, 0, count-1).Result()
}

// ClearCachesOnStartup 启动时清理缓存
func ClearCachesOnStartup() {
	if rdb == nil {
		return
	}

	// 清理除session和view之外的缓存
	pattern := RedisKey("*")
	iter := rdb.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		// 保留session和view计数
		if strings.Contains(key, ":session:") || strings.Contains(key, ":views:date:") {
			continue
		}
		rdb.Del(ctx, key)
	}
}

// ZAddToTempRecommend 添加到临时推荐ZSet
func ZAddToTempRecommend(contentID uint64, score float64) {
	if rdb == nil {
		return
	}
	rdb.ZAdd(ctx, "recommend:temp", redis.Z{
		Score:  score,
		Member: contentID,
	})
}

// SwapRecommendZSet 替换推荐ZSet
func SwapRecommendZSet() error {
	if rdb == nil {
		return fmt.Errorf("redis not available")
	}
	// 删除旧的推荐ZSet
	rdb.Del(ctx, "recommend:zset")
	// 重命名临时ZSet为正式ZSet
	return rdb.Rename(ctx, "recommend:temp", "recommend:zset").Err()
}
