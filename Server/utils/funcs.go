package utils

import (
	"encoding/json"
	"server/models"
	"strings"
)

func ReqBlocksToDB(uid models.UserID, blocks []models.ClientBlock) []models.Block {
	// Maybe Change the API so we get the blocks formatted, as this loop is potentially very heavy.
	if len(blocks) == 0 {
		return []models.Block{}
	}

	var resBlocks []models.Block
	for _, block := range blocks {
		var days models.Days
		trimmedDays := strings.TrimSpace(block.Days)
		if trimmedDays != "" {
			if err := json.Unmarshal([]byte(trimmedDays), &days); err != nil {
				// Fallback: handle comma-separated or single string
				parts := strings.Split(trimmedDays, ",")
				days = make(models.Days, 0, len(parts))
				for _, p := range parts {
					cleaned := strings.TrimSpace(p)
					if cleaned != "" {
						days = append(days, models.Day(cleaned))
					}
				}
			}
		}
		if days == nil {
			days = models.Days{}
		}
		dbBlock := models.Block{
			BlockID:   models.BlockID(block.ID),
			UserID:    models.UserID(uid),
			Days:      days,
			Title:     block.Title,
			Color:     block.Color,
			StartTime: block.StartTime,
			EndTime:   block.EndTime,
		}
		resBlocks = append(resBlocks, dbBlock)
	}
	return resBlocks
}

// MakeHttpRes returns a models.HttpRes[T] with the data field set to data and error fields set to the provided error.
func MakeHttpRes[T any](data T, err string, rawError error) *models.HttpRes[T] {
	res := &models.HttpRes[T]{}
	res.Data = data
	res.Error = err
	if rawError != nil {
		res.Metadata = &map[string]any{"raw_error": rawError.Error()}
	}
	return res
}

// MakeHttpJsonRes wraps MakeHttpRes and returns a json encoded string of models.HttpRes[T].
//
// Return value is alway a string, and an empty string on json.Marshal error.
func MakeHttpJsonRes[T any](data T, errStr string, rawError error) []byte {
	res := MakeHttpRes(data, errStr, rawError)
	jsonRes, jsonErr := json.Marshal(res)
	if jsonErr != nil {
		return []byte("")
	}
	return jsonRes
}
