import { useEffect, useState } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/card';
import {
  CONFIGURACION_VACIA,
  obtenerConfiguracion,
  guardarConfiguracion,
  type ConfiguracionSitio,
} from '@/lib/admin/configuracion';

/**
 * Pantalla de Catálogos.
 *
 * Hoy tiene una sola cosa de verdad: los datos de contacto del sitio (Fase
 * 6.6). Se metieron acá en vez de hacer una pantalla nueva porque esta sección
 * ya existía vacía en el menú, y agregar un ítem más para cuatro campos le suma
 * ruido a alguien que no es técnico.
 *
 * Tipos, localidades, barrios y servicios siguen cargándose desde la base. El
 * aviso de abajo lo dice, para que no parezca que la pantalla está rota.
 */
export default function PanelCatalogos() {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfiguracionSitio>(CONFIGURACION_VACIA);

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let vigente = true;
    (async () => {
      const r = await obtenerConfiguracion();
      if (!vigente) return;
      if (r.ok) setConfig(r.configuracion);
      else setErrorCarga(r.error);
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const set = <K extends keyof ConfiguracionSitio>(k: K, v: ConfiguracionSitio[K]) => {
    setConfig((c) => ({ ...c, [k]: v }));
    setGuardado(false);
  };

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    setErrorGuardar(null);
    const r = await guardarConfiguracion(config);
    if (r.ok) setGuardado(true);
    else setErrorGuardar(r.error);
    setGuardando(false);
  };

  return (
    <AdminGuard>
      <AdminShell seccionActiva="catalogos" titulo="Catálogos">
        <div className="flex max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos de contacto</CardTitle>
              <CardDescription>
                Esto aparece en la ficha de cada propiedad y en el texto que se arma cuando
                compartís una por WhatsApp o Facebook. Si cambiás el teléfono acá, cambia en
                todo el sitio.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {cargando ? (
                <>
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </>
              ) : errorCarga ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorCarga}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      inputMode="tel"
                      value={config.telefono}
                      onChange={(e) => set('telefono', e.target.value)}
                      placeholder="3884881245"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="horario">Horario de atención</Label>
                    <Input
                      id="horario"
                      value={config.horario}
                      onChange={(e) => set('horario', e.target.value)}
                      placeholder="de 9 a 13 y de 16 a 18 hs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se muestra después del teléfono. Ej: “Comunicate al 388… , de 9 a 13 hs”.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="matricula">Matrícula</Label>
                    <Input
                      id="matricula"
                      value={config.matricula}
                      onChange={(e) => set('matricula', e.target.value)}
                      placeholder="MP 177"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={config.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="Opcional"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si lo dejás vacío, en la web no aparece ninguna dirección de correo.
                    </p>
                  </div>

                  {errorGuardar && (
                    <Alert variant="destructive">
                      <AlertDescription>{errorGuardar}</AlertDescription>
                    </Alert>
                  )}
                  {guardado && (
                    <Alert>
                      <AlertDescription>
                        Guardado. Ya se ve en la web.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Button type="button" onClick={guardar} disabled={guardando}>
                      {guardando ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipos, localidades, barrios y servicios</CardTitle>
              <CardDescription>
                Por ahora estos se cargan directamente en la base. Los tipos y los barrios
                también podés agregarlos desde el formulario de cada propiedad, con el botón
                “+” que está al lado de cada lista.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
