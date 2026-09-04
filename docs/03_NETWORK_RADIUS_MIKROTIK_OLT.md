# 03 — Network, RADIUS, MikroTik & OLT Integration

## 1. MikroTik RouterOS v6 & v7 Driver Engine

Maxzone connects to MikroTik Cloud Core Routers (CCR) and RouterBOARD devices using either the **MikroTik RouterOS API (Ports 8728 / 8729 TLS)** or the **RouterOS v7 REST API**.

### 1.1 Hardware Abstraction & Simulation Mode (Critical for AI Agents & Dev)
To ensure AI coding agents and developers can build, run, and test the entire system without requiring physical MikroTik CCR hardware attached to their local environment, Maxzone implements a strict **Driver Interface Pattern**:

```go
// RouterOSDriver abstracts real and simulated RouterOS devices
type RouterOSDriver interface {
    Ping(ctx context.Context) (time.Duration, error)
    GetSystemResource(ctx context.Context) (*SystemResourceDTO, error)
    GetActiveSessions(ctx context.Context) ([]ActiveSessionDTO, error)
    CreatePPPoEServer(ctx context.Context, cfg PPPoEServerConfig) error
    SetAddressList(ctx context.Context, listName string, ip string, comment string) error
    RemoveAddressList(ctx context.Context, listName string, ip string) error
}
```

- **Production Mode (`is_simulated = false`)**: Uses `github.com/go-routeros/routeros/v3` or native API socket connection with connection pooling and timeouts.
- **Simulation Mode (`is_simulated = true` or `MIKROTIK_SIMULATION_MODE=true`)**: Returns realistic synthetic hardware metrics (CPU: 12%, Memory: 420MB / 2048MB, Uptime: 45 days, 5 active simulated sessions, Ping: 1.2ms). This allows all UI graphs, tables, and test cases to run smoothly in browser verification.

### 1.2 Connection Pooling & Resilience
Network connections to edge routers must never block HTTP API requests. The Go backend implements a persistent connection pool:
- Max Idle Connections: 5
- Max Active Connections: 20
- Connect Timeout: 3 seconds
- Read/Write Timeout: 5 seconds

### 1.3 RouterOS Automated Configuration Script
When an administrator registers a new MikroTik NAS in Maxzone, the system can automatically configure it for Maxzone RADIUS and PPPoE with one click:

```routeros
# 1. Configure RADIUS Client
/radius add service=ppp,hotspot address=10.0.0.1 secret="YOUR_ENCRYPTED_SECRET" authentication-port=1812 accounting-port=1813 timeout=3000ms

# 2. Enable RADIUS for PPP (PPPoE)
/ppp aaa set use-radius=yes accounting=yes interim-update=5m

# 3. Enable CoA / Disconnect-Request (RFC 3576)
/radius incoming set accept=yes port=3799

# 4. Configure Firewall Address-Lists for Expired / Grace Users
/ip firewall address-list add list=expired_users address=0.0.0.0/0 comment="Auto-managed by Maxzone"
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80,443 src-address-list=expired_users action=redirect to-ports=8080 comment="Redirect to Maxzone Payment Portal"
```

### 1.4 Rate-Limit Format & Queue Tree / PCQ Shaping
Maxzone generates standard MikroTik rate-limiting strings applied through RADIUS `Mikrotik-Rate-Limit` or API `/queue/simple`:

```
Format:
<rx-rate>/<tx-rate> [<rx-burst-rate>/<tx-burst-rate>] [<rx-burst-threshold>/<tx-burst-threshold>] [<rx-burst-time>/<tx-burst-time>] [<priority>] [<rx-rate-min>/<tx-rate-min>]

Example for 20Mbps Package with 30Mbps Burst for 10 seconds:
20M/20M 30M/30M 15M/15M 10/10 8 10M/10M
```

---

## 2. FreeRADIUS 3.x AAA & CoA (RFC 3576 / RFC 5176) Engine

### 2.1 FreeRADIUS SQL Configuration & Client Sync
Maxzone interfaces with FreeRADIUS 3.x using the PostgreSQL `sql` module.
- `nas`: Authorized client table. **Crucial Rule**: Whenever an entry is created or modified in `nas_routers`, Maxzone's repository automatically synchronizes the corresponding entry in the FreeRADIUS `nas` table (`nasname = ip_address, secret = radius_secret`).
- `radcheck`: Stores subscriber credentials (`Cleartext-Password` or `MD5-Password`).
- `radreply`: Injects session parameters when the subscriber authenticates:
  - `Framed-Protocol = PPP`
  - `Framed-IP-Address` (if static IP is assigned)
  - `Mikrotik-Rate-Limit = "20M/20M"`
  - `Mikrotik-Address-List = "active_users"` (or `"grace_users"`)
  - `Session-Timeout = 86400`
  - `Acct-Interim-Interval = 300` (sends accounting packet every 5 minutes)
- `radacct`: Captures real-time session starts, stops, upload/download octets, and calling station MAC address.

### 2.2 Instant Session Termination via CoA / Disconnect-Request
When a customer pays their bill, changes packages, or their grace period expires, Maxzone sends an instant UDP Disconnect-Request packet (RFC 3576) to the MikroTik NAS on port 3799.

