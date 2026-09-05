package domain

import "time"

// OLIVendor constants for supported GPON/EPON OLT vendors
const (
	VendorHuawei  = "HUAWEI"
	VendorZTE     = "ZTE"
	VendorVSOL    = "VSOL"
	VendorBDCOM   = "BDCOM"
	VendorCDATA   = "CDATA"
	VendorFiberDN = "FIBERHOME"
)

// OLT status constants
const (
	OLTStatusOnline  = "ONLINE"
	OLTStatusOffline = "OFFLINE"
	OLTStatusError   = "ERROR"
	OLTStatusUnknown = "UNKNOWN"
)

// ONU status constants
const (
	ONUStatusOnline     = "ONLINE"
	ONUStatusOffline    = "OFFLINE"
	ONUStatusLOS        = "LOS"
	ONUStatusDiscovered = "DISCOVERED"
	ONUStatusUnknown    = "UNKNOWN"
)

// Optical health levels produced by EvaluateOpticalHealth
const (
	HealthOptimal  = "OPTIMAL"
	HealthGood     = "GOOD"
	HealthWarning  = "WARNING"
	HealthCritical = "CRITICAL"
	HealthUnknown  = "UNKNOWN"
)

// OpticalPowerThresholds define the GPON receive-power bands used by the
// health evaluator. Tuned for typical GPON B+ optics (-8 dBm .. -27 dBm).
const (
	OpticalOverloadDB      = -8.0 // rx above this => receiver saturation risk
	OptimalMaxDB           = -24.0
	WarningMaxDB           = -27.0 // rx below this is marginal
	CriticalMaxDB          = -30.0
)

// OLT represents an Optical Line Terminal managed over SNMP v2c/v3
type OLT struct {
	ID                      string     `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name                    string     `json:"name" gorm:"size:100;not null"`
	Vendor                  string     `json:"vendor" gorm:"size:20;not null"`
	Model                   string     `json:"model" gorm:"size:50"`
	IPAddress               string     `json:"ip_address" gorm:"type:inet;not null;unique"`
	SNMPVersion             string     `json:"snmp_version" gorm:"column:snmp_version;size:5;default:'v2c'"`
	SNMPPort                int        `json:"snmp_port" gorm:"column:snmp_port;default:161"`
	SNMPCommunity           string     `json:"snmp_community" gorm:"column:snmp_community;size:100"`
	SNMPUsername            string     `json:"snmp_username" gorm:"column:snmp_username;size:100"`
	SNMPAuthProtocol        string     `json:"snmp_auth_protocol" gorm:"column:snmp_auth_protocol;size:20"`
	SNMPAuthPassword        string     `json:"-" gorm:"column:snmp_auth_password_encrypted"`
	SNMPPrivProtocol        string     `json:"snmp_priv_protocol" gorm:"column:snmp_priv_protocol;size:20"`
	SNMPPrivPassword        string     `json:"-" gorm:"column:snmp_priv_password_encrypted"`
	OIDProfile              string     `json:"oid_profile" gorm:"column:oid_profile;size:30;default:'default'"`
	IsSimulated             bool       `json:"is_simulated" gorm:"column:is_simulated;default:false"`
	IsActive                bool       `json:"is_active" gorm:"column:is_active;default:true"`
	LastPolledAt            *time.Time `json:"last_polled_at" gorm:"column:last_polled_at"`
	LastStatus              string     `json:"last_status" gorm:"column:last_status;size:20;default:'UNKNOWN'"`
	CreatedAt               time.Time  `json:"created_at" gorm:"column:created_at"`
	UpdatedAt               time.Time  `json:"updated_at" gorm:"column:updated_at"`
}

func (OLT) TableName() string {
	return "olts"
}

// PONPort represents a single GPON port (PON 0/1/1 ...) on an OLT
type PONPort struct {
	ID            string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OLTID         string    `json:"olt_id" gorm:"column:olt_id;type:uuid;not null;index"`
	Frame         int       `json:"frame" gorm:"default:0"`
	Slot          int       `json:"slot" gorm:"not null"`
	Port          int       `json:"port" gorm:"not null"`
	Name          string    `json:"name" gorm:"size:40;not null"`
	OnboardedONT  int       `json:"onboarded_onts" gorm:"column:onboarded_onts;default:0"`
	MaxONTs       int       `json:"max_onts" gorm:"column:max_onts;default:64"`
	IsActive      bool      `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"column:updated_at"`
}

func (PONPort) TableName() string {
	return "pon_ports"
}

// ONU represents an Optical Network Unit discovered on a PON port
type ONU struct {
	ID              string     `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OLTID           string     `json:"olt_id" gorm:"column:olt_id;type:uuid;not null;index"`
	PONPortID       string     `json:"pon_port_id" gorm:"column:pon_port_id;type:uuid;not null;index"`
	SerialNumber    string     `json:"serial_number" gorm:"column:serial_number;size:64;not null;index"`
	Name            string     `json:"name" gorm:"size:100"`
	MACAddress      string     `json:"mac_address" gorm:"column:mac_address;size:17"`
	RXPowerDB       *float64   `json:"rx_power_db" gorm:"column:rx_power_db"`
	TXPowerDB       *float64   `json:"tx_power_db" gorm:"column:tx_power_db"`
	TemperatureC    *float64   `json:"temperature_c" gorm:"column:temperature_c"`
	DistanceM       *float64   `json:"distance_m" gorm:"column:distance_m"`
	Status          string     `json:"status" gorm:"size:20;default:'UNKNOWN'"`
	Health          string     `json:"health" gorm:"size:20;default:'UNKNOWN'"`
	Registered      bool       `json:"registered" gorm:"default:false"`
	LastDiscoveredAt *time.Time `json:"last_discovered_at" gorm:"column:last_discovered_at"`
	LastPolledAt    *time.Time `json:"last_polled_at" gorm:"column:last_polled_at"`
	CreatedAt       time.Time  `json:"created_at" gorm:"column:created_at"`
	UpdatedAt       time.Time  `json:"updated_at" gorm:"column:updated_at"`
}

