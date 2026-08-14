# INFORME FASE 2 — Diferencias entre `data.jsx` y el adaptador

> **Qué es esto.** Antes de correr la migración quise saber, campo por campo, en qué
> se va a diferenciar lo que devuelve `mapDbToProduct()` de lo que hoy hay en
> `src/data.jsx`. Cualquier diferencia acá es un cambio que el visitante puede llegar
> a ver en la Fase 3, cuando el sitio deje de leer `data.jsx` y empiece a leer de la base.
>
> **Cómo se obtuvo.** Round-trip completo, sin tocar Supabase:
> `data.jsx` → transformación real de `scripts/migrate-data.mjs` → fila simulada tal
> como la devolvería PostgREST → `mapDbToProduct()` → comparación campo por campo
> contra el objeto original de `data.jsx`. Se compararon **las 19 propiedades** y
> **23 campos** de cada una.
>
> **Resultado: 36 diferencias, concentradas en 5 campos.** De esas, **8 se ven** y
> **28 son invisibles** para el visitante.

> ⚠️ **Corrección respecto de lo que te reporté por terminal.** Ahí dije "31
> diferencias". El número real es **36**. Las 5 que faltaban son las de
> `detalles.expensas`: se me había escapado ese campo de la lista comparada. No cambia
> ninguna conclusión, porque `expensas` no se renderiza en ningún lado, pero el número
> correcto es 36.

---

## 1. Resumen

| Campo | Diferencias | ¿Se ve? |
|---|---|---|
| `detalles.servicios` | 11 | **Sí, 3 de ellas.** Las otras 8 son solo cambio de orden |
| `detalles.superficie_m2` | 6 | **Sí, 5 de ellas.** La otra es un cambio de tipo invisible |
| `detalles.frente_m` | 7 | No — ningún componente lo renderiza |
| `detalles.fondo_m` | 7 | No — ídem |
| `detalles.expensas` | 5 | No — ídem |
| **Total** | **36** | **8 visibles** |

**Todo lo demás reproduce `data.jsx` exactamente**: `id`, `name`, `price`, `category`,
`description`, `images`, y dentro de `detalles` los campos `tipo`, `barrio`, `calle`,
`numero`, `cocheras`, `ambientes`, `dormitorios`, `banos`, `mostrarDireccionExacta`,
`adicionales`, `mapaQuery`, `lat` y `lon`. Cero diferencias en esos 19 campos, en las 19
propiedades.

Vale la pena subrayar dos que salieron limpios porque eran las trampas de la Fase 0:

- **`price`**: las 19 coinciden. Ninguna quedó en `0`. Las que hoy dicen `'A consultar'`
  siguen diciendo `'A consultar'`, y las numéricas vuelven como el mismo string
  (`"480000"`), no como `"480000.00"` que es lo que devuelve `numeric(14,2)`.
- **`detalles.tipo`**: las 19 coinciden, incluidos los tres casos peligrosos —
  `'Local'` (ids 3, 13, 18), `'Galpon'` (id 5) y `'Nave'` (id 14) vuelven con el
  `legacy_label`, no con el label de presentación. El filtro de tipo sigue matcheando.

---

## 2. Las 8 diferencias que SE VEN

### 2.1 La sección "Servicios Incluidos" desaparece en 3 propiedades

**Afecta a las ids 1, 2 y 3.**

| | Hoy | Después |
|---|---|---|
| `detalles.servicios` | `["A consultar"]` | `[]` |
| Ficha de detalle | Muestra la sección con **un chip que dice "A consultar"** y un ícono de manta | **La sección entera no se renderiza** |

El origen está en `data.jsx`: esas tres propiedades tienen `'A consultar'` cargado como
si fuera un servicio. El plan lo trata explícitamente en §1.2 y §5.3 — *"'A consultar'
no es un servicio: se traduce a array vacío"*.

El componente esconde la sección cuando el array está vacío
(`ProductDetailsReact.jsx:192`, `serviciosGrid.length > 0`), que es exactamente lo que
ya pasa hoy con las ids 11 y 15. O sea que el comportamiento no es nuevo: se extiende a
tres propiedades más.

El ícono de manta aparece porque `serviceIcons` (`ProductDetailsReact.jsx:9-16`) no
tiene ninguna clave `'A consultar'` y cae al genérico `<BiBlanket />`.

