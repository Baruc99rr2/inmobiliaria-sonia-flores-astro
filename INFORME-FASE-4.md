# INFORME FASE 4 — Auth

> **Rama**: `fase-4/auth`. **No mergeada a main.**
>
> Tres pasos: alias `@/*`, `shadcn init`, `/admin/login` + guard.
>
> **Sin ícono de acceso en el footer**, como pediste. A `/admin` se llega solo escribiendo
> la URL.

---

## 1. El problema grande: `shadcn init` reescribió el CSS del sitio público

Esto es lo más importante del informe.

`npx shadcn@latest init` detectó Astro y Tailwind v4 correctamente, pero escribió toda su
configuración dentro de **`src/styles/global.css`**, que es la hoja del **sitio público**.
Tres cosas concretas que rompía:

| Qué agregó | Qué rompía |
|---|---|
| `@theme inline { --font-sans: 'Geist Variable', sans-serif; }` | El `<body>` público usa la utilidad `font-sans` (`Layout.astro:65`). **Todo el sitio pasaba de Roboto a Geist** |
| `@layer base { body { @apply bg-background text-foreground; } }` | Pisaba el fondo y el color de texto del sitio |
| `@layer base { * { @apply border-border outline-ring/50; } }` | Cambiaba el color de borde de todo elemento con `border-t` / `border-b` sin color propio — por ejemplo el separador de filtros avanzados en `SearchFilters.jsx` |
| `@import "@fontsource-variable/geist"` | Cargaba una fuente nueva en **todas** las páginas públicas |

