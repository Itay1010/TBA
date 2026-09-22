package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"server/models"
	srv "server/services"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
)

type ProviderManager struct {
	ProviderName   string
	ProviderConfig *oauth2.Config
}

const UserIDKey string = "userID"

/* METHODS */

func (PM *ProviderManager) Login(w http.ResponseWriter, r *http.Request) {
	// TODO: move redirect logic to "routes.go" handler

	// Generate a random state and store it in a cookie for validation later
	oauthState := PM.GenerateStateOauthCookie(w)

	// Build the authorization URL.
	// oauth2.AccessTypeOffline requests a refresh token alongside the access token.
	u := PM.ProviderConfig.AuthCodeURL(oauthState, oauth2.AccessTypeOffline)

	// Redirect the user to the provider's consent screen
	http.Redirect(w, r, u, http.StatusTemporaryRedirect)
}

func (PM *ProviderManager) Callback(w http.ResponseWriter, r *http.Request) {
	// Validate the state parameter to prevent CSRF attacks
	oauthStateCookie, err := r.Cookie("oauthstate")
	if err != nil || r.FormValue("state") != oauthStateCookie.Value {
		http.Error(w, "Invalid OAuth state", http.StatusBadRequest)
		return
	}

	// Extract the authorization code from the URL parameters
	code := r.FormValue("code")
	if strings.Trim(code, " ") == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	// Exchange the authorization code for an Access Token
	// This makes a server-to-server HTTP request to the provider.
	token, err := PM.ProviderConfig.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, fmt.Sprintf("Code exchange failed: %s", err.Error()), http.StatusInternalServerError)
		return
	}
	idToken := token.Extra("id_token")
	if idt, ok := idToken.(string); !ok {
		http.Error(w, "Unexpected error: missing token field. This is a server error.", http.StatusInternalServerError)
		return
	} else {
		idToken = idt
	}

	// Use the token to fetch user information (Authentication)
	// PM.SP.Client automatically attaches the Bearer token to all requests.
	// TODO: Move this to a function?
	client := PM.ProviderConfig.Client(context.Background(), token)
	endpoint := PM.GetUserInfoURL()
	if endpoint == "" {
		http.Error(w, "Provider config error", http.StatusInternalServerError)
		return
	}
	resp, err := client.Get(endpoint)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get user info: %s", err.Error()), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Errorf("provider returned status %d", resp.StatusCode).Error(), http.StatusInternalServerError)
		return
	}

	var rawProfile map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&rawProfile); err != nil {
		http.Error(w, fmt.Errorf("failed to decode user profile: %w", err).Error(), http.StatusInternalServerError)
		return
	}

	// Upsert User record
	userObj, err := getUserFromRawProfile(rawProfile, PM.ProviderName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = srv.UpsertUser(r.Context(), userObj)

	// Create a secure session ID
	sessionID := GenerateSessionID()

	// Store full session with OAuth tokens in DB
	session, err := srv.CreateSession(r.Context(), sessionID, userObj.UserID, PM.ProviderName, token)
	if err != nil {
		http.Error(w, "Failed to store session", http.StatusInternalServerError)
		return
	}

	// Drop a persistent cookie on the user's browser
	sessionCookie := http.Cookie{
		Name:     "session_token",
		Value:    session.ID,
		Path:     "/",
		Expires:  session.ExpiresAt,
		HttpOnly: true,                 // Crucial: prevents XSS attacks from reading the cookie
		Secure:   !srv.IsDev(),         // Crucial: set to TRUE in production over HTTPS
		SameSite: http.SameSiteLaxMode, // Protects against CSRF attacks
	}
	http.SetCookie(w, &sessionCookie)

	// Redirect the user back to the app
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// GenerateStateOauthCookie creates a random string and stores it in a temporary cookie.
func (PM *ProviderManager) GenerateStateOauthCookie(w http.ResponseWriter) string {
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)

	cookie := http.Cookie{
		Name:     "oauthstate",
		Value:    state,
		Expires:  time.Now().Add(10 * time.Minute), // Short lived
		HttpOnly: true,                             // Prevents JS access
		Secure:   !srv.IsDev(),                     // Set to TRUE in production over HTTPS
	}
	http.SetCookie(w, &cookie)

	return state
}

func (PM *ProviderManager) Logout(w http.ResponseWriter, r *http.Request) {
	// Read the cookie to get the session ID
	cookie, err := r.Cookie("session_token")
	if err == nil && cookie.Value != "" {
		// Delete the session from our server-side database
		_ = srv.InvalidateSession(r.Context(), cookie.Value)
	}

	// Instruct the browser to delete the cookie
	clearCookie := http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	}
	http.SetCookie(w, &clearCookie)

	// Send them back home
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (PM *ProviderManager) GetUserInfoURL() string {
	var endpoint string
	switch PM.ProviderName {
	case "github":
		endpoint = "https://api.github.com/user"
	case "google":
		endpoint = "https://www.googleapis.com/oauth2/v3/userinfo"
	case "facebook":
		endpoint = "https://graph.facebook.com/v18.0/me?fields=id,name,email"
	default:
		endpoint = ""
	}
	return endpoint
}

