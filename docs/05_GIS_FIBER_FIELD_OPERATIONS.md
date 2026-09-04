# 05 — FTTH GIS Mapping & Field Technician Operations

## 1. FTTH Optical Network Hierarchy & Engineering Models

Maxzone models the physical fiber-to-the-home (FTTH) network hierarchy with complete optical loss awareness and GIS spatial coordinates.

```
┌───────────────────────────┐
│     Central Office        │
│   (OLT - Huawei/ZTE/VSOL) │
└─────────────┬─────────────┘
              │ Feeder Cable (12/24/48 Core)
              ▼
┌───────────────────────────┐
│     Primary Splitter      │  Loss: ~3.5 dB (1:2) or ~7.2 dB (1:4)
│      (Outdoor FDC)        │
└─────────────┬─────────────┘
              │ Distribution Cable (4/8/12 Core)
              ▼
┌───────────────────────────┐
│   TJ Box / 2nd Splitter   │  Loss: ~10.5 dB (1:8) or ~13.8 dB (1:16)
│   (Pole Mount / Building) │
└─────────────┬─────────────┘
              │ Drop Cable (1/2 Core Flat / Figure-8)
              ▼
┌───────────────────────────┐
│    Customer Premise       │  Expected Rx Power: -16 to -22 dBm
│     (ONU / Router)        │
└───────────────────────────┘
```

### 1.1 TIA-598-C Standard 12-Core Fiber Color Coding
Maxzone visually color-codes fiber cores and buffer tubes in the GIS diagram:

| Tube / Core # | Standard Color | Hex Code | Visual Badge |
| :---: | :--- | :--- | :--- |
| **1** | Blue | `#0000FF` | 🟦 Blue |
| **2** | Orange | `#FFA500` | 🟧 Orange |
| **3** | Green | `#008000` | 🟩 Green |
| **4** | Brown | `#8B4513` | 🟫 Brown |
| **5** | Slate / Gray | `#708090` | ◽ Slate |
| **6** | White | `#FFFFFF` | ⬜ White |
| **7** | Red | `#FF0000` | 🟥 Red |
| **8** | Black | `#000000` | ⬛ Black |
| **9** | Yellow | `#FFFF00` | 🟨 Yellow |
| **10** | Violet / Purple | `#EE82EE` | 🟪 Violet |
| **11** | Rose / Pink | `#FFC0CB` | 🌸 Rose |
| **12** | Aqua / Cyan | `#00FFFF` | 🔷 Aqua |

---

## 2. Interactive GIS Fiber Map Engine

Maxzone integrates **Leaflet / Mapbox** with **OpenStreetMap vector tiles** to deliver a responsive, fast optical network map inside the Super Admin and Field Tech portals.

### 2.1 Spatial Data & GeoJSON Structure
Coordinates are stored using PostGIS geometry points and linestrings:
- **Nodes**: OLTs, Primary Splitters, TJ Boxes, Poles, Customer Premise.
- **Edges**: Feeder Fiber, Distribution Fiber, Drop Lines.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [90.3994, 23.7771] },
      "properties": {
        "id": "tj-box-mirpur-04",
        "name": "TJ Box #04 - Mirpur 10",
        "type": "TJ_BOX",
        "splitter_ratio": "1:8",
        "total_ports": 8,
        "used_ports": 6,
        "available_ports": 2
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[90.3994, 23.7771], [90.4002, 23.7780]]
      },
      "properties": {
        "type": "DROP_CABLE",
        "core_count": 1,
        "color": "Aqua",
        "length_meters": 115,
        "customer_username": "john_p10"
      }
    }
  ]
}
```

### 2.2 Map Visual Layer Controls
- **Filter by OLT / PON Port**: Highlight only the optical path for a specific PON port (e.g. `OLT-01 PON 1/1`).
- **Signal Health Heatmap**: Customer nodes change color automatically based on live OLT SNMP dBm polling:
  - 🟢 **Green Pin**: Optimal Signal (`-15` to `-23 dBm`).
  - 🟡 **Yellow Pin**: High Loss Warning (`-24` to `-26 dBm`).
  - 🔴 **Red Pin**: Fiber Cut / Loss of Signal (`< -28 dBm` or `LOS`).
- **Cable Cut Fault Distance Locator (OTDR Simulation)**:
  - Lineman inputs optical fault distance from OTDR meter (e.g. `850 meters from Central Office`).
  - Maxzone calculates the exact GIS location along the feeder cable polyline and marks a blinking target with GPS coordinates: *"Probable Cut Location: Near Pole #42, Road 14"*.

---

## 3. Field Technician Mobile Portal & Operations

The Field Technician interface is built as a **Mobile-First Progressive Web App (PWA)** optimized for smartphones used outdoors by line crews.

```
┌────────────────────────────────────────┐
│ 📱 Maxzone Field Crew                  │
│                                        │
│  [ 📍 Find Nearest Available Box ]     │
│  Nearest: TJ-Box #12 (48m away, 3 free)│
│                                        │
│  [ ⚡ Live Signal Meter (dBm) ]         │
│  Current: -19.2 dBm [OPTIMAL] 🟢       │
│                                        │
│  [ 📷 QR / Barcode ONU Activation ]    │
│  Scan ONU SN -> HWTC12345678           │
│  Customer: Karim Ahmed (PPPoE: karim9) │
│  [ AUTHORIZE & ACTIVATE ON OLT ]       │
│                                        │
│  📋 Today's Work Orders (3 Pending)    │
│  1. Splicing Cut at Sector 4           │
│  2. New Connection - House 12, Rd 5    │
└────────────────────────────────────────┘
```

### 3.1 Key Field Technician Workflows
1. **Find Nearest Box**: Uses device GPS location (`navigator.geolocation`) and PostgreSQL PostGIS `ST_DWithin` query to list all TJ boxes within a 300-meter radius, showing available port capacity.
2. **Instant Signal Test**: Connects customer ONU to the drop wire, enters customer username or ONU MAC, and hits "Test Signal". The Go backend queries the OLT via SNMP in under 1 second and displays:
   - **Rx Power**: `-18.8 dBm` (Pass)
   - **Tx Power**: `2.3 dBm` (Pass)
   - **Distance**: `412 meters`
3. **One-Click Installation Handover**:
   - Uploads a photo of the installed optical box and customer router.
   - Captures customer digital signature on the touchscreen.
   - Marks the support ticket as `RESOLVED`.
   - Maxzone immediately dispatches a welcome SMS and activates billing.
