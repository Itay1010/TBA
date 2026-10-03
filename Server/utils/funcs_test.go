package utils_test

import (
	"reflect"
	"server/models"
	"server/utils"
	"testing"
)

func TestReqBlocksToDB(t *testing.T) {
	uid := models.UserID("user_123")
	clientBlocks := []models.ClientBlock{
		{
			ID:        "block_1",
			Title:     "Gym Session",
			Days:      `["Sunday","Tuesday","Thursday"]`,
			Color:     "green",
			StartTime: "07:00",
			EndTime:   "08:30",
		},
		{
			ID:        "block_2",
			Title:     "Team Standup",
			Days:      "Monday, Wednesday",
			Color:     "blue",
			StartTime: "09:00",
			EndTime:   "09:30",
		},
	}

	dbBlocks := utils.ReqBlocksToDB(uid, clientBlocks)
	if len(dbBlocks) != 2 {
		t.Fatalf("expected 2 db blocks, got %d", len(dbBlocks))
	}

	// Block 1
	b1 := dbBlocks[0]
	if b1.BlockID != "block_1" || b1.UserID != uid || b1.Title != "Gym Session" || b1.Color != "green" {
		t.Errorf("unexpected b1 metadata: %+v", b1)
	}
	expectedDays1 := models.Days{models.Sunday, models.Tuesday, models.Thursday}
	if !reflect.DeepEqual(b1.Days, expectedDays1) {
		t.Errorf("expected b1 days %+v, got %+v", expectedDays1, b1.Days)
	}

	// Block 2 (comma-separated fallback)
	b2 := dbBlocks[1]
	if b2.BlockID != "block_2" || b2.UserID != uid || b2.Title != "Team Standup" || b2.Color != "blue" {
		t.Errorf("unexpected b2 metadata: %+v", b2)
	}
	expectedDays2 := models.Days{models.Monday, models.Wednesday}
	if !reflect.DeepEqual(b2.Days, expectedDays2) {
		t.Errorf("expected b2 days %+v, got %+v", expectedDays2, b2.Days)
	}
}
