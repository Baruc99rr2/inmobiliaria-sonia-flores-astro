import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import ListadoPropiedades from '@/components/admin/ListadoPropiedades';

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
        <ListadoPropiedades />
      </AdminShell>
    </AdminGuard>
  );
}
