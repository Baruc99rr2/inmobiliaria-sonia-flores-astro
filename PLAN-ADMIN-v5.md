# PLAN ADMIN v5 — Panel de administración con Supabase

> Documento único de referencia para Claude Code. Guardar como `PLAN-ADMIN-v5.md` en la raíz.
> **Reemplaza y anula v1, v2, v3 y v4.** Borrar `PLAN-ADMIN-v4.md` del repo.
> Actualizado con los hallazgos de `INFORME-FASE-0.md`. Ese informe es lectura complementaria obligatoria.

---

## 0. Resumen ejecutivo

| Ítem | Definición |
|---|---|
| Stack real | Astro 7 (`output: 'static'` + adapter Vercel) + React 19 + Tailwind 4 + Swiper + Leaflet |
| Backend nuevo | Supabase (Postgres + Auth + Storage) |
| UI del panel | **shadcn/ui**, confinado a `src/pages/admin/**` |
| Mapas | Leaflet. NO Google Maps |
| Seguridad | RLS de Postgres. El guard del router es solo UX |
| Migración | Adaptador `mapDbToProduct()` + prop opcional con fallback (§7, Fase 3) |

> **Corrección respecto de v4:** las versiones anteriores listaban **antd** como parte del stack. Es un error: antd está en `package.json` pero **no se importa en ningún archivo**. Solo quedan reglas CSS huérfanas `.ant-carousel` en `global.css:21-40`. Se desinstala en la Fase 0.5. La regla "antd en el público / shadcn en el admin" queda reducida a **shadcn confinado a `src/pages/admin/**`**.

**Dinámica**: una fase por vez, informe al terminar, OK explícito antes de la siguiente.

**Estado**: Fases 0, 0.5, 0.6, 1, 2, 3, 3.9 y 3.5 ✅ completadas y mergeadas a `main`.
**Siguiente: Fase 4 — auth.**

**Fases**: 0, 0.5, 0.6, 1, 2, 3, 3.9, 3.5, **4**, 5, 6, 6.5, 7, 8, 8.5, 9.

Informes complementarios, todos lectura obligatoria antes de tocar lo suyo:
`INFORME-FASE-0.md` (inventario y clasificación MUERTO/ZOMBIE/VIVO),
`INFORME-FASE-2.md` (diferencias entre `data.jsx` y el adaptador),
`INFORME-FASE-3.md` (sitio leyendo de la DB, filtro por slug, 404, fallback),
`INFORME-FASE-3.5.md` (tri-estado, `hide_location`, íconos de servicios).

> **Arranque de la Fase 4.** Los tres primeros pasos, en este orden:
> 1. Agregar el alias `@/*` a `tsconfig.json` — **no existe todavía**. Ningún archivo usa
>    imports absolutos, así que el riesgo es nulo:
>    ```json
>    "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }
>    ```
> 2. `npx shadcn@latest init`, que **exige** ese alias. Verificar el setup contra la
>    documentación oficial: con Tailwind v4 no hay `tailwind.config.js` clásico.
> 3. `/admin/login`, guard y redirecciones.
>
> Dos cosas ya resueltas que la Fase 4 hereda: `clsx` y `tailwind-merge` **ya están
> instaladas** (se preservaron a propósito en la Fase 0.5 para el helper `cn()`), y
> `src/lib/supabase.ts` —el cliente de browser, que hasta ahora no usaba nadie— ya no tira
> si faltan las credenciales: devuelve `null` y **quien lo use tiene que contemplarlo**.
>
> ⚠️ **Trampa heredada de la Fase 3**: las variables `PUBLIC_*` se incrustan en tiempo de
> build. En el servidor hay red de contención vía `process.env`, pero **en el browser no**.
> Si el bundle se compiló sin las claves, `supabase.ts` queda en `null` sin forma de
> recuperarse en runtime, y eso **rompe el login**. Ante cualquier duda, redeploy
> destildando *Use existing Build Cache*. Ver `INFORME-FASE-3.md` §8.

---

## 1. Estado de `data.jsx`

Normalización **terminada y verificada** en la Fase 0. Servicios reducidos a seis categorías sin sinónimos (`Agua`, `Luz`, `Gas`, `Cloaca`, `Pavimento`, `Wifi`); precios todos string con `'A consultar'` como único no numérico; tipos consistentes; `category` solo `'Alquiler'`/`'Venta'`; las 18 propiedades cumplen la convención de media (primer elemento = imagen).

**Único resto**: `'A consultar'` figura como servicio en los ids 1, 2 y 3 → el script lo traduce a array vacío.

**`categoryItem` es un export muerto**: no lo importa nadie. No hay que migrarlo ni preservarlo. Se va con `data.jsx` en la Fase 9.

---

## 2. Reglas de negocio

### 2.1 Regla `barrio` → `localidad`

Si el valor empieza con "Barrio", la propiedad está en San Salvador de Jujuy; si no, está fuera. Se cumple en las 18, con una excepción: la id 12 (`'A consultar'`, ubicación oculta a propósito, sí está en San Salvador).

```
si barrio empieza con "Barrio "   → localidad = San Salvador de Jujuy
                                    barrio    = resto del string
si barrio == "A consultar"        → localidad = San Salvador de Jujuy
                                    barrio    = NULL, hide_location = true
en cualquier otro caso            → localidad = el valor tal cual
                                    barrio    = NULL
```

Localidades: `San Salvador de Jujuy`, `Palpalá` (ids 3, 18), `San Antonio` (id 11).

