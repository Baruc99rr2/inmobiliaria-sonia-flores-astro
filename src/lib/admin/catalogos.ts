/**
 * Catálogos del panel: tipos de propiedad, localidades y barrios (Fase 6b).
 *
 * Se leen y se escriben con la sesión de la dueña. La policy "admin gestiona
 * tipos / localidades / barrios" le da acceso total, así que puede agregar una
 * entrada nueva desde el formulario sin pasar por el desarrollador.
 *
 * Los slugs se generan acá a partir de la etiqueta que escribe ella. Nunca se le
 * pide escribir un slug: es un detalle técnico que no tiene por qué conocer.
 */
import { supabase } from '../supabase';
import { slugify } from '../zonas';

export type Tipo = { id: number; slug: string; label: string };
export type Localidad = { id: number; slug: string; label: string };
export type Barrio = { id: number; localidad_id: number; slug: string; label: string };
export type Servicio = { id: number; slug: string; label: string };

export type Catalogos = {
  tipos: Tipo[];
  localidades: Localidad[];
  barrios: Barrio[];
  servicios: Servicio[];
};

export async function cargarCatalogos(): Promise<
  { ok: true; catalogos: Catalogos } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const [t, l, b, s] = await Promise.all([
    supabase.from('property_types').select('id, slug, label').eq('active', true).order('sort_order'),
    supabase.from('localidades').select('id, slug, label').eq('active', true).order('label'),
    supabase
      .from('neighborhoods')
      .select('id, localidad_id, slug, label')
      .eq('active', true)
      .order('label'),
    supabase.from('services').select('id, slug, label').eq('active', true).order('sort_order'),
  ]);

  if (t.error || l.error || b.error || s.error) {
    console.error(
      '[admin] cargarCatalogos:',
      t.error?.message ?? l.error?.message ?? b.error?.message ?? s.error?.message
    );
    return { ok: false, error: 'No pudimos traer las listas de tipos, localidades y barrios.' };
  }

  return {
    ok: true,
    catalogos: {
      tipos: (t.data ?? []) as Tipo[],
      localidades: (l.data ?? []) as Localidad[],
      barrios: (b.data ?? []) as Barrio[],
      servicios: (s.data ?? []) as Servicio[],
    },
  };
}

/**
 * Genera un slug libre, agregándole un sufijo si ya existe.
 *
 * Hace falta porque `slug` es único en las tres tablas. Sin esto, agregar un
 * barrio "Centro" cuando ya hay uno en otra localidad tiraría un error de clave
 * duplicada que la dueña no puede interpretar.
 */
function slugLibre(base: string, usados: Set<string>): string {
  const raiz = slugify(base) || 'sin-nombre';
  if (!usados.has(raiz)) return raiz;
  let n = 2;
  while (usados.has(`${raiz}-${n}`)) n++;
  return `${raiz}-${n}`;
}

export async function agregarTipo(label: string, usados: string[]) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };
  const limpio = label.trim();
  if (!limpio) return { ok: false as const, error: 'Escribí un nombre.' };

  const slug = slugLibre(limpio, new Set(usados));
  // `legacy_label` existe para no romper el filtro del sitio, que compara por
  // igualdad estricta. Para un tipo nuevo no hay nada heredado: es el mismo texto.
  const { data, error } = await supabase
    .from('property_types')
    .insert({ slug, label: limpio, legacy_label: limpio, sort_order: 99, active: true })
    .select('id, slug, label')
    .single();

  if (error) {
    console.error('[admin] agregarTipo:', error.message);
    return { ok: false as const, error: 'No pudimos agregar el tipo. Probá de nuevo.' };
  }
  return { ok: true as const, tipo: data as Tipo };
}

export async function agregarLocalidad(label: string, usados: string[]) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };
  const limpio = label.trim();
  if (!limpio) return { ok: false as const, error: 'Escribí un nombre.' };

  const slug = slugLibre(limpio, new Set(usados));
  const { data, error } = await supabase
    .from('localidades')
    .insert({ slug, label: limpio, active: true })
    .select('id, slug, label')
    .single();

  if (error) {
    console.error('[admin] agregarLocalidad:', error.message);
    return { ok: false as const, error: 'No pudimos agregar la localidad. Probá de nuevo.' };
  }
  return { ok: true as const, localidad: data as Localidad };
}

export async function agregarBarrio(label: string, localidadId: number, usados: string[]) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };
  const limpio = label.trim();
  if (!limpio) return { ok: false as const, error: 'Escribí un nombre.' };
  if (!localidadId) return { ok: false as const, error: 'Elegí primero la localidad.' };

  const slug = slugLibre(limpio, new Set(usados));
  const { data, error } = await supabase
    .from('neighborhoods')
    .insert({ slug, label: limpio, localidad_id: localidadId, active: true })
    .select('id, localidad_id, slug, label')
    .single();

  if (error) {
    console.error('[admin] agregarBarrio:', error.message);
    return { ok: false as const, error: 'No pudimos agregar el barrio. Probá de nuevo.' };
  }
  return { ok: true as const, barrio: data as Barrio };
}
