package repository

import (
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

// User 用户数据模型
type User struct {
	ID        uint64       `db:"id" json:"id"`
	Username  string       `db:"username" json:"username"`
	Password  string       `db:"password" json:"-"`
	IsAdmin   bool         `db:"is_admin" json:"is_admin"`
	IsBanned  bool         `db:"is_banned" json:"is_banned"`
	CreatedAt time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt time.Time    `db:"updated_at" json:"updated_at"`
	DeletedAt sql.NullTime `db:"deleted_at" json:"-"`
}

// UserRepository 用户数据访问层
type UserRepository struct {
	db *sqlx.DB
}

// NewUserRepository 创建用户仓库实例
func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByID 根据ID查找用户
func (r *UserRepository) FindByID(id uint64) (*User, error) {
	var user User
	err := r.db.Get(&user, "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL", id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername 根据用户名查找用户
func (r *UserRepository) FindByUsername(username string) (*User, error) {
	var user User
	err := r.db.Get(&user, "SELECT * FROM users WHERE username = ? AND deleted_at IS NULL", username)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Create 创建用户
func (r *UserRepository) Create(username, hashedPassword string) (uint64, error) {
	result, err := r.db.Exec(
		"INSERT INTO users (username, password, is_admin, is_banned, created_at, updated_at) VALUES (?, ?, 0, 0, NOW(3), NOW(3))",
		username, hashedPassword,
	)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return uint64(id), nil
}

// UpdateRole 更新用户角色
func (r *UserRepository) UpdateRole(id uint64, isAdmin bool) error {
	_, err := r.db.Exec("UPDATE users SET is_admin = ?, updated_at = NOW(3) WHERE id = ?", isAdmin, id)
	return err
}

// UpdateBanStatus 更新用户封禁状态
func (r *UserRepository) UpdateBanStatus(id uint64, isBanned bool) error {
	_, err := r.db.Exec("UPDATE users SET is_banned = ?, updated_at = NOW(3) WHERE id = ?", isBanned, id)
	return err
}

// Delete 删除用户（软删除）
func (r *UserRepository) Delete(id uint64) error {
	_, err := r.db.Exec("UPDATE users SET deleted_at = NOW(3), updated_at = NOW(3) WHERE id = ?", id)
	return err
}

// List 获取用户列表
func (r *UserRepository) List(keyword string, page, pageSize int) ([]User, int64, error) {
	var total int64
	var users []User

	conditions := "deleted_at IS NULL"
	args := []interface{}{}

	if keyword != "" {
		conditions += " AND username LIKE ?"
		args = append(args, "%"+keyword+"%")
	}

	// 计算总数
	countSQL := "SELECT COUNT(*) FROM users WHERE " + conditions
	err := r.db.Get(&total, countSQL, args...)
	if err != nil {
		return nil, 0, err
	}

	// 查询列表
	offset := (page - 1) * pageSize
	dataSQL := "SELECT * FROM users WHERE " + conditions + " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)
	err = r.db.Select(&users, dataSQL, args...)
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// BatchFindByIDs 批量查找用户
func (r *UserRepository) BatchFindByIDs(ids []uint64) (map[uint64]*User, error) {
	if len(ids) == 0 {
		return make(map[uint64]*User), nil
	}

	query, args, err := sqlx.In("SELECT * FROM users WHERE id IN (?) AND deleted_at IS NULL", ids)
	if err != nil {
		return nil, err
	}

	var users []User
	err = r.db.Select(&users, r.db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}

	result := make(map[uint64]*User)
	for i := range users {
		result[users[i].ID] = &users[i]
	}
	return result, nil
}
