package models_test

import (
	"database/sql/driver"
	"reflect"
	"server/models"
	"testing"
)

func TestDaysValuerAndScanner(t *testing.T) {
	days := models.Days{models.Sunday, models.Monday, models.Wednesday}

	// Test Value()
	val, err := days.Value()
	if err != nil {
		t.Fatalf("unexpected error from Value(): %v", err)
	}

	valStr, ok := val.(string)
	if !ok {
		t.Fatalf("expected string from Value(), got %T", val)
	}

	expectedJSON := `["Sunday","Monday","Wednesday"]`
	if valStr != expectedJSON {
		t.Errorf("expected %s, got %s", expectedJSON, valStr)
	}

	// Test Scan() with []byte
	var scannedFromBytes models.Days
	if err := scannedFromBytes.Scan([]byte(expectedJSON)); err != nil {
		t.Fatalf("unexpected error scanning from bytes: %v", err)
	}
	if !reflect.DeepEqual(scannedFromBytes, days) {
		t.Errorf("expected %+v, got %+v", days, scannedFromBytes)
	}

	// Test Scan() with string
	var scannedFromStr models.Days
	if err := scannedFromStr.Scan(expectedJSON); err != nil {
		t.Fatalf("unexpected error scanning from string: %v", err)
	}
	if !reflect.DeepEqual(scannedFromStr, days) {
		t.Errorf("expected %+v, got %+v", days, scannedFromStr)
	}

	// Test Scan() with nil
	var scannedNil models.Days
	if err := scannedNil.Scan(nil); err != nil {
		t.Fatalf("unexpected error scanning nil: %v", err)
	}
	if len(scannedNil) != 0 {
		t.Errorf("expected empty Days on nil, got %+v", scannedNil)
	}

	// Test empty days Value()
	var emptyDays models.Days
	emptyVal, err := emptyDays.Value()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if emptyVal != "[]" {
		t.Errorf("expected empty days to produce '[]', got %v", emptyVal)
	}

	_ = driver.Valuer(days)
}
