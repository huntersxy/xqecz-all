package repository

import (
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

// Poll 投票数据模型
type Poll struct {
	ID          uint64       `db:"id" json:"id"`
	Title       string       `db:"title" json:"title"`
	Description string       `db:"description" json:"description,omitempty"`
	Options     string       `db:"options" json:"options"`
	VoteCount   int64        `db:"vote_count" json:"vote_count"`
	UserID      uint64       `db:"user_id" json:"user_id"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time    `db:"updated_at" json:"updated_at"`
	DeletedAt   sql.NullTime `db:"deleted_at" json:"-"`
}

// PollVote 投票记录数据模型
type PollVote struct {
	ID          uint64      `db:"id" json:"id"`
	PollID      uint64      `db:"poll_id" json:"poll_id"`
	UserID      sql.NullInt64 `db:"user_id" json:"user_id,omitempty"`
	VisitorID   string      `db:"visitor_id" json:"visitor_id,omitempty"`
	OptionIndex int         `db:"option_index" json:"option_index"`
	CreatedAt   time.Time   `db:"created_at" json:"created_at"`
}

// OptionVoteCount 选项投票统计
type OptionVoteCount struct {
	OptionIndex int   `db:"option_index" json:"option_index"`
	Count       int64 `db:"count" json:"count"`
}

// PollRepository 投票数据访问层
type PollRepository struct {
	db *sqlx.DB
}

// NewPollRepository 创建投票仓库实例
func NewPollRepository(db *sqlx.DB) *PollRepository {
	return &PollRepository{db: db}
}

// FindByID 根据ID查找投票
func (r *PollRepository) FindByID(id uint64) (*Poll, error) {
	var poll Poll
	err := r.db.Get(&poll, "SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL", id)
	if err != nil {
		return nil, err
	}
	return &poll, nil
}

// Create 创建投票
func (r *PollRepository) Create(title, description, optionsJSON string, userID uint64) (uint64, error) {
	result, err := r.db.Exec(
		"INSERT INTO polls (title, description, options, vote_count, user_id, created_at, updated_at) VALUES (?, ?, ?, 0, ?, NOW(3), NOW(3))",
		title, description, optionsJSON, userID,
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

// Delete 删除投票（软删除）
func (r *PollRepository) Delete(id uint64) error {
	_, err := r.db.Exec("UPDATE polls SET deleted_at = NOW(3) WHERE id = ?", id)
	return err
}

// List 获取投票列表
func (r *PollRepository) List(page, pageSize int) ([]Poll, int64, error) {
	var total int64
	err := r.db.Get(&total, "SELECT COUNT(*) FROM polls WHERE deleted_at IS NULL")
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	var polls []Poll
	err = r.db.Select(&polls,
		"SELECT * FROM polls WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
		pageSize, offset,
	)
	if err != nil {
		return nil, 0, err
	}

	return polls, total, nil
}

// CreateVote 创建投票记录
func (r *PollRepository) CreateVote(pollID uint64, userID *uint64, visitorID string, optionIndex int) error {
	_, err := r.db.Exec(
		"INSERT INTO poll_votes (poll_id, user_id, visitor_id, option_index, created_at) VALUES (?, ?, ?, ?, NOW(3))",
		pollID, userID, visitorID, optionIndex,
	)
	return err
}

// IncrementVoteCount 增加投票计数
func (r *PollRepository) IncrementVoteCount(pollID uint64) error {
	_, err := r.db.Exec("UPDATE polls SET vote_count = vote_count + 1 WHERE id = ?", pollID)
	return err
}

// CountUserVotes 统计用户投票次数
func (r *PollRepository) CountUserVotes(pollID uint64, userID uint64) (int64, error) {
	var count int64
	err := r.db.Get(&count,
		"SELECT COUNT(*) FROM poll_votes WHERE poll_id = ? AND user_id = ?",
		pollID, userID,
	)
	return count, err
}

// CountVisitorVotes 统计访客投票次数
func (r *PollRepository) CountVisitorVotes(pollID uint64, visitorID string) (int64, error) {
	var count int64
	err := r.db.Get(&count,
		"SELECT COUNT(*) FROM poll_votes WHERE poll_id = ? AND visitor_id = ?",
		pollID, visitorID,
	)
	return count, err
}

// GetUserVote 获取用户投票记录
func (r *PollRepository) GetUserVote(pollID uint64, userID uint64) (*PollVote, error) {
	var vote PollVote
	err := r.db.Get(&vote,
		"SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?",
		pollID, userID,
	)
	if err != nil {
		return nil, err
	}
	return &vote, nil
}

// GetVisitorVote 获取访客投票记录
func (r *PollRepository) GetVisitorVote(pollID uint64, visitorID string) (*PollVote, error) {
	var vote PollVote
	err := r.db.Get(&vote,
		"SELECT * FROM poll_votes WHERE poll_id = ? AND visitor_id = ?",
		pollID, visitorID,
	)
	if err != nil {
		return nil, err
	}
	return &vote, nil
}

// GetVoteCounts 获取投票选项统计
func (r *PollRepository) GetVoteCounts(pollID uint64) (map[int]int64, int64, error) {
	// 获取总投票数
	var totalVotes int64
	err := r.db.Get(&totalVotes,
		"SELECT COUNT(*) FROM poll_votes WHERE poll_id = ?",
		pollID,
	)
	if err != nil {
		return nil, 0, err
	}

	// 获取各选项投票数
	var rows []OptionVoteCount
	err = r.db.Select(&rows,
		"SELECT option_index, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_index",
		pollID,
	)
	if err != nil {
		return nil, 0, err
	}

	voteCounts := make(map[int]int64)
	for _, row := range rows {
		voteCounts[row.OptionIndex] = row.Count
	}

	return voteCounts, totalVotes, nil
}

// BatchFindByIDs 批量查找投票
func (r *PollRepository) BatchFindByIDs(ids []uint64) (map[uint64]*Poll, error) {
	if len(ids) == 0 {
		return make(map[uint64]*Poll), nil
	}

	query, args, err := sqlx.In("SELECT * FROM polls WHERE id IN (?) AND deleted_at IS NULL", ids)
	if err != nil {
		return nil, err
	}

	var polls []Poll
	err = r.db.Select(&polls, r.db.Rebind(query), args...)
	if err != nil {
		return nil, err
	}

	result := make(map[uint64]*Poll)
	for i := range polls {
		result[polls[i].ID] = &polls[i]
	}
	return result, nil
}
