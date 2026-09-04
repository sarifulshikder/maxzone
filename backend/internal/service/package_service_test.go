package service

import (
	"testing"

	"maxzone/internal/domain"
)

func TestFormatSpeedString(t *testing.T) {
	tests := []struct {
		kbps     int
		expected string
	}{
		{1024, "1M"},
		{5120, "5M"},
		{10240, "10M"},
		{20480, "20M"},
		{30720, "30M"},
		{512, "512k"},
		{768, "768k"},
		{1500, "1500k"},
	}

	for _, tt := range tests {
		actual := domain.FormatSpeedString(tt.kbps)
		if actual != tt.expected {
			t.Errorf("FormatSpeedString(%d) = %s, expected %s", tt.kbps, actual, tt.expected)
		}
	}
}

func TestRateLimitStringDefault(t *testing.T) {
	down := 30720 // 30 Mbps
	up := 30720   // 30 Mbps

	rateLimit := domain.FormatSpeedString(up) + "/" + domain.FormatSpeedString(down)
	expected := "30M/30M"
	if rateLimit != expected {
		t.Errorf("Expected rate limit '%s', got '%s'", expected, rateLimit)
	}
}
