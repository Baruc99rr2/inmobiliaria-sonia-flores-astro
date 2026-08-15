# INFORME FASE 3.5 — Renderizado tri-estado

> **Qué cambió.** Se implementa la §2.3 del plan v5 en la vista pública:
> `NULL` → "A consultar", `0` → "No tiene", `n` → el número. Además se escribe desde cero
> el manejo de `hide_location` / `show_exact_address` y se arreglan los íconos de
> servicios.
>
> **Rama**: `fase-3.5/tri-estado`. **No mergeada a main.**
>
> **Fuera de alcance, como estaba previsto**: `frente_m`, `fondo_m` y `expensas`. No tienen
> UI y los 19 están en `NULL`. Eso es Fase 6.5.

---

## 1. Los siete ítems

| # | Ítem | Estado |
|---|---|---|
| 1 | Helper en `src/lib/format.js` | ✅ |
| 2 | Las 6 specs de la ficha | ✅ |
| 3 | Quitar el `\|\| '0'` de cocheras | ✅ |
| 4 | 3 chips del home, omitidos si `NULL` | ✅ |
| 5 | 3 chips de búsqueda, ídem | ✅ |
| 6 | `hide_location` + `show_exact_address` desde cero | ✅ |
| 7 | Íconos de servicios con las claves nuevas | ✅ |

---

## 2. El helper: por qué son dos funciones y no una

Pediste `formatTriEstado()`. Lo implementé, **pero hizo falta una segunda función**, y el
motivo importa.

Los ocho campos numéricos no tienen la misma semántica (§2.3 del plan lo dice en la tabla
de checkboxes):

- **Contables** (`ambientes`, `dormitorios`, `banos`, `cocheras`, `expensas`): tres
  estados. Un `0` significa "no tiene" y es información de venta.
- **Medidas** (`superficie_m2`, `frente_m`, `fondo_m`): **dos** estados. Toda propiedad
  tiene superficie; solo puede desconocerse. Un `0` acá no es "no tiene", es un dato que
  falta — de hecho la §5.4 lo migra a `NULL`.

Si la superficie usara la regla de los contables, las ids 6, 7, 9 y 10 del fallback de
`data.jsx` (que tienen `superficie_m2: 0`) dirían **"No tiene superficie"**, que es
absurdo. Por eso:

```js
formatTriEstado(v)   // contables:  n | "No tiene" | "A consultar"
formatMedida(v, suf) // medidas:    n | "A consultar"      (el 0 es sin dato)
chipTriEstado(v)     // chips:      "n" | null  (null = omitir el chip entero)
chipMedida(v)        // chips:      "n" | null  (el 0 también omite)
```

**También acepta strings**, porque el mismo valor llega con dos representaciones según la
fuente:

| | `NULL` de contable | `NULL` de medida |
|---|---|---|
| desde Supabase (adaptador legacy) | `undefined` | `'a consultar'` |
| desde `data.jsx` (fallback) | clave ausente | `'a consultar'`, `0` o `''` |

Las dos tienen que renderizar igual, así que el helper normaliza ambas. **No toqué el
adaptador para "limpiar" esto**: su shape legacy es lo que mantiene vivo el fallback, y
cambiarlo habría roto la Fase 3.

---

## 3. Resultado sobre las 19 propiedades

Corrido contra la base real, no simulado.

### 3.1 Specs de la ficha

