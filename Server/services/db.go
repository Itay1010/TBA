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

	// AutoMigrate database models for MariaDB/MySQL compatibility
	if err := db.AutoMigrate(&models.User{}, &models.Session{}, &models.Block{}); err != nil {
		return fmt.Errorf("failed to auto-migrate database: %w", err)
	}

	dBHandler = db
	return nil
}

func getDSN() (string, error) {
	username, uExists := os.LookupEnv("DBUser")
	pass, passExists := os.LookupEnv("DBPass")
	dbName, dbExists := os.LookupEnv("DBName")
	dbAdd, addExists := os.LookupEnv("DBAddress")
	dbPort, portExists := os.LookupEnv("DBPort")

	switch {
	case !uExists:
		return "", DBE.MissingUser
	case !passExists:
		return "", DBE.MissingPass
	case !dbExists:
		return "", DBE.MissingDB
	case !addExists:
		return "", DBE.MissingURI
	case !portExists:
		return "", DBE.MissingURI
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local", username, pass, dbAdd, dbPort, dbName), nil
}

func PingDB() error {
	if dBHandler == nil {
		return DBE.ConnectionError
	}
	db, err := dBHandler.DB()
	if err != nil {
		return err
	}
	return db.Ping()
}

/* USER OPERATIONS */

func UpsertUser(ctx context.Context, user *models.User) error {
	if dBHandler == nil {
		return DBE.NotConnected
	}
	if user == nil || user.UserID == "" {
		return fmt.Errorf("invalid user data")
	}
	return dBHandler.WithContext(ctx).Save(user).Error
}

func GetUser(ctx context.Context, uid models.UserID) (*models.User, error) {
	if dBHandler == nil {
		return nil, DBE.NotConnected
	}
	var user models.User
	if err := dBHandler.WithContext(ctx).Where("user_id = ?", uid).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, DBE.UserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func RemoveUser(ctx context.Context, uid models.UserID) error {
	if dBHandler == nil {
		return DBE.NotConnected
	}
	return dBHandler.WithContext(ctx).Where("user_id = ?", uid).Delete(&models.User{}).Error
}

/* SESSION OPERATIONS */

func DBStoreSession(ctx context.Context, session *models.Session) error {
	if dBHandler == nil {
		return DBE.NotConnected
	}
	if session == nil || session.ID == "" {
		return fmt.Errorf("invalid session pointer or empty session ID")
	}

	// Encrypt sensitive tokens before persisting
	encAccess, err := EncryptToken(session.OAuthAccessToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt access token: %w", err)
	}
	encRefresh, err := EncryptToken(session.OAuthRefreshToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt refresh token: %w", err)
	}

	sessionToStore := *session
	sessionToStore.OAuthAccessToken = encAccess
	sessionToStore.OAuthRefreshToken = encRefresh

	return dBHandler.WithContext(ctx).Save(&sessionToStore).Error
}

func DBGetSession(ctx context.Context, sessionID string) (*models.Session, error) {
	if dBHandler == nil {
		return nil, DBE.NotConnected
	}
	var session models.Session
	if err := dBHandler.WithContext(ctx).Where("id = ?", sessionID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	// Decrypt sensitive tokens after retrieving
	decAccess, err := DecryptToken(session.OAuthAccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt access token: %w", err)
	}
	decRefresh, err := DecryptToken(session.OAuthRefreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt refresh token: %w", err)
	}

	session.OAuthAccessToken = decAccess
	session.OAuthRefreshToken = decRefresh

	return &session, nil
}

func DBDeleteSession(ctx context.Context, sessionID string) error {
	if dBHandler == nil {
		return DBE.NotConnected
	}
	return dBHandler.WithContext(ctx).Where("id = ?", sessionID).Delete(&models.Session{}).Error
}

func DBCleanupExpiredSessions(ctx context.Context) (int64, error) {
	if dBHandler == nil {
		return 0, DBE.NotConnected
	}
	res := dBHandler.WithContext(ctx).Where("expires_at < ?", time.Now()).Delete(&models.Session{})
	return res.RowsAffected, res.Error
}

// Deprecated legacy session load helper
func DBLoadSession(session *models.SessionState) error {
	if session == nil || session.ID == "" {
		return fmt.Errorf("No session var pointer.")
	}
	s, err := DBGetSession(context.Background(), session.ID)
	if err != nil {
		return err
	}
	if s == nil {
		session = nil
		return nil
	}
	session.UserID = string(s.UserID)
	session.AuthProviderName = s.AuthProvider
	session.Expires = s.ExpiresAt.Format(time.RFC3339)
	return nil
}

/* SCHEDULE / BLOCK OPERATIONS */

func GetSchedule(ctx context.Context, uid models.UserID) (*models.Schedule, error) {
	if dBHandler == nil {
		return nil, DBE.NotConnected
	}
	var blocks []models.Block
	if err := dBHandler.WithContext(ctx).Where("user_id = ?", uid).Find(&blocks).Error; err != nil {
		return nil, err
	}
	blockDays := models.BlockDays{}
	for _, block := range blocks {
		currDay := block.Day
		blockDays[currDay] = append(blockDays[currDay], block)
	}
	sch := models.Schedule{
		UserID: uid,
		Blocks: &blockDays,
	}
	return &sch, nil
}

func GetBlocks(ctx context.Context, uid models.UserID) ([]models.Block, error) {
	if dBHandler == nil {
		return nil, DBE.NotConnected
	}
	var blocks []models.Block
	if err := dBHandler.WithContext(ctx).Where("user_id = ?", uid).Find(&blocks).Error; err != nil {
		return nil, err
	}
	return blocks, nil
}

func UpdateBlocks(ctx context.Context, blocks []models.Block) error {
	if dBHandler == nil {
		return DBE.NotConnected
	}
	if len(blocks) == 0 {
		return DBE.MissingBlocks
	}
	return dBHandler.WithContext(ctx).Save(&blocks).Error
}

func DeleteBlocks(ctx context.Context, blocks []models.Block) error {
	if dBHandler == nil {
		return DBE.NotConnected
	}
	if len(blocks) == 0 {
		return nil
	}
	return dBHandler.WithContext(ctx).Delete(&blocks).Error
}
