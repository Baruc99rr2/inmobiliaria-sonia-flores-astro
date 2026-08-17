import { useEffect, useState } from 'react';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/admin/ui/card';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { iniciarSesion, getSesion, esAdmin, hayCliente, SIN_CLIENTE } from '@/lib/auth';

/**
 * Formulario de acceso al panel.
 *
 * NO tiene link de "crear cuenta" ni de "olvidé mi contraseña", a propósito: el
 * registro público está desactivado en Supabase, así que ofrecerlo sería
 * prometer algo imposible. Si la dueña pierde la contraseña, se la resetea el
 * desarrollador desde el panel de Supabase — por eso el texto de ayuda de abajo
 * dice eso en vez de mostrar un link muerto.
 */
export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  const sinCliente = !hayCliente();

  // `?motivo=inactividad` lo pone el cierre automático del guard.
  const porInactividad =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('motivo') === 'inactividad';

  // Si ya hay sesión de un admin, no tiene sentido mostrar el formulario.
  useEffect(() => {
    let vigente = true;
    (async () => {
      if (sinCliente) {
        if (vigente) setVerificandoSesion(false);
        return;
      }
      const sesion = await getSesion();
      if (sesion && (await esAdmin())) {
        window.location.replace('/admin');
        return;
      }
      if (vigente) setVerificandoSesion(false);
    })();
    return () => {
      vigente = false;
    };
  }, [sinCliente]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setError(null);

    const resultado = await iniciarSesion(email.trim(), password);

    if (resultado.ok) {
      // `replace` y no `href`: que el botón "atrás" no vuelva al login.
      window.location.replace('/admin');
      return;
    }

    setError(resultado.error);
    setPassword('');
    setEnviando(false);
  };

  if (verificandoSesion) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Cargando…
      </p>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Panel de administración</CardTitle>
        <CardDescription>Ingresá con tu correo y contraseña.</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Explica por qué la echó, para que no parezca que el panel falló. */}
        {porInactividad && !sinCliente && (
          <Alert className="mb-4">
            <AlertDescription>
              Cerramos tu sesión porque estuviste un rato sin usar el panel. Es por seguridad,
              por si el teléfono queda en manos de otra persona. Lo que hayas cargado y no se
              haya guardado te va a estar esperando.
            </AlertDescription>
          </Alert>
        )}

        {sinCliente ? (
          <Alert variant="destructive">
            <AlertDescription>{SIN_CLIENTE}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={enviando}
                placeholder="tucorreo@ejemplo.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={enviando}
              />
            </div>

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={enviando} className="w-full">
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>

            <p className="text-xs text-muted-foreground leading-relaxed">
              El acceso es solo para las cuentas autorizadas. Si no podés entrar o
              necesitás cambiar la contraseña, escribile al desarrollador.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
