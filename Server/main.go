package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	srv "server/services"
	utl "server/utils"
	"strings"
)

func main() {
	//TODO: Structured responses on success and failure

	loggerFile := srv.WireLogger()
	if loggerFile == nil {
		panic(fmt.Errorf("error: Logger cannot be wired for some reason"))
	}
	defer loggerFile.Close()

	err := srv.LoadEnv()
	if srv.Check(err) {
		panic(err)
	}
	e := srv.InitDB()
	if e != nil {
		fmt.Printf("%v", e)
		return
	}

	_port, _exsists := os.LookupEnv("PORT")
	PORT := "3000"
	if _exsists {
		PORT = _port
	}

	/* Server Config */
	// API
	http.HandleFunc("GET /api/schedule", getSchedule)
	http.HandleFunc("POST /api/schedule", saveBlocks)
	http.HandleFunc("DELETE /api/schedule", deleteBlocks)
	http.HandleFunc("GET /api/tea", getTea)

	// Static assets
	fh := http.FileServerFS(os.DirFS("./dist/"))
	http.Handle("GET /", fh)

	srv := &http.Server{
		Addr:           fmt.Sprintf(":%s", PORT),
		MaxHeaderBytes: 0, // Using DefaultMaxHeaderBytes
	}

	/* Serve */
	fmt.Printf("Server Listening on port: %v\n", PORT)
	log.Fatal(srv.ListenAndServe())
}

/* Routes */
func getSchedule(w http.ResponseWriter, r *http.Request) {
	//TODO: Auth
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	uid := r.URL.Query().Get("UID")
	uid = strings.Trim(uid, " ")
	if uid == "" {
		http.Error(w, "Error: no user ID.", http.StatusBadRequest)
		return
	}
	sch, err := srv.GetSchedule(ctx, srv.UserID(uid))
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
	//TODO: Auth
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var req utl.ScheduleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("%s", err.Error()), http.StatusInternalServerError)
		return
	}
	if len(req.Blocks) == 0 {
		return
	}
	blocks := req.Blocks
	err := srv.UpdateBlocks(ctx, blocks)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func deleteBlocks(w http.ResponseWriter, r *http.Request) {
	//TODO: Auth
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var req utl.ScheduleReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("%s", err.Error()), http.StatusInternalServerError)
		return
	}
	if len(req.Blocks) == 0 {
		return
	}
	blocks := req.Blocks
	err := srv.DeleteBlocks(ctx, blocks)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

}

func getTea(w http.ResponseWriter, r *http.Request) {
	res, err := http.Get("https://api.thetea.app/api/v2/db_lite")
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
