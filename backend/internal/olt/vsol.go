package olt

import "maxzone/internal/domain"

// VSOL GPON OLT profile.
//
// Targets the OLT3610-08 / VSOL standard managed OLT. VSOL publishes a
// simplified MIB under the 37954 enterprise branch; verify OIDs per firmware.
//
//	vsGponPonTable     1.3.6.1.4.1.37954.1000.1.1
//	vsGponOnuTable     1.3.6.1.4.1.37954.1000.2.1 ... (serial/rx/tx/temp/status)
func init() {
	registerProfile(vendorProfile{
		name:         domain.VendorVSOL,
		ponTableOID:  "1.3.6.1.4.1.37954.1000.1.1",
		onuSerialOID: "1.3.6.1.4.1.37954.1000.2.1",
		rxOID:        "1.3.6.1.4.1.37954.1000.2.2",
		txOID:        "1.3.6.1.4.1.37954.1000.2.3",
		tempOID:      "1.3.6.1.4.1.37954.1000.2.4",
		statusOID:    "1.3.6.1.4.1.37954.1000.2.5",
		maxONUs:      64,
	})
}