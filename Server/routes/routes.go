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
	apiMux.HandleFunc("GET /api/me", getMe)

	// Auth
	authMux.HandleFunc("POST /auth/login", handleLogin)
	authMux.HandleFunc("POST /auth/logout", handleLogout)
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
	userID, ok := r.Context().Value(auth.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	sch, err := srv.GetSchedule(r.Context(), models.UserID(userID))
	if err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, "Could not retrieve schedule", err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", utl.HttpContentJSON)
	_ = json.NewEncoder(w).Encode(sch)
}
func saveBlocks(w http.ResponseWriter, r *http.Request) {
	var req models.ScheduleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusBadRequest)
		return
	}
	if len(req.Blocks) == 0 {
		jsonResBytes := utl.MakeHttpJsonRes("success", "", nil)
		w.Write(jsonResBytes)
		return
	}
	blocks := utl.ReqBlocksToDB(models.UserID(req.UserID), req.Blocks)
	err := srv.UpdateBlocks(r.Context(), blocks)
	if err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
		return
	}
	jsonResBytes := utl.MakeHttpJsonRes("success", "", nil)
	w.Write(jsonResBytes)

}

func deleteBlocks(w http.ResponseWriter, r *http.Request) {
	var req models.ScheduleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusBadRequest)
		return
	}
	if len(req.Blocks) == 0 {
		return
	}
	blocks := utl.ReqBlocksToDB(models.UserID(req.UserID), req.Blocks)
	err := srv.DeleteBlocks(r.Context(), blocks)
	if err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
		return
	}

	jsonResBytes := utl.MakeHttpJsonRes("success", "", nil)
	w.Write(jsonResBytes)
}
func getTea(w http.ResponseWriter, r *http.Request) {
	c := &http.Client{Timeout: 10 * time.Second}

	res, err := c.Get("https://api.thetea.app/api/v2/db_lite")
	if err != nil {
		http.Error(w, "No teas... Try again later.", http.StatusServiceUnavailable)
		return
	}
	defer res.Body.Close()
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

	res, err = c.Get(fmt.Sprintf("https://api.thetea.app/api/v2/tea/%s.md", teaSlug))
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

func getMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(auth.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	user, err := srv.GetUser(r.Context(), models.UserID(userID))
	if err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, "Could not retrieve user profile", err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
		return
	}
	resData := map[string]string{
		"id":   string(user.UserID),
		"name": user.Name,
	}
	w.Header().Set("Content-Type", utl.HttpContentJSON)
	_ = json.NewEncoder(w).Encode(resData)
}

/* AUTH */

func handleLogin(w http.ResponseWriter, r *http.Request) {
	providerName := r.FormValue("auth_provider")
	provider, err := auth.GetOAuthProvider(providerName)
	if err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
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
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
		return
	}

	provider, err := auth.GetOAuthProvider(cookie.Value)
	if err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
		return
	}
	provider.Callback(w, r)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie == nil || cookie.Value == "" {
		// No cookie found -> unauthorized
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
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
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	provider, err := auth.GetOAuthProvider(session.AuthProvider)
	if err != nil {
		jsonResBytes := utl.MakeHttpJsonRes[any](nil, err.Error(), err)
		jsonRes := string(jsonResBytes)
		http.Error(w, jsonRes, http.StatusInternalServerError)
		return
	}
	provider.Logout(w, r)
}
