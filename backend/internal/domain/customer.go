package domain

import "time"

// Customer represents a retail or commercial broadband subscriber profile
type Customer struct {
	ID           string           `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       string           `json:"user_id" gorm:"column:user_id;type:uuid;not null;unique"`
	ResellerID   *string          `json:"reseller_id" gorm:"column:reseller_id;type:uuid"`
	CustomerCode string           `json:"customer_code" gorm:"column:customer_code;size:50;not null;unique"`
	BillingType  string           `json:"billing_type" gorm:"column:billing_type;size:20;default:'PREPAID'"`
	BillingCycle string           `json:"billing_cycle" gorm:"column:billing_cycle;size:20;default:'CALENDAR_MONTH'"`
	NIDPassport  string           `json:"nid_passport" gorm:"column:nid_passport;size:50"`
	AddressLine1 string           `json:"address_line1" gorm:"column:address_line1;not null"`
	AddressLine2 string           `json:"address_line2" gorm:"column:address_line2"`
	ZoneArea     string           `json:"zone_area" gorm:"column:zone_area;size:100"`
	GPSLat       *float64         `json:"gps_lat" gorm:"column:gps_lat"`
	GPSLng       *float64         `json:"gps_lng" gorm:"column:gps_lng"`
	CreatedAt    time.Time        `json:"created_at" gorm:"column:created_at"`
	UpdatedAt    time.Time        `json:"updated_at" gorm:"column:updated_at"`
	User         *User            `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Accounts     []ServiceAccount `json:"service_accounts,omitempty" gorm:"foreignKey:CustomerID"`
}

func (Customer) TableName() string {
	return "customers"
}

// ServiceAccount represents a subscriber's connection credentials (PPPoE / Hotspot)
type ServiceAccount struct {
	ID                   string     `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CustomerID           string     `json:"customer_id" gorm:"column:customer_id;type:uuid;not null"`
	NASID                string     `json:"nas_id" gorm:"column:nas_id;type:uuid;not null"`
	PackageID            string     `json:"package_id" gorm:"column:package_id;type:uuid;not null"`
	Username             string     `json:"username" gorm:"column:username;size:100;not null;unique"`
	Password             string     `json:"password" gorm:"column:password;size:100;not null"` // Cleartext password for FreeRADIUS PAP/CHAP
	ServiceType          string     `json:"service_type" gorm:"column:service_type;size:20;not null;default:'PPPOE'"`
	StaticIP             *string    `json:"static_ip" gorm:"column:static_ip;type:inet"`
	MACAddress           *string    `json:"mac_address" gorm:"column:mac_address;type:macaddr"`
	Status               string     `json:"status" gorm:"column:status;size:20;default:'ACTIVE'"` // 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'GRACE'
	ExpiresAt            time.Time  `json:"expires_at" gorm:"column:expires_at"`
	GraceExpiresAt       *time.Time `json:"grace_expires_at" gorm:"column:grace_expires_at"`
	LastOnlineAt         *time.Time `json:"last_online_at" gorm:"column:last_online_at"`
	LastCallingStationID *string    `json:"last_calling_station_id" gorm:"column:last_calling_station_id"`
	CreatedAt            time.Time  `json:"created_at" gorm:"column:created_at"`
	UpdatedAt            time.Time  `json:"updated_at" gorm:"column:updated_at"`

	// Joined relations
	Package *Package   `json:"package,omitempty" gorm:"foreignKey:PackageID"`
	Router  *NASRouter `json:"router,omitempty" gorm:"foreignKey:NASID"`
}

func (ServiceAccount) TableName() string {
	return "service_accounts"
}

// --- DTOs for Onboarding & Customer 360 ---

type CreateCustomerRequest struct {
	// Personal & Contact Info
	FirstName    string `json:"first_name" binding:"required"`
	LastName     string `json:"last_name"`
	Phone        string `json:"phone" binding:"required"`
	Email        string `json:"email"`
	AddressLine1 string `json:"address_line1" binding:"required"`
	AddressLine2 string `json:"address_line2"`
	ZoneArea     string `json:"zone_area"`
	NIDPassport  string `json:"nid_passport"`

	// Billing Preferences
	BillingType  string `json:"billing_type"`  // 'PREPAID', 'POSTPAID'
	BillingCycle string `json:"billing_cycle"` // 'CALENDAR_MONTH', 'ANNIVERSARY'
	ResellerID   *string `json:"reseller_id"`

	// Service Account Credentials
	Username   string  `json:"username" binding:"required"`
	Password   string  `json:"password" binding:"required"`
	PackageID  string  `json:"package_id" binding:"required"`
	NASID      string  `json:"nas_id" binding:"required"`
	StaticIP   *string `json:"static_ip"`
	MACAddress *string `json:"mac_address"`
}

type UpdateCustomerRequest struct {
	FirstName    string  `json:"first_name"`
	LastName     string  `json:"last_name"`
	Phone        string  `json:"phone"`
	Email        string  `json:"email"`
	AddressLine1 string  `json:"address_line1"`
	AddressLine2 string  `json:"address_line2"`
	ZoneArea     string  `json:"zone_area"`
	NIDPassport  string  `json:"nid_passport"`
	BillingType  string  `json:"billing_type"`
	BillingCycle string  `json:"billing_cycle"`
	PackageID    string  `json:"package_id"`
	Password     string  `json:"password"`
	Status       string  `json:"status"` // 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'GRACE'
	StaticIP     *string `json:"static_ip"`
}

type CustomerListItemDTO struct {
	ID           string    `json:"id"`
	CustomerCode string    `json:"customer_code"`
	Name         string    `json:"name"`
	Phone        string    `json:"phone"`
	Email        string    `json:"email"`
	ZoneArea     string    `json:"zone_area"`
	Username     string    `json:"username"`
	PackageName  string    `json:"package_name"`
	PackageSpeed string    `json:"package_speed"`
	Price        float64   `json:"price"`
	RouterName   string    `json:"router_name"`
	Status       string    `json:"status"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
}

type Customer360DetailDTO struct {
	Customer       Customer       `json:"customer"`
	ServiceAccount ServiceAccount `json:"service_account"`
	Package        Package        `json:"package"`
	Router         NASRouter      `json:"router"`
	RadiusCheck    []RadCheck     `json:"radius_check"`
	RadiusReply    []RadReply     `json:"radius_reply"`
}