```
id | Ambientes    | Dormitorios  | Baños        | m² Cubiertos    | Cocheras
 1 | 2            | 1            | 2            | A consultar     | 1
 2 | 6            | 3            | 2            | A consultar     | 1
 3 | 3            | 2            | 1            | 180 m²          | No tiene
 4 | 1            | No tiene     | 1            | A consultar     | A consultar   <-
 5 | 1            | A consultar  | 1            | 640 m²          | A consultar   <-
 6 | 3            | 1            | 1            | A consultar     | A consultar   <-
 7 | 2            | 1            | 1            | A consultar     | A consultar   <-
 8 | 2            | No tiene     | 1            | A consultar     | No tiene
 9 | 4            | 2            | 1            | A consultar     | A consultar   <-
10 | 8            | 3            | 2            | A consultar     | A consultar   <-
11 | A consultar  | A consultar  | A consultar  | 200000 m²       | A consultar   <-
12 | 5            | 3            | 2            | A consultar     | No tiene
13 | 3            | No tiene     | 1            | A consultar     | No tiene
14 | 1            | No tiene     | No tiene     | A consultar     | No tiene
15 | 3            | 2            | 1            | A consultar     | No tiene
16 | 2            | 1            | 1            | A consultar     | No tiene
17 | 3            | 2            | 1            | A consultar     | 1
18 | 1            | No tiene     | 1            | A consultar     | No tiene
19 | 4            | 2            | 2            | A consultar     | 2
```

Las siete marcadas con `<-` son **el bug del ítem 3**: hasta ahora decían **"Cocheras: 0"**,
afirmando que no tienen cochera cuando en realidad nunca se cargó el dato. Incluido el
terreno de 20 hectáreas.

Los casos que pediste mirar:

- **id 14** (Nave): `banos: 0` → **"No tiene"** ✅ (verificado también en el browser)
- **id 11** (Terreno): todo `NULL` → "A consultar", y la superficie muestra `200000 m²`
- **id 19**: `superficie_m2` en "A consultar", el resto con dato

### 3.2 Chips compactos (`null` = chip omitido, ícono incluido)

```
id | dorm    | banos   | superficie
 1 | 1       | 2       | OMITIDO
 4 | 0       | 1       | OMITIDO
 5 | OMITIDO | 1       | 640
11 | OMITIDO | OMITIDO | 200000
14 | 0       | 0       | OMITIDO
```

El `0` **sí** se muestra en los chips, porque ahí "no tiene" es información real y entra en
el renglón. Lo que se omite es el `NULL`. Es exactamente la decisión de la §2.3 para
tarjetas compactas.

Verificado en el browser: el terreno (id 11) muestra **solo** `200000 m²`, sin los chips de
dormitorios y baños.

### 3.3 Ubicación

```
id | texto del bloque de dirección
 3 | Palpalá, Jujuy, Argentina
11 | San Antonio, calle Camino Real, Jujuy, Argentina
12 | San Salvador de Jujuy, Jujuy, Argentina        [+ aviso de reservada]
13 | Barrio Almirante Brown, Avenida Almirante Brown, San Salvador de Jujuy, Jujuy, Argentina
18 | Palpalá, Avenida Libertad 200, Jujuy, Argentina
19 | San Salvador de Jujuy, Jujuy, Argentina        [+ aviso de reservada]
```

- **ids 12 y 19** (ubicación reservada): ya no imprimen
  `"A consultar, A consultar, Jujuy, Argentina"`. Muestran la localidad —que no es un dato
  reservado— más el aviso *"La dirección exacta se reserva. Consultanos y te la pasamos."*
  **El mapa se renderiza igual, apuntando a la zona real.** No difuminé ni desplacé nada.
- **id 13**: `show_exact_address = false` y `numero = '800'` → se muestra
  `"Avenida Almirante Brown"` **sin la altura**.
- **id 18**: `show_exact_address = true` → se muestra `"Avenida Libertad 200"` **con** la
  altura. Es la única con la dirección exacta habilitada.

---

## 4. Búsqueda de texto prohibido

Sobre las 19 propiedades y todos los campos que toca esta fase:

```
OK: ningun "null", "undefined", "a consultar" en minuscula
    ni "A consultar, A consultar"
```

El regex de "a consultar en minúscula" usa un *lookbehind* para no marcar el
`"A consultar"` correcto: busca la variante que empieza en minúscula, que era la que se
filtraba desde `data.jsx`.

---

## 5. Dos cosas que encontré y arreglé de paso

### 5.1 La localidad se duplicaba

