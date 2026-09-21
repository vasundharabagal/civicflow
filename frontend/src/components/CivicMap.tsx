import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Complaint } from '../api';

interface CivicMapProps {
  complaints?: Complaint[];
  selectedLocation?: { lat: number; lng: number };
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  zoom?: number;
  center?: [number, number];
  interactivePicker?: boolean;
}

export const CivicMap: React.FC<CivicMapProps> = ({
  complaints = [],
  selectedLocation,
  onLocationSelect,
  height = '420px',
  zoom = 13,
  center = [18.5204, 73.8567], // Pune default
  interactivePicker = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : center,
        zoom: zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle map clicks in interactive picker mode
      if (interactivePicker && onLocationSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update picker marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (interactivePicker && selectedLocation) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
      } else {
        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background:#6366f1; width:26px; height:26px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 12px rgba(99,102,241,0.8); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;">📍</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        pickerMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        pickerMarkerRef.current.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          if (onLocationSelect) onLocationSelect(latlng.lat, latlng.lng);
        });
      }

      map.panTo([selectedLocation.lat, selectedLocation.lng]);
    }
  }, [selectedLocation, interactivePicker]);

  // Render complaint markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer || interactivePicker) return;

    layer.clearLayers();

    complaints.forEach((c) => {
      if (!c.latitude || !c.longitude) return;

      let color = '#10b981'; // LOW
      if (c.severity_level === 'CRITICAL') color = '#ef4444';
      else if (c.severity_level === 'HIGH') color = '#f97316';
      else if (c.severity_level === 'MEDIUM') color = '#eab308';

      const icon = L.divIcon({
        className: 'civic-marker',
        html: `<div style="background:${color}; width:22px; height:22px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 10px ${color}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; font-weight:bold;">${c.severity_level === 'CRITICAL' ? '!' : '•'}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([c.latitude, c.longitude], { icon });

      // Clean, privacy-safe popup (NO private citizen data exposed)
      const popupHtml = `
        <div style="font-family:sans-serif; min-width:210px; line-height:1.4;">
          <div style="font-size:11px; color:#94a3b8; font-weight:700;">${c.tracking_number}</div>
          <div style="font-size:14px; font-weight:700; margin:3px 0 6px 0; color:#f8fafc;">${c.title}</div>
          <div style="display:flex; gap:6px; margin-bottom:8px;">
            <span style="background:${color}25; color:${color}; font-size:10px; font-weight:700; padding:2px 6px; border-radius:12px; border:1px solid ${color}60;">${c.severity_level} (${c.severity_score}/100)</span>
            <span style="background:#334155; color:#cbd5e1; font-size:10px; font-weight:700; padding:2px 6px; border-radius:12px;">${c.status}</span>
          </div>
          <div style="font-size:11px; color:#cbd5e1; margin-bottom:4px;"><strong>Dept:</strong> ${c.department}</div>
          <div style="font-size:11px; color:#94a3b8;"><strong>Location:</strong> ${c.address}</div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      layer.addLayer(marker);
    });
  }, [complaints, interactivePicker]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        height,
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    />
  );
};
