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
import { PROPERTY_SELECT, mapDbToProduct, mapDbToProducts } from './mapProperty';

/** Cabecera de cache que pide el plan v5 §7/Fase 3. */
export const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

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
  const { data, error } = await supabaseServer
    .from('properties')
    .select(PROPERTY_SELECT)
    .eq('published', true);

  if (error) {
    console.error('[properties] getPublishedProducts:', error.message);
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
  const { data, error } = await supabaseServer
    .from('properties')
    .select(PROPERTY_SELECT)
    .eq('published', true)
    .eq('legacy_id', legacyId)
    .maybeSingle();

  if (error) {
    console.error('[properties] getProductByLegacyId:', error.message);
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
