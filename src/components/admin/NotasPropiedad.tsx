import { useEffect, useState } from 'react';
import { LockIcon, CheckIcon, AlertCircleIcon, LoaderIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import { useAutoguardado } from '@/components/admin/hooks/use-autoguardado';
import { cuandoSeEdito, guardarNota, obtenerNota } from '@/lib/admin/notas';

/**
 * Notas privadas de la propiedad (Fase 8a).
 *
 * Va dentro de la misma pantalla de edición y no en una sección aparte: la nota
 * es sobre ESTA propiedad, y hacerla viajar a otro lado para leer "el dueño pide
 * seña en dólares" la volvería inútil.
 *
 * El cartel de privacidad es permanente, no un aviso que se cierra. Es la única
 * garantía visible de que puede escribir cosas que no van a la web —lo que
 * pidió el dueño, cuánto está dispuesto a bajar—, y si desapareciera después de
 * la primera vez, la duda vuelve.
 */
export default function NotasPropiedad({ propiedadId }: { propiedadId?: string }) {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [notaId, setNotaId] = useState<string | null>(null);
  const [editadoEn, setEditadoEn] = useState<string | null>(null);

  const { estado, error, descargar, marcarComoGuardado } = useAutoguardado({
    valor: texto,
    activo: !cargando && !!propiedadId,
    guardar: async (v) => {
      if (!propiedadId) return { ok: false, error: 'Todavía no se creó la propiedad.' };
      const r = await guardarNota({ propiedadId, notaId, body: v });
      if (!r.ok) return { ok: false, error: r.error };
      // Guardar el id que devolvió el insert es lo que evita que el segundo
      // autosave cree una fila nueva en vez de actualizar la primera.
      setNotaId(r.nota.id);
      setEditadoEn(r.nota.updated_at);
      return { ok: true };
    },
  });

  useEffect(() => {
    if (!propiedadId) {
      setCargando(false);
      return;
    }
    let vigente = true;
    (async () => {
      const r = await obtenerNota(propiedadId);
      if (!vigente) return;
      if (r.ok) {
        const cuerpo = r.nota?.body ?? '';
        setTexto(cuerpo);
        setNotaId(r.nota?.id ?? null);
        setEditadoEn(r.nota?.updated_at ?? null);
        // Lo que viene de la base ya está guardado: sin esto, el hook lo
        // tomaría como un cambio y lo reescribiría al abrir la pantalla.
        marcarComoGuardado(cuerpo);
      } else {
        setErrorCarga(r.error);
      }
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [propiedadId, marcarComoGuardado]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Notas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Para lo que necesites acordarte de esta propiedad.
          </p>
        </div>
        <Indicador estado={estado} editadoEn={editadoEn} />
      </div>

      {/* Permanente. No se cierra ni se achica. */}
      <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs leading-relaxed">
        <LockIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <strong>Estas notas son privadas, no se publican en el sitio.</strong> Las ves solo
          vos, desde este panel.
        </span>
      </p>

      {!propiedadId ? (
        <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          Vas a poder escribir notas después de crear la propiedad.
        </p>
      ) : cargando ? (
        <Skeleton className="h-28 w-full rounded-lg" />
      ) : errorCarga ? (
        <Alert variant="destructive">
          <AlertDescription>{errorCarga}</AlertDescription>
        </Alert>
      ) : (
        <>
          <textarea
            id="notas"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={descargar}
            rows={5}
            placeholder="Ej: el dueño acepta hasta $50.000 menos. Llamar antes de las 18."
            className="w-full resize-y rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          {estado === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            Se guarda solo mientras escribís. No hace falta apretar nada.
          </p>
        </>
      )}
    </section>
  );
}

/** Qué está pasando con el guardado. Nunca dice "Guardado" sin confirmación. */
function Indicador({
  estado,
  editadoEn,
}: {
  estado: string;
  editadoEn: string | null;
}) {
  if (estado === 'guardando') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderIcon className="size-3.5 animate-spin" />
        Guardando…
      </span>
    );
  }
  if (estado === 'pendiente') {
    return <span className="shrink-0 text-xs text-muted-foreground">Sin guardar…</span>;
  }
  if (estado === 'error') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-destructive">
        <AlertCircleIcon className="size-3.5" />
        No se guardó
      </span>
    );
  }
  if (estado === 'guardado') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <CheckIcon className="size-3.5" />
        Guardado
      </span>
    );
  }
  if (editadoEn) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground">
        Última edición {cuandoSeEdito(editadoEn)}
      </span>
    );
  }
  return null;
}
