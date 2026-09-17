// Package models provides the global data shape used throughout the application.
package models

/* USERS */

type UserID string
type BlockID string
type UserSessionID string
type UserDB struct {
	UserID         UserID        `json:"user_id" gorm:"primaryKey"`
	SessionID      UserSessionID `json:"session_id"`
	RefreshExpires string
	RefreshToken   string
}

type User struct {
	UserID UserID `json:"user_id" gorm:"primaryKey"`
}

type SessionState struct {
	ID               string
	UserID           string
	AuthProviderName string
	Expires          string
}

/* BLOCKS */

type (
	Day       string
	BlockDays map[Day][]Block
)

type Schedule struct { // Maybe embed User struct into Schedule?
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
	BlockID   BlockID `json:"block_id" gorm:"primaryKey;type:varchar(225);default:(UUID());not"`
	UserID    UserID  `json:"user_id" gorm:"uniqueIndex"`
	Day       Day     `json:"day"`
	Title     string  `json:"title"`
	Color     string  `json:"color"`
	StartTime string  `json:"start_time"` // Assumes zero hour/millisecond for simplicity
	EndTime   string  `json:"end_time"`   // Assumes zero hour/millisecond for simplicity
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
