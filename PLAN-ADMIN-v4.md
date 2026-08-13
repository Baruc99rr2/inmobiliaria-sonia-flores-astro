# PLAN ADMIN v4 — Panel de administración con Supabase

> Documento único de referencia para Claude Code. Guardar como `docs/PLAN-ADMIN.md`.
> **Reemplaza y anula las versiones v1, v2 y v3.** Si hay otro plan en el repo, borrarlo.

---

## 0. Resumen ejecutivo

| Ítem | Definición |
|---|---|
| Stack actual | Astro 7 + React 19 + Tailwind 4 + antd 6, deploy en Vercel |
| Backend nuevo | Supabase (Postgres + Auth + Storage) |
| UI del panel | **shadcn/ui**. antd queda confinado al sitio público |
| Mapas | Leaflet (ya instalado). NO Google Maps |
| Seguridad | RLS de Postgres. El guard del router es solo UX |
| Migración | Capa adaptadora `mapDbToProduct()` — **el frontend público no se refactoriza** |
| Riesgo principal | Código residual del ecommerce con dependencias fantasma (Fase 0) |

**Dinámica**: Claude Code ejecuta una fase, entrega informe, el informe se revisa fuera del repo, y recién ahí se habilita la siguiente. **Ninguna fase arranca sin OK explícito.**

---

## 1. Estado de `data.jsx` — auditoría final

### 1.1 Datos limpios ✅

La normalización está **terminada**. Verificado sobre las 18 propiedades:

- **Servicios**: seis categorías idénticas en todo el archivo — `'Agua'`, `'Luz'`, `'Gas'`, `'Cloaca'`, `'Pavimento'`, `'Wifi'`. Cero sinónimos.
- **Precios**: todos string; los no numéricos son exactamente `'A consultar'`.
- **Tipos**: `Casa`, `Departamento`, `Local`, `Oficina`, `Galpon`, `Nave`, `Terreno`. Consistentes.
- **`category`**: solo `'Alquiler'` y `'Venta'`, coincide con `categoryItem`.
- **Media**: las 18 cumplen la convención — el primer elemento de `images` es siempre imagen, los videos van después. **Regla segura de codificar.**
- **Barrios**: la regla del prefijo se cumple sin excepciones salvo la id 12 (documentada en §2.1).

### 1.2 Único resto conocido

`'A consultar'` figura como si fuera un servicio en los ids 1, 2 y 3. **No lo corrijas a mano**: el script lo traduce a array vacío, y el frontend ya muestra "A consultar" cuando el array está vacío (comportamiento actual de los ids 11 y 15).

### 1.3 Observaciones menores (no bloquean)

- `categoryItem` referencia `/propiedades/local-centro-alquila.png`, archivo que no aparece en ninguna propiedad. Verificar que exista en `/public`. Lo reporta la Fase 0.
- id 18: la descripción contiene teléfono, horario y matrícula — debería vivir en configuración global. El `name` dice "Palpala" sin tilde; el `mapaQuery` dice "Palpalá".
- Bloque de requisitos repetido idéntico en 9 propiedades (3, 7, 8, 9, 12, 15, 16, 17, 18). En el panel va como campo separado con botón "insertar texto estándar".
- Comentario obsoleto en id 2 (`// Al estar en 0...`). Se va con `data.jsx`.
- Títulos en MAYÚSCULA SOSTENIDA en ids 1, 2, 3 y 8; Title Case en el resto. Cosmético.
- id 1: `banos: 2` contando el antebaño; id 17 tiene antebaño y pone `banos: 1`. Criterio distinto entre propiedades.

---

## 2. Reglas de negocio

Salieron de decisiones ya tomadas por la dueña. **Son parte del modelo, no accidentes a corregir.**

### 2.1 Regla `barrio` → `localidad`

Convención vigente: **si el valor empieza con la palabra "Barrio", la propiedad está en San Salvador de Jujuy. Si no, está fuera.** Se cumple en las 18, con una sola excepción: la id 12, que dice `'A consultar'` porque su ubicación se oculta a propósito (sí está en San Salvador).

El script aplica exactamente esto:

```
si barrio empieza con "Barrio "   → localidad = San Salvador de Jujuy
                                    barrio    = resto del string
si barrio == "A consultar"        → localidad = San Salvador de Jujuy
                                    barrio    = NULL, hide_location = true
en cualquier otro caso            → localidad = el valor tal cual
                                    barrio    = NULL
```

Localidades resultantes: `San Salvador de Jujuy`, `Palpalá` (ids 3, 18), `San Antonio` (id 11).

Desde el panel, la dueña elige localidad y barrio en dos selectores separados; el prefijo "Barrio" desaparece del dato y queda solo en la presentación.

### 2.2 `hide_location` oculta el texto, NO el mapa

Confirmado con la dueña: en la id 12 se reserva barrio y calle **a propósito**, pero el mapa apunta a la zona real porque así lo prefiere ella.

`hide_location = true` significa: no mostrar barrio ni calle en el texto de la ficha. **El mapa se renderiza igual. No implementar difuminado ni desplazamiento de coordenadas** — sería contradecir una decisión comercial deliberada.

### 2.3 Tri-estado de los campos numéricos ⭐ REGLA CENTRAL

> Esta sección define el comportamiento más importante del panel. Leerla completa antes de diseñar el formulario.

Un campo numérico puede estar en **uno de tres estados**, y cada uno se muestra distinto al público:

| Estado | Valor en DB | Qué ve el usuario final | Cuándo se usa |
|---|---|---|---|
| **Cargado** | el número | el número (`3 dormitorios`) | Se conoce el dato y se quiere publicar |
| **Sin dato** | `NULL` | **"A consultar"** | No se cargó, se olvidó, o se decide no publicarlo |
| **No tiene** | `0` | **"No tiene"** | Se sabe con certeza que la propiedad no lo tiene |

**Reglas duras:**

1. **`NULL` nunca llega crudo a la vista pública.** Ni "null", ni "0", ni vacío, ni la fila en blanco. Siempre el texto "A consultar".
2. **Dejar un campo vacío es una acción válida y silenciosa.** No se valida como error, no se pide confirmación, no aparece un cartel de advertencia. Si la dueña lo deja vacío, sale "A consultar" y listo.
3. **"No tiene" es explícito.** Es un checkbox al lado del campo, no un `0` tipeado a mano. Al marcarlo, el input numérico se deshabilita y se guarda `0`.

**Qué campos llevan el checkbox "No tiene":**

| Campo | ¿Checkbox "No tiene"? | Motivo |
|---|---|---|
| `cocheras` | Sí | "Sin cochera" es información de venta |
| `dormitorios` | Sí | Locales y oficinas legítimamente no tienen |
| `banos` | Sí | La Nave (id 14) no tiene |
| `ambientes` | Sí | Terrenos no tienen |
| `expensas` | Sí | "Sin expensas" es un argumento comercial fuerte |
| `superficie_m2` | **No** | Toda propiedad tiene superficie; solo puede desconocerse |
| `frente_m` | **No** | Ídem |
| `fondo_m` | **No** | Ídem |

En los tres campos de medida solo hay dos estados: número, o vacío → "A consultar".

**Por qué `0` y no una columna booleana aparte:** en los campos contables, "cero" y "no tiene" son literalmente lo mismo. No es un valor centinela improvisado, es la semántica real. Evita ocho columnas booleanas adicionales y mantiene las consultas simples.

**Nota sobre `expensas` en la migración:** hoy aparece en `0` en cinco propiedades (5, 6, 7, 9, 10) y ausente en las otras trece. Ese patrón sugiere relleno automático más que una afirmación de "sin expensas". Se migra como `NULL` (→ "A consultar"), y si la dueña confirma que esas cinco no tienen expensas, se corrige con un `UPDATE` de una línea. Es más seguro decir "a consultar" que afirmar algo que ella no dijo.

**Nota sobre campos irrelevantes por tipo:** un terreno con "Dormitorios: A consultar" queda raro. Dos salidas, ambas válidas: marcar "No tiene" en esos campos, o —mejora opcional para más adelante— que el formulario muestre solo los campos relevantes según el tipo de propiedad. No es necesario resolverlo en la primera versión.

### 2.4 Galpón y Nave son tipos distintos

Definición de la dueña: una **Nave** es más grande y es un monoambiente sin divisiones; un **Galpón** puede tener secciones (baños, oficinas, kitchenette). No unificar.

---

## 3. FASE 0 — Auditoría y limpieza del código residual (CRÍTICA)

> Máximo riesgo del proyecto. Va **antes** de tocar Supabase.

El sitio arrastra scripts de cuando era un ecommerce. No se renderizan, pero están importados en algún lado (o comentados a medias), así que borrarlos a ciegas rompe el build. Regla: **nada se borra sin haber mapeado el grafo de dependencias primero.**

### 3.1 Herramientas

```bash
npx knip                    # el más útil acá: archivos, exports y deps sin usar
npx madge --circular src/   # dependencias circulares
npx depcheck                # paquetes de package.json sin usar
npx ts-prune                # exports sin consumir (si hay TS)
```

`knip` tiene plugin para Astro. Ninguna es infalible con islands: **los resultados son una hipótesis, no una sentencia.**

### 3.2 Clasificación obligatoria

- **MUERTO**: nadie lo importa, no aparece en ninguna ruta → se borra.
- **ZOMBIE**: importado pero nunca usado, o con el uso comentado → se borra **el import primero**, se verifica el build, después el archivo.
- **VIVO**: parece muerto pero algo lo consume → no se toca.

Trampas de Astro que el análisis estático no ve: `import.meta.glob()`; todo lo que está en `src/pages/` (son rutas aunque nadie las importe); componentes usados solo desde un `.astro` con directiva `client:*`; assets referenciados solo como strings; archivos en `public/`.

### 3.3 Protocolo de borrado (Fase 0.5)

1. Rama dedicada: `git checkout -b limpieza/ecommerce-residual`.
2. **Un commit por archivo o grupo chico.** Nunca un commit gigante.
3. Después de cada commit: `npm run build` **y** `npm run preview`, navegando las rutas.
4. Al final, preview de Vercel y recorrido completo antes de mergear.
5. Si algo se rompe, `git revert` de un commit chico.

### 3.4 Prompt de la Fase 0

```
Vamos a agregarle un panel de administración a este sitio de inmobiliaria (Astro 7 +
React 19 + Tailwind 4 + antd, deploy en Vercel), usando Supabase. El plan completo está
en docs/PLAN-ADMIN.md — leelo entero antes de hacer nada.

Arrancamos por la FASE 0. En esta fase NO se implementa nada nuevo y NO se borra nada.
Tiene dos partes, y quiero el informe completo antes de que toques una línea.

=== PARTE A: INVENTARIO (solo lectura) ===

1. Estructura completa de src/ (páginas, componentes, layouts, utils).
2. Contenido de astro.config (output, adapter, integraciones) y de tsconfig/jsconfig
   (¿existe el alias @/*?).
3. Qué archivos importan productsData y categoryItem, y exactamente cómo los usan.
4. Los filtros: ¿comparan strings de category/tipo/barrio directamente? ¿Son
   case-sensitive? Citá archivo:línea. Necesito saber qué se rompe cuando el barrio deje
   de tener el prefijo "Barrio " y pase a ser localidad + barrio separados.
5. El formateador de precio: qué lógica decide mostrar "A consultar" vs un número.
   ¿Compara el string exacto? Citá archivo:línea.
6. El carrusel de media: cómo distingue imagen de video (¿por extensión .mp4?) y cómo
   elige la portada. Confirmame que usa el PRIMER elemento del array images.
7. El mapa Leaflet: qué campos consume (lat/lon/mapaQuery/mostrarDireccionExacta) y en
   qué componente.
8. CRÍTICO — cómo se renderizan hoy los campos numéricos. Buscá TODO acceso a
   detalles.cocheras, detalles.frente_m, detalles.fondo_m, detalles.expensas,
   detalles.dormitorios, detalles.ambientes, detalles.banos y detalles.superficie_m2.
   Para cada uno decime:
     - ¿hay guarda (?., ||, ??, un if) o se renderiza crudo?
     - ¿qué se muestra hoy cuando el valor es 0?
     - ¿qué se muestra hoy cuando el valor es "a consultar" o ""?
     - ¿qué se muestra hoy cuando la propiedad NO tiene la clave (undefined)?
   Leé la sección 2.3 del plan: vamos a un modelo de tres estados
   (número / "A consultar" / "No tiene"), y necesito saber cuánto trabajo cuesta llegar
   ahí desde lo que hay hoy.
9. Dónde se usa antd y dónde @stripe/stripe-js.

=== PARTE B: AUDITORÍA DE CÓDIGO RESIDUAL ===

Este sitio empezó siendo un ecommerce. Quedaron scripts que nunca se renderizan, pero
que están importados en algún lado o tienen el uso comentado. Borrarlos a ciegas rompe
el build. Necesito el mapa completo antes de tocar nada.

Corré npx knip, npx madge --circular src/ y npx depcheck, y cruzá los resultados con tu
propia lectura del código.

Entregame una tabla con cada archivo/export candidato, clasificado como MUERTO, ZOMBIE
o VIVO (definiciones en la sección 3.2 del plan). Para cada uno: quién lo importa, si el
uso está comentado, y qué se rompería al borrarlo.

Prestá atención a lo que el análisis estático NO ve en Astro:
  - import.meta.glob()
  - todo lo que está en src/pages/ (son rutas aunque nadie las importe)
  - componentes usados solo desde un .astro con directiva client:*
  - assets referenciados solo como strings
  - archivos en public/

Ante la duda, clasificá como VIVO. Prefiero dejar código muerto que romper la web.

NO BORRES NADA. Entregame las dos partes y esperá mi OK.
```

### 3.5 Qué debe contener el informe

Árbol de `src/`; citas literales con `archivo:línea` de los filtros y del formateador de precio; la tabla MUERTO/ZOMBIE/VIVO; **la respuesta completa al punto 8** (define el alcance de la Fase 3.5); y la lista de archivos a modificar en Fases 2 y 3 con nivel de riesgo.

---

## 4. Modelo de datos

```sql
create extension if not exists "pgcrypto";

-- ============ ADMIN ============
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ============ CATÁLOGOS ============
create table public.property_types (
  id serial primary key,
  slug text unique not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.localidades (
  id serial primary key,
  slug text unique not null,
  label text not null,
  active boolean not null default true
);

create table public.neighborhoods (
  id serial primary key,
  localidad_id int not null references public.localidades(id),
  slug text unique not null,
  label text not null,
  active boolean not null default true
);

create table public.services (
  id serial primary key,
  slug text unique not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

-- ============ PROPIEDADES ============
create type public.operation_type as enum ('alquiler', 'venta');
create type public.media_kind    as enum ('image', 'video');

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  legacy_id int unique,
  slug text unique not null,
  name text not null,
  description text not null default '',
  requisitos text,

  operation public.operation_type not null,
  property_type_id int references public.property_types(id),
  localidad_id     int references public.localidades(id),
  neighborhood_id  int references public.neighborhoods(id),   -- NULL permitido

  price numeric(14,2),                        -- NULL = A consultar
  show_price boolean not null default true,
  price_from boolean not null default false,  -- "desde $X" (id 18)
  currency text not null default 'ARS',

  calle text not null default '',
  numero text not null default '',
  show_exact_address boolean not null default false,
  hide_location boolean not null default false,  -- oculta barrio y calle en el TEXTO; el mapa se muestra igual

  -- ===== TRI-ESTADO (ver §2.3) =====
  -- NULL = "A consultar"  |  0 = "No tiene"  |  n = el valor
  ambientes   int,
  dormitorios int,
  banos       int,
  cocheras    int,
  expensas    numeric(14,2),

  -- ===== DOS ESTADOS: NULL = "A consultar" | n = el valor =====
  -- Sin checkbox "No tiene": toda propiedad tiene superficie, solo puede desconocerse
  superficie_m2 numeric,
  frente_m      numeric,
  fondo_m       numeric,

  lat double precision,
  lon double precision,
  mapa_query text,

  adicionales text[] not null default '{}',

  published boolean not null default false,
  featured boolean not null default false,
  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Los campos de medida no admiten 0: o hay valor, o es NULL ("A consultar")
  constraint medidas_sin_cero check (
    (superficie_m2 is null or superficie_m2 > 0) and
    (frente_m      is null or frente_m      > 0) and
    (fondo_m       is null or fondo_m       > 0)
  ),
  -- Los contables no admiten negativos
  constraint contables_no_negativos check (
    (ambientes   is null or ambientes   >= 0) and
    (dormitorios is null or dormitorios >= 0) and
    (banos       is null or banos       >= 0) and
    (cocheras    is null or cocheras    >= 0) and
    (expensas    is null or expensas    >= 0)
  )
);

create index on public.properties (published, sort_order);
create index on public.properties (operation);

create table public.property_services (
  property_id uuid not null references public.properties(id) on delete cascade,
  service_id  int  not null references public.services(id)   on delete cascade,
  primary key (property_id, service_id)
);

-- CONVENCIÓN: sort_order = 0 es SIEMPRE la portada y SIEMPRE imagen.
-- Las 18 propiedades actuales ya la cumplen. El panel impide guardar si la primera es video.
create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,             -- '/propiedades/x.png' (legacy) o URL de Supabase Storage
  storage_path text,             -- NULL si es legacy: no borrar del bucket
  kind public.media_kind not null default 'image',
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.property_media (property_id, sort_order);

-- NOTAS PRIVADAS — jamás se exponen al público
create table public.property_notes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ TRIGGERS ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger properties_touch     before update on public.properties
  for each row execute function public.touch_updated_at();
create trigger property_notes_touch before update on public.property_notes
  for each row execute function public.touch_updated_at();
```

