import { useCallback, useRef, useState } from 'react';
import {
  UploadCloudIcon,
  ImageIcon,
  VideoIcon,
  RotateCcwIcon,
  XIcon,
  CheckIcon,
} from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import {
  comprimirImagen,
  kindDeArchivo,
  registrarMedia,
  rutaEnBucket,
  subirAlBucket,
  tokenDeSesion,
  validarArchivo,
  borrarDelBucket,
  type ArchivoEnCola,
} from '@/lib/admin/subir';
import { formatearBytes } from '@/lib/admin/media';

/**
 * Cargar fotos y videos (Fase 7c).
 *
 * Decisiones que vienen del caso real —una persona cargando quince fotos recién
 * sacadas, desde el teléfono, con datos móviles—:
 *
 *  - **De a uno por vez, no en paralelo.** Quince subidas simultáneas por 4G se
 *    pisan entre sí, tardan más en total y la barra de cada una se mueve a
 *    saltos. En serie, cada archivo termina rápido y se ve avanzar.
 *  - **Si uno falla, los demás siguen.** Perder catorce fotos porque la séptima
 *    se cortó sería lo peor que puede pasar acá. El que falla queda marcado con
 *    su propio botón de "Reintentar".
 *  - **Progreso real por archivo**, no una ruedita. Un video de 40 MB puede
 *    tardar minutos y hay que ver que avanza.
 *  - El `<input>` lleva `accept` pero NO `capture`: con `capture` el teléfono
 *    abre la cámara directo, y ella sube fotos que ya tiene en la galería.
 */
