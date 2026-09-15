package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"server/models"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type UserID string
type BlockID string
type UserSessionID string
type (
	Day       string
	BlockDays map[Day][]Block
)

const (
	Sunday    Day = "Sunday"
	Monday    Day = "Monday"
	Tuesday   Day = "Tuesday"
	Wednesday Day = "Wednesday"
	Thursday  Day = "Thursday"
	Friday    Day = "Friday"
	Saturday  Day = "Saturday"
)

type UserDB struct {
	UserID    UserID        `json:"user_id" gorm:"primaryKey"`
	SessionID UserSessionID `json:"session_id"`
}

type User struct {
	UserID UserID `json:"user_id" gorm:"primaryKey"`
}

type Block struct {
	BlockID   BlockID `json:"block_id" gorm:"primaryKey;type:varchar(225);default:(UUID());not"`
	UserID    UserID  `json:"user_id" gorm:"uniqueIndex"`
	Day       Day     `json:"day"`
	Title     string  `json:"title"`
	Color     string  `json:"color"`
	StartTime string  `json:"start_time"` // Assumes zero hour/millisecond for simplicity
	EndTime   string  `json:"end_time"`   // Assumes zero hour/millisecond for simplicity
}

type Schedule struct { // Maybe embed User struct into Schedule?
	UserID UserID     `json:"user_id"`
	Blocks *BlockDays `json:"blocks"`
}

var dBHandler *gorm.DB

func InitDB() error {
	if dBHandler != nil {
		return nil
	}
	dsn, err := getDSN()
	if err != nil {
		return err
	}
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}
	sqlDb, err := db.DB()
	if err != nil {
		return err
	}

	sqlDb.SetConnMaxLifetime(time.Minute * 3)
	sqlDb.SetMaxOpenConns(10)
	sqlDb.SetMaxIdleConns(10)
	err = sqlDb.Ping()
	if err != nil {
		return err
	}
	dBHandler = db
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
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local", username, pass, dbAdd, dbPort, dbName), nil
}

func PingDB() error {
	if dBHandler == nil {
		return DBE.ConnectionError
	}
	if db, err := dBHandler.DB(); err != nil { // Error with GORM ORM
		return err
	} else {
		if err := db.Ping(); err != nil { // DB Error
			return err
		}
	}
	return nil // All good
}

func GetSchedule(ctx context.Context, uid UserID) (*Schedule, error) {
	blocks, err := gorm.G[Block](dBHandler).Where("user_id = ?", (uid)).Find(ctx)
	if err != nil {
		return nil, err
	}
	blockDays := BlockDays{}
	for _, block := range blocks {
		currDay := block.Day
		blockDays[currDay] = append(blockDays[currDay], block)
	}
	sch := Schedule{
		UserID: uid,
		Blocks: &blockDays,
	}
	return &sch, nil
}

func GetBlocks(ctx context.Context, uid UserID) ([]Block, error) {
	blocks, err := gorm.G[Block](dBHandler).Where("user_id = ?", (uid)).Find(ctx)
	if err != nil {
		return nil, err
	}
	return blocks, nil
}

func UpdateBlocks(ctx context.Context, blocks []Block) error {
	if len(blocks) == 0 {
		return DBE.MissingBlocks
	}
	if err := dBHandler.Save(&blocks).Error; err != nil {
		return err
	}
	return nil
}

func DeleteBlocks(ctx context.Context, blocks []Block) error {
	if len(blocks) == 0 {
		return nil
	}
	if err := dBHandler.Delete(&blocks).Error; err != nil {
		return err
	}
	return nil
}

func DBLoadSession(res *models.SessionState) error {
	if res == nil {
		return fmt.Errorf("No session var pointer.")
	}
	stn, stnExists := os.LookupEnv("SessionTableName")
	if !stnExists {
		return fmt.Errorf("No session table name in env.")
	}
	if err := dBHandler.Table(stn).Where("session_id = ?", res.ID).Take(res).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			res = nil
			return nil
		}
		return err
	}
	return nil
}

func DBStoreSession(res *models.SessionState) error {
	if res == nil {
		return fmt.Errorf("No session var pointer.")
	}
	stn, stnExists := os.LookupEnv("SessionTableName")
	if !stnExists {
		return fmt.Errorf("No session table name in env.")
	}
	if err := dBHandler.Table(stn).Save(res).Error; err != nil {
		return err
	}
	return nil
}

/* METHODS */
