import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CrosshairIcon, MapPinOffIcon, HandIcon } from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { useIsMobile } from '@/components/admin/hooks/use-mobile';
import { TILES_CLARO, ATRIBUCION_MAPA } from '@/lib/mapa-tiles';

/**
 * Mapa del formulario, con marcador arrastrable (Fase 6e).
 *
 * ---
 * POR QUÉ react-leaflet Y NO EL CDN
 *
 * El sitio público usa las dos: `react-leaflet` en la ficha de detalle y Leaflet
 * por CDN en `Busqueda/PropertyMap.jsx`. Para el panel se eligió react-leaflet:
 *
 *  1. `leaflet` y `react-leaflet` YA son dependencias del proyecto. No se
 *     instala nada nuevo.
 *  2. El CDN inyecta un `<script>` de unpkg en tiempo de ejecución. El panel se
 *     va a usar desde el celular con datos móviles: depender de que un tercero
 *     responda para poder ubicar una propiedad es fragilidad gratis.
 *  3. Acá hace falta un marcador ARRASTRABLE con manejadores de eventos. Con
 *     `window.L` eso es ciclo de vida a mano — `PropertyMap.jsx` necesita 140
 *     líneas para un mapa de solo lectura. Con react-leaflet es una prop.
 *  4. Va tipado, así que `astro check` lo cubre.
 *
 * El costo es peso en el bundle del admin, que no comparte chunk con el sitio
 * público.
 *
 * ---
 * SIN GEOCODING. No se busca por dirección ni se usa Nominatim: sería alcance
 * nuevo. `mapa_query` existe en la base pero hoy no lo consume nadie.
 */

/** El centro de San Salvador, el mismo que usa el sitio público como fallback. */
const SSJ: [number, number] = [-24.185, -65.3];

const ICONO = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:9999px;background:#d64531;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/** Mueve la vista sin tocar el marcador. */
function Recentrar({ hacia, sello }: { hacia: [number, number]; sello: number }) {
  const map = useMap();
  useEffect(() => {
    if (sello > 0) map.setView(hacia, Math.max(map.getZoom(), 15));
  }, [sello]);
  return null;
}

