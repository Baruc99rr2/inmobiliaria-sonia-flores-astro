import { useEffect, useRef, useCallback } from "react";
import { portadaDe } from "../../lib/media";

const PropertyMap = ({ 
  filteredProducts = [], 
  activePropId, 
  navigate 
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const markersMapRef = useRef({});

  // Inicializar mapa
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstance.current || !window.L) return;

    const L = window.L;

    mapInstance.current = L.map(mapRef.current, { 
      zoomControl: true, 
      attributionControl: false 
    }).setView([-24.185, -65.300], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapInstance.current);

    markersGroup.current = L.layerGroup().addTo(mapInstance.current);
  }, []);

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    const loadLeaflet = () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initMap();
        document.body.appendChild(script);
      } else if (window.L) {
        initMap();
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [initMap]);

  // Actualizar marcadores usando lat y lon estáticos
  const updateMapMarkers = useCallback((propsToDisplay = []) => {
    if (!window.L || !mapInstance.current || !markersGroup.current) return;

    const L = window.L;
    markersGroup.current.clearLayers();
    markersMapRef.current = {};
    const bounds = [];

    for (const prop of propsToDisplay) {
      const detalles = prop?.detalles || {};
      
      let lat = detalles.lat;
      let lon = detalles.lon;

      // Fallback si no tiene coordenadas
      if (!lat || !lon) {
        lat = -24.185;
        lon = -65.300;
      }

      const finalCoords = [lat, lon];

      const textoPrecio = prop?.price > 0 
        ? `$ ${new Intl.NumberFormat('es-AR').format(prop.price)}` 
        : 'A consultar';

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-max inline-block bg-red-600 text-white font-bold px-3 py-1 rounded shadow-md border border-white text-center whitespace-nowrap text-sm ${activePropId === prop.id ? 'scale-110 bg-gray-900 ring-2 ring-red-400' : ''}">${textoPrecio}</div>`,
        iconAnchor: [35, 12]
      });

      const popupContent = document.createElement('div');
      popupContent.className = "flex flex-col gap-2 w-[190px] cursor-pointer font-sans";
      popupContent.innerHTML = `
        <div class="w-full h-[110px] overflow-hidden rounded bg-gray-100">
          <img src="${portadaDe(prop)}" class="w-full h-full object-cover" />
        </div>
        <h5 class="m-0 font-bold text-sm text-gray-800 line-clamp-2">${prop?.name || 'Propiedad'}</h5>
        <p class="m-0 text-red-600 font-extrabold">${textoPrecio}</p>
      `;

      popupContent.addEventListener('click', () => {
        const targetUrl = `/propiedades/${prop.id}`;
        if (typeof navigate === 'function') {
          navigate(targetUrl);
        } else {
          window.location.href = targetUrl;
        }
      });

      const marker = L.marker(finalCoords, { icon: customIcon })
        .bindPopup(popupContent, { closeButton: false });

      markersGroup.current.addLayer(marker);
      markersMapRef.current[prop.id] = marker;
      bounds.push(finalCoords);
    }

    if (bounds.length > 0 && !activePropId) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [activePropId, navigate]);

  useEffect(() => {
    updateMapMarkers(filteredProducts);
  }, [filteredProducts, updateMapMarkers]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[calc(90vh-100px)] md:h-[calc(110vh-120px)] z-10" 
    />
  );
};

export default PropertyMap;