package utils

import srv "server/services"

type ScheduleReq struct {
	UserID srv.UserID `json:"user_id" gorm:"primaryKey"`
	Blocks []srv.Block
}
