import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangleIcon, HardDriveIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import SubidorMedia from '@/components/admin/SubidorMedia';
import TarjetaMedia from '@/components/admin/TarjetaMedia';
import DialogoBorrarMedia from '@/components/admin/DialogoBorrarMedia';
import {
  borrarMedia,
  formatearBytes,
  guardarOrden,
  obtenerMedia,
  obtenerUsoStorage,
  reordenar,
  validarPortada,
  LIMITE_STORAGE,
  type MediaItem,
  type UsoStorage,
} from '@/lib/admin/media';

/**
 * Las fotos y videos de la propiedad (Fases 7b y 7c).
 *
 * Muestra lo cargado y permite subir. Reordenar y borrar llegan en la 7d.
 *
 * En el ALTA no aparece el subidor: no hay `propiedadId` todavía, y sin él no
 * hay dónde guardar el archivo ni a qué fila asociarlo. Se avisa con todas las
 * letras en vez de mostrar un cargador que va a fallar.
 *
 * La primera posición se marca como "Portada" porque es la que sale en el
 * listado y en la home. Tiene que ser una imagen: tres componentes del sitio
 * público toman el primer elemento, y con un video ahí la portada se rompe. La
 * Fase 7a ya lo blinda del lado público; acá se muestra el aviso para que
 * además se entienda por qué.
 */
