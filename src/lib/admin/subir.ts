/**
 * Subida de fotos y videos (Fase 7c).
 *
 * ---
 * POR QUÉ XHR Y NO `supabase.storage.upload()`
 *
 * `storage-js` sube con `fetch`, y `fetch` no informa progreso de SUBIDA. Se
 * revisó la versión instalada (supabase-js 2.112): no existe `onUploadProgress`
 * en ninguna parte del paquete. Con una sola barra genérica alcanzaría para
 * fotos comprimidas, pero un video puede pesar 50 MB y desde datos móviles eso
 * son minutos: sin una barra que se mueva, parece colgado y se cierra la
 * pestaña. `XMLHttpRequest` sí expone `upload.onprogress`.
 *
 * El endpoint es el mismo que usa `storage-js` por debajo.
 *
 * ---
 * LA COMPRESIÓN ADEMÁS ARREGLA EL PROBLEMA DEL IPHONE
 *
 * El bucket acepta jpeg, png, webp y mp4. Las fotos de un iPhone suelen ser
 * HEIC, que NO está en esa lista: subidas tal cual, las rechazaría el bucket
 * con un error incomprensible.
 *
 * Como toda imagen se dibuja en un `<canvas>` y sale como WebP, el formato de
 * entrada deja de importar: si el browser sabe mostrarla, sale WebP. Safari
 * decodifica HEIC nativamente, así que el caso real —ella sacando fotos con el
 * teléfono y subiéndolas de la galería— queda cubierto sin librerías.
 */
import { supabase } from '../supabase';
import { BUCKET } from './media';

/** Lo que acepta el bucket. Tiene que coincidir con su configuración. */
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
export const TIPOS_VIDEO = ['video/mp4'];

/** Tope por archivo del bucket. */
export const TOPE_ARCHIVO = 50 * 1024 * 1024;

/** Lado máximo de una foto después de comprimir. */
export const LADO_MAXIMO = 1920;

/** Calidad del WebP. 0.82 es el punto donde deja de notarse a simple vista. */
export const CALIDAD_WEBP = 0.82;

export type Fase = 'pendiente' | 'comprimiendo' | 'subiendo' | 'listo' | 'error';

export type ArchivoEnCola = {
  id: string;
  file: File;
  nombre: string;
  kind: 'image' | 'video';
  fase: Fase;
  progreso: number;
  error: string | null;
  /** Tamaño final, para poder mostrar cuánto se ahorró. */
  bytesFinales: number | null;
};

const mb = (b: number) => `${Math.round(b / (1024 * 1024))} MB`;

/**
 * ¿Se puede subir?
 *
 * Devuelve el mensaje de error en castellano, o `null` si está bien. Nunca se
 * muestra el error crudo de Supabase: "mime type application/octet-stream is
 * not supported" no le dice nada a nadie.
 *
 * Las imágenes NO se validan por tipo: pasan por el canvas y salen WebP, así
 * que entra cualquier cosa que el browser sepa dibujar (HEIC incluido). Lo que
 * sí se valida es que el navegador la pueda leer, y eso se descubre al
 * comprimir.
 */
export function validarArchivo(file: File): string | null {
  const esVideoDeclarado = file.type.startsWith('video/');

  if (esVideoDeclarado && !TIPOS_VIDEO.includes(file.type)) {
    return `“${file.name}” es un video en un formato que no aceptamos. Tiene que ser MP4.`;
  }

  if (!esVideoDeclarado && !file.type.startsWith('image/')) {
    return `“${file.name}” no es una foto ni un video. Se pueden subir fotos (JPG, PNG o WebP) y videos MP4.`;
  }

  // El tope del bucket aplica al archivo que se sube. Para las fotos se mide
  // DESPUÉS de comprimir, así que acá solo se frena lo desmedido; el chequeo
  // real de las fotos está en `comprimirImagen`.
  if (esVideoDeclarado && file.size > TOPE_ARCHIVO) {
    return `“${file.name}” pesa ${mb(file.size)} y el máximo son ${mb(
      TOPE_ARCHIVO
    )}. Probá con un video más corto.`;
  }

  return null;
}

export function kindDeArchivo(file: File): 'image' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

/**
 * Redimensiona y convierte a WebP.
 *
 * Devuelve el original si comprimir no ayuda: una foto ya optimizada puede
 * salir MÁS pesada en WebP, y en ese caso conviene subir la que ya estaba
 * —siempre que su tipo lo acepte el bucket—.
 */
