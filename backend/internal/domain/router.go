package domain

import "time"

// NASRouter represents a MikroTik Router / Network Access Server in Maxzone
type NASRouter struct {
	ID                   string     `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name                 string     `json:"name" gorm:"size:100;not null"`
	IPAddress            string     `json:"ip_address" gorm:"type:inet;not null;unique"`
	APIPort              int        `json:"api_port" gorm:"column:api_port;default:8728"`
	APISSLPort           int        `json:"api_ssl_port" gorm:"column:api_ssl_port;default:8729"`
	APIUsername          string     `json:"api_username" gorm:"column:api_username;size:100;not null"`
	APIPasswordEncrypted string     `json:"-" gorm:"column:api_password_encrypted;not null"` // Hidden in JSON
	RadiusSecret         string     `json:"radius_secret" gorm:"column:radius_secret;size:100;not null"`
	CoAPort              int        `json:"coa_port" gorm:"column:coa_port;default:3799"`
	RouterOSVersion      string     `json:"router_os_version" gorm:"column:router_os_version;size:20;default:'v7'"`
	IsSimulated          bool       `json:"is_simulated" gorm:"column:is_simulated;default:false"`
	IsActive             bool       `json:"is_active" gorm:"column:is_active;default:true"`
	LastPingAt           *time.Time `json:"last_ping_at" gorm:"column:last_ping_at"`
	LastStatus           string     `json:"last_status" gorm:"column:last_status;size:20;default:'UNKNOWN'"`
	CreatedAt            time.Time  `json:"created_at" gorm:"column:created_at"`
	UpdatedAt            time.Time  `json:"updated_at" gorm:"column:updated_at"`
}

func (NASRouter) TableName() string {
	return "nas_routers"
}

// NAS represents the FreeRADIUS clients configuration table
type NAS struct {
	ID          int    `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	NASName     string `json:"nasname" gorm:"column:nasname;size:128;uniqueIndex;not null"`
	ShortName   string `json:"shortname" gorm:"column:shortname;size:32"`
	Type        string `json:"type" gorm:"column:type;size:30;default:'other'"`
	Ports       *int   `json:"ports" gorm:"column:ports"`
	Secret      string `json:"secret" gorm:"column:secret;size:60;not null"`
	Server      string `json:"server" gorm:"column:server;size:64"`
	Community   string `json:"community" gorm:"column:community;size:50"`
	Description string `json:"description" gorm:"column:description;size:200"`
}

func (NAS) TableName() string {
	return "nas"
}

// RadCheck stores FreeRADIUS check attributes (credentials)
type RadCheck struct {
	ID        int    `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Username  string `json:"username" gorm:"column:username;size:64;index;not null"`
	Attribute string `json:"attribute" gorm:"column:attribute;size:64;not null"`
	Op        string `json:"op" gorm:"column:op;size:2;not null;default:'=='"`
	Value     string `json:"value" gorm:"column:value;size:253;not null"`
}

func (RadCheck) TableName() string {
	return "radcheck"
}

// RadReply stores FreeRADIUS reply attributes (rate-limits, IPs, pool)
type RadReply struct {
	ID        int    `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Username  string `json:"username" gorm:"column:username;size:64;index;not null"`
	Attribute string `json:"attribute" gorm:"column:attribute;size:64;not null"`
	Op        string `json:"op" gorm:"column:op;size:2;not null;default:'='"`
	Value     string `json:"value" gorm:"column:value;size:253;not null"`
}

func (RadReply) TableName() string {
	return "radreply"
}

