// Package models provides the global data shape used throughout the application.
package models

import "time"

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

/* BLOCKS */

type (
	Day       string
	BlockDays map[Day][]Block
)

type Schedule struct {
	UserID UserID     `json:"user_id"`
	Blocks *BlockDays `json:"blocks"`
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
	Day       Day     `json:"day" gorm:"type:varchar(50)"`
	Title     string  `json:"title" gorm:"type:varchar(255)"`
	Color     string  `json:"color" gorm:"type:varchar(50)"`
	StartTime string  `json:"start_time" gorm:"type:varchar(50)"`
	EndTime   string  `json:"end_time" gorm:"type:varchar(50)"`
}

type RequestBlock struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Day       string `json:"day"`
	Color     string `json:"color"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
}
type ResponseBlock struct {
}
type ScheduleReq struct {
	UserID string         `json:"user_id"`
	Blocks []RequestBlock `json:"blocks"`
}
