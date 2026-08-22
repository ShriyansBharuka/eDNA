import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getDistribution } from "../../api/client";
import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";

// MOCK — none of the 6 stub endpoints in backend/main.py return the current
// sample's own collection coordinates (schema.sql has samples.collection_lat
// /collection_lon, but no route surfaces them yet). Swap for the real value
// once /samples/{id}/results (or a dedicated route) exposes it.
const MOCK_SAMPLE_LOCATION = { lat: 15.5, lon: 73.8, label: "This sample (demo location, Goa coast)" };

const occurrenceIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:10px;height:10px;border-radius:50%;background:#38bdf8;box-shadow:0 0 6px 2px rgba(56,189,248,0.7);border:1px solid rgba(255,255,255,0.85)"></span>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const sampleIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#f472b6;box-shadow:0 0 12px 4px rgba(244,114,182,0.85);border:2px solid white"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Marker for an unmatched read located from the Discovered section.
const unmatchedIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:20px;height:20px;border-radius:50%;background:rgba(244,114,182,0.25);border:2px solid #f472b6;box-shadow:0 0 18px 6px rgba(244,114,182,0.7)"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function GeographicMap() {
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const mapFocus = useAppStore((s) => s.mapFocus);
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const focusMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, { scrollWheelZoom: false }).setView(
      [MOCK_SAMPLE_LOCATION.lat, MOCK_SAMPLE_LOCATION.lon],
      3
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    L.marker([MOCK_SAMPLE_LOCATION.lat, MOCK_SAMPLE_LOCATION.lon], { icon: sampleIcon })
      .bindPopup(MOCK_SAMPLE_LOCATION.label)
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSpecies) return;
    let cancelled = false;

    getDistribution(selectedSpecies).then((res) => {
      if (cancelled || !mapRef.current) return;

      clusterRef.current?.clearLayers();
      clusterRef.current?.remove();

      const cluster = L.markerClusterGroup();
      res.occurrence_points.forEach((p) => {
        L.marker([p.lat, p.lon], { icon: occurrenceIcon })
          .bindPopup(res.species)
          .addTo(cluster);
      });
      cluster.addTo(mapRef.current);
      clusterRef.current = cluster;

      if (res.occurrence_points.length > 0) {
        const bounds = L.latLngBounds(
          res.occurrence_points.map((p) => [p.lat, p.lon] as [number, number])
        ).extend([MOCK_SAMPLE_LOCATION.lat, MOCK_SAMPLE_LOCATION.lon]);
        mapRef.current.fitBounds(bounds.pad(0.5), { maxZoom: 6 });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSpecies]);

  // "Locate on map" from the Discovered section: drop a highlighted marker on
  // the unmatched read's collection point and fly to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapFocus) return;

    focusMarkerRef.current?.remove();
    const marker = L.marker([mapFocus.lat, mapFocus.lon], { icon: unmatchedIcon })
      .bindPopup(`Unmatched read · ${mapFocus.label}`)
      .addTo(map);
    focusMarkerRef.current = marker;

    map.flyTo([mapFocus.lat, mapFocus.lon], 7, { duration: 1.1 });
    marker.openPopup();
  }, [mapFocus]);

  return (
    <section id="distribution" className="scroll-mt-28 w-full max-w-[80vw] mx-auto">
      <h3 className="font-display text-2xl font-semibold text-glow mb-6">Geographic Distribution</h3>
      <GlassPanel shape="round" hover={false} className="p-4 md:p-6">
        {!selectedSpecies && (
          <p className="text-slate-400 text-sm mb-4">
            Select a species from the list above to plot its recorded sightings.
          </p>
        )}
        <div ref={mapElRef} className="h-[420px] w-full rounded-2xl overflow-hidden" />
        <p className="mt-3 text-xs text-slate-400">
          Sourced from GBIF occurrence records via OpenStreetMap tiles — this reflects historically recorded
          sightings, not a confirmed full species range.
        </p>
      </GlassPanel>
    </section>
  );
}
