package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
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

/* METHODS */

func (PM ProviderManager) Login(w http.ResponseWriter, r *http.Request) {
	// TODO: move redirect logic to "routes.go" handler

	// Generate a random state and store it in a cookie for validation later
	oauthState := PM.GenerateStateOauthCookie(w)

	// Build the authorization URL.
	// oauth2.AccessTypeOffline requests a refresh token alongside the access token.
	u := PM.ProviderConfig.AuthCodeURL(oauthState, oauth2.AccessTypeOffline)

	// Redirect the user to the provider's consent screen
	http.Redirect(w, r, u, http.StatusTemporaryRedirect)
}

func (PM ProviderManager) Callback(w http.ResponseWriter, r *http.Request) {
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
	// client := PM.ProviderConfig.Client(context.Background(), token)
	// resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	// if err != nil {
	// 	http.Error(w, fmt.Sprintf("Failed to get user info: %s", err.Error()), http.StatusInternalServerError)
	// 	return
	// }
	// defer resp.Body.Close()

	// userInfo, err := io.ReadAll(resp.Body)
	// if err != nil {
	// 	http.Error(w, "Failed to read response body", http.StatusInternalServerError)
	// 	return
	// }

	// Create a secure session ID
	sessionID := GenerateSessionID()

	// Save the user data to our "database" attached to this session ID
	session, err := srv.StartSession(sessionID, idToken.(string))

	if err != nil {
		http.Error(w, "Unexpected error: missing token field. This is a server error.", http.StatusInternalServerError)
		return
	}

	// Drop a persistent cookie on the user's browser
	sessionCookie := http.Cookie{
		Name:     "session_token",
		Value:    session.ID,
		Path:     "/",
		Expires:  time.Now().Add(30 * 24 * time.Hour), // Lasts 30 days for auto-login
		HttpOnly: true,                                // Crucial: prevents XSS attacks from reading the cookie
		Secure:   srv.IsDev(),                         // Crucial: set to TRUE in production over HTTPS
		SameSite: http.SameSiteLaxMode,                // Protects against CSRF attacks
	}
	http.SetCookie(w, &sessionCookie)

	// Redirect the user back to the app
	http.Redirect(w, r, "/", http.StatusSeeOther)
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
		Secure:   !srv.IsDev(),                     // Set to TRUE in production over HTTPS
	}
	http.SetCookie(w, &cookie)

	return state
}

/* FUNCS */

// GenerateSessionID creates a cryptographically secure random token.
func GenerateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// Route guard for an http mux.
func AuthGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			// No cookie found -> not logged in.
			http.Redirect(w, r, "/auth/login", http.StatusTemporaryRedirect)
			return
		}
		data, exists := srv.LoadSession(cookie.Value)
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
