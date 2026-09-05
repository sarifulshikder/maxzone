-- ==============================================================================
-- Phase 7 Migration: FTTH GIS Fiber Map & Field Technician Portal
-- ==============================================================================

-- 1. PostGIS spatial extension (provided by postgis/postgis image)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ------------------------------------------------------------------------------
-- 2. OLT geo-anchoring: add coordinates to existing olts table + generated
--    geometry column so the Central Office renders on the fiber map.
-- ------------------------------------------------------------------------------
ALTER TABLE olts ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE olts ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE olts ADD COLUMN IF NOT EXISTS location geometry(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;
CREATE INDEX IF NOT EXISTS idx_olts_location ON olts USING GIST (location);

-- ------------------------------------------------------------------------------
-- 3. Primary Optical Splitters
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS splitters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(40) NOT NULL,                       -- 'SP-01'
    split_ratio VARCHAR(20) DEFAULT '1:8',           -- '1:8', '1:16'
    ports_used INT NOT NULL DEFAULT 0,
    max_ports INT NOT NULL DEFAULT 8,
    address TEXT,
    needs_service BOOLEAN DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location geometry(Point, 4326) GENERATED ALWAYS AS
        (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_splitters_location ON splitters USING GIST (location);

-- ------------------------------------------------------------------------------
-- 4. TJ (Termination Junction) Drop Boxes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tj_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(40) NOT NULL,                       -- 'TJ-04'
    box_number INT NOT NULL,                         -- '04'
    ports_used INT NOT NULL DEFAULT 0,
    max_ports INT NOT NULL DEFAULT 8,
    address TEXT,
    needs_service BOOLEAN DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location geometry(Point, 4326) GENERATED ALWAYS AS
        (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tj_boxes_location ON tj_boxes USING GIST (location);

-- ------------------------------------------------------------------------------
-- 5. Fiber Cables (TIA-598 color-coded polylines)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiber_cables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    cable_type VARCHAR(20) NOT NULL DEFAULT 'DISTRIBUTION', -- 'FEEDER'|'DISTRIBUTION'|'DROP'
    core_count INT NOT NULL DEFAULT 12,
    jacket_color VARCHAR(20) NOT NULL DEFAULT 'ORANGE',      -- TIA-598: BLUE/ORANGE/GREEN/...
    from_node VARCHAR(100),                                  -- 'CO-01', 'SP-01', 'TJ-04'
    to_node VARCHAR(100),
    latitude_start DOUBLE PRECISION,
    longitude_start DOUBLE PRECISION,
    latitude_end DOUBLE PRECISION,
    longitude_end DOUBLE PRECISION,
    path geometry(LineString, 4326) GENERATED ALWAYS AS (
        ST_GeomFromText('LINESTRING(' || longitude_start || ' ' || latitude_start ||
                        ',' || longitude_end || ' ' || latitude_end || ')', 4326)
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fiber_cables_path ON fiber_cables USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_fiber_cables_jacket ON fiber_cables(jacket_color);

-- ------------------------------------------------------------------------------
-- 6. Individual Fiber Cores within a cable
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiber_cores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cable_id UUID NOT NULL REFERENCES fiber_cables(id) ON DELETE CASCADE,
    core_index INT NOT NULL,
    core_color VARCHAR(20) NOT NULL,                 -- TIA-598 per-strand color
    is_used BOOLEAN DEFAULT FALSE,
    onu_id UUID REFERENCES onus(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cable_id, core_index)
);
CREATE INDEX IF NOT EXISTS idx_fiber_cores_cable ON fiber_cores(cable_id);

-- ==============================================================================
-- 7. SEED DEMO NETWORK  (Dhaka Motijheel area — 23.7330N 90.4170E)
--    Matches the Phase 7 walkthrough: Box #04 = 6/8 used, ~48m from Tech.
-- ==============================================================================

-- Anchor the existing OLT row(s) on the Central Office location
UPDATE olts SET latitude = 23.7330, longitude = 90.4170 WHERE latitude IS NULL;

-- Splitters
INSERT INTO splitters (id, name, code, split_ratio, ports_used, max_ports, address, needs_service, latitude, longitude) VALUES
    ('b1000000-0000-0000-0000-000000000001', 'Primary Splitter 01', 'SP-01', '1:8',  6, 8, 'Motijheel, Dhaka 1st Floor',  FALSE, 23.73305, 90.41710),
    ('b1000000-0000-0000-0000-000000000002', 'Primary Splitter 02', 'SP-02', '1:8',  7, 8, 'Motijheel, Dhaka 2nd Floor',  TRUE,  23.73295, 90.41690),
    ('b1000000-0000-0000-0000-000000000003', 'Primary Splitter 03', 'SP-03', '1:8',  5, 8, 'Motijheel, Dhaka 3rd Floor',  FALSE, 23.73310, 90.41705);

-- TJ Drop Boxes
INSERT INTO tj_boxes (id, name, code, box_number, ports_used, max_ports, address, needs_service, latitude, longitude) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'TJ Box #01', 'TJ-01', 1, 7, 8, 'Building 12, Motijheel', FALSE, 23.73200, 90.41750),
    ('c1000000-0000-0000-0000-000000000002', 'TJ Box #02', 'TJ-02', 2, 4, 8, 'Building 08, Motijheel', TRUE,  23.73250, 90.41630),
    ('c1000000-0000-0000-0000-000000000003', 'TJ Box #03', 'TJ-03', 3, 5, 8, 'Building 05, Motijheel', FALSE, 23.73360, 90.41760),
    ('c1000000-0000-0000-0000-000000000004', 'TJ Box #04', 'TJ-04', 4, 6, 8, 'Building 04, Motijheel', FALSE, 23.73343, 90.41698),
    ('c1000000-0000-0000-0000-000000000005', 'TJ Box #05', 'TJ-05', 5, 3, 8, 'Building 21, Motijheel', FALSE, 23.73360, 90.41630),
    ('c1000000-0000-0000-0000-000000000006', 'TJ Box #06', 'TJ-06', 6, 6, 8, 'Building 31, Motijheel', FALSE, 23.73230, 90.41680);

-- Fiber Cables (TIA-598 jacket colors)
-- Feeder: CO -> Primary Splitters (ORANGE)
INSERT INTO fiber_cables (id, name, cable_type, core_count, jacket_color, from_node, to_node,
                          latitude_start, longitude_start, latitude_end, longitude_end) VALUES
    ('d1000000-0000-0000-0000-000000000001', 'FEEDER-CO-SP01', 'FEEDER', 12, 'ORANGE', 'CO', 'SP-01', 23.73300, 90.41700, 23.73305, 90.41710),
    ('d1000000-0000-0000-0000-000000000002', 'FEEDER-CO-SP02', 'FEEDER', 12, 'ORANGE', 'CO', 'SP-02', 23.73300, 90.41700, 23.73295, 90.41690),
    ('d1000000-0000-0000-0000-000000000003', 'FEEDER-CO-SP03', 'FEEDER', 12, 'ORANGE', 'CO', 'SP-03', 23.73300, 90.41700, 23.73310, 90.41705);

-- Distribution: SP-01 -> TJ boxes (BLUE)
INSERT INTO fiber_cables (id, name, cable_type, core_count, jacket_color, from_node, to_node,
                          latitude_start, longitude_start, latitude_end, longitude_end) VALUES
    ('d1000000-0000-0000-0000-000000000004', 'DIST-SP01-TJ01', 'DISTRIBUTION', 8, 'BLUE', 'SP-01', 'TJ-01', 23.73305, 90.41710, 23.73200, 90.41750),
    ('d1000000-0000-0000-0000-000000000005', 'DIST-SP01-TJ04', 'DISTRIBUTION', 8, 'BLUE', 'SP-01', 'TJ-04', 23.73305, 90.41710, 23.73343, 90.41698);

-- Distribution: SP-02 -> TJ boxes (GREEN)
INSERT INTO fiber_cables (id, name, cable_type, core_count, jacket_color, from_node, to_node,
                          latitude_start, longitude_start, latitude_end, longitude_end) VALUES
    ('d1000000-0000-0000-0000-000000000006', 'DIST-SP02-TJ02', 'DISTRIBUTION', 8, 'GREEN', 'SP-02', 'TJ-02', 23.73295, 90.41690, 23.73250, 90.41630),
    ('d1000000-0000-0000-0000-000000000007', 'DIST-SP02-TJ05', 'DISTRIBUTION', 8, 'GREEN', 'SP-02', 'TJ-05', 23.73295, 90.41690, 23.73360, 90.41630);

-- Distribution: SP-03 -> TJ boxes (BROWN)
INSERT INTO fiber_cables (id, name, cable_type, core_count, jacket_color, from_node, to_node,
                          latitude_start, longitude_start, latitude_end, longitude_end) VALUES
    ('d1000000-0000-0000-0000-000000000008', 'DIST-SP03-TJ03', 'DISTRIBUTION', 8, 'BROWN', 'SP-03', 'TJ-03', 23.73310, 90.41705, 23.73360, 90.41760),
    ('d1000000-0000-0000-0000-000000000009', 'DIST-SP03-TJ06', 'DISTRIBUTION', 8, 'BROWN', 'SP-03', 'TJ-06', 23.73310, 90.41705, 23.73230, 90.41680);

-- Fiber cores for the Box #04 distribution link (8 cores, 6 used)
INSERT INTO fiber_cores (id, cable_id, core_index, core_color, is_used) VALUES
    ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000005', 1, 'BLUE',   TRUE),
    ('e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000005', 2, 'ORANGE', TRUE),
    ('e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005', 3, 'GREEN',  TRUE),
    ('e1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000005', 4, 'BROWN',  TRUE),
    ('e1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 5, 'SLATE',  TRUE),
    ('e1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000005', 6, 'WHITE',  TRUE),
    ('e1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000005', 7, 'BLACK',  FALSE),
    ('e1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000005', 8, 'YELLOW', FALSE);