> **Mi lectura:** es una mejora. Hoy esas fichas muestran un cuadro de servicios con una
> sola entrada que no informa nada. Igual lo dejo marcado porque es visible y aparece en
> la comparación propiedad por propiedad de la Fase 3.

---

### 2.2 La superficie pasa a decir "a consultar" en 5 propiedades

**Afecta a las ids 4, 6, 7, 9 y 10.**

| id | `data.jsx` | Adaptador | Ficha: hoy → después | Tarjetas: hoy → después |
|---|---|---|---|---|
| 4 | `""` | `"a consultar"` | `-` → `a consultar` | `0` → `a consultar` |
| 6 | `0` | `"a consultar"` | `-` → `a consultar` | `0` → `a consultar` |
| 7 | `0` | `"a consultar"` | `-` → `a consultar` | `0` → `a consultar` |
| 9 | `0` | `"a consultar"` | `-` → `a consultar` | `0` → `a consultar` |
| 10 | `0` | `"a consultar"` | `-` → `a consultar` | `0` → `a consultar` |

Los tres puntos donde se ve:

- **Ficha de detalle**, tarjeta "m² Cubiertos" — `ProductDetailsReact.jsx:40`,
  `product.detalles?.superficie_m2 || '-'`. Con `0` o `""` da `'-'`; con el string da
  el string.
- **Home, "Últimas Novedades"** — `ProductList.jsx:87`, `{superficie_m2 || 0} m²`. Hoy
  imprime **`0 m²`**; después va a imprimir **`a consultar m²`**.
- **Tarjetas de búsqueda** — `PropertySearchCard.jsx:120`, `{superficie_m2 || 0}` al
  lado del ícono de metros. Hoy **`0`**, después **`a consultar`**.

Esto es la regla §5.4 del plan funcionando tal cual está escrita: *"superficie_m2 /
frente_m / fondo_m: 0, "", "a consultar", ausente → NULL"*, y después el adaptador
devuelve `'a consultar'` para todo lo que sea `NULL`.

> **Mi lectura:** decir "a consultar" es más honesto que decir "0 m²", que es
> directamente falso. Pero **`a consultar m²` en el home queda mal redactado**, y en las
> tarjetas de búsqueda el texto es largo para un renglón de tres columnas con íconos en
> `text-xs`. Es justo el problema que la §2.3 del plan ya previó, y por eso la Fase 3.5
> decide **omitir el chip entero** cuando el valor es `NULL` en las tarjetas compactas.
>
> **Recomendación: aceptar este cambio en la Fase 3 y arreglar la presentación en la
> 3.5**, que es donde está agendado. La alternativa —adelantar el arreglo— mezcla dos
> fases y rompe la propiedad de "cambio de fuente de datos con riesgo cero".

---

## 3. Las 28 diferencias que NO se ven

### 3.1 Orden de los servicios — 8 propiedades

**Afecta a las ids 4, 5, 6, 7, 8, 9, 10 y 19.** El conjunto de servicios es idéntico;
cambia el orden en que se listan.

| id | Hoy | Después |
|---|---|---|
| 4 | Agua, Cloaca, Luz | Agua, Luz, Cloaca |
| 5 | Agua, Cloaca, Luz, Pavimento | Agua, Luz, Cloaca, Pavimento |
| 6 | Agua, Cloaca, Luz, Pavimento, Gas | Agua, Luz, Gas, Cloaca, Pavimento |
| 7 | Agua, Cloaca, Luz, Pavimento, Gas | Agua, Luz, Gas, Cloaca, Pavimento |
| 8 | Wifi, Luz, Agua | Agua, Luz, Wifi |
| 9 | Agua, Cloaca, Luz, Pavimento, Gas | Agua, Luz, Gas, Cloaca, Pavimento |
| 10 | Agua, Cloaca, Gas, Luz, Pavimento | Agua, Luz, Gas, Cloaca, Pavimento |
| 19 | Agua, Luz, Cloaca, Gas, Pavimento | Agua, Luz, Gas, Cloaca, Pavimento |

En `data.jsx` el orden es el que quedó al cargar cada propiedad a mano, y por eso no hay
dos iguales. El adaptador los ordena por el `sort_order` del catálogo `services`
(§5.3: agua, luz, gas, cloaca, pavimento, wifi), así que **todas las fichas pasan a
listar los servicios en el mismo orden**.