export default function SubidorMedia({
  propiedadId,
  alTerminar,
}: {
  propiedadId: string;
  /** Se llama cuando al menos un archivo entró bien, para refrescar la galería. */
  alTerminar: () => void;
}) {
  const [cola, setCola] = useState<ArchivoEnCola[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const actualizar = (id: string, parcial: Partial<ArchivoEnCola>) =>
    setCola((c) => c.map((a) => (a.id === id ? { ...a, ...parcial } : a)));

  /** Procesa UN archivo de punta a punta. Devuelve si entró. */
  const procesar = useCallback(
    async (item: ArchivoEnCola, token: string): Promise<boolean> => {
      let blob: Blob = item.file;
      let nombre = item.file.name;

      if (item.kind === 'image') {
        actualizar(item.id, { fase: 'comprimiendo', progreso: 0, error: null });
        const r = await comprimirImagen(item.file);
        if (r.error) {
          actualizar(item.id, { fase: 'error', error: r.error });
          return false;
        }
        blob = r.blob;
        nombre = r.nombre;
      }

      actualizar(item.id, { fase: 'subiendo', progreso: 0, error: null, bytesFinales: blob.size });

      const ruta = rutaEnBucket(propiedadId, nombre);
      const sub = await subirAlBucket({
        blob,
        ruta,
        token,
        onProgreso: (pct) => actualizar(item.id, { progreso: pct }),
      });

      if (!sub.ok) {
        actualizar(item.id, { fase: 'error', error: sub.error });
        return false;
      }

      const reg = await registrarMedia({
        propiedadId,
        ruta,
        kind: item.kind,
        alt: '',
      });

      if (!reg.ok) {
        // El objeto quedó en el bucket sin fila que lo referencie: es un
        // huérfano que ocupa espacio y no se ve en ningún lado. Se borra.
        await borrarDelBucket(ruta);
        actualizar(item.id, { fase: 'error', error: reg.error });
        return false;
      }

      actualizar(item.id, { fase: 'listo', progreso: 100 });
      return true;
    },
    [propiedadId]
  );

  const correrCola = useCallback(
    async (items: ArchivoEnCola[]) => {
      const token = await tokenDeSesion();
      if (!token) {
        setCola((c) =>
          c.map((a) =>
            items.some((i) => i.id === a.id)
              ? { ...a, fase: 'error', error: 'Se cerró tu sesión. Entrá de nuevo y reintentá.' }
              : a
          )
        );
        return;
      }

      setTrabajando(true);
      let alguno = false;
      // En serie a propósito. Ver el comentario del encabezado.
      for (const item of items) {
        const ok = await procesar(item, token);
        alguno = alguno || ok;
      }
      setTrabajando(false);
      if (alguno) alTerminar();
    },
    [procesar, alTerminar]
  );

  const agregar = useCallback(
    (files: FileList | File[]) => {
      const nuevos: ArchivoEnCola[] = [];
      const rechazados: ArchivoEnCola[] = [];

      for (const file of Array.from(files)) {
        const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
        const problema = validarArchivo(file);
        const base: ArchivoEnCola = {
          id,
          file,
          nombre: file.name,
          kind: kindDeArchivo(file),
          fase: problema ? 'error' : 'pendiente',
          progreso: 0,
          error: problema,
          bytesFinales: null,
        };
        (problema ? rechazados : nuevos).push(base);
      }

      setCola((c) => [...c, ...nuevos, ...rechazados]);
      if (nuevos.length > 0) void correrCola(nuevos);
    },
    [correrCola]
  );

  const reintentar = useCallback(
    (id: string) => {
      const item = cola.find((a) => a.id === id);
      if (!item) return;
      // Los que fallaron por tipo o tamaño no se reintentan: el archivo es el
      // que es, y reintentar daría el mismo error.
      if (validarArchivo(item.file)) return;
      actualizar(id, { fase: 'pendiente', error: null, progreso: 0 });
      void correrCola([{ ...item, fase: 'pendiente', error: null, progreso: 0 }]);
    },
    [cola, correrCola]
  );

  const quitarDeLaLista = (id: string) => setCola((c) => c.filter((a) => a.id !== id));
  const limpiarTerminados = () => setCola((c) => c.filter((a) => a.fase !== 'listo'));

  const conError = cola.filter((a) => a.fase === 'error').length;
  const listos = cola.filter((a) => a.fase === 'listo').length;

  return (
    <div className="flex flex-col gap-3">
      {/* Zona de arrastre. En el celular no se arrastra: el mismo bloque es un
          botón grande que abre la galería. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (e.dataTransfer.files?.length) agregar(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          arrastrando ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
        }`}
      >
        <UploadCloudIcon className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">Agregar fotos o video</span>
        <span className="text-xs text-muted-foreground">
          Tocá acá para elegirlas del teléfono, o arrastralas desde la computadora.
        </span>
        <span className="text-xs text-muted-foreground">
          Fotos JPG, PNG o WebP. Videos MP4 de hasta 50 MB.
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        // Sin `capture`: con eso el teléfono abriría la cámara en vez de la
        // galería, y las fotos ya están sacadas.
        accept="image/*,video/mp4"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) agregar(e.target.files);
          e.target.value = '';
        }}
      />

      {cola.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {cola.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded bg-muted">
                  {a.kind === 'video' ? (
                    <VideoIcon className="size-4" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.nombre}</p>

                  {a.fase === 'error' ? (
                    <p className="mt-0.5 text-xs text-destructive">{a.error}</p>
                  ) : a.fase === 'listo' ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckIcon className="size-3" />
                      Subida
                      {a.bytesFinales ? ` · ${formatearBytes(a.bytesFinales)}` : ''}
                    </p>
                  ) : (
                    <>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.fase === 'comprimiendo'
                          ? 'Preparando la foto…'
                          : a.fase === 'subiendo'
                            ? `Subiendo… ${a.progreso}%`
                            : 'En espera'}
                      </p>
                      <div
                        className="mt-1 h-1 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={a.progreso}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Subiendo ${a.nombre}`}
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${a.fase === 'comprimiendo' ? 5 : a.progreso}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {a.fase === 'error' && !validarArchivo(a.file) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => reintentar(a.id)}
                    disabled={trabajando}
                  >
                    <RotateCcwIcon />
                    Reintentar
                  </Button>
                )}

                {(a.fase === 'error' || a.fase === 'listo') && (
                  <button
                    type="button"
                    onClick={() => quitarDeLaLista(a.id)}
                    aria-label={`Sacar ${a.nombre} de la lista`}
                    className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted"
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {listos > 0 && (
              <span>
                {listos} {listos === 1 ? 'archivo subido' : 'archivos subidos'}.
              </span>
            )}
            {conError > 0 && (
              <span className="text-destructive">
                {conError} con problemas. Los demás se subieron igual.
              </span>
            )}
            {listos > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={limpiarTerminados}>
                Limpiar la lista
              </Button>
            )}
          </div>
        </>
      )}

      {trabajando && (
        <Alert>
          <AlertDescription className="text-xs">
            No cierres esta página hasta que termine. Si se corta, los que ya subieron quedan
            guardados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