### 4.1 RLS

```sql
alter table public.properties        enable row level security;
alter table public.property_media    enable row level security;
alter table public.property_services enable row level security;
alter table public.property_notes    enable row level security;
alter table public.property_types    enable row level security;
alter table public.localidades       enable row level security;
alter table public.neighborhoods     enable row level security;
alter table public.services          enable row level security;
alter table public.admins            enable row level security;

create policy "lectura publica propiedades" on public.properties
  for select to anon, authenticated using (published = true or public.is_admin());

create policy "lectura publica media" on public.property_media
  for select to anon, authenticated using (
    public.is_admin() or exists (
      select 1 from public.properties p where p.id = property_id and p.published = true));

create policy "lectura publica servicios prop" on public.property_services
  for select to anon, authenticated using (
    public.is_admin() or exists (
      select 1 from public.properties p where p.id = property_id and p.published = true));

create policy "catalogo tipos"       on public.property_types for select to anon, authenticated using (true);
create policy "catalogo localidades" on public.localidades    for select to anon, authenticated using (true);
create policy "catalogo barrios"     on public.neighborhoods  for select to anon, authenticated using (true);
create policy "catalogo servicios"   on public.services       for select to anon, authenticated using (true);

-- NOTAS: sin política de lectura pública. Solo admin.
create policy "admin gestiona notas" on public.property_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin gestiona propiedades" on public.properties
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona media" on public.property_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona servicios prop" on public.property_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona tipos" on public.property_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona localidades" on public.localidades
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona barrios" on public.neighborhoods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona cat servicios" on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin se lee a si mismo" on public.admins
  for select to authenticated using (user_id = auth.uid());
```

### 4.2 Storage

```sql
insert into storage.buckets (id, name, public) values ('propiedades', 'propiedades', true);

create policy "lectura publica bucket" on storage.objects
  for select to anon, authenticated using (bucket_id = 'propiedades');
create policy "admin sube bucket" on storage.objects
  for insert to authenticated with check (bucket_id = 'propiedades' and public.is_admin());
create policy "admin edita bucket" on storage.objects
  for update to authenticated using (bucket_id = 'propiedades' and public.is_admin());
create policy "admin borra bucket" on storage.objects
  for delete to authenticated using (bucket_id = 'propiedades' and public.is_admin());
```

