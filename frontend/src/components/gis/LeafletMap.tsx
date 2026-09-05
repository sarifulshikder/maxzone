"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMapType } from "leaflet";
import {
  GISOLT,
  GISSplitter,
  GISTJBox,
  GISFiberCable,
} from "@/types";

// TIA-598 standard fiber jacket colors (hex approximations)
export const TIA598_COLORS: Record<string, string> = {
  BLUE: "#1460C8",
  ORANGE: "#FF7900",
  GREEN: "#00A94F",
  BROWN: "#87582B",
  SLATE: "#A8AAAD",
  WHITE: "#F5F5F5",
  RED: "#DB0019",
  BLACK: "#000000",
  YELLOW: "#FFE900",
  VIOLET: "#7D4394",
  ROSE: "#F02D7D",
  AQUA: "#03D8E8",
};

const JACKET_FALLBACK = "#A8AAAD";

interface LeafletMapProps {
  olts: GISOLT[];
  splitters: GISSplitter[];
  boxes: GISTJBox[];
  cables: GISFiberCable[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  onBoxPopup?: (box: GISTJBox) => void;
}

export default function LeafletMap({
  olts,
  splitters,
  boxes,
  cables,
  height = "100%",
  center = [23.733, 90.417],
  zoom = 15,
  onBoxPopup,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let mapInstance: LeafletMapType | null = null;

    const bindLeaflet = async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom);
      mapInstance = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // --- Central Office OLTs ---
      olts.forEach(olt => {
        if (olt.latitude == null || olt.longitude == null) return;
        L.marker([olt.latitude, olt.longitude], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#10b981,#2dd4bf);border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#04140c;font-family:monospace;box-shadow:0 2px 8px rgba(0,0,0,.6)">CO</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).bindPopup(
          `<b style="color:#0f172a">Central Office OLT</b><br/><span style="font-family:monospace">${olt.name}</span><br/>${olt.vendor} ${olt.model}<br/><span style="color:${olt.last_status === "ONLINE" ? "#059669" : "#dc2626"}">${olt.last_status}</span>`
        ).addTo(map);
      });

      // --- Splitters ---
      splitters.forEach(sp => {
        if (sp.latitude == null || sp.longitude == null) return;
        const needsService = sp.needs_service;
        L.circleMarker([sp.latitude, sp.longitude], {
          radius: 9,
          color: "#ffffff",
          weight: 1,
          fillColor: needsService ? "#f59e0b" : "#f59e0b",
          fillOpacity: 0.95,
        })
          .bindPopup(
            `<b style="color:#0f172a">${sp.name}</b><br/><span style="font-family:monospace">${sp.code}</span><br/>Splitter ${sp.split_ratio}<br/>${sp.ports_used}/${sp.max_ports} ports used, ${sp.available} available${needsService ? "<br/><span style='color:#b45309'>⚠ needs service</span>" : ""}${sp.address ? `<br/><small>${sp.address}</small>` : ""}`
          )
          .addTo(map);
      });

      // --- TJ Boxes ---
      boxes.forEach(bx => {
        if (bx.latitude == null || bx.longitude == null) return;
        const free = bx.available;
        const color = bx.needs_service ? "#f59e0b" : free > 0 ? "#38bdf8" : "#f43f5e";
        L.circleMarker([bx.latitude, bx.longitude], {
          radius: 8,
          color: "#ffffff",
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.95,
        })
          .bindPopup(
            `<b style="color:#0f172a">${bx.name}</b><br/><span style="font-family:monospace">${bx.code}</span><br/>${bx.ports_used}/${bx.max_ports} ports used, ${free} available${bx.address ? `<br/><small>${bx.address}</small>` : ""}`
          )
          .addTo(map)
          .on("popupopen", () => onBoxPopup?.(bx));
      });

      // --- Fiber cables (TIA-598 colored polylines) ---
      cables.forEach(cable => {
        const color = TIA598_COLORS[cable.jacket_color] || JACKET_FALLBACK;
        L.polyline(
          [
            [cable.from[0], cable.from[1]],
            [cable.to[0], cable.to[1]],
          ],
          {
            color,
            weight: cable.cable_type === "FEEDER" ? 4 : 3,
            opacity: 0.9,
            dashArray: cable.cable_type === "DISTRIBUTION" ? "6 6" : undefined,
          }
        )
          .bindTooltip(
            `${cable.name}<br/><span style="font-family:monospace">${cable.jacket_color}</span> • ${cable.core_count} cores`
          )
          .addTo(map);
      });

      // Fit to bounds so the whole fiber spine is visible
      setTimeout(() => {
        if (!disposed) map.invalidateSize();
      }, 50);
    };

    bindLeaflet().catch(err => console.error("Leaflet init error", err));

    return () => {
      disposed = true;
      if (mapInstance) {
        setTimeout(() => mapInstance?.remove(), 0);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olts, splitters, boxes, cables, center[0], center[1], zoom]);

  return <div ref={containerRef} style={{ height, width: "100%", zIndex: 0 }} className="rounded-2xl overflow-hidden" />;
}