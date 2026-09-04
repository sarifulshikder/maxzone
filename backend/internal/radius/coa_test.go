package radius

import (
	"net"
	"testing"
)

func TestSendDisconnectRequest_Simulated(t *testing.T) {
	err := SendDisconnectRequest(
		"10.0.0.1",
		3799,
		"secret123",
		"karim_fiber",
		net.ParseIP("10.10.20.51"),
		true, // isSimulated
	)
	if err != nil {
		t.Fatalf("expected simulated disconnect to succeed, got %v", err)
	}
}
