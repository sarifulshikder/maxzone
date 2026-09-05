package olt

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"maxzone/internal/domain"

	"github.com/gosnmp/gosnmp"
)

// Standard MIB-2 OIDs available on every SNMP device.
const (
	oidSysDescr    = "1.3.6.1.2.1.1.1.0"
	oidSysObjectID = "1.3.6.1.2.1.1.2.0"
	oidSysUpTime   = "1.3.6.1.2.1.1.3.0"
	oidSysName     = "1.3.6.1.2.1.1.5.0"
	oidSysLocation = "1.3.6.1.2.1.1.6.0"
)

// RealDriver implements the Driver interface against a physical OLT using
// SNMP v2c or v3.
type RealDriver struct {
	olt *domain.OLT
}

func (r *RealDriver) params(timeout time.Duration) (*gosnmp.GoSNMP, error) {
	port := r.olt.SNMPPort
	if port <= 0 {
		port = 161
	}
	version := r.olt.SNMPVersion
	if version == "" {
		version = "v2c"
	}

	params := &gosnmp.GoSNMP{
		Target:    r.olt.IPAddress,
		Port:      uint16(port),
		Timeout:   timeout,
		Retries:   1,
		Community: r.olt.SNMPCommunity,
		MaxOids:   60,
	}

	switch version {
	case "v3":
		authProto := gosnmp.MD5
		switch r.olt.SNMPAuthProtocol {
		case "SHA", "SHA1":
			authProto = gosnmp.SHA
		case "SHA224":
			authProto = gosnmp.SHA224
		case "SHA256":
			authProto = gosnmp.SHA256
		}
		privProto := gosnmp.DES
		switch r.olt.SNMPPrivProtocol {
		case "AES", "AES128":
			privProto = gosnmp.AES
		case "AES192":
			privProto = gosnmp.AES192
		case "AES256":
			privProto = gosnmp.AES256
		}
		params.Version = gosnmp.Version3
		params.SecurityModel = gosnmp.UserSecurityModel
		params.MsgFlags = gosnmp.AuthPriv
		params.SecurityParameters = &gosnmp.UsmSecurityParameters{
			UserName:                 r.olt.SNMPUsername,
			AuthenticationProtocol:   authProto,
			AuthenticationPassphrase: r.olt.SNMPAuthPassword,
			PrivacyProtocol:          privProto,
			PrivacyPassphrase:        r.olt.SNMPPrivPassword,
		}
	default:
		if params.Community == "" {
			params.Community = "public"
		}
		params.Version = gosnmp.Version2c
	}

	return params, nil
}

func (r *RealDriver) dial(ctx context.Context) (*gosnmp.GoSNMP, error) {
	params, err := r.params(3 * time.Second)
	if err != nil {
		return nil, err
	}
	if err := params.Connect(); err != nil {
		return nil, fmt.Errorf("failed to reach OLT %s: %w", r.olt.IPAddress, err)
	}
	return params, nil
}

func (r *RealDriver) Ping(ctx context.Context) (time.Duration, error) {
	start := time.Now()
	conn, err := r.dial(ctx)
	if err != nil {
		return 0, err
	}
	defer conn.Conn.Close()

	if _, err := conn.Get([]string{oidSysUpTime}); err != nil {
		return 0, err
	}
	return time.Since(start), nil
}

