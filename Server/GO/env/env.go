package env

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type fn func()
type efn func(e error)

func Check(e error, rest ...efn) bool {
	if e != nil {
		if len(rest) > 0 {
			rest[0](e)
		}
		return true
	}
	return false
}

func LoadEnv() error {
	PATH, err := filepath.Abs("./")
	if Check(err) {
		return fmt.Errorf("ABS path error: %w", err)
	}
	PATH += string(filepath.Separator)

	if isDev, err := strconv.ParseBool(os.Getenv("DEV")); isDev && Check(err) {
		PATH += ".dev.env"
	} else {
		PATH += ".env"
	}

	f, err := os.Open(PATH)

	if Check(err) {
		return fmt.Errorf("Failed to open file: %w", err)
	}
	s := bufio.NewScanner(f)
	for s.Scan() {
		arr := strings.Split(s.Text(), "=")
		os.Setenv(arr[0], arr[1])
	}
	if e := s.Err(); Check(e) {
		return fmt.Errorf("%w", e)
	}
	return nil

}
