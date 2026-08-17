/**
 * Alta y edición de propiedades (Fase 6b).
 *
 * Los campos que todavía no tienen formulario —numéricos, servicios,
 * adicionales, dirección, mapa— **no se tocan**: se guardan solo las claves que
 * la pantalla realmente maneja. Así, editar una propiedad existente desde el
 * formulario de 6b no borra los datos que cargó la migración.
 */
import { supabase } from '../supabase';
import { slugify } from '../zonas';

/** El bloque que hoy está repetido, palabra por palabra, en 10 propiedades. */
export const REQUISITOS_ESTANDAR =
  'Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.';

export type DatosBasicos = {
  name: string;
  description: string;
  requisitos: string;
  operation: 'alquiler' | 'venta';
  property_type_id: number | null;
  localidad_id: number | null;
  neighborhood_id: number | null;
  price: number | null;
  show_price: boolean;
  price_from: boolean;

  // --- Numéricos (Fase 6c) ---
  // Ya convertidos por `tri-estado.ts`: acá llegan como número o NULL, que es
  // exactamente lo que va a la base. `0` significa "no tiene" y NO es lo mismo
  // que `null`.
  ambientes: number | null;
  dormitorios: number | null;
  banos: number | null;
  cocheras: number | null;
  expensas: number | null;
  superficie_m2: number | null;
  frente_m: number | null;
  fondo_m: number | null;
};

/** Las claves numéricas, para leerlas de vuelta después de guardar. */
export const CLAVES_NUMERICAS = [
  'ambientes',
  'dormitorios',
  'banos',
  'cocheras',
  'expensas',
  'superficie_m2',
  'frente_m',
  'fondo_m',
] as const;

export type PropiedadEdicion = DatosBasicos & {
  id: string;
  legacy_id: number | null;
  published: boolean;
};

/**
 * Un slug único a partir del título.
 *
 * `slug` es `not null unique`, así que no se puede dejar librado al azar. Se
 * consultan los existentes y se agrega un sufijo si hace falta. La dueña nunca
 * ve esto: escribe el título y listo.
 */
async function slugUnico(titulo: string, idActual?: string): Promise<string> {
  const raiz = slugify(titulo) || 'propiedad';
  if (!supabase) return raiz;

  const { data } = await supabase.from('properties').select('id, slug').like('slug', `${raiz}%`);
  const tomados = new Set(
    (data ?? []).filter((r: any) => r.id !== idActual).map((r: any) => r.slug)
  );

  if (!tomados.has(raiz)) return raiz;
  let n = 2;
  while (tomados.has(`${raiz}-${n}`)) n++;
  return `${raiz}-${n}`;
}

/** Solo se valida lo mínimo: título y operación. Todo lo demás puede ir vacío. */
export function validar(d: DatosBasicos): string | null {
  if (!d.name.trim()) return 'Ponele un título a la propiedad.';
  if (d.operation !== 'alquiler' && d.operation !== 'venta') {
    return 'Elegí si es para alquilar o para vender.';
  }
  return null;
}

export async function obtenerPropiedad(id: string): Promise<
  { ok: true; propiedad: PropiedadEdicion } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const { data, error } = await supabase
    .from('properties')
    // Literal y no concatenado: supabase-js infiere el tipo del resultado a
    // partir del texto del select, y una cadena armada en tiempo de ejecución le
    // hace perder la inferencia entera.
    .select(
      'id, legacy_id, name, description, requisitos, operation, property_type_id, localidad_id, neighborhood_id, price, show_price, price_from, published, ambientes, dormitorios, banos, cocheras, expensas, superficie_m2, frente_m, fondo_m'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[admin] obtenerPropiedad:', error.message);
    return { ok: false, error: 'No pudimos traer la propiedad.' };
  }
  if (!data) return { ok: false, error: 'Esa propiedad no existe o fue eliminada.' };

  return {
    ok: true,
    propiedad: {
      id: data.id,
      legacy_id: data.legacy_id ?? null,
      name: data.name ?? '',
      description: data.description ?? '',
      requisitos: data.requisitos ?? '',
      operation: data.operation,
      property_type_id: data.property_type_id ?? null,
      localidad_id: data.localidad_id ?? null,
      neighborhood_id: data.neighborhood_id ?? null,
      price: data.price === null || data.price === undefined ? null : Number(data.price),
      show_price: data.show_price !== false,
      price_from: data.price_from === true,
      published: data.published === true,

      // `?? null` y no `|| null`: un 0 legítimo ("no tiene") no puede
      // convertirse en null acá, que es la trampa de que 0 sea falsy.
      ambientes: data.ambientes ?? null,
      dormitorios: data.dormitorios ?? null,
      banos: data.banos ?? null,
      cocheras: data.cocheras ?? null,
      expensas: data.expensas === null || data.expensas === undefined ? null : Number(data.expensas),
      superficie_m2:
        data.superficie_m2 === null || data.superficie_m2 === undefined
          ? null
          : Number(data.superficie_m2),
      frente_m: data.frente_m === null || data.frente_m === undefined ? null : Number(data.frente_m),
      fondo_m: data.fondo_m === null || data.fondo_m === undefined ? null : Number(data.fondo_m),
    },
  };
}

function aFila(d: DatosBasicos, slug: string) {
  return {
    slug,
    name: d.name.trim(),
    description: d.description,
    // Vacío se guarda como NULL, no como cadena vacía: "no cargado" y "cargado
    // vacío" tienen que ser lo mismo en la base.
    requisitos: d.requisitos.trim() || null,
    operation: d.operation,
    property_type_id: d.property_type_id,
    localidad_id: d.localidad_id,
    neighborhood_id: d.neighborhood_id,
    price: d.price,
    show_price: d.show_price,
    price_from: d.price_from,

    // Van tal cual: `tri-estado.ts` ya decidió entre número y NULL, y un 0
    // significa "no tiene". No se filtran ni se normalizan de nuevo acá.
    ambientes: d.ambientes,
    dormitorios: d.dormitorios,
    banos: d.banos,
    cocheras: d.cocheras,
    expensas: d.expensas,
    superficie_m2: d.superficie_m2,
    frente_m: d.frente_m,
    fondo_m: d.fondo_m,
  };
}

/** Alta. Siempre como BORRADOR: publicar es un botón aparte y explícito. */
export async function crearPropiedad(d: DatosBasicos) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };

  const problema = validar(d);
  if (problema) return { ok: false as const, error: problema };

  const slug = await slugUnico(d.name);
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...aFila(d, slug), published: false })
    .select('id')
    .single();

  if (error) {
    console.error('[admin] crearPropiedad:', error.message);
    return { ok: false as const, error: 'No pudimos guardar la propiedad. Probá de nuevo.' };
  }
  return { ok: true as const, id: data.id as string };
}

export async function actualizarPropiedad(id: string, d: DatosBasicos) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };

  const problema = validar(d);
  if (problema) return { ok: false as const, error: problema };

  const slug = await slugUnico(d.name, id);
  const { error } = await supabase.from('properties').update(aFila(d, slug)).eq('id', id);

  if (error) {
    console.error('[admin] actualizarPropiedad:', error.message);
    return { ok: false as const, error: 'No pudimos guardar los cambios. Probá de nuevo.' };
  }
  return { ok: true as const };
}