La primera versión imprimía **"Palpalá, Palpalá, Jujuy, Argentina"** (ids 3 y 18) y
**"San Antonio, calle Camino Real, San Antonio, Jujuy, Argentina"** (id 11).

Causa: cuando una propiedad no tiene barrio cargado, el shape legacy pone la **localidad**
dentro de `detalles.barrio` (así lo reconstruye el adaptador desde la Fase 2). Al sumar la
localidad como parte propia, quedaba dos veces. Resuelto deduplicando las partes sin
distinguir mayúsculas.

Lo agarré comparando la salida de las 19 antes de mirar el browser; en la ficha suelta
pasa fácilmente por alto.

### 5.2 El centinela también se filtraba en las tarjetas

El ítem 6 hablaba de `ProductDetailsReact.jsx:226-234` y `:148`. Pero el mismo
`'A consultar'` se imprimía como nombre de zona en otros tres lugares:

| Archivo | Qué mostraba |
|---|---|
| `PropertySearchCard.jsx:102` | `detalles.barrio \|\| "Ubicación"` |
| `ProductList.jsx:79` | `detalles.barrio \|\| "Ubicación no especificada"` |
| `Carrusel.jsx:123` | `detalles.barrio` |

Los tres pasaron a usar el mismo helper `etiquetaZona()`. **Es una extensión del alcance
que definiste**: son tres líneas y usan el helper que ya había que escribir, pero si
preferís que quede solo lo listado, se revierte fácil.

---

## 6. Dos campos nuevos en el adaptador

`mapProperty.ts` agrega a `detalles`, igual que hizo la Fase 3 con los slugs y con el
mismo criterio de ser puramente aditivo:

| Campo | Para qué |
|---|---|
| `hide_location` | La señal explícita de ubicación reservada. Hasta ahora el único indicio era que `barrio` y `calle` dijeran `'A consultar'` — o sea, el centinela que justamente queríamos dejar de usar |
| `localidad` | Permite mostrar algo útil sin revelar barrio ni calle |

El helper igual contempla el caso sin estos campos, para que el fallback de `data.jsx`
—que no los tiene— siga detectando la ubicación reservada por el centinela.

---

## 7. Íconos de servicios

Estaban mapeados a nombres que ya no existen en el dato:

| Clave vieja | Clave real del catálogo (§5.3) |
|---|---|
| `'Agua Potable'` | `Agua` |
| `'Gas Natural'` | `Gas` |
| `'Electricidad'` | `Luz` |
| `'Internet'` | `Wifi` |

Cuatro de los seis caían al ícono genérico de manta. Ahora el mapeo usa las claves reales
y **normaliza a minúsculas al buscar**, para que un cambio de mayúsculas en el catálogo no
lo vuelva a romper. Verificado en el browser sobre la id 12: Agua, Luz y Gas con sus
íconos propios.

`Wifi` usa `BiWifi`, que reemplaza al `BiMap` que estaba puesto para `'Internet'` —un ícono
de mapa para el wifi.

---

## 8. Qué verificar en el preview

1. **id 12 y id 19**: la dirección dice la localidad + el aviso, **y el mapa sigue
   apareciendo**. Si el mapa no está, es un bug: la §2.2 dice explícitamente que
   `hide_location` no lo afecta.
2. **id 14**: Baños, Dormitorios y Cocheras en "No tiene".
3. **ids 4, 5, 6, 7, 9, 10, 11**: Cocheras en "A consultar", no en `0`.
4. **id 11** en la búsqueda: solo el chip de superficie.
5. **id 13 vs id 18**: la 13 sin altura de calle, la 18 con `200`.
6. **Home**: las tarjetas de "Últimas Novedades" ya no muestran `0 Dorm.` ni
   `a consultar m²`.
7. **Servicios**: en cualquier ficha con servicios, que no aparezca el ícono de manta.

Build verde con `astro check` (0 errores) y las 19 fichas verificadas por script contra la
base real.