### 2.2 `hide_location` oculta el texto, NO el mapa

En la id 12 se reserva barrio y calle a propósito, pero el mapa apunta a la zona real por preferencia de la dueña. **No implementar difuminado ni desplazamiento de coordenadas.**

> **Hallazgo de la Fase 0**: `mostrarDireccionExacta` **no se lee en ningún archivo** y la dirección se imprime siempre (`ProductDetailsReact.jsx:226-234`). Hoy la id 12 muestra literalmente `"A consultar, A consultar, Jujuy, Argentina"` en producción. `hide_location` y `show_exact_address` **no son un ajuste, son funcionalidad nueva** que se escribe desde cero en la Fase 3.5.

### 2.3 Tri-estado de los campos numéricos ⭐ REGLA CENTRAL

| Estado | Valor en DB | Ficha de detalle | Tarjetas compactas |
|---|---|---|---|
| **Cargado** | el número | el número | el número |
| **Sin dato** | `NULL` | **"A consultar"** | **se omite el chip entero** |
| **No tiene** | `0` | **"No tiene"** | **`0`** |

**Reglas duras:**

1. **`NULL` nunca llega crudo a la vista pública.** Ni "null", ni "0", ni "undefined", ni un renglón en blanco.
2. **Dejar un campo vacío es una acción válida y silenciosa.** No se valida como error, no se advierte, no se pide confirmación.
3. **"No tiene" es explícito**: un checkbox al lado del campo, no un `0` tipeado. Al marcarlo, el input se deshabilita y se guarda `0`.

**Decisión sobre tarjetas compactas** (`ProductList.jsx:85-87`, `PropertySearchCard.jsx:116-120`): esos valores viven en un renglón de tres columnas con íconos en `text-xs`; poner "A consultar" tres veces desarma el layout en mobile. Por eso, en las tarjetas **el chip completo (ícono + valor) se omite** cuando el campo es `NULL`. No se muestra una raya ni un cero: simplemente no aparece. Esto respeta la regla 1 sin mentir y sin romper el diseño. El texto "A consultar" queda para la ficha de detalle, donde hay lugar.

**Qué campos llevan el checkbox "No tiene":**

| Campo | Checkbox | Motivo |
|---|---|---|
| `cocheras`, `dormitorios`, `banos`, `ambientes` | Sí | "No tiene" es información de venta legítima |
| `expensas` | Sí | "Sin expensas" es un argumento comercial fuerte |
| `superficie_m2`, `frente_m`, `fondo_m` | **No** | Toda propiedad tiene superficie; solo puede desconocerse |

**Por qué `0` y no columnas booleanas:** en un campo contable, "cero" y "no tiene" son lo mismo. No es un centinela improvisado, es la semántica real.

**`expensas` en la migración**: hoy está en `0` en cinco propiedades y ausente en trece. Ese patrón sugiere relleno automático, no una afirmación. Se migra como `NULL`. Si la dueña confirma que esas cinco no tienen expensas, es un `UPDATE` de una línea.

> **Hallazgo de la Fase 0 — el bug que motiva toda esta sección**: `ProductDetailsReact.jsx:41` hace `product.detalles?.cocheras || '0'`. Una propiedad **sin dato** de cocheras muestra hoy **"Cocheras: 0"**, o sea *afirma que no tiene cochera*. Afecta a las ids 4, 5, 6, 7, 9, 10 y 11 — incluido el terreno de 20 hectáreas.

### 2.4 Galpón y Nave son tipos distintos

Una **Nave** es más grande y es un monoambiente sin divisiones; un **Galpón** puede tener secciones (baños, oficinas, kitchenette). No unificar.

---

## 3. FASE 0.5 — Limpieza del código residual

> Fase 0 completada. Los candidatos están clasificados en `INFORME-FASE-0.md` §B.2.

### 3.1 Protocolo

1. Rama dedicada: `git checkout -b limpieza/ecommerce-residual`.
2. **Un commit por ítem**, en el orden de §3.2. Nunca un commit gigante.
3. Después de cada commit: `npm run build` **y** `npm run preview`, recorriendo `/`, `/busqueda` y al menos dos fichas de propiedad.
4. Al final, preview de Vercel y recorrido completo antes de mergear.
5. Si algo se rompe, `git revert` de un commit chico.

### 3.2 Orden de borrado (el orden importa)

| # | Ítem | Por qué en esta posición |
|---|---|---|
| 1 | `src/components/ProductDetails.jsx` | **Primero**: arrastra un import a `react-router-dom`, paquete **no instalado**. El build pasa solo porque nadie lo importa. Es el archivo más frágil del repo |
| 2 | `src/components/MapComponent.jsx` | Su único importador era el #1 |
| 3 | `src/components/Cart.jsx` | Único consumidor de `@stripe/stripe-js` |
| 4 | `src/components/HeroStats.jsx` | Texto de restaurante en inglés, residuo de plantilla |
| 5 | `src/components/PropertyGallery.jsx` | La galería real está inline en `ProductDetailsReact.jsx:93-141` |
| 6 | `src/components/Welcome.astro` + `src/assets/astro.svg` + `src/assets/background.svg` | Los dos SVG quedan huérfanos al borrar el `.astro`; van en el mismo commit |
| 7 | `src/index.css` + `src/assets/react.svg` | ⚠️ **Cuidado con el nombre**: el vivo es `src/styles/global.css`. Antes de borrar, `grep -r "index.css"` en todo el repo incluyendo `astro.config.mjs` y `package.json` |
| 8 | `npm uninstall @stripe/stripe-js antd framer-motion react-swipeable` + borrar las reglas `.ant-carousel` de `src/styles/global.css:21-40` | Después de #3, que deja a Stripe sin consumidores |

