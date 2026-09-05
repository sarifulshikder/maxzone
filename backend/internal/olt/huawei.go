package olt

import "maxzone/internal/domain"

// Huawei GPON/EPON OLT profile.
//
// Targets the MA5600T / MA5800 family (board GPON). OID roots below follow
// the Huawei enterprise MIB layout commonly reported for these platforms and
// MUST be verified against the specific firmware during commissioning.
//
//	hwGponPonTable         1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.1
//	    index ... frame.slot.port
//	hwGponOnuTableSerial   1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.5
//	hwGponOnuTableRx       1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.6  (dBm x100)
//	hwGponOnuTableTx       1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.7
//	hwGponOnuTableTemp     1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.8
//	hwGponOnuTableStatus   1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.9
func init() {
	registerProfile(vendorProfile{
		name:        domain.VendorHuawei,
		ponTableOID: "1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.1",
		onuSerialOID: "1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.5",
		rxOID:        "1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.6",
		txOID:        "1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.7",
		tempOID:      "1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.8",
		statusOID:    "1.3.6.1.4.1.2011.6.128.1.1.2.43.1.1.9",
		maxONUs:      64,
	})
}