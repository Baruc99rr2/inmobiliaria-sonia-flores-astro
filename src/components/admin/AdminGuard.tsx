import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/admin/ui/button';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { getSesion, esAdmin, cerrarSesion, hayCliente, SIN_CLIENTE } from '@/lib/auth';
import AvisoInactividad from '@/components/admin/AvisoInactividad';
import { useInactividad } from '@/components/admin/hooks/use-inactividad';
import { limpiarActividad } from '@/lib/admin/inactividad';

type Estado = 'verificando' | 'sin-cliente' | 'sin-sesion' | 'no-admin' | 'ok';

/**
 * Guard del panel. **Es solo UX**: lo que protege los datos es RLS.
 *
 * Tres casos, cada uno con su salida:
 *
 *   sin cliente  -> no hay credenciales de Supabase. Ni siquiera se puede
 *                   preguntar por la sesión. Se explica y no se redirige, para
 *                   no dejar al usuario en un bucle entre /admin y el login.
 *   sin sesión   -> al login.
 *   con sesión pero fuera de `admins` -> NO se redirige en silencio: se explica
 *                   qué pasó y se ofrece cerrar sesión. Redirigir al login con
 *                   la sesión abierta produce un rebote infinito, porque el
 *                   login ve la sesión y manda de vuelta acá.
 */
export default function AdminGuard({ children }: { children?: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [email, setEmail] = useState<string | null>(null);

  /**
   * Cierre por inactividad. `scope: 'local'` y no el `global` que viene por
   * defecto: alcanza con matar la sesión de ESTE teléfono, que es el que quedó
   * dando vueltas. Con `global` también la echaríamos de la compu de la
   * oficina, que no tiene nada que ver.
   *
   * El borrador del formulario NO se toca: es lo único que hace que cerrar la
   * sesión cueste un login y no el trabajo de media hora.
   */
  const cerrarPorInactividad = useCallback(async () => {
    limpiarActividad();
    await cerrarSesion({ scope: 'local' });
    window.location.replace('/admin/login?motivo=inactividad');
  }, []);

  const { mostrarAviso, restante, seguirConectada } = useInactividad({
    activo: estado === 'ok',
    onCerrar: cerrarPorInactividad,
  });

  useEffect(() => {
    let vigente = true;

    (async () => {
      if (!hayCliente()) {
        if (vigente) setEstado('sin-cliente');
        return;
      }

      const sesion = await getSesion();
      if (!sesion) {
        window.location.replace('/admin/login');
        return;
      }

      if (vigente) setEmail(sesion.user?.email ?? null);

      const admin = await esAdmin();
      if (vigente) setEstado(admin ? 'ok' : 'no-admin');
    })();

    return () => {
      vigente = false;
    };
  }, []);

  if (estado === 'verificando') {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <p className="text-sm text-muted-foreground" role="status">
          Verificando tu acceso…
        </p>
      </div>
    );
  }

  if (estado === 'sin-cliente') {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{SIN_CLIENTE}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (estado === 'no-admin') {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>
              La cuenta {email ? <strong>{email}</strong> : 'con la que entraste'} no tiene
              permiso para usar el panel. Si creés que es un error, avisale al desarrollador.
            </AlertDescription>
          </Alert>
          <Button
            onClick={async () => {
              await cerrarSesion();
              window.location.replace('/admin/login');
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  // `sin-sesion` no se renderiza: ese camino ya redirigió al login.
  return (
    <>
      {mostrarAviso && <AvisoInactividad restante={restante} onSeguir={seguirConectada} />}
      {children}
    </>
  );
}
