// Package models provides the global data models used by multiple packages in this application.
package models

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

type SessionState struct {
	ID               string
	UserID           string
	AuthProviderName string
	Expires          string
}
