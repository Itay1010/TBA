package routes

import (
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"server/models"
	srv "server/services"
	"server/services/auth"
	utl "server/utils"
	"strings"
	"time"
)

func RegisterRoutes(mux *http.ServeMux) *http.ServeMux {
	apiMux := http.NewServeMux()
	authMux := http.NewServeMux()

	// API
	apiMux.HandleFunc("GET /api/schedule", getSchedule)
	apiMux.HandleFunc("POST /api/schedule", saveBlocks)
	apiMux.HandleFunc("DELETE /api/schedule", deleteBlocks)
	apiMux.HandleFunc("GET /api/tea", getTea)

	// Auth
	authMux.HandleFunc("GET /auth/login", handleLoginPage)
	authMux.HandleFunc("POST /auth/login", handleLoginAction)

	authMux.HandleFunc("/auth/callback", handleCallback)

	// Static assets
	fh := http.FileServerFS(os.DirFS("./dist/"))

	// Routes
	mux.Handle("/", fh)
	mux.Handle("/api/", auth.AuthGuard(apiMux))
	mux.Handle("/auth/", authMux)
	return mux
}

/* API */

func getSchedule(w http.ResponseWriter, r *http.Request) {
	uid := r.URL.Query().Get("UID")
	uid = strings.Trim(uid, " ")
	if uid == "" {
		http.Error(w, "Error: no user ID.", http.StatusBadRequest)
		return
	}
	sch, err := srv.GetSchedule(r.Context(), srv.UserID(uid))
	if err != nil {
		http.Error(w, "Error: Could not get schedule.", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", utl.HttpContentJSON)
	if err := json.NewEncoder(w).Encode(sch); err != nil {
		// fmt.Printf("Server error: %v\n", err)
		http.Error(w, "Error: Could not parse response.\n", http.StatusInternalServerError)
		return
	}
}
func saveBlocks(w http.ResponseWriter, r *http.Request) {
	var req models.ScheduleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("%s", err.Error()), http.StatusInternalServerError)
		return
	}
	if len(req.Blocks) == 0 {
		return
	}
	blocks := utl.ReqBlocksToDB(srv.UserID(req.UserID), req.Blocks)

	err := srv.UpdateBlocks(r.Context(), blocks)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
func deleteBlocks(w http.ResponseWriter, r *http.Request) {
	var req models.ScheduleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("%s", err.Error()), http.StatusInternalServerError)
		return
	}
	if len(req.Blocks) == 0 {
		return
	}
	blocks := utl.ReqBlocksToDB(srv.UserID(req.UserID), req.Blocks)
	err := srv.DeleteBlocks(r.Context(), blocks)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

}
func getTea(w http.ResponseWriter, r *http.Request) {
	c := &http.Client{Timeout: 10 * time.Second}

	res, err := c.Get("https://api.thetea.app/api/v2/db_lite")
	if err != nil {
		http.Error(w, "No teas... Try again later.", http.StatusServiceUnavailable)
		return
	}
	teaOptions := struct {
		Meta map[string]any
		Teas []map[string]any
	}{}
	if err := json.NewDecoder(res.Body).Decode(&teaOptions); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ranIdx := rand.Intn(len(teaOptions.Teas))
	teaSlug, ok := teaOptions.Teas[ranIdx]["slug"]
	if !ok {
		http.Error(w, "No teas... Try again later.", http.StatusInternalServerError)
		return
	}

	res, err = http.Get(fmt.Sprintf("https://api.thetea.app/api/v2/tea/%s.md", teaSlug))
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	tea, err := io.ReadAll(res.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", utl.HttpContentMD)
	w.Write(tea)
	w.Write([]byte("\n\nThanks api.thetea.app for the tea\n\n"))
}

/* AUTH */

func handleLoginPage(w http.ResponseWriter, r *http.Request) {

}

func handleLoginAction(w http.ResponseWriter, r *http.Request) {
	providerName := r.FormValue("auth_provider")
	provider, err := auth.GetOAuthProvider(providerName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	cookie := http.Cookie{
		Name:     "provider",
		Value:    provider.ProviderName,
		Expires:  time.Now().Add(10 * time.Minute),
		HttpOnly: true,
		Secure:   !srv.IsDev(), // Set to TRUE in production over HTTPS
	}
	http.SetCookie(w, &cookie)
	provider.Login(w, r)

}

func handleCallback(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("provider")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !cookie.Expires.After(time.Now()) {
		http.Error(w, "Provider may be wrong", http.StatusInternalServerError)
		return
	}

	provider, err := auth.GetOAuthProvider(cookie.Value)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	provider.Callback(w, r)
}
