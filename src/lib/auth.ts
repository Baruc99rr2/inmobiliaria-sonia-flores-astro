/**
 * Autenticación del panel (Fase 4).
 *
 * >>> LO QUE PROTEGE LOS DATOS ES RLS, NO ESTO. <<<
 *
 * Todo lo de este archivo corre en el browser y es UX: evita que alguien sin
 * permiso vea una pantalla rota o un formulario que no va a poder guardar. Un
 * atacante puede saltearlo entero con las devtools, y no le sirve de nada: las
 * policies de la Fase 1 son las que deciden qué filas devuelve Postgres.
 *
 * La sesión vive del lado del cliente (la maneja supabase-js). Por eso el guard
 * es un componente React y no un chequeo en el frontmatter de Astro: el servidor
 * no ve la sesión.
 */
import { supabase } from './supabase';

/** Mensajes de error de Supabase traducidos. Nunca se muestra el original. */
const ERRORES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'El correo o la contraseña no son correctos.'],
  [/email not confirmed/i, 'La cuenta todavía no fue confirmada. Escribile al desarrollador.'],
  [/too many requests|rate limit/i, 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.'],
  [/network|fetch failed|failed to fetch/i, 'No pudimos conectarnos. Revisá tu conexión a internet.'],
  [/invalid api key/i, 'El sitio está mal configurado. Avisale al desarrollador.'],
];

export function traducirError(mensaje: string | undefined | null): string {
  const texto = String(mensaje ?? '');
  for (const [patron, traduccion] of ERRORES) {
    if (patron.test(texto)) return traduccion;
  }
  return 'No pudimos iniciar sesión. Probá de nuevo en un momento.';
}

/**
 * Mensaje único para cuando falta el cliente.
 *
 * `src/lib/supabase.ts` devuelve `null` si faltan las credenciales, en vez de
 * tirar al importarse (se cambió en la Fase 3 justamente para que un error de
 * configuración no tumbe el sitio). Acá hay que contemplarlo: sin cliente no hay
 * login posible, y conviene decirlo con todas las letras en vez de dejar la
 * pantalla colgada.
 *
 * Ojo con el caso que lo produce: las variables `PUBLIC_*` se incrustan en
 * tiempo de build, así que un redeploy que reutilice una build cacheada puede
 * dejar el cliente en `null` aunque las variables estén bien cargadas.
 */
export const SIN_CLIENTE =
  'El panel no está configurado: falta la conexión con la base de datos. ' +
  'Avisale al desarrollador (probablemente haya que redesplegar sin caché).';

export function hayCliente(): boolean {
  return supabase !== null;
}

/** La sesión actual, o `null`. Nunca tira. */
export async function getSesion() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[auth] getSession:', error.message);
    return null;
  }
  return data.session ?? null;
}

/**
 * ¿El usuario logueado está en la tabla `admins`?
 *
 * La policy "admin se lee a si mismo" solo deja ver la propia fila, así que un
 * autenticado que no sea admin recibe cero filas. No hace falta filtrar por
 * `user_id` acá: RLS ya lo hace.
 */
export async function esAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from('admins').select('user_id').limit(1);
  if (error) {
    console.error('[auth] esAdmin:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function iniciarSesion(email: string, password: string) {
  if (!supabase) return { ok: false as const, error: SIN_CLIENTE };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[auth] signInWithPassword:', error.message);
    return { ok: false as const, error: traducirError(error.message) };
  }

  // Entrar no alcanza: hay que estar en `admins`. Si no, se cierra la sesión
  // enseguida para no dejar a alguien "logueado" en un panel que no puede usar.
  const admin = await esAdmin();
  if (!admin) {
    await cerrarSesion();
    return {
      ok: false as const,
      error:
        'Esta cuenta no tiene permiso para entrar al panel. ' +
        'Si creés que es un error, avisale al desarrollador.',
    };
  }

  return { ok: true as const };
}

export async function cerrarSesion() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[auth] signOut:', error.message);
}
