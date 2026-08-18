/**
 * Datos de contacto del sitio (Fase 6.6).
 *
 * El teléfono, el horario y la matrícula estaban escritos a mano en cuatro
 * lugares del código, así que la dueña no podía cambiar su propio teléfono sin
 * un desarrollador. Ahora salen de la tabla `site_settings`, que ella edita
 * desde Catálogos.
 *
 * >>> ESTE ARCHIVO NO PUEDE IMPORTAR NADA DE SERVIDOR. <<<
 *
 * Lo importa `ProductDetailsReact.jsx`, que es un componente de cliente. La
 * primera versión traía acá `getConfiguracionSitio()`, que usa
 * `supabase-server`, y eso arrastró el módulo de servidor al bundle del
 * browser: `debug-env.ts` lee `process.env`, que no existe ahí, y la ficha
 * entera dejaba de hidratarse. La lectura contra la base vive en
 * `configuracion-sitio-server.ts`.
 *
 * >>> El fallback NO es opcional. <<<
 *
 * Si Supabase no responde, la ficha tiene que seguir mostrando un teléfono: una
 * inmobiliaria sin forma de contacto es peor que una sin fotos. Por eso hay
 * constantes con los valores actuales y `getConfiguracionSitio()` nunca tira ni
 * devuelve vacío.
 */

export type ConfiguracionSitio = {
  telefono: string;
  horario: string;
  matricula: string;
  email: string;
};

/**
 * Lo que hoy está hardcodeado en el código. Es el piso, no un dato inventado:
 * son exactamente los valores que ya se muestran en producción.
 */
export const CONFIGURACION_POR_DEFECTO: ConfiguracionSitio = {
  telefono: '3884881245',
  horario: 'de 9 a 13 y de 16 a 18 hs',
  matricula: 'MP 177',
  email: '',
};

/**
 * La línea de contacto, armada una sola vez.
 *
 * La usan la ficha (bloque visible) y el texto de compartir, para que digan
 * exactamente lo mismo. Antes el texto de compartir tenía su propia copia
 * hardcodeada y la 18 además lo repetía desde su descripción.
 */
export function lineaDeContacto(c: ConfiguracionSitio): string {
  const partes = [`Para más información comunicarse al ${c.telefono}`];
  if (c.horario) partes.push(c.horario);
  return partes.join(' ') + '.';
}

export function lineaDeMatricula(c: ConfiguracionSitio): string {
  return c.matricula ? `Martillera Sonia Flores ${c.matricula}.` : 'Martillera Sonia Flores.';
}
