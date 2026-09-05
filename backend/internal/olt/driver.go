// Package olt implements the SPDB driver layer for GPON/EPON Optical Line
// Terminals. It abstracts real SNMP v2c/v3 devices and an offline simulator,
// mirroring the pattern used by the mikrotik package.
package olt

import (
	"context"
	"errors"
	"fmt"
	"time"

	"maxzone/internal/domain"
)

// Driver abstracts a real or simulated OLT device.
type Driver interface {
	Ping(ctx context.Context) (time.Duration, error)
	GetSystemInfo(ctx context.Context) (*domain.OLTSystemInfoDTO, error)
	DiscoverPorts(ctx context.Context) ([]domain.OLTPONInfoDTO, error)
	DiscoverONUs(ctx context.Context, pon domain.OLTPONInfoDTO) ([]domain.ONTInfoDTO, error)
	AuthorizeONU(ctx context.Context, serial string) error
}

// NewDriver constructs either the Simulated or the Real SNMP driver.
func NewDriver(olt *domain.OLT, globalSimulation bool) Driver {
	if olt.IsSimulated || globalSimulation {
		return &SimulatedDriver{olt: olt}
	}
	return &RealDriver{olt: olt}
}

// vendorProfile carries vendor-specific SNMP OID templates for port and ONU
// discovery. OIDs must be verified against the target firmware during site
// commissioning; the simulator is authoritative for development/demo.
type vendorProfile struct {
	name        string
	ponTableOID string // walk root — suffix indexes are frame.slot.port
	onuSerialOID string // base indexed ...frame.slot.port.onuIndex
	rxOID        string
	txOID        string
	tempOID      string
	statusOID    string
	maxONUs      int
}

var vendorProfiles = map[string]vendorProfile{}

func registerProfile(p vendorProfile) {
	vendorProfiles[p.name] = p
}

func profileFor(olt *domain.OLT) (vendorProfile, error) {
	key := olt.OIDProfile
	if key == "" || key == "default" {
		key = olt.Vendor
	}
	p, ok := vendorProfiles[key]
	if !ok {
		return vendorProfile{}, fmt.Errorf("no SNMP OID profile configured for vendor %q (use a supported vendor or oid_profile)", olt.Vendor)
	}
	return p, nil
}

// --- SNMP value decoding helpers ---

func snmpString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case []byte:
		return string(t)
	case string:
		return t
	default:
		return fmt.Sprintf("%v", t)
	}
}

func snmpInt(v interface{}) int {
	switch t := v.(type) {
	case int:
		return t
	case int8:
		return int(t)
	case int16:
		return int(t)
	case int32:
		return int(t)
	case int64:
		return int(t)
	case uint:
		return int(t)
	case uint16:
		return int(t)
	case uint32:
		return int(t)
	case uint64:
		return int(t)
	case float64:
		return int(t)
	case []byte:
		return len(t)
	}
	return 0
}

// extractIndexes splits the OID instance suffix following prefix into ints.
func extractIndexes(prefix, walkOID string) ([]int, error) {
	if len(prefix) >= len(walkOID) {
		return nil, errors.New("walk oid does not belong to requested subtree")
	}
	suffix := walkOID[len(prefix):]
	if len(suffix) > 0 && suffix[0] == '.' {
		suffix = suffix[1:]
	}
	idx := []int{}
	cur := 0
	seen := false
	for i := 0; i <= len(suffix); i++ {
		if i == len(suffix) || suffix[i] == '.' {
			if seen {
				idx = append(idx, cur)
			}
			cur = 0
			seen = false
		} else {
			seen = true
			cur = cur*10 + int(suffix[i]-'0')
		}
	}
	return idx, nil
}