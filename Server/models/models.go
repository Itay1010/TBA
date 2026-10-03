// Package models provides the global data shape used throughout the application.
package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

/* USERS & SESSIONS */

type UserID string
type BlockID string
type UserSessionID string

type User struct {
	UserID    UserID    `json:"user_id" gorm:"primaryKey;type:varchar(191)"`
	Email     string    `json:"email,omitempty" gorm:"type:varchar(191)"`
	Name      string    `json:"name,omitempty" gorm:"type:varchar(255)"`
	AvatarURL string    `json:"avatar_url,omitempty" gorm:"type:varchar(512)"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Sessions  []Session `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Blocks    []Block   `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

type Session struct {
	ID                string    `json:"id" gorm:"primaryKey;type:varchar(191)"`
	UserID            UserID    `json:"user_id" gorm:"type:varchar(191);index;not null"`
	AuthProvider      string    `json:"auth_provider" gorm:"type:varchar(50);not null"`
	OAuthAccessToken  string    `json:"-" gorm:"type:text"`
	OAuthRefreshToken string    `json:"-" gorm:"type:text"`
	OAuthTokenExpiry  time.Time `json:"-" gorm:"index"`
	ExpiresAt         time.Time `json:"expires_at" gorm:"index;not null"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// SessionState provides a lightweight view of session metadata
type SessionState struct {
	ID               string `json:"id"`
	UserID           string `json:"user_id"`
	AuthProviderName string `json:"auth_provider_name"`
	Expires          string `json:"expires"`
}

type AuthProvider interface {
	Login(w http.ResponseWriter, r *http.Request)
	Logout(w http.ResponseWriter, r *http.Request)
	Callback(w http.ResponseWriter, r *http.Request)
}

/* BLOCKS */

type (
	Day       string
	Days      []Day
	BlockDays map[Day][]Block
)

// Value implements driver.Valuer for database persistence as JSON.
func (d Days) Value() (driver.Value, error) {
	if d == nil {
		return "[]", nil
	}
	bytes, err := json.Marshal(d)
	if err != nil {
		return nil, err
	}
	return string(bytes), nil
}

// Scan implements sql.Scanner for reading JSON from database.
func (d *Days) Scan(value interface{}) error {
	if value == nil {
		*d = Days{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("failed to scan type %T into Days", value)
	}
	if len(bytes) == 0 {
		*d = Days{}
		return nil
	}
	return json.Unmarshal(bytes, d)
}

type Schedule struct {
	UserID UserID  `json:"user_id"`
	Blocks []Block `json:"blocks"`
}

type ClientSchedule struct {
	UserID UserID        `json:"user_id"`
	Blocks []ClientBlock `json:"blocks"`
}

const (
	Sunday    Day = "Sunday"
	Monday    Day = "Monday"
	Tuesday   Day = "Tuesday"
	Wednesday Day = "Wednesday"
	Thursday  Day = "Thursday"
	Friday    Day = "Friday"
	Saturday  Day = "Saturday"
)

type Block struct {
	BlockID   BlockID `json:"block_id" gorm:"primaryKey;type:varchar(191)"`
	UserID    UserID  `json:"user_id" gorm:"type:varchar(191);index;not null"`
	Days      Days    `json:"days" gorm:"type:varchar(191)"`
	Title     string  `json:"title" gorm:"type:varchar(255)"`
	Color     string  `json:"color" gorm:"type:varchar(50)"`
	StartTime string  `json:"start_time" gorm:"type:varchar(50)"`
	EndTime   string  `json:"end_time" gorm:"type:varchar(50)"`
}

type ClientBlock struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Days      string `json:"days"` // Importent: The days are send between client and server as strings, but should ALWAYS parse to an array of blocks.
	Color     string `json:"color"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
}

type ScheduleReq struct {
	UserID string        `json:"user_id"`
	Blocks []ClientBlock `json:"blocks"`
}

/* HTTP RESPONSES */

type HttpRes[T any] struct {
	Data     T               `json:"data,omitempty"`
	Error    string          `json:"error,omitempty"`
	Metadata *map[string]any `json:"metadata,omitempty"`
}