Lo cuento como "no se ve" en el sentido de que no cambia qué información se muestra, solo
su orden, y el resultado es más consistente que el actual. Si en la comparación visual de
la Fase 3 alguien mira dos fichas lado a lado, lo va a notar.

### 3.2 `frente_m` y `fondo_m` — 7 propiedades cada uno

**Afecta a las ids 4, 5, 6, 7, 9, 10 y 11.** Pasan de `«ausente»` (la clave no existe en
`data.jsx`) o de `0` (id 5) a `"a consultar"`.

**Impacto cero: ningún componente del sitio renderiza estos dos campos.** Está
verificado en la auditoría de la Fase 0 (§A.8 del `INFORME-FASE-0.md`, "0 accesos").
Existen en el dato y nunca llegan al DOM.

Se van a ver por primera vez en la **Fase 6.5**, que es donde el plan agendó crear la UI
para ellos.

### 3.3 `expensas` — 5 propiedades

**Afecta a las ids 5, 6, 7, 9 y 10.** Pasan de `0` a `«ausente»` (`undefined`).

**Impacto cero por el mismo motivo: no se renderiza en ningún lado.**

El `0` se descarta a propósito. La §2.3 del plan lo razona así: que aparezca `0` en
exactamente cinco propiedades y la clave falte en las otras catorce sugiere relleno
automático, no una afirmación de "esta propiedad no tiene expensas". Migrarlo como `0`
significaría publicar "Expensas: No tiene" en la Fase 3.5 sobre algo que la dueña nunca
dijo. Va a `NULL` → "A consultar". Si ella confirma que esas cinco no tienen expensas,
es un `UPDATE` de una línea.

### 3.4 `superficie_m2` de la id 3 — cambio de tipo

`"180"` (string) → `180` (number). **Se renderiza igual**: los dos imprimen `180`.

Además **corrige un bug latente del filtro de área**: `Busqueda.jsx:99-100` compara
`d.superficie_m2 < parseInt(f.areaMin)`. Con un string funcionaba por coerción
implícita; con un número funciona de verdad.

---

## 4. Tabla completa de las 36 diferencias

```
id  | campo                  | hoy (data.jsx)                | con el adaptador
----+------------------------+-------------------------------+------------------------------------
1   | detalles.servicios     | ["A consultar"]               | []
2   | detalles.servicios     | ["A consultar"]               | []
3   | detalles.superficie_m2 | "180"                         | 180
3   | detalles.servicios     | ["A consultar"]               | []
4   | detalles.superficie_m2 | ""                            | "a consultar"
4   | detalles.frente_m      | «ausente»                     | "a consultar"
4   | detalles.fondo_m       | «ausente»                     | "a consultar"
4   | detalles.servicios     | ["Agua","Cloaca","Luz"]       | ["Agua","Luz","Cloaca"]
5   | detalles.frente_m      | 0                             | "a consultar"
5   | detalles.fondo_m       | 0                             | "a consultar"
5   | detalles.servicios     | ["Agua","Cloaca","Luz","Pav"] | ["Agua","Luz","Cloaca","Pavimento"]
5   | detalles.expensas      | 0                             | «ausente»
6   | detalles.superficie_m2 | 0                             | "a consultar"
6   | detalles.frente_m      | «ausente»                     | "a consultar"
6   | detalles.fondo_m       | «ausente»                     | "a consultar"
6   | detalles.servicios     | ["Agua","Cloaca","Luz","Pav"] | ["Agua","Luz","Gas","Cloaca","Pavimento"]
6   | detalles.expensas      | 0                             | «ausente»
7   | detalles.superficie_m2 | 0                             | "a consultar"
7   | detalles.frente_m      | «ausente»                     | "a consultar"
7   | detalles.fondo_m       | «ausente»                     | "a consultar"
7   | detalles.servicios     | ["Agua","Cloaca","Luz","Pav"] | ["Agua","Luz","Gas","Cloaca","Pavimento"]
7   | detalles.expensas      | 0                             | «ausente»
8   | detalles.servicios     | ["Wifi","Luz","Agua"]         | ["Agua","Luz","Wifi"]
9   | detalles.superficie_m2 | 0                             | "a consultar"
9   | detalles.frente_m      | «ausente»                     | "a consultar"
9   | detalles.fondo_m       | «ausente»                     | "a consultar"
9   | detalles.servicios     | ["Agua","Cloaca","Luz","Pav"] | ["Agua","Luz","Gas","Cloaca","Pavimento"]
9   | detalles.expensas      | 0                             | «ausente»
10  | detalles.superficie_m2 | 0                             | "a consultar"
10  | detalles.frente_m      | «ausente»                     | "a consultar"
10  | detalles.fondo_m       | «ausente»                     | "a consultar"
10  | detalles.servicios     | ["Agua","Cloaca","Gas","Luz"] | ["Agua","Luz","Gas","Cloaca","Pavimento"]
10  | detalles.expensas      | 0                             | «ausente»
11  | detalles.frente_m      | «ausente»                     | "a consultar"
11  | detalles.fondo_m       | «ausente»                     | "a consultar"
19  | detalles.servicios     | ["Agua","Luz","Cloaca","Gas"] | ["Agua","Luz","Gas","Cloaca","Pavimento"]
```

