import { useEffect, useMemo, useState } from 'react';
import { SearchIcon, AlertTriangleIcon } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { Switch } from '@/components/admin/ui/switch';
import { Input } from '@/components/admin/ui/input';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import {
  listarPropiedades,
  cambiarPublicado,
  cambiarEstado,
  type PropiedadListado,
  type EstadoPropiedad,
} from '@/lib/admin/propiedades';

/**
 * Listado de propiedades del panel (Fase 6a).
 *
 * Tarjetas y no tabla, a propósito: la dueña va a usar esto sobre todo desde el
 * teléfono, y una tabla de siete columnas ahí obliga a scrollear de costado.
 *
 * Los filtros son `<select>` nativos en vez del componente de shadcn: en el
 * celular abren el selector del sistema operativo, que es lo que ella ya sabe
 * usar. Un popup propio se ve más prolijo en escritorio y es peor en mano.
 */

const OPERACIONES = [
  { valor: '', etiqueta: 'Alquiler y venta' },
  { valor: 'alquiler', etiqueta: 'Solo alquiler' },
  { valor: 'venta', etiqueta: 'Solo venta' },
];

const ESTADOS: Array<{ valor: EstadoPropiedad; etiqueta: string }> = [
  { valor: 'disponible', etiqueta: 'Disponible' },
  { valor: 'alquilada', etiqueta: 'Alquilada' },
  { valor: 'vendida', etiqueta: 'Vendida' },
];

const PUBLICACION = [
  { valor: '', etiqueta: 'Publicadas y borradores' },
  { valor: 'si', etiqueta: 'Solo publicadas' },
  { valor: 'no', etiqueta: 'Solo borradores' },
];

const formatearPrecio = (p: PropiedadListado) => {
  if (!p.show_price || p.price === null || p.price <= 0) return 'A consultar';
  return '$ ' + new Intl.NumberFormat('es-AR').format(p.price);
};

