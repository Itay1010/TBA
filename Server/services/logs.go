package services

import (
	"io"
	"log"
	"os"
)

func WireLogger() *os.File {
	file, err := os.OpenFile("error.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if !Check(err) {
		errMW := io.MultiWriter(os.Stderr, file)
		log.SetOutput(errMW)
		log.Default().SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
		return file // Caller must close the file at the end of program execution
	} else {
		log.Println(err)
		file.Close()
		return nil
	}
}
