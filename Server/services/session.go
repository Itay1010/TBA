package services

import (
	"fmt"
	"server/models"
	"strings"
)

func LoadSession(sessionID string) (*models.SessionState, bool) {
	session := &models.SessionState{ID: sessionID}
	if err := DBLoadSession(session); err != nil {
		return nil, false
	}
	return session, true
}

func StartSession(sessionID string, UID string) (*models.SessionState, error) {
	if strings.Trim(sessionID, " ") == "" {
		return nil, fmt.Errorf("No session ID provided.")
	}
	session := &models.SessionState{ID: sessionID, UserID: UID}

	if err := DBStoreSession(session); err != nil {
		return nil, err
	}
	return session, nil
}

func InvalidateSession(sessionID string) {

}
