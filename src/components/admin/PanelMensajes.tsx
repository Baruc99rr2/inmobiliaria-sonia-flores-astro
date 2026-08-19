import { useCallback, useEffect, useState } from 'react';
import {
  MailIcon,
  MailOpenIcon,
  PhoneIcon,
  MapPinIcon,
  HouseIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { Button } from '@/components/admin/ui/button';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import {
  comoResponder,
  cuandoLlego,
  marcarLeido,
  obtenerMensajes,
  type Filtro,
  type Mensaje,
} from '@/lib/admin/mensajes';

/**
 * Las consultas que llegan del formulario público (Fase 8.5b).
 *
 * Arranca mostrando SIN LEER y no todos. Una bandeja que abre con trescientos
 * mensajes viejos arriba entierra la consulta de esta mañana, que es la única
 * que importa cuando entra a mirar.
 *
 * Los mensajes NO se pueden borrar desde acá aunque la policy lo permita: es
 * una consulta de una persona real y no hay deshacer. Si alguna vez hace falta
 * limpiar, se hace desde la base con una decisión tomada, no con un dedo que se
 * fue en el teléfono.
 */
export default function PanelMensajes() {
  const [filtro, setFiltro] = useState<Filtro>('sin-leer');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);

  const cargar = useCallback(async (f: Filtro) => {
    setCargando(true);
    setError(null);
    const r = await obtenerMensajes(f);
    if (r.ok) setMensajes(r.mensajes);
    else setError(r.error);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar(filtro);
  }, [filtro, cargar]);

  const alternarLeido = async (m: Mensaje) => {
    setMarcando(m.id);
    const previo = mensajes;
    // Optimista, pero con vuelta atrás si falla: la pantalla no puede decir
    // "leído" si la base no lo registró.
    setMensajes((lista) =>
      filtro === 'sin-leer' && !m.leido
        ? lista.filter((x) => x.id !== m.id)
        : lista.map((x) => (x.id === m.id ? { ...x, leido: !x.leido } : x))
    );
    const r = await marcarLeido(m.id, !m.leido);
    setMarcando(null);
    if (!r.ok) {
      setMensajes(previo);
      setError(r.error);
    }
  };

  const sinLeer = mensajes.filter((m) => !m.leido).length;

  return (
    <AdminGuard>
      <AdminShell seccionActiva="mensajes" titulo="Mensajes">
        <div className="flex max-w-3xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={filtro === 'sin-leer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltro('sin-leer')}
            >
              Sin leer
            </Button>
            <Button
              type="button"
              variant={filtro === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltro('todos')}
            >
              Todos
            </Button>
            {!cargando && filtro === 'sin-leer' && sinLeer > 0 && (
              <span className="text-xs text-muted-foreground">
                {sinLeer} {sinLeer === 1 ? 'consulta nueva' : 'consultas nuevas'}
              </span>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {cargando ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : mensajes.length === 0 ? (
            <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              {filtro === 'sin-leer'
                ? 'No hay consultas nuevas. Cuando alguien escriba desde la web, aparece acá.'
                : 'Todavía no llegó ninguna consulta.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {mensajes.map((m) => (
                <Tarjeta
                  key={m.id}
                  m={m}
                  ocupado={marcando === m.id}
                  onAlternar={() => alternarLeido(m)}
                />
              ))}
            </ul>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

function Tarjeta({
  m,
  ocupado,
  onAlternar,
}: {
  m: Mensaje;
  ocupado: boolean;
  onAlternar: () => void;
}) {
  const responder = comoResponder(m);

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border bg-card p-4 ${
        m.leido ? '' : 'border-primary/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            {!m.leido && (
              <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />
            )}
            {m.nombre}
          </p>
          {m.asunto && <p className="mt-0.5 text-xs text-muted-foreground">{m.asunto}</p>}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{cuandoLlego(m.created_at)}</span>
      </div>

      {/* De qué propiedad preguntaba. Es lo primero que ella necesita saber. */}
      {m.property_codigo && (
        <a
          href={`/propiedades/${m.property_codigo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-xs hover:bg-muted"
        >
          <HouseIcon className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Preguntó por: {m.propiedadNombre ?? `propiedad ${m.property_codigo}`}
          </span>
          <ExternalLinkIcon className="size-3.5 shrink-0" />
        </a>
      )}

      {/* `whitespace-pre-line`: escribió renglones y hay que respetarlos. */}
      <p className="whitespace-pre-line text-sm leading-relaxed">{m.mensaje}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {m.telefono && (
          <a href={`tel:${m.telefono}`} className="flex items-center gap-1 hover:underline">
            <PhoneIcon className="size-3" />
            {m.telefono}
          </a>
        )}
        {m.email && (
          <a href={`mailto:${m.email}`} className="flex items-center gap-1 hover:underline">
            <MailIcon className="size-3" />
            {m.email}
          </a>
        )}
        {m.ciudad && (
          <span className="flex items-center gap-1">
            <MapPinIcon className="size-3" />
            {m.ciudad}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Enlace de verdad y no un botón con `window.open`: se puede abrir en
            otra pestaña, copiar, o mantener apretado en el teléfono. Base UI no
            tiene `asChild` —usa `render`—, así que se estilan las clases a
            mano en vez de envolver el Button. */}
        {responder && (
          <a
            href={responder.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {responder.etiqueta}
          </a>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAlternar}
          disabled={ocupado}
        >
          {m.leido ? <MailIcon /> : <MailOpenIcon />}
          {m.leido ? 'Marcar como sin leer' : 'Marcar como leído'}
        </Button>
      </div>
    </li>
  );
}
