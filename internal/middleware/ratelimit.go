package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"xqecz-all/internal/util"
)

// RateLimiter 限流器
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int
	burst    int
}

type visitor struct {
	tokens    int
	lastSeen  time.Time
}

// NewRateLimiter 创建限流器
func NewRateLimiter(rate int, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		burst:    burst,
	}

	// 定期清理过期的访问者
	go rl.cleanup()

	return rl
}

// cleanup 清理过期的访问者
func (rl *RateLimiter) cleanup() {
	for {
		time.Sleep(time.Minute)
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// allow 检查是否允许请求
func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{tokens: rl.burst - 1, lastSeen: time.Now()}
		return true
	}

	// 计算可以补充的令牌数
	elapsed := time.Since(v.lastSeen)
	tokensToAdd := int(elapsed.Seconds()) * rl.rate
	v.tokens += tokensToAdd
	if v.tokens > rl.burst {
		v.tokens = rl.burst
	}

	v.lastSeen = time.Now()

	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

// RateLimit 限流中间件
func RateLimit(rate int, burst int) fiber.Handler {
	limiter := NewRateLimiter(rate, burst)

	return func(c *fiber.Ctx) error {
		ip := c.IP()

		if !limiter.allow(ip) {
			return util.Error(c, 429, "请求过于频繁，请稍后再试")
		}

		return c.Next()
	}
}
