import { useEffect, useState, type ReactNode } from 'react';
import { HouseIcon, TagsIcon, CalendarDaysIcon, LogOutIcon, SunIcon, MoonIcon } from 'lucide-react';
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
import { temaActual, guardarTema, type Tema } from '@/lib/tema-panel';

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

type Seccion = 'propiedades' | 'agenda' | 'catalogos';

const NAVEGACION: Array<{ id: Seccion; titulo: string; href: string; icono: ReactNode }> = [
  { id: 'propiedades', titulo: 'Propiedades', href: '/admin', icono: <HouseIcon /> },
  // "Agenda" y no "Calendario": es la palabra que ella ya usa para esto, y
  // describe para qué sirve en vez de con qué está hecho.
  { id: 'agenda', titulo: 'Agenda', href: '/admin/agenda', icono: <CalendarDaysIcon /> },
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

  // Arranca en null y se llena al montar. El tema real ya lo aplicó el script
  // inline del <head>; esto solo sincroniza el estado de React para dibujar el
  // ícono correcto. Si lo inicializáramos con un valor fijo, el botón mostraría
  // el ícono equivocado por un instante.
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    let vigente = true;
    getSesion().then((s) => {
      if (vigente) setEmail(s?.user?.email ?? null);
    });
    setTema(temaActual());
    return () => {
      vigente = false;
    };
  }, []);

  const cambiarTema = () => {
    const siguiente: Tema = tema === 'oscuro' ? 'claro' : 'oscuro';
    guardarTema(siguiente);
    setTema(siguiente);
  };

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
            {/* El logo es un PNG con el texto en negro, así que sobre el fondo
                oscuro desaparece. En vez de invertirlo —lo que volvería cian el
                rojo de la marca— se le pone una base clara solo en tema oscuro,
                y el logo conserva sus colores reales. */}
            <img
              src="/SoniaLogo.png"
              alt=""
              className="h-8 w-8 shrink-0 object-contain dark:bg-white dark:rounded-md dark:p-0.5"
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
            <SidebarMenuItem>
              {/* El ícono muestra a dónde vas, no dónde estás: en claro se ve
                  la luna porque tocarlo lleva a oscuro. Mientras `tema` es null
                  se reserva el espacio sin ícono, para que no salte el layout. */}
              <SidebarMenuButton
                onClick={cambiarTema}
                disabled={tema === null}
                tooltip={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              >
                {tema === 'oscuro' ? <SunIcon /> : <MoonIcon />}
                <span>{tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

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
