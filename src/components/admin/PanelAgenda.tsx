import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  CheckIcon,
  LoaderIcon,
  AlertCircleIcon,
} from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { Button } from '@/components/admin/ui/button';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import { useAutoguardado } from '@/components/admin/hooks/use-autoguardado';
import {
  MESES,
  DIAS_SEMANA,
  celdasDelMes,
  claveDia,
  esHoy,
  guardarDia,
  obtenerMes,
  tituloDelDia,
  type NotaDeAgenda,
} from '@/lib/admin/agenda';

/**
 * Agenda: recordatorios sueltos por día (Fase 8b).
 *
 * El editor va INLINE, debajo del calendario en el celular y al costado en
 * pantalla grande. No es un modal: en un teléfono, un modal con un campo de
 * texto pelea con el teclado en pantalla —se abre, empuja el diálogo, tapa el
 * campo— y encima hay que resolver el atrapado de foco. Un panel que aparece
 * abajo y se trae a la vista hace lo mismo sin ninguno de esos problemas.
 *
 * Una nota por día, con los renglones que quiera adentro. Con varias notas
 * sueltas harían falta botones de agregar y borrar por cada una; así el gesto
 * es el mismo que ya conoce de las notas de propiedad: tocar y escribir.
 */
export default function PanelAgenda() {
  const hoy = new Date();
  /**
   * El mes visible va en UN solo estado, no en dos.
   *
   * Con `anio` y `mes` separados, moverse un mes tenía que leer los dos del
   * closure del render, y dos toques rápidos en la misma tanda leían el MISMO
   * valor: se movía un solo mes. Se detectó probando —dos clics en "mes
   * anterior" desde septiembre daban agosto en vez de julio—. Con un objeto y
   * la forma funcional de `setState`, cada toque parte del valor ya
   * actualizado.
   */
  const [vista, setVista] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
  const { anio, mes } = vista;

  const [notas, setNotas] = useState<Record<string, NotaDeAgenda>>({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const { estado, error, descargar, marcarComoGuardado } = useAutoguardado({
    valor: texto,
    activo: diaElegido !== null,
    guardar: async (v) => {
      if (!diaElegido) return { ok: false, error: 'No hay ningún día elegido.' };
      const r = await guardarDia(diaElegido, v);
      if (!r.ok) return { ok: false, error: r.error };
      // El calendario tiene que reflejar el punto en el acto: si la nota quedó
      // vacía, la fila se borró y el día ya no lleva marca.
      setNotas((n) => {
        const copia = { ...n };
        if (r.nota) copia[diaElegido] = r.nota;
        else delete copia[diaElegido];
        return copia;
      });
      return { ok: true };
    },
  });

  const cargarMes = useCallback(async (a: number, m: number) => {
    setCargando(true);
    setErrorCarga(null);
    const r = await obtenerMes(a, m);
    if (r.ok) setNotas(r.notas);
    else setErrorCarga(r.error);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargarMes(anio, mes);
  }, [anio, mes, cargarMes]);

  const irA = (delta: number) => {
    // Antes de cambiar de mes se fuerza el guardado: si no, lo último tecleado
    // se pierde al desmontar el editor.
    descargar();
    setDiaElegido(null);
    setVista((v) => {
      const d = new Date(v.anio, v.mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });
  };

  const elegirDia = (clave: string) => {
    if (clave === diaElegido) return;
    descargar();
    const cuerpo = notas[clave]?.body ?? '';
    setDiaElegido(clave);
    setTexto(cuerpo);
    marcarComoGuardado(cuerpo);
    // En el celular el editor queda debajo del calendario: sin esto, tocar un
    // día no parece hacer nada.
    window.setTimeout(() => editorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
  };

  const celdas = celdasDelMes(anio, mes);
  const conNota = (c: string) => Boolean(notas[c]?.body?.trim());

  return (
    <AdminGuard>
      <AdminShell seccionActiva="agenda" titulo="Agenda">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* --- Calendario --- */}
          <section className="flex flex-1 flex-col gap-4 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => irA(-1)}
                aria-label="Mes anterior"
              >
                <ChevronLeftIcon />
              </Button>

              <div className="text-center">
                <h2 className="text-base font-semibold capitalize">
                  {MESES[mes]} {anio}
                </h2>
                {(anio !== hoy.getFullYear() || mes !== hoy.getMonth()) && (
                  <button
                    type="button"
                    onClick={() => {
                      descargar();
                      setDiaElegido(null);
                      setVista({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
                    }}
                    className="text-xs text-muted-foreground underline underline-offset-2"
                  >
                    Volver a este mes
                  </button>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => irA(1)}
                aria-label="Mes siguiente"
              >
                <ChevronRightIcon />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* El error va ARRIBA del calendario, no en su lugar. Si la consulta
                falla, esconder la grilla entera deja la pantalla en blanco y sin
                forma de moverse entre meses; mostrarla sin puntos al menos deja
                ver dónde está parada y reintentar cambiando de mes. */}
            {errorCarga && (
              <Alert variant="destructive">
                <AlertDescription>{errorCarga}</AlertDescription>
              </Alert>
            )}

            {cargando ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {celdas.map((d, i) => {
                  if (!d) return <span key={`v${i}`} aria-hidden="true" />;
                  const clave = claveDia(d);
                  const tiene = conNota(clave);
                  const elegido = clave === diaElegido;
                  return (
                    <button
                      key={clave}
                      type="button"
                      onClick={() => elegirDia(clave)}
                      aria-label={`${tituloDelDia(clave)}${tiene ? ', tiene una nota' : ''}`}
                      aria-pressed={elegido}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                        elegido
                          ? 'border-primary bg-primary/10 font-semibold'
                          : 'hover:bg-muted'
                      } ${esHoy(d) && !elegido ? 'border-foreground/40 font-semibold' : ''}`}
                    >
                      {d.getDate()}
                      {/* El punto: la única señal de que el día tiene algo. */}
                      {tiene && (
                        <span
                          className={`mt-0.5 size-1.5 rounded-full ${
                            elegido ? 'bg-primary' : 'bg-primary/70'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs leading-relaxed">
              <LockIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong>Esta agenda es privada, no se publica en el sitio.</strong> La ves solo
                vos, desde este panel.
              </span>
            </p>
          </section>

          {/* --- Editor del día --- */}
          <section
            ref={editorRef}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:w-[22rem] lg:shrink-0"
          >
            {diaElegido === null ? (
              <p className="text-sm text-muted-foreground">
                Tocá un día del calendario para escribir algo. Los días con un punto ya tienen
                una nota.
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold capitalize">
                    {tituloDelDia(diaElegido)}
                  </h2>
                  <Indicador estado={estado} />
                </div>

                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onBlur={descargar}
                  rows={8}
                  autoFocus
                  placeholder={'Ej:\nLlamó el dueño de la casa de Cuyaya\nVisita 17 hs en Alto Comedero\nLlevar las llaves del depósito'}
                  className="w-full resize-y rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />

                {estado === 'error' && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <p className="text-xs text-muted-foreground">
                  Si tenés varias cosas ese día, escribilas en renglones distintos. Se guarda
                  solo. Si borrás todo, el día queda sin nota.
                </p>
              </>
            )}
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

function Indicador({ estado }: { estado: string }) {
  if (estado === 'guardando')
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderIcon className="size-3.5 animate-spin" />
        Guardando…
      </span>
    );
  if (estado === 'pendiente')
    return <span className="shrink-0 text-xs text-muted-foreground">Sin guardar…</span>;
  if (estado === 'error')
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-destructive">
        <AlertCircleIcon className="size-3.5" />
        No se guardó
      </span>
    );
  if (estado === 'guardado')
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <CheckIcon className="size-3.5" />
        Guardado
      </span>
    );
  return null;
}