export default function GaleriaMedia({ propiedadId }: { propiedadId?: string }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uso, setUso] = useState<UsoStorage | null>(null);

  const recargar = useCallback(async () => {
    const u = await obtenerUsoStorage();
    setUso(u);
    if (!propiedadId) return;
    const r = await obtenerMedia(propiedadId);
    if (r.ok) setMedia(r.media);
  }, [propiedadId]);

  useEffect(() => {
    let vigente = true;
    (async () => {
      // El uso del bucket no depende de la propiedad: se pide igual, incluso en
      // el alta, porque es cuando más sirve saber si hay lugar.
      const u = await obtenerUsoStorage();
      if (vigente) setUso(u);

      if (!propiedadId) {
        if (vigente) setCargando(false);
        return;
      }
      const r = await obtenerMedia(propiedadId);
      if (!vigente) return;
      if (r.ok) setMedia(r.media);
      else setError(r.error);
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [propiedadId]);

  const primeroEsVideo = media.length > 0 && media[0].kind === 'video';

  // --- Reordenar ------------------------------------------------------------
  const [arrastre, setArrastre] = useState<{ desde: number; sobre: number } | null>(null);
  const [guardandoOrden, setGuardandoOrden] = useState(false);
  const [avisoOrden, setAvisoOrden] = useState<string | null>(null);
  const [nota, setNota] = useState<string | null>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const aplicarOrden = useCallback(async (nuevo: MediaItem[]) => {
    const problema = validarPortada(nuevo);
    if (problema) {
      setAvisoOrden(problema);
      return;
    }
    setAvisoOrden(null);
    const previo = media;
    setMedia(nuevo); // optimista: mover tiene que sentirse instantáneo
    setGuardandoOrden(true);
    const r = await guardarOrden(nuevo);
    setGuardandoOrden(false);
    if (!r.ok) {
      setMedia(previo); // se vuelve atrás: la pantalla no puede mentir
      setAvisoOrden(r.error);
    }
  }, [media]);

  const mover = useCallback(
    (desde: number, hasta: number) => {
      if (hasta < 0 || hasta >= media.length || desde === hasta) return;
      void aplicarOrden(reordenar(media, desde, hasta));
    },
    [media, aplicarOrden]
  );

  /**
   * Arrastre con Pointer Events.
   *
   * La API de drag-and-drop de HTML5 no sirve acá: en un teléfono no dispara
   * nunca, y ella carga las fotos desde el teléfono. Con pointer events el
   * mismo código anda con dedo, mouse y lápiz.
   *
   * El destino se calcula pisando los rectángulos de las tarjetas en vez de
   * llevar la cuenta de posiciones: la grilla cambia de columnas según el ancho
   * y cualquier cálculo por índice se rompería al girar el teléfono.
   */
  const empezarArrastre = useCallback(
    (e: React.PointerEvent, desde: number) => {
      if (media.length < 2) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setArrastre({ desde, sobre: desde });

      const indiceEn = (x: number, y: number): number | null => {
        const tarjetas = listaRef.current?.querySelectorAll('[data-indice]');
        if (!tarjetas) return null;
        for (const t of Array.from(tarjetas)) {
          const r = t.getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            return Number((t as HTMLElement).dataset.indice);
          }
        }
        return null;
      };

      const alMover = (ev: PointerEvent) => {
        const i = indiceEn(ev.clientX, ev.clientY);
        if (i !== null) setArrastre((a) => (a ? { ...a, sobre: i } : a));
      };

      const alSoltar = (ev: PointerEvent) => {
        document.removeEventListener('pointermove', alMover);
        document.removeEventListener('pointerup', alSoltar);
        document.removeEventListener('pointercancel', alSoltar);
        const hasta = indiceEn(ev.clientX, ev.clientY);
        setArrastre(null);
        if (hasta !== null && hasta !== desde) mover(desde, hasta);
      };

      document.addEventListener('pointermove', alMover);
      document.addEventListener('pointerup', alSoltar);
      document.addEventListener('pointercancel', alSoltar);
    },
    [media.length, mover]
  );

  // --- Borrar ---------------------------------------------------------------
  const [aBorrar, setABorrar] = useState<MediaItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const pedirBorrar = useCallback((item: MediaItem) => {
    setAvisoOrden(null);
    setNota(null);
    setABorrar(item);
  }, []);

  const confirmarBorrado = useCallback(async () => {
    if (!aBorrar) return;
    setBorrando(true);
    const r = await borrarMedia(aBorrar);
    setBorrando(false);
    setABorrar(null);

    if (!r.ok) {
      setAvisoOrden(r.error);
      return;
    }

    const quedan = media.filter((m) => m.id !== aBorrar.id);

    // Si al borrar quedó un video adelante, se adelanta la primera foto. No se
    // bloquea el borrado —ella pidió borrar y eso se respeta— pero tampoco se
    // deja el dato mal. Se le dice lo que se hizo: un reordenamiento silencioso
    // sería peor que el problema.
    const iPrimeraFoto = quedan.findIndex((m) => m.kind === 'image');
    if (quedan.length > 0 && quedan[0].kind === 'video' && iPrimeraFoto > 0) {
      const arreglado = reordenar(quedan, iPrimeraFoto, 0);
      setMedia(arreglado);
      setNota(
        'Al borrar esa foto quedaba un video adelante, así que pusimos la primera foto de portada.'
      );
      await guardarOrden(arreglado);
    } else {
      setMedia(quedan.map((m, i) => ({ ...m, sort_order: i })));
      setNota(null);
      if (quedan.length > 0) await guardarOrden(quedan);
    }

    const u = await obtenerUsoStorage();
    setUso(u);
  }, [aBorrar, media]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Fotos y video</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {propiedadId
            ? 'La primera foto es la que se ve en el listado y en la página principal.'
            : 'Vas a poder cargar las fotos después de crear la propiedad.'}
        </p>
      </div>

      {uso && <MedidorDeEspacio uso={uso} />}

      {propiedadId && <SubidorMedia propiedadId={propiedadId} alTerminar={recargar} />}

      {!propiedadId ? null : cargando ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-4/3 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : media.length === 0 ? (
        <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          Esta propiedad todavía no tiene fotos. En la web se muestra un cartel de “sin
          foto” hasta que cargues alguna.
        </p>
      ) : (
        <>
          {primeroEsVideo && (
            <Alert variant="destructive">
              <AlertDescription>
                El primer elemento es un video y la portada tiene que ser una foto. En la
                web se muestra la primera foto que encuentra. Movela adelante con la
                flechita para que sea la que elegís vos.
              </AlertDescription>
            </Alert>
          )}

          {avisoOrden && (
            <Alert variant="destructive">
              <AlertDescription>{avisoOrden}</AlertDescription>
            </Alert>
          )}
          {nota && (
            <Alert>
              <AlertDescription>{nota}</AlertDescription>
            </Alert>
          )}

          <ul ref={listaRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((m, i) => (
              <TarjetaMedia
                key={m.id}
                item={m}
                indice={i}
                total={media.length}
                arrastrando={arrastre?.desde === i}
                esDestino={arrastre?.sobre === i && arrastre?.desde !== i}
                ocupado={guardandoOrden}
                onMover={mover}
                onBorrar={pedirBorrar}
                onPointerDownAgarre={empezarArrastre}
              />
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            {media.length} {media.length === 1 ? 'elemento' : 'elementos'}
            {guardandoOrden ? ' · guardando…' : ''}. Arrastrá desde el agarre, o usá las
            flechitas para mover de a uno.
          </p>
        </>
      )}

      <DialogoBorrarMedia
        item={aBorrar}
        borrando={borrando}
        onCancelar={() => setABorrar(null)}
        onConfirmar={confirmarBorrado}
      />
    </section>
  );
}

/**
 * Cuánto lugar queda.
 *
 * Se muestra siempre, no solo cerca del límite: si aparece recién al 80% la
 * primera vez que se ve es cuando ya hay un problema. Mostrarlo desde el
 * principio lo vuelve familiar y el aviso, cuando llega, se entiende.
 */
function MedidorDeEspacio({ uso }: { uso: UsoStorage }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        uso.cerca ? 'border-destructive/40 bg-destructive/5' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        {uso.cerca ? (
          <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
        ) : (
          <HardDriveIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium">
          {formatearBytes(uso.bytes)} usados de {formatearBytes(LIMITE_STORAGE)}
        </span>
        <span className="ml-auto text-muted-foreground">
          {uso.archivos} {uso.archivos === 1 ? 'archivo' : 'archivos'}
        </span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(uso.porcentaje)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Espacio usado"
      >
        <div
          className={`h-full rounded-full ${uso.cerca ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${Math.max(uso.porcentaje, 1)}%` }}
        />
      </div>

      {uso.cerca && (
        <p className="text-xs leading-relaxed">
          Te estás quedando sin espacio. Avisale al desarrollador antes de que falle una
          subida.
        </p>
      )}
    </div>
  );
}
