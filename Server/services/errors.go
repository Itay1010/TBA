package services

import "fmt"

func Check(e error, rest ...func(error)) bool {
	if e != nil {
		if len(rest) > 0 {
			rest[0](e)
		}
		return true
	}
	return false
}

type DBErrs struct {
	MissingUser     error
	MissingPass     error
	MissingDB       error
	MissingURI      error
	UnexpectedError error
	ConnectionError error
	NotConnected    error
}

var DBE = DBErrs{
	MissingUser:     fmt.Errorf("Missing ENV var for database"),
	MissingPass:     fmt.Errorf("Missing ENV var for database"),
	MissingDB:       fmt.Errorf("Missing ENV var for database"),
	MissingURI:      fmt.Errorf("Missing ENV var for database"),
	UnexpectedError: fmt.Errorf("An unexpected DB error occurred"),
	ConnectionError: fmt.Errorf("Error connecting to DB"),
	NotConnected:    fmt.Errorf("DB connection was not initialized"),
}
