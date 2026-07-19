package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/spf13/viper"
)

var (
	globalConfig *Config
	configOnce   sync.Once
)

// Load 加载配置文件
func Load(path string) (*Config, error) {
	var err error
	configOnce.Do(func() {
		v := viper.New()
		v.SetConfigFile(path)
		v.SetConfigType("yaml")

		// 设置默认值
		setDefaults(v)

		// 读取配置文件
		if err = v.ReadInConfig(); err != nil {
			if _, ok := err.(viper.ConfigFileNotFoundError); ok {
				// 配置文件不存在，创建默认配置
				if err = createDefaultConfig(path); err != nil {
					return
				}
				if err = v.ReadInConfig(); err != nil {
					return
				}
			} else {
				return
			}
		}

		// 解析配置
		globalConfig = &Config{}
		if err = v.Unmarshal(globalConfig); err != nil {
			return
		}

		// 创建必要的目录
		createDirectories(globalConfig)
	})

	return globalConfig, err
}

// Get 获取全局配置
func Get() *Config {
	if globalConfig == nil {
		panic("config not loaded, call Load() first")
	}
	return globalConfig
}

// setDefaults 设置默认值
func setDefaults(v *viper.Viper) {
	// MySQL默认值
	v.SetDefault("mysql.host", "127.0.0.1")
	v.SetDefault("mysql.port", 3306)
	v.SetDefault("mysql.user", "root")
	v.SetDefault("mysql.password", "root")
	v.SetDefault("mysql.database", "xqecz")
	v.SetDefault("mysql.charset", "utf8mb4")
	v.SetDefault("mysql.max_open_conns", 100)
	v.SetDefault("mysql.min_conns", 10)
	v.SetDefault("mysql.conn_max_lifetime", 3600)
	v.SetDefault("mysql.conn_max_idle_time", 1800)
	v.SetDefault("mysql.acquire_timeout", 10)

	// Redis默认值
	v.SetDefault("redis.host", "127.0.0.1")
	v.SetDefault("redis.port", 6379)
	v.SetDefault("redis.password", "")
	v.SetDefault("redis.db", 0)
	v.SetDefault("redis.timeout", 5)
	v.SetDefault("redis.prefix", "xqecz:")

	// Server默认值
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.upload_dir", "./uploads")
	v.SetDefault("server.thumbnail_dir", "./thumbnails")
	v.SetDefault("server.images_dir", "./images")
	v.SetDefault("server.max_upload_size", 1073741824) // 1GB
	v.SetDefault("server.allowed_origins", []string{"*"})

	// Recommend默认值
	v.SetDefault("recommend.excluded_tags", []string{})

	// Push默认值
	v.SetDefault("push.jpush_key", "")
	v.SetDefault("push.jpush_secret", "")
	v.SetDefault("push.enabled", false)

	// SpamAPI默认值
	v.SetDefault("spam_api.url", "")

	// Tinify默认值
	v.SetDefault("tinify.api_key", "")
	v.SetDefault("tinify.enabled", false)

	// InitAdmin默认值
	v.SetDefault("init_admin", false)
}

// createDefaultConfig 创建默认配置文件
func createDefaultConfig(path string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	defaultConfig := `# xqecz-all 配置文件
# 数据库配置
mysql:
  host: "127.0.0.1"
  port: 3306
  user: "root"
  password: "root"
  database: "xqecz"
  charset: "utf8mb4"
  max_open_conns: 100
  min_conns: 10
  conn_max_lifetime: 3600
  conn_max_idle_time: 1800
  acquire_timeout: 10

# Redis配置
redis:
  host: "127.0.0.1"
  port: 6379
  password: ""
  db: 0
  timeout: 5
  prefix: "xqecz:"

# 服务器配置
server:
  port: 8080
  upload_dir: "./uploads"
  thumbnail_dir: "./thumbnails"
  images_dir: "./images"
  max_upload_size: 1073741824  # 1GB
  allowed_origins:
    - "*"

# 推荐配置
recommend:
  excluded_tags: []

# 推送配置
push:
  jpush_key: ""
  jpush_secret: ""
  enabled: false

# 垃圾评论API配置
spam_api:
  url: ""

# Tinify压缩配置
tinify:
  api_key: ""
  enabled: false

# 是否初始化管理员账户
init_admin: false
`

	return os.WriteFile(path, []byte(defaultConfig), 0644)
}

// createDirectories 创建必要的目录
func createDirectories(cfg *Config) {
	dirs := []string{
		cfg.Server.UploadDir,
		cfg.Server.ThumbnailDir,
		cfg.Server.ImagesDir,
	}

	for _, dir := range dirs {
		if dir != "" {
			os.MkdirAll(dir, 0755)
		}
	}
}
