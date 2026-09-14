package utils

import (
	"server/models"
	srv "server/services"
)

func ReqBlocksToDB(uid srv.UserID, blocks []models.RequestBlock) []srv.Block {
	// Maybe Change the API so we get the blocks formatted, as this loop is potentially very heavy.
	if len(blocks) == 0 {
		return []srv.Block{}
	}

	var resBlocks []srv.Block

	for _, block := range blocks {
		dbBlock := srv.Block{
			BlockID:   srv.BlockID(block.ID),
			UserID:    srv.UserID(uid),
			Day:       srv.Day(block.Day),
			Title:     block.Title,
			Color:     block.Color,
			StartTime: block.StartTime,
			EndTime:   block.EndTime,
		}
		resBlocks = append(resBlocks, dbBlock)
	}
	return resBlocks
}
