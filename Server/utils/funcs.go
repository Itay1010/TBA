package utils

import (
	"server/models"
)

func ReqBlocksToDB(uid models.UserID, blocks []models.RequestBlock) []models.Block {
	// Maybe Change the API so we get the blocks formatted, as this loop is potentially very heavy.
	if len(blocks) == 0 {
		return []models.Block{}
	}

	var resBlocks []models.Block

	for _, block := range blocks {
		dbBlock := models.Block{
			BlockID:   models.BlockID(block.ID),
			UserID:    models.UserID(uid),
			Day:       models.Day(block.Day),
			Title:     block.Title,
			Color:     block.Color,
			StartTime: block.StartTime,
			EndTime:   block.EndTime,
		}
		resBlocks = append(resBlocks, dbBlock)
	}
	return resBlocks
}
