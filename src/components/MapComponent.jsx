// src/components/MapComponent.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const MapComponent = ({ coords }) => {
  const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div class="w-9 h-9 bg-red-600 rounded-full border-4 border-white shadow-xl"></div>`
  });

  return (
    <MapContainer center={coords} zoom={15} className="w-full h-full z-0">
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      <Marker position={coords} icon={customIcon} />
    </MapContainer>
  );
};

export default MapComponent;