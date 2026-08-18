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

/**
 * LA REGLA DE LA PORTADA (Fase 7d).
 *
 * El primer elemento tiene que ser una imagen. `ProductList`, `Carrusel` y
 * `PropertyMap` toman el primero para la portada; con un video ahí, la portada
 * se rompe.
 *
 * La Fase 7a ya blinda el sitio público —`portadaDe()` saltea videos—, pero eso
 * es la red de abajo. Acá se impide que el dato quede mal de entrada, que es
 * mejor: si la web muestra la segunda foto porque la primera es un video, ella
 * no entiende por qué la portada no es la que puso.
 *
 * Devuelve el mensaje de error, o `null` si el orden es válido.
 */
export function validarPortada(items: Pick<MediaItem, 'kind'>[]): string | null {
  if (items.length === 0) return null;
  if (items[0].kind !== 'video') return null;
  if (!items.some((m) => m.kind === 'image')) {
    // Solo videos: no hay forma de cumplir la regla, y bloquear no ayudaría.
    return null;
  }
  return 'La primera tiene que ser una foto, porque es la que se ve en el listado y en la página principal. Poné una foto adelante y el video después.';
}

/** Reacomoda `sort_order` para que sea 0,1,2… sin huecos. */
export function reordenar(items: MediaItem[], desde: number, hasta: number): MediaItem[] {
  const copia = [...items];
  const [movido] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movido);
  return copia.map((m, i) => ({ ...m, sort_order: i }));
}

/**
 * Guarda el orden nuevo.
 *
 * Se actualiza fila por fila y no con un upsert masivo a propósito: el upsert
 * de supabase-js necesita mandar todas las columnas NOT NULL, y un descuido ahí
 * borraría `url` o `kind`. Son a lo sumo 20 filas por propiedad.
 */
export async function guardarOrden(
  items: MediaItem[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const problema = validarPortada(items);
  if (problema) return { ok: false, error: problema };

  // Se escriben TODAS las filas, sin saltear las que "ya están en su lugar".
  //
  // La primera versión tenía `if (items[i].sort_order === i) continue`, y era un
  // bug silencioso: `reordenar()` renumera el arreglo antes de llegar acá, así
  // que esa condición era verdadera siempre y no se escribía ni una fila.
  // `guardarOrden` devolvía ok, la pantalla mostraba el orden nuevo y la base
  // seguía con el viejo — se descubría recién al recargar. Saltear solo tendría
  // sentido comparando contra lo que hay en la base, y para eso habría que ir a
  // buscarlo: son 20 filas como mucho, no vale la pena.
  for (let i = 0; i < items.length; i++) {
    const { error } = await supabase
      .from('property_media')
      .update({ sort_order: i })
      .eq('id', items[i].id);
    if (error) {
      console.error('[admin] guardarOrden:', error.message);
      return { ok: false, error: 'No pudimos guardar el orden nuevo. Probá de nuevo.' };
    }
  }
  return { ok: true };
}

/**
 * Borra una foto o video.
 *
 * >>> EL ORDEN DE LAS DOS BAJAS IMPORTA. <<<
 *
 * Primero la fila, después el objeto del bucket. Si se hiciera al revés y
 * fallara el borrado de la fila, quedaría una fila apuntando a un archivo que
 * ya no está: imagen rota en la web. Al derecho, lo peor que puede pasar es un
 * archivo huérfano en el bucket, que ocupa espacio pero no se ve. De los dos
 * males, el que no se le muestra a un cliente.
 *
 * Las filas LEGACY (`storage_path` en NULL) son archivos del repo: se borra la
 * fila y nada más. Borrar el archivo no corresponde —está en git— y encima no
 * está en el bucket.
 */
export async function borrarMedia(
  item: MediaItem
): Promise<{ ok: true; huerfano: boolean } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const { error } = await supabase.from('property_media').delete().eq('id', item.id);
  if (error) {
    console.error('[admin] borrarMedia fila:', error.message);
    return { ok: false, error: 'No pudimos borrar este archivo. Probá de nuevo.' };
  }

  if (esLegacy(item)) return { ok: true, huerfano: false };

  const { error: eObj } = await supabase.storage.from(BUCKET).remove([item.storage_path!]);
  if (eObj) {
    // La fila ya no está, así que en la web desapareció. El archivo quedó
    // ocupando lugar. No se le muestra como error —lo que ella pidió, se hizo—
    // pero queda en la consola para poder limpiarlo después.
    console.error('[admin] quedó huérfano en el bucket:', item.storage_path, eObj.message);
    return { ok: true, huerfano: true };
  }

  return { ok: true, huerfano: false };
}

/** "1,4 MB" / "820 KB". Para que se entienda sin saber qué es un byte. */
export function formatearBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} MB`;
  return `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
}
