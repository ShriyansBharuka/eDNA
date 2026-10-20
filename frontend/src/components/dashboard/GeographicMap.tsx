import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getDistribution } from "../../api/client";
import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";
import type { OccurrencePoint } from "../../api/types";

// Dark Theme Leaflet Custom Marker Icons
const occurrenceIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:12px;height:12px;border-radius:50%;background:#38bdf8;box-shadow:0 0 10px 3px rgba(56,189,248,0.85);border:1.5px solid white"></span>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const sampleIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:#f472b6;box-shadow:0 0 16px 5px rgba(244,114,182,0.9);border:2.5px solid white"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Marker for an unmatched read located from the Discovered section.
const unmatchedIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:22px;height:22px;border-radius:50%;background:rgba(244,114,182,0.25);border:2px solid #f472b6;box-shadow:0 0 20px 8px rgba(244,114,182,0.85)"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Fetch Live GBIF API Occurrence Records with Fallback to Backend Stub
async function fetchOccurrences(speciesName: string): Promise<{ points: OccurrencePoint[]; source: "GBIF Live API" | "Backend Database" }> {
  try {
    const gbifUrl = `https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(
      speciesName
    )}&hasCoordinate=true&limit=75`;
    const res = await fetch(gbifUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const points: OccurrencePoint[] = data.results
          .filter((item: any) => typeof item.decimalLatitude === "number" && typeof item.decimalLongitude === "number")
          .map((item: any) => ({
            lat: item.decimalLatitude,
            lon: item.decimalLongitude,
          }));

        if (points.length > 0) {
          return { points, source: "GBIF Live API" };
        }
      }
    }
  } catch (err) {
    console.warn("GBIF API live query fallback to backend:", err);
  }

  // Fallback to local backend route if GBIF API has zero results or fails
  const localRes = await getDistribution(speciesName);
  return { points: localRes.occurrence_points, source: "Backend Database" };
}

export default function GeographicMap() {
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const mapFocus = useAppStore((s) => s.mapFocus);
  const sampleLocation = useAppStore((s) => s.sampleLocation);

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const sampleMarkerRef = useRef<L.Marker | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const focusMarkerRef = useRef<L.Marker | null>(null);

  const [dataSourceInfo, setDataSourceInfo] = useState<string>("Sourced from Live GBIF API & OpenStreetMap Tiles");

  // Initialize Dark Theme Map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, { scrollWheelZoom: false }).setView(
      [sampleLocation.lat, sampleLocation.lon],
      4
    );

    // Watermark-free Dark Ocean Canvas (Esri) by default; CartoDB if an API key is provided
    const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
    if (cartoKey) {
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
        subdomains: "abcd",
      }).addTo(map);
    } else {
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
          maxZoom: 16,
        }
      ).addTo(map);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxZoom: 16,
        }
      ).addTo(map);
    }

    // Initial Sample Location Pin
    const sampleMarker = L.marker([sampleLocation.lat, sampleLocation.lon], { icon: sampleIcon })
      .bindPopup(sampleLocation.label)
      .addTo(map);
    sampleMarkerRef.current = sampleMarker;

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Sample Location Marker Dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (sampleMarkerRef.current) {
      sampleMarkerRef.current.setLatLng([sampleLocation.lat, sampleLocation.lon]);
      sampleMarkerRef.current.setPopupContent(sampleLocation.label);
    } else {
      sampleMarkerRef.current = L.marker([sampleLocation.lat, sampleLocation.lon], { icon: sampleIcon })
        .bindPopup(sampleLocation.label)
        .addTo(map);
    }
  }, [sampleLocation]);

  // Fetch & Plot Occurrence Points (Live GBIF API with Fallback)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSpecies) return;
    let cancelled = false;

    fetchOccurrences(selectedSpecies).then(({ points, source }) => {
      if (cancelled || !mapRef.current) return;

      setDataSourceInfo(`Live records for ${selectedSpecies} via ${source}`);

      clusterRef.current?.clearLayers();
      clusterRef.current?.remove();

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40,
      });

      points.forEach((p) => {
        L.marker([p.lat, p.lon], { icon: occurrenceIcon })
          .bindPopup(`<strong>${selectedSpecies}</strong><br/>Recorded sighting (${p.lat.toFixed(3)}°, ${p.lon.toFixed(3)}°)`)
          .addTo(cluster);
      });

      cluster.addTo(mapRef.current);
      clusterRef.current = cluster;

      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number])).extend([
          sampleLocation.lat,
          sampleLocation.lon,
        ]);
        mapRef.current.fitBounds(bounds.pad(0.3), { maxZoom: 7 });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSpecies, sampleLocation]);

  // "Locate on map" from Discovered Reads section: fly to coordinate
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapFocus) return;

    focusMarkerRef.current?.remove();
    const marker = L.marker([mapFocus.lat, mapFocus.lon], { icon: unmatchedIcon })
      .bindPopup(`Unmatched read &bull; ${mapFocus.label}`)
      .addTo(map);
    focusMarkerRef.current = marker;

    map.flyTo([mapFocus.lat, mapFocus.lon], 7, { duration: 1.2 });
    marker.openPopup();
  }, [mapFocus]);

  return (
    <section id="distribution" className="scroll-mt-28 w-full max-w-[80vw] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="font-display text-2xl font-semibold text-glow">Geographic Distribution</h3>
          <p className="text-xs text-slate-400 mt-1">
            Interactive map displaying eDNA sample site &amp; species occurrence records
          </p>
        </div>

        {/* Live Data Badge */}
        <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full self-start sm:self-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          {selectedSpecies ? `Showing: ${selectedSpecies}` : "Select a species above"}
        </span>
      </div>

      <GlassPanel shape="round" hover={false} className="p-4 md:p-6">
        {!selectedSpecies && (
          <p className="text-slate-400 text-xs mb-3 flex items-center gap-2">
            💡 Select any species from the list above to query live GBIF global occurrence records and plot them here.
          </p>
        )}
        <div ref={mapElRef} className="h-[440px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-inner" />
        <p className="mt-3 text-xs text-slate-400 flex items-center justify-between gap-2 flex-wrap">
          <span>{dataSourceInfo}</span>
          <span className="text-[11px] text-slate-500">
            &bull; {import.meta.env.VITE_CARTO_API_KEY ? "CartoDB Dark Matter Tiles" : "Esri Dark Canvas Tiles"}
          </span>
        </p>
      </GlassPanel>
    </section>
  );
}
