package services

import "fmt"

type DBErrs struct {
	MissingUser     error
	MissingPass     error
	MissingDB       error
	MissingURI      error
	UnexpectedError error
	ConnectionError error
	NotConnected    error
	UserNotFound    error
	MissingBlocks   error
}

var DBE = DBErrs{
	MissingUser:     fmt.Errorf("Missing ENV var for database"),
	MissingPass:     fmt.Errorf("Missing ENV var for database"),
	MissingDB:       fmt.Errorf("Missing ENV var for database"),
	MissingURI:      fmt.Errorf("Missing ENV var for database"),
	UnexpectedError: fmt.Errorf("An unexpected DB error occurred"),
	ConnectionError: fmt.Errorf("Error connecting to DB"),
	NotConnected:    fmt.Errorf("DB connection was not initialized"),
	UserNotFound:    fmt.Errorf("User not found"),
	MissingBlocks:   fmt.Errorf("No blocks to save for this user"),
}
