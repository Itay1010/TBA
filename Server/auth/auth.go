package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	srv "server/services"
	"time"

	"golang.org/x/oauth2"
)

type ProviderManager struct {
	PName    string
	P        *oauth2.Config
	Google   *oauth2.Config
	Facebook *oauth2.Config
	Github   *oauth2.Config
}

// HandleHomeView renders the login screen
func (PM ProviderManager) HandleHomeView(w http.ResponseWriter, r *http.Request) {
	html := `<html><body><a href="/login">Log in with %v</a></body></html>`
	fmt.Fprintf(w, html, PM.PName)
}

func (PM ProviderManager) HandleLogin(w http.ResponseWriter, r *http.Request) {
	// Generate a random state and store it in a cookie for validation later
	oauthState := PM.GenerateStateOauthCookie(w)

	// Build the authorization URL.
	// oauth2.AccessTypeOffline requests a refresh token alongside the access token.
	u := PM.P.AuthCodeURL(oauthState, oauth2.AccessTypeOffline)

	// Redirect the user to the provider's consent screen
	http.Redirect(w, r, u, http.StatusTemporaryRedirect)
}

func (PM ProviderManager) HandleCallback(w http.ResponseWriter, r *http.Request) {
	// Validate the state parameter to prevent CSRF attacks
	oauthStateCookie, err := r.Cookie("oauthstate")
	if err != nil || r.FormValue("state") != oauthStateCookie.Value {
		http.Error(w, "Invalid OAuth state", http.StatusBadRequest)
		return
	}

	// Extract the authorization code from the URL parameters
	code := r.FormValue("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	// Exchange the authorization code for an Access Token
	// This makes a server-to-server HTTP request to the provider.
	token, err := PM.P.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, fmt.Sprintf("Code exchange failed: %s", err.Error()), http.StatusInternalServerError)
		return
	}

	// Use the token to fetch user information (Authentication)
	// PM.SP.Client automatically attaches the Bearer token to all requests.
	client := PM.P.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get user info: %s", err.Error()), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	userInfo, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response body", http.StatusInternalServerError)
		return
	}

	// In a real application, you would establish a user session here
	// (e.g., set a secure session cookie or issue a JWT) and save the user to your DB.

	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprintf(w, "Authentication successful!\n\nUser Info: %s\n\nAccess Token: %s", userInfo, token.AccessToken)
}

// GenerateStateOauthCookie creates a random string and stores it in a temporary cookie.
func (PM ProviderManager) GenerateStateOauthCookie(w http.ResponseWriter) string {
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)

	cookie := http.Cookie{
		Name:     "oauthstate",
		Value:    state,
		Expires:  time.Now().Add(10 * time.Minute), // Short lived
		HttpOnly: true,                             // Prevents JS access
		Secure:   false,                            // Set to TRUE in production over HTTPS
	}
	http.SetCookie(w, &cookie)

	return state
}

// generateSessionID creates a cryptographically secure random token.
func generateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func AuthGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			// No cookie found -> not logged in.
			http.Redirect(w, r, "/auth/login", http.StatusTemporaryRedirect)
			return
		}
		exists := srv.LoadSession(cookie.Value)
		if !exists {
			// Cookie exists, but it's invalid or expired on the server -> clear it and redirect
			clearCookie := http.Cookie{
				Name:   "session_token",
				Value:  "",
				Path:   "/",
				MaxAge: -1,
			}
			http.SetCookie(w, &clearCookie)
			http.Redirect(w, r, "/auth/login", http.StatusTemporaryRedirect)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Sane")
}
