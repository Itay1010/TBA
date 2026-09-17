package services

import (
	"context"
	"fmt"
	"server/models"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

const (
	DefaultSessionDuration = 30 * 24 * time.Hour
	SlidingWindowThreshold = 15 * 24 * time.Hour
)

// CreateSession creates and persists a new session with optional OAuth tokens
func CreateSession(ctx context.Context, sessionID string, userID models.UserID, provider string, token *oauth2.Token) (*models.Session, error) {
	if strings.TrimSpace(sessionID) == "" {
		return nil, fmt.Errorf("session ID cannot be empty")
	}
	if userID == "" {
		return nil, fmt.Errorf("user ID cannot be empty")
	}

	session := &models.Session{
		ID:           sessionID,
		UserID:       userID,
		AuthProvider: provider,
		ExpiresAt:    time.Now().Add(DefaultSessionDuration),
	}

	if token != nil {
		session.OAuthAccessToken = token.AccessToken
		session.OAuthRefreshToken = token.RefreshToken
		session.OAuthTokenExpiry = token.Expiry
	}

	if err := DBStoreSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

// LoadSession retrieves a session by ID, validating its expiration
func LoadSession(ctx context.Context, sessionID string) (*models.Session, bool) {
	if strings.TrimSpace(sessionID) == "" {
		return nil, false
	}
	session, err := DBGetSession(ctx, sessionID)
	if err != nil || session == nil {
		return nil, false
	}
	// Check expiration
	if time.Now().After(session.ExpiresAt) {
		_ = DBDeleteSession(ctx, sessionID)
		return nil, false
	}
	return session, true
}

// ExtendSession refreshes the session expiration (sliding window)
func ExtendSession(ctx context.Context, session *models.Session) error {
	if session == nil {
		return fmt.Errorf("nil session")
	}
	session.ExpiresAt = time.Now().Add(DefaultSessionDuration)
	return DBStoreSession(ctx, session)
}

// RefreshOAuthTokenIfNeeded checks if the OAuth access token is expired and uses the refresh token to renew it
func RefreshOAuthTokenIfNeeded(ctx context.Context, session *models.Session, providerConfig *oauth2.Config) (*oauth2.Token, error) {
	if session == nil || providerConfig == nil {
		return nil, fmt.Errorf("invalid arguments to RefreshOAuthTokenIfNeeded")
	}
	if session.OAuthRefreshToken == "" && session.OAuthAccessToken == "" {
		return nil, fmt.Errorf("no tokens stored in session")
	}

	tok := &oauth2.Token{
		AccessToken:  session.OAuthAccessToken,
		RefreshToken: session.OAuthRefreshToken,
		Expiry:       session.OAuthTokenExpiry,
	}

	tokenSource := providerConfig.TokenSource(ctx, tok)
	freshToken, err := tokenSource.Token()
	if err != nil {
		return nil, fmt.Errorf("failed to refresh OAuth token: %w", err)
	}

	// Update session with new token details if changed
	if freshToken.AccessToken != session.OAuthAccessToken || freshToken.RefreshToken != session.OAuthRefreshToken {
		session.OAuthAccessToken = freshToken.AccessToken
		if freshToken.RefreshToken != "" {
			session.OAuthRefreshToken = freshToken.RefreshToken
		}
		session.OAuthTokenExpiry = freshToken.Expiry
		if err := DBStoreSession(ctx, session); err != nil {
			return freshToken, fmt.Errorf("failed to persist refreshed token: %w", err)
		}
	}
	return freshToken, nil
}

// InvalidateSession deletes a session from the DB
func InvalidateSession(ctx context.Context, sessionID string) error {
	if strings.TrimSpace(sessionID) == "" {
		return nil
	}
	return DBDeleteSession(ctx, sessionID)
}

// Legacy helper wrappers for backward compatibility
func StoreSession(sessionID string, UID string) (*models.SessionState, error) {
	session, err := CreateSession(context.Background(), sessionID, models.UserID(UID), "unknown", nil)
	if err != nil {
		return nil, err
	}
	return &models.SessionState{
		ID:               session.ID,
		UserID:           string(session.UserID),
		AuthProviderName: session.AuthProvider,
		Expires:          session.ExpiresAt.Format(time.RFC3339),
	}, nil
}