/** Un toque en el mapa pone el marcador donde todavía no hay. */
function PonerAlTocar({ onPoner }: { onPoner: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPoner(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Habilita o deshabilita los gestos según el candado. */
function Gestos({ activo }: { activo: boolean }) {
  const map = useMap();
  useEffect(() => {
    const partes = [map.dragging, map.touchZoom, map.doubleClickZoom, map.boxZoom, map.keyboard];
    for (const p of partes) activo ? p?.enable() : p?.disable();
    // La rueda queda SIEMPRE apagada: si no, scrollear la página con el puntero
    // encima del mapa hace zoom en vez de bajar.
    map.scrollWheelZoom.disable();
  }, [activo, map]);
  return null;
}

const numeroValido = (s: string) => s.trim() !== '' && Number.isFinite(Number(s));

export default function CampoMapa({
  lat,
  lon,
  onCambio,
}: {
  lat: number | null;
  lon: number | null;
  onCambio: (lat: number | null, lon: number | null) => void;
}) {
  const esMobile = useIsMobile();

  // En el celular el mapa arranca bloqueado. Si no, arrastrar la página con el
  // dedo encima del mapa lo mueve a él y la página no scrollea: la dueña queda
  // trabada sin entender por qué.
  //
  // El valor inicial se lee del ancho real y NO de `useIsMobile`: ese hook
  // devuelve `false` hasta que corre su efecto, así que en un teléfono el mapa
  // quedaría suelto durante el primer frame, que es exactamente el momento en
  // que el dedo ya está apoyado scrolleando. El componente es `client:only`, así
  // que `window` existe en el primer render.
  const [activo, setActivo] = useState(() => window.innerWidth >= 768);
  useEffect(() => setActivo(!esMobile), [esMobile]);

  const [selloRecentrar, setSelloRecentrar] = useState(0);
  const recentrarHacia = useRef<[number, number]>(SSJ);

  // Texto de los inputs, separado de los números: mientras escribe "-24." el
  // valor todavía no es válido y no hay que pisarle lo que está tipeando.
  const [latTexto, setLatTexto] = useState(lat === null ? '' : String(lat));
  const [lonTexto, setLonTexto] = useState(lon === null ? '' : String(lon));

  useEffect(() => {
    setLatTexto(lat === null ? '' : String(lat));
    setLonTexto(lon === null ? '' : String(lon));
  }, [lat, lon]);

  const hayMarcador = lat !== null && lon !== null;
  const centro: [number, number] = hayMarcador ? [lat, lon] : SSJ;

  const ponerEn = (nuevaLat: number, nuevaLon: number) => {
    // Seis decimales son ~11 cm. Más que eso es ruido y ensucia el dato.
    onCambio(Number(nuevaLat.toFixed(6)), Number(nuevaLon.toFixed(6)));
  };

  const aplicarTexto = () => {
    if (numeroValido(latTexto) && numeroValido(lonTexto)) {
      const la = Number(latTexto);
      const lo = Number(lonTexto);
      onCambio(la, lo);
      recentrarHacia.current = [la, lo];
      setSelloRecentrar((s) => s + 1);
      return;
    }
    if (latTexto.trim() === '' && lonTexto.trim() === '') {
      onCambio(null, null);
      return;
    }
    // Media coordenada o texto que no es un número: no se puede ubicar nada, así
    // que los campos vuelven a lo que hay guardado. Si no, quedarían mostrando
    // algo que NO se va a guardar, y ella creería que cargó la ubicación.
    setLatTexto(lat === null ? '' : String(lat));
    setLonTexto(lon === null ? '' : String(lon));
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Ubicación en el mapa</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {hayMarcador
            ? 'Arrastrá el punto rojo para moverlo, o tocá el mapa en otro lugar.'
            : 'Tocá el mapa donde está la propiedad para poner el punto.'}
        </p>
      </div>

      {/* `isolation: isolate` NO es decorativo: acota el apilamiento al bloque.
          Leaflet le pone z-index propios a sus paneles y controles, y llega a
          1000 en `.leaflet-top/.leaflet-bottom`. El encabezado del panel es
          `z-10`, así que sin un contexto de apilamiento acá esos 1000 compiten
          de igual a igual contra el 10 y el mapa termina tapando el encabezado
          al scrollear. `relative` solo no alcanza: con `z-index: auto` no crea
          contexto. Con `isolate`, todos los z-index de Leaflet quedan
          encerrados y el bloque entero se apila como uno solo. */}
      <div className="relative isolate overflow-hidden rounded-lg border">
        <MapContainer
          center={centro}
          zoom={hayMarcador ? 16 : 13}
          scrollWheelZoom={false}
          style={{ height: 320, width: '100%' }}
        >
          <TileLayer url={TILES_CLARO} attribution={ATRIBUCION_MAPA} />
          <Gestos activo={activo} />
          <Recentrar hacia={recentrarHacia.current} sello={selloRecentrar} />
          <PonerAlTocar onPoner={ponerEn} />
          {hayMarcador && (
            <Marker
              position={[lat, lon]}
              icon={ICONO}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  ponerEn(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>

        {/* Candado del celular. */}
        {!activo && (
          <button
            type="button"
            onClick={() => setActivo(true)}
            className="absolute inset-0 z-[400] flex flex-col items-center justify-center gap-2 bg-background/70 text-sm font-medium backdrop-blur-[1px]"
          >
            <HandIcon className="size-5" />
            Tocá para poder mover el mapa
          </button>
        )}

        {activo && esMobile && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-2 right-2 z-[400]"
            onClick={() => setActivo(false)}
          >
            Listo
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            recentrarHacia.current = SSJ;
            setSelloRecentrar((s) => s + 1);
          }}
        >
          <CrosshairIcon />
          Centrar en San Salvador
        </Button>

        {hayMarcador && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onCambio(null, null)}
          >
            <MapPinOffIcon />
            Quitar el punto
          </Button>
        )}
      </div>

      {/* Coordenadas a mano: si tiene los valores exactos de un plano, escribirlos
          es más preciso que arrastrar. */}
      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Si tenés las coordenadas exactas, escribilas acá y el punto se mueve solo.
        </p>
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="lat">Latitud</Label>
            <Input
              id="lat"
              inputMode="decimal"
              value={latTexto}
              onChange={(e) => setLatTexto(e.target.value)}
              onBlur={aplicarTexto}
              placeholder="-24.185"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="lon">Longitud</Label>
            <Input
              id="lon"
              inputMode="decimal"
              value={lonTexto}
              onChange={(e) => setLonTexto(e.target.value)}
              onBlur={aplicarTexto}
              placeholder="-65.300"
            />
          </div>
        </div>
        {!hayMarcador && (
          <p className="text-xs text-muted-foreground">
            Sin punto, en la web el mapa se centra en San Salvador de Jujuy.
          </p>
        )}
      </div>
    </section>
  );
}
