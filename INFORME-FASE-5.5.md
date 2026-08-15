# INFORME FASE 5.5 — Dark mode del panel

> **Rama**: `fase-5.5/dark-mode-panel`. **No mergeada a main.**
>
> Solo el panel. `global.css` y el sitio público no se tocan.

---

## 1. Cómo funciona

| Pieza | Dónde |
|---|---|
| Lógica del tema | `src/lib/tema-panel.ts` |
| Script anti-flash | inline en el `<head>` de `AdminLayout.astro` |
| Toggle | en el pie de la barra lateral (`AdminShell.tsx`) |
| Variables | el bloque `.dark` de `admin.css`, ajustado |

El tema se aplica con la clase `dark` en el `<html>`, que activa el bloque `.dark` y la
variante `@custom-variant dark (&:is(.dark *))` que shadcn ya había generado.

### Independiente del sitio público

La clave de `localStorage` es **`panel-tema`**. El día que el sitio público tenga tema, va
a usar otra clave y ninguno va a pisar al otro: la dueña puede tener el panel en oscuro
para trabajar y el sitio en claro para los clientes, que es justo lo que pediste.

### Valor inicial y persistencia

Sin elección guardada, sigue `prefers-color-scheme`. Verificado en vivo: mi sistema está
en oscuro y el panel arrancó en oscuro **sin haber tocado nada**. Al elegir "Tema claro",
la elección se guarda y **gana sobre el sistema** en las cargas siguientes:

```
guardado       : "claro"
prefiereOscuro : true          <- el sistema pide oscuro
claseDark      : false         <- pero manda lo que eligió
```

### Sin flash

El script va **inline y sin `defer`**, y el orden real del `<head>` en la página servida lo
confirma:

```
meta, meta, link[icon], title, meta, script-inline  <- el tema
                                     style          <- recién acá el CSS
                                     script[src] …
```

Corre antes de que el navegador parsee la hoja de estilos, así que la clase ya está puesta
en el primer pintado. También setea `color-scheme`, para que los controles nativos
—scrollbars, autocompletado— salgan oscuros desde el arranque y no en blanco.

Va envuelto en `try/catch`: `localStorage` tira en modo incógnito con cookies bloqueadas, y
un throw ahí dejaría el panel en blanco.

### El toggle

Un botón que alterna claro ↔ oscuro. **No hay una tercera opción "seguir al sistema"**, a
propósito: el sistema ya es el valor inicial, y para una persona no técnica tres estados
donde dos se ven igual es más confuso que útil. El ícono muestra a dónde va, no dónde está
(en claro se ve la luna).

---

## 2. Contraste: lo medí, no lo estimé

Escribí `scripts/auditar-contraste.mjs`, que **parsea `admin.css`**, convierte los OKLCH a
sRGB y calcula los ratios WCAG reales. Se corre con `npm run contraste`.

### Lo que encontró en la primera pasada

| Problema | Ratio | Mínimo |
|---|---|---|
| Texto del botón principal (claro) | **4.23:1** | 4.5 |
| Borde de los campos (claro) | **1.26:1** | 3.0 |
| Borde de los campos (oscuro) | **1.91:1** | 3.0 |
| Texto secundario s/ tarjeta (oscuro) | 4.19:1 | 4.5 |
| Error del Alert s/ tarjeta (oscuro) | 4.31:1 | 4.5 |

### Qué cambié y por qué

**El rojo del botón, de `#d64531` a L=0.57 (`#ce3d29`).** El rojo exacto del sitio con
texto claro encima da 4.23:1, abajo del mínimo. Calculé el primer valor que pasa: L=0.57 →
**4.68:1**. La diferencia no se percibe al lado del rojo del sitio y el botón principal
pasa a ser legible.

> Es una desviación de "usar la paleta del sitio" que vale la pena marcar: elegí legibilidad
> sobre exactitud de marca, en 2.4 centésimas de luminosidad. Si preferís el hex exacto,
> se revierte cambiando una línea, sabiendo que el botón queda en 4.23:1.

