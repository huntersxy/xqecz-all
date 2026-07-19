package config

import "fmt"

// Config 应用配置结构
type Config struct {
	MySQL     MySQLConfig     `mapstructure:"mysql"`
	Redis     RedisConfig     `mapstructure:"redis"`
	Server    ServerConfig    `mapstructure:"server"`
	Recommend RecommendConfig `mapstructure:"recommend"`
	Push      PushConfig      `mapstructure:"push"`
	SpamAPI   SpamAPIConfig   `mapstructure:"spam_api"`
	Tinify    TinifyConfig    `mapstructure:"tinify"`
	InitAdmin bool            `mapstructure:"init_admin"`
}

// MySQLConfig 数据库配置
type MySQLConfig struct {
	Host            string `mapstructure:"host"`
	Port            int    `mapstructure:"port"`
	User            string `mapstructure:"user"`
	Password        string `mapstructure:"password"`
	Database        string `mapstructure:"database"`
	Charset         string `mapstructure:"charset"`
	MaxOpenConns    int    `mapstructure:"max_open_conns"`
	MinConns        int    `mapstructure:"min_conns"`
	ConnMaxLifetime int    `mapstructure:"conn_max_lifetime"`
	ConnMaxIdleTime int    `mapstructure:"conn_max_idle_time"`
	AcquireTimeout  int    `mapstructure:"acquire_timeout"`
}

// DSN 返回数据库连接字符串
func (c MySQLConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		c.User, c.Password, c.Host, c.Port, c.Database, c.Charset)
}

// RedisConfig Redis配置
type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
	Timeout  int    `mapstructure:"timeout"`
	Prefix   string `mapstructure:"prefix"`
}

// Addr 返回Redis地址
func (c RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port           int      `mapstructure:"port"`
	UploadDir      string   `mapstructure:"upload_dir"`
	ThumbnailDir   string   `mapstructure:"thumbnail_dir"`
	ImagesDir      string   `mapstructure:"images_dir"`
	MaxUploadSize  int64    `mapstructure:"max_upload_size"`
	AllowedOrigins []string `mapstructure:"allowed_origins"`
}

// RecommendConfig 推荐配置
type RecommendConfig struct {
	ExcludedTags []string `mapstructure:"excluded_tags"`
}

// PushConfig 推送配置
type PushConfig struct {
	JPushKey    string `mapstructure:"jpush_key"`
	JPushSecret string `mapstructure:"jpush_secret"`
	Enabled     bool   `mapstructure:"enabled"`
}

// SpamAPIConfig 垃圾评论API配置
type SpamAPIConfig struct {
	URL string `mapstructure:"url"`
}

// TinifyConfig Tinify压缩配置
type TinifyConfig struct {
	APIKey  string `mapstructure:"api_key"`
	Enabled bool   `mapstructure:"enabled"`
}
