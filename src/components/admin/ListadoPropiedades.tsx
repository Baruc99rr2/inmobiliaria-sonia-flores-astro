import { useEffect, useMemo, useState } from 'react';
import { SearchIcon, AlertTriangleIcon, Trash2Icon, PencilIcon, PlusIcon } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { Switch } from '@/components/admin/ui/switch';
import { Input } from '@/components/admin/ui/input';
import { Button } from '@/components/admin/ui/button';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import DialogoEliminar from '@/components/admin/DialogoEliminar';
import {
  listarPropiedades,
  cambiarPublicado,
  cambiarEstado,
  archivarPropiedad,
  type PropiedadListado,
  type EstadoPropiedad,
  type Capacidades,
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

/**
 * El texto del toggle cambia según la operación. La dueña no piensa en
 * "estados": piensa en que la casa ya se alquiló o el terreno ya se vendió.
 */
const textoNoDisponible = (operacion: PropiedadListado['operation']) =>
  operacion === 'alquiler' ? 'Ya se alquiló' : 'Ya se vendió';

const estadoParaOperacion = (operacion: PropiedadListado['operation']): EstadoPropiedad =>
  operacion === 'alquiler' ? 'alquilada' : 'vendida';

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
  const [caps, setCaps] = useState<Capacidades>({ estado: true, archivado: true });
  const [aEliminar, setAEliminar] = useState<PropiedadListado | null>(null);
  const [eliminando, setEliminando] = useState(false);

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
        setCaps(r.capacidades);
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

  const alternarDisponible = async (p: PropiedadListado) => {
    const anterior = p.estado;
    const nuevo: EstadoPropiedad =
      p.estado === 'disponible' ? estadoParaOperacion(p.operation) : 'disponible';

    marcarGuardando(p.id, true);
    setErrorFila((e) => ({ ...e, [p.id]: '' }));
    setPropiedades((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado: nuevo } : x)));

    const r = await cambiarEstado(p.id, nuevo);
    if (!r.ok) {
      setPropiedades((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, estado: anterior } : x))
      );
      setErrorFila((e) => ({ ...e, [p.id]: r.error }));
    }
    marcarGuardando(p.id, false);
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);

    const r = await archivarPropiedad(aEliminar.id);
    if (r.ok) {
      setPropiedades((prev) => prev.filter((x) => x.id !== aEliminar.id));
      setAEliminar(null);
    } else {
      setErrorFila((e) => ({ ...e, [aEliminar.id]: r.error }));
      setAEliminar(null);
    }
    setEliminando(false);
  };

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return propiedades.filter((p) => {
      if (operacion && p.operation !== operacion) return false;
      if (publicacion === 'si' && !p.published) return false;
      if (publicacion === 'no' && p.published) return false;
      if (!texto) return true;
      const donde = [p.name, p.tipo, p.localidad, p.barrio, String(p.codigo ?? '')]
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
      {(!caps.estado || !caps.archivado) && (
        <Alert>
          <AlertDescription className="flex items-start gap-2">
            <AlertTriangleIcon className="size-4 mt-0.5 shrink-0" />
            <span>
              Falta preparar la base para algunas acciones. Avisale al desarrollador:{' '}
              {!caps.estado && <code className="text-xs">fase6-estado-propiedad.sql</code>}
              {!caps.estado && !caps.archivado && ' y '}
              {!caps.archivado && <code className="text-xs">fase6-archivar-propiedad.sql</code>}.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Button
        className="self-start"
        onClick={() => (window.location.href = '/admin/propiedades/nueva')}
      >
        <PlusIcon />
        Cargar una propiedad
      </Button>

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
                    {caps.estado && p.estado !== 'disponible' && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        {p.estado === 'alquilada' ? 'Ya se alquiló' : 'Ya se vendió'}
                      </Badge>
                    )}
                    {p.codigo !== null && (
                      <span className="text-xs text-muted-foreground">#{p.codigo}</span>
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

              {/* Acciones, en una fila aparte para que en el celular no compitan
                  con el texto por el ancho. Los dos toggles van juntos a la
                  izquierda; eliminar va SEPARADO a la derecha y con otro estilo,
                  para que no se toque por error al buscar un switch. */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t pt-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={p.published}
                      onCheckedChange={() => alternarPublicado(p)}
                      disabled={guardando.has(p.id)}
                      aria-label={p.published ? 'Despublicar' : 'Publicar'}
                    />
                    <span>{p.published ? 'Visible en la web' : 'No se muestra'}</span>
                  </label>

                  {caps.estado && (
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={p.estado !== 'disponible'}
                        onCheckedChange={() => alternarDisponible(p)}
                        disabled={guardando.has(p.id)}
                        aria-label={textoNoDisponible(p.operation)}
                      />
                      <span>{textoNoDisponible(p.operation)}</span>
                    </label>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.href = `/admin/propiedades/${p.id}`)}
                    disabled={guardando.has(p.id)}
                  >
                    <PencilIcon />
                    Editar
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAEliminar(p)}
                    disabled={guardando.has(p.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2Icon />
                    Eliminar
                  </Button>
                </div>
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

      <DialogoEliminar
        abierto={aEliminar !== null}
        onCambio={(abierto) => {
          if (!abierto && !eliminando) setAEliminar(null);
        }}
        titulo={aEliminar?.name ?? ''}
        eliminando={eliminando}
        onConfirmar={confirmarEliminar}
      />
    </div>
  );
}
