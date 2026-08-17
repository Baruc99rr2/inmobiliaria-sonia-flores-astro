import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CLAVE_ACTIVIDAD,
  EVENTOS_DE_ACTIVIDAD,
  INACTIVIDAD_MS,
  anotarActividad,
  faseDeSesion,
  leerUltimaActividad,
  restanteMs,
  type Fase,
} from '@/lib/admin/inactividad';

/**
 * Vigila la inactividad y avisa antes de cerrar.
 *
 * Detalles que importan:
 *
 *  - La última actividad va en un `ref`, NO en estado: si fuera estado, cada
 *    tecla dispararía un re-render del panel entero mientras escribe.
 *  - Se guarda también en `localStorage`, así el contador sobrevive a recargar
 *    la página y se comparte entre pestañas. Sin eso, alguien que agarra el
 *    teléfono y abre /admin reiniciaría el reloj de un plumazo, que es
 *    justamente el ataque que esto viene a cortar.
 *  - Los oyentes van en fase de captura y con `passive`, para no interferir con
 *    lo que la página haga con esos mismos eventos.
 */
export function useInactividad({
  activo,
  onCerrar,
}: {
  /** Solo corre con sesión válida. Sin esto contaría el tiempo en el login. */
  activo: boolean;
  onCerrar: () => void;
}) {
  const [fase, setFase] = useState<Fase>('activa');
  const [restante, setRestante] = useState(INACTIVIDAD_MS);

  const ultima = useRef<number>(Date.now());
  const yaCerro = useRef(false);

  const registrar = useCallback((ts: number = Date.now()) => {
    ultima.current = ts;
    anotarActividad(ts);
  }, []);

  /** "Seguir trabajando", y también cualquier gesto real. */
  const seguirConectada = useCallback(() => {
    if (yaCerro.current) return;
    registrar();
    setFase('activa');
    setRestante(INACTIVIDAD_MS);
  }, [registrar]);

  useEffect(() => {
    if (!activo) return;

    // Al arrancar se respeta lo que ya había anotado. Si el teléfono quedó
    // apoyado 40 minutos y alguien abre el panel, tiene que encontrarlo cerrado,
    // no con el reloj en cero.
    const previa = leerUltimaActividad();
    ultima.current = previa ?? Date.now();
    if (previa === null) anotarActividad(ultima.current);

    const alHaberGesto = () => {
      if (yaCerro.current) return;
      ultima.current = Date.now();
      anotarActividad(ultima.current);
    };

    for (const ev of EVENTOS_DE_ACTIVIDAD) {
      window.addEventListener(ev, alHaberGesto, { passive: true, capture: true });
    }

    // Volver a la pestaña es presencia. Que se OCULTE no lo es, y no se toca el
    // contador: el tiempo en segundo plano tiene que seguir corriendo.
    const alVolver = () => {
      if (document.visibilityState === 'visible') alHaberGesto();
    };
    document.addEventListener('visibilitychange', alVolver);

    // Otra pestaña del panel con actividad mantiene viva a esta.
    const alCambiarStorage = (e: StorageEvent) => {
      if (e.key !== CLAVE_ACTIVIDAD || !e.newValue) return;
      const n = Number(e.newValue);
      if (Number.isFinite(n) && n > ultima.current) ultima.current = n;
    };
    window.addEventListener('storage', alCambiarStorage);

    const revisar = () => {
      if (yaCerro.current) return;
      const ahora = Date.now();
      const f = faseDeSesion(ultima.current, ahora);

      // `setFase` con el mismo valor no re-renderiza (React corta si es igual),
      // así que mientras la sesión está sana esto no cuesta nada. `restante`
      // solo se actualiza durante el aviso, que es cuando se muestra: si no,
      // estaríamos re-renderizando el panel una vez por segundo al pedo.
      setFase(f);
      if (f !== 'activa') setRestante(restanteMs(ultima.current, ahora));

      if (f === 'cerrada') {
        yaCerro.current = true;
        onCerrar();
      }
    };

    revisar();
    // Un solo intervalo de 1s. Es barato (una resta contra el reloj) y deja la
    // cuenta regresiva sin saltos. No mantiene viva la sesión: solo LEE la hora,
    // nunca anota actividad.
    const id = window.setInterval(revisar, 1000);

    return () => {
      for (const ev of EVENTOS_DE_ACTIVIDAD) {
        window.removeEventListener(ev, alHaberGesto, { capture: true } as EventListenerOptions);
      }
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('storage', alCambiarStorage);
      window.clearInterval(id);
    };
  }, [activo, onCerrar]);

  return { mostrarAviso: fase === 'por-cerrar', restante, seguirConectada };
}
