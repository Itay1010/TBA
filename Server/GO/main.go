package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"server/env"
)

func main() {
	e := env.LoadEnv()
	if env.Check(e) {
		fmt.Println(e)
	}
	_port, _exsists := os.LookupEnv("PORT")
	PORT := "3000"
	if _exsists {
		PORT = _port
	}
	srv := &http.Server{
		Addr:           fmt.Sprintf(":%s", PORT),
		MaxHeaderBytes: 1 << 20,
	}
	fmt.Printf("Server Listening on port: %v\n", PORT)
	log.Fatal(srv.ListenAndServe())
}

func Server() {

}
