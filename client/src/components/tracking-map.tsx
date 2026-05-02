import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface TrackingMarkerPopupRow {
  label: string;
  value: string;
}

export interface TrackingMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  popupTitle?: string;
  popupRows?: TrackingMarkerPopupRow[];
  color?: string;
}

interface TrackingMapProps {
  markers: TrackingMarker[];
  path?: Array<{ lat: number; lng: number }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  fitBounds?: boolean;
}

function makeTruckIcon(color = "#2563eb"): L.DivIcon {
  return L.divIcon({
    className: "tracking-truck-marker",
    html: `<div style="
        background:${color};
        width:34px;height:34px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        border:2px solid white;color:white;font-weight:bold;font-size:18px;
      ">🚚</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function TrackingMap({
  markers,
  path,
  center,
  zoom = 12,
  height = "500px",
  fitBounds = true,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pathLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = center
      ? [center.lat, center.lng]
      : markers[0]
      ? [markers[0].lat, markers[0].lng]
      : [-15.7801, -47.9292]; // Brasília as default

    const map = L.map(containerRef.current).setView(initialCenter, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      pathLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: makeTruckIcon(m.color) });
      if (m.popup) marker.bindPopup(m.popup);
      else if (m.label) marker.bindPopup(m.label);
      marker.addTo(layer);
    });

    if (fitBounds && markers.length > 0) {
      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], Math.max(map.getZoom(), 13));
      } else {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [markers, fitBounds]);

  // Update path
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pathLayerRef.current) {
      pathLayerRef.current.remove();
      pathLayerRef.current = null;
    }

    if (path && path.length > 1) {
      const latlngs = path.map((p) => [p.lat, p.lng] as [number, number]);
      pathLayerRef.current = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.85,
      }).addTo(map);

      if (fitBounds) {
        map.fitBounds(pathLayerRef.current.getBounds(), { padding: [40, 40] });
      }
    }
  }, [path, fitBounds]);

  return <div ref={containerRef} style={{ height, width: "100%", borderRadius: 8 }} data-testid="tracking-map" />;
}
