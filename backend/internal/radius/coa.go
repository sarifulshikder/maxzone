package radius

import (
	"context"
	"fmt"
	"log"
	"net"
	"time"

	"layeh.com/radius"
	"layeh.com/radius/rfc2865"
)

// RFC 3576 / RFC 5176 Disconnect Packet Codes
const (
	CodeDisconnectRequest radius.Code = 40
	CodeDisconnectACK     radius.Code = 41
	CodeDisconnectNAK     radius.Code = 42
)

// SendDisconnectRequest sends an RFC 3576 Disconnect-Request (CoA) packet to the NAS
func SendDisconnectRequest(nasIP string, coaPort int, secret string, username string, framedIP net.IP, isSimulated bool) error {
	if isSimulated {
		log.Printf("[SIMULATOR] 🔌 Disconnect-Request (RFC 3576) dispatched for user '%s' on NAS %s:%d", username, nasIP, coaPort)
		return nil
	}

	if coaPort <= 0 {
		coaPort = 3799
	}

	packet := radius.New(CodeDisconnectRequest, []byte(secret))
	if err := rfc2865.UserName_SetString(packet, username); err != nil {
		return fmt.Errorf("failed to set UserName: %w", err)
	}

	if framedIP != nil {
		if err := rfc2865.FramedIPAddress_Set(packet, framedIP); err != nil {
			return fmt.Errorf("failed to set FramedIPAddress: %w", err)
		}
	}

	targetAddr := net.JoinHostPort(nasIP, fmt.Sprintf("%d", coaPort))

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	response, err := radius.Exchange(ctx, packet, targetAddr)
	if err != nil {
		return fmt.Errorf("radius exchange error with NAS %s: %w", targetAddr, err)
	}

	if response.Code != CodeDisconnectACK {
		return fmt.Errorf("received non-ACK (%d) from NAS %s", response.Code, targetAddr)
	}

	log.Printf("✅ CoA Disconnect-Request ACK from NAS %s for user '%s'", targetAddr, username)
	return nil
}
