/**
 * Diagnóstico de credenciales, permanente y detrás de una variable de debug.
 *
 * Nace de un incidente real de la Fase 3: la publishable key cargada en Vercel
 * tenía un carácter mal (`Ql` con ele minúscula en vez de `QI` con i mayúscula).
 * Supabase respondía "Invalid API key", el sitio caía al fallback de `data.jsx`
 * y **parecía andar**, así que costó tres redeploys darse cuenta de que el
 * problema era un carácter en la clave.
 *
 * En la Fase 4 el mismo error va a producir un fallo de login que tampoco se va
 * a parecer a "la clave está mal escrita". De ahí que esto quede permanente.
 *
 * Se activa con `DEBUG_SUPABASE=1`.
 *
 * A propósito **sin** prefijo `PUBLIC_`: así se lee de `process.env` en tiempo
 * de ejecución y alcanza con redeployar para prenderlo, sin recompilar. Y como
 * no viaja al browser, no se puede activar desde afuera.
 *
 * >>> Qué se loguea y qué NO <<<
 * Se loguea el largo de la clave y sus primeros y últimos 4 caracteres. Con eso
 * alcanza para detectar un carácter cambiado, un recorte o un espacio pegado, y
 * no alcanza para reconstruirla.
 *
 * Aun así, esto es SOLO para la publishable key, que es pública por diseño.
 * **Nunca pasar por acá la `SUPABASE_SERVICE_ROLE_KEY`**: esa saltea RLS, y
 * filtrar aunque sea una pista en los logs no vale la pena.
 */

const DEBUG = process.env.DEBUG_SUPABASE === '1';

/**
 * Huella FNV-1a de 32 bits, en hex.
 *
 * Hace falta porque el largo y los primeros/últimos caracteres NO alcanzan: el
 * typo real que motivó todo esto (`Ql` por `QI`) estaba en el medio de la clave,
 * así que la versión mala y la buena se veían idénticas —`sb_p...N--U`, 46
 * chars las dos—. La huella cambia entera ante un solo carácter distinto, y no
 * permite reconstruir el original.
 *
 * Para comparar: pegá la clave buena en cualquier calculadora de FNV-1a 32-bit,
 * o más simple, mirá si la huella cambia entre dos deploys.
 *
 * A propósito sin `node:crypto`: así el helper también sirve del lado del
 * browser, donde ese módulo no existe.
 */
function huella(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** `sb_p...N--U (46 chars, huella a3f19c02)`. Nunca devuelve la clave entera. */
function describirClave(valor: string | undefined | null): string {
  if (!valor) return 'AUSENTE';
  const limpio = String(valor);
  const conEspacios =
    limpio !== limpio.trim() ? ' [OJO: tiene espacios al principio o al final]' : '';
  if (limpio.length <= 8) {
    return `??? (${limpio.length} chars, sospechosamente corta)${conEspacios}`;
  }
  return `${limpio.slice(0, 4)}...${limpio.slice(-4)} (${limpio.length} chars, huella ${huella(limpio)})${conEspacios}`;
}

/**
 * Loguea de dónde salió cada credencial y cómo se ve, sin exponerla.
 *
 * `origen` distingue si el valor vino inlineado en el build (`import.meta.env`)
 * o del entorno en runtime (`process.env`). Esa diferencia importa: un redeploy
 * con caché reutiliza un bundle viejo, y ahí el valor bueno solo puede llegar
 * por `process.env`.
 */
export function diagnosticarCredenciales(datos: {
  contexto: string;
  urlBuild: string | undefined;
  urlRuntime: string | undefined;
  keyBuild: string | undefined;
  keyRuntime: string | undefined;
}) {
  if (!DEBUG) return;

  const origen = (build: unknown, runtime: unknown) =>
    build ? 'build (import.meta.env)' : runtime ? 'runtime (process.env)' : 'NINGUNO';

  const url = datos.urlBuild ?? datos.urlRuntime;
  const key = datos.keyBuild ?? datos.keyRuntime;

  console.log(
    [
      '',
      `[debug-supabase] ${datos.contexto}`,
      `  URL   : ${url ?? 'AUSENTE'}`,
      `  origen: ${origen(datos.urlBuild, datos.urlRuntime)}`,
      `  key   : ${describirClave(key)}`,
      `  origen: ${origen(datos.keyBuild, datos.keyRuntime)}`,
      `  (para apagar esto, sacá DEBUG_SUPABASE de las variables de entorno)`,
      '',
    ].join('\n')
  );
}

/**
 * Se llama cuando Supabase rechaza una consulta. Si el mensaje suena a
 * credencial inválida, agrega la pista que faltaba: el problema puede ser un
 * carácter mal tipeado, no la consulta.
 */
export function diagnosticarErrorDeConsulta(contexto: string, mensaje: string) {
  const pareceClaveMala = /invalid api key|jwt|apikey|unauthorized|permission denied/i.test(mensaje);
  if (!pareceClaveMala) return;

  console.error(
    `[supabase] ${contexto}: "${mensaje}". ` +
      'Esto suele ser la publishable key mal cargada, no un problema de la consulta. ' +
      'Prendé DEBUG_SUPABASE=1 y comparala carácter por carácter con la de ' +
      'Supabase > Project Settings > API Keys.'
  );
}