---

## 5. Catálogos semilla y mapeo

### 5.1 `property_types`

| slug | label | absorbe |
|---|---|---|
| `casa` | Casa | — |
| `departamento` | Departamento | — |
| `local` | Local Comercial | `'Local'` |
| `oficina` | Oficina | — |
| `galpon` | Galpón / Depósito | `'Galpon'` |
| `nave` | Nave Industrial | `'Nave'` |
| `terreno` | Terreno | — |

### 5.2 `localidades` y `neighborhoods`

Localidades: `san-salvador-de-jujuy`, `palpala`, `san-antonio`.
Barrios (hijos de San Salvador): Centro, Los Perales, Cuyaya, Chijra, Alto Comedero, Almirante Brown, San Pedrito, Gorriti.
Palpalá y San Antonio quedan sin barrios cargados; se pueden agregar desde el panel.

### 5.3 `services`

El dato ya está limpio: el mapeo es uno a uno.

| slug | label |
|---|---|
| `agua` | Agua |
| `luz` | Luz |
| `gas` | Gas |
| `cloaca` | Cloaca |
| `pavimento` | Pavimento |
| `wifi` | Wifi |

`'A consultar'` (ids 1, 2, 3) no es un servicio: se traduce a array vacío.

### 5.4 Reglas de conversión numérica

```
superficie_m2 / frente_m / fondo_m:
    0, "", "a consultar", ausente  → NULL
    "180", 640, 200000             → el número

ambientes / dormitorios / banos / cocheras:
    0        → 0        (se conserva: significa "No tiene")
    ausente  → NULL     ("A consultar")

expensas:
    0        → NULL     (ver justificación en §2.3)
    ausente  → NULL

price:
    "A consultar"  → NULL
    "480000"       → 480000
```

### 5.5 Resultado esperado — criterio de aceptación de la Fase 2

| id | precio | tipo | localidad | barrio | servicios |
|---|---|---|---|---|---|
| 1 | 480000 | departamento | SSJ | Los Perales | — |
| 2 | NULL | casa | SSJ | Centro | — |
| 3 | 650000 | local | Palpalá | — | — |
| 4 | NULL | oficina | SSJ | Centro | agua, cloaca, luz |
| 5 | NULL | galpon | SSJ | Alto Comedero | agua, cloaca, luz, pavimento |
| 6 | NULL | departamento | SSJ | Centro | agua, cloaca, luz, pavimento, gas |
| 7 | 400000 | departamento | SSJ | Cuyaya | agua, cloaca, luz, pavimento, gas |
| 8 | 350000 | oficina | SSJ | Centro | wifi, luz, agua |
| 9 | 700000 | departamento | SSJ | Los Perales | agua, cloaca, luz, pavimento, gas |
| 10 | NULL | casa | SSJ | Chijra | agua, cloaca, gas, luz, pavimento |
| 11 | NULL | terreno | San Antonio | — | — |
| 12 | 580000 | casa | SSJ | — (`hide_location`) | agua, luz, gas |
| 13 | NULL | local | SSJ | Almirante Brown | agua, luz |
| 14 | NULL | nave | SSJ | San Pedrito | agua |
| 15 | 620000 | departamento | SSJ | Gorriti | — |
| 16 | NULL | departamento | SSJ | Centro | agua, luz, gas, cloaca, pavimento, wifi |
| 17 | NULL | departamento | SSJ | Los Perales | agua, luz, gas, cloaca, pavimento, wifi |
| 18 | 200000 (`price_from`) | local | Palpalá | — | agua, luz, cloaca, pavimento |

**Superficies con valor**: id 3 → 180, id 5 → 640, id 11 → 200000. Todo el resto `NULL`.
**Ceros que se conservan como "No tiene"**:
- `cocheras: 0` → ids 3, 8, 12, 13, 14, 15, 16, 18
- `dormitorios: 0` → ids 4, 8, 13, 14, 18
- `banos: 0` → id 14
**Todo lo demás ausente o en cero** → `NULL` → "A consultar".