const claseSelect =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none ' +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default function ListadoPropiedades() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propiedades, setPropiedades] = useState<PropiedadListado[]>([]);
  const [conEstado, setConEstado] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [operacion, setOperacion] = useState('');
  const [publicacion, setPublicacion] = useState('');

  // Ids con una operación en vuelo, para deshabilitar solo esa fila.
  const [guardando, setGuardando] = useState<Set<string>>(new Set());
  const [errorFila, setErrorFila] = useState<Record<string, string>>({});

  useEffect(() => {
    let vigente = true;
    (async () => {
      const r = await listarPropiedades();
      if (!vigente) return;
      if (r.ok) {
        setPropiedades(r.propiedades);
        setConEstado(r.conEstado);
      } else {
        setError(r.error);
      }
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const marcarGuardando = (id: string, activo: boolean) =>
    setGuardando((prev) => {
      const s = new Set(prev);
      activo ? s.add(id) : s.delete(id);
      return s;
    });

  const alternarPublicado = async (p: PropiedadListado) => {
    const nuevo = !p.published;
    marcarGuardando(p.id, true);
    setErrorFila((e) => ({ ...e, [p.id]: '' }));

    // Optimista: la dueña ve el cambio al instante. Si falla, se revierte y se
    // le avisa en la misma tarjeta.
    setPropiedades((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: nuevo } : x)));

    const r = await cambiarPublicado(p.id, nuevo);
    if (!r.ok) {
      setPropiedades((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, published: p.published } : x))
      );
      setErrorFila((e) => ({ ...e, [p.id]: r.error }));
    }
    marcarGuardando(p.id, false);
  };

  const cambiarEstadoDe = async (p: PropiedadListado, estado: EstadoPropiedad) => {
    const anterior = p.estado;
    marcarGuardando(p.id, true);
    setErrorFila((e) => ({ ...e, [p.id]: '' }));
    setPropiedades((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado } : x)));

    const r = await cambiarEstado(p.id, estado);
    if (!r.ok) {
      setPropiedades((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, estado: anterior } : x))
      );
      setErrorFila((e) => ({ ...e, [p.id]: r.error }));
    }
    marcarGuardando(p.id, false);
  };

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return propiedades.filter((p) => {
      if (operacion && p.operation !== operacion) return false;
      if (publicacion === 'si' && !p.published) return false;
      if (publicacion === 'no' && p.published) return false;
      if (!texto) return true;
      const donde = [p.name, p.tipo, p.localidad, p.barrio, String(p.legacy_id ?? '')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return donde.includes(texto);
    });
  }, [propiedades, busqueda, operacion, publicacion]);

  if (cargando) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!conEstado && (
        <Alert>
          <AlertDescription className="flex items-start gap-2">
            <AlertTriangleIcon className="size-4 mt-0.5 shrink-0" />
            <span>
              Todavía no se puede marcar una propiedad como alquilada o vendida. Falta
              agregar ese campo en la base:{' '}
              <code className="text-xs">scripts/fase6-estado-propiedad.sql</code>.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, barrio o número"
            className="h-9 pl-8"
            aria-label="Buscar propiedades"
          />
        </div>
        <select
          value={operacion}
          onChange={(e) => setOperacion(e.target.value)}
          className={claseSelect + ' sm:w-44'}
          aria-label="Filtrar por operación"
        >
          {OPERACIONES.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </select>
        <select
          value={publicacion}
          onChange={(e) => setPublicacion(e.target.value)}
          className={claseSelect + ' sm:w-52'}
          aria-label="Filtrar por publicación"
        >
          {PUBLICACION.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        {filtradas.length === propiedades.length
          ? `${propiedades.length} ${propiedades.length === 1 ? 'propiedad' : 'propiedades'}`
          : `${filtradas.length} de ${propiedades.length}`}
      </p>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay propiedades que coincidan con lo que buscaste.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtradas.map((p) => (
            <li key={p.id} className="rounded-xl border bg-card p-3 sm:p-4">
              <div className="flex gap-3">
                <div className="size-16 sm:size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {p.portada ? (
                    <img src={p.portada} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid size-full place-items-center text-[10px] text-muted-foreground">
                      sin foto
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={p.published ? 'default' : 'secondary'}>
                      {p.published ? 'Publicada' : 'Borrador'}
                    </Badge>
                    <Badge variant="outline">
                      {p.operation === 'alquiler' ? 'Alquiler' : 'Venta'}
                    </Badge>
                    {conEstado && p.estado !== 'disponible' && (
                      <Badge variant="outline">
                        {p.estado === 'alquilada' ? 'Alquilada' : 'Vendida'}
                      </Badge>
                    )}
                    {p.legacy_id !== null && (
                      <span className="text-xs text-muted-foreground">#{p.legacy_id}</span>
                    )}
                  </div>

                  <h3 className="mt-1 truncate text-sm font-medium">{p.name}</h3>

                  <p className="truncate text-xs text-muted-foreground">
                    {[p.tipo, p.hide_location ? 'Ubicación reservada' : p.barrio ?? p.localidad]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  <p className="mt-1 text-sm font-semibold">{formatearPrecio(p)}</p>
                </div>
              </div>

              {/* Acciones. En una fila aparte para que en el celular no compitan
                  con el texto por el ancho. */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={p.published}
                    onCheckedChange={() => alternarPublicado(p)}
                    disabled={guardando.has(p.id)}
                    aria-label={p.published ? 'Despublicar' : 'Publicar'}
                  />
                  <span>{p.published ? 'Visible en la web' : 'No se muestra'}</span>
                </label>

                {conEstado && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Estado</span>
                    <select
                      value={p.estado}
                      onChange={(e) => cambiarEstadoDe(p, e.target.value as EstadoPropiedad)}
                      disabled={guardando.has(p.id)}
                      className={claseSelect + ' h-8 w-auto disabled:opacity-50'}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {errorFila[p.id] && (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {errorFila[p.id]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
