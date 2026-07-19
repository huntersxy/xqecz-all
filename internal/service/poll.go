package service

import (
	"encoding/json"
	"errors"

	"xqecz-all/internal/repository"
	"xqecz-all/internal/util"

	"github.com/jmoiron/sqlx"
)

// PollService 投票服务
type PollService struct {
	pollRepo *repository.PollRepository
	userRepo *repository.UserRepository
}

// NewPollService 创建投票服务实例
func NewPollService(db *sqlx.DB) *PollService {
	return &PollService{
		pollRepo: repository.NewPollRepository(db),
		userRepo: repository.NewUserRepository(db),
	}
}

// CreatePollRequest 创建投票请求
type CreatePollRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Options     []string `json:"options"`
}

// VotePollRequest 投票请求
type VotePollRequest struct {
	OptionIndex int `json:"option_index"`
}

// PollListQuery 投票列表查询参数
type PollListQuery struct {
	Page     string `json:"page"`
	PageSize string `json:"page_size"`
}

// CreatePoll 创建投票
func (s *PollService) CreatePoll(userID uint64, req CreatePollRequest) (map[string]interface{}, error) {
	// 验证标题
	if req.Title == "" || len(req.Title) > 200 {
		return nil, errors.New("标题不能为空且不超过200字符")
	}

	// 验证选项
	if len(req.Options) < 2 {
		return nil, errors.New("至少需要2个选项")
	}

	// 序列化选项
	optionsJSON, err := json.Marshal(req.Options)
	if err != nil {
		return nil, err
	}

	// 创建投票
	pollID, err := s.pollRepo.Create(req.Title, req.Description, string(optionsJSON), userID)
	if err != nil {
		return nil, errors.New("创建失败")
	}

	// 获取创建的投票
	poll, err := s.pollRepo.FindByID(pollID)
	if err != nil {
		return nil, errors.New("查询失败")
	}

	// 获取用户信息
	user, _ := s.userRepo.FindByID(userID)

	result := map[string]interface{}{
		"id":          poll.ID,
		"title":       poll.Title,
		"description": poll.Description,
		"options":     parseJSONArray(poll.Options),
		"vote_count":  poll.VoteCount,
		"user_id":     poll.UserID,
		"created_at":  poll.CreatedAt.Unix(),
	}

	if user != nil {
		result["user"] = map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
		}
	}

	return result, nil
}

// GetPollList 获取投票列表
func (s *PollService) GetPollList(query PollListQuery) (*util.PaginatedResponse, error) {
	pag := util.ParsePagination(query.Page, query.PageSize, 20, 100)

	polls, total, err := s.pollRepo.List(pag.Page, pag.PageSize)
	if err != nil {
		return nil, err
	}

	// 批量查询用户
	userIDs := make([]uint64, 0, len(polls))
	for _, p := range polls {
		userIDs = append(userIDs, p.UserID)
	}
	usersMap, _ := s.userRepo.BatchFindByIDs(userIDs)

	pollList := make([]map[string]interface{}, 0, len(polls))
	for _, poll := range polls {
		item := map[string]interface{}{
			"id":          poll.ID,
			"title":       poll.Title,
			"description": poll.Description,
			"options":     parseJSONArray(poll.Options),
			"vote_count":  poll.VoteCount,
			"user_id":     poll.UserID,
			"created_at":  poll.CreatedAt.Unix(),
		}

		if user, ok := usersMap[poll.UserID]; ok {
			item["user"] = map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
			}
		}

		pollList = append(pollList, item)
	}

	totalPage := util.TotalPages(total, pag.PageSize)
	return &util.PaginatedResponse{
		List:      pollList,
		Total:     total,
		Page:      pag.Page,
		PageSize:  pag.PageSize,
		TotalPage: totalPage,
	}, nil
}

// GetPoll 获取投票详情
func (s *PollService) GetPoll(id uint64, userID *uint64, visitorID string) (map[string]interface{}, error) {
	poll, err := s.pollRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("投票不存在")
	}

	// 获取投票统计
	voteCounts, totalVotes, err := s.pollRepo.GetVoteCounts(id)
	if err != nil {
		return nil, err
	}

	// 检查用户是否已投票
	var myVote *int
	if userID != nil {
		vote, err := s.pollRepo.GetUserVote(id, *userID)
		if err == nil {
			myVote = &vote.OptionIndex
		}
	} else if visitorID != "" {
		vote, err := s.pollRepo.GetVisitorVote(id, visitorID)
		if err == nil {
			myVote = &vote.OptionIndex
		}
	}

	// 获取用户信息
	user, _ := s.userRepo.FindByID(poll.UserID)

	result := map[string]interface{}{
		"poll": map[string]interface{}{
			"id":          poll.ID,
			"title":       poll.Title,
			"description": poll.Description,
			"options":     parseJSONArray(poll.Options),
			"vote_count":  poll.VoteCount,
			"user_id":     poll.UserID,
			"created_at":  poll.CreatedAt.Unix(),
		},
		"vote_counts": voteCounts,
		"total_votes": totalVotes,
		"my_vote":     myVote,
	}

	if user != nil {
		result["poll"].(map[string]interface{})["user"] = map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
		}
	}

	return result, nil
}

// VotePoll 投票
func (s *PollService) VotePoll(pollID uint64, userID *uint64, visitorID string, req VotePollRequest) error {
	poll, err := s.pollRepo.FindByID(pollID)
	if err != nil {
		return errors.New("投票不存在")
	}

	// 验证选项索引
	options := parseJSONArray(poll.Options)
	if req.OptionIndex < 0 || req.OptionIndex >= len(options) {
		return errors.New("选项无效")
	}

	// 检查是否已投票
	if userID != nil {
		count, _ := s.pollRepo.CountUserVotes(pollID, *userID)
		if count > 0 {
			return errors.New("已经投过票了")
		}
	} else if visitorID != "" {
		count, _ := s.pollRepo.CountVisitorVotes(pollID, visitorID)
		if count > 0 {
			return errors.New("已经投过票了")
		}
	}

	// 创建投票记录
	if err := s.pollRepo.CreateVote(pollID, userID, visitorID, req.OptionIndex); err != nil {
		return errors.New("投票失败")
	}

	// 更新投票计数
	s.pollRepo.IncrementVoteCount(pollID)

	return nil
}

// DeletePoll 删除投票
func (s *PollService) DeletePoll(userID uint64, pollID uint64, isAdmin bool) error {
	poll, err := s.pollRepo.FindByID(pollID)
	if err != nil {
		return errors.New("投票不存在")
	}

	if !isAdmin && poll.UserID != userID {
		return errors.New("无权删除")
	}

	return s.pollRepo.Delete(pollID)
}

// 辅助函数：解析JSON数组
func parseJSONArray(s string) []string {
	if s == "" || s == "[]" {
		return []string{}
	}
	var result []string
	json.Unmarshal([]byte(s), &result)
	return result
}
