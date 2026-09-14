package services

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func LoadEnv() error {
	PATH, err := filepath.Abs("./")
	if err != nil {
		return fmt.Errorf("ABS path error: %w", err)
	}
	PATH += string(filepath.Separator)

	if IsDev() {
		PATH += ".dev.env"
	} else {
		PATH += ".env"
	}

	f, err := os.Open(PATH)

	if err != nil {
		return fmt.Errorf("Failed to open file: %w", err)
	}
	s := bufio.NewScanner(f)
	for s.Scan() {
		key, value, found := strings.Cut(s.Text(), "=")
		if found {
			os.Setenv(key, value)
		}
		fmt.Println("Worning: faild to parse an ENV value.")
	}
	if err := s.Err(); err != nil {
		return fmt.Errorf("%w", err)
	}
	return nil

}

func IsDev() bool {
	isDev, err := strconv.ParseBool(strings.Trim(os.Getenv("DEV"), " "))
	return isDev && err != nil

}
