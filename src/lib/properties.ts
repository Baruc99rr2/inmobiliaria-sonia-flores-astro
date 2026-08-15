/**
 * Acceso a datos del sitio público (Fase 3).
 *
 * Las tres páginas (`/`, `/busqueda`, `/propiedades/[id]`) leen de acá en vez de
 * repetir la misma consulta tres veces.
 *
 * Todo pasa por `supabaseServer`, que usa la publishable key: lo que decide qué
 * se ve es RLS, no este archivo. La policy de la Fase 1 solo deja leer
 * propiedades con `published = true`, así que el `.eq('published', true)` de
 * abajo es redundante a propósito — es defensa en profundidad, no la barrera.
 *
 * Ninguna función tira: si Supabase falla, devuelven `null` y la página cae al
 * fallback de `data.jsx`. Un error de red no puede dejar el sitio en blanco.
 */
import { supabaseServer } from './supabase-server';
import { diagnosticarErrorDeConsulta } from './debug-env';
import { PROPERTY_SELECT, mapDbToProduct, mapDbToProducts } from './mapProperty';

/**
 * Cabecera de cache que pide el plan v5 §7/Fase 3.
 *
 * OJO con lo que se ve en el browser: Vercel **normaliza este header**. Su
 * documentación dice que "if you set Cache-Control without a CDN-Cache-Control,
 * the Vercel CDN strips s-maxage and stale-while-revalidate from the response
 * before sending it to the browser". O sea que el CDN consume las directivas y
 * al cliente le llega `cache-control: public` a secas. El cacheo funciona igual
 * — se comprueba con `x-vercel-cache: HIT` y el header `age` —, pero NO sirve
 * mirar `cache-control` para saber si la página leyó de Supabase.
 *
 * Para eso está `X-Datos-Origen`, más abajo.
 */
export const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

/** Header propio para saber de dónde salieron los datos. Vercel no lo toca. */
export const HEADER_ORIGEN = 'X-Datos-Origen';
export const ORIGEN_SUPABASE = 'supabase';
export const ORIGEN_FALLBACK = 'fallback-data-jsx';

export type Catalogos = {
  localidades: { slug: string; label: string }[];
  barrios: { slug: string; label: string; localidad_slug: string }[];
  tipos: { slug: string; label: string }[];
};

/**
 * Todas las propiedades publicadas, ya mapeadas al shape legacy.
 * Devuelve `null` si la consulta falla, para que la página use el fallback.
 */
export async function getPublishedProducts() {
  // Sin credenciales no hay cliente. Se trata igual que una consulta fallida:
  // la página cae al fallback en vez de reventar con 500.
  if (!supabaseServer) return null;

  const { data, error } = await supabaseServer
    .from('properties')
    .select(PROPERTY_SELECT)
    .eq('published', true);

  if (error) {
    console.error('[properties] getPublishedProducts:', error.message);
    diagnosticarErrorDeConsulta('getPublishedProducts', error.message);
    return null;
  }
  if (!data || data.length === 0) {
    console.error('[properties] getPublishedProducts: sin filas');
    return null;
  }

  return mapDbToProducts(data);
}

/**
 * Una propiedad por su `legacy_id` (el id que sigue viviendo en la URL).
 *
 * Distingue a propósito dos casos que NO son lo mismo:
 *
 *   { ok: true,  product: {...} }  la propiedad existe y está publicada
 *   { ok: true,  product: null  }  la consulta anduvo y esa propiedad no existe
 *                                  -> 404 legítimo
 *   { ok: false, product: null  }  la consulta falló (Supabase caído, red, RLS)
 *                                  -> NO es un 404: hay que caer al fallback
 *
 * Sin esta distinción, un corte de Supabase devolvería 404 en las 19 fichas y le
 * estaría diciendo al buscador que las propiedades dejaron de existir.
 */
export async function getProductByLegacyId(legacyId: number) {
  // Sin credenciales: no es un 404, es una falla. Que caiga al fallback.
  if (!supabaseServer) return { ok: false, product: null };

  const { data, error } = await supabaseServer
    .from('properties')
    .select(PROPERTY_SELECT)
    .eq('published', true)
    .eq('legacy_id', legacyId)
    .maybeSingle();

  if (error) {
    console.error('[properties] getProductByLegacyId:', error.message);
    diagnosticarErrorDeConsulta('getProductByLegacyId', error.message);
    return { ok: false, product: null };
  }

  return { ok: true, product: data ? mapDbToProduct(data) : null };
}

/**
 * Catálogos que alimentan los `<select>` de la búsqueda.
 *
 * Antes las listas estaban hardcodeadas en dos componentes distintos y
 * divergentes entre sí. Ahora salen de la base, así que un barrio nuevo cargado
 * desde el panel aparece solo en el filtro.
 *
 * Devuelve `null` si falla: la búsqueda entonces arma las opciones a partir de
 * las propiedades que tenga a mano.
 */
export async function getCatalogos(): Promise<Catalogos | null> {
  if (!supabaseServer) return null;

  const [locs, barrios, tipos] = await Promise.all([
    supabaseServer.from('localidades').select('slug, label').eq('active', true).order('label'),
    supabaseServer
      .from('neighborhoods')
      .select('slug, label, localidades ( slug )')
      .eq('active', true)
      .order('label'),
    supabaseServer
      .from('property_types')
      .select('slug, label')
      .eq('active', true)
      .order('sort_order'),
  ]);

  if (locs.error || barrios.error || tipos.error) {
    console.error(
      '[properties] getCatalogos:',
      locs.error?.message ?? barrios.error?.message ?? tipos.error?.message
    );
    return null;
  }

  return {
    localidades: locs.data ?? [],
    barrios: (barrios.data ?? []).map((b: any) => ({
      slug: b.slug,
      label: b.label,
      localidad_slug: b.localidades?.slug ?? null,
    })),
    tipos: tipos.data ?? [],
  };
}
