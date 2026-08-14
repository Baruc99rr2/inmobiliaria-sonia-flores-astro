#!/usr/bin/env node
/**
 * Migración de src/data.jsx -> Supabase.
 *
 * Idempotente: se puede correr N veces y el resultado es el mismo. La clave es
 * `legacy_id`, que tiene UNIQUE en la tabla `properties`.
 *
 * Aplica el plan v5 §2.1 (regla barrio -> localidad) y §5.4 (conversiones
 * numéricas). El criterio de aceptación es la tabla de §5.5.
 *
 * Uso:
 *   node scripts/migrate-data.mjs --dry-run   # no toca la base, imprime todo
 *   node scripts/migrate-data.mjs --check     # dry-run + tabla de aceptación §5.5
 *   node scripts/migrate-data.mjs             # migra de verdad
 *   node scripts/migrate-data.mjs --verify    # lee de la base y compara con §5.5
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY (la secret key), que saltea RLS. Corre solo en
 * la máquina del dev: nunca se despliega.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run') || args.has('--check');
const CHECK = args.has('--check');
const VERIFY = args.has('--verify');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** "Barrio Los Perales" -> "los-perales" (sin tildes, sin el prefijo). */
function slugify(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * §5.4 — Medidas: superficie_m2 / frente_m / fondo_m
 *   0, "", "a consultar", ausente -> NULL
 *   "180", 640, 200000            -> el número
 *
 * El check `medidas_sin_cero` de la tabla rechaza el 0, así que esto no es
 * cosmético: mandar 0 rompería el insert.
 */
function medida(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string' && valor.trim() === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null; // cubre "a consultar" -> NaN
  return n;
}

/**
 * §5.4 — Contables: ambientes / dormitorios / banos / cocheras
 *   0       -> 0     (se conserva: significa "No tiene")
 *   ausente -> NULL  ("A consultar")
 */
function contable(valor) {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * §5.4 — Precio: "A consultar" -> NULL. NUNCA 0 (regla dura 11).
 */
function precio(valor) {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Un archivo es video si termina en .mp4/.mov/.webm, igual que en el frontend. */
function esVideo(url) {
  const u = String(url).toLowerCase();
  return u.endsWith('.mp4') || u.endsWith('.mov') || u.endsWith('.webm');
}

// ---------------------------------------------------------------------------
// §2.1 — Regla barrio -> localidad
// ---------------------------------------------------------------------------
const LOCALIDAD_POR_DEFECTO = 'san-salvador-de-jujuy';

function resolverUbicacion(barrioLegacy) {
  const valor = String(barrioLegacy ?? '').trim();

  // Ubicación reservada a propósito (ids 12 y 19).
  if (valor.toLowerCase() === 'a consultar') {
    return { localidad: LOCALIDAD_POR_DEFECTO, barrio: null, hide_location: true };
  }

  // "Barrio X" -> San Salvador de Jujuy, barrio = X
  if (/^barrio\s+/i.test(valor)) {
    return {
      localidad: LOCALIDAD_POR_DEFECTO,
      barrio: slugify(valor.replace(/^barrio\s+/i, '')),
      hide_location: false,
    };
  }

  // Cualquier otro caso: el valor es la localidad y no hay barrio.
  return { localidad: slugify(valor), barrio: null, hide_location: false };
}

// ---------------------------------------------------------------------------
// Lectura de data.jsx
// ---------------------------------------------------------------------------
/**
 * data.jsx no tiene sintaxis JSX (son objetos planos), pero Node no importa la
 * extensión .jsx. Lo leemos como texto y lo evaluamos como módulo ESM vía
 * data: URL, sin escribir archivos temporales.
 */
async function leerDataJsx() {
  const ruta = path.join(RAIZ, 'src', 'data.jsx');
  const fuente = await readFile(ruta, 'utf8');
  const url = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(fuente);
  const modulo = await import(url);
  if (!Array.isArray(modulo.productsData)) {
    throw new Error('No pude leer productsData de src/data.jsx');
  }
  return modulo.productsData;
}

// ---------------------------------------------------------------------------
// Transformación
// ---------------------------------------------------------------------------
function construirFilas(productsData) {
  const slugsUsados = new Map();

  return productsData.map((p, indice) => {
    const d = p.detalles ?? {};
    const ubicacion = resolverUbicacion(d.barrio);

    // Slug único y determinista: mismo input, mismo output en cada corrida.
    let slug = slugify(p.name);
    if (slugsUsados.has(slug)) slug = `${slug}-${p.id}`;
    slugsUsados.set(slug, true);

    const ocultaUbicacion = ubicacion.hide_location;

    // "Precios desde $200.000" (id 18). Se detecta por texto, no por id.
    const priceFrom = /precios?\s+desde/i.test(p.description ?? '');

    return {
      legacy_id: p.id,
      slug,
      name: p.name ?? '',
      // La descripción se migra INTACTA. El bloque de requisitos queda adentro
      // a propósito: ningún componente lee la columna `requisitos`, así que
      // extraerlo ahora borraría ese texto de la vista pública en la Fase 3.
      // Se separa en la Fase 6, cuando el panel tenga el campo.
      description: p.description ?? '',
      requisitos: null,

      operation: p.category === 'Alquiler' ? 'alquiler' : 'venta',
      tipo_legacy_label: d.tipo ?? null,
      localidad_slug: ubicacion.localidad,
      neighborhood_slug: ubicacion.barrio,

      price: precio(p.price),
      show_price: true,
      price_from: priceFrom,
      currency: 'ARS',

      // Con la ubicación oculta no guardamos el centinela 'A consultar' en la
      // columna de texto: eso reproduciría el bug del §12.3. La columna queda
      // vacía y hide_location es lo que manda. El adaptador reconstruye el
      // 'A consultar' que el frontend espera hoy.
      calle: ocultaUbicacion ? '' : (d.calle ?? ''),
      numero: ocultaUbicacion ? '' : (d.numero ?? ''),
      show_exact_address: Boolean(d.mostrarDireccionExacta),
      hide_location: ocultaUbicacion,

      ambientes: contable(d.ambientes),
      dormitorios: contable(d.dormitorios),
      banos: contable(d.banos),
      cocheras: contable(d.cocheras),
      // §2.3: los 0 de expensas parecen relleno automático, no una afirmación
      // de "sin expensas". Se migran como NULL.
      expensas: null,

      superficie_m2: medida(d.superficie_m2),
      frente_m: medida(d.frente_m),
      fondo_m: medida(d.fondo_m),

      lat: d.lat ?? null,
      lon: d.lon ?? null,
      mapa_query: d.mapaQuery ?? null,

      adicionales: Array.isArray(d.adicionales) ? d.adicionales : [],

      published: true,
      featured: false,
      sort_order: indice,

      // Auxiliares: no son columnas, se usan para las tablas hijas.
      _servicios: (Array.isArray(d.servicios) ? d.servicios : [])
        .map((s) => slugify(s))
        // 'A consultar' no es un servicio (§5.3): se traduce a array vacío.
        .filter((s) => s && s !== 'a-consultar'),
      _media: (Array.isArray(p.images) ? p.images : []).map((url, i) => ({
        url,
        kind: esVideo(url) ? 'video' : 'image',
        sort_order: i,
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// Validaciones previas (corren también en dry-run)
// ---------------------------------------------------------------------------
function validar(filas) {
  const problemas = [];

  for (const f of filas) {
    if (!f.name) problemas.push(`id ${f.legacy_id}: sin título`);
    if (!f.operation) problemas.push(`id ${f.legacy_id}: sin operación`);
    if (!f.tipo_legacy_label) problemas.push(`id ${f.legacy_id}: sin tipo`);

    // La convención que asumen tres componentes del sitio.
    if (f._media.length > 0 && f._media[0].kind !== 'image') {
      problemas.push(
        `id ${f.legacy_id}: el primer elemento de images es VIDEO (${f._media[0].url}). ` +
          'Tres componentes hacen images[0] sin filtrar y mostrarían una imagen rota.'
      );
    }
    if (f._media.length === 0) {
      problemas.push(`id ${f.legacy_id}: sin imágenes`);
    }

    // El check medidas_sin_cero rechazaría estos.
    for (const campo of ['superficie_m2', 'frente_m', 'fondo_m']) {
      if (f[campo] !== null && !(f[campo] > 0)) {
        problemas.push(`id ${f.legacy_id}: ${campo} = ${f[campo]} (debe ser NULL o > 0)`);
      }
    }
    if (f.price !== null && !(f.price > 0)) {
      problemas.push(`id ${f.legacy_id}: price = ${f.price} (debe ser NULL o > 0)`);
    }
  }

  const slugs = filas.map((f) => f.slug);
  const repetidos = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (repetidos.length) problemas.push(`slugs repetidos: ${[...new Set(repetidos)].join(', ')}`);

  return problemas;
}

// ---------------------------------------------------------------------------
// Tabla de aceptación §5.5
// ---------------------------------------------------------------------------
const ESPERADO_55 = {
  1:  { price: 480000, tipo: 'departamento', loc: 'san-salvador-de-jujuy', barrio: 'los-perales',    serv: [] },
  2:  { price: null,   tipo: 'casa',         loc: 'san-salvador-de-jujuy', barrio: 'centro',         serv: [] },
  3:  { price: 650000, tipo: 'local',        loc: 'palpala',               barrio: null,             serv: [] },
  4:  { price: null,   tipo: 'oficina',      loc: 'san-salvador-de-jujuy', barrio: 'centro',         serv: ['agua','cloaca','luz'] },
  5:  { price: null,   tipo: 'galpon',       loc: 'san-salvador-de-jujuy', barrio: 'alto-comedero',  serv: ['agua','cloaca','luz','pavimento'] },
  6:  { price: null,   tipo: 'departamento', loc: 'san-salvador-de-jujuy', barrio: 'centro',         serv: ['agua','cloaca','gas','luz','pavimento'] },
  7:  { price: 400000, tipo: 'departamento', loc: 'san-salvador-de-jujuy', barrio: 'cuyaya',         serv: ['agua','cloaca','gas','luz','pavimento'] },
  8:  { price: 350000, tipo: 'oficina',      loc: 'san-salvador-de-jujuy', barrio: 'centro',         serv: ['agua','luz','wifi'] },
  9:  { price: 700000, tipo: 'departamento', loc: 'san-salvador-de-jujuy', barrio: 'los-perales',    serv: ['agua','cloaca','gas','luz','pavimento'] },
  10: { price: null,   tipo: 'casa',         loc: 'san-salvador-de-jujuy', barrio: 'chijra',         serv: ['agua','cloaca','gas','luz','pavimento'] },
  11: { price: null,   tipo: 'terreno',      loc: 'san-antonio',           barrio: null,             serv: [] },
  12: { price: 580000, tipo: 'casa',         loc: 'san-salvador-de-jujuy', barrio: null,             serv: ['agua','gas','luz'], hide: true },
  13: { price: null,   tipo: 'local',        loc: 'san-salvador-de-jujuy', barrio: 'almirante-brown',serv: ['agua','luz'] },
  14: { price: null,   tipo: 'nave',         loc: 'san-salvador-de-jujuy', barrio: 'san-pedrito',    serv: ['agua'] },
  15: { price: 620000, tipo: 'departamento', loc: 'san-salvador-de-jujuy', barrio: 'gorriti',        serv: [] },
  16: { price: null,   tipo: 'departamento', loc: 'san-salvador-de-jujuy', barrio: 'centro',         serv: ['agua','cloaca','gas','luz','pavimento','wifi'] },
  17: { price: null,   tipo: 'departamento', loc: 'san-salvador-de-jujuy', barrio: 'los-perales',    serv: ['agua','cloaca','gas','luz','pavimento','wifi'] },
  18: { price: 200000, tipo: 'local',        loc: 'palpala',               barrio: null,             serv: ['agua','cloaca','luz','pavimento'], priceFrom: true },
};

const TIPO_SLUG_POR_LEGACY = {
  Casa: 'casa',
  Departamento: 'departamento',
  Local: 'local',
  Oficina: 'oficina',
  Galpon: 'galpon',
  Nave: 'nave',
  Terreno: 'terreno',
};

function compararCon55(filas) {
  const lineas = [];
  let fallos = 0;

  lineas.push('');
  lineas.push('=== CRITERIO DE ACEPTACIÓN §5.5 (ids 1 a 18) ===');
  lineas.push('');
  lineas.push('id  | precio    | tipo         | localidad             | barrio           | servicios                          | ok');
  lineas.push('----+-----------+--------------+-----------------------+------------------+------------------------------------+----');

  for (const f of filas) {
    const esperado = ESPERADO_55[f.legacy_id];
    if (!esperado) continue;

    const tipoSlug = TIPO_SLUG_POR_LEGACY[f.tipo_legacy_label] ?? '???';
    const serv = [...f._servicios].sort();
    const servEsperado = [...esperado.serv].sort();

    const errores = [];
    if (f.price !== esperado.price) errores.push(`precio ${f.price} != ${esperado.price}`);
    if (tipoSlug !== esperado.tipo) errores.push(`tipo ${tipoSlug} != ${esperado.tipo}`);
    if (f.localidad_slug !== esperado.loc) errores.push(`localidad ${f.localidad_slug} != ${esperado.loc}`);
    if (f.neighborhood_slug !== esperado.barrio) errores.push(`barrio ${f.neighborhood_slug} != ${esperado.barrio}`);
    if (serv.join(',') !== servEsperado.join(',')) errores.push(`servicios [${serv}] != [${servEsperado}]`);
    if (esperado.hide && !f.hide_location) errores.push('falta hide_location');
    if (esperado.priceFrom && !f.price_from) errores.push('falta price_from');

    if (errores.length) fallos++;

    lineas.push(
      [
        String(f.legacy_id).padEnd(3),
        String(f.price ?? 'NULL').padEnd(9),
        tipoSlug.padEnd(12),
        String(f.localidad_slug).padEnd(21),
        String(f.neighborhood_slug ?? '—').padEnd(16),
        (serv.join(', ') || '—').padEnd(34),
        errores.length ? 'NO' : 'ok',
      ].join(' | ')
    );
    if (errores.length) lineas.push(`    -> ${errores.join(' | ')}`);
  }

  lineas.push('');
  lineas.push(
    fallos === 0
      ? '✅ Las 18 filas coinciden con la tabla §5.5.'
      : `❌ ${fallos} fila(s) NO coinciden con §5.5.`
  );

  // Chequeos extra que la tabla menciona en prosa.
  lineas.push('');
  lineas.push('--- Superficies con valor (§5.5: solo ids 3, 5 y 11) ---');
  const conSuperficie = filas.filter((f) => f.superficie_m2 !== null);
  for (const f of conSuperficie) lineas.push(`  id ${f.legacy_id}: ${f.superficie_m2}`);
  const idsSup = conSuperficie.map((f) => f.legacy_id).filter((id) => id <= 18);
  lineas.push(
    idsSup.join(',') === '3,5,11' ? '  ✅ coincide' : `  ❌ esperaba 3,5,11 y salió ${idsSup.join(',')}`
  );

  lineas.push('');
  lineas.push('--- Ceros conservados como "No tiene" ---');
  for (const campo of ['cocheras', 'dormitorios', 'banos']) {
    const ids = filas.filter((f) => f[campo] === 0 && f.legacy_id <= 18).map((f) => f.legacy_id);
    const esperados = {
      cocheras: '3,8,12,13,14,15,16,18',
      dormitorios: '4,8,13,14,18',
      banos: '14',
    }[campo];
    const ok = ids.join(',') === esperados;
    lineas.push(`  ${campo.padEnd(12)} -> ${ids.join(',') || '—'}   ${ok ? '✅' : `❌ esperaba ${esperados}`}`);
    if (!ok) fallos++;
  }

  lineas.push('');
  lineas.push('--- expensas (§2.3: todas NULL) ---');
  const conExpensas = filas.filter((f) => f.expensas !== null);
  lineas.push(conExpensas.length === 0 ? '  ✅ las 19 en NULL' : `  ❌ ${conExpensas.length} con valor`);

  return { texto: lineas.join('\n'), fallos };
}

/** La id 19 no está en §5.5: se verifica contra data.jsx directamente. */
function reportar19(filas, productsData) {
  const f = filas.find((x) => x.legacy_id === 19);
  if (!f) return 'La id 19 no está en data.jsx.';
  const p = productsData.find((x) => x.id === 19);
  const d = p.detalles;

  const filasTabla = [
    ['price', JSON.stringify(p.price), String(f.price)],
    ['tipo', JSON.stringify(d.tipo), `${TIPO_SLUG_POR_LEGACY[f.tipo_legacy_label]} (legacy_label ${f.tipo_legacy_label})`],
    ['barrio', JSON.stringify(d.barrio), `localidad=${f.localidad_slug} barrio=${f.neighborhood_slug} hide_location=${f.hide_location}`],
    ['calle', JSON.stringify(d.calle), JSON.stringify(f.calle)],
    ['cocheras', String(d.cocheras), String(f.cocheras)],
    ['ambientes', String(d.ambientes), String(f.ambientes)],
    ['dormitorios', String(d.dormitorios), String(f.dormitorios)],
    ['banos', String(d.banos), String(f.banos)],
    ['superficie_m2', JSON.stringify(d.superficie_m2), String(f.superficie_m2)],
    ['frente_m', JSON.stringify(d.frente_m), String(f.frente_m)],
    ['fondo_m', JSON.stringify(d.fondo_m), String(f.fondo_m)],
    ['expensas', String(d.expensas), String(f.expensas)],
    ['lat / lon', `${d.lat} / ${d.lon}`, `${f.lat} / ${f.lon}`],
    ['servicios', JSON.stringify(d.servicios), JSON.stringify(f._servicios)],
    ['images', String(p.images.length) + ' archivos', f._media.map((m) => m.kind).join(', ')],
  ];

  const out = [
    '',
    '=== id 19 (no está en §5.5, se compara contra data.jsx) ===',
    '',
    'campo          | data.jsx                       | migrado',
    '---------------+--------------------------------+------------------------------------------',
    ...filasTabla.map(([c, a, b]) => `${c.padEnd(14)} | ${String(a).slice(0, 30).padEnd(30)} | ${b}`),
    '',
    'Caso de prueba del tri-estado: superficie, frente y fondo van a NULL ("A consultar"),',
    'los contables tienen valor, y la ubicación queda oculta (hide_location).',
  ];
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Escritura en Supabase
// ---------------------------------------------------------------------------
async function migrar(filas) {
  const { createClient } = await import('@supabase/supabase-js');

  const url = process.env.PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    throw new Error(
      'Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Cargalas en .env y corré con:  node --env-file=.env scripts/migrate-data.mjs'
    );
  }
  if (secret.startsWith('sb_publishable_') || secret.includes('anon')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY parece ser la publishable key, no la secret.');
  }

  const db = createClient(url, secret, { auth: { persistSession: false } });

  // --- catálogos ---
  const [tipos, localidades, barrios, servicios] = await Promise.all([
    db.from('property_types').select('id, slug, legacy_label'),
    db.from('localidades').select('id, slug'),
    db.from('neighborhoods').select('id, slug'),
    db.from('services').select('id, slug'),
  ]);
  for (const r of [tipos, localidades, barrios, servicios]) {
    if (r.error) throw new Error(`Leyendo catálogos: ${r.error.message}`);
  }

  const idTipoPorLegacy = new Map(tipos.data.map((t) => [t.legacy_label, t.id]));
  const idLocalidad = new Map(localidades.data.map((l) => [l.slug, l.id]));
  const idBarrio = new Map(barrios.data.map((b) => [b.slug, b.id]));
  const idServicio = new Map(servicios.data.map((s) => [s.slug, s.id]));

  // Falla temprano si falta algo en los catálogos.
  const faltantes = [];
  for (const f of filas) {
    if (!idTipoPorLegacy.has(f.tipo_legacy_label))
      faltantes.push(`property_types.legacy_label = '${f.tipo_legacy_label}' (id ${f.legacy_id})`);
    if (!idLocalidad.has(f.localidad_slug))
      faltantes.push(`localidades.slug = '${f.localidad_slug}' (id ${f.legacy_id})`);
    if (f.neighborhood_slug && !idBarrio.has(f.neighborhood_slug))
      faltantes.push(`neighborhoods.slug = '${f.neighborhood_slug}' (id ${f.legacy_id})`);
    for (const s of f._servicios) {
      if (!idServicio.has(s)) faltantes.push(`services.slug = '${s}' (id ${f.legacy_id})`);
    }
  }
  if (faltantes.length) {
    throw new Error('Faltan filas en los catálogos:\n  - ' + [...new Set(faltantes)].join('\n  - '));
  }

  // --- properties ---
  const payload = filas.map((f) => {
    const { tipo_legacy_label, localidad_slug, neighborhood_slug, _servicios, _media, ...resto } = f;
    return {
      ...resto,
      property_type_id: idTipoPorLegacy.get(tipo_legacy_label),
      localidad_id: idLocalidad.get(localidad_slug),
      neighborhood_id: neighborhood_slug ? idBarrio.get(neighborhood_slug) : null,
    };
  });

  const { data: guardadas, error: errProps } = await db
    .from('properties')
    .upsert(payload, { onConflict: 'legacy_id' })
    .select('id, legacy_id');
  if (errProps) throw new Error(`Guardando properties: ${errProps.message}`);

  const idPorLegacy = new Map(guardadas.map((p) => [p.legacy_id, p.id]));
  console.log(`  properties: ${guardadas.length} filas upserteadas`);

  // --- tablas hijas: se reemplazan enteras, así la corrida es idempotente ---
  const ids = [...idPorLegacy.values()];

  const delMedia = await db.from('property_media').delete().in('property_id', ids);
  if (delMedia.error) throw new Error(`Borrando media: ${delMedia.error.message}`);
  const delServ = await db.from('property_services').delete().in('property_id', ids);
  if (delServ.error) throw new Error(`Borrando servicios: ${delServ.error.message}`);

  const mediaPayload = filas.flatMap((f) =>
    f._media.map((m) => ({
      property_id: idPorLegacy.get(f.legacy_id),
      url: m.url,
      storage_path: null, // legacy: vive en /public, no en el bucket. No borrar del bucket.
      kind: m.kind,
      alt: f.name,
      sort_order: m.sort_order,
    }))
  );
  if (mediaPayload.length) {
    const { error } = await db.from('property_media').insert(mediaPayload);
    if (error) throw new Error(`Insertando media: ${error.message}`);
  }
  console.log(`  property_media: ${mediaPayload.length} filas`);

  const servPayload = filas.flatMap((f) =>
    f._servicios.map((s) => ({
      property_id: idPorLegacy.get(f.legacy_id),
      service_id: idServicio.get(s),
    }))
  );
  if (servPayload.length) {
    const { error } = await db.from('property_services').insert(servPayload);
    if (error) throw new Error(`Insertando servicios: ${error.message}`);
  }
  console.log(`  property_services: ${servPayload.length} filas`);
}

// ---------------------------------------------------------------------------
// Verificación contra la base ya migrada
// ---------------------------------------------------------------------------
async function verificarContraLaBase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error('Faltan las variables de entorno de Supabase.');

  const db = createClient(url, secret, { auth: { persistSession: false } });
  const { data, error } = await db
    .from('properties')
    .select(
      `legacy_id, price, price_from, hide_location, superficie_m2, cocheras, dormitorios, banos, expensas,
       property_types ( slug ), localidades ( slug ), neighborhoods ( slug ),
       property_services ( services ( slug ) ), property_media ( url, kind, sort_order )`
    )
    .order('legacy_id');
  if (error) throw new Error(error.message);

  const filas = data.map((r) => ({
    legacy_id: r.legacy_id,
    price: r.price === null ? null : Number(r.price),
    price_from: r.price_from,
    hide_location: r.hide_location,
    superficie_m2: r.superficie_m2 === null ? null : Number(r.superficie_m2),
    cocheras: r.cocheras,
    dormitorios: r.dormitorios,
    banos: r.banos,
    expensas: r.expensas,
    tipo_legacy_label: Object.entries(TIPO_SLUG_POR_LEGACY).find(
      ([, slug]) => slug === r.property_types?.slug
    )?.[0],
    localidad_slug: r.localidades?.slug ?? null,
    neighborhood_slug: r.neighborhoods?.slug ?? null,
    _servicios: (r.property_services ?? []).map((ps) => ps.services?.slug).filter(Boolean),
    _media: [...(r.property_media ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }));

  console.log(`Leídas ${filas.length} propiedades de Supabase.`);
  const { texto, fallos } = compararCon55(filas);
  console.log(texto);
  return fallos;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  if (VERIFY) {
    const fallos = await verificarContraLaBase();
    process.exit(fallos === 0 ? 0 : 1);
  }

  const productsData = await leerDataJsx();
  console.log(`Leídas ${productsData.length} propiedades de src/data.jsx.`);

  const filas = construirFilas(productsData);

  const problemas = validar(filas);
  if (problemas.length) {
    console.error('\n❌ Validación previa falló:');
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log('✅ Validación previa OK.');

  if (CHECK) {
    const { texto, fallos } = compararCon55(filas);
    console.log(texto);
    console.log(reportar19(filas, productsData));
    process.exit(fallos === 0 ? 0 : 1);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: no se escribe nada ---');
    console.log(JSON.stringify(filas, null, 2));
    return;
  }

  console.log('\nMigrando a Supabase...');
  await migrar(filas);
  console.log('\n✅ Migración terminada. Verificá con:  node --env-file=.env scripts/migrate-data.mjs --verify');
}

// Solo corre como CLI. Al importarlo (por ejemplo desde un test) no ejecuta nada,
// lo que permite reutilizar las funciones puras de transformación.
const esEntrypoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (esEntrypoint) {
  main().catch((e) => {
    console.error(`\n❌ ${e.message}`);
    process.exit(1);
  });
}

export { construirFilas, leerDataJsx, medida, contable, precio, resolverUbicacion, slugify };
