package services

type ScheduleReq struct {
	UserID UserID `json:"user_id"`
	Blocks []Block
}