Es exactamente lo que la regla 2 del plan prohíbe (*"no refactorizar el frontend
público"*) y lo que la regla 3 quiere evitar con *"shadcn confinado a
`src/pages/admin/**`"*.

### La solución: dos hojas de estilo separadas

1. `src/styles/global.css` **restaurada byte por byte** a como estaba antes del init.
2. Todo lo de shadcn movido a `src/styles/admin.css`, que **solo importa
   `AdminLayout.astro`**.
3. `components.json` apunta su `tailwind.css` a `admin.css`, así que los componentes que
   se agreguen más adelante con `shadcn add` siguen escribiendo ahí y no en la hoja
   pública.

También cambié los alias de `components.json` para que el confinamiento sea
**estructural y no una cuestión de disciplina**:

```json
"components": "@/components/admin",
"ui": "@/components/admin/ui"
```

Todo lo que genere shadcn cae bajo `src/components/admin/`. Es imposible que un
componente público lo importe por accidente sin que se note en el import.

### Verificación de que el sitio público quedó intacto

`global.css` tiene el mismo hash que antes de correr el init:

```
1025f61227d8452a59d6f84320062a40   antes
1025f61227d8452a59d6f84320062a40   después
```

Y sobre el CSS **emitido en el build**, que es la prueba que de verdad importa:

| | CSS público | CSS del admin |
|---|---|---|
| `Geist Variable` | ausente ✅ | presente ✅ |
| `background-color:var(--background)` | ausente ✅ | presente ✅ |
| `border-color:var(--border)` | ausente ✅ | presente ✅ |
| `--font-sans` | `"Roboto", sans-serif` ✅ | Geist |
| `#eeecec` (fondo del sitio) | presente ✅ | — |

Las páginas cargan bundles distintos: `/` y `/busqueda` cargan `404.*.css` (66 KB, de
`global.css`), `/admin` y `/admin/login` cargan `AdminLayout.*.css` (78 KB, de
`admin.css`). Ninguna página carga las dos. Confirmado además visualmente: `/busqueda` se
ve idéntica.

---

## 2. Decisiones del `init` que conviene registrar

El comando es interactivo y hace dos preguntas que no están en la documentación. Las
resolví así:

| Pregunta | Elegí | Por qué |
|---|---|---|
| Component library | **Base UI** (`-b base`) | Es la que el CLI marca como *Recommended*. Ir contra el default del tool sin un motivo concreto es justamente asumir de memoria |
| Preset | **Nova** (`-p nova`) | Usa **Lucide**, que ya está instalado en el proyecto (`lucide-react`, lo usa `Carrusel.jsx`) |

Comando reproducible, por si hay que rehacerlo:

```bash
npx shadcn@latest init -y -b base -p nova
```

> ⚠️ El flag `--defaults` documenta `--preset=base-nova`, pero ese valor **no existe**: el
> CLI responde *"Invalid preset: base-nova. Available presets: nova, vega, maia, lyra,
> mira, luma, sera, rhea"*. El valor correcto es `nova`.

`init` instaló `@base-ui/react`, `@fontsource-variable/geist`,
`class-variance-authority`, `shadcn` y `tw-animate-css`. **No instaló `clsx` ni
`tailwind-merge`**, porque ya estaban: es exactamente para lo que las preservamos en la
Fase 0.5, y `src/lib/utils.ts` las usa en el helper `cn()`.

Componentes agregados: `button`, `input`, `label`, `card`, `alert`.

---

## 3. Login

`/admin/login` → `LoginForm.tsx`.

- Email + contraseña contra Supabase Auth (`signInWithPassword`).
- **Sin link de "crear cuenta", "registrarse" ni "olvidé mi contraseña".** El registro
  público está desactivado en Supabase, así que ofrecerlo sería prometer algo imposible.
  En su lugar hay un texto fijo: *"El acceso es solo para las cuentas autorizadas. Si no
  podés entrar o necesitás cambiar la contraseña, escribile al desarrollador."*
- **Errores traducidos.** Nunca se muestra el mensaje original de Supabase:

| Mensaje de Supabase | Lo que ve la dueña |
|---|---|
| `Invalid login credentials` | El correo o la contraseña no son correctos. |
| `Email not confirmed` | La cuenta todavía no fue confirmada. Escribile al desarrollador. |
| `too many requests` / rate limit | Demasiados intentos seguidos. Esperá un minuto y probá de nuevo. |
| network / fetch failed | No pudimos conectarnos. Revisá tu conexión a internet. |
| `Invalid API key` | El sitio está mal configurado. Avisale al desarrollador. |
| cualquier otro | No pudimos iniciar sesión. Probá de nuevo en un momento. |

- Botón con estado de carga: `Entrar` → `Entrando…`, deshabilitado mientras vuela.
- Ante error se **limpia la contraseña y se conserva el correo**, para reintentar sin
  retipear todo.
- Si ya hay sesión de un admin, redirige a `/admin` sin mostrar el formulario.

### Entrar no alcanza: hay que estar en `admins`

`iniciarSesion()` hace el login y **después** verifica la pertenencia a `admins`. Si el
usuario existe en Auth pero no es admin, **se le cierra la sesión enseguida** y se muestra
un mensaje claro. Sin eso, alguien podría quedar "logueado" en un panel que no puede usar,
viendo errores de permisos en cada pantalla.

---

## 4. Guard

`AdminGuard.tsx`, dentro de la misma isla que el contenido. Cuatro estados:

| Estado | Qué hace |
|---|---|
| verificando | "Verificando tu acceso…" |
| **sin cliente** | Explica que falta la configuración. **No redirige** |
| sin sesión | `replace('/admin/login')` |
| **con sesión pero fuera de `admins`** | **No redirige**: explica el problema con el email a la vista y ofrece "Cerrar sesión" |

Los dos casos que no redirigen son deliberados:

- **Fuera de `admins`**: mandar al login con la sesión abierta produce un **rebote
  infinito**, porque el login ve la sesión y devuelve a `/admin`.
- **Sin cliente**: sin credenciales no se puede ni preguntar por la sesión, así que
  redirigir dejaría al usuario rebotando entre las dos páginas.

### El caso `supabase === null`

Como pediste, está contemplado. `src/lib/supabase.ts` devuelve `null` si faltan las
credenciales (se cambió en la Fase 3 para que un error de configuración no tumbara el
sitio). Todas las funciones de `src/lib/auth.ts` lo chequean antes de usar el cliente, y
tanto el login como el guard muestran:

> El panel no está configurado: falta la conexión con la base de datos. Avisale al
> desarrollador (probablemente haya que redesplegar sin caché).

El paréntesis no es decorativo: **es el síntoma exacto de un build cacheado**. Las
variables `PUBLIC_*` se incrustan en tiempo de build, y en el browser no hay `process.env`
que las recupere.

---

## 5. Verificación

### Lo pedido

| Verificación | Resultado |
|---|---|
| Sin sesión, `/admin` redirige | ✅ redirige a `/admin/login` |
| Login correcto entra | ⚠️ **no lo pude probar** — ver abajo |
| `property_notes` sin sesión devuelve vacío | ✅ `permission denied for table property_notes` |
| `properties` sin sesión devuelve solo publicadas | ✅ 19 filas, **0 sin publicar** |

Corrido con la publishable key, sin sesión:

```
property_notes  SELECT  -> 0 filas | permission denied for table property_notes
property_notes  INSERT  -> rechazado
properties      SELECT  -> 19 filas, 0 no publicadas
properties      UPDATE  -> rechazado
admins          SELECT  -> 0 filas | permission denied for table admins
```

Vale la pena notar que `property_notes` y `admins` ni siquiera llegan a RLS: los frena el
`GRANT` de la Fase 1, que es una capa más arriba.

### Lo que NO pude probar, y por qué

**El login exitoso.** No tengo credenciales de una cuenta admin, y no debo pedírtelas ni
tipear contraseñas reales. Lo que sí verifiqué:

- El formulario renderiza y el flujo llega hasta Supabase.
- El camino de error funciona de punta a punta: con datos falsos
  (`cuenta-inexistente@ejemplo.invalid`) aparece **"El correo o la contraseña no son
  correctos."**, se limpia la contraseña y se conserva el correo.
- La consulta de `esAdmin()` va a funcionar: revisé `scripts/fase1-grants.sql` y la línea
  62 tiene `grant select on table public.admins to authenticated`. **Sin ese grant nadie
  podría entrar**, porque `esAdmin()` daría siempre falso y el login rebotaría con
  "esta cuenta no tiene permiso".

**Te toca a vos**: entrar con tu cuenta y confirmar que llegás al panel. Si aparece
*"Esta cuenta no tiene permiso para entrar al panel"* con credenciales correctas, el
problema es la fila en `admins`, no el login.

---

## 6. Detalles de implementación que conviene saber

**La sesión vive en el cliente.** El guard es un componente React y no un chequeo en el
frontmatter de Astro, porque el servidor no ve la sesión. Es coherente con el plan: *"lo
que protege los datos es RLS, el guard del router es solo UX"*. Si más adelante hace falta
un guard del lado del servidor —por ejemplo para no mandar HTML del panel a un anónimo—,
habría que sumar `@supabase/ssr` y pasar la sesión por cookies. No hizo falta acá.

**Una sola isla por página.** El primer intento fue
`<AdminGuard client:only><PanelInicio client:only /></AdminGuard>`, y **no funciona**:
Astro no puede pasar hijos renderizados en el servidor como children de React a una isla
que solo existe en el cliente. El guard envuelve al contenido dentro del propio React.

**El panel no se cachea ni se indexa.** `Cache-Control: private, no-store` en las dos
páginas y `<meta name="robots" content="noindex, nofollow">` en `AdminLayout`.

**`AdminLayout` no reusa `Layout.astro`** a propósito: el panel no lleva el navbar ni el
footer del sitio, y sobre todo no comparte hoja de estilos.

---

## 7. Para el deploy

Como anotaste: **redeploy sin caché**. Destildá *Use existing Build Cache*.

Es más importante en esta fase que en las anteriores. En el servidor, un build sin claves
se recupera con `process.env`; **en el browser no hay red de contención**. Si el bundle se
compiló sin `PUBLIC_SUPABASE_ANON_KEY`, `supabase.ts` queda en `null` y el login no
funciona. La pantalla lo dice con todas las letras en vez de fallar de forma confusa, pero
igual no se puede entrar.

Qué mirar en el preview:

1. `/admin` sin sesión → redirige a `/admin/login`.
2. Entrar con tu cuenta → llegás al panel con tu email arriba y el botón de cerrar sesión.
3. `/` y `/busqueda` → **en Roboto**, con el fondo gris de siempre. Si ves otra tipografía,
   se filtró el CSS del admin.
4. `/admin` no debería aparecer en Google. La ruta ya va con `noindex`, y no hay ningún
   link hacia ella en el sitio.
