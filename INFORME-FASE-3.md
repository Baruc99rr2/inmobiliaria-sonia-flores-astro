# INFORME FASE 3 — El sitio público leyendo de Supabase

> **Qué cambió.** Las tres páginas dejaron de leer `src/data.jsx` y pasan a leer de la
> base por request. `data.jsx` **no se tocó**: queda como fallback hasta la Fase 9.
>
> **Rama**: `fase-3/sitio-desde-db`. No mergeada a `main`.
>
> **Regla que se respetó**: el adaptador sigue devolviendo el shape legacy. Nada de
> tri-estado acá — eso es la Fase 3.5.

---

## 1. Qué se cambió, archivo por archivo

### Páginas — pasan a SSR

| Archivo | Cambio |
|---|---|
| `src/pages/index.astro` | `prerender = false`, lee de Supabase, pasa `products` a `Homepage` |
| `src/pages/busqueda.astro` | `prerender = false`, lee propiedades **y catálogos**, los pasa a `Busqueda` |
| `src/pages/propiedades/[id].astro` | `prerender = false`, **pierde `getStaticPaths`**, resuelve por `legacy_id`, 404 real |
| `src/pages/404.astro` | **NUEVO.** La ruta no existía y `[id].astro` redirigía ahí desde antes de esta fase |

### Componentes — prop opcional con fallback

Exactamente el patrón aprobado, sin reescrituras:

```js
const products = productsProp ?? productsData ?? [];
```

| Archivo | Líneas cambiadas |
|---|---|
| `src/components/Homepage.jsx` | 3 — recibe `products` y lo baja a los dos hijos |
| `src/components/ProductList.jsx` | 3 |
| `src/components/Carrusel.jsx` | 3 |
| `src/components/Busqueda/Busqueda.jsx` | firma + filtro (ver §2) |

### Filtro — la sub-tarea obligatoria

| Archivo | Cambio |
|---|---|
| `src/components/Busqueda/SearchFilters.jsx` | lista hardcodeada → catálogo; se agrega **Localidad**; tipo desde catálogo |
| `src/components/Busqueda/MobileFiltersModal.jsx` | ídem, y **deja de divergir del de desktop** |

### Archivos nuevos de soporte

| Archivo | Para qué |
|---|---|
| `src/lib/properties.ts` | Las tres consultas del sitio público + la constante `Cache-Control`. Ninguna función tira: ante error devuelven que falló, y la página cae al fallback |
| `src/lib/zonas.js` | `slugify`, `zonaDeProducto`, `tipoDeProducto`, `construirOpciones`. Permiten que el filtro por slug funcione **también** con el fallback de `data.jsx`, que no tiene slugs |
| `src/components/PropiedadNoEncontrada.astro` | Bloque 404 compartido por `/404` y por la ficha inexistente |

### Adaptador — tres claves nuevas, aditivas

`src/lib/mapProperty.ts` ahora agrega a `detalles`: `localidad_slug`, `barrio_slug` y
`tipo_slug`. **No existen en `data.jsx` y ningún componente legacy las lee**, así que no
cambian nada de lo que se renderiza. Las usa solo el filtro.

Con la ubicación reservada (ids 12 y 19) `barrio_slug` queda en `null` — la propiedad no
aparece bajo ningún barrio. `localidad_slug` sí se expone: `hide_location` oculta barrio y
calle, no la localidad, y el mapa ya apunta a la zona real (§2.2 del plan).

---

## 2. El filtro de barrio: de 11 opciones rotas a 0

**Antes**: los `<select>` ofrecían `"Los Perales"` y el dato decía `"Barrio Los Perales"`,
comparados con igualdad estricta. 11 de 12 opciones devolvían cero resultados. Las dos
listas estaban hardcodeadas y **no coincidían entre sí** (`"Moreno"` en desktop,
`"Mariano Moreno"` en mobile).

**Ahora**: las listas salen de `localidades` y `neighborhoods`, y se compara por slug.

Probé **todas** las opciones de los tres filtros contra la base real:

```
=== LOCALIDAD ===
  Palpalá                   2  ids: 3,18
  San Antonio               1  ids: 11
  San Salvador de Jujuy    16  ids: 1,2,4,5,6,7,8,9,10,12,13,14,15,16,17,19

=== BARRIO ===
  Almirante Brown           1  ids: 13
  Alto Comedero             1  ids: 5
  Centro                    5  ids: 2,4,6,8,16
  Chijra                    1  ids: 10      <- antes INALCANZABLE
  Cuyaya                    1  ids: 7
  Gorriti                   1  ids: 15      <- antes INALCANZABLE
  Los Perales               3  ids: 1,9,17
  San Pedrito               1  ids: 14

=== TIPO ===
  Casa                      4  ids: 2,10,12,19
  Departamento              7  ids: 1,6,7,9,15,16,17
  Local Comercial           3  ids: 3,13,18
  Oficina                   2  ids: 4,8     <- antes INALCANZABLE
  Galpón / Depósito         1  ids: 5
  Nave Industrial           1  ids: 14
  Terreno                   1  ids: 11

=== ESTADO ===
  Venta                     5  ids: 4,6,10,11,19
  Alquiler                 14  ids: 1,2,3,5,7,8,9,12,13,14,15,16,17,18

>>> opciones con 0 resultados: 0 de 18
```

Coincide con §5.5 del plan fila por fila. Las sumas cierran: los 8 barrios dan 14
propiedades, más las ids 12 y 19 sin barrio = 16 en San Salvador de Jujuy.

**El select de tipo muestra el label de presentación** (`"Local Comercial"`) **y compara
por slug** (`local`). Eso desactiva la trampa 2 de la Fase 0 en el filtro: ya no depende
de que `legacy_label` coincida con el texto de una lista hardcodeada.

Además, elegir localidad **filtra los barrios ofrecidos** y limpia el barrio elegido, para
que no quede una combinación que siempre da cero.

---

## 3. El 404, que antes no existía

`[id].astro:16` hacía `Astro.redirect('/404')` a una ruta inexistente: el visitante
terminaba en una página que no estaba y el buscador recibía un 302 en vez de un 404.

Ahora:

| URL | Antes | Ahora |
|---|---|---|
| `/propiedades/999` | 302 → `/404` inexistente | **404** con página útil, en la misma URL |
| `/propiedades/abc` | ídem | **404** |
| `/ruta-que-no-existe` | 404 crudo de Astro | **404** con la página nueva |

---

## 3.bis El 500 del preview: qué era en realidad

> Esta sección se agregó después del primer push, al investigar el 500 que apareció en el
> preview de Vercel.

### No era un import faltante

La hipótesis inicial fue que `index.astro` tenía `import { getPublishedProducts, }` con
`CACHE_CONTROL` sin importar y una coma suelta. **No es el caso.** En el commit pusheado
(`5c3fdbd`), en el working tree y en `origin`, la línea es:

```js
import { getPublishedProducts, CACHE_CONTROL } from '../lib/properties';
```

Lo confirmé con `git show`, con `git diff` contra `origin` y con el typecheck, que no
reporta ningún identificador sin definir en las tres páginas.

### Lo que sí era: un `throw` mío a nivel de módulo

`src/lib/supabase-server.ts` hacía esto al importarse:

```ts
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY...');
}
```

Ese `throw` ocurre **al importar el módulo**, o sea antes de que corra una sola línea de la
página. El `try`/`catch` y el fallback que escribí nunca llegaban a ejecutarse. Resultado:
**500 en las tres rutas**, en lugar de degradar a `data.jsx`.

Es exactamente lo contrario de lo que el fallback existe para evitar, y contradice lo que
afirmé en el informe anterior: *"el sitio nunca se queda sin propiedades"*. Con las
variables ausentes, se quedaba sin sitio.

### Cómo lo reproduje

El error **no aparece con `astro dev`**, que es con lo que yo había verificado la fase.
Tuve que correr el bundle serverless real. El adapter de Vercel emite un handler
web-standard en `.vercel/output/functions/_render.func/dist/server/entry.mjs`, que se
puede invocar directo:

```js
import entry from './dist/server/entry.mjs';
const res = await entry.fetch(new Request('https://www.inmobiliariasoniaflores.com/'));
```

Cuatro escenarios, antes y después del arreglo:

| # | Build | Runtime | Antes | Después |
|---|---|---|---|---|
| A | con claves | con claves | 200 | 200 |
| B | con claves | sin claves | 200 | 200 |
| C | **sin claves** | **sin claves** | 🔴 **500** | ✅ 200 + fallback |
| D | sin claves | con claves | 200 | 200 |

El escenario **C** es el que rompía. **D** es el caso que mencionás del build cacheado, y
funciona porque `supabase-server.ts` lee `import.meta.env.X ?? process.env.X`: aunque Vite
haya inlineado `undefined` en el build, en el servidor `process.env` las levanta en
runtime.

### El arreglo

Ni `supabase-server.ts` ni `supabase.ts` tiran ya. Si faltan las credenciales, el cliente
queda en `null`, se loguea un error explícito, y `properties.ts` lo trata como una
consulta fallida. El sitio sirve `data.jsx` y sigue en pie.

---

## 4. Comportamiento con Supabase caído

Lo probé de verdad, levantando el dev server con una URL de Supabase inexistente.

**En la primera versión encontré un bug que había metido yo**: las fichas devolvían
**404** cuando la base no respondía. Eso le habría dicho a Google que las 19 propiedades
dejaron de existir. El problema era que `getProductByLegacyId` devolvía `null` tanto para
"no existe" como para "la consulta falló".

Corregido: la función ahora distingue los dos casos, y la ficha cae a `data.jsx` cuando el
error es de infraestructura. El 404 quedó reservado para cuando la consulta **anduvo** y
la propiedad realmente no está.

Resultado con Supabase caído:

| URL | HTTP | Sirve |
|---|---|---|
| `/` | 200 | `data.jsx` |
| `/busqueda` | 200 | `data.jsx` |
| `/propiedades/1` | 200 | `data.jsx` |
| `/propiedades/12` | 200 | `data.jsx` |
| `/propiedades/999` | 404 | correcto: no existe tampoco en `data.jsx` |

**El filtro sigue funcionando en modo fallback**: `zonaDeProducto()` deriva el slug del
texto legacy con la misma regla §2.1 del script de migración. Verifiqué que
`"Barrio Los Perales"` → `los-perales` y `"Palpalá"` → `palpala`, que son exactamente los
slugs del catálogo.

---

## 5. Cache-Control

El header del plan se aplica en las tres páginas:

```
public, s-maxage=60, stale-while-revalidate=300
```

**Con una excepción que agregué**: cuando la respuesta viene del fallback, el header pasa a
`public, max-age=0, must-revalidate`. Sin eso, un corte de 5 segundos de Supabase dejaría
el CDN sirviendo datos viejos durante 60 segundos más, y hasta 5 minutos con
`stale-while-revalidate`. Lo mismo para el 404.

---

## 6. Qué verificar visualmente en el preview

**No pude hacer el recorrido visual**: la extensión de Chrome no estaba conectada. Todo lo
de arriba está verificado por HTTP y por pruebas de la lógica del filtro contra la base
real, pero la comparación visual propiedad por propiedad queda pendiente y es la
verificación que pide el plan.

### 6.1 Las 8 diferencias ya previstas en la Fase 2

Están documentadas en `INFORME-FASE-2.md` §5 y **son esperadas, no bugs**:

| ids | Qué mirar | Dónde |
|---|---|---|
| 1, 2, 3 | Desaparece la sección "Servicios Incluidos" | Ficha |
| 4, 6, 7, 9, 10 | La superficie dice `a consultar` en vez de `-` | Ficha |
| 4, 6, 7, 9, 10 | Dice `a consultar m²` en vez de `0 m²` | Home |
| 4, 6, 7, 9, 10 | Dice `a consultar` en vez de `0` | Tarjetas de búsqueda |
| 4, 5, 6, 7, 8, 9, 10, 19 | Servicios en otro orden | Ficha |

Las otras 11 propiedades tienen que renderizar **idéntico**. Cualquier otra diferencia es
un bug de esta fase.

### 6.2 Lo nuevo de esta fase

1. **El filtro de barrio**: probar Chijra y Gorriti, que antes no estaban en la lista.
2. **El filtro de tipo**: probar Oficina (ids 4 y 8), que antes no se podía filtrar.
3. **Localidad**: elegir Palpalá y confirmar que el select de barrio se deshabilita con
   "Sin barrios" — Palpalá y San Antonio no tienen barrios cargados.
4. **`/propiedades/19`**: con `getStaticPaths` esta propiedad no existía sin rebuild.
5. **`/propiedades/999`** y **`/cualquier-cosa`**: la página 404 nueva.
6. **Layout de los filtros en desktop**: agregué una sexta columna (Localidad) a una
   grilla de 12. Vale la pena mirar que no se apriete en pantallas medianas.

---

## 6.bis Por qué el build pasó en verde con un error de runtime

**Porque `astro build` no hace typecheck, y porque el error no era de tipos.**

Las dos mitades de la respuesta:

**1. No había typecheck.** `typescript` no estaba instalado, así que ni `astro build` ni
nada más miraba los `.ts` y los `.astro`. `astro build` compila y empaqueta: no verifica
tipos ni identificadores no declarados. Esto ya lo había anotado en `INFORME-FASE-2.md`
§6, y quedó pendiente.

Ahora está instalado y **`npm run check` da 0 errores**. Al correrlo por primera vez
encontró 4 errores reales que el build venía ignorando:

