import { useEffect, useState, type ReactNode } from 'react';
import { HouseIcon, TagsIcon, LogOutIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/admin/ui/sidebar';
import { cerrarSesion, getSesion } from '@/lib/auth';

/**
 * Esqueleto del panel (Fase 5).
 *
 * Escrito a mano sobre los primitivos de `ui/sidebar`. El block `sidebar-07`
 * trae cinco componentes de composición llenos de datos de ejemplo —"Acme Inc",
 * "Evil Corp", un menú "Playground", un usuario "shadcn"— y secciones que este
 * proyecto no necesita (equipos, proyectos, métricas). Se borraron enteros:
 * `app-sidebar`, `nav-main`, `nav-projects`, `nav-user` y `team-switcher`.
 *
 * De los primitivos también se borraron los que no usa nadie: `avatar`,
 * `breadcrumb`, `collapsible` y `dropdown-menu`. Se agregan de nuevo con
 * `shadcn add` el día que hagan falta.
 *
 * El menú tiene solo lo que existe hoy. Sin ítems muertos que lleven a pantallas
 * en blanco: las secciones se van agregando a medida que se construyen.
 */

type Seccion = 'propiedades' | 'catalogos';

const NAVEGACION: Array<{ id: Seccion; titulo: string; href: string; icono: ReactNode }> = [
  { id: 'propiedades', titulo: 'Propiedades', href: '/admin', icono: <HouseIcon /> },
  { id: 'catalogos', titulo: 'Catálogos', href: '/admin/catalogos', icono: <TagsIcon /> },
];

export default function AdminShell({
  seccionActiva = 'propiedades',
  titulo,
  children,
}: {
  seccionActiva?: Seccion;
  titulo: string;
  children?: ReactNode;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    let vigente = true;
    getSesion().then((s) => {
      if (vigente) setEmail(s?.user?.email ?? null);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const salir = async () => {
    if (saliendo) return;
    setSaliendo(true);
    await cerrarSesion();
    window.location.replace('/admin/login');
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <img
              src="/SoniaLogo.png"
              alt=""
              className="h-8 w-8 shrink-0 object-contain"
            />
            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold">Sonia Flores</span>
              <span className="truncate text-xs text-muted-foreground">Panel</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Gestión</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAVEGACION.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    {/* Base UI usa `render` para cambiar el elemento, no el
                        `asChild` de Radix. */}
                    <SidebarMenuButton
                      render={<a href={item.href} />}
                      isActive={item.id === seccionActiva}
                      tooltip={item.titulo}
                    >
                      {item.icono}
                      <span>{item.titulo}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {email && (
              <SidebarMenuItem>
                <div className="px-2 py-1 text-xs text-muted-foreground truncate group-data-[collapsible=icon]:hidden">
                  {email}
                </div>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={salir}
                disabled={saliendo}
                tooltip="Cerrar sesión"
              >
                <LogOutIcon />
                <span>{saliendo ? 'Saliendo…' : 'Cerrar sesión'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* La barra superior existe sobre todo para el celular: es donde vive el
            botón que abre el menú. En escritorio el menú ya está a la vista. */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-base font-semibold truncate">{titulo}</h1>
        </header>

        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