func (r *RealDriver) GetSystemInfo(ctx context.Context) (*domain.OLTSystemInfoDTO, error) {
	conn, err := r.dial(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Conn.Close()

	resp, err := conn.Get([]string{oidSysDescr, oidSysUpTime, oidSysName, oidSysLocation})
	if err != nil {
		return nil, fmt.Errorf("SNMP get failed: %w", err)
	}

	info := &domain.OLTSystemInfoDTO{
		Vendor:          r.olt.Vendor,
		Model:           r.olt.Model,
		SoftwareVersion: "N/A",
		Uptime:          "N/A",
	}
	for _, v := range resp.Variables {
		switch v.Name {
		case oidSysDescr:
			info.SoftwareVersion = snmpString(v.Value)
			if info.Model == "" {
				info.Model = info.SoftwareVersion
			}
		case oidSysUpTime:
			info.Uptime = formatTicks(snmpInt64(v.Value))
		}
	}
	return info, nil
}

func (r *RealDriver) DiscoverPorts(ctx context.Context) ([]domain.OLTPONInfoDTO, error) {
	profile, err := profileFor(r.olt)
	if err != nil {
		return nil, err
	}
	conn, err := r.dial(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Conn.Close()

	ports := []domain.OLTPONInfoDTO{}
	err = conn.Walk(profile.ponTableOID, func(pdu gosnmp.SnmpPDU) error {
		idx, parseErr := extractIndexes(profile.ponTableOID, pdu.Name)
		if parseErr != nil || len(idx) < 3 {
			return nil
		}
		ports = append(ports, domain.OLTPONInfoDTO{
			Frame:        idx[0],
			Slot:         idx[1],
			Port:         idx[2],
			OnboardedONT: 0,
			MaxONTs:      profile.maxONUs,
		})
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("SNMP walk of PON table failed: %w", err)
	}
	return ports, nil
}

func (r *RealDriver) DiscoverONUs(ctx context.Context, pon domain.OLTPONInfoDTO) ([]domain.ONTInfoDTO, error) {
	profile, err := profileFor(r.olt)
	if err != nil {
		return nil, err
	}
	conn, err := r.dial(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Conn.Close()

	serials := map[string]string{} // key f.s.p.i => serial
	rx := map[string]*float64{}
	tx := map[string]*float64{}
	temp := map[string]*float64{}
	status := map[string]string{}

	walk := func(root string, sadd func(key string, pdu gosnmp.SnmpPDU) error) error {
		return conn.Walk(root, func(pdu gosnmp.SnmpPDU) error {
			idx, perr := extractIndexes(root, pdu.Name)
			if perr != nil || len(idx) < 3 {
				return nil
			}
			if idx[0] != pon.Frame || idx[1] != pon.Slot || idx[2] != pon.Port {
				return nil
			}
			key := strconv.Itoa(idx[0]) + "." + strconv.Itoa(idx[1]) + "." + strconv.Itoa(idx[2]) + "." + strconv.Itoa(idx[3])
			return sadd(key, pdu)
		})
	}

	if err := walk(profile.onuSerialOID, func(key string, pdu gosnmp.SnmpPDU) error {
		serials[key] = snmpString(pdu.Value)
		return nil
	}); err != nil {
		return nil, fmt.Errorf("SNMP walk of ONU serials failed: %w", err)
	}
	if err := walk(profile.rxOID, func(key string, pdu gosnmp.SnmpPDU) error {
		if f, ok := snmpFloat(pdu.Value); ok {
			rx[key] = &f
		}
		return nil
	}); err != nil && len(serials) == 0 {
		return nil, err
	}
	if err := walk(profile.txOID, func(key string, pdu gosnmp.SnmpPDU) error {
		if f, ok := snmpFloat(pdu.Value); ok {
			tx[key] = &f
		}
		return nil
	}); err != nil {
		return nil, err
	}
	if err := walk(profile.tempOID, func(key string, pdu gosnmp.SnmpPDU) error {
		if f, ok := snmpFloat(pdu.Value); ok {
			temp[key] = &f
		}
		return nil
	}); err != nil {
		return nil, err
	}
	if err := walk(profile.statusOID, func(key string, pdu gosnmp.SnmpPDU) error {
		status[key] = snmpString(pdu.Value)
		return nil
	}); err != nil {
		return nil, err
	}

	onus := make([]domain.ONTInfoDTO, 0, len(serials))
	for key, serial := range serials {
		st := status[key]
		if st == "" {
			st = domain.ONUStatusUnknown
		}
		onus = append(onus, domain.ONTInfoDTO{
			SerialNumber: serial,
			RXPowerDB:    rx[key],
			TXPowerDB:    tx[key],
			TemperatureC: temp[key],
			Status:       normalizeONUStatus(st),
		})
	}
	return onus, nil
}

func (r *RealDriver) AuthorizeONU(ctx context.Context, serial string) error {
	// Hardware authorization (false ONU → true ONU / SN board entry) requires
	// vendor-specific SET OIDs that must be confirmed on-site for the target
	// firmware. Registration in Maxzone is the authoritative subscription link.
	conn, err := r.dial(ctx)
	if err != nil {
		return err
	}
	defer conn.Conn.Close()
	_ = conn
	return fmt.Errorf("SNMP hardware authorization for %s requires vendor CLI/SET OID; subscription was linked locally", serial)
}

func snmpInt64(v interface{}) int64 {
	switch t := v.(type) {
	case int:
		return int64(t)
	case int32:
		return int64(t)
	case int64:
		return t
	case uint:
		return int64(t)
	case uint32:
		return int64(t)
	case uint64:
		return int64(t)
	case float64:
		return int64(t)
	}
	return 0
}

func snmpFloat(v interface{}) (float64, bool) {
	switch t := v.(type) {
	case int:
		return float64(t), true
	case int32:
		return float64(t), true
	case int64:
		return float64(t), true
	case uint:
		return float64(t), true
	case uint32:
		return float64(t), true
	case uint64:
		return float64(t), true
	case float64:
		return t, true
	case []byte:
		f, err := strconv.ParseFloat(string(t), 64)
		return f, err == nil
	case string:
		f, err := strconv.ParseFloat(t, 64)
		return f, err == nil
	}
	return 0, false
}

func normalizeONUStatus(raw string) string {
	switch raw {
	case "1", "online", "Online", "ONLINE":
		return domain.ONUStatusOnline
	case "5", "offline", "Offline", "OFFLINE":
		return domain.ONUStatusOffline
	case "6", "los", "Los", "LOS":
		return domain.ONUStatusLOS
	}
	return domain.ONUStatusUnknown
}

func formatTicks(ticks int64) string {
	if ticks <= 0 {
		return "N/A"
	}
	secs := ticks / 100
	d := secs / 86400
	secs %= 86400
	h := secs / 3600
	secs %= 3600
	m := secs / 60
	s := secs % 60
	if d > 0 {
		return fmt.Sprintf("%dd %02d:%02d:%02d", d, h, m, s)
	}
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}