### Propiedades sin ninguna diferencia (8 de 19)

**ids 12, 13, 14, 15, 16, 17, 18** y la **1** salvo el caso de servicios ya descrito.
Las ids **12** y **19** merecen mención aparte porque son las de ubicación reservada: el
adaptador reconstruye correctamente `barrio: 'A consultar'` y `calle: 'A consultar'` a
partir de `hide_location`, sin que el centinela quede guardado en las columnas de texto
de la base.

---

## 5. Qué mirar en la comparación visual de la Fase 3

Propiedades donde **sí** vas a ver algo distinto:

| ids | Qué mirar | Dónde |
|---|---|---|
| 1, 2, 3 | Desaparece la sección "Servicios Incluidos" | Ficha de detalle |
| 4, 6, 7, 9, 10 | La superficie dice `a consultar` en vez de `-` | Ficha de detalle |
| 4, 6, 7, 9, 10 | La superficie dice `a consultar m²` en vez de `0 m²` | Home |
| 4, 6, 7, 9, 10 | La superficie dice `a consultar` en vez de `0` | Tarjetas de búsqueda |
| 4, 5, 6, 7, 8, 9, 10, 19 | Los servicios listados en otro orden | Ficha de detalle |

Las **11 restantes** (11, 12, 13, 14, 15, 16, 17, 18 y las partes no mencionadas del
resto) tienen que renderizar **idéntico**. Si aparece cualquier otra diferencia, es un
bug de la migración y no algo previsto acá.

---

## 6. Dos cosas que encontré de paso

**Hay dos propiedades marcadas como alquiladas en el título.** Las ids 2 y 7 tienen el
prefijo `-ALQUILADA-` en el `name` (`data.jsx:45` y `data.jsx:218`). El script las migra
tal cual, con `published = true`, porque hoy están visibles en el sitio y esta fase no
cambia qué se publica.

Cuando exista el panel, esto se maneja con el toggle de publicado en vez de con el
título — y probablemente convenga un estado "alquilada/vendida" propio, para poder
mostrarlas como referencia sin que aparezcan entre las disponibles. **No es una decisión
de la Fase 2**, pero conviene tenerlo en el radar para la Fase 6.

**El typecheck estático de los `.ts` no corre.** `typescript` no está instalado como
dependencia del proyecto, así que ni `astro build` ni `tsc` verifican `src/lib/*.ts`
(además, todavía no los importa ninguna página, así que ni siquiera se bundlean). Lo que
sí está verificado es que **se ejecutan**: el round-trip de este informe importa
`mapProperty.ts` de verdad y lo corre sobre las 19 propiedades. Si querés typecheck real
antes de la Fase 3, hay que agregar `typescript` y `@astrojs/check` y correr
`astro check`.

---

## 7. Conclusión

El adaptador está listo. De 23 campos × 19 propiedades, **36 celdas difieren y 8 se
ven**, todas por reglas que el plan ya había decidido a propósito (§1.2, §2.3, §5.3,
§5.4). Ninguna diferencia es un error de mapeo.

Las tres trampas de la Fase 0 —`price` nunca en `0`, `tipo` devolviendo `legacy_label`, e
`images` como array plano ordenado con imagen primero— salieron limpias en las 19
propiedades.

Mi recomendación es **migrar y aceptar las 8 diferencias visibles**, y arreglar la
presentación de la superficie en la Fase 3.5, que es donde está agendada. Adelantarla
mezclaría dos fases y le quitaría a la Fase 3 la propiedad que la hace segura: ser un
cambio de fuente de datos y nada más.
