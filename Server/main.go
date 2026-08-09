package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	srv "server/services"
)

func main() {
	err := srv.LoadEnv()
	if srv.Check(err) {
		fmt.Println(err)
	}
	_port, _exsists := os.LookupEnv("PORT")
	PORT := "3000"
	if _exsists {
		PORT = _port
	}

	/* Server Config */
	// API
	http.HandleFunc("GET /api/schedule", getSchedule)
	http.HandleFunc("POST /api/schedule", saveSchedule)

	// Static assets
	fh := http.FileServerFS(os.DirFS("./dist/"))
	http.Handle("GET /", fh)

	srv := &http.Server{
		Addr:           fmt.Sprintf(":%s", PORT),
		MaxHeaderBytes: 1 << 20,
	}

	/* Serve */
	fmt.Printf("Server Listening on port: %v\n", PORT)
	log.Fatal(srv.ListenAndServe())
}

/* Routes */
func getSchedule(w http.ResponseWriter, r *http.Request) {
	println("getSchedule")

}

func saveSchedule(w http.ResponseWriter, r *http.Request) {
	println("saveSchedule")

}

func getStatic(w http.ResponseWriter, r *http.Request) {
	println("getStatic")
}
