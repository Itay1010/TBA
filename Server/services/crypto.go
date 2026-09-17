package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"os"
	"sync"
)

var (
	encryptionKeyOnce sync.Once
	encryptionKey     []byte
)

func getEncryptionKey() []byte {
	encryptionKeyOnce.Do(func() {
		secret, exists := os.LookupEnv("TOKEN_ENCRYPTION_KEY")
		if !exists || secret == "" {
			secret, exists = os.LookupEnv("SESSION_ENCRYPTION_KEY")
		}
		if !exists || secret == "" {
			// Fallback key derived from DBPass or default secret for dev environment
			dbPass := os.Getenv("DBPass")
			if dbPass != "" {
				secret = "tba_dev_secret_" + dbPass
			} else {
				secret = "tba_default_dev_token_encryption_secret_key_32bytes"
			}
		}
		hash := sha256.Sum256([]byte(secret))
		encryptionKey = hash[:]
	})
	return encryptionKey
}

// EncryptToken encrypts a plaintext string using AES-256-GCM and returns a base64 encoded string.
func EncryptToken(plainText string) (string, error) {
	if plainText == "" {
		return "", nil
	}
	key := getEncryptionKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	cipherText := gcm.Seal(nonce, nonce, []byte(plainText), nil)
	return base64.StdEncoding.EncodeToString(cipherText), nil
}

// DecryptToken decrypts a base64 encoded AES-256-GCM ciphertext back to plaintext.
func DecryptToken(cipherText string) (string, error) {
	if cipherText == "" {
		return "", nil
	}
	data, err := base64.StdEncoding.DecodeString(cipherText)
	if err != nil {
		return "", err
	}
	key := getEncryptionKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, actualCipher := data[:nonceSize], data[nonceSize:]
	plainBytes, err := gcm.Open(nil, nonce, actualCipher, nil)
	if err != nil {
		return "", err
	}
	return string(plainBytes), nil
}
