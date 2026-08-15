import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/ui/card';

/**
 * Pantalla de Catálogos: tipos de propiedad, localidades, barrios y servicios.
 *
 * Vacía a propósito. Existe porque el menú la nombra, y un ítem de menú que
 * lleva a un 404 es peor que no tenerlo. La gestión real llega con el CRUD.
 */
export default function PanelCatalogos() {
  return (
    <AdminGuard>
      <AdminShell seccionActiva="catalogos" titulo="Catálogos">
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay nada acá</CardTitle>
            <CardDescription>
              Acá vas a poder agregar y editar los tipos de propiedad, las localidades, los
              barrios y los servicios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Por ahora estos datos se cargan directamente en la base.
            </p>
          </CardContent>
        </Card>
      </AdminShell>
    </AdminGuard>
  );
}
