import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoGuardado = 'quieto' | 'pendiente' | 'guardando' | 'guardado' | 'error';

/**
 * Autoguardado con espera (Fase 8a).
 *
 * Sin botón de guardar: se escribe y se guarda solo. Eso obliga a resolver tres
 * cosas que un botón resuelve gratis.
 *
 * 1. **Que no se pierda lo último tecleado.** Con solo un `setTimeout`, salir
 *    del campo o cerrar la pestaña dentro de la ventana de espera se lleva lo
 *    escrito. Por eso `descargar()` fuerza el guardado, y se lo llama al perder
 *    el foco y cuando la pestaña se oculta —en el celular, cambiar de app
 *    dispara `visibilitychange` y no `beforeunload`, que ahí no corre—.
 *
 * 2. **Que no se pisen dos guardados.** Si el primero tarda y ella sigue
 *    escribiendo, el segundo puede llegar antes y dejar texto viejo. Cada
 *    guardado lleva número: si al volver no es el último que se lanzó, su
 *    resultado se descarta.
 *
 * 3. **Que el estado no mienta.** "Guardado" solo se muestra cuando la base
 *    confirmó. Mientras hay tecleo sin confirmar dice "Sin guardar", que es la
 *    verdad. Esto viene de un bug de la Fase 7: la pantalla mostraba un orden
 *    que la base nunca recibió.
 */
export function useAutoguardado<T>({
  valor,
  guardar,
  espera = 900,
  activo = true,
}: {
  valor: T;
  guardar: (v: T) => Promise<{ ok: boolean; error?: string }>;
  espera?: number;
  /** En `false` no guarda nada (por ejemplo, mientras carga). */
  activo?: boolean;
}) {
  const [estado, setEstado] = useState<EstadoGuardado>('quieto');
  const [error, setError] = useState<string | null>(null);

  const temporizador = useRef<number | null>(null);
  const ultimoGuardado = useRef<T>(valor);
  const pendiente = useRef<T>(valor);
  /**
   * El valor que se está guardando en este momento.
   *
   * Sin esto el mismo texto se manda DOS VECES al salir del campo: `descargar()`
   * lanza el guardado, y el efecto de la espera —que ya estaba agendado— lo
   * vuelve a lanzar, porque `ultimoGuardado` recién se actualiza cuando la base
   * confirma. Se detectó probando: el registro mostraba "inicia:A" repetido.
   * No corrompía nada, pero era un viaje de red al pedo en cada blur, y desde
   * un celular con datos eso se nota.
   */
  const enVuelo = useRef<T | null>(null);
  const serie = useRef(0);
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;

  pendiente.current = valor;

  const ejecutar = useCallback(async (v: T) => {
    const mio = ++serie.current;
    enVuelo.current = v;
    setEstado('guardando');
    setError(null);

    const r = await guardarRef.current(v);

    // Llegó tarde: ya se lanzó otro guardado. Su resultado no cuenta, ni para
    // bien ni para mal.
    if (mio !== serie.current) return;

    // Se libera recien acá: mientras estaba en vuelo, nadie más podía volver a
    // mandar el mismo valor. Si falló también se libera, para que el próximo
    // tecleo lo reintente en vez de quedar trabado.
    enVuelo.current = null;

    if (r.ok) {
      ultimoGuardado.current = v;
      setEstado('guardado');
    } else {
      setEstado('error');
      setError(r.error ?? 'No pudimos guardar.');
    }
  }, []);

  /** Guarda ya, sin esperar. Para el blur y para cuando se oculta la pestaña. */
  const descargar = useCallback(() => {
    if (temporizador.current !== null) {
      window.clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    if (!activo) return;
    if (pendiente.current === ultimoGuardado.current) return;
    if (pendiente.current === enVuelo.current) return;
    void ejecutar(pendiente.current);
  }, [activo, ejecutar]);

  useEffect(() => {
    if (!activo) return;
    if (valor === ultimoGuardado.current) return;
    // Ya se está mandando este mismo valor: no hace falta agendarlo de nuevo.
    if (valor === enVuelo.current) return;

    setEstado('pendiente');
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null;
      void ejecutar(valor);
    }, espera);

    return () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    };
  }, [valor, activo, espera, ejecutar]);

  // Cambiar de app en el celular no dispara `beforeunload`. `visibilitychange`
  // sí, y es el caso real: escribe una nota y se va a WhatsApp.
  useEffect(() => {
    const alOcultarse = () => {
      if (document.visibilityState === 'hidden') descargar();
    };
    document.addEventListener('visibilitychange', alOcultarse);
    window.addEventListener('pagehide', descargar);
    return () => {
      document.removeEventListener('visibilitychange', alOcultarse);
      window.removeEventListener('pagehide', descargar);
    };
  }, [descargar]);

  /** Para cuando el valor viene de la base y no hay que guardarlo de vuelta. */
  const marcarComoGuardado = useCallback((v: T) => {
    ultimoGuardado.current = v;
    pendiente.current = v;
    setEstado('quieto');
    setError(null);
  }, []);

  return { estado, error, descargar, marcarComoGuardado };
}
