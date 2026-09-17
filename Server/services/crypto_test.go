package services

import (
	"testing"
)

func TestEncryptDecryptToken(t *testing.T) {
	sampleToken := "ya29.a0Axoo88v_test_oauth_refresh_token_123456789"

	encrypted, err := EncryptToken(sampleToken)
	if err != nil {
		t.Fatalf("EncryptToken failed: %v", err)
	}

	if encrypted == sampleToken {
		t.Fatalf("Encrypted text should not match plain text")
	}

	decrypted, err := DecryptToken(encrypted)
	if err != nil {
		t.Fatalf("DecryptToken failed: %v", err)
	}

	if decrypted != sampleToken {
		t.Fatalf("Expected decrypted string %q, got %q", sampleToken, decrypted)
	}
}

func TestEmptyTokenEncryption(t *testing.T) {
	encrypted, err := EncryptToken("")
	if err != nil || encrypted != "" {
		t.Fatalf("EncryptToken(\"\") should return empty string without error, got %q, %v", encrypted, err)
	}

	decrypted, err := DecryptToken("")
	if err != nil || decrypted != "" {
		t.Fatalf("DecryptToken(\"\") should return empty string without error, got %q, %v", decrypted, err)
	}
}
