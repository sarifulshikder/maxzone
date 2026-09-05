package olt

import "maxzone/internal/domain"

// ZTE GPON OLT profile.
//
// Targets the C320 / C300 onu500m-10g / ZXR10 family. OID roots follow the
// ZTE-GONU enterprise MIB layout; verify against firmware during commissioning.
//
//	zxGponPonTable     1.3.6.1.4.1.3902.1082.1.1.2.1.4.1
//	zxGponOnuTable     1.3.6.1.4.1.3902.1082.1.1.2.1.11.1 ...
func init() {
	registerProfile(vendorProfile{
		name:         domain.VendorZTE,
		ponTableOID:  "1.3.6.1.4.1.3902.1082.1.1.2.1.4.1",
		onuSerialOID: "1.3.6.1.4.1.3902.1082.1.1.2.1.11.1",
		rxOID:        "1.3.6.1.4.1.3902.1082.1.1.2.1.12.1",
		txOID:        "1.3.6.1.4.1.3902.1082.1.1.2.1.13.1",
		tempOID:      "1.3.6.1.4.1.3902.1082.1.1.2.1.14.1",
		statusOID:    "1.3.6.1.4.1.3902.1082.1.1.2.1.15.1",
		maxONUs:      128,
	})
}