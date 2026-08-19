# Proyecto: Sitio de Inmobiliaria (Sonia Flores)

Sitio en Astro para una inmobiliaria de San Salvador de Jujuy. Actualmente es puro
frontend: las propiedades están hardcodeadas en `src/data.jsx`. Se está agregando un
panel de administración con Supabase para que la dueña cargue y edite propiedades
sin tocar código.

## PLAN DE TRABAJO — LEER SIEMPRE

**El plan completo está en `PLAN-ADMIN-v5.md` (raíz del repo). Leelo entero antes de
empezar cualquier tarea relacionada con el panel, la base de datos o la migración
de datos.** Reemplaza y anula las versiones v1 a v4.

El trabajo está dividido en fases (0, 0.5, 0.6, 1, 2, 3, 3.9, 3.5, 4, 5, 6, 6.5, 7, 8,
8.5, 9).

**Estado: Fases 0, 0.5, 0.6, 1, 2, 3, 3.9 y 3.5 completadas y mergeadas a `main`.**
**Siguiente: Fase 4 — auth (alias `@/*` + `shadcn init` + login).** Ver el bloque de
arranque en la §0 del plan.

Lectura complementaria obligatoria antes de tocar lo suyo: `INFORME-FASE-0.md`
(inventario y clasificación MUERTO/ZOMBIE/VIVO), `INFORME-FASE-2.md` (diferencias entre
`data.jsx` y el adaptador), `INFORME-FASE-3.md` (sitio leyendo de la DB, filtro por slug,
404, fallback) e `INFORME-FASE-3.5.md` (tri-estado, `hide_location`, íconos).

El sitio público **ya lee de Supabase**; `data.jsx` sigue vivo solo como fallback hasta la
Fase 9. Para saber de dónde salieron los datos de una respuesta:
`curl -sI <url> | grep -i x-datos-origen` → `supabase` o `fallback-data-jsx`. El
`Cache-Control` **no** sirve para eso: Vercel le saca `s-maxage` antes de mandarlo al
browser.

**Regla de oro: una fase por vez.** Al terminar una fase, parás y entregás un informe.
No arrancás la siguiente sin OK explícito del dev. No encadenes fases aunque la
siguiente parezca obvia o trivial.

## Reglas duras

1. **Código residual**: este sitio empezó siendo un ecommerce. La auditoría de la
   Fase 0 y la limpieza de la Fase 0.5 ya se hicieron: ver la tabla MUERTO/ZOMBIE/VIVO
   del informe. Quedan dos borrados deliberadamente pospuestos: `ShopContext.jsx` +
   `AppWrapper.jsx` (Fase 9, requiere protocolo de dos pasos porque `AppWrapper` está
   importado con `client:load` desde `/` y `/busqueda`) y la limpieza de `public/`
   (tarea aparte, después de la Fase 7). **Ante la duda, no borrar.**
2. **No refactorizar el frontend público.** Existe una capa adaptadora
   (`mapDbToProduct`) justamente para no tocar los componentes existentes. El patrón
   aprobado para pasarles datos es prop opcional con fallback, no reescritura:
   `const products = productsProp ?? productsData;`
3. **shadcn/ui confinado a `src/pages/admin/**`.**
4. **Un campo vacío puede ser una decisión comercial, no un error.** La dueña deja
   datos vacíos a propósito. No completes ni "arregles" datos por iniciativa propia,
   y no agregues validaciones de campo obligatorio más allá de título y operación.
   Ver sección 2.3 del plan.
5. **`NULL` nunca llega crudo a la vista pública.** Siempre se muestra "A consultar".
   Nunca "null", "0" suelto, "undefined" ni una fila vacía.
6. **`hide_location` oculta barrio y calle en el texto, NO el mapa.** No implementes
   difuminado ni desplazamiento de coordenadas: es una decisión deliberada de la dueña.
7. **Sin datos de prueba inventados** en la base de producción.
8. **Toda la UI en español rioplatense**, pensada para una persona no técnica:
   "Guardar", no "Submit".
9. **`price` nunca se mapea a `0`.** Cuatro de los seis formateadores del sitio deciden
   con `!isNaN(price)` e imprimirían `$0` en lugar de "A consultar". `NULL` va a `null`
   o a `'A consultar'`.
10. **`detalles.tipo` devuelve `legacy_label`**, no el label de presentación. El filtro
    de tipo compara por igualdad estricta (`Busqueda.jsx:96`) contra `'Local'`,
    `'Galpon'` y `'Nave'`; devolver `'Local Comercial'` lo rompe.
11. Si algo del plan no encaja con la realidad del código, **decilo y proponé
    alternativa**, no lo fuerces.

## Versiones — verificar antes de configurar

Este proyecto usa Astro 7, React 19 y Tailwind 4. Varias de estas APIs cambiaron
recientemente. **Consultá la documentación oficial antes de escribir configuración**,
no asumas sintaxis de memoria. En particular:

- El modo `hybrid` de Astro **ya no existe**: se usa `output: 'static'` + adapter +
  `export const prerender = false` por página. `astro.config.mjs` ya está en ese
  estado, no hay que tocarlo.
- La forma de importar y configurar `@astrojs/vercel`.
- El setup de shadcn/ui con Tailwind v4 (no hay `tailwind.config.js` clásico).
- El alias `@/*` **no existe todavía** en `tsconfig.json`; lo agrega la Fase 4.

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** llega al browser, nunca lleva prefijo
  `PUBLIC_`, nunca se importa en un `.astro` sin `prerender = false`.
- La tabla `property_notes` es privada: no debe aparecer en ninguna consulta del
  sitio público.
- Lo que protege los datos es RLS, no el guard del router.


## MANTENIMIENTO RECURRENTE — respaldo de la base

**El plan gratuito de Supabase NO tiene backups automáticos.** El único respaldo
real es el que se hace a mano:

```
node --env-file=.env scripts/respaldo-base.mjs
```

Deja un JSON por tabla en `respaldos/AAAA-MM-DD-HHmm/` (ignorada por git: son
datos de personas reales).

**Cada cuánto:** después de cargar propiedades nuevas, y como piso una vez por
mes. Cuanto más use la dueña el panel, más caro sale perder lo que no está
respaldado. Conviene guardar una copia fuera de la máquina del dev.

**Para restaurar tras una pérdida real:**

```
node --env-file=.env scripts/restaurar-desde-respaldo.mjs respaldos/<carpeta>            # en seco
node --env-file=.env scripts/restaurar-desde-respaldo.mjs respaldos/<carpeta> --aplicar
```

**Nunca** se restaura desde `data.jsx`: es la foto congelada de las 20
originales y pisa todo lo cargado desde el panel. `scripts/migrate-data.mjs` ya
no puede correrse en modo escritura por ese motivo.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and
`astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
