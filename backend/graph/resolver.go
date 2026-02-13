package graph

import (
	"context"
	"sync"

	"github.com/aleksandr/lifetrack/backend/auth"
	"github.com/aleksandr/lifetrack/backend/db"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	DB   *db.DB
	Auth *auth.Service
}

// InMemoryCache is a simple in-memory cache for persisted queries
type InMemoryCache struct {
	mu    sync.RWMutex
	cache map[string]interface{}
}

func (c *InMemoryCache) Add(ctx context.Context, key string, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.cache == nil {
		c.cache = make(map[string]interface{})
	}
	c.cache[key] = value
}

func (c *InMemoryCache) Get(ctx context.Context, key string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	val, ok := c.cache[key]
	if !ok {
		return "", false
	}
	strVal, ok := val.(string)
	return strVal, ok
}
