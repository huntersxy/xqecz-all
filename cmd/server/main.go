package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime/debug"
	"syscall"
	"time"

	"xqecz-all/internal/config"
	"xqecz-all/internal/handler"
	"xqecz-all/internal/middleware"
	"xqecz-all/internal/util"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	fiberRecover "github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jmoiron/sqlx"
	_ "github.com/go-sql-driver/mysql"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var appInstance *fiber.App

func main() {
	// 捕获 panic 并自重启
	defer func() {
		if r := recover(); r != nil {
			log.Error().Interface("panic", r).Bytes("stack", debug.Stack()).Msg("程序崩溃，3秒后重启...")
			time.Sleep(3 * time.Second)
			restartSelf()
		}
	}()

	// 监听信号（SIGINT/SIGTERM 触发重启）
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigChan
		log.Info().Str("signal", sig.String()).Msg("收到重启信号，正在重启...")
		time.Sleep(500 * time.Millisecond)
		restartSelf()
	}()

	runServer()
}

// restartSelf 重启自身进程
func restartSelf() {
	// 优雅关闭
	if appInstance != nil {
		_ = appInstance.Shutdown()
	}

	exe, err := os.Executable()
	if err != nil {
		log.Fatal().Err(err).Msg("无法获取可执行文件路径")
	}
	cmd := exec.Command(exe)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir, _ = os.Getwd()
	if err := cmd.Start(); err != nil {
		log.Fatal().Err(err).Msg("重启失败")
	}
	os.Exit(0)
}

// SendRestartSignal 发送重启信号给运行中的服务
func SendRestartSignal() error {
	pidFile := "logs/server.pid"
	pidData, err := os.ReadFile(pidFile)
	if err != nil {
		return fmt.Errorf("无法读取PID文件: %w", err)
	}
	var pid int
	fmt.Sscanf(string(pidData), "%d", &pid)
	process, err := os.FindProcess(pid)
	if err != nil {
		return fmt.Errorf("找不到进程: %w", err)
	}
	return process.Signal(syscall.SIGINT)
}

