package util

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
)

// Migrate 执行数据库迁移
func Migrate(db *sqlx.DB) error {
	queries := []string{
		// 用户表
		`CREATE TABLE IF NOT EXISTS users (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			username VARCHAR(50) NOT NULL UNIQUE,
			password VARCHAR(255) NOT NULL,
			is_admin BOOLEAN DEFAULT FALSE,
			is_banned BOOLEAN DEFAULT FALSE,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			deleted_at DATETIME(3) NULL,
			INDEX idx_users_deleted_at (deleted_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 内容表
		`CREATE TABLE IF NOT EXISTS contents (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			title VARCHAR(200) NOT NULL,
			type VARCHAR(20) NOT NULL,
			content TEXT,
			file_path VARCHAR(500),
			file_size BIGINT DEFAULT 0,
			thumb_path VARCHAR(500),
			compressed_path VARCHAR(500) DEFAULT '',
			url VARCHAR(500),
			platform VARCHAR(20),
			view_count BIGINT DEFAULT 0,
			user_id BIGINT UNSIGNED NOT NULL,
			big_tag_id BIGINT UNSIGNED,
			small_tag_id BIGINT UNSIGNED,
			tags TEXT,
			audit_status VARCHAR(20) DEFAULT 'pending',
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			deleted_at DATETIME(3) NULL,
			INDEX idx_contents_user_id (user_id),
			INDEX idx_contents_audit_status (audit_status),
			INDEX idx_contents_deleted_at (deleted_at),
			INDEX idx_contents_created_at (created_at),
			INDEX idx_contents_type (type)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 评论表
		`CREATE TABLE IF NOT EXISTS comments (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			content_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL,
			text TEXT NOT NULL,
			parent_id BIGINT UNSIGNED,
			is_banned BOOLEAN DEFAULT FALSE,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			deleted_at DATETIME(3) NULL,
			INDEX idx_comments_content_id (content_id),
			INDEX idx_comments_user_id (user_id),
			INDEX idx_comments_parent_id (parent_id),
			INDEX idx_comments_deleted_at (deleted_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 评论举报表
		`CREATE TABLE IF NOT EXISTS comment_reports (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			comment_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL,
			reason VARCHAR(255),
			handled BOOLEAN DEFAULT FALSE,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			deleted_at DATETIME(3) NULL,
			INDEX idx_comment_reports_comment_id (comment_id),
			INDEX idx_comment_reports_user_id (user_id),
			INDEX idx_comment_reports_handled (handled)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 审核日志表
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			content_id BIGINT UNSIGNED NOT NULL,
			admin_id BIGINT UNSIGNED NOT NULL,
			status VARCHAR(20) NOT NULL,
			remark TEXT,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			INDEX idx_audit_logs_content_id (content_id),
			INDEX idx_audit_logs_admin_id (admin_id),
			INDEX idx_audit_logs_created_at (created_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 投票表
		`CREATE TABLE IF NOT EXISTS polls (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			title VARCHAR(200) NOT NULL,
			description TEXT,
			options TEXT,
			vote_count BIGINT DEFAULT 0,
			user_id BIGINT UNSIGNED NOT NULL,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			deleted_at DATETIME(3) NULL,
			INDEX idx_polls_user_id (user_id),
			INDEX idx_polls_deleted_at (deleted_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 投票记录表
		`CREATE TABLE IF NOT EXISTS poll_votes (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			poll_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED,
			visitor_id VARCHAR(64),
			option_index INT NOT NULL,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			UNIQUE KEY uk_poll_votes_user (poll_id, user_id),
			UNIQUE KEY uk_poll_votes_visitor (poll_id, visitor_id),
			INDEX idx_poll_votes_poll_id (poll_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 内容认领表
		`CREATE TABLE IF NOT EXISTS claims (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			content_id BIGINT UNSIGNED NOT NULL,
			user_id BIGINT UNSIGNED NOT NULL,
			reason TEXT,
			status VARCHAR(20) DEFAULT 'pending',
			approved_by BIGINT UNSIGNED,
			remark TEXT,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			INDEX idx_claims_content_id (content_id),
			INDEX idx_claims_user_id (user_id),
			INDEX idx_claims_status (status)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 通知表
		`CREATE TABLE IF NOT EXISTS notifications (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			user_id BIGINT UNSIGNED NOT NULL,
			type VARCHAR(20) NOT NULL,
			title VARCHAR(200) NOT NULL,
			content TEXT,
			related_id BIGINT UNSIGNED,
			is_read BOOLEAN DEFAULT FALSE,
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			INDEX idx_notifications_user_id (user_id),
			INDEX idx_notifications_is_read (is_read),
			INDEX idx_notifications_created_at (created_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// 用户设备表
		`CREATE TABLE IF NOT EXISTS user_devices (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			user_id BIGINT UNSIGNED NOT NULL,
			device_token VARCHAR(255) NOT NULL,
			platform VARCHAR(20),
			device_info TEXT,
			last_active_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			last_push_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			UNIQUE KEY uk_user_devices_token (device_token),
			INDEX idx_user_devices_user_id (user_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		// API密钥表
		`CREATE TABLE IF NOT EXISTS api_keys (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			user_id BIGINT UNSIGNED NOT NULL,
			name VARCHAR(100) NOT NULL,
			key_prefix VARCHAR(10) NOT NULL,
			key_hash VARCHAR(64) NOT NULL,
			permissions TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			last_used_at DATETIME(3),
			expires_at DATETIME(3),
			created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
			updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
			deleted_at DATETIME(3) NULL,
			INDEX idx_api_keys_user_id (user_id),
			INDEX idx_api_keys_key_prefix (key_prefix),
			INDEX idx_api_keys_deleted_at (deleted_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	log.Println("[DB] Migration completed successfully")
	return nil
}
