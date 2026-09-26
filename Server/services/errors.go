package services

import (
	"encoding/json"
	"fmt"
	"server/models"
)

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

// MakeHttpRes returns a models.HttpRes[T] with the data field set to data and error fields set to the provided error.
func MakeHttpRes[T any](data T, err string, rawError error) *models.HttpRes[T] {
	res := &models.HttpRes[T]{}

	res.Data = data
	res.Error = err
	res.Metadata = &map[string]any{"raw_error": rawError.Error()}
	return res
}

// MakeHttpJsonRes wraps MakeHttpRes and returns a json encoded string of models.HttpRes[T].
//
// Return value is alway a string, and an empty string on json.Marshal error.
func MakeHttpJsonRes[T any](data T, errStr string, rawError error) string {
	res := MakeHttpRes(data, errStr, rawError)
	jsonRes, jsonErr := json.Marshal(res)
	if jsonErr != nil {
		return ""
	}
	return string(jsonRes)
}
