import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, VideoIcon, AlertTriangleIcon, HardDriveIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import SubidorMedia from '@/components/admin/SubidorMedia';
import {
  formatearBytes,
  obtenerMedia,
  obtenerUsoStorage,
  urlDeMedia,
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
                El primer elemento es un video, y la portada tiene que ser una foto. En la
                web se está mostrando la primera foto que encuentra. Cuando puedas
                reordenar, poné una foto adelante.
              </AlertDescription>
            </Alert>
          )}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((m, i) => (
              <li key={m.id} className="flex flex-col gap-1.5">
                <div className="relative aspect-4/3 overflow-hidden rounded-lg border bg-muted">
                  {m.kind === 'video' ? (
                    // Sin `autoplay`: 15 videos reproduciéndose solos en el
                    // panel se comen los datos del teléfono. `preload="metadata"`
                    // trae lo justo para el primer cuadro.
                    <video
                      src={urlDeMedia(m)}
                      className="size-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                      controls
                    />
                  ) : (
                    <img
                      src={urlDeMedia(m)}
                      alt={m.alt || `Foto ${i + 1}`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}

                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      Portada
                    </span>
                  )}

                  <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded bg-background/90">
                    {m.kind === 'video' ? (
                      <VideoIcon className="size-3.5" />
                    ) : (
                      <ImageIcon className="size-3.5" />
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            {media.length} {media.length === 1 ? 'elemento' : 'elementos'}. Reordenar y borrar
            llega en la próxima entrega.
          </p>
        </>
      )}
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
