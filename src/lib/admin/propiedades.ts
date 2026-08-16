/**
 * Acceso a propiedades desde el PANEL (Fase 6).
 *
 * Corre en el browser con la sesión de la dueña, no con `supabase-server`. Eso
 * es a propósito: la policy "admin gestiona propiedades" da acceso total a un
 * `authenticated` que esté en `admins`, y ese contexto solo existe del lado del
 * cliente, donde vive la sesión.
 *
 * Consecuencia práctica: **acá sí se ven las propiedades sin publicar**, a
 * diferencia del sitio público, que solo ve `published = true`. Lo que hace la
 * diferencia es quién pregunta, no la consulta.
 *
 * Ninguna función tira: devuelven `{ ok, ... }` para que la pantalla pueda
 * mostrar un error entendible en vez de romperse.
 */
import { supabase } from '../supabase';

export type EstadoPropiedad = 'disponible' | 'alquilada' | 'vendida';

export type PropiedadListado = {
  id: string;
  legacy_id: number | null;
  slug: string;
  name: string;
  operation: 'alquiler' | 'venta';
  price: number | null;
  show_price: boolean;
  published: boolean;
  estado: EstadoPropiedad;
  sort_order: number;
  updated_at: string;
  tipo: string | null;
  localidad: string | null;
  barrio: string | null;
  hide_location: boolean;
  portada: string | null;
};

const SELECT_LISTADO = `
  id, legacy_id, slug, name, operation, price, show_price, published, estado,
  sort_order, updated_at, hide_location,
  property_types ( label ),
  localidades ( label ),
  neighborhoods ( label ),
  property_media ( url, sort_order )
`;

/**
 * ¿Existe ya la columna `estado`?
 *
 * La agrega `scripts/fase6-estado-propiedad.sql`, que corre el dev a mano en
 * Supabase. Mientras no se haya corrido, pedir esa columna hace fallar TODA la
 * consulta y el listado quedaría en blanco. Preguntamos una vez y, si no está,
 * el listado sigue andando sin la parte de estado.
 */
let columnaEstado: boolean | null = null;

export async function hayColumnaEstado(): Promise<boolean> {
  if (columnaEstado !== null) return columnaEstado;
  if (!supabase) return false;
  const { error } = await supabase.from('properties').select('estado').limit(1);
  columnaEstado = !error;
  if (error) {
    console.warn(
      '[admin] la columna `estado` todavía no existe. ' +
        'Corré scripts/fase6-estado-propiedad.sql en el SQL Editor de Supabase.'
    );
  }
  return columnaEstado;
}

function mapear(row: any, conEstado: boolean): PropiedadListado {
  const medias = [...(row.property_media ?? [])].sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  return {
    id: row.id,
    legacy_id: row.legacy_id ?? null,
    slug: row.slug,
    name: row.name ?? '',
    operation: row.operation,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    show_price: row.show_price !== false,
    published: row.published === true,
    estado: conEstado ? (row.estado ?? 'disponible') : 'disponible',
    sort_order: row.sort_order ?? 0,
    updated_at: row.updated_at,
    tipo: row.property_types?.label ?? null,
    localidad: row.localidades?.label ?? null,
    barrio: row.neighborhoods?.label ?? null,
    hide_location: row.hide_location === true,
    portada: medias[0]?.url ?? null,
  };
}

export async function listarPropiedades(): Promise<
  { ok: true; propiedades: PropiedadListado[]; conEstado: boolean } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const conEstado = await hayColumnaEstado();
  const select = conEstado ? SELECT_LISTADO : SELECT_LISTADO.replace(', estado', '');

  const { data, error } = await supabase
    .from('properties')
    .select(select)
    .order('sort_order', { ascending: true })
    .order('legacy_id', { ascending: true });

  if (error) {
    console.error('[admin] listarPropiedades:', error.message);
    return { ok: false, error: 'No pudimos traer las propiedades. Probá recargar la página.' };
  }

  return { ok: true, propiedades: (data ?? []).map((r) => mapear(r, conEstado)), conEstado };
}

/** Publica o despublica. Devuelve el estado que quedó. */
export async function cambiarPublicado(id: string, publicado: boolean) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };

  const { error } = await supabase.from('properties').update({ published: publicado }).eq('id', id);
  if (error) {
    console.error('[admin] cambiarPublicado:', error.message);
    return { ok: false as const, error: 'No pudimos guardar el cambio. Probá de nuevo.' };
  }
  return { ok: true as const };
}

export async function cambiarEstado(id: string, estado: EstadoPropiedad) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };

  const { error } = await supabase.from('properties').update({ estado }).eq('id', id);
  if (error) {
    console.error('[admin] cambiarEstado:', error.message);
    return { ok: false as const, error: 'No pudimos guardar el estado. Probá de nuevo.' };
  }
  return { ok: true as const };
}