### 3.3 Qué NO se toca

- **`clsx` y `tailwind-merge`**: hoy no se usan, pero son las dos dependencias del helper `cn()` de shadcn/ui. La Fase 4 las necesita. Desinstalarlas y reinstalarlas es trabajo al pedo.
- **`tailwindcss`**: falso positivo de depcheck. Se usa vía `@tailwindcss/vite` en `astro.config.mjs` y vía `@import "tailwindcss"` en `global.css:1`. **Tocarlo tumba todo el CSS.**
- **`ShopContext.jsx` + `AppWrapper.jsx`**: es el único borrado que puede tumbar `/` y `/busqueda`. `AppWrapper` está importado con `client:load` desde las dos páginas. **Se pospone a la Fase 9.** No molesta a nadie mientras esté.
- **`public/**`**: 208 archivos, ~120 referenciados. Los sobrantes son fotos de propiedades reales, ocupan disco y no bundle, y §11 ya decide que los medios legacy se quedan ahí. **Limpieza de `public/` = tarea aparte, después de la Fase 7**, cuando el panel permita ver qué archivo pertenece a qué propiedad.
- **`astro.config.mjs`**: ya está en el estado correcto (`output` default `'static'` + adapter Vercel). No hay que tocarlo.

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
  legacy_label text,              -- string exacto que espera el frontend actual
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
  neighborhood_id  int references public.neighborhoods(id),

  price numeric(14,2),
  show_price boolean not null default true,
  price_from boolean not null default false,
  currency text not null default 'ARS',

  calle text not null default '',
  numero text not null default '',
  show_exact_address boolean not null default false,
  hide_location boolean not null default false,

  -- TRI-ESTADO: NULL = "A consultar" | 0 = "No tiene" | n = el valor
  ambientes   int,
  dormitorios int,
  banos       int,
  cocheras    int,
  expensas    numeric(14,2),

  -- DOS ESTADOS: NULL = "A consultar" | n = el valor
  superficie_m2 numeric,
  frente_m      numeric,
  fondo_m       numeric,

  lat double precision,
  lon double precision,
  mapa_query text,                -- referencia para el panel; el mapa usa lat/lon

  adicionales text[] not null default '{}',

  published boolean not null default false,
  featured boolean not null default false,
  sort_order int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medidas_sin_cero check (
    (superficie_m2 is null or superficie_m2 > 0) and
    (frente_m      is null or frente_m      > 0) and
    (fondo_m       is null or fondo_m       > 0)
  ),
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

-- sort_order = 0 es SIEMPRE la portada y SIEMPRE imagen (tres componentes hacen images[0] sin filtrar videos)
create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  storage_path text,
  kind public.media_kind not null default 'image',
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.property_media (property_id, sort_order);

create table public.property_notes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger properties_touch     before update on public.properties
  for each row execute function public.touch_updated_at();
create trigger property_notes_touch before update on public.property_notes
  for each row execute function public.touch_updated_at();
```

> **Novedad del v5**: la columna `property_types.legacy_label` guarda el string exacto que espera el frontend actual (`'Local'`, `'Galpon'`, `'Nave'`), separado del `label` de presentación (`'Local Comercial'`, `'Galpón / Depósito'`, `'Nave Industrial'`). Sin esto, el filtro de tipo —que compara por igualdad estricta en `Busqueda.jsx:96`— deja de matchear para tres de los siete tipos.

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

| slug | label (presentación) | legacy_label (lo que espera el frontend) |
|---|---|---|
| `casa` | Casa | `Casa` |
| `departamento` | Departamento | `Departamento` |
| `local` | Local Comercial | **`Local`** |
| `oficina` | Oficina | `Oficina` |
| `galpon` | Galpón / Depósito | **`Galpon`** |
| `nave` | Nave Industrial | **`Nave`** |
| `terreno` | Terreno | `Terreno` |

### 5.2 `localidades` y `neighborhoods`

Localidades: `san-salvador-de-jujuy`, `palpala`, `san-antonio`.
Barrios (hijos de San Salvador): Centro, Los Perales, Cuyaya, **Chijra**, Alto Comedero, Almirante Brown, San Pedrito, **Gorriti**.

> Chijra y Gorriti **no figuran hoy** en ninguno de los dos `<select>` de barrios: las propiedades 10 y 15 son inalcanzables por filtro. Al alimentar el selector desde el catálogo, se arreglan solas.

### 5.3 `services`

| slug | label |
|---|---|
| `agua` | Agua |
| `luz` | Luz |
| `gas` | Gas |
| `cloaca` | Cloaca |
| `pavimento` | Pavimento |
| `wifi` | Wifi |

`'A consultar'` (ids 1, 2, 3) no es un servicio: array vacío.

> Los íconos de `ProductDetailsReact.jsx:9-16` están mapeados con claves viejas (`'Agua Potable'`, `'Gas Natural'`, `'Electricidad'`, `'Internet'`). Cuatro de los seis servicios caen hoy al ícono genérico. Se corrige en la Fase 3.5 (cosmético).

### 5.4 Reglas de conversión numérica

```
superficie_m2 / frente_m / fondo_m:
    0, "", "a consultar", ausente  → NULL
    "180", 640, 200000             → el número

ambientes / dormitorios / banos / cocheras:
    0        → 0        (se conserva: "No tiene")
    ausente  → NULL     ("A consultar")