/* FUNCS */

// GenerateSessionID creates a cryptographically secure random token.
func GenerateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// Route guard for an http mux with sliding window session renewal.
func AuthGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil || cookie.Value == "" {
			// No cookie found -> unauthorized/redirect
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
			} else {
				http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
			}
			return
		}

		session, exists := srv.LoadSession(r.Context(), cookie.Value)
		if !exists {
			// Cookie exists, but it's invalid or expired on the server -> clear it and redirect/unauthorize
			clearCookie := http.Cookie{
				Name:     "session_token",
				Value:    "",
				Path:     "/",
				MaxAge:   -1,
				HttpOnly: true,
			}
			http.SetCookie(w, &clearCookie)
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
			} else {
				http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
			}
			return
		}

		// Active sliding window expiration check: extend if less than 15 days remain
		if time.Until(session.ExpiresAt) < srv.SlidingWindowThreshold {
			if err := srv.ExtendSession(r.Context(), session); err == nil {
				sessionCookie := http.Cookie{
					Name:     "session_token",
					Value:    session.ID,
					Path:     "/",
					Expires:  session.ExpiresAt,
					HttpOnly: true,
					Secure:   !srv.IsDev(),
					SameSite: http.SameSiteLaxMode,
				}
				http.SetCookie(w, &sessionCookie)
			}
		}

		ctx := context.WithValue(r.Context(), UserIDKey, string(session.UserID))
		ctx = context.WithValue(ctx, "session", session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetOAuthProvider(name string) (*ProviderManager, error) {
	RedirectURL, redirectURLExists := os.LookupEnv("OAuthRedirectURL")
	if !redirectURLExists {
		return nil, fmt.Errorf("Redirect URL missing from config")
	}

	provider := ProviderManager{}
	var oauthConfig *oauth2.Config

	var providerClientID, providerSecret string
	var providerEndpoint oauth2.Endpoint

	switch name {
	case "google":
		pcid, ClientIDExists := os.LookupEnv("GoogleCID")
		ps, secretExists := os.LookupEnv("GoogleSecret")
		if !ClientIDExists || !secretExists {
			return nil, fmt.Errorf("Config for Google Auth missing from ENV. This is a server error.")
		}

		provider.ProviderName = "google"
		providerClientID = pcid
		providerSecret = ps
		providerEndpoint = google.Endpoint
	case "facebook":
		pcid, ClientIDExists := os.LookupEnv("FacebookCID")
		ps, secretExists := os.LookupEnv("FacebookSecret")
		if !ClientIDExists || !secretExists {
			return nil, fmt.Errorf("Config for Facebook Auth missing from ENV. This is a server error.")
		}

		provider.ProviderName = "facebook"
		providerClientID = pcid
		providerSecret = ps
		providerEndpoint = facebook.Endpoint

	case "github":
		pcid, ClientIDExists := os.LookupEnv("GithubCID")
		ps, secretExists := os.LookupEnv("GithubSecret")
		if !ClientIDExists || !secretExists {
			return nil, fmt.Errorf("Config for Github Auth missing from ENV. This is a server error.")
		}

		provider.ProviderName = "github"
		providerClientID = pcid
		providerSecret = ps
		providerEndpoint = github.Endpoint
	default:
		return nil, fmt.Errorf("Error: OAuth provider not supported. How did you get here?")
	}

	oauthConfig = &oauth2.Config{
		ClientID:     providerClientID,
		ClientSecret: providerSecret,
		RedirectURL:  RedirectURL,
		Endpoint:     providerEndpoint,
		Scopes:       []string{"openid"},
	}

	provider.ProviderConfig = oauthConfig
	return &provider, nil

}

func getUserFromRawProfile(rawProfile map[string]any, providerName string) (*models.User, error) {
	// Extract the provider's unique ID field ('id' or 'sub')
	var rawID string
	if idVal, ok := rawProfile["id"]; ok {
		rawID = fmt.Sprintf("%v", idVal)
	} else if subVal, ok := rawProfile["sub"]; ok {
		rawID = fmt.Sprintf("%v", subVal)
	} else {
		rawID = ""
	}
	if rawID == "" {
		return nil, fmt.Errorf("could not find unique account ID in provider profile")
	}
	// Create composite User ID (e.g., "github:12345678")
	userID := fmt.Sprintf("%s:%s", providerName, rawID)

	// Extract profile details
	var email, name, avatarURL string
	if e, ok := rawProfile["email"].(string); ok {
		email = e
	}
	if n, ok := rawProfile["name"].(string); ok {
		name = n
	}
	if a, ok := rawProfile["avatar_url"].(string); ok {
		avatarURL = a
	} else if a, ok := rawProfile["picture"].(string); ok {
		avatarURL = a
	}

	// Upsert User record
	userObj := &models.User{
		UserID:    models.UserID(userID),
		Email:     email,
		Name:      name,
		AvatarURL: avatarURL,
	}
	return userObj, nil
}