// RadUserGroup maps usernames to group profiles
type RadUserGroup struct {
	ID        int    `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Username  string `json:"username" gorm:"column:username;size:64;index;not null"`
	GroupName string `json:"groupname" gorm:"column:groupname;size:64;not null"`
	Priority  int    `json:"priority" gorm:"column:priority;not null;default:1"`
}

func (RadUserGroup) TableName() string {
	return "radusergroup"
}

// RadAcct records FreeRADIUS accounting sessions
type RadAcct struct {
	RadAcctID          int64      `json:"radacctid" gorm:"column:radacctid;primaryKey;autoIncrement"`
	AcctSessionID      string     `json:"acctsessionid" gorm:"column:acctsessionid;size:64;not null"`
	AcctUniqueID       string     `json:"acctuniqueid" gorm:"column:acctuniqueid;size:32;not null;unique"`
	Username           string     `json:"username" gorm:"column:username;size:64;index;not null"`
	Realm              string     `json:"realm" gorm:"column:realm;size:64"`
	NASIPAddress       string     `json:"nasipaddress" gorm:"column:nasipaddress;type:inet;index;not null"`
	NASPortID          string     `json:"nasportid" gorm:"column:nasportid;size:32"`
	NASPortType        string     `json:"nasporttype" gorm:"column:nasporttype;size:32"`
	AcctStartTime      *time.Time `json:"acctstarttime" gorm:"column:acctstarttime"`
	AcctUpdateTime     *time.Time `json:"acctupdatetime" gorm:"column:acctupdatetime"`
	AcctStopTime       *time.Time `json:"acctstoptime" gorm:"column:acctstoptime"`
	AcctInterval       *int       `json:"acctinterval" gorm:"column:acctinterval"`
	AcctSessionTime    *int       `json:"acctsessiontime" gorm:"column:acctsessiontime"`
	AcctAuthentic      string     `json:"acctauthentic" gorm:"column:acctauthentic;size:32"`
	ConnectInfoStart   string     `json:"connectinfo_start" gorm:"column:connectinfo_start;size:50"`
	ConnectInfoStop    string     `json:"connectinfo_stop" gorm:"column:connectinfo_stop;size:50"`
	AcctInputOctets    int64      `json:"acctinputoctets" gorm:"column:acctinputoctets"`
	AcctOutputOctets   int64      `json:"acctoutputoctets" gorm:"column:acctoutputoctets"`
	CalledStationID    string     `json:"calledstationid" gorm:"column:calledstationid;size:50"`
	CallingStationID   string     `json:"callingstationid" gorm:"column:callingstationid;size:50"`
	AcctTerminateCause string     `json:"acctterminatecause" gorm:"column:acctterminatecause;size:32"`
	ServiceType        string     `json:"servicetype" gorm:"column:servicetype;size:32"`
	FramedProtocol     string     `json:"framedprotocol" gorm:"column:framedprotocol;size:32"`
	FramedIPAddress    string     `json:"framedipaddress" gorm:"column:framedipaddress;type:inet"`
}

func (RadAcct) TableName() string {
	return "radacct"
}

// --- Request and Response DTOs ---

type CreateRouterRequest struct {
	Name            string `json:"name" binding:"required"`
	IPAddress       string `json:"ip_address" binding:"required"`
	APIPort         int    `json:"api_port"`
	APISSLPort      int    `json:"api_ssl_port"`
	APIUsername     string `json:"api_username"`
	APIPassword     string `json:"api_password"`
	RadiusSecret    string `json:"radius_secret" binding:"required"`
	CoAPort         int    `json:"coa_port"`
	RouterOSVersion string `json:"router_os_version"`
	IsSimulated     bool   `json:"is_simulated"`
}

type UpdateRouterRequest struct {
	Name            string `json:"name"`
	IPAddress       string `json:"ip_address"`
	APIPort         int    `json:"api_port"`
	APISSLPort      int    `json:"api_ssl_port"`
	APIUsername     string `json:"api_username"`
	APIPassword     string `json:"api_password"`
	RadiusSecret    string `json:"radius_secret"`
	CoAPort         int    `json:"coa_port"`
	RouterOSVersion string `json:"router_os_version"`
	IsSimulated     bool   `json:"is_simulated"`
	IsActive        *bool  `json:"is_active"`
}

type SystemResourceDTO struct {
	Uptime           string `json:"uptime"`
	Version          string `json:"version"`
	Platform         string `json:"platform"`
	BoardName        string `json:"board_name"`
	CPULoad          int    `json:"cpu_load"`
	CPUCount         int    `json:"cpu_count"`
	FreeMemoryBytes  int64  `json:"free_memory_bytes"`
	TotalMemoryBytes int64  `json:"total_memory_bytes"`
	FreeHDDBytes     int64  `json:"free_hdd_bytes"`
	TotalHDDBytes    int64  `json:"total_hdd_bytes"`
	ArchitectureName string `json:"architecture_name"`
}

type ActiveSessionDTO struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	IPAddress   string    `json:"ip_address"`
	MACAddress  string    `json:"mac_address"`
	CallerID    string    `json:"caller_id"`
	Uptime      string    `json:"uptime"`
	BytesIn     int64     `json:"bytes_in"`
	BytesOut    int64     `json:"bytes_out"`
	RateLimit   string    `json:"rate_limit"`
	Service     string    `json:"service"`
	ConnectedAt time.Time `json:"connected_at"`
}

type RouterPingResponseDTO struct {
	Status            string  `json:"status"` // 'ONLINE', 'OFFLINE'
	LatencyMS         float64 `json:"latency_ms"`
	CPULoadPercent    int     `json:"cpu_load_percent"`
	MemoryUsedMB      int     `json:"memory_used_mb"`
	MemoryTotalMB     int     `json:"memory_total_mb"`
	ActivePPPSessions int     `json:"active_ppp_sessions"`
	Uptime            string  `json:"uptime"`
	BoardName         string  `json:"board_name"`
}

type DisconnectSessionRequest struct {
	NASID    string `json:"nas_id" binding:"required"`
	Username string `json:"username" binding:"required"`
	UserIP   string `json:"user_ip"`
}