---

## 6. Variables de entorno

```
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # SOLO para scripts locales de migración
```

- La service role key **nunca** llega al browser, nunca lleva prefijo `PUBLIC_`, nunca se importa en un `.astro` sin `prerender = false`.
- `.env` en `.gitignore`.
- La anon key es pública por diseño: lo que protege los datos es RLS.

---

## 7. Fases

Cada fase: un commit o rama, una verificación, un informe, y OK antes de seguir.

**Fase 0 — Inventario + auditoría de residuos.** §3. Sin escribir ni borrar código.

**Fase 0.5 — Limpieza.** Solo con el OK sobre la tabla MUERTO/ZOMBIE/VIVO. Rama aparte, un commit por borrado, build + preview tras cada uno. *Verificación: preview de Vercel con recorrido completo.*

**Fase 1 — Supabase + esquema.** Proyecto, migración SQL, catálogos semilla, usuario de la dueña, `insert into admins`, **signup público desactivado**, bucket creado. *Verificación: `select public.is_admin()` responde correcto y las policies bloquean lo esperado.*

**Fase 2 — Cliente, adaptador y migración.** `src/lib/supabase.ts`, `supabase-server.ts`, y `mapProperty.ts` con `mapDbToProduct(row)`.
> **Importante**: en esta fase el adaptador devuelve **exactamente el shape legacy** (`NULL` → `'a consultar'`, `0` → `0`, `images` como array de strings). Nada de "No tiene" todavía. El objetivo es que la Fase 3 sea un cambio de fuente de datos con riesgo cero, no un rediseño.
Script `scripts/migrate-data.mjs`, idempotente vía `legacy_id`, aplicando §2.1 y §5.4. *Verificación: la tabla de §5.5 se cumple fila por fila.*

