package services

import (
	"context"
	"server/models"
	"testing"
	"time"

	"golang.org/x/oauth2"
)

func TestSessionStructAndConstants(t *testing.T) {
	if DefaultSessionDuration != 30*24*time.Hour {
		t.Errorf("Expected DefaultSessionDuration to be 30 days, got %v", DefaultSessionDuration)
	}
	if SlidingWindowThreshold != 15*24*time.Hour {
		t.Errorf("Expected SlidingWindowThreshold to be 15 days, got %v", SlidingWindowThreshold)
	}

	sessionID := "test_sess_12345"
	userID := models.UserID("github:12345")
	provider := "github"
	token := &oauth2.Token{
		AccessToken:  "gho_test_access_token",
		RefreshToken: "ghr_test_refresh_token",
		Expiry:       time.Now().Add(1 * time.Hour),
	}

	session := &models.Session{
		ID:                sessionID,
		UserID:            userID,
		AuthProvider:      provider,
		OAuthAccessToken:  token.AccessToken,
		OAuthRefreshToken: token.RefreshToken,
		OAuthTokenExpiry:  token.Expiry,
		ExpiresAt:         time.Now().Add(DefaultSessionDuration),
	}

	if session.ID != sessionID || session.UserID != userID {
		t.Fatalf("Session struct fields mismatch")
	}
}

func TestInvalidateSessionEmpty(t *testing.T) {
	err := InvalidateSession(context.Background(), "")
	if err != nil {
		t.Fatalf("InvalidateSession with empty ID should not return error, got %v", err)
	}
}
