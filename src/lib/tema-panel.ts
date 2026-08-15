/**
 * Tema del PANEL (Fase 5.5).
 *
 * >>> Es independiente del tema que a futuro tenga el sitio público. <<<
 *
 * Son dos preferencias distintas: la dueña puede querer el panel en oscuro para
 * trabajar y el sitio en claro para los clientes. Por eso la clave de
 * localStorage lleva el prefijo `panel` — el día que el sitio público tenga
 * tema, va a usar otra clave y ninguno va a pisar al otro.
 *
 * El tema se aplica poniendo o sacando la clase `dark` en el <html>. Eso activa
 * el bloque `.dark` de `admin.css` (que shadcn ya generó) y la variante
 * `@custom-variant dark (&:is(.dark *))`.
 *
 * `global.css` no tiene nada de esto: el sitio público no cambia.
 */

export const CLAVE_TEMA = 'panel-tema';

export type Tema = 'claro' | 'oscuro';

/** Lo que prefiere el sistema operativo. Es el valor inicial si no eligió nada. */
export function temaDelSistema(): Tema {
  if (typeof window === 'undefined' || !window.matchMedia) return 'claro';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

/** El tema guardado, o el del sistema si todavía no eligió. */
export function temaActual(): Tema {
  if (typeof window === 'undefined') return 'claro';
  const guardado = window.localStorage.getItem(CLAVE_TEMA);
  return guardado === 'oscuro' || guardado === 'claro' ? guardado : temaDelSistema();
}

export function aplicarTema(tema: Tema) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', tema === 'oscuro');
  document.documentElement.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
}

export function guardarTema(tema: Tema) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLAVE_TEMA, tema);
  aplicarTema(tema);
}

/**
 * Script que corre ANTES del primer pintado, inline en el <head>.
 *
 * Sin esto hay un destello blanco al cargar con el tema oscuro elegido: el
 * navegador pinta el fondo claro por defecto y recién después React monta y
 * agrega la clase. Tiene que ser inline y sin `defer`/`async`, porque cualquier
 * script externo llega tarde.
 *
 * `color-scheme` se setea acá también para que los controles nativos del
 * navegador (scrollbars, autocompletado, el selector de fecha) salgan oscuros
 * desde el arranque y no en blanco.
 *
 * Va envuelto en try/catch porque `localStorage` tira en modo incógnito con
 * cookies bloqueadas, y un throw acá dejaría la página en blanco.
 */
export const SCRIPT_ANTI_FLASH = `
(function () {
  try {
    var guardado = localStorage.getItem('${CLAVE_TEMA}');
    var oscuro = guardado === 'oscuro' ||
      (guardado !== 'claro' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (oscuro) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
  } catch (e) {}
})();
`.trim();
