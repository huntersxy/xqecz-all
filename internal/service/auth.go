package service

import (
	"errors"

	"xqecz-all/internal/repository"
	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

// AuthService 认证服务
type AuthService struct {
	userRepo *repository.UserRepository
}

// NewAuthService 创建认证服务实例
func NewAuthService(db *sqlx.DB) *AuthService {
	return &AuthService{
		userRepo: repository.NewUserRepository(db),
	}
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Register 用户注册
func (s *AuthService) Register(req RegisterRequest) (uint64, error) {
	// 验证用户名长度
	if len(req.Username) < 3 || len(req.Username) > 50 {
		return 0, errors.New("用户名无效（3-50个字符）")
	}

	// 验证密码长度
	if len(req.Password) < 6 {
		return 0, errors.New("密码至少6位")
	}

	// 检查用户名是否已存在
	existing, _ := s.userRepo.FindByUsername(req.Username)
	if existing != nil {
		return 0, errors.New("用户名已存在")
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return 0, errors.New("密码加密失败")
	}

	// 创建用户
	userID, err := s.userRepo.Create(req.Username, string(hashedPassword))
	if err != nil {
		return 0, errors.New("创建用户失败")
	}

	return userID, nil
}

// Login 用户登录
func (s *AuthService) Login(req LoginRequest) (*repository.User, string, error) {
	// 验证用户名长度
	if len(req.Username) < 3 || len(req.Username) > 50 {
		return nil, "", errors.New("用户名无效（3-50个字符）")
	}

	// 验证密码长度
	if len(req.Password) < 6 {
		return nil, "", errors.New("密码至少6位")
	}

	// 查找用户
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, "", errors.New("用户名或密码错误")
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, "", errors.New("用户名或密码错误")
	}

	// 生成会话ID
	sessionID := util.GenerateSessionID()

	// 保存会话到Redis
	if err := util.SetSession(sessionID, user.ID); err != nil {
		return nil, "", errors.New("创建会话失败")
	}

	return user, sessionID, nil
}

// Logout 用户登出
func (s *AuthService) Logout(sessionID string) error {
	return util.DeleteSession(sessionID)
}

// InitAdmin 初始化管理员
func (s *AuthService) InitAdmin(username, password string) (uint64, error) {
	// 验证用户名长度
	if len(username) < 3 || len(username) > 50 {
		return 0, errors.New("用户名无效（3-50个字符）")
	}

	// 验证密码长度
	if len(password) < 6 {
		return 0, errors.New("密码至少6位")
	}

	// 检查是否已有管理员
	existingAdmin, _ := s.userRepo.FindByUsername(username)
	if existingAdmin != nil {
		// 如果用户已存在，设置为管理员
		if !existingAdmin.IsAdmin {
			if err := s.userRepo.UpdateRole(existingAdmin.ID, true); err != nil {
				return 0, errors.New("设置管理员失败")
			}
		}
		return existingAdmin.ID, nil
	}

	// 创建管理员用户
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return 0, errors.New("密码加密失败")
	}

	userID, err := s.userRepo.Create(username, string(hashedPassword))
	if err != nil {
		return 0, errors.New("创建用户失败")
	}

	// 设置为管理员
	if err := s.userRepo.UpdateRole(userID, true); err != nil {
		return 0, errors.New("设置管理员失败")
	}

	return userID, nil
}

// GetMe 获取当前用户信息
func (s *AuthService) GetMe(userID uint64) (*repository.User, error) {
	return s.userRepo.FindByID(userID)
}