expensas:
    0, ausente → NULL

price:
    "A consultar" → NULL      ⚠️ NUNCA a 0 (ver §9, regla 11)
    "480000"      → 480000
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

**Superficies con valor**: id 3 → 180, id 5 → 640, id 11 → 200000. El resto `NULL`.
**Ceros conservados como "No tiene"**: `cocheras` en ids 3, 8, 12, 13, 14, 15, 16, 18 · `dormitorios` en 4, 8, 13, 14, 18 · `banos` en 14.

---

## 6. Variables de entorno

```
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # SOLO para scripts locales de migración
```

`.env` ya está en `.gitignore` (verificado en la Fase 0). La service role key nunca lleva prefijo `PUBLIC_` ni se importa en un `.astro` sin `prerender = false`.

---

## 7. Fases

**Fase 0 — ✅ COMPLETADA.** Ver `INFORME-FASE-0.md`.

**Fase 0.5 — ✅ COMPLETADA.** §3. Nueve commits en `limpieza/ecommerce-residual`: 11 archivos borrados, 4 dependencias desinstaladas (−68 paquetes del árbol), build y recorrido verificados tras cada commit. El bundle JS quedó idéntico byte a byte porque nada de lo borrado estaba importado; el ahorro real fue −4,9 KB de CSS y el árbol de dependencias.

**Fase 0.6 — ✅ COMPLETADA. Formulario de contacto.** Deuda técnica #1 del §12: `Footer.jsx:20-25` solo hacía `console.log` y un `alert`, así que **las consultas de clientes se perdían**. Va antes que Supabase porque era pérdida de negocio en curso y no dependía de nada del panel.

**Solución puente deliberada.** Se implementó lo mínimo que funciona, sabiendo que se tira entero en la Fase 8.5: `fetch` nativo desde `Footer.jsx` directo a `https://api.web3forms.com/submit`, sin endpoint propio. Se descartó la alternativa de endpoint propio (`src/pages/api/contacto.ts`) más un proveedor transaccional por dos motivos:

1. **Los términos de Web3Forms no lo permiten en el plan gratuito.** Su API reference dice: *"Server side usage requires paid plan + server IP whitelisting"*. Además el whitelisting de IP es impracticable en Vercel, cuyas funciones serverless salen por IPs dinámicas.
2. **No se amortiza.** Un endpoint propio más un dominio verificado se descartan igual en la Fase 8.5, que es la fase siguiente a Supabase. No vale la pena construir infraestructura para un puente.

Lo implementado:

- `POST` con `fetch` nativo, **sin dependencias nuevas de npm**.
- `PUBLIC_WEB3FORMS_ACCESS_KEY` en `.env` (ignorado por git) y documentada en `.env.example`. Lleva prefijo `PUBLIC_` a propósito: la access key es pública por diseño y Web3Forms lo documenta explícitamente. **Hay que cargarla también en Vercel** o el formulario anda en local y falla en producción.
- Manejo de error real: si el envío falla, el usuario ve el error con el teléfono como alternativa, y **el formulario no se limpia** para que pueda reintentar sin retipear. **Nunca un "gracias" falso.** Se contempla que Web3Forms devuelve `{ success: false }` con HTTP 200, así que no alcanza con mirar `response.ok`.
- Botón deshabilitado con "Enviando…" mientras está en vuelo.
- Honeypot `botcheck` oculto en el `<form>`.
- Si la variable de entorno falta, no se intenta el envío: se muestra un error con el teléfono.

**Límite a vigilar: 250 envíos/mes** en el plan gratuito (verificado en su FAQ). Superado eso, la API devuelve error y el usuario ve el mensaje de fallo. Es una de las razones para no demorar la Fase 8.5.

**Lo que esta fase NO da**, y se pospone a la 8.5: el honeypot y el rate limiting son de Web3Forms, no nuestros. Del lado nuestro solo está el campo oculto.

*Verificación: envío real recibido en la casilla de destino; envío con la key ausente que muestra error y no finge éxito.*

**Fase 1 — Supabase + esquema.** Proyecto, migración SQL, catálogos semilla (con `legacy_label`), usuario de la dueña, `insert into admins`, signup público desactivado, bucket. *Verificación: `select public.is_admin()` correcto y las policies bloquean lo esperado.*

**Fase 2 — Cliente, adaptador y migración.** Crea `src/lib/supabase.ts`, `supabase-server.ts`, `mapProperty.ts` y `scripts/migrate-data.mjs`. **No toca ningún archivo existente del sitio.**

> El adaptador devuelve **el shape legacy exacto**: `NULL` → `'a consultar'`, `0` → `0`, `images` como array plano de strings ordenado por `sort_order`. Nada de "No tiene" todavía.
> **Tres trampas confirmadas en la Fase 0:**
> 1. `price = NULL` → `null` o `'A consultar'`, **nunca `0`**: cuatro de los seis formateadores usan `!isNaN(price)` e imprimirían `$0`.
> 2. `detalles.tipo` debe devolver `legacy_label`, no `label`.
> 3. `images[0]` siempre imagen: tres componentes lo asumen sin filtrar videos.

*Verificación: la tabla de §5.5 fila por fila.*

**Fase 3 — Sitio público leyendo de la DB.** Estrategia aprobada: **prop opcional con fallback**.

```js
// patrón en los 4 componentes que hoy importan productsData directo
const products = productsProp ?? productsData;
```

