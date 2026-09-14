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