func (ONU) TableName() string {
	return "onus"
}

// EvaluateOpticalHealth classifies a GPON receive-power reading into a badge.
//
//	>  -8.0     => WARNING (receiver overload / saturated)
//	[-24.0,-8]  => OPTIMAL
//	[-27.0,-24) => WARNING
//	<  -27.0    => CRITICAL (approaching receiver sensitivity)
//	nil         => UNKNOWN
func EvaluateOpticalHealth(rxPowerDB *float64) string {
	if rxPowerDB == nil {
		return HealthUnknown
	}
	dbm := *rxPowerDB
	switch {
	case dbm > OpticalOverloadDB:
		return HealthWarning
	case dbm >= OptimalMaxDB:
		return HealthOptimal
	case dbm >= WarningMaxDB:
		return HealthWarning
	default:
		return HealthCritical
	}
}

// --- Request / Response DTOs ---

type CreateOLTRequest struct {
	Name          string `json:"name" binding:"required"`
	Vendor        string `json:"vendor" binding:"required"` // 'HUAWEI','ZTE','VSOL','BDCOM'
	Model         string `json:"model"`
	IPAddress     string `json:"ip_address" binding:"required"`
	SNMPVersion   string `json:"snmp_version"`
	SNMPPort      int    `json:"snmp_port"`
	SNMPCommunity string `json:"snmp_community"`
	SNMPUsername  string `json:"snmp_username"`
	AuthProtocol  string `json:"snmp_auth_protocol"`
	AuthPassword  string `json:"snmp_auth_password"`
	PrivProtocol  string `json:"snmp_priv_protocol"`
	PrivPassword  string `json:"snmp_priv_password"`
	OIDProfile    string `json:"oid_profile"`
	IsSimulated   bool   `json:"is_simulated"`
}

type UpdateOLTRequest struct {
	Name          string `json:"name"`
	Vendor        string `json:"vendor"`
	Model         string `json:"model"`
	IPAddress     string `json:"ip_address"`
	SNMPVersion   string `json:"snmp_version"`
	SNMPPort      int    `json:"snmp_port"`
	SNMPCommunity string `json:"snmp_community"`
	SNMPUsername  string `json:"snmp_username"`
	AuthProtocol  string `json:"snmp_auth_protocol"`
	AuthPassword  string `json:"snmp_auth_password"`
	PrivProtocol  string `json:"snmp_priv_protocol"`
	PrivPassword  string `json:"snmp_priv_password"`
	OIDProfile    string `json:"oid_profile"`
	IsSimulated   bool   `json:"is_simulated"`
	IsActive      *bool  `json:"is_active"`
}

type OLTSystemInfoDTO struct {
	Vendor        string `json:"vendor"`
	Model         string `json:"model"`
	SoftwareVersion string `json:"software_version"`
	Uptime        string `json:"uptime"`
	SerialNumber  string `json:"serial_number"`
}

type OLTPONInfoDTO struct {
	Frame        int `json:"frame"`
	Slot         int `json:"slot"`
	Port         int `json:"port"`
	OnboardedONT int `json:"onboarded_onts"`
	MaxONTs      int `json:"max_onts"`
}

func (o OLTPONInfoDTO) Name() string {
	return PONPortName(o.Frame, o.Slot, o.Port)
}

// PONPortName renders a human label like "PON 0/1/1"
func PONPortName(frame, slot, port int) string {
	return "PON " + itoa(frame) + "/" + itoa(slot) + "/" + itoa(port)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

type ONTInfoDTO struct {
	SerialNumber string   `json:"serial_number"`
	Name         string   `json:"name"`
	MACAddress   string   `json:"mac_address"`
	RXPowerDB    *float64 `json:"rx_power_db"`
	TXPowerDB    *float64 `json:"tx_power_db"`
	TemperatureC *float64 `json:"temperature_c"`
	DistanceM    *float64 `json:"distance_m"`
	Status       string   `json:"status"`
	Registered   bool     `json:"registered"`
}

type OLTDetailPortDTO struct {
	ID            string      `json:"id"`
	Name          string      `json:"name"`
	Frame         int         `json:"frame"`
	Slot          int         `json:"slot"`
	Port          int         `json:"port"`
	OnboardedONT  int         `json:"onboarded_onts"`
	MaxONTs       int         `json:"max_onts"`
	Onus          []ONU       `json:"onus"`
}

type OLTDetailDTO struct {
	OLT             *OLT              `json:"olt"`
	Ports           []OLTDetailPortDTO `json:"ports"`
	DiscoveredQueue []ONU             `json:"discovered_queue"`
	TotalONUs       int               `json:"total_onus"`
	UnregisteredONU int               `json:"unregistered_onus"`
}

type OLTPingResultDTO struct {
	Status          string  `json:"status"` // 'ONLINE','OFFLINE'
	LatencyMS       float64 `json:"latency_ms"`
	Vendor          string  `json:"vendor"`
	Model           string  `json:"model"`
	SoftwareVersion string  `json:"software_version"`
	Uptime          string  `json:"uptime"`
}

type UpdateONURequest struct {
	Name       string `json:"name"`
	MACAddress string `json:"mac_address"`
	Registered *bool  `json:"registered"`
}