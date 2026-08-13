# Proyecto: Sitio de Inmobiliaria (Sonia Flores)

Sitio en Astro para una inmobiliaria de San Salvador de Jujuy. Actualmente es puro
frontend: las propiedades están hardcodeadas en `src/data.jsx`. Se está agregando un
panel de administración con Supabase para que la dueña cargue y edite propiedades
sin tocar código.

## PLAN DE TRABAJO — LEER SIEMPRE

**El plan completo está en `PLAN-ADMIN-v4.md` (raíz del repo). Leelo entero antes de
empezar cualquier tarea relacionada con el panel, la base de datos o la migración
de datos.**

El trabajo está dividido en fases (0, 0.5, 1, 2, 3, 3.5, 4, 5, 6, 7, 8, 9).

**Regla de oro: una fase por vez.** Al terminar una fase, parás y entregás un informe.
No arrancás la siguiente sin OK explícito del dev. No encadenes fases aunque la
siguiente parezca obvia o trivial.

## Reglas duras

1. **Código residual**: este sitio empezó siendo un ecommerce y quedaron scripts que
   no se renderizan pero están importados en algún lado. **No borres nada sin haber
   completado la auditoría de la Fase 0.** Ante la duda, no borrar.
2. **No refactorizar el frontend público.** Existe una capa adaptadora
   (`mapDbToProduct`) justamente para no tocar los componentes existentes.
3. **shadcn/ui solo en `src/pages/admin/**`. antd solo en el sitio público.**
   Nunca mezclados en un mismo componente.
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
9. Si algo del plan no encaja con la realidad del código, **decilo y proponé
   alternativa**, no lo fuerces.

## Versiones — verificar antes de configurar

Este proyecto usa Astro 7, React 19, Tailwind 4 y antd 6. Varias de estas APIs
cambiaron recientemente. **Consultá la documentación oficial antes de escribir
configuración**, no asumas sintaxis de memoria. En particular:

- El modo `hybrid` de Astro **ya no existe**: se usa `output: 'static'` + adapter +
  `export const prerender = false` por página.
- La forma de importar y configurar `@astrojs/vercel`.
- El setup de shadcn/ui con Tailwind v4 (no hay `tailwind.config.js` clásico).

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** llega al browser, nunca lleva prefijo
  `PUBLIC_`, nunca se importa en un `.astro` sin `prerender = false`.
- La tabla `property_notes` es privada: no debe aparecer en ninguna consulta del
  sitio público.
- Lo que protege los datos es RLS, no el guard del router.

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