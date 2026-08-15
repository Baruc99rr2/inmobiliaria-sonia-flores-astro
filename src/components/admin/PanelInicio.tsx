import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/ui/card';

/**
 * Pantalla de Propiedades.
 *
 * Vacía a propósito: la Fase 5 solo arma el esqueleto. El listado con búsqueda y
 * el toggle de publicado son la Fase 6.
 *
 * Todo va en UNA isla junto con el guard: anidar componentes `client:only` desde
 * el `.astro` no funciona, porque Astro no puede pasar hijos renderizados en el
 * servidor como children de React a una isla que solo existe en el cliente.
 */
export default function PanelInicio() {
  return (
    <AdminGuard>
      <AdminShell seccionActiva="propiedades" titulo="Propiedades">
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay nada acá</CardTitle>
            <CardDescription>
              Esta es la pantalla donde vas a ver y editar tus propiedades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              El listado y el formulario de carga se agregan en el próximo paso.
            </p>
          </CardContent>
        </Card>
      </AdminShell>
    </AdminGuard>
  );
}