```go
// Go RADIUS CoA Packet Generator (Airtight, Agent-Proof Implementation)
package radius

import (
    "context"
    "errors"
    "fmt"
    "net"
    "time"

    "layeh.com/radius"
    "layeh.com/radius/rfc2865"
)

// RFC 3576 Disconnect Packet Code
const CodeDisconnectRequest radius.Code = 40
const CodeDisconnectACK radius.Code = 41
const CodeDisconnectNAK radius.Code = 42

func SendDisconnectRequest(nasIP string, coaPort int, secret string, username string, framedIP net.IP, isSimulated bool) error {
    if isSimulated {
        // In simulation mode, immediately succeed and log
        fmt.Printf("[SIMULATOR] Disconnect-Request dispatched for user %s on NAS %s:%d\n", username, nasIP, coaPort)
        return nil
    }

    packet := radius.New(CodeDisconnectRequest, []byte(secret))
    if err := rfc2865.UserName_SetString(packet, username); err != nil {
        return fmt.Errorf("failed to set UserName: %w", err)
    }
    if framedIP != nil {
        if err := rfc2865.FramedIPAddress_Set(packet, framedIP); err != nil {
            return fmt.Errorf("failed to set FramedIPAddress: %w", err)
        }
    }

    // Correct integer to port string conversion
    targetAddr := net.JoinHostPort(nasIP, fmt.Sprintf("%d", coaPort))
    
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    response, err := radius.Exchange(ctx, packet, targetAddr)
    if err != nil {
        return fmt.Errorf("radius exchange error with NAS %s: %w", targetAddr, err)
    }
    if response.Code != CodeDisconnectACK {
        return fmt.Errorf("received non-ACK (%d) from NAS %s", response.Code, targetAddr)
    }

    return nil
}
```

---

## 3. OLT & PON Management Driver (SNMP & CLI)

Maxzone communicates with Optical Line Terminals (OLTs) via **SNMP v2c/v3** for telemetry and **Telnet/SSH** for provisioning commands.

### 3.1 Hardware Abstraction & OLT Simulation Mode
Just like MikroTik, OLT communication is backed by an `OLTDriver` interface:

```go
type OLTDriver interface {
    GetSystemInfo(ctx context.Context) (*OLTSystemInfoDTO, error)
    GetPONPortStatus(ctx context.Context, portNumber string) (*PONPortStatusDTO, error)
    GetONUSignal(ctx context.Context, ponPort string, onuID int) (*ONUSignalDTO, error)
    GetDiscoveredONUs(ctx context.Context) ([]DiscoveredONUDTO, error)
    AuthorizeONU(ctx context.Context, req AuthorizeONURequest) error
}
```

- When `is_simulated = true` or `OLT_SIMULATION_MODE=true`, the driver returns realistic optical signals (e.g. `-19.2 dBm`, Tx `2.1 dBm`, distance `340m`) and mock discovered ONUs so field tech and admin UIs can be tested 100% offline.

### 3.2 Supported OLT Vendors
- **Huawei** (SmartAX MA5608T, MA5800-X2 / X7 / X15)
- **ZTE** (C300, C320, C600 series)
- **VSOL** (V1600D, V1600G EPON & GPON series)
- **BDCOM** (GP3600, P3600 EPON / GPON)
- **C-Data** (FD1104, FD1208, FD1608 series)
- **Fiberhome** (AN5516-01 / AN5516-06)

### 3.3 Key SNMP OIDs for Optical Telemetry

| Parameter | Vendor | Base SNMP OID | Description / Formula |
| :--- | :--- | :--- | :--- |
| **ONU Rx Optical Power** | Huawei | `1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4` | Value in `0.01 dBm` (divide by 100) |
| **ONU Tx Optical Power** | Huawei | `1.3.6.1.4.1.2011.6.128.1.1.2.51.1.6` | Value in `0.01 dBm` |
| **ONU Rx Power** | ZTE GPON | `1.3.6.1.4.1.3902.1082.500.10.2.3.9` | Value in `0.002 dBm` - 30 |
| **ONU Rx Power** | VSOL | `1.3.6.1.4.1.37950.1.1.5.12.2.1.8` | Value in `0.1 dBm` (divide by 10) |
| **ONU Rx Power** | BDCOM | `1.3.6.1.4.1.3320.101.10.5.1.5` | Optical power in `0.1 dBm` |
| **ONU Status** | Standard | `1.3.6.1.4.1.2011.6.128.1.1.2.46.1.15` | `1=Online`, `2=Offline`, `3=LOS`, `4=DyingGasp` |
| **ONU Distance (RTT)** | Huawei | `1.3.6.1.4.1.2011.6.128.1.1.2.46.1.20` | Fiber loop distance in meters |

### 3.4 Optical Power Signal Health Matrix

| Signal Range (dBm) | Status Badge | Meaning & Field Action Required |
| :--- | :--- | :--- |
| **`-15.0 dBm` to `-23.9 dBm`** | 🟢 **OPTIMAL** | Perfect fiber splicing and low optical loss. No action needed. |
| **`-24.0 dBm` to `-26.9 dBm`** | 🟡 **WARNING** | High attenuation. Minor fiber micro-bend or dirty connector. |
| **`-27.0 dBm` to `-29.9 dBm`** | 🟠 **CRITICAL** | Subscriber experiencing packet drop; splice inspection needed. |
| **`< -30.0 dBm` or LOS** | 🔴 **DOWN / LOS** | Loss of Signal. Fiber cut or optical patch cord disconnected. |

### 3.5 Unregistered ONU Auto-Discovery & One-Click Activation
Maxzone runs an asynchronous background worker that scans OLT PON ports for unassigned ONUs.
When a new customer connects their modem:
1. The OLT detects an unconfigured serial number (e.g. `HWTC-12345678`).
2. Maxzone displays an alert in the **Field Tech Mobile App** and **Super Admin NOC**: *"New ONU discovered on OLT-01 PON 0/1/2"*.
3. The technician clicks **"Assign to Customer"**, selects the customer name, and Maxzone sends the CLI profile configuration command to the OLT to register the ONU immediately.
