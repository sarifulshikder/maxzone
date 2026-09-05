package olt

import "maxzone/internal/domain"

// BDCOM GPON OLT profile.
//
// Targets the P3600 / S2958C / GBGPON BK-OLT family. BDCOM uses the 3320
// enterprise branch; verify OIDs against the exact firmware release.
//
//	bdGponPonTable     1.3.6.1.4.1.3320.101.1.1
//	bdGponOnuTable     1.3.6.1.4.1.3320.101.2.1 ... (serial/rx/tx/temp/status)
func init() {
	registerProfile(vendorProfile{
		name:         domain.VendorBDCOM,
		ponTableOID:  "1.3.6.1.4.1.3320.101.1.1",
		onuSerialOID: "1.3.6.1.4.1.3320.101.2.1",
		rxOID:        "1.3.6.1.4.1.3320.101.2.2",
		txOID:        "1.3.6.1.4.1.3320.101.2.3",
		tempOID:      "1.3.6.1.4.1.3320.101.2.4",
		statusOID:    "1.3.6.1.4.1.3320.101.2.5",
		maxONUs:      64,
	})
}