package domain

import "time"

// --- FTTH GIS entities (backed by PostGIS in migration 000007) ---

// Splitter represents a primary optical splitter node on the fiber map
type Splitter struct {
	ID           string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name         string    `json:"name" gorm:"size:100;not null"`
	Code         string    `json:"code" gorm:"size:40;not null;index"`
	SplitRatio   string    `json:"split_ratio" gorm:"size:20;default:'1:8'"`
	PortsUsed    int       `json:"ports_used" gorm:"default:0"`
	MaxPorts     int       `json:"max_ports" gorm:"default:8"`
	Address      string    `json:"address" gorm:"type:text"`
	NeedsService bool      `json:"needs_service" gorm:"default:false"`
	Latitude     *float64  `json:"latitude"`
	Longitude    *float64  `json:"longitude"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (Splitter) TableName() string { return "splitters" }

// TJBox represents a termination junction drop box
type TJBox struct {
	ID           string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name         string    `json:"name" gorm:"size:100;not null"`
	Code         string    `json:"code" gorm:"size:40;not null;index"`
	BoxNumber    int       `json:"box_number" gorm:"not null"`
	PortsUsed    int       `json:"ports_used" gorm:"default:0"`
	MaxPorts     int       `json:"max_ports" gorm:"default:8"`
	Address      string    `json:"address" gorm:"type:text"`
	NeedsService bool      `json:"needs_service" gorm:"default:false"`
	Latitude     *float64  `json:"latitude"`
	Longitude    *float64  `json:"longitude"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (TJBox) TableName() string { return "tj_boxes" }

// Available returns how many subscriber ports are still free on the box
func (b TJBox) Available() int {
	free := b.MaxPorts - b.PortsUsed
	if free < 0 {
		return 0
	}
	return free
}

// FiberCable represents a TIA-598 color-coded fiber trunk (polyline)
type FiberCable struct {
	ID             string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name           string    `json:"name" gorm:"size:100;not null"`
	CableType      string    `json:"cable_type" gorm:"size:20;default:'DISTRIBUTION'"` // FEEDER | DISTRIBUTION | DROP
	CoreCount      int       `json:"core_count" gorm:"default:12"`
	JacketColor    string    `json:"jacket_color" gorm:"size:20;default:'ORANGE'"`     // TIA-598
	FromNode       string    `json:"from_node" gorm:"size:100"`
	ToNode         string    `json:"to_node" gorm:"size:100"`
	LatitudeStart  *float64  `json:"latitude_start"`
	LongitudeStart *float64  `json:"longitude_start"`
	LatitudeEnd    *float64  `json:"latitude_end"`
	LongitudeEnd   *float64  `json:"longitude_end"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (FiberCable) TableName() string { return "fiber_cables" }

// FiberCore represents a single strand inside a fiber cable
type FiberCore struct {
	ID        string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CableID   string    `json:"cable_id" gorm:"type:uuid;not null;index"`
	CoreIndex int       `json:"core_index" gorm:"not null"`
	CoreColor string    `json:"core_color" gorm:"size:20;not null"`
	IsUsed    bool      `json:"is_used" gorm:"default:false"`
	ONUID     *string   `json:"onu_id" gorm:"type:uuid"`
	CreatedAt time.Time `json:"created_at"`
}

func (FiberCore) TableName() string { return "fiber_cores" }

// --- DTOs ---

// GISOLT is a lightweight OLT node rendered on the fiber map
type GISOLT struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Vendor     string   `json:"vendor"`
	Model      string   `json:"model"`
	LastStatus string   `json:"last_status"`
	Latitude   *float64 `json:"latitude"`
	Longitude  *float64 `json:"longitude"`
}

// GISSplitter is the map node form of a splitter
type GISSplitter struct {
	Splitter
	Available int `json:"available"`
}

// GISTJBox is the map node form of a TJ box
type GISTJBox struct {
	TJBox
	Available int `json:"available"`
}

// GISCable is the polyline form of a fiber cable (start/end lat/lon for Leaflet)
type GISCable struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	CableType   string   `json:"cable_type"`
	CoreCount   int      `json:"core_count"`
	JacketColor string   `json:"jacket_color"`
	FromNode    string   `json:"from_node"`
	ToNode      string   `json:"to_node"`
	From        [2]float64 `json:"from"` // [lat, lng]
	To          [2]float64 `json:"to"`   // [lat, lng]
}

// GISMapData is the full payload for /api/v1/gis/map
type GISMapData struct {
	Olts      []GISOLT      `json:"olts"`
	Splitters []GISSplitter `json:"splitters"`
	Boxes     []GISTJBox    `json:"boxes"`
	Cables    []GISCable    `json:"cables"`
}

// NearestBoxRequest carries the technician's GPS reading
type NearestBoxRequest struct {
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
}

// NearestBoxResult returns the closest TJ box with PostGIS-computed distance
type NearestBoxResult struct {
	Box        GISTJBox `json:"box"`
	DistanceM  float64  `json:"distance_m"`
}

// ONUSignalDTO is a live optical reading for the field technician meter
type ONUSignalDTO struct {
	SerialNumber string   `json:"serial_number"`
	MACAddress   string   `json:"mac_address"`
	OLTName      string   `json:"olt_name"`
	PONPort      string   `json:"pon_port"`
	Status       string   `json:"status"`
	Health       string   `json:"health"`
	RXPowerDB    *float64 `json:"rx_power_db"`
	TXPowerDB    *float64 `json:"tx_power_db"`
	TemperatureC *float64 `json:"temperature_c"`
	DistanceM    *float64 `json:"distance_m"`
	LastPolledAt *time.Time `json:"last_polled_at"`
}

// FieldTask is a row in the technician task queue (network nodes needing service)
type FieldTask struct {
	Type       string   `json:"type"` // 'BOX' | 'SPLITTER'
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Code       string   `json:"code"`
	Address    string   `json:"address"`
	PortsUsed  int      `json:"ports_used"`
	MaxPorts   int      `json:"max_ports"`
	Latitude   *float64 `json:"latitude"`
	Longitude  *float64 `json:"longitude"`
}