func runServer() {
	// 配置日志
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	// 获取工作目录
	workDir, err := os.Getwd()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get working directory")
	}

	// 检查是否在Docker容器中
	if _, err := os.Stat("/app/config/config.yaml"); err == nil {
		workDir = "/app"
	}

	// 加载配置
	configPath := filepath.Join(workDir, "config", "config.yaml")
	cfg, err := config.Load(configPath)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load config")
	}
	log.Info().Msg("Config loaded successfully")

	// 初始化数据库
	dbDSN := cfg.MySQL.DSN()
	db, err := sqlx.Connect("mysql", dbDSN)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	// 配置连接池
	db.SetMaxOpenConns(cfg.MySQL.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MySQL.MinConns)

	log.Info().Msg("Database connected successfully")

	// 执行数据库迁移
	if err := util.Migrate(db); err != nil {
		log.Fatal().Err(err).Msg("Failed to migrate database")
	}

	// 初始化Redis
	if err := util.InitRedisWithPrefix(cfg.Redis.Host, cfg.Redis.Port, cfg.Redis.Password, cfg.Redis.DB, cfg.Redis.Prefix); err != nil {
		log.Warn().Err(err).Msg("Redis connection failed, will use memory storage for sessions")
	} else {
		log.Info().Msg("Redis connected successfully")
		util.ClearCachesOnStartup()
	}
	defer util.CloseRedis()

	// 注入数据库到中间件
	middleware.GetUserByID = func(userID uint64) (*middleware.User, error) {
		var user middleware.User
		err := db.Get(&user, "SELECT id, username, password, is_admin, is_banned FROM users WHERE id = ? AND deleted_at IS NULL", userID)
		return &user, err
	}

	// 检查FFmpeg
	if err := util.CheckFFmpeg(); err != nil {
		log.Warn().Msg("FFmpeg not found, video thumbnail generation will be unavailable")
	} else {
		version, _ := util.GetFFmpegVersion()
		log.Info().Str("version", version).Msg("FFmpeg detected")
	}

	// 创建Fiber应用
	appInstance = fiber.New(fiber.Config{
		AppName:      "xqecz-all",
		BodyLimit:    int(cfg.Server.MaxUploadSize),
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  120 * time.Second,
	})

	// 全局中间件
	appInstance.Use(fiberRecover.New())
	appInstance.Use(compress.New())
	appInstance.Use(middleware.CORS(cfg.Server.AllowedOrigins))
	appInstance.Use(middleware.ErrorHandler())

	// 静态文件服务
	appInstance.Static("/uploads", cfg.Server.UploadDir)
	appInstance.Static("/thumbnails", cfg.Server.ThumbnailDir)
	appInstance.Static("/images", cfg.Server.ImagesDir)

	// 前端静态文件
	appInstance.Static("/", "./frontend/dist")

	// 创建处理器实例
	authHandler := handler.NewAuthHandler(db)
	contentHandler := handler.NewContentHandler(db)
	commentHandler := handler.NewCommentHandler(db)
	pollHandler := handler.NewPollHandler(db)
	adminHandler := handler.NewAdminHandler(db)
	notificationHandler := handler.NewNotificationHandler(db)
	apiKeyHandler := handler.NewApiKeyHandler(db)

	// API路由
	api := appInstance.Group("/api")

	// 认证路由（带限流）
	auth := api.Group("/auth")
	auth.Use(middleware.RateLimit(10, 20)) // 10请求/分钟，突发20
	{
		auth.Post("/register", authHandler.Register)
		auth.Post("/login", authHandler.Login)
		auth.Post("/logout", authHandler.Logout)
		auth.Post("/init-admin", authHandler.InitAdmin)
		auth.Get("/me", middleware.Auth(), authHandler.GetMe)
	}

	// 内容路由
	content := api.Group("/content")
	{
		// 公开路由
		content.Get("/list", contentHandler.GetContentList)
		content.Get("/search", contentHandler.SearchContent)
		content.Get("/recommend", contentHandler.RecommendContent)
		content.Get("/tags", contentHandler.GetAllTags)

		// 需要认证的路由（必须在 /:id 之前）
		content.Post("/upload", middleware.Auth(), contentHandler.UploadContent)
		content.Post("/upload-image", middleware.Auth(), contentHandler.UploadImage)
		content.Get("/my", middleware.Auth(), contentHandler.GetMyContentList)

		// 参数路由（必须在固定路由之后）
		content.Get("/:id", contentHandler.GetContent)
		content.Put("/:id", middleware.Auth(), contentHandler.UpdateContent)
		content.Delete("/:id", middleware.Auth(), contentHandler.DeleteContent)
		content.Post("/:content_id/claim", middleware.Auth(), contentHandler.CreateClaim)
	}

	// 评论路由
	comment := api.Group("/comment")
	{
		// 公开路由
		comment.Get("/list/:content_id", commentHandler.GetComments)
		comment.Get("/count/:content_id", commentHandler.GetCommentCount)

		// 需要认证的路由
		comment.Post("/add", middleware.Auth(), commentHandler.AddComment)
		comment.Delete("/:id", middleware.Auth(), commentHandler.DeleteComment)
		comment.Post("/report", middleware.Auth(), commentHandler.ReportComment)
	}

	// 投票路由
	poll := api.Group("/poll")
	{
		// 公开路由
		poll.Get("/list", pollHandler.GetPollList)
		poll.Get("/:id", middleware.OptionalAuth(), pollHandler.GetPoll)
		poll.Post("/:id/vote", middleware.OptionalAuth(), pollHandler.VotePoll)

		// 需要认证的路由
		poll.Post("/create", middleware.Auth(), pollHandler.CreatePoll)
		poll.Delete("/:id", middleware.Auth(), pollHandler.DeletePoll)
	}

	// 通知路由
	notification := api.Group("/notifications")
	notification.Use(middleware.Auth())
	{
		notification.Post("/device", notificationHandler.RegisterDevice)
		notification.Delete("/device/:token", notificationHandler.UnregisterDevice)
		notification.Get("/list", notificationHandler.GetNotifications)
		notification.Get("/unread-count", notificationHandler.GetUnreadCount)
		notification.Put("/:id/read", notificationHandler.MarkAsRead)
		notification.Put("/read-all", notificationHandler.MarkAllAsRead)
	}

	// 管理后台路由
	admin := api.Group("/admin")
	admin.Use(middleware.Auth(), middleware.Admin())
	{
		// 内容管理
		admin.Post("/audit/:id", adminHandler.AuditContent)
		admin.Get("/pending", adminHandler.GetPendingContent)
		admin.Get("/content/all", adminHandler.GetAllContent)
		admin.Put("/content/:id/author", adminHandler.UpdateContentAuthor)
		admin.Post("/content/:id/regenerate-thumbnail", adminHandler.RegenerateThumbnail)
		admin.Post("/content/regenerate-all-thumbnails", adminHandler.RegenerateAllThumbnails)
		admin.Delete("/content/purge", adminHandler.PurgeDeletedContent)
		admin.Delete("/files/clean", adminHandler.CleanOrphanedFiles)

		// 用户管理
		admin.Get("/users", adminHandler.GetUsers)
		admin.Put("/users/:id/role", adminHandler.UpdateUserRole)
		admin.Put("/users/:id/ban", adminHandler.BanUser)
		admin.Delete("/users/:id", adminHandler.DeleteUser)

		// 举报管理
		admin.Get("/comments/reports", commentHandler.GetCommentReports)
		admin.Post("/comments/reports/:id/handle", commentHandler.HandleReport)

		// 认领管理
		admin.Get("/claims", adminHandler.GetClaimList)
		admin.Post("/claims/:id/handle", adminHandler.HandleClaim)
	}

	// API密钥路由
	apiKey := api.Group("/api-keys")
	apiKey.Use(middleware.Auth())
	{
		apiKey.Post("/", apiKeyHandler.CreateApiKey)
		apiKey.Get("/", apiKeyHandler.ListApiKeys)
		apiKey.Put("/:id", apiKeyHandler.UpdateApiKey)
		apiKey.Delete("/:id", apiKeyHandler.DeleteApiKey)
	}

	// 启动后台任务
	startSchedulers(db)

	// 启动服务器
	port := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Info().Str("port", port).Msg("Starting server")
	if err := appInstance.Listen(port); err != nil {
		log.Error().Err(err).Msg("服务异常退出，3秒后重启...")
		time.Sleep(3 * time.Second)
		restartSelf()
	}
}