| Archivo | Error |
|---|---|
| `supabase-server.ts:26,28` | `Cannot find name 'process'` — faltaba `@types/node` |
| `index.astro:36` | `LoadingScreen` requería `onFinish`, que nunca se le pasaba |
| `index.astro:37` | `Homepage` requería `onVideoLoaded`, ídem |

Los tres están arreglados. Los dos de `index.astro` **son anteriores a esta fase**.

Dos cosas que costaron para dejarlo andando, y conviene que queden anotadas:

- **`typescript@7` no sirve todavía.** `astro check` falla con *"The TypeScript module
  loaded (found 7.0.2) does not expose the programmatic API that `astro check` relies
  on"*. Hay que quedarse en **`typescript@^6`** hasta que Astro lo soporte
  ([roadmap#1321](https://github.com/withastro/roadmap/discussions/1321)).
- Hizo falta `"types": ["node"]` en `tsconfig.json` para que reconozca `process`.

**2. Pero el typecheck NO habría atrapado este bug.** Esto es lo importante: un `throw`
condicional a nivel de módulo es código perfectamente válido y bien tipado. Ninguna
herramienta de tipos lo marca. Lo que lo atrapa es **ejecutar el bundle de producción sin
las variables de entorno**, que es lo que no hice en la primera pasada: verifiqué con
`astro dev`, donde el `.env` local siempre estaba presente.

O sea que sirven las dos cosas, y ninguna reemplaza a la otra:

- El typecheck habría atrapado el `ReferenceError` que vos suponías, y de hecho atrapó
  otros 4 problemas reales.
- Solo probar el bundle real con el entorno degradado atrapa esto.

**Mi recomendación sobre la Fase 3.9**: ya la adelanté en lo esencial —`typescript@^6`,
`@astrojs/check`, `@types/node`, script `npm run check`, 0 errores— porque contestar tu
pregunta requería instalarlo igual. Lo que **no** hice, y sigue pendiente, es meterlo en
el pipeline: correr `check` en el build o en CI para que no vuelva a acumularse deuda. Eso
sí conviene resolverlo antes de la 3.5.

---

## 7. Dos cosas menores que aparecieron

**La canónica de `/busqueda` perdió la barra final.** En el build estático era
`.../busqueda/`; con SSR es `.../busqueda`. Sale de `Astro.url.pathname`, que difiere
entre los dos modos. Es cosmético y las dos URLs responden, pero si querés fijarlo se
resuelve con `trailingSlash` en `astro.config.mjs`. **No lo toqué**: cambiar esa opción
afecta todas las rutas y excede esta fase.

**Aviso del adapter en el build**: `The local Node.js version (26) is not supported by
Vercel Serverless Functions. Your project will use Node.js 24`. Es del entorno local, no
del código, y ya aparecía antes. Vercel compila con Node 24 igual.

---

## 8. Pendiente antes de que el preview funcione

**Hay que cargar en Vercel las dos variables**, o el preview va a servir el fallback de
`data.jsx` en vez de leer de la base:

```
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` **no va a Vercel**: el sitio público no la necesita y saltea
RLS.

El detalle incómodo es que **el fallback hace que la falta de variables no se note**: el
sitio va a andar igual, con los datos de `data.jsx`. Para distinguir un caso del otro,
mirá la ficha **`/propiedades/19`** o filtrá por **Chijra**: las dos cosas funcionan con
`data.jsx`, así que no sirven. El indicador confiable es el header:

```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300   -> lee de Supabase
Cache-Control: public, max-age=0, must-revalidate                -> está en fallback
```

### Cuidado con el build cacheado de Vercel

Las variables `PUBLIC_*` de Astro **se incrustan en tiempo de build**: Vite reemplaza cada
`import.meta.env.PUBLIC_X` por su valor literal al compilar. Un redeploy que reutilice una
build cacheada vuelve a publicar el bundle viejo, **compilado sin las claves**, aunque las
variables ya estén cargadas en el proyecto.

En este proyecto eso **no rompe el servidor**, porque `supabase-server.ts` lee
`import.meta.env.X ?? process.env.X` y Vercel inyecta las variables en el runtime de la
función: es el escenario D de §3.bis y da 200. Pero hay dos consecuencias que sí importan:

1. **En el cliente no hay red de contención.** `supabase.ts` (que hoy no usa nadie, pero
   va a usar la Fase 4) corre en el browser, donde `process.env` no existe. Si el bundle
   se compiló sin las claves, ese cliente queda en `null` y no hay forma de recuperarlo en
   runtime. **Para la Fase 4, un redeploy con caché sí puede romper el login.**
2. Ante cualquier duda, **redeploy sin caché** ("Redeploy" destildando *Use existing Build
   Cache*), que es la única forma de garantizar que las variables quedaron incrustadas.
