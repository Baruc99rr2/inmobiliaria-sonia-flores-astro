# INFORME FASE 5 — Shell del panel

> **Rama**: `fase-5/shell-admin`. **No mergeada a main.**
>
> Solo el esqueleto: sidebar, navegación y paleta. Sin listados ni formularios — eso es la
> Fase 6.

---

## 1. Qué trajo `sidebar-07` y qué se borró

`npx shadcn@latest add sidebar-07` creó 14 archivos. **Cinco eran composiciones llenas de
datos de ejemplo** y se borraron enteras:

| Archivo | Qué tenía |
|---|---|
| `app-sidebar.tsx` | "Acme Inc", "Acme Corp.", "Evil Corp.", un usuario "shadcn", menú "Playground" |
| `team-switcher.tsx` | Selector de equipos con planes "Enterprise" / "Startup" / "Free" |
| `nav-main.tsx` | Menú de demo con submenús |
| `nav-projects.tsx` | Sección "Projects" con Design Engineering, Sales & Marketing… |
| `nav-user.tsx` | Menú de usuario con "Upgrade to Pro", notificaciones, facturación |

En su lugar escribí `AdminShell.tsx` a mano sobre los primitivos de `ui/sidebar`. Es más
corto que adaptar los cinco archivos y no deja restos.

**También borré cuatro primitivos que no usa nadie**: `avatar`, `breadcrumb`,
`collapsible` y `dropdown-menu`. Se agregan de nuevo con un comando el día que hagan
falta; dejarlos era arrancar la Fase 5 con código muerto, justo lo que costó la Fase 0.

Quedan los que `ui/sidebar` necesita de verdad: `button`, `input`, `separator`, `sheet`,
`skeleton`, `tooltip`, más `alert`, `card` y `label` del login.

---

## 2. Navegación

Exactamente lo pedido, sin nada más:

| Ítem | Va a |
|---|---|
| Propiedades | `/admin` |
| Catálogos | `/admin/catalogos` |
| Cerrar sesión | cierra sesión y va al login |

**Creé `/admin/catalogos` aunque esté vacía.** El menú la nombra, y un ítem que lleva a un
404 es peor que no tenerlo. Dice qué va a haber ahí y que por ahora esos datos se cargan
directamente en la base.

No hay ítems para secciones que todavía no existen. Se agregan a medida que se construyen.

---

## 3. Paleta

Tomada del sitio público, no inventada:

| Color | De dónde salió | Dónde se usa en el panel |
|---|---|---|
| `#d64531` | El rojo del navbar, del botón "Enviar mensaje" y de los títulos de Servicios | `--primary`, `--ring`, `--sidebar-primary` |
| `#eeecec` | El fondo del sitio (`body` en `global.css`) | `--sidebar` |

Convertidos a OKLCH para no mezclar formatos con el resto del archivo, que es lo que
genera shadcn:

```css
--primary: oklch(0.5939 0.1849 30.92);  /* #d64531 */
--sidebar: oklch(0.9446 0.0022 17.20);  /* #eeecec */
```

Solo se pisan las variables de marca. La escala de grises queda como viene: es neutra y
funciona bien para un panel de carga de datos.

---

## 4. Español: dos textos que se filtraban

Los primitivos generados traen etiquetas de accesibilidad en inglés. No se ven en
pantalla, pero **sí las lee un lector de pantalla** y aparecen en el `title` al pasar el
mouse:

| Archivo | Antes | Ahora |
|---|---|---|
| `ui/sidebar.tsx` (×3: `sr-only`, `aria-label`, `title`) | `Toggle Sidebar` | `Abrir o cerrar el menú` |
| `ui/sheet.tsx` (`sr-only`) | `Close` | `Cerrar` |

Verificado después del cambio: el único texto de interfaz que queda en el DOM del panel es
`"Abrir o cerrar el menú"`, y está en español.

---

## 5. Responsive: la verificación en 375px

### El problema para verificarlo

Dos obstáculos, y conviene que queden anotados porque van a reaparecer:

1. **`resize_window` no funciona en este entorno.** Reporta éxito, pero
   `window.innerWidth` se queda en 1536 y `matchMedia('(max-width: 767px)')` sigue dando
   `false`. Achicar la ventana **no** habría probado nada.
2. **El shell vive detrás del guard**, y no tengo credenciales para entrar.

### Cómo lo resolví

Dos páginas temporales, **ya borradas**: una que renderiza `AdminShell` sin el guard, y un
banco de pruebas con dos `<iframe>` de 375 y 768 px. El iframe da un **viewport real**, así
que las media queries resuelven como en un celular. Confirmado desde el DOM:

```
viewportDelIframe : 375
matchesMobile     : true      <- la rama mobile del sidebar está activa
drawerAbierto     : true
itemsVisibles     : Propiedades, Catálogos, Cerrar sesión
```

Ninguna de las dos páginas quedó en el repo, y `grep -rn "zz-preview" src/` no devuelve
nada.

### Resultado

| Ancho | Comportamiento |
|---|---|
| **375 px** | Sidebar oculto. Barra superior con el botón de menú y el título. Contenido a ancho completo, sin scroll horizontal |
| **375 px, menú abierto** | Drawer a pantalla completa con logo, "Gestión", los dos ítems y "Cerrar sesión". Fondo atenuado |
| **768 px** | Sidebar fijo a la izquierda con el gris de la marca |

El botón de menú está arriba a la izquierda, al alcance del pulgar. Los ítems del drawer
tienen alto de toque cómodo.

> **Lo que NO pude probar**: el shell con una sesión real. Verifiqué el layout, no el
> recorrido completo. Cuando entres desde el celular, mirá sobre todo que el drawer se
> cierre al tocar un ítem y que "Cerrar sesión" funcione con el dedo.

---

## 6. `global.css` sigue intacto

Es el riesgo que detectamos en la Fase 4, así que lo verifiqué en cada paso:

```
1025f61227d8452a59d6f84320062a40   antes de la Fase 4
1025f61227d8452a59d6f84320062a40   después de shadcn init
1025f61227d8452a59d6f84320062a40   después de add sidebar-07   <- este informe
1025f61227d8452a59d6f84320062a40   después del build final
```

`admin.css` tampoco fue tocado por el `add`: los cambios de paleta los hice yo a mano.

**El cambio de alias de la Fase 4 es lo que hizo esto automático.** Con
`"ui": "@/components/admin/ui"`, los 14 archivos del block cayeron solos bajo
`src/components/admin/` sin que yo tuviera que mover nada.

Sobre el build final, las rutas cargan bundles separados:

```
/                  public, s-maxage=60...  | 404.B_OVat1v.css + index.D4XAXHl2.css
/busqueda          public, s-maxage=60...  | 404.B_OVat1v.css
/admin             private, no-store       | AdminLayout.BchsK185.css
/admin/login       private, no-store       | AdminLayout.BchsK185.css
/admin/catalogos   private, no-store       | AdminLayout.BchsK185.css
```

Ninguna página pública carga el CSS del admin ni al revés.

---

## 7. Un detalle de Base UI que cuesta caro descubrir

`SidebarMenuButton` **no acepta `asChild`**. Eso es convención de Radix; con Base UI —la
librería que elegimos en la Fase 4— la prop es `render`:

```tsx
// NO funciona con Base UI
<SidebarMenuButton asChild><a href="/admin">…</a></SidebarMenuButton>

// Sí
<SidebarMenuButton render={<a href="/admin" />}>…</SidebarMenuButton>
```

Lo atrapó `astro check`, que ya corre en el build desde la Fase 3.9. Sin ese gate habría
llegado al preview como un botón que no navega.

Vale la pena tenerlo presente para la Fase 6: **la mayoría de los ejemplos de shadcn que
hay dando vueltas usan `asChild`** y no van a compilar tal cual.

---

## 8. Qué verificar en el preview

1. **Desde el celular**, que es lo que importa: entrar, abrir el menú, cambiar entre
   Propiedades y Catálogos, cerrar sesión.
2. Que el rojo del panel sea el mismo que el del sitio.
3. Que `/` y `/busqueda` sigan en Roboto y con el fondo gris de siempre.
4. Que `/admin/catalogos` cargue y no dé 404.

Build verde con `astro check` en 0 errores.
