package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	srv "server/services"
)

func main() {

	loggerFile := srv.WireLogger()
	if loggerFile == nil {
		panic(fmt.Errorf("Error: Logger cannot be wired for some reason"))
	}
	defer loggerFile.Close()

	err := srv.LoadEnv()
	if srv.Check(err) {
		panic(err)
	}
	e := srv.InitDb()
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
	http.HandleFunc("POST /api/schedule", saveSchedule)

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
	println("getSchedule")

}

func saveSchedule(w http.ResponseWriter, r *http.Request) {
	println("saveSchedule")

}

func getStatic(w http.ResponseWriter, r *http.Request) {
	println("getStatic")
}
