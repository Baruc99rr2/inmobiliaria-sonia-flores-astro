import { useEffect, useState } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import { Button } from '@/components/admin/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/ui/card';
import { cerrarSesion, getSesion } from '@/lib/auth';

/**
 * Pantalla de inicio del panel.
 *
 * Es un placeholder deliberado: la Fase 4 solo tiene que dejar el acceso
 * funcionando. El shell con sidebar es la Fase 5 y el CRUD la Fase 6.
 *
 * Va todo en UNA isla junto con el guard. Anidar dos componentes `client:only`
 * desde el `.astro` no sirve: los hijos que renderiza Astro no se pueden pasar
 * como children de React a una isla que solo existe en el cliente.
 */
function Contenido() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    getSesion().then((s) => {
      if (vigente) setEmail(s?.user?.email ?? null);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/SoniaLogo.png" alt="" className="h-10 w-auto object-contain" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Panel de administración</h1>
              {email && <p className="text-sm text-muted-foreground">{email}</p>}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={async () => {
              await cerrarSesion();
              window.location.replace('/admin/login');
            }}
          >
            Cerrar sesión
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Ya podés entrar</CardTitle>
            <CardDescription>
              El acceso quedó funcionando. Las pantallas para cargar y editar propiedades
              se agregan en los próximos pasos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Por ahora esta pantalla está vacía a propósito.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function PanelInicio() {
  return (
    <AdminGuard>
      <Contenido />
    </AdminGuard>
  );
}
