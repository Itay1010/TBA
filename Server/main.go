package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"server/routes"
	srv "server/services"
)

func main() {
	err := srv.LoadEnv()
	if err != nil {
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
	mux := http.NewServeMux()
	routes.RegisterRoutes(mux)
	srv := &http.Server{
		Addr:           fmt.Sprintf(":%s", PORT),
		MaxHeaderBytes: 0, // Using DefaultMaxHeaderBytes
		Handler:        mux,
	}

	/* Serve */
	fmt.Printf("Server Listening on port: %v\n", PORT)
	log.Fatal(srv.ListenAndServe())
}
