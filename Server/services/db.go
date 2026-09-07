package services

import (
	"context"
	"fmt"
	"os"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type userID string

type Day string
type BlockDays map[Day][]Block

const (
	Sunday    Day = "Sunday"
	Monday    Day = "Monday"
	Tuesday   Day = "Tuesday"
	Wednesday Day = "Wednesday"
	Thursday  Day = "Thursday"
	Friday    Day = "Friday"
	Saturday  Day = "Saturday"
)

type User struct {
	UserID userID `json:"user_id"`
}

//	type Block struct {
//		BlockID   string    `gorm:"block_id"`
//		UserID    userID    `gorm:"user_id"`
//		Day       Day       `gorm:"day"`
//		Title     string    `gorm:"title"`
//		Color     string    `gorm:"color"`
//		StartTime time.Time `gorm:"column:start_time;type:time"` // Assumes zero hour/millisecond for simplicity
//		EndTime   time.Time `gorm:"column:end_time;type:time"`   // Assumes zero hour/millisecond for simplicity
//	}
type Block struct {
	BlockID   string `json:"block_id"`
	UserID    userID `json:"user_id"`
	Day       Day    `json:"day"`
	Title     string `json:"title"`
	Color     string `json:"color"`
	StartTime string `json:"start_time"` // Assumes zero hour/millisecond for simplicity
	EndTime   string `json:"end_time"`   // Assumes zero hour/millisecond for simplicity
}

type Schedule struct {
	UserID userID
	Blocks *BlockDays
}

var _DBHandler *gorm.DB

func InitDb() error {
	if _DBHandler != nil {
		return nil
	}
	dsn, err := getDSN()
	if Check(err) {
		return err
	}
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if Check(err) {
		return err
	}
	sqlDb, err := db.DB()
	if Check(err) {
		return err
	}

	sqlDb.SetConnMaxLifetime(time.Minute * 3)
	sqlDb.SetMaxOpenConns(10)
	sqlDb.SetMaxIdleConns(10)
	err = sqlDb.Ping()
	if Check(err) {
		return err
	}
	_DBHandler = db
	return nil
}

func getDSN() (string, error) {
	username, uExsists := os.LookupEnv("DBUser")
	pass, passExsists := os.LookupEnv("DBPass")
	dbName, DBExsists := os.LookupEnv("DBName")
	dbAdd, addExsists := os.LookupEnv("DBAddress")
	dbPort, portExsists := os.LookupEnv("DBPort")

	switch {
	case !uExsists:
		return "", DBE.MissingUser
	case !passExsists:
		return "", DBE.MissingPass
	case !DBExsists:
		return "", DBE.MissingDB
	case !addExsists:
		return "", DBE.MissingURI
	case !portExsists:
		return "", DBE.MissingURI
	}
	// return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local", username, pass, dbAdd, dbPort, dbName), nil
	return fmt.Sprintf("%s%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local", username, pass, dbAdd, dbPort, dbName), nil // for tests
}

func valid() error {
	if _DBHandler == nil {
		return DBE.ConnectionError
	}
	if db, err := _DBHandler.DB(); err != nil { // Error with GORM ORM
		return err
	} else {
		if err := db.Ping(); err != nil { // DB Error
			return err
		}
	}
	return nil // All good
}

// func Query(q string) error {
// 	if err := valid(); err != nil {
// 		return err
// 	}
// 	_DBHandler.Prepare("SELECT id, title, completed, attachment FROM todos")
// 	return nil
// }

func GetSchedule(ctx context.Context, uID userID) (*Schedule, error) {
	if err := valid(); err != nil {
		return nil, err
	}
	blocks, err := gorm.G[Block](_DBHandler).Where("user_id = ?", uID).Find(ctx)
	if err != nil {
		return nil, err
	}
	blockDays := BlockDays{}
	for _, block := range blocks {
		currDay := block.Day
		blockDays[currDay] = append(blockDays[currDay], block)
	}
	sch := Schedule{
		UserID: uID,
		Blocks: &blockDays,
	}
	return &sch, nil
}
