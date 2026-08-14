# INFORME FASE 0 — Inventario y auditoría de código residual

> **Estado: solo lectura.** No se borró ni modificó ningún archivo del proyecto. El único
> archivo creado es este informe. Se ejecutó `npx astro build` una vez para tener una
> línea de base verde (salida en `dist/` y `.vercel/`, ambos ignorados por git).
>
> Build de referencia: **✅ OK — 20 páginas en 2m 25s**, `output: "static"`, adapter `@astrojs/vercel`.

---

## Índice

- [Parte A — Inventario](#parte-a--inventario)
  - [A.1 Estructura de `src/`](#a1-estructura-de-src)
  - [A.2 `astro.config.mjs` y `tsconfig.json`](#a2-astroconfigmjs-y-tsconfigjson)
  - [A.3 Quién importa `productsData` y `categoryItem`](#a3-quién-importa-productsdata-y-categoryitem)
  - [A.4 Los filtros](#a4-los-filtros--qué-se-rompe-con-el-cambio-de-barrio)
  - [A.5 El formateador de precio](#a5-el-formateador-de-precio)
  - [A.6 El carrusel de media](#a6-el-carrusel-de-media)
  - [A.7 El mapa Leaflet](#a7-el-mapa-leaflet)
  - [A.8 ⭐ CRÍTICO — campos numéricos](#a8--crítico--cómo-se-renderizan-hoy-los-campos-numéricos)
  - [A.9 antd y @stripe/stripe-js](#a9-dónde-se-usa-antd-y-dónde-stripe)
  - [A.10 `local-centro-alquila.png`](#a10-verificación-de-propiedadeslocal-centro-alquilapng)
  - [A.11 Lectura del plan y desajustes](#a11-lectura-del-plan-y-desajustes-con-el-código)
- [Parte B — Auditoría de código residual](#parte-b--auditoría-de-código-residual)
  - [B.1 Salida cruda de las herramientas](#b1-salida-cruda-de-las-herramientas)
  - [B.2 Tabla MUERTO / ZOMBIE / VIVO — archivos](#b2-tabla-muerto--zombie--vivo--archivos)
  - [B.3 Tabla — exports y dependencias de npm](#b3-tabla--exports-y-dependencias-de-npm)
  - [B.4 Trampas de Astro verificadas a mano](#b4-trampas-de-astro-verificadas-a-mano)
- [Anexo — Archivos a modificar en Fases 2, 3 y 3.5 con nivel de riesgo](#anexo--archivos-a-modificar-en-fases-2-3-y-35)

---

# PARTE A — INVENTARIO

## A.1 Estructura de `src/`

```
src/
├── data.jsx                          620 líneas — 18 propiedades + categoryItem
├── index.css                          44 líneas — ⚠️ NADIE lo importa (duplicado de global.css)
├── assets/
│   ├── SoniaLogo.png                 usado por Navbar, Footer, Nosotros
│   ├── SoniaLogo2.png                usado por Navbar
│   ├── fondoNos.jpg                  usado por Nosotros
│   ├── presentacion.mp4              usado por AboutUs
│   ├── astro.svg                     ⚠️ solo Welcome.astro (muerto)
│   ├── background.svg                ⚠️ solo Welcome.astro (muerto)
│   └── react.svg                     ⚠️ nadie
├── layouts/
│   └── Layout.astro                  head/SEO + Navbar + <slot/> + Footer
├── pages/                            ← RUTAS (nadie las importa, igual están vivas)
│   ├── index.astro                   /            → AppWrapper > LoadingScreen + Homepage
│   ├── busqueda.astro                /busqueda    → AppWrapper > Busqueda
│   └── propiedades/[id].astro        /propiedades/:id → ProductDetailsReact (getStaticPaths)
├── styles/
│   └── global.css                     39 líneas — importado por Layout.astro ✅
└── components/
    ├── AppWrapper.jsx                 9   VIVO   (index.astro, busqueda.astro)
    ├── Navbar.jsx                   228   VIVO   (Layout.astro, client:load)
    ├── Footer.jsx                   161   VIVO   (Layout.astro, client:load)
    ├── LoadingScreen.jsx            118   VIVO   (index.astro)
    ├── Homepage.jsx                  22   VIVO   (index.astro)
    │   ├── Hero.jsx                  98   VIVO
    │   ├── ProductList.jsx          181   VIVO   ← lee productsData
    │   ├── Carrusel.jsx             316   VIVO   ← lee productsData
    │   │   ├── RippleButton.jsx      72   VIVO
    │   │   └── bubble.jsx           171   VIVO
    │   ├── Nosotros.jsx             132   VIVO
    │   ├── AboutUs.jsx               82   VIVO
    │   └── Servicios.jsx            113   VIVO
    ├── ShopContext.jsx              103   VIVO por import, contenido residual de ecommerce
    ├── Busqueda/
    │   ├── Busqueda.jsx             218   VIVO   ← lee productsData, contiene los filtros
    │   ├── SearchFilters.jsx        177   VIVO   ← lista de barrios hardcodeada (desktop)
    │   ├── MobileFiltersModal.jsx   200   VIVO   ← lista de barrios hardcodeada (mobile, distinta)
    │   ├── PropertyMap.jsx          140   VIVO   ← Leaflet por CDN
    │   ├── PropertySearchCard.jsx   139   VIVO
    │   ├── SearchResultsHeader.jsx   59   VIVO
    │   └── PaginationControls.jsx    53   VIVO
    ├── ProductDetailsReact.jsx      303   VIVO   ← ficha de detalle real
    ├── ProductDetails.jsx           314   ☠️ MUERTO (importa react-router-dom, NO instalado)
    ├── MapComponent.jsx              20   ☠️ MUERTO (solo lo usa ProductDetails.jsx)
    ├── PropertyGallery.jsx           67   ☠️ MUERTO (nadie)
    ├── Cart.jsx                     170   ☠️ MUERTO (nadie) — único consumidor de Stripe
    ├── HeroStats.jsx                 23   ☠️ MUERTO (nadie) — texto de restaurante en inglés
    └── Welcome.astro                211   ☠️ MUERTO (plantilla de Astro)
```

**Total: 3 páginas, 1 layout, 24 componentes JSX + 1 .astro, 2 hojas de estilo.**

---

## A.2 `astro.config.mjs` y `tsconfig.json`

### `astro.config.mjs` (completo, 20 líneas)

```js
// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // 🚀 AGREGA ESTA LÍNEA CON TU URL DE VERCEL
  site: 'https://inmobiliaria-sonia-flores-astro.vercel.app',

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});
```

> **Nota posterior (dominio propio).** El bloque de arriba es la cita literal del archivo **tal como estaba durante la auditoría de la Fase 0** y se conserva sin tocar por fidelidad. Después de la Fase 0.6 se conectó el dominio propio y `site` pasó a `https://www.inmobiliariasoniaflores.com` (con `www`: la versión sin `www` responde 308 hacia ella). El fallback de `Layout.astro` se actualizó en el mismo cambio. Lo demás del archivo sigue igual.

| Ítem | Valor |
|---|---|
| `output` | **no declarado** → default `'static'` (confirmado por el log del build: `output: "static"`) |
| `adapter` | `@astrojs/vercel` v11, import default desde `'@astrojs/vercel'` (forma correcta para v11; la vieja `@astrojs/vercel/serverless` ya no existe) |
| Integraciones | solo `react()` |
| Tailwind | v4 vía plugin de Vite `@tailwindcss/vite`, **sin `tailwind.config.js`** |
| `site` | en la auditoría apuntaba a la URL de Vercel; hoy al dominio propio con `www`. `Layout.astro:18` la usa para la canónica |

✅ **La configuración ya está exactamente en el estado que pide el plan §9.1**: `output: 'static'` + adapter. Para las Fases 3 y 4 alcanza con agregar `export const prerender = false` en las páginas que lo necesiten. **No hay que tocar `astro.config.mjs`.**

### `tsconfig.json` (completo)

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

### ⚠️ **NO existe el alias `@/*`.** No hay `baseUrl`, no hay `paths`, no hay `jsconfig.json`.

`npx shadcn@latest init` (Fase 4) lo va a exigir. Habrá que agregar:

```json
"compilerOptions": {
  "baseUrl": ".",
  "paths": { "@/*": ["./src/*"] }
}
```

Riesgo: **BAJO**. Ningún archivo actual usa imports absolutos (todos son relativos `../`), así que agregar el alias no puede romper nada existente.

---

## A.3 Quién importa `productsData` y `categoryItem`

### `productsData` — 6 importadores (5 vivos, 1 muerto)

| Archivo:línea | Cómo lo usa |
|---|---|
| `src/pages/propiedades/[id].astro:4` | `import { productsData } from '../../data';` — en `getStaticPaths()` (línea 7): `productsData.map(p => ({ params:{id: p.id.toString()}, props:{product: p} }))`. **Genera las 18 rutas estáticas y pasa la propiedad entera como prop.** |
| `src/components/Busqueda/Busqueda.jsx:2` | `const products = productsData;` (línea 12). Fuente del filtrado, el orden, la paginación y el mapa. |
| `src/components/ProductList.jsx:3` | `const products = productsData \|\| [];` (103) → `products.slice(0, 10)` (104). Carrusel "Últimas Novedades" del home. |
| `src/components/Carrusel.jsx:3` | `const products = productsData \|\| [];` (159) → `products.slice(-7)` (181). Carrusel 3D "Nuestras Recomendaciones". |
| `src/components/ShopContext.jsx:2` | `const [products, setProducts] = useState(productsData);` (8). **Se expone en el context pero NADIE lo consume** (el único `useContext(ShopContext)` está en `Cart.jsx`, que está muerto). |
| `src/components/ProductDetails.jsx:3` | `productsData.find(p => p.id === parseInt(id))` (32). **Archivo muerto.** |

### `categoryItem` — **0 importadores**

```js
// src/data.jsx:1-5
export const categoryItem = [
  { category_title: "Todos", image: "/propiedades/departamento-losperales-alquiler.png"},
  { category_title: "Venta", image: "/propiedades/departamento-centro-venta.png"},
  { category_title: "Alquiler", image: "/propiedades/local-centro-alquila.png"},
];
```

Confirmado por grep manual y por `knip` (`Unused exports: categoryItem src/data.jsx:1:14`). **Es código muerto dentro de un archivo vivo.** No hay ningún selector de categorías con imágenes en el sitio: el filtro Venta/Alquiler son dos `<option>` de texto plano.

> Consecuencia para el plan: la observación de §1.3 sobre `categoryItem` es **irrelevante en la práctica** — ese array no llega a ninguna vista. No hace falta migrarlo ni preservarlo.

---

## A.4 Los filtros — qué se rompe con el cambio de `barrio`

Todo el filtrado vive en un único `useMemo`, **`src/components/Busqueda/Busqueda.jsx:85-106`**. Cita literal:

```js
 85    const filteredProducts = useMemo(() => {
 86      return products.filter((p) => {
 87        const d = p.detalles || {};
 88        const f = activeFilters;
 89
 90        if (f.propId && p.id.toString() !== f.propId.trim()) return false;
 91        if (f.keyword &&
 92            !p.name.toLowerCase().includes(f.keyword.toLowerCase()) &&
 93            !p.description.toLowerCase().includes(f.keyword.toLowerCase())) return false;
 94        if (f.barrio && d.barrio !== f.barrio) return false;
 95        if (f.estado && p.category !== f.estado) return false;
 96        if (f.tipo && d.tipo !== f.tipo) return false;
 97        if (f.dormitorios && d.dormitorios !== parseInt(f.dormitorios)) return false;
 98        if (f.banos && d.banos !== parseInt(f.banos)) return false;
 99        if (f.areaMin && (!d.superficie_m2 || d.superficie_m2 < parseInt(f.areaMin))) return false;
100        if (f.areaMax && (!d.superficie_m2 || d.superficie_m2 > parseInt(f.areaMax))) return false;
101        if (f.precioMin && p.price < parseInt(f.precioMin)) return false;
102        if (f.precioMax && p.price > parseInt(f.precioMax)) return false;
103
104        return true;
105      });
106    }, [products, activeFilters]);
```

### Respuesta directa a la pregunta

| Filtro | Comparación | ¿Case-sensitive? | ¿Normaliza? |
|---|---|---|---|
| `barrio` | `d.barrio !== f.barrio` — **igualdad estricta de strings** (`Busqueda.jsx:94`) | **Sí** | No: sin `trim()`, sin `toLowerCase()`, sin quitar tildes |
| `estado` (categoría) | `p.category !== f.estado` — igualdad estricta (`:95`) | **Sí** | No |
| `tipo` | `d.tipo !== f.tipo` — igualdad estricta (`:96`) | **Sí** | No |
| `keyword` | `.toLowerCase().includes()` sobre `name` y `description` (`:91-93`) | No | Solo minúsculas |
| `dormitorios` / `banos` | `!== parseInt(...)` — igualdad exacta, **no "al menos N"** (`:97-98`) | — | — |
| `areaMin/Max` | `<` / `>` con coerción implícita (`:99-100`) | — | — |
| `precioMin/Max` | `p.price < parseInt(...)` con coerción implícita (`:101-102`) | — | — |

### 🔴 Hallazgo grave: **el filtro de barrio hoy ya está roto**

Los valores del `<select>` están hardcodeados y **no llevan el prefijo "Barrio"**, mientras que los datos **sí lo llevan**. Con igualdad estricta, no matchean.

`src/components/Busqueda/SearchFilters.jsx:11-12` (desktop):
```js
11    const barriosUnicos = ["Bajo La Viña", "Los Perales", "Centro", "Ciudad de Nieva", "Almirante Brown",
12                          "Moreno", "Palpalá", "Cuyaya", "San Pedrito", "Alto Comedero", "Yala", "San Pablo de Reyes, Gorriti"];
```

`src/components/Busqueda/MobileFiltersModal.jsx:13-14` (mobile — **lista distinta**, duplicada a mano):
```js
13    const barriosUnicos = ["Bajo La Viña", "Los Perales", "Centro", "Ciudad de Nieva", "Almirante Brown",
14                          "Mariano Moreno", "Palpalá", "Cuyaya", "San Pedrito", "Alto Comedero", "Yala", "San Pablo de Reyes, San Antonio, Gorriti"];
```

Cruce contra los valores reales de `data.jsx`:

| Opción del select | Valor en `data.jsx` | ¿Matchea HOY? | ¿Matchea DESPUÉS de la migración? |
|---|---|---|---|
| Los Perales | `'Barrio Los Perales'` (ids 1, 9, 17) | ❌ 0 resultados | ✅ sí |
| Centro | `'Barrio Centro'` (ids 2, 4, 6, 8, 16) | ❌ 0 resultados | ✅ sí |
| Almirante Brown | `'Barrio Almirante Brown'` (id 13) | ❌ 0 resultados | ✅ sí |
| Cuyaya | `'Barrio Cuyaya'` (id 7) | ❌ 0 resultados | ✅ sí |
| San Pedrito | `'Barrio San Pedrito'` (id 14) | ❌ 0 resultados | ✅ sí |
| Alto Comedero | `'Barrio Alto Comedero'` (id 5) | ❌ 0 resultados | ✅ sí |
| **Palpalá** | `'Palpalá'` (ids 3, 18) | **✅ único que funciona** | 🔴 **se rompe** — pasa a ser *localidad*, y el `barrio` de esas propiedades queda `NULL` |
| (falta la opción) | `'Barrio Chijra'` (id 10) | ❌ inalcanzable | ❌ sigue inalcanzable si no se agrega "Chijra" |
| (falta la opción) | `'Barrio Gorriti'` (id 15) | ❌ inalcanzable | ⚠️ solo si se separa `"San Pablo de Reyes, Gorriti"` en opciones sueltas |
| (falta la opción) | `'San Antonio'` (id 11) | ❌ inalcanzable (desktop) | 🔴 pasa a ser *localidad* |
| (falta la opción) | `'A consultar'` (id 12) | ❌ | queda `NULL` + `hide_location` |
| Bajo La Viña / Ciudad de Nieva / Moreno / Mariano Moreno / Yala | — | ❌ sin propiedades | ❌ sin propiedades |

**Resumen: hoy el filtro de barrio devuelve 0 resultados para 11 de las 12 opciones.** El único que anda es "Palpalá", y es justamente el que la migración va a romper.

### Qué se rompe exactamente al pasar a `localidad` + `barrio` separados

1. **Se arreglan 6 opciones solas** (Los Perales, Centro, Almirante Brown, Cuyaya, San Pedrito, Alto Comedero): al desaparecer el prefijo, la igualdad estricta empieza a matchear. Efecto colateral positivo, pero el dev tiene que saber que la web va a *cambiar de comportamiento* aunque nadie toque el filtro.
2. **Se rompe "Palpalá"** y quedan inalcanzables "Palpalá" y "San Antonio" salvo que el `<select>` pase a ofrecer **localidad** como criterio separado, o que el filtro compare contra `localidad || barrio`.
3. Las **dos listas hardcodeadas y divergentes** (desktop vs mobile) hay que unificarlas y alimentarlas desde la tabla `neighborhoods` / `localidades`. Si no, cada barrio nuevo que cargue la dueña desde el panel será invisible en la búsqueda.

**Propuesta (para la Fase 3, no ahora):** el filtro pasa a ser dos selectores encadenados (localidad → barrio) alimentados desde los catálogos, y la comparación se hace por `slug`, no por texto visible. Eso elimina de raíz el problema de tildes y mayúsculas.

### 🟠 Otros dos hallazgos en los mismos filtros

**a) Falta `'Oficina'` en el filtro de tipo.** `SearchFilters.jsx:90` y `MobileFiltersModal.jsx:95`:

```js
{["Casa", "Terreno", "Departamento", "Local", "Galpon","Nave"].map(t => (
```

Las ids 4 y 8 son `tipo: 'Oficina'` y **no se pueden filtrar por tipo hoy**.

> ⚠️ **Advertencia para la Fase 2/3:** el plan §5.1 define labels `"Local Comercial"`, `"Galpón / Depósito"`, `"Nave Industrial"`. Si `mapDbToProduct()` devuelve el **label** en `detalles.tipo`, este filtro (igualdad estricta contra `"Local"`, `"Galpon"`, `"Nave"`) deja de matchear para 3 de los 7 tipos. **El adaptador de la Fase 2 tiene que devolver el string legacy exacto** (`'Local'`, `'Galpon'`, `'Nave'`), tal como dice la nota del plan sobre "shape legacy". Lo dejo anotado porque es fácil de pasar por alto.

**b) Los filtros de precio y área no filtran nada cuando el valor no es numérico.**
- `'A consultar' < 400000` → `false`, y `'A consultar' > 400000` → `false`. Resultado: **una propiedad "A consultar" siempre pasa los dos filtros de precio.** Puede ser deseable, pero es accidental, no una decisión.
- Ídem `superficie_m2: 'a consultar'` (string truthy) contra `areaMin`/`areaMax` en las líneas 99-100.
- `sortBy === "antiguedad"` (`Busqueda.jsx:114`) lee `a.detalles?.antiguedad`, **campo que no existe en ninguna de las 18 propiedades**. La opción "Antigüedad" del `<select>` (`SearchResultsHeader.jsx:30`) no hace nada.
- `sortBy === "price-asc"` (`:111`) hace `(a.price \|\| 0) - (b.price \|\| 0)`; con `"A consultar"` da `NaN`, lo que deja el comparador indefinido y el orden queda impredecible para esas propiedades.

---

## A.5 El formateador de precio

**No existe un formateador central: hay la misma lógica copiada en 6 lugares, en dos variantes distintas. Ninguna de las dos compara el string `'A consultar'`.**

### Variante 1 — "es numérico" (4 copias)

`src/components/ProductDetailsReact.jsx:88`:
```js
88    const hasValidPrice = product.price !== undefined && product.price !== null && !isNaN(product.price) && product.price !== '';
```
y su uso, `ProductDetailsReact.jsx:163-172`:
```js
163    <p className='text-2xl sm:text-3xl font-extrabold text-red-600'>
164        {hasValidPrice ? (
165            <>
166                ${new Intl.NumberFormat('es-AR').format(product.price)}
167                {product.category.toLowerCase() === 'alquiler' && <span className='...'>/ mes</span>}
168            </>
169        ) : (
170            "A consultar"
171        )}
172    </p>
```

Copias idénticas de la condición en:
- `src/components/ProductList.jsx:47` (+ construcción del texto en `:50-54`)
- `src/components/Carrusel.jsx:73` (+ `:75-79`)
- `src/components/ProductDetails.jsx:103` — *archivo muerto*

`ProductList.jsx:50-54`:
```js
50    let priceText = "A consultar";
51    if (hasValidPrice) {
52      const formattedPrice = new Intl.NumberFormat('es-AR').format(product.price);
53      priceText = product.category === 'Alquiler' ? `$ ${formattedPrice} / mes` : `$ ${formattedPrice}`;
54    }
```

### Variante 2 — "mayor que cero" (2 copias)

`src/components/Busqueda/PropertySearchCard.jsx:126`:
```js
126    {product?.price > 0 ? `$ ${new Intl.NumberFormat('es-AR').format(product.price)}` : 'A consultar'}
```

`src/components/Busqueda/PropertyMap.jsx:87-89`:
```js
87    const textoPrecio = prop?.price > 0
88      ? `$ ${new Intl.NumberFormat('es-AR').format(prop.price)}`
89      : 'A consultar';
```

### Respuesta directa

> **¿Compara el string exacto `'A consultar'`?** **No.** Ninguna de las dos variantes lo hace. La decisión sale de la coerción numérica de JavaScript: `isNaN('A consultar') === true` y `'A consultar' > 0 === false`. Es decir, hoy **cualquier** string no numérico cae en "A consultar", no solo el literal. Eso es una suerte, no un diseño.

### Diferencias de comportamiento entre las dos variantes (importan para la Fase 2)

| `price` | Variante 1 (`hasValidPrice`) | Variante 2 (`> 0`) |
|---|---|---|
| `"480000"` | `$480.000` ✅ | `$ 480.000` ✅ |
| `"A consultar"` | `A consultar` ✅ | `A consultar` ✅ |
| `null` (lo que va a devolver la DB) | `A consultar` ✅ | `A consultar` ✅ |
| `undefined` | `A consultar` ✅ | `A consultar` ✅ |
| **`0`** | **`$0`** 🔴 | `A consultar` ✅ |
| **`""`** | `A consultar` ✅ | `A consultar` ✅ |
| **`"  "`** (espacios) | **`$0`** 🔴 (`isNaN('  ')` es `false`) | `A consultar` ✅ |

> **Regla para el adaptador de la Fase 2:** `mapDbToProduct()` debe mapear `price = NULL` → `null` o `'A consultar'`. **Nunca a `0`**, o cuatro de los seis lugares van a imprimir `$0`, violando la regla dura 5/§2.3.1 del plan.

**Detalle cosmético:** el sufijo `/ mes` se decide con `category.toLowerCase() === 'alquiler'` en `ProductDetailsReact.jsx:167`, pero con `category === 'Alquiler'` (case-sensitive) en `ProductList.jsx:53` y `Carrusel.jsx:78`. Con los datos actuales las tres coinciden; si la DB devolviera `'alquiler'` en minúscula, dos de las tres perderían el `/ mes`.

---

## A.6 El carrusel de media

### ✅ Confirmado: la portada es el **PRIMER elemento del array `images`**, literalmente `images[0]`, en 3 de los 4 lugares.

| Componente:línea | Cómo elige la portada | ¿Filtra videos? |
|---|---|---|
| `ProductList.jsx:44` | `const displayImage = product.images?.[0] \|\| '/propiedades/casa-bajolavina-venta.png';` → va directo a un `<img src>` (`:72`) | **No.** Si `images[0]` fuese un `.mp4`, se rompe la imagen |
| `Carrusel.jsx:63` | `const displayImage = product.images && product.images.length > 0 ? product.images[0] : '/propiedades/unisex.jpg';` → `<img src>` (`:94-99`) | **No** |
| `Busqueda/PropertyMap.jsx:101` | `<img src="${prop?.images?.[0] \|\| '/propiedades/unisex.jpg'}" ...>` dentro del popup (innerHTML) | **No** |
| `Busqueda/PropertySearchCard.jsx:11-23` | **Único robusto**: filtra los videos primero y usa el primer elemento del array filtrado | **Sí** |
| `pages/propiedades/[id].astro:21-25` | `imagesList[0]` → imagen de Open Graph / WhatsApp | **No** |

`PropertySearchCard.jsx:10-23` (el caso robusto):
```js
10    // 1. FILTRAMOS EL ARRAY PARA QUEDARNOS SOLO CON IMÁGENES (IGNORANDO VIDEOS .mp4, .mov, .webm)
11    const allFiles = product?.images && product.images.length > 0 ? product.images : ['/propiedades/unisex.jpg'];
12
13    const images = allFiles.filter(file => {
14      const isVideo = file.toLowerCase().endsWith('.mp4') ||
15                      file.toLowerCase().endsWith('.mov') ||
16                      file.toLowerCase().endsWith('.webm');
17      return !isVideo;
18    });
19
20    // Si por alguna razón la propiedad solo tenía videos, le dejamos la imagen por defecto
21    if (images.length === 0) {
22      images.push('/propiedades/unisex.jpg');
23    }
```

### Cómo distingue imagen de video

**Por extensión del string de la URL, en minúsculas, con `.endsWith()`. Tres extensiones: `.mp4`, `.mov`, `.webm`.** No hay metadato ni campo `kind`.

`ProductDetailsReact.jsx:96` (hero de la ficha) y `:246` (fullscreen) — misma línea, duplicada:
```js
 96    const isVideo = file.toLowerCase().endsWith('.mp4') || file.toLowerCase().endsWith('.mov') || file.toLowerCase().endsWith('.webm');
```

Y el renderizado condicional, `ProductDetailsReact.jsx:111-125`:
```js
111    {isVideo ? (
112        <video src={file} className='...' controls playsInline onClick={(e) => e.stopPropagation()} />
119    ) : (
120        <img src={file} className='...' alt={`Vista ${index + 1}`} />
125    )}
```

La ficha de detalle **recorre `images` completo en orden**, decidiendo `<img>` o `<video>` elemento por elemento. El orden del array es el orden del carrusel.

### Implicancias para las Fases 2 y 7

1. ✅ La convención del plan (`sort_order = 0` es siempre imagen) **es imprescindible**, no una preferencia: tres componentes asumen ciegamente que `images[0]` es una imagen. El validador de la Fase 7 ("impedir guardar si la primera es video") es obligatorio.
2. ✅ El adaptador de la Fase 2 debe devolver `images` como **array plano de strings ordenado por `sort_order`**, mezclando imágenes y videos, tal como está hoy. La columna `kind` de `property_media` no se usa en el frontend público — se deriva de la extensión.
3. 🟠 **Si a futuro se suben archivos a Supabase Storage con querystring** (ej. `?token=`), `.endsWith('.mp4')` deja de detectar el video y se va a renderizar un `<img>` roto. Vale la pena que la Fase 7 fuerce URLs limpias, o que la Fase 3.5 cambie la detección por `kind` del registro. Lo anoto, no lo resuelvo ahora.
4. 🔴 **`/propiedades/unisex.jpg` NO EXISTE en `public/`.** Es el fallback de `PropertySearchCard.jsx:11,22`, `Carrusel.jsx:63` y `PropertyMap.jsx:101`. Hoy nunca se dispara porque las 18 propiedades tienen imágenes, pero **la primera propiedad que la dueña cargue sin foto va a mostrar una imagen rota**. La Fase 7 debería crear ese archivo (o cambiar los tres fallbacks a un placeholder que sí exista).

---

## A.7 El mapa Leaflet

Hay **dos implementaciones distintas de Leaflet** en el proyecto, y consumen los mismos dos campos.

### 1. Ficha de detalle — `src/components/ProductDetailsReact.jsx`

Usa el paquete npm `react-leaflet` + `leaflet`:
```js
  5    import { MapContainer, TileLayer, Marker } from 'react-leaflet';
  6    import 'leaflet/dist/leaflet.css';
  7    import L from 'leaflet';
```

Campos consumidos — **`ProductDetailsReact.jsx:25-28`**:
```js
25    const coords = [
26        product.detalles?.lat || -24.185,
27        product.detalles?.lon || -65.300
28    ];
```

Se renderiza dos veces: mapa lateral (`:211-214`, `zoom={15}`) y mapa fullscreen (`:293-296`, `zoom={17}`).

### 2. Mapa de resultados de búsqueda — `src/components/Busqueda/PropertyMap.jsx`

**No usa el paquete npm**: inyecta Leaflet 1.9.4 desde el CDN de unpkg a mano (`:34-52`) y trabaja con `window.L`.

Campos consumidos — **`PropertyMap.jsx:73-85`**:
```js
73    for (const prop of propsToDisplay) {
74      const detalles = prop?.detalles || {};
75
76      let lat = detalles.lat;
77      let lon = detalles.lon;
78
79      // Fallback si no tiene coordenadas
80      if (!lat || !lon) {
81        lat = -24.185;
82        lon = -65.300;
83      }
84
85      const finalCoords = [lat, lon];
```

Además usa `prop.price` (marcador con el precio, `:87-93`), `prop.images[0]` y `prop.name` (popup, `:99-105`), y `prop.id` para navegar (`:108`).

### Respuesta directa a la pregunta

| Campo | ¿Lo consume el mapa? | Dónde |
|---|---|---|
| `detalles.lat` | ✅ **Sí** | `ProductDetailsReact.jsx:26`, `PropertyMap.jsx:76` |
| `detalles.lon` | ✅ **Sí** | `ProductDetailsReact.jsx:27`, `PropertyMap.jsx:77` |
| `detalles.mapaQuery` | 🔴 **NO. No se usa en ningún archivo del proyecto.** | — |
| `detalles.mostrarDireccionExacta` | 🔴 **NO. No se usa en ningún archivo del proyecto.** | — |

Verificado con grep sobre todo `src/` excluyendo `data.jsx`: ambos campos aparecen **únicamente en `data.jsx`**, como dato inerte.

### 🔴 Consecuencias importantes para el plan

**a) `mostrarDireccionExacta` está muerto → la dirección se muestra SIEMPRE.**

`ProductDetailsReact.jsx:226-234` — el bloque de dirección bajo el mapa, sin ninguna condición:
```js
226    <div className="p-5 flex items-start gap-3 text-gray-700 border-t border-gray-100">
227        <MdLocationOn className="text-red-600 text-2xl mt-0.5 flex-shrink-0" />
228        <div className="text-sm leading-tight">
229            {product.detalles?.barrio || ''},
230            {product.detalles?.calle ? ` ${product.detalles.calle}` : ''}
231            {product.detalles?.numero ? ` ${product.detalles.numero}` : ''},
232            Jujuy, Argentina
233        </div>
234    </div>
```

Hoy la id 12 (la que se oculta a propósito) sale como **`"A consultar, A consultar, Jujuy, Argentina"`** — el valor centinela se filtra crudo a la vista pública. Es exactamente el síntoma que la regla dura 5 quiere eliminar.

**Esto significa que `hide_location` y `show_exact_address` del plan §4 no tienen ninguna implementación hoy: hay que escribirlas desde cero en la Fase 3.5.** No es "adaptar", es agregar. Lo señalo porque el plan las trata como si el frontend ya las respetara.

**b) `mapaQuery` no lo consume nadie.** Se puede migrar a la columna `mapa_query` como referencia para el panel (le sirve a la dueña para reubicar el marcador), pero **no hay que implementar geocoding**: el mapa ya funciona 100% con `lat`/`lon`. Migrarlo es barato y no rompe nada.

**c) `hide_location` NO afecta al mapa** (regla dura 6 del CLAUDE.md): eso ya se cumple solo, porque el mapa lee `lat`/`lon` y el texto es un bloque aparte (`:226-234`). Separar el `if` es trivial. ✅ Sin conflicto.

---

## A.8 ⭐ CRÍTICO — cómo se renderizan hoy los campos numéricos

### A.8.0 Resultado global: **inventario completo de accesos**

Grep exhaustivo sobre `src/` de los 8 campos. **20 accesos en total, en 5 archivos** (uno de ellos muerto):

| Campo | Accesos vivos | Archivos |
|---|---|---|
| `dormitorios` | 4 render + 1 filtro | ProductDetailsReact, ProductList, PropertySearchCard, Busqueda |
| `banos` | 4 render + 1 filtro | ídem |
| `superficie_m2` | 4 render + 2 filtros | ídem |
| `ambientes` | 1 render | ProductDetailsReact |
| `cocheras` | 1 render | ProductDetailsReact |
| **`frente_m`** | **0** | 🔴 **no se renderiza en ningún lado** |
| **`fondo_m`** | **0** | 🔴 **no se renderiza en ningún lado** |
| **`expensas`** | **0** | 🔴 **no se renderiza en ningún lado** |

> **Titular del punto 8:** tres de los ocho campos de la §2.3 (`frente_m`, `fondo_m`, `expensas`) **no existen en la vista pública**. Están en `data.jsx` y nunca llegan al DOM. Los otros cinco se renderizan **crudos, con `||` como única guarda**, y ese `||` es justamente lo que hace imposible distinguir "0" de "sin dato".

---

### A.8.1 Citas literales de cada acceso

**Ficha de detalle — `src/components/ProductDetailsReact.jsx:35-42`** (el bloque completo de specs):
```js
35    const specs = [
36        { icon: <BiBuildingHouse />, label: 'Tipo',         value: product.detalles?.tipo || '-' },
37        { icon: <BiHomeAlt />,       label: 'Ambientes',    value: product.detalles?.ambientes || '-' },
38        { icon: <BiBed />,           label: 'Dormitorios',  value: product.detalles?.dormitorios || '-' },
39        { icon: <MdOutlineBathtub />,label: 'Baños',        value: product.detalles?.banos || '-' },
40        { icon: <BiArea />,          label: 'm² Cubiertos', value: product.detalles?.superficie_m2 || '-' },
41        { icon: <BiCar />,           label: 'Cocheras',     value: product.detalles?.cocheras || '0' },
42    ];
```
Se pintan sin más transformación en `:176-184` (`<p ...>{item.value}</p>`).

**Home / "Últimas Novedades" — `src/components/ProductList.jsx:84-88`:**
```js
84    <div className="flex items-center gap-3 text-xs text-gray-500 my-2 py-1 border-b border-gray-100/70">
85      <span className="flex items-center gap-1"><BiBed className="text-sm text-gray-600" /> <span className="font-medium">{product.detalles?.dormitorios || 0} Dorm.</span></span>
86      <span className="flex items-center gap-1"><MdOutlineBathtub className="text-sm text-gray-600" /> <span className="font-medium">{product.detalles?.banos || 0} Baños</span></span>
87      <span className="flex items-center gap-1"><BiArea className="text-sm text-gray-600" /> <span className="font-medium">{product.detalles?.superficie_m2 || 0} m²</span></span>
88    </div>
```

**Tarjeta de resultados — `src/components/Busqueda/PropertySearchCard.jsx:113-121`:**
```js
113    <div className="flex items-center gap-4 text-xs max-[320px]:text-[13px] text-gray-600">
114      {!isTerreno && (
115        <>
116          <span className="flex items-center gap-1"><MdBed className="text-xl max-[320px]:text-lg" /> {product?.detalles?.dormitorios || 0}</span>
117          <span className="flex items-center gap-1"><MdBathtub className="text-xl max-[320px]:text-lg" /> {product?.detalles?.banos || 0}</span>
118        </>
119      )}
120      <span className="flex items-center gap-1"><MdSquareFoot className="text-xl max-[320px]:text-lg" /> {product?.detalles?.superficie_m2 || 0}</span>
121    </div>
```
(Nota: si `tipo === 'Terreno'` (línea 38) esconde dormitorios y baños. Es el único caso de "campos relevantes según el tipo" que ya existe en el código, y coincide con la idea opcional del plan §2.3.)

**Filtros — `src/components/Busqueda/Busqueda.jsx:97-100`** (ya citado en A.4).

**`src/components/ProductDetails.jsx:49-56`** — copia idéntica de las specs, pero el archivo está muerto.

---

### A.8.2 Tabla de comportamiento actual, campo por campo

Cada celda es **lo que ve el usuario final hoy**, en el DOM.

#### `cocheras` — 1 solo lugar

| Componente:línea | Guarda | valor `0` | `'a consultar'` | `''` | **ausente (undefined)** |
|---|---|---|---|---|---|
| `ProductDetailsReact.jsx:41` | `?.` + `\|\| '0'` | **`0`** | `a consultar` (literal, en minúscula) | `0` | 🔴 **`0`** |

> 🔴 **El peor caso del proyecto.** Con `|| '0'`, una propiedad **sin dato** de cocheras muestra **"Cocheras: 0"**, o sea *afirma que no tiene cochera*. Es exactamente el error que la §2.3 quiere prohibir: "sin dato" y "no tiene" se muestran igual, y el default es el que afirma. Afecta hoy a las ids **4, 5, 6, 7, 9, 10, 11** (siete propiedades sin la clave `cocheras`), incluido el terreno de 20 ha.

#### `dormitorios`

| Componente:línea | Guarda | `0` | `'a consultar'` | `''` | ausente |
|---|---|---|---|---|---|
| `ProductDetailsReact.jsx:38` | `?.` + `\|\| '-'` | `-` | `a consultar` | `-` | `-` |
| `ProductList.jsx:85` | `?.` + `\|\| 0` | `0 Dorm.` | `a consultar Dorm.` | `0 Dorm.` | `0 Dorm.` |
| `PropertySearchCard.jsx:116` | `?.` + `\|\| 0` | `0` | `a consultar` | `0` | `0` |

#### `banos`

| Componente:línea | Guarda | `0` | `'a consultar'` | `''` | ausente |
|---|---|---|---|---|---|
| `ProductDetailsReact.jsx:39` | `?.` + `\|\| '-'` | `-` | `a consultar` | `-` | `-` |
| `ProductList.jsx:86` | `?.` + `\|\| 0` | `0 Baños` | `a consultar Baños` | `0 Baños` | `0 Baños` |
| `PropertySearchCard.jsx:117` | `?.` + `\|\| 0` | `0` | `a consultar` | `0` | `0` |

#### `ambientes` — 1 solo lugar

| Componente:línea | Guarda | `0` | `'a consultar'` | `''` | ausente |
|---|---|---|---|---|---|
| `ProductDetailsReact.jsx:37` | `?.` + `\|\| '-'` | `-` | `a consultar` | `-` | `-` |

#### `superficie_m2`

| Componente:línea | Guarda | `0` | `'a consultar'` | `''` | ausente |
|---|---|---|---|---|---|
| `ProductDetailsReact.jsx:40` | `?.` + `\|\| '-'` | `-` | 🔴 **`a consultar`** (minúscula, bajo la etiqueta "m² Cubiertos") | `-` | `-` |
| `ProductList.jsx:87` | `?.` + `\|\| 0` | `0 m²` | 🔴 **`a consultar m²`** | `0 m²` | `0 m²` |
| `PropertySearchCard.jsx:120` | `?.` + `\|\| 0` | `0` | 🔴 **`a consultar`** (al lado del ícono de metros) | `0` | `0` |

> 🔴 **Esto se ve hoy en producción.** 10 de las 18 propiedades tienen `superficie_m2: 'a consultar'` (ids 1, 2, 8, 12, 13, 14, 15, 16, 17 y `'a consultar'` en 3 para frente/fondo). En el home y en la búsqueda salen literalmente los textos **`a consultar m²`** y **`a consultar`** en minúscula, pegados a un ícono de superficie. Y 5 propiedades más (ids 4, 6, 7, 9, 10) tienen `0` o `''` y muestran **`0 m²`**.

#### `frente_m`, `fondo_m`, `expensas`

| Campo | Accesos | Guarda | Qué se muestra hoy en cualquier estado |
|---|---|---|---|
| `frente_m` | **0** | — | **Nada. No se renderiza.** |
| `fondo_m` | **0** | — | **Nada. No se renderiza.** |
| `expensas` | **0** | — | **Nada. No se renderiza.** |

---

### A.8.3 ¿Cuánto trabajo cuesta llegar al modelo de tres estados de la §2.3?

**Diagnóstico:** el trabajo es **chico en líneas y mediano en decisiones de diseño**. Ningún componente hace lógica compleja: los 12 renders son todos `campo || fallback` inline. La dificultad no es técnica, es que hay que **decidir qué mostrar en las tarjetas compactas**, donde "A consultar" no entra bien en un renglón de 3 columnas con íconos.

#### Trabajo obligatorio (implementa la §2.3 tal cual)

| # | Qué | Dónde | Líneas | Riesgo |
|---|---|---|---|---|
| 1 | Crear un helper `formatTriEstado(valor)` → `número` / `"A consultar"` / `"No tiene"` (archivo nuevo, ej. `src/lib/format.js`) | nuevo | ~15 | **NULO** |
| 2 | Reemplazar las 6 specs de la ficha | `ProductDetailsReact.jsx:36-41` | 6 | **BAJO** |
| 3 | Reemplazar los 3 renders del home | `ProductList.jsx:85-87` | 3 | **BAJO** |
| 4 | Reemplazar los 3 renders de la tarjeta de búsqueda | `PropertySearchCard.jsx:116,117,120` | 3 | **BAJO** |
| 5 | Quitar el `|| '0'` de cocheras (el bug de "afirma no tener") | `ProductDetailsReact.jsx:41` | 1 | **BAJO** |
| **Total** | | **3 archivos vivos + 1 nuevo** | **~28 líneas** | |

#### Trabajo adicional que el plan asume pero que **hoy no existe**

| # | Qué | Estado actual | Esfuerzo |
|---|---|---|---|
| 6 | **Mostrar `expensas`** en la ficha | 🔴 no existe ningún render | Sección nueva, ~10 líneas |
| 7 | **Mostrar `frente_m` / `fondo_m`** en la ficha | 🔴 no existe ningún render | Sección nueva, ~15 líneas |
| 8 | **Respetar `hide_location`** (ocultar barrio y calle en el texto) | 🔴 no existe; hoy la id 12 imprime `"A consultar, A consultar, Jujuy"` | ~10 líneas en `ProductDetailsReact.jsx:226-234` + `:148` + tarjetas |
| 9 | **Respetar `show_exact_address`** | 🔴 `mostrarDireccionExacta` no se lee nunca | ~5 líneas, mismo bloque |
| 10 | Decidir el texto en las tarjetas compactas (¿`—`? ¿`A consultar`? ¿ocultar el renglón?) | — | decisión de diseño, no de código |

> **Recomendación:** los puntos 6 y 7 son *funcionalidad nueva*, no "renderizado tri-estado". Sugiero acordar explícitamente si entran en la Fase 3.5 o si van después, porque cambian el diseño visual de la ficha (hay que decidir dónde va la fila de expensas y las medidas). Los puntos 8 y 9, en cambio, **sí deberían entrar en la 3.5**: hoy son una fuga de valores centinela a la vista pública, justo lo que la regla dura 5 prohíbe.

> **Nota sobre las tarjetas compactas:** en `PropertySearchCard.jsx:116-120` y `ProductList.jsx:85-87` los valores viven en un renglón de 3 columnas con íconos y `text-xs`. Poner `"A consultar"` tres veces ahí desarma el layout en mobile. Mi propuesta (a confirmar): en las tarjetas, `NULL` → `—` (raya) y `0` → `0`; el texto completo "A consultar" / "No tiene" queda para la ficha de detalle, donde hay lugar. **No lo implemento sin OK**, porque contradice una lectura literal de la regla dura 5.

---

## A.9 Dónde se usa antd y dónde Stripe

### 🔴 `antd` — **NO SE USA EN NINGÚN LADO**

Grep case-insensitive de `antd` sobre todo `src/`: **cero imports**. Confirmado además por `knip` y `depcheck`, que la listan como dependencia sin usar.

Lo único que queda de antd son reglas CSS huérfanas, sin ningún elemento que las matchee:

`src/styles/global.css:21-40` (archivo vivo, importado por `Layout.astro:2`):
```css
21    /* Estilos para Ant Design Carousel / Slick */
22    .ant-carousel .slick-dots li {
23      width: 25px;
24      height: 4px;
25    }
...
38    .ant-carousel {
39      width: 100%;
40    }
```
Idénticas en `src/index.css:24-45` (archivo muerto).

El carrusel del sitio **es Swiper**, no antd (`ProductList.jsx:9-14`, `PropertyGallery.jsx:2-8`).

> ⚠️ **Desajuste con el plan.** El plan §0 dice *"Stack actual: … antd 6"* y la regla 3 dice *"antd solo en el sitio público"*. **En la realidad antd está instalado pero no se usa.** Consecuencias:
> - La regla "shadcn en admin / antd en público" es **inaplicable**: no hay nada de antd que separar. Sigue valiendo lo importante (shadcn confinado a `src/pages/admin/**`), pero sin la mitad de antd.
> - `antd` (~1.2 MB) se puede desinstalar. Como no hay ningún import, el borrado es **seguro**. Lo dejo para la Fase 0.5 o la 9 — el plan la agenda en la 9, y me parece bien: no urge y no molesta.
> - Las reglas `.ant-carousel` de `global.css` se pueden borrar junto con el paquete.

### `@stripe/stripe-js` — un solo lugar, y está muerto

`src/components/Cart.jsx:6,9`:
```js
 6    import { loadStripe } from '@stripe/stripe-js' // 👈 Importamos Stripe
 ...
 9    const stripePromise = loadStripe('pk_test_51TfP4BEBs4yTrCg0c7Djbx31G6TvGe6wbYIPSGltQ2uwWjchJO0V8jma30oFy0s9EKcCitHizNSALPlGoURLa71X00a0f0dgtx')
```

Y una URL de checkout hardcodeada en `Cart.jsx:24`:
```js
24    const stripeBaseUrl = "https://buy.stripe.com/test_00wbJ17KFbZh3gUfNfdQQ00";
```

**`Cart.jsx` no lo importa nadie.** No hay ruta `/cart`, no hay ícono de carrito en el Navbar, no aparece en ningún `.astro`. Es el residuo más puro del ecommerce.

Observaciones de seguridad (menores, pero conviene decirlas):
- La clave es una **`pk_test_` pública de prueba**, no una `sk_`. No hay riesgo real, pero está versionada en git y **queda en el historial aunque borremos el archivo**. No hace falta rotar nada; solo que el dev sepa que está ahí.
- `stripePromise` (`:9`) se asigna y **nunca se usa**: el checkout es una redirección manual a una URL armada a mano (`:20-40`). O sea, ni siquiera el código muerto usa el SDK que importa.
- Al borrar `Cart.jsx` (Fase 0.5), `@stripe/stripe-js` queda sin ningún consumidor y se puede desinstalar. El plan lo agenda en la Fase 9; se puede adelantar a la 0.5 sin riesgo.

---

## A.10 Verificación de `/public/propiedades/local-centro-alquila.png`

```
-rw-r--r-- 1 PC 197609 430280 Jul 14 09:42 public/propiedades/local-centro-alquila.png
```

### ✅ **El archivo EXISTE** (430 KB). También existe `local-centro-alquila.mp4` al lado.

Es cierto que ninguna de las 18 propiedades lo referencia — el único que lo nombra es `categoryItem` (`data.jsx:4`), que a su vez **no lo importa nadie** (ver A.3). Así que es una imagen huérfana pero presente. No rompe nada.

### 🔴 En cambio, falta otro archivo: `/public/propiedades/unisex.jpg`

```
ls: cannot access 'public/propiedades/unisex.jpg': No such file or directory
```

Es el placeholder de fallback en tres componentes vivos (`PropertySearchCard.jsx:11,22`, `Carrusel.jsx:63`, `PropertyMap.jsx:101`). Hoy no se dispara nunca, pero **cuando la dueña cargue la primera propiedad sin foto desde el panel, va a aparecer una imagen rota.** Hay que crear ese archivo o cambiar los tres fallbacks antes de la Fase 7. Lo agrego a la lista de pendientes; no lo toco ahora.

---

## A.11 Lectura del plan y desajustes con el código

### Confirmación: leí `PLAN-ADMIN-v4.md` completo (650 líneas). Secciones que contiene:

| § | Título |
|---|---|
| 0 | Resumen ejecutivo (tabla de stack, backend, UI, mapas, seguridad, migración, riesgo) |
| 1 | Estado de `data.jsx` — auditoría final → 1.1 Datos limpios, 1.2 Único resto conocido, 1.3 Observaciones menores |
| 2 | Reglas de negocio → 2.1 Regla `barrio`→`localidad`, 2.2 `hide_location` oculta el texto no el mapa, **2.3 Tri-estado de los campos numéricos ⭐**, 2.4 Galpón y Nave son tipos distintos |
| 3 | FASE 0 — Auditoría y limpieza → 3.1 Herramientas, 3.2 Clasificación obligatoria, 3.3 Protocolo de borrado (Fase 0.5), 3.4 Prompt de la Fase 0, 3.5 Qué debe contener el informe |
| 4 | Modelo de datos (SQL completo) → 4.1 RLS, 4.2 Storage |
| 5 | Catálogos semilla y mapeo → 5.1 `property_types`, 5.2 `localidades`/`neighborhoods`, 5.3 `services`, 5.4 Reglas de conversión numérica, 5.5 Resultado esperado (criterio de aceptación Fase 2) |
| 6 | Variables de entorno |
| 7 | Fases (0, 0.5, 1, 2, 3, 3.5, 4, 5, 6, 7, 8, 9) |
| 8 | Diseño del formulario (Fase 6) |
| 9 | Reglas permanentes para Claude Code (10 reglas) |
| 10 | Pasos manuales en Supabase (para el dev) |
| 11 | Nota sobre Storage (límite de 1 GB) |

### Verificación de los datos que el plan afirma sobre `data.jsx`

Recorrí las 18 propiedades y confirmo:

| Afirmación del plan | Verificado |
|---|---|
| §1.1 Servicios: solo 6 categorías, cero sinónimos | ✅ |
| §1.1 Precios: todos string, los no numéricos son exactamente `'A consultar'` | ✅ (ids 2, 4, 5, 6, 10, 11, 13, 14, 16, 17) |
| §1.1 `category`: solo `'Alquiler'` y `'Venta'` | ✅ |
| §1.1 Media: el primer elemento de `images` es siempre imagen | ✅ las 18 |
| §1.2 `'A consultar'` como servicio en ids 1, 2, 3 | ✅ |
| §5.5 `cocheras: 0` en ids 3, 8, 12, 13, 14, 15, 16, 18 | ✅ |
| §5.5 `dormitorios: 0` en ids 4, 8, 13, 14, 18 | ✅ |
| §5.5 `banos: 0` en id 14 | ✅ |
| §5.5 superficies con valor: id 3→180, id 5→640, id 11→200000 | ✅ |
| §2.3 `expensas: 0` en ids 5, 6, 7, 9, 10 y ausente en las otras 13 | ✅ |
| §2.1 la regla del prefijo "Barrio" se cumple salvo la id 12 | ✅ (ids 3 y 18 = `'Palpalá'`, id 11 = `'San Antonio'`, id 12 = `'A consultar'`) |

**El plan describe los datos con exactitud. No encontré ninguna discrepancia en `data.jsx`.**

### 🔴 Lo que SÍ no encaja: el plan describe el frontend mejor de lo que está

Nueve puntos, ordenados por impacto:

| # | El plan asume / dice | La realidad del código | Propuesta |
|---|---|---|---|
| 1 | §0: *"Stack actual: … **antd 6**"*; regla 3: *"antd solo en el sitio público"* | **antd no se usa en ningún archivo.** Solo hay CSS huérfano `.ant-carousel` | Mantener la regla útil (shadcn confinado a `admin/`) y **desinstalar antd**. Actualizar el plan para no describir un stack que no existe |
| 2 | §2.2 y regla 6: *"`hide_location` oculta barrio y calle en el TEXTO"* — se lee como si fuera un ajuste | **No hay implementación alguna.** `mostrarDireccionExacta` no se lee nunca; la dirección se imprime siempre (`ProductDetailsReact.jsx:226-234`). Hoy la id 12 muestra `"A consultar, A consultar, Jujuy, Argentina"` | Escribirlo desde cero en la Fase 3.5 y presupuestarlo como tal |
| 3 | §3.5 y §7: la Fase 3.5 es *"un cambio chico y aislado"* de renderizado | Cierto para 5 campos (~28 líneas), pero `frente_m`, `fondo_m` y `expensas` **no se renderizan en ningún lado**: son secciones nuevas de UI, no un cambio de formato | Decidir explícitamente si entran en la 3.5. Ver A.8.3 |
| 4 | §2.1: se da a entender que el filtro de barrio funciona y hay que preservarlo | **El filtro de barrio hoy devuelve 0 resultados para 11 de 12 opciones.** El único que anda es "Palpalá", que la migración rompe | Rehacer el filtro con catálogos y comparación por slug en la Fase 3. Es una **mejora**, no una regresión |
| 5 | §5.1: labels `"Local Comercial"`, `"Galpón / Depósito"`, `"Nave Industrial"` | El filtro de tipo compara por igualdad estricta contra `"Local"`, `"Galpon"`, `"Nave"` (`Busqueda.jsx:96`) | El adaptador de la Fase 2 **debe devolver el string legacy**, no el label. Ya está previsto en la nota de §7/Fase 2, lo subrayo |
| 6 | §7/Fase 3: *"componentes intactos"*, datos por el adaptador | `ProductList.jsx`, `Carrusel.jsx` y `Busqueda.jsx` **importan `productsData` directamente**, no reciben props. Para que lean de la DB hay que pasarles datos por props → tocar 4 componentes públicos | Ver el Anexo. La opción de menor diff es agregar un prop opcional con fallback a `data.jsx` |
| 7 | §1.3: *"`categoryItem` referencia una imagen; verificar que exista"* | La imagen **existe**. Pero `categoryItem` **no lo importa nadie**: es un export muerto | No hay nada que verificar ni migrar. Se va con `data.jsx` en la Fase 9 |
| 8 | §4/§7: la columna `mapa_query` como parte del modelo | `mapaQuery` **no se usa en ningún archivo**. El mapa funciona solo con `lat`/`lon` | Migrarla igual (le sirve a la dueña como referencia en el panel), pero **no implementar geocoding** |
| 9 | §7/Fase 7: el uploader valida que el primer elemento sea imagen | Correcto y **obligatorio**: 3 componentes hacen `images[0]` sin filtrar videos. Además, el placeholder de fallback **`/propiedades/unisex.jpg` no existe** | Crear ese archivo (o cambiar los 3 fallbacks) antes de la Fase 7 |

### 🟡 Dos observaciones menores, sin impacto en el plan

- **Los íconos de servicios no matchean los nombres de los servicios.** `ProductDetailsReact.jsx:9-16` define el mapa con claves `'Agua Potable'`, `'Gas Natural'`, `'Electricidad'`, `'Internet'`, pero los datos dicen `'Agua'`, `'Gas'`, `'Luz'`, `'Wifi'`. Solo `'Cloaca'` y `'Pavimento'` reciben su ícono; los otros cuatro caen al genérico `<BiBlanket />` (una manta). Cosmético, fácil de arreglar cuando se toque ese componente. Los slugs de §5.3 (`agua`, `luz`, `gas`, `cloaca`, `pavimento`, `wifi`) son los correctos.
- **`product.image` (singular) no existe** en ninguna propiedad, pero se usa como fallback en `[id].astro:21` y `ProductDetailsReact.jsx:30` (`product.images || [product.image]`). Inofensivo — el fallback nunca corre.

---

# PARTE B — AUDITORÍA DE CÓDIGO RESIDUAL

## B.1 Salida cruda de las herramientas

### `npx knip`

```
Unused files (6)
src/components/Cart.jsx
src/components/HeroStats.jsx
src/components/MapComponent.jsx
src/components/ProductDetails.jsx
src/components/PropertyGallery.jsx
src/components/Welcome.astro

Unused dependencies (6)
@stripe/stripe-js  package.json:17:6
antd               package.json:21:6
clsx               package.json:23:6
framer-motion      package.json:24:6
react-swipeable    package.json:31:6
tailwind-merge     package.json:33:6

Unused exports (2)
ShopContext   src/components/ShopContext.jsx:5:14
categoryItem  src/data.jsx:1:14
```

### `npx madge --circular src/`

Primera corrida (sin flags) procesó **0 archivos** — madge ignora `.jsx` por defecto. Re-corrido con extensiones explícitas:

```
$ npx madge --extensions js,jsx,ts,tsx --circular src/
Processed 32 files (5.6s) (8 warnings)
✔ No circular dependency found!
```

**Cero dependencias circulares.** ✅

Corrida extra de `--orphans` (útil pero **engañosa en Astro**, ver B.4):
```
components/AppWrapper.jsx        ← FALSO POSITIVO (index.astro, busqueda.astro)
components/Busqueda/Busqueda.jsx ← FALSO POSITIVO (busqueda.astro, client:only)
components/Cart.jsx              ← huérfano real
components/Footer.jsx            ← FALSO POSITIVO (Layout.astro, client:load)
components/HeroStats.jsx         ← huérfano real
components/Homepage.jsx          ← FALSO POSITIVO (index.astro, client:load)
components/LoadingScreen.jsx     ← FALSO POSITIVO (index.astro, client:load)
components/Navbar.jsx            ← FALSO POSITIVO (Layout.astro, client:load)
components/ProductDetails.jsx    ← huérfano real
components/ProductDetailsReact.jsx ← FALSO POSITIVO ([id].astro, client:only)
components/PropertyGallery.jsx   ← huérfano real
```

7 de los 11 "huérfanos" de madge son falsos positivos porque **madge no parsea `.astro`**. Buena ilustración de por qué la regla del plan ("ante la duda, VIVO") es necesaria.

### `npx depcheck`

```
Unused dependencies
* antd
* clsx
* framer-motion
* react-swipeable
* tailwind-merge
* tailwindcss

Missing dependencies
* react-router-dom: .\src\components\ProductDetails.jsx
```

> 🔴 **El hallazgo más importante de toda la Parte B**: `ProductDetails.jsx` importa `react-router-dom`, **un paquete que NO está en `package.json` ni en `node_modules`** (verificado). El build pasa hoy únicamente porque nadie importa ese archivo y Vite nunca lo resuelve. **Si alguien lo importara, el build revienta al instante.**

> `tailwindcss` es un **falso positivo de depcheck**: se usa vía `@tailwindcss/vite` en `astro.config.mjs:5,16` y vía `@import "tailwindcss"` en `styles/global.css:1`. **NO tocar.**

### `npx ts-prune`

Salida dominada por falsos positivos (marca como no usado todo `export default` consumido desde `.astro`). El único dato nuevo y correcto que aporta: `src/data.jsx:1 - categoryItem`.

---

## B.2 Tabla MUERTO / ZOMBIE / VIVO — archivos

Definiciones según §3.2 del plan. **Ante la duda, VIVO.**

| # | Archivo | Clasif. | Quién lo importa | ¿Uso comentado? | Qué se rompe al borrarlo | Detectado por |
|---|---|---|---|---|---|---|
| 1 | `src/components/Cart.jsx` | ☠️ **MUERTO** | **Nadie.** No hay ruta `/cart`, ni ícono de carrito, ni `<Cart` en ningún `.astro` | No. Está entero y sin comentar | **Nada.** Al borrarlo, `@stripe/stripe-js` queda sin consumidores y se puede desinstalar. `ShopContext` pierde su único consumidor real | knip, madge, lectura manual |
| 2 | `src/components/ProductDetails.jsx` | ☠️ **MUERTO** | **Nadie.** `[id].astro:3` importa `ProductDetailsReact.jsx`, que es la versión portada a Astro | No | **Nada.** Al contrario: **borrarlo elimina un import roto** (`react-router-dom`, no instalado). Es el archivo más peligroso del repo si alguien lo tocara | knip, madge, depcheck |
| 3 | `src/components/MapComponent.jsx` | ☠️ **MUERTO** | Solo `ProductDetails.jsx:8` — que también está muerto | No | **Nada**, siempre que se borre junto con (o después de) `ProductDetails.jsx`. `ProductDetailsReact.jsx` tiene su propio `<MapContainer>` inline (`:211`, `:293`) y no lo necesita | knip |
| 4 | `src/components/PropertyGallery.jsx` | ☠️ **MUERTO** | **Nadie.** La galería real está inline en `ProductDetailsReact.jsx:93-141` | No | **Nada.** `swiper` sigue vivo por `ProductList.jsx:9` | knip, madge |
| 5 | `src/components/HeroStats.jsx` | ☠️ **MUERTO** | **Nadie.** Contenido en inglés de un restaurante: *"Master Chefs"*, *"Daily Visitors"* | No | **Nada.** Residuo de una plantilla anterior | knip, madge |
| 6 | `src/components/Welcome.astro` | ☠️ **MUERTO** | **Nadie.** Es la landing por defecto de `npm create astro` | No | **Nada.** Al borrarlo quedan huérfanos `src/assets/astro.svg` y `src/assets/background.svg` (borrables en el mismo commit) | knip |
| 7 | `src/index.css` | ☠️ **MUERTO** | **Nadie.** `Layout.astro:2` importa `../styles/global.css`, que es un **duplicado casi exacto** (44 vs 39 líneas, mismo contenido) | No | **Nada.** ⚠️ Cuidado: es el que **NO** hay que borrar por confusión de nombre. El vivo es `src/styles/global.css` | Lectura manual (knip no analiza CSS) |
| 8 | `src/assets/react.svg` | ☠️ **MUERTO** | **Nadie** | — | Nada | Lectura manual |
| 9 | `src/assets/astro.svg` | ☠️ **MUERTO** (condicional) | Solo `Welcome.astro:2` | — | Nada, **si se borra junto con `Welcome.astro`**. Si `Welcome.astro` queda, **es VIVO** | Lectura manual |
| 10 | `src/assets/background.svg` | ☠️ **MUERTO** (condicional) | Solo `Welcome.astro:3` | — | Ídem #9 | Lectura manual |
| 11 | `src/components/ShopContext.jsx` | 🧟 **ZOMBIE** | `AppWrapper.jsx:2` — **import real y ejecutado**. `AppWrapper` envuelve todo el sitio (`index.astro:19`, `busqueda.astro:11`) | No, pero **su contenido no lo consume nadie**: el único `useContext(ShopContext)` estaba en `Cart.jsx` (muerto). Provee `cart`, `addToCart`, `total`, `quantity`… todo huérfano | 🔴 **Borrarlo rompe el build**: `AppWrapper.jsx` no resolvería el import y las dos páginas fallan. **Hay que borrar primero el import/uso, verificar el build, y recién después el archivo** — el protocolo del plan §3.3 | knip (solo el export nombrado) |
| 12 | `src/components/AppWrapper.jsx` | ⚠️ **VIVO** (envoltorio vacío de facto) | `index.astro:3,19` y `busqueda.astro:3,11`, con `client:load` | No | 🔴 **Rompe las dos páginas principales.** Es un `<ShopContextProvider>{children}</ShopContextProvider>` de 9 líneas. Se puede simplificar junto con #11, pero **no borrar suelto** | madge (falso positivo de huérfano) |
| 13 | `src/data.jsx` | ✅ **VIVO** | 5 importadores vivos (ver A.3) | No | 🔴 Rompe el sitio entero. Se conserva como fallback **hasta la Fase 9** | — |
| 14 | `src/pages/index.astro` | ✅ **VIVO** | Nadie lo importa: **es la ruta `/`** | — | 🔴 Desaparece el home | Trampa de Astro |
| 15 | `src/pages/busqueda.astro` | ✅ **VIVO** | Nadie: **es la ruta `/busqueda`** | — | 🔴 Desaparece la búsqueda | Trampa de Astro |
| 16 | `src/pages/propiedades/[id].astro` | ✅ **VIVO** | Nadie: **es la ruta dinámica**, genera 18 páginas | — | 🔴 Desaparecen las 18 fichas | Trampa de Astro |
| 17 | `src/layouts/Layout.astro` | ✅ **VIVO** | Las 3 páginas | — | 🔴 Rompe todo | — |
| 18 | `src/styles/global.css` | ✅ **VIVO** | `Layout.astro:2` | — | 🔴 Se cae Tailwind entero (`@import "tailwindcss"` está ahí) | — |
| 19 | `Navbar.jsx`, `Footer.jsx` | ✅ **VIVO** | `Layout.astro:3,4` con `client:load` | — | 🔴 Rompe el layout | madge (falso positivo) |
| 20 | `LoadingScreen.jsx`, `Homepage.jsx` | ✅ **VIVO** | `index.astro:4,5` con `client:load` | — | 🔴 Rompe el home | madge (falso positivo) |
| 21 | `Hero.jsx`, `ProductList.jsx`, `Carrusel.jsx`, `Nosotros.jsx`, `AboutUs.jsx`, `Servicios.jsx` | ✅ **VIVO** | `Homepage.jsx:2-7` | — | 🔴 Rompe secciones del home | — |
| 22 | `RippleButton.jsx`, `bubble.jsx` | ✅ **VIVO** | `Carrusel.jsx:8,11` | — | 🔴 Rompe el carrusel 3D | — |
| 23 | `ProductDetailsReact.jsx` | ✅ **VIVO** | `[id].astro:3,36` con `client:only="react"` | — | 🔴 Rompe las 18 fichas | madge (falso positivo) |
| 24 | `Busqueda/*.jsx` (los 7) | ✅ **VIVO** | `busqueda.astro:4` + `Busqueda.jsx:4-9` | — | 🔴 Rompe la búsqueda | madge (falso positivo en `Busqueda.jsx`) |
| 25 | `src/assets/SoniaLogo.png`, `SoniaLogo2.png`, `fondoNos.jpg`, `presentacion.mp4` | ✅ **VIVO** | Navbar, Footer, Nosotros, AboutUs | — | 🔴 Imágenes/video rotos | — |
| 26 | `public/**` (todo) | ✅ **VIVO** (no auditado) | Referenciados **solo como strings** en `data.jsx` y en los componentes | — | Ver B.4 | — |

### Resumen ejecutable

**Borrables sin ningún riesgo (7 archivos + 3 assets), en este orden:**

1. `src/components/ProductDetails.jsx` — *empezar por acá: elimina el import roto de `react-router-dom`*
2. `src/components/MapComponent.jsx` — *inmediatamente después del anterior*
3. `src/components/Cart.jsx`
4. `src/components/HeroStats.jsx`
5. `src/components/PropertyGallery.jsx`
6. `src/components/Welcome.astro` + `src/assets/astro.svg` + `src/assets/background.svg`
7. `src/index.css` + `src/assets/react.svg`

**Requiere el protocolo de dos pasos (§3.3): `ShopContext.jsx` + `AppWrapper.jsx`.**
Si se quiere sacar el context: primero simplificar `AppWrapper.jsx` a un passthrough (o quitar el `<AppWrapper>` de las dos páginas), verificar `npm run build` **y** `npm run preview` recorriendo `/` y `/busqueda`, y recién en un commit posterior borrar `ShopContext.jsx`.
**Mi recomendación: dejarlo para el final de la Fase 0.5, o directamente para la Fase 9.** Es el único borrado que puede tumbar las dos páginas principales, y no molesta a nadie mientras esté.

---

## B.3 Tabla — exports y dependencias de npm

### Exports

| Export | Archivo:línea | Clasif. | Quién lo consume | Al borrarlo |
|---|---|---|---|---|
| `categoryItem` | `src/data.jsx:1` | ☠️ **MUERTO** | Nadie | Nada. Se va con `data.jsx` en la Fase 9. No hace falta migrarlo |
| `ShopContext` (named) | `src/components/ShopContext.jsx:5` | 🧟 **ZOMBIE** | Solo `Cart.jsx:2` (muerto) | Nada **si `Cart.jsx` ya se borró**. El `export default ShopContextProvider` (`:104`) es el que está vivo |
| `productsData` | `src/data.jsx:7` | ✅ **VIVO** | 5 importadores | Rompe el sitio |
| `RippleButton`, `RippleButtonRipples` | `RippleButton.jsx:3,15` | ✅ **VIVO** | `Carrusel.jsx:8` | Rompe el carrusel |
| `BubbleBackground` | `bubble.jsx:3` | ✅ **VIVO** | `Carrusel.jsx:11` | Rompe el carrusel |

### Dependencias de `package.json`

| Paquete | Clasif. | Único consumidor | Veredicto |
|---|---|---|---|
| `@stripe/stripe-js` ^9.13.0 | ☠️ **MUERTO** | `Cart.jsx:6` (archivo muerto) | Desinstalable **junto con `Cart.jsx`**. El plan lo agenda en la Fase 9; se puede adelantar |
| `antd` ^6.5.4 | ☠️ **MUERTO** | **Ninguno.** Cero imports en todo `src/` | Desinstalable ya. ~1.2 MB. Borrar también las reglas `.ant-carousel` de `global.css:21-40` |
| `framer-motion` ^13.0.0 | ☠️ **MUERTO** | **Ninguno** | Desinstalable ya |
| `react-swipeable` ^7.0.2 | ☠️ **MUERTO** | **Ninguno** | Desinstalable ya |
| `clsx` ^2.1.1 | ☠️ MUERTO **hoy** | Ninguno | 🟡 **NO DESINSTALAR.** Es una de las dos dependencias del helper `cn()` de shadcn/ui — la Fase 4 la va a necesitar. Borrarla y reinstalarla es trabajo al pedo |
| `tailwind-merge` ^3.6.0 | ☠️ MUERTO **hoy** | Ninguno | 🟡 **NO DESINSTALAR.** Ídem `clsx`. Las dos juntas son `cn()` |
| `tailwindcss` ^4.3.3 | ✅ **VIVO** | `astro.config.mjs:5,16` + `global.css:1` | **Falso positivo de depcheck. NO TOCAR** — se cae todo el CSS |
| `lucide-react` ^1.30.0 | ✅ **VIVO** | `Carrusel.jsx:5` (`ChevronLeft`, `ChevronRight`). Además es la librería de íconos por defecto de shadcn | No tocar |
| `leaflet` + `react-leaflet` | ✅ **VIVO** | `ProductDetailsReact.jsx:5-7`. (`PropertyMap.jsx` usa el CDN, no el paquete) | No tocar |
| `swiper` ^14.1.0 | ✅ **VIVO** | `ProductList.jsx:9-14`. (`PropertyGallery.jsx` también, pero está muerto) | No tocar |
| `react-icons` ^5.7.0 | ✅ **VIVO** | Casi todos los componentes | No tocar |
| `react`, `react-dom`, `astro`, `@astrojs/react`, `@astrojs/vercel`, `@tailwindcss/vite`, `@types/react*` | ✅ **VIVO** | Infraestructura | No tocar |
| **`react-router-dom`** | 🔴 **FALTANTE** | Importado por `ProductDetails.jsx:2`, **no instalado** | **No instalarlo.** Se resuelve borrando `ProductDetails.jsx` |

**Comando sugerido para la Fase 0.5** (después de borrar `Cart.jsx`), **no ejecutado**:
```bash
npm uninstall @stripe/stripe-js antd framer-motion react-swipeable
# NO tocar clsx ni tailwind-merge: los necesita shadcn en la Fase 4
```

---

## B.4 Trampas de Astro verificadas a mano

Las cinco que menciona §3.2 del plan, chequeadas una por una:

| Trampa | Verificación | Resultado |
|---|---|---|
| **`import.meta.glob()`** | Grep sobre todo `src/` | ✅ **Cero usos.** No hay ningún archivo cargado dinámicamente por patrón |
| **`src/pages/` son rutas** | Las 3 páginas no las importa nadie | ✅ **Las 3 son VIVAS.** El build genera 20 páginas (3 rutas + 18 fichas − índice compartido). Ninguna herramienta las marcó mal, pero madge sí marcó mal a sus hijos |
| **Componentes usados solo desde `.astro` con `client:*`** | Los 7 falsos positivos de madge (ver B.1). Verificados uno a uno leyendo los `.astro` | ✅ **Los 7 son VIVOS.** Directivas confirmadas: `AppWrapper client:load`, `LoadingScreen client:load`, `Homepage client:load`, `Navbar client:load`, `Footer client:load`, `Busqueda client:only="react"`, `ProductDetailsReact client:only="react"`. **knip los resolvió bien** (tiene plugin de Astro); madge no |
| **Assets referenciados solo como strings** | Todas las rutas `/propiedades/*` y `/videos/*` de `data.jsx` y de los componentes son strings literales. Ninguna herramienta ve `public/` | ⚠️ **`public/` NO fue auditado** y **no debe tocarse en la Fase 0.5.** Ver nota abajo |
| **Archivos en `public/`** | Ídem | ⚠️ Ídem |

### Nota sobre `public/propiedades/` (208 archivos)

`data.jsx` referencia ~120 rutas. A ojo hay archivos que no aparecen en ninguna propiedad (por ejemplo el directorio completo `casa-san-pedrito/` con 38 `.jpg`, varios `casa-bajolavina-venta-i*.png`, `local-brown-alquiler*.jpg` sueltos, `nave-palpala-alquiler*.mp4`).

**No los clasifico y recomiendo explícitamente NO borrarlos en la Fase 0.5**, por tres razones:

1. Son fotos de propiedades reales. Si mañana la dueña quiere agregar más imágenes a una ficha desde el panel, esos archivos son la fuente.
2. Ocupan disco, no bundle: Vercel los sirve del CDN y **no afectan el peso del JavaScript**. El beneficio de borrarlos es cero.
3. La §11 del plan ya decide que los medios legacy **se quedan en `/public/propiedades/`** y no van a Supabase Storage. Borrarlos contradice esa decisión.

Si en algún momento se quiere hacer limpieza de `public/`, propongo que sea **una tarea aparte, después de la Fase 7**, cuando el panel ya permita ver qué archivos están realmente asociados a cada propiedad.

---

# ANEXO — Archivos a modificar en Fases 2, 3 y 3.5

(§3.5 del plan pide esta lista con nivel de riesgo.)

## Fase 2 — Cliente, adaptador y migración

| Archivo | Acción | Riesgo | Nota |
|---|---|---|---|
| `src/lib/supabase.ts` | **crear** | **NULO** | Cliente browser con la anon key |
| `src/lib/supabase-server.ts` | **crear** | **NULO** | Solo en contextos con `prerender = false` |
| `src/lib/mapProperty.ts` | **crear** | **NULO** | `mapDbToProduct(row)` → **shape legacy exacto** |
| `scripts/migrate-data.mjs` | **crear** | **NULO** | Idempotente vía `legacy_id` |
| `.env` / `.gitignore` | crear / verificar | **NULO** | `.env` ya está ignorado (`.gitignore:20`) ✅ |
| `package.json` | agregar `@supabase/supabase-js` | **BAJO** | — |

**Fase 2 no toca ni un archivo existente del sitio.** ✅

**Tres advertencias para el adaptador**, todas derivadas de este informe:
1. `price = NULL` → `null` o `'A consultar'`, **nunca `0`** (ver A.5).
2. `detalles.tipo` debe ser el string legacy (`'Local'`, `'Galpon'`, `'Nave'`), **no el label** de §5.1 (ver A.4).
3. `images` = array plano de strings ordenado por `sort_order`, imágenes y videos mezclados, **primer elemento siempre imagen** (ver A.6).

## Fase 3 — Sitio público leyendo de la DB

| Archivo | Acción | Riesgo | Por qué |
|---|---|---|---|
| `src/pages/propiedades/[id].astro` | quitar `getStaticPaths`, agregar `prerender = false`, buscar por slug/id | 🟡 **MEDIO** | Cambia el modelo de routing: de 18 páginas estáticas a SSR. Hay que manejar el 404 (hoy `Astro.redirect('/404')` en `:16` apunta a una ruta **que no existe**) |
| `src/pages/busqueda.astro` | `prerender = false` + pasar `products` como prop | 🟡 **MEDIO** | `Busqueda` es `client:only="react"`: los props se serializan al island. Funciona, pero hay que probarlo |
| `src/components/Busqueda/Busqueda.jsx` | aceptar prop `products` con fallback a `productsData` | 🟡 **MEDIO** | Toca un componente público. Diff mínimo posible: `const products = productsProp ?? productsData;` (1 línea + firma) |
| `src/pages/index.astro` | `prerender = false` + pasar `products` | 🟡 **MEDIO** | — |
| `src/components/Homepage.jsx` | pasar el prop hacia abajo | 🟡 **MEDIO** | Componente público, cambio mecánico |
| `src/components/ProductList.jsx` | aceptar prop con fallback | 🟡 **MEDIO** | Ídem `Busqueda.jsx` |
| `src/components/Carrusel.jsx` | aceptar prop con fallback | 🟡 **MEDIO** | Ídem |
| `src/components/Busqueda/SearchFilters.jsx` | alimentar barrios desde el catálogo | 🔴 **ALTO** | **Rehacer el filtro roto** (A.4). Agregar localidad, agregar `'Oficina'`, unificar con el mobile |
| `src/components/Busqueda/MobileFiltersModal.jsx` | ídem | 🔴 **ALTO** | Hoy tiene una lista **distinta** de la de desktop |
| headers `Cache-Control` | `s-maxage=60, stale-while-revalidate=300` | **BAJO** | Vía `Astro.response.headers` o `vercel.json` |

> 🟡 **Punto de fricción con la regla 2 del plan ("no refactorizar el frontend público").**
> `ProductList.jsx`, `Carrusel.jsx`, `Busqueda.jsx` y `ShopContext.jsx` importan `productsData` **directamente**, no reciben props. El adaptador resuelve el *shape* de los datos, pero no el *canal* por el que llegan.
>
> **Tres opciones, de menor a mayor cambio:**
> - **(a)** Agregar un prop opcional con fallback a `data.jsx` en 4 componentes (≈2 líneas cada uno). Es lo más chico y deja el fallback funcionando gratis hasta la Fase 9. **Es la que recomiendo.**
> - **(b)** Reemplazar el contenido de `src/data.jsx` por un módulo que lea de Supabase. **No sirve**: los islands corren en el browser y no pueden usar la service role key; además el import es síncrono.
> - **(c)** Un endpoint `/api/properties.json` que los islands consuman con `fetch`. Más limpio a largo plazo, pero agrega un round-trip y un estado de carga a tres componentes. Más cambio, no menos.
>
> Necesito tu OK sobre la opción (a) antes de arrancar la Fase 3.

## Fase 3.5 — Renderizado tri-estado

| Archivo | Acción | Riesgo | Líneas |
|---|---|---|---|
| `src/lib/format.js` | **crear** helper `formatTriEstado()` | **NULO** | ~15 |
| `src/components/ProductDetailsReact.jsx:36-41` | 6 specs | **BAJO** | 6 |
| `src/components/ProductList.jsx:85-87` | 3 renders | **BAJO** | 3 |
| `src/components/Busqueda/PropertySearchCard.jsx:116,117,120` | 3 renders | **BAJO** | 3 |
| `src/components/ProductDetailsReact.jsx:226-234` + `:148` | **`hide_location`: implementar desde cero** | 🟡 **MEDIO** | ~10 |
| `ProductDetailsReact.jsx` (sección nueva) | **`expensas`: no existe hoy** | 🟡 **MEDIO** | ~10 |
| `ProductDetailsReact.jsx` (sección nueva) | **`frente_m`/`fondo_m`: no existen hoy** | 🟡 **MEDIO** | ~15 |

**Total del alcance obligatorio: ~28 líneas en 3 archivos + 1 nuevo. Con los 3 puntos que no existen hoy: ~63 líneas.**

---

## Pendientes que no encajan en ninguna fase y conviene no perder

| # | Pendiente | Dónde | Cuándo |
|---|---|---|---|
| 1 | **Crear `/public/propiedades/unisex.jpg`** (o cambiar los 3 fallbacks). Hoy no existe | `PropertySearchCard.jsx:11,22`, `Carrusel.jsx:63`, `PropertyMap.jsx:101` | Antes de la Fase 7 |
| 2 | **No hay página `/404`**, pero `[id].astro:16` redirige ahí | `src/pages/` | Fase 3 |
| 3 | Íconos de servicios que no matchean los nombres reales | `ProductDetailsReact.jsx:9-16` | Fase 3.5, cosmético |
| 4 | Opción de orden "Antigüedad" que no ordena nada (el campo no existe) | `Busqueda.jsx:114`, `SearchResultsHeader.jsx:30` | Fase 3 o quitar la opción |
| 5 | `'Oficina'` falta en los dos filtros de tipo | `SearchFilters.jsx:90`, `MobileFiltersModal.jsx:95` | Fase 3 |
| 6 | Orden por precio con `NaN` cuando el precio es "A consultar" | `Busqueda.jsx:111-112` | Fase 3 |
| 7 | El formulario de contacto del footer **no envía nada**: solo hace `console.log` y un `alert` | `Footer.jsx:20-25` | Fuera del alcance del plan. **Avisar al dev**: la dueña puede creer que le llegan consultas |
| 8 | El email `baruc276@gmail.com` figura hardcodeado como contacto público | `Footer.jsx:135` | Fuera de alcance, pero conviene revisarlo |

---

## Conclusión

- **El build está verde y no hay dependencias circulares.**
- Hay **7 archivos + 3 assets borrables sin ningún riesgo**, y el orden importa: `ProductDetails.jsx` primero, porque arrastra un import a un paquete no instalado.
- Hay **un solo borrado peligroso** (`ShopContext.jsx` + `AppWrapper.jsx`) que exige el protocolo de dos pasos de §3.3, y mi recomendación es dejarlo para el final.
- **`antd` no se usa** — el plan describe un stack que no coincide con el código en ese punto.
- El punto 8 tiene una respuesta más chica y más grande de lo esperado a la vez: **5 campos se renderizan con un `||` inline (~28 líneas de trabajo), y 3 no se renderizan en absoluto** (`frente_m`, `fondo_m`, `expensas`), lo que los convierte en UI nueva y no en un cambio de formato.
- **`hide_location` y `show_exact_address` no tienen ninguna implementación hoy**, y hoy mismo la id 12 filtra `"A consultar, A consultar, Jujuy, Argentina"` a la vista pública.
- **El filtro de barrio ya está roto** para 11 de sus 12 opciones. La migración lo arregla parcialmente sola y rompe la única que funcionaba.

**No borré ni modifiqué nada. Espero tu OK para arrancar la Fase 0.5.**
