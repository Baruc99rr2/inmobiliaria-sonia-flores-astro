/**
 * Helpers de zona para el filtro de búsqueda (Fase 3).
 *
 * El filtro pasó a comparar por slug en vez de por el texto visible. Las
 * propiedades que vienen de Supabase ya traen `detalles.localidad_slug` y
 * `detalles.barrio_slug` puestos por el adaptador.
 *
 * Pero el fallback de `data.jsx` no los tiene: ahí solo existe `detalles.barrio`
 * como texto ('Barrio Centro', 'Palpalá', 'A consultar'). Estas funciones
 * derivan el slug de ese texto aplicando la misma regla §2.1 que usó el script
 * de migración, para que el filtro funcione igual con las dos fuentes.
 */

/** 'Barrio Los Perales' -> 'barrio-los-perales'. Sin tildes, sin mayúsculas. */
export function slugify(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    // Saca los diacríticos que NFD dejó sueltos (la tilde de "Palpalá", la
    // virgulilla de "ñ"). Sin esto, "Peña" daría "pen-a" en vez de "pena".
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Devuelve `{ localidad, barrio }` en slugs para una propiedad, venga de donde
 * venga.
 *
 * Si el objeto trae los slugs del adaptador, se usan tal cual. Si no, se derivan
 * del texto legacy con la regla §2.1:
 *
 *   'Barrio X'     -> localidad san-salvador-de-jujuy, barrio x
 *   'A consultar'  -> localidad san-salvador-de-jujuy, barrio null (oculto)
 *   cualquier otro -> localidad = ese valor, barrio null
 */
export function zonaDeProducto(detalles) {
  const d = detalles ?? {};

  // Camino normal: los datos vienen de Supabase.
  if (d.localidad_slug !== undefined || d.barrio_slug !== undefined) {
    return { localidad: d.localidad_slug ?? null, barrio: d.barrio_slug ?? null };
  }

  // Fallback: derivar del texto de data.jsx.
  const texto = String(d.barrio ?? '').trim();
  if (!texto) return { localidad: null, barrio: null };

  if (/^a consultar$/i.test(texto)) {
    return { localidad: 'san-salvador-de-jujuy', barrio: null };
  }
  if (/^barrio\s+/i.test(texto)) {
    return {
      localidad: 'san-salvador-de-jujuy',
      barrio: slugify(texto.replace(/^barrio\s+/i, '')),
    };
  }
  return { localidad: slugify(texto), barrio: null };
}

/** Slug del tipo de propiedad, del adaptador o derivado del texto legacy. */
export function tipoDeProducto(detalles) {
  const d = detalles ?? {};
  return d.tipo_slug ?? (d.tipo ? slugify(d.tipo) : null);
}

/**
 * Arma las listas de los `<select>`.
 *
 * Con catálogos de la base se usan esos, que es lo que hace que un barrio nuevo
 * cargado desde el panel aparezca solo en el filtro. Sin catálogos (fallback),
 * se derivan de las propiedades que haya para que el filtro siga sirviendo.
 */
export function construirOpciones(catalogos, products) {
  if (catalogos?.localidades?.length) {
    return {
      localidades: catalogos.localidades,
      barrios: catalogos.barrios ?? [],
      tipos: catalogos.tipos ?? [],
    };
  }

  const localidades = new Map();
  const barrios = new Map();
  const tipos = new Map();

  for (const p of products ?? []) {
    const d = p?.detalles ?? {};
    const { localidad, barrio } = zonaDeProducto(d);

    if (localidad && !localidades.has(localidad)) {
      const texto = String(d.barrio ?? '');
      const esBarrioDeSSJ = /^barrio\s+/i.test(texto) || /^a consultar$/i.test(texto);
      localidades.set(localidad, {
        slug: localidad,
        label: esBarrioDeSSJ ? 'San Salvador de Jujuy' : texto,
      });
    }

    if (barrio && !barrios.has(barrio)) {
      barrios.set(barrio, {
        slug: barrio,
        label: String(d.barrio ?? '').replace(/^barrio\s+/i, ''),
        localidad_slug: localidad,
      });
    }

    const tipoSlug = tipoDeProducto(d);
    if (tipoSlug && !tipos.has(tipoSlug)) {
      tipos.set(tipoSlug, { slug: tipoSlug, label: d.tipo });
    }
  }

  const porLabel = (a, b) => a.label.localeCompare(b.label, 'es');
  return {
    localidades: [...localidades.values()].sort(porLabel),
    barrios: [...barrios.values()].sort(porLabel),
    tipos: [...tipos.values()].sort(porLabel),
  };
}