Son ~2 líneas por componente, el fallback sigue vivo hasta la Fase 9, y no hay round-trip ni estado de carga. Archivos: `Busqueda.jsx`, `ProductList.jsx`, `Carrusel.jsx`, `Homepage.jsx` (pasa el prop hacia abajo).

Páginas: `prerender = false` + fetch + `mapDbToProduct()` en `index.astro`, `busqueda.astro` y `propiedades/[id].astro` (esta última pierde `getStaticPaths`). Header `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

**Sub-tarea obligatoria — rehacer el filtro de barrio.** Hoy devuelve **0 resultados para 11 de sus 12 opciones**: las listas están hardcodeadas sin el prefijo "Barrio" y la comparación es igualdad estricta. El único valor que funciona (`Palpalá`) pasa a ser localidad y se rompe. Al migrar:
- Los dos `<select>` (desktop `SearchFilters.jsx:11-12` y mobile `MobileFiltersModal.jsx:13-14`, hoy **divergentes**) se alimentan desde `localidades` y `neighborhoods`.
- Se comparan **slugs**, no texto visible: elimina de raíz el problema de tildes y mayúsculas.
- Se agrega `'Oficina'` al filtro de tipo (`SearchFilters.jsx:90`, `MobileFiltersModal.jsx:95`): las ids 4 y 8 hoy no se pueden filtrar.
- Filtro por localidad además de barrio.

*Verificación: comparación visual contra producción propiedad por propiedad, más una prueba explícita de cada opción de los tres filtros. El filtro va a mejorar respecto de hoy — eso es esperado, no una regresión.*

> **Nota sobre SEO**: `ProductDetailsReact` y `Busqueda` ya se montan con `client:only="react"`, así que el HTML servido nunca tuvo ese contenido. Pasar a SSR **no empeora nada**; el `<head>` de `Layout.astro` sigue generándose en el servidor.

**Fase 3.5 — Renderizado tri-estado.** Alcance cerrado:

| Ítem | Archivo | Líneas |
|---|---|---|
| Helper `formatTriEstado()` | `src/lib/format.js` (nuevo) | ~15 |
| 6 specs de la ficha | `ProductDetailsReact.jsx:36-41` | 6 |
| Quitar el `\|\| '0'` de cocheras (el bug que afirma "no tiene") | `ProductDetailsReact.jsx:41` | 1 |
| 3 chips del home (omitir si `NULL`) | `ProductList.jsx:85-87` | 3 |
| 3 chips de búsqueda (omitir si `NULL`) | `PropertySearchCard.jsx:116,117,120` | 3 |
| **`hide_location` + `show_exact_address`: escribir desde cero** | `ProductDetailsReact.jsx:226-234` y `:148` | ~15 |
| Íconos de servicios con las claves nuevas | `ProductDetailsReact.jsx:9-16` | ~6 |

**Fuera de alcance de la 3.5**: renderizar `frente_m`, `fondo_m` y `expensas`. No existe UI para ellos hoy, y tras la migración los 18 quedan en `NULL` — agregarlos ahora solo pintaría "A consultar" dieciocho veces. **Se difieren a la Fase 6.5**, cuando la dueña ya pueda cargarlos y se vea qué datos existen de verdad.

*Verificación: recorrer las 18 fichas y confirmar que no aparece "null", "0" suelto, "undefined", "a consultar" en minúscula, ni "A consultar, A consultar, Jujuy, Argentina".*

**Fase 4 — Auth.** Agregar el alias `@/*` a `tsconfig.json` (no existe hoy; ningún archivo usa imports absolutos, así que el riesgo es nulo):

```json
"compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }
```

Después `npx shadcn@latest init`, `/admin/login`, guard, ícono discreto en el footer. *Verificación: sin sesión redirige; un autenticado fuera de `admins` no ve nada; un fetch directo a `property_notes` desde el browser devuelve vacío.*

**Fase 5 — Shell del panel.** `npx shadcn@latest add sidebar-07`, borrar lo de ejemplo, aplicar la paleta. Español rioplatense. *Verificación: responsive en celular.*

**Fase 6 — CRUD.** Se hace en sub-fases, con un commit y una verificación cada una:

| | Alcance |
|---|---|
| **6a** | Listado: búsqueda, filtro por operación y por publicación, toggle de publicado, estado comercial y archivado |
| **6b** | Formulario: textos y selects (título, descripción, requisitos con "insertar texto estándar", operación, tipo/localidad/barrio con "agregar nuevo", precio + switches) |
| **6c** | Campos numéricos con el tri-estado de §8 |
| **6d** | Servicios, adicionales y dirección con switches de visibilidad |
| **6e** | Mapa Leaflet con marcador arrastrable |
| **6.6** | Sitio público: ordenar disponibles primero y marcar las no disponibles |

Alta como borrador (`published = false`). Publicar es un botón aparte y explícito.

*Verificación: ciclo crear → publicar → ver → editar → despublicar, probando los tres estados de un campo numérico.*

#### Estado comercial y archivado (6a)

Dos columnas nuevas, cada una con su script para correr a mano en Supabase:

| Columna | Script | Para qué |
|---|---|---|
| `estado` (`disponible` / `alquilada` / `vendida`) | `scripts/fase6-estado-propiedad.sql` | Marcar que ya se alquiló o se vendió, sin ensuciar el título |
| `archived_at` | `scripts/fase6-archivar-propiedad.sql` | "Eliminar" sin borrar: la fila queda y se puede recuperar |

**Por qué `estado` y no el título.** Antes esto se hacía escribiendo `-ALQUILADA-` en el
nombre, lo que ensuciaba el título en la web, en Google y en lo que se comparte por
WhatsApp. El script migra las dos propiedades que lo tenían y les limpia el prefijo.

**En el panel, dos acciones separadas:**

1. **Toggle "ya no está disponible"**, con la etiqueta según la operación: *"Ya se alquiló"*
   para alquiler, *"Ya se vendió"* para venta. Sin vocabulario técnico. Reversible, igual
   que el de publicado.
2. **Eliminar**, que en realidad **archiva**. Para la dueña la experiencia es la misma:
   toca eliminar y desaparece. Por dentro es un `UPDATE` de `archived_at`, recuperable con
   otro `UPDATE`.

**El borrado accidental es un riesgo real**, porque va a usar esto desde el celular. Por
eso: el botón de eliminar **no va pegado a los toggles**, y el diálogo exige más que un
"Aceptar" — muestra el título de la propiedad y pide una confirmación deliberada aparte.

> **El filtro de archivadas va en RLS, no solo en la consulta.** Si una propiedad archivada
> quedara con `published = true`, filtrar únicamente del lado del cliente la dejaría
> visible para cualquiera que arme la consulta a mano. El script recrea las tres policies
> de lectura pública sumando `archived_at is null`. El admin sigue viendo todo, que es lo
> que permite recuperarla.

**En el sitio público (6.6):** las no disponibles **no se ocultan** — mostrar que la
inmobiliaria mueve propiedades es bueno comercialmente. Van **al final del listado** y
**marcadas visiblemente**. Es trabajo sobre el frontend público, con su propia verificación
visual, así que va en su propia sub-fase después del formulario.

**Fase 6.5 — Campos nuevos en la ficha.** `expensas`, `frente_m`, `fondo_m`: secciones nuevas en `ProductDetailsReact.jsx`, con el mismo tri-estado. Solo si la dueña efectivamente carga esos datos.

**Fase 7 — Uploader.** Drag & drop, preview, reordenamiento, borrado. **Valida que el primer elemento sea imagen.** Compresión en cliente (canvas → webp). Al borrar media con `storage_path`, borra también del bucket; si es `NULL` (legacy), solo la fila.

> **Pendiente bloqueante**: `/propiedades/unisex.jpg` es el placeholder de fallback de `PropertySearchCard.jsx:11,22`, `Carrusel.jsx:63` y `PropertyMap.jsx:101`, y **no existe**. Hoy nunca se dispara, pero la primera propiedad que la dueña cargue sin foto va a mostrar una imagen rota. Crear el archivo (o cambiar los tres fallbacks) **antes** de esta fase.
> **Riesgo a mitigar**: la detección de video es `url.endsWith('.mp4'|'.mov'|'.webm')`. Si Supabase Storage devuelve URLs con querystring, la detección falla y se renderiza un `<img>` roto. Forzar URLs limpias o cambiar la detección por el campo `kind`.

**Fase 8 — Bloc de notas.** Editor por propiedad, autosave con debounce, timestamp, cartel "Estas notas son privadas". *Verificación: por Network, la tabla no aparece en ninguna respuesta pública.*

**Fase 8.5 — Consultas del formulario a Supabase.** La Fase 0.6 dejó el formulario de contacto andando contra un servicio externo de formularios. Acá las consultas pasan a vivir en la base, y la dueña las ve desde el panel en vez de depender del correo.

```sql
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  nombre   text not null,
  email    text not null,
  telefono text not null default '',
  ciudad   text not null default '',
  asunto   text not null default '',
  mensaje  text not null default '',

  property_id uuid references public.properties(id) on delete set null,  -- si la consulta salió de una ficha

  leido       boolean not null default false,
  archivado   boolean not null default false,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index on public.contact_messages (archivado, created_at desc);

alter table public.contact_messages enable row level security;

-- anon SOLO puede insertar. No puede leer, editar ni borrar: sin policy de select
-- para anon, un fetch desde el browser devuelve vacío aunque adivine la tabla.
create policy "cualquiera puede enviar una consulta" on public.contact_messages
  for insert to anon, authenticated with check (true);

create policy "admin gestiona consultas" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

Alcance:

- **Web3Forms se retira por completo.** No queda como respaldo. Se borra el `fetch` a `api.web3forms.com` de `Footer.jsx`, se saca `PUBLIC_WEB3FORMS_ACCESS_KEY` de `.env`, de `.env.example` y de las variables de entorno de Vercel, y se da de baja la cuenta. El formulario pasa a escribir directo en `contact_messages`.
- **Recién acá el honeypot y el rate limiting pasan a ser nuestros.** En la Fase 0.6 los provee Web3Forms desde su servidor (validan `botcheck` y devuelven 429 por su cuenta) y lo único nuestro es el campo oculto en el `<form>`, que un bot decidido puede saltear. Al desaparecer el intermediario hay que implementar los dos del lado nuestro: validación del honeypot en el servidor y rate limiting básico por IP, en el endpoint o en una función `security definer` de Postgres. **Si no se hacen, la tabla queda abierta a que cualquiera la llene**: la policy de insert para `anon` es `with check (true)` por necesidad.
- Bandeja en el panel: listado con no leídas primero, marcar leída/archivada, link `mailto:` y a WhatsApp con el teléfono.
- Badge con el conteo de no leídas en el sidebar.
- **Aviso por correo**: al irse Web3Forms, la dueña deja de recibir el mail y tiene que entrar al panel. Si eso no funciona en la práctica, se resuelve con un webhook o un trigger de Supabase que dispare la notificación, no reinstalando Web3Forms.

> **Nota sobre el destinatario — pendiente abierto desde la Fase 0.6.** Hoy las consultas van a `baruc276@gmail.com`, que es el correo del dev, no el de la dueña. En la Fase 0.6 el destinatario no está en el código: está atado a la access key y se cambia desde el panel de Web3Forms. **Al migrar a `contact_messages` esto deja de ser un problema de configuración**: las consultas quedan en la base y las ve quien tenga acceso al panel. Igual hay que decidir a qué dirección van los avisos por correo, y si se suma o se reemplaza por la de la dueña. Es el ítem 7 del §12.

*Verificación: enviar una consulta desde el sitio y confirmar que (1) aparece en la tabla, (2) se ve en el panel, (3) un `select` anónimo desde el browser contra `contact_messages` devuelve vacío, y (4) no queda ninguna referencia a web3forms en el código ni en las variables de entorno.*

**Fase 9 — Cierre.** Borrar `data.jsx` y `categoryItem`; sacar `ShopContext.jsx` + simplificar `AppWrapper.jsx` con el protocolo de dos pasos; revisar bundle; instructivo con capturas para la dueña; credenciales en un gestor de contraseñas.

> **Al borrar `data.jsx`, además:**
> - Sacar el `?? productsData` de los cuatro componentes que lo usan como fallback
>   (`Homepage`, `ProductList`, `Carrusel`, `Busqueda`) y el `productsData.find(...)` de
>   `propiedades/[id].astro`. Ahí el fallback deja de existir: **conviene decidir antes qué
>   se sirve si Supabase no responde**, porque hoy la respuesta es "el sitio sigue en pie
>   con datos viejos" y va a pasar a ser un error.
> - Simplificar `formatUbicacion()` en `src/lib/format.js`: la detección de ubicación
>   reservada por el centinela `'A consultar'` existe **solo** para el fallback. Con
>   `data.jsx` afuera, queda `detalles.hide_location === true` y nada más. Es el ítem 12
>   del §12.
> - Revisar si `zonaDeProducto()` en `src/lib/zonas.js` todavía necesita derivar slugs del
>   texto legacy, por el mismo motivo.

---

## 8. Diseño del formulario (Fase 6)

Campos: título, descripción, requisitos (con botón "insertar texto estándar"), operación (radio), tipo / localidad / barrio desde catálogo con opción "agregar nuevo", precio + switch "mostrar precio" + switch "desde", servicios por checkbox, adicionales como tags libres, dirección + switches de visibilidad, mapa Leaflet con marcador arrastrable.

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

- Marcar "No tiene" **deshabilita** el input y guarda `0`. Desmarcarlo vacía el input y guarda `NULL`.
- Un campo vacío **no es un error**: sin validación, sin advertencia, sin confirmación.
- Texto de ayuda fijo bajo el grupo:
  > *Si dejás un campo vacío, en la web aparece como "A consultar". Si marcás "No tiene", aparece que la propiedad no lo tiene.*

---

## 9. Reglas permanentes para Claude Code

1. **Verificar versiones contra documentación oficial antes de escribir configuración.** El modo `hybrid` de Astro ya no existe (`output: 'static'` + adapter + `prerender = false` por página). Verificar el setup de shadcn con Tailwind v4 (no hay `tailwind.config.js`).
2. **Minimizar el diff en el frontend público.** El patrón aprobado es prop opcional con fallback, no reescritura.
3. **shadcn/ui confinado a `src/pages/admin/**`.**
4. **Una fase por vez.** Al terminar, parar y reportar.
5. **Ante la duda al borrar código, no borrar.**
6. **Un campo vacío puede ser una decisión comercial, no un error.** No completar ni "arreglar" datos por iniciativa propia; sin validaciones de obligatoriedad más allá de título y operación.
7. **`NULL` nunca llega crudo a la vista pública.**
8. **`hide_location` no afecta al mapa.**
9. **Sin datos de prueba inventados** en producción.
10. **UI en español rioplatense** para una persona no técnica.
11. **`price` nunca se mapea a `0`.** Cuatro formateadores usan `!isNaN(price)` e imprimirían `$0`.
12. **`detalles.tipo` devuelve `legacy_label`**, no el label de presentación.
13. Si algo del plan no encaja con el código, **decirlo y proponer alternativa**, no forzarlo.

---

## 10. Pasos manuales en Supabase (para el dev)

1. supabase.com → New Project, región South America (São Paulo). Guardar la contraseña de la DB.
2. Project Settings → API: copiar `Project URL`, `anon public key`, `service_role key`.
3. SQL Editor: correr la migración en dos tandas (esquema, después policies).
4. Authentication → Users → Add user: email + contraseña de la dueña. Copiar el `user_id`.
5. SQL Editor: `insert into public.admins (user_id) values ('<uuid>');`
6. Authentication → Sign In / Providers → Email → **desactivar "Allow new users to sign up"**.
7. Storage → New bucket: `propiedades`, público.
8. Cargar las env vars en Vercel antes del primer deploy con SSR.

---

## 11. Storage

Tier gratuito: **1 GB**. Casi todas las propiedades tienen `.mp4`. Los videos actuales **se quedan en `/public/propiedades/`** (CDN de Vercel, gratis); los nuevos van a Supabase con límite por archivo. Por eso `property_media.url` es texto libre. Cuando el bucket se acerque al límite, evaluar Cloudflare R2/Stream, Vercel Blob o Supabase Pro.

---

## 12. Deuda técnica detectada en la Fase 0 (fuera del alcance del panel)

| # | Hallazgo | Ubicación | Gravedad |
|---|---|---|---|
| 1 | **El formulario de contacto del footer no envía nada**: solo hace `console.log` y un `alert`. La dueña puede estar creyendo que le llegan consultas | `Footer.jsx:20-25` | 🔴 **Alta — pérdida de clientes.** Se arregla en la **Fase 0.6** |
| 2 | **El filtro de barrio devuelve 0 resultados** para 11 de 12 opciones | `SearchFilters.jsx:11-12`, `MobileFiltersModal.jsx:13-14` | 🔴 **Alta — pérdida de clientes** |
| 3 | La id 12 muestra `"A consultar, A consultar, Jujuy, Argentina"` como dirección | `ProductDetailsReact.jsx:226-234` | 🟠 Media |
| 4 | 10 propiedades muestran `a consultar m²` en minúscula pegado al ícono de superficie | `ProductList.jsx:87`, `PropertySearchCard.jsx:120` | 🟠 Media |
| 5 | Siete propiedades muestran "Cocheras: 0" sin tener el dato | `ProductDetailsReact.jsx:41` | 🟠 Media |
| 6 | `'Oficina'` falta en los dos filtros de tipo | `SearchFilters.jsx:90`, `MobileFiltersModal.jsx:95` | 🟠 Media |
| 7 | El email `baruc276@gmail.com` figura como contacto público de la inmobiliaria | `Footer.jsx:135` | 🟠 Media — revisar con la dueña |
| 8 | No existe página `/404`, pero `[id].astro:16` redirige ahí | `src/pages/` | 🟡 Baja |
| 9 | Opción de orden "Antigüedad" que no ordena nada (el campo no existe en ninguna propiedad) | `Busqueda.jsx:114`, `SearchResultsHeader.jsx:30` | 🟡 Baja |
| 10 | Orden por precio produce `NaN` con "A consultar" | `Busqueda.jsx:111-112` | 🟡 Baja |
| 11 | Clave `pk_test_` de Stripe versionada en git (pública, sin riesgo real, queda en el historial) | `Cart.jsx:9` | 🟡 Baja — `Cart.jsx` borrado en la Fase 0.5; la clave queda en el historial |
| 12 | **`anon` tiene `REFERENCES`, `TRIGGER` y `TRUNCATE` sobre todas las tablas**, incluidas `property_notes` y `admins`. Vienen de los *default privileges* preexistentes del proyecto de Supabase, **no** de `scripts/fase1-grants.sql`, que solo otorga `SELECT` y las escrituras del panel a `authenticated` | esquema `public` en Supabase | 🟠 Media — **revisar después de la Fase 6** |

| 12 | **`etiquetaZona()` detecta la ubicación reservada por dos vías**: `hide_location`, que expone el adaptador desde la Fase 3.5, y el centinela `'A consultar'` en `barrio` y `calle`, que es lo único que tiene el fallback de `data.jsx`. La segunda vía es deuda deliberada, no un descuido | `src/lib/format.js` (`formatUbicacion`, `etiquetaZona`) | 🟡 Baja — **se borra en la Fase 9** |

> **Detalle del ítem 12.** Mientras exista el fallback de `data.jsx`, el helper tiene que
> seguir reconociendo el centinela: ese archivo no tiene `hide_location` ni ninguna otra
> señal, y sin esa rama las ids 12 y 19 volverían a imprimir su dirección reservada si el
> sitio cae al fallback. **Cuando `data.jsx` desaparezca en la Fase 9**, la detección por
> centinela se puede borrar y `formatUbicacion` queda dependiendo solo de
> `detalles.hide_location`. Concretamente, se simplifica esta condición:
>
> ```js
> const reservada =
>   detalles.hide_location === true ||
>   (esSinDato(detalles.barrio) && esSinDato(detalles.calle) && !!detalles.barrio);
> ```
>
> a solo `detalles.hide_location === true`. Sumarlo al checklist de la Fase 9.

- El **ítem 1** entró al plan como **Fase 0.6** (arreglo inmediato contra un servicio externo) y se completa en la **Fase 8.5** (consultas en Supabase, visibles desde el panel).
- El **ítem 12** se resuelve solo al borrar `data.jsx` en la **Fase 9**.
- El **ítem 12** se revisa **después de la Fase 6**, no antes. Detalle para cuando llegue el momento: los tres privilegios sobrantes **no son explotables sin `SELECT` ni `INSERT`**, que `anon` no tiene sobre esas dos tablas. `REFERENCES` permitiría crear una FK contra ellas y `TRIGGER` adjuntar un trigger, pero las dos cosas requieren además ser dueño de otra tabla en el esquema, cosa que `anon` no es. **`TRUNCATE` es el único que molesta de verdad** y no debería estar: no lo frena RLS, porque RLS filtra filas y `TRUNCATE` opera sobre la tabla entera. Se saca con `revoke truncate on all tables in schema public from anon;` más el `alter default privileges` correspondiente. Se difiere para no tocar permisos con el panel a medio construir, donde un `revoke` de más se diagnostica mal.
- Los ítems **2 a 6, 8, 9 y 10** se resuelven dentro de las Fases 3 y 3.5.
- El **ítem 7** (el mail `baruc276@gmail.com` como contacto público de la inmobiliaria) sigue **fuera del plan y hay que decidirlo con la dueña**. Es el destinatario de las consultas de la Fase 0.6, así que conviene definirlo antes de que el formulario empiece a recibir tráfico real.