export async function comprimirImagen(
  file: File
): Promise<{ blob: Blob; nombre: string; error?: string }> {
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return {
      blob: file,
      nombre: file.name,
      error: `No pudimos leer “${file.name}”. Puede estar dañada o ser un formato que el navegador no abre.`,
    };
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return { blob: file, nombre: file.name };
  }
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close?.();

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', CALIDAD_WEBP)
  );

  // Sin WebP (o si engordó), se vuelve al original — pero solo si el bucket lo
  // acepta. Un HEIC no tiene vuelta atrás posible: si el canvas no produjo
  // WebP, no hay forma de subirlo.
  if (!webp || webp.size >= file.size) {
    if (TIPOS_IMAGEN.includes(file.type)) {
      if (file.size > TOPE_ARCHIVO) {
        return {
          blob: file,
          nombre: file.name,
          error: `“${file.name}” pesa ${mb(file.size)} y el máximo son ${mb(TOPE_ARCHIVO)}.`,
        };
      }
      return { blob: file, nombre: file.name };
    }
    if (!webp) {
      return {
        blob: file,
        nombre: file.name,
        error: `No pudimos preparar “${file.name}” para subirla. Probá sacándole una captura de pantalla y subiendo esa.`,
      };
    }
  }

  const nombre = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return { blob: webp!, nombre };
}

/** Ruta dentro del bucket. Agrupada por propiedad, para poder limpiarla junta. */
export function rutaEnBucket(propiedadId: string, nombre: string): string {
  const ext = (nombre.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${propiedadId}/${base}${ext}`;
}

/** Traduce los errores de Storage. Nunca se muestra el original. */
export function traducirErrorDeSubida(mensaje: string, statusHttp?: number): string {
  const m = String(mensaje ?? '');
  if (/exceeded the maximum allowed size|payload too large/i.test(m) || statusHttp === 413) {
    return `El archivo pesa más de ${mb(TOPE_ARCHIVO)}, que es el máximo.`;
  }
  if (/mime type .* is not supported/i.test(m)) {
    return 'Ese tipo de archivo no se puede subir. Se aceptan fotos (JPG, PNG o WebP) y videos MP4.';
  }
  if (/row-level security|not authorized|403/i.test(m) || statusHttp === 403) {
    return 'No tenés permiso para subir archivos. Probá cerrando sesión y entrando de nuevo.';
  }
  if (/already exists|duplicate/i.test(m) || statusHttp === 409) {
    return 'Ya existe un archivo con ese nombre. Probá de nuevo.';
  }
  if (/network|failed to fetch|load failed/i.test(m)) {
    return 'Se cortó la conexión. Revisá internet y tocá “Reintentar”.';
  }
  if (statusHttp === 0) {
    return 'Se cortó la conexión mientras subía. Tocá “Reintentar”.';
  }
  return 'No pudimos subir este archivo. Tocá “Reintentar”.';
}

/**
 * Sube un blob al bucket informando progreso real.
 *
 * `onProgreso` recibe 0..100. Con archivos chicos puede saltar de 0 a 100 de
 * una: es correcto, no es un bug.
 */
export function subirAlBucket({
  blob,
  ruta,
  token,
  onProgreso,
  alCancelar,
}: {
  blob: Blob;
  ruta: string;
  token: string;
  onProgreso: (pct: number) => void;
  alCancelar?: (abortar: () => void) => void;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = import.meta.env.PUBLIC_SUPABASE_URL;
  const apikey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    alCancelar?.(() => xhr.abort());

    xhr.open('POST', `${base}/storage/v1/object/${BUCKET}/${ruta}`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', apikey);
    xhr.setRequestHeader('x-upsert', 'false');
    if (blob.type) xhr.setRequestHeader('Content-Type', blob.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgreso(100);
        resolve({ ok: true });
        return;
      }
      let msg = xhr.responseText;
      try {
        msg = JSON.parse(xhr.responseText)?.message ?? msg;
      } catch {
        /* el cuerpo no era JSON */
      }
      console.error('[subir] HTTP', xhr.status, msg);
      resolve({ ok: false, error: traducirErrorDeSubida(msg, xhr.status) });
    };

    xhr.onerror = () => resolve({ ok: false, error: traducirErrorDeSubida('network', 0) });
    xhr.onabort = () => resolve({ ok: false, error: 'Subida cancelada.' });

    xhr.send(blob);
  });
}

/** El token de la sesión actual, que necesita el XHR. */
export async function tokenDeSesion(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Registra el archivo ya subido en `property_media`.
 *
 * Va al final: la portada es la primera y no queremos que una foto nueva se
 * meta adelante sola.
 */
export async function registrarMedia({
  propiedadId,
  ruta,
  kind,
  alt,
}: {
  propiedadId: string;
  ruta: string;
  kind: 'image' | 'video';
  alt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const { data: ultimas } = await supabase
    .from('property_media')
    .select('sort_order')
    .eq('property_id', propiedadId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const siguiente = (ultimas?.[0]?.sort_order ?? -1) + 1;
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(ruta);

  const { error } = await supabase.from('property_media').insert({
    property_id: propiedadId,
    url: pub.publicUrl,
    storage_path: ruta,
    kind,
    alt,
    sort_order: siguiente,
  });

  if (error) {
    console.error('[subir] registrarMedia:', error.message);
    return { ok: false, error: 'Se subió el archivo pero no pudimos guardarlo. Tocá “Reintentar”.' };
  }
  return { ok: true };
}

/** Borra un objeto del bucket. Se usa si el insert falla después de subir. */
export async function borrarDelBucket(ruta: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.storage.from(BUCKET).remove([ruta]);
  if (error) console.error('[subir] borrarDelBucket:', error.message);
}