**El borde de los campos, separado del borde decorativo.** Acá estuve por corregir de más:
WCAG 1.4.11 pide 3:1 para lo que **identifica un control**, no para adornos. Así que:

- `--border` (tarjetas, separadores) queda claro como viene de shadcn. **Exento.**
- `--input` sube a L=0.66 en claro (3.11:1) y a 34% de alfa en oscuro (3.02:1). Acá sí
  aplica: en tema claro el campo es transparente, así que **el borde es lo único que dice
  dónde escribir**.

Forzar los bordes decorativos a 3:1 habría dejado el panel con aspecto de wireframe sin
ganar accesibilidad real.

**`--muted-foreground` y `--destructive` en oscuro**, subidos hasta pasar 4.5:1 sobre
`--card`, que es el fondo que usa la variante destructive del `Alert`.

### Resultado final

```
=== TEMA CLARO ===                        === TEMA OSCURO ===
OK texto principal        19.79:1         OK texto principal        18.96:1
OK texto secundario        4.73:1         OK texto secundario        9.51:1
OK texto en boton primario 4.68:1         OK texto en boton primario 6.89:1
OK error (Alert)           4.76:1         OK error (Alert)           7.38:1
OK borde de input          3.11:1         OK borde de input          3.02:1
OK anillo de foco          4.88:1         OK anillo de foco          6.89:1
OK texto barra lateral    16.82:1         OK texto barra lateral    17.85:1
```

**Los deshabilitados** los informa sin contarlos como fallo: WCAG 1.4.3 exime
explícitamente los controles inactivos. Igual quedan los números, porque si están muy bajos
la dueña no distingue un campo deshabilitado de uno vacío:

| | claro | oscuro |
|---|---|---|
| Campo deshabilitado (50%) | 1.96:1 | 3.09:1 |

En claro es bajo. Viene de `disabled:opacity-50`, que es una clase del componente de
shadcn, no de nuestras variables. **Visualmente se distingue igual**, porque el campo
deshabilitado además se pinta de gris (`disabled:bg-input/50`) — se ve en la captura de
prueba. Lo dejo anotado por si querés subirlo cuando haya formularios de verdad en la
Fase 6.

---

## 3. Un defecto que ninguna auditoría de contraste podía encontrar

**El logo desaparecía en tema oscuro.** `SoniaLogo.png` tiene el texto "SONIA FLORES
INMOBILIARIA" en negro; sobre el fondo casi negro del panel quedaba solo el trazo rojo
flotando.

No lo detecta la auditoría porque es una imagen, no una variable CSS. Salió de mirar la
captura.

Descarté invertirlo con un filtro: eso volvería **cian** el rojo de la marca. La solución
es una base blanca redondeada detrás del logo, **solo en oscuro** (`dark:bg-white`), así
conserva sus colores reales. Aplicado en los dos lugares donde aparece: la cabecera de la
barra lateral y el login.

---

## 4. El sitio público sigue aislado

```
global.css   1025f61227d8452a59d6f84320062a40   (igual que antes de la Fase 4)
```

Y sobre el CSS emitido en el build, el bundle público no contiene `Geist`,
`sidebar-primary` ni `panel-tema`. El script del tema vive en `AdminLayout`, que las
páginas públicas no usan.

---

## 5. Qué verificar en el preview

1. **Entrar de noche con el celular en modo oscuro**: el panel tiene que arrancar oscuro
   solo, sin destello blanco.
2. Tocar el toggle, recargar, y confirmar que se acordó.
3. En oscuro, mirar el logo de la barra lateral y del login: tiene que leerse.
4. Que el sitio público (`/`, `/busqueda`) **no cambie** aunque el panel esté en oscuro.
5. En la Fase 6, cuando haya formularios reales, revisar los campos deshabilitados en tema
   claro — es el único número que quedó flojo.

`npm run contraste` vuelve a correr la auditoría si alguien toca las variables.
