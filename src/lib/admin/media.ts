/**
 * Fotos y videos de una propiedad, desde el panel (Fase 7b).
 *
 * Dos orígenes conviviendo, y van a convivir un buen rato:
 *
 *   LEGACY  — `storage_path` en NULL y `url` apuntando a `/propiedades/…`, un
 *             archivo versionado en el repo. Son las 81 filas actuales. Al
 *             borrarlas se borra la fila y NADA MÁS: el archivo no está en el
 *             bucket, y aunque estuviera, está en git y lo usa el sitio.
 *   SUBIDO  — `storage_path` con la ruta dentro del bucket. Al borrar hay que
 *             borrar también el objeto, o el bucket se llena de huérfanos y nos
 *             comemos el giga del plan gratuito con archivos que no se ven.
 *
 * `esLegacy()` es la única forma correcta de distinguirlos. No alcanza con
 * mirar si la URL arranca con `/`: una URL de Storage podría cambiar de forma.
 */
import { supabase } from '../supabase';

export const BUCKET = 'propiedades';

/** El límite del plan gratuito, en bytes. */
export const LIMITE_STORAGE = 1024 * 1024 * 1024;

/** A partir de acá conviene avisar. 80% del giga. */
export const UMBRAL_AVISO = Math.round(LIMITE_STORAGE * 0.8);

export type MediaItem = {
  id: string;
  url: string;
  storage_path: string | null;
  kind: 'image' | 'video';
  alt: string;
  sort_order: number;
};

/** ¿Vino del repo (legacy) o se subió al bucket? */
export function esLegacy(m: Pick<MediaItem, 'storage_path'>): boolean {
  return !m.storage_path;
}

/**
 * La URL para mostrar.
 *
 * Para lo subido se arma desde `storage_path` y no se confía en la columna
 * `url`: si el proyecto cambia de dominio o el bucket se renombra, la columna
 * queda vieja y `storage_path` sigue siendo verdad.
 */
export function urlDeMedia(m: Pick<MediaItem, 'url' | 'storage_path'>): string {
  if (!m.storage_path) return m.url;
  if (!supabase) return m.url;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(m.storage_path);
  return data.publicUrl || m.url;
}

export async function obtenerMedia(
  propiedadId: string
): Promise<{ ok: true; media: MediaItem[] } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const { data, error } = await supabase
    .from('property_media')
    .select('id, url, storage_path, kind, alt, sort_order')
    .eq('property_id', propiedadId)
    .order('sort_order');

  if (error) {
    console.error('[admin] obtenerMedia:', error.message);
    return { ok: false, error: 'No pudimos traer las fotos de esta propiedad.' };
  }

  return {
    ok: true,
    media: (data ?? []).map((m) => ({
      id: m.id,
      url: m.url ?? '',
      storage_path: m.storage_path ?? null,
      kind: m.kind === 'video' ? 'video' : 'image',
      alt: m.alt ?? '',
      sort_order: m.sort_order ?? 0,
    })),
  };
}

export type UsoStorage = {
  archivos: number;
  bytes: number;
  porcentaje: number;
  /** `true` cuando conviene avisar antes de que una subida falle. */
  cerca: boolean;
};

/**
 * Cuánto del giga está usado.
 *
 * Devuelve `null` —y no un error— si la función todavía no existe en la base:
 * el medidor es informativo y no puede romper la pantalla de edición si falta
 * correr la migración.
 */
export async function obtenerUsoStorage(): Promise<UsoStorage | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('uso_bucket_propiedades');
  if (error || !data) {
    if (error) console.error('[admin] uso_bucket_propiedades:', error.message);
    return null;
  }

  const fila = Array.isArray(data) ? data[0] : data;
  const bytes = Number(fila?.bytes ?? 0);
  const archivos = Number(fila?.archivos ?? 0);
  if (!Number.isFinite(bytes)) return null;

  return {
    archivos,
    bytes,
    porcentaje: Math.min(100, (bytes / LIMITE_STORAGE) * 100),
    cerca: bytes >= UMBRAL_AVISO,
  };
}

/** "1,4 MB" / "820 KB". Para que se entienda sin saber qué es un byte. */
export function formatearBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} MB`;
  return `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
}