**Fase 3 — Sitio público leyendo de la DB.** `export const prerender = false` en listado y detalle, datos por el adaptador, **componentes intactos**. Header `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. `data.jsx` se conserva como fallback hasta la Fase 9. *Verificación: comparación visual contra producción, propiedad por propiedad, en preview de Vercel. Filtros funcionando.*

**Fase 3.5 — Renderizado tri-estado.** Cambio chico y aislado, con el sitio ya leyendo de la DB. Se implementa §2.3 en la vista pública: `NULL` → "A consultar", `0` → "No tiene", número → el número. El alcance depende de lo que reporte el punto 8 de la Fase 0. *Verificación: recorrer las 18 propiedades y confirmar que en ningún lado aparece "null", "0" suelto, "undefined" ni una fila vacía.*

**Fase 4 — Auth.** `npx shadcn@latest init` (requiere alias `@/*`). `/admin/login`, guard, redirecciones. Ícono discreto en el footer. *Verificación: sin sesión redirige; un autenticado fuera de `admins` no ve nada; un fetch directo a `property_notes` desde el browser devuelve vacío.*

**Fase 5 — Shell del panel.** `npx shadcn@latest add sidebar-07`, se borra todo lo de ejemplo, se aplica la paleta de la inmobiliaria. Español rioplatense. *Verificación: responsive en celular.*

**Fase 6 — CRUD.** Listado con búsqueda y toggle publicado. Formulario completo (detalle del diseño en §8). Alta como borrador; publicar es un botón aparte. *Verificación: ciclo crear → publicar → ver → editar → despublicar, probando los tres estados de un campo numérico.*

**Fase 7 — Uploader.** Drag & drop, preview, reordenamiento, borrado. **Valida que el primer elemento sea imagen.** Compresión en el cliente (canvas → webp). Al borrar media con `storage_path`, borra también del bucket; si es `NULL` (legacy), solo la fila. *Verificación: subir, reordenar, confirmar que cambia la portada.*

**Fase 8 — Bloc de notas.** Editor simple por propiedad, autosave con debounce, timestamp. Cartel: "Estas notas son privadas, no se publican". *Verificación: confirmar por Network que la tabla no aparece en ninguna respuesta pública.*

**Fase 9 — Cierre.** Borrar `data.jsx`, sacar `@stripe/stripe-js` si no se usa, revisar bundle, instructivo con capturas para la dueña, credenciales en un gestor de contraseñas.

---

## 8. Diseño del formulario (Fase 6)

Campos: título, descripción, requisitos (con botón "insertar texto estándar"), operación (radio Alquiler/Venta), tipo / localidad / barrio desde catálogo con opción "agregar nuevo", precio + switch "mostrar precio" + switch "desde", servicios por checkbox, adicionales como tags libres, dirección + switches de visibilidad, mapa Leaflet con marcador arrastrable.

**Campos numéricos — comportamiento obligatorio (§2.3):**

```
Cocheras   [    ] ☐ No tiene
Dormitorios[    ] ☐ No tiene
Baños      [    ] ☐ No tiene
Ambientes  [    ] ☐ No tiene
Expensas   [    ] ☐ No tiene

Superficie [    ] m²      (sin checkbox)
Frente     [    ] m       (sin checkbox)
Fondo      [    ] m       (sin checkbox)
```

- Marcar "No tiene" **deshabilita** el input y guarda `0`.
- Desmarcarlo vacía el input y guarda `NULL`.
- Un campo vacío **no es un error**: no se valida, no se advierte, no se pide confirmación. Se guarda `NULL` y sale "A consultar".
- Debajo del grupo, un texto de ayuda fijo:
  > *Si dejás un campo vacío, en la web aparece como "A consultar". Si marcás "No tiene", aparece que la propiedad no lo tiene.*

---

## 9. Reglas permanentes para Claude Code

1. **Verificar versiones contra documentación oficial antes de escribir configuración.** Astro 7, React 19, Tailwind 4 y shadcn cambiaron APIs recientemente. En particular: el modo `hybrid` de Astro **ya no existe** (se hace con `output: 'static'` + adapter + `prerender = false` por página), la forma de importar `@astrojs/vercel`, y el setup de shadcn con Tailwind v4.
2. **No refactorizar componentes del sitio público.** El adaptador existe para eso.
3. **shadcn solo en `src/pages/admin/**`, antd solo en el sitio público.** Nunca mezclados en un mismo componente.
4. **Una fase por vez.** Al terminar, parar y reportar. No encadenar.
5. **Ante la duda al borrar código, no borrar.**
6. **Un campo vacío puede ser una decisión comercial, no un error.** No "completar" ni "arreglar" datos por iniciativa propia, no agregar validaciones de campo obligatorio más allá de título y operación. Ver §2.3.
7. **`NULL` nunca llega crudo a la vista pública.** Siempre "A consultar".
8. **Sin datos de prueba inventados en la base de producción.**
9. **UI en español rioplatense**, para una persona no técnica: "Guardar", no "Submit".
10. Si algo del plan no encaja con la realidad del código, **decirlo y proponer alternativa**, no forzarlo.

---

## 10. Pasos manuales en Supabase (para el dev)

1. supabase.com → New Project, región South America (São Paulo). Guardar la contraseña de la DB.
2. Project Settings → API: copiar `Project URL`, `anon public key`, `service_role key`.
3. SQL Editor: correr la migración en dos tandas (esquema, después policies) para aislar errores.
4. Authentication → Users → Add user: email + contraseña de la dueña. Copiar el `user_id`.
5. SQL Editor: `insert into public.admins (user_id) values ('<uuid>');`
6. Authentication → Sign In / Providers → Email → **desactivar "Allow new users to sign up"**. Obligatorio.
7. Storage → New bucket: `propiedades`, público.
8. Cargar las env vars en Vercel antes del primer deploy con SSR.

---

## 11. Nota sobre Storage

Tier gratuito de Supabase: **1 GB**. Casi todas las propiedades tienen `.mp4`. Estrategia adoptada: los videos actuales se quedan en `/public/propiedades/` (los sirve el CDN de Vercel, gratis) y los nuevos van a Supabase con límite por archivo. Por eso `property_media.url` es texto libre: convive lo legacy con lo nuevo. Cuando el bucket se acerque al límite, evaluar Cloudflare R2/Stream, Vercel Blob, o Supabase Pro.
