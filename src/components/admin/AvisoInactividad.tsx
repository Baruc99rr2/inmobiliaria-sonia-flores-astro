import { ClockIcon } from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { formatearRestante } from '@/lib/admin/inactividad';

/**
 * El aviso de que la sesión está por cerrarse.
 *
 * >>> NO es un diálogo modal, y es a propósito. <<<
 *
 * Un modal roba el foco por definición y se planta en el medio de la pantalla,
 * o sea justo encima del campo que podría estar escribiendo. Acá hay tres
 * decisiones que salen de ese requisito:
 *
 *  1. Va pegado ARRIBA. Abajo está la barra de acciones y el teclado del
 *     celular; el medio es donde está el campo con el cursor.
 *  2. Nadie llama a `focus()`. El cursor se queda donde estaba y puede seguir
 *     escribiendo con el cartel puesto — y escribir, además, cancela el cierre.
 *  3. `role="status"` con `aria-live="polite"`: un lector de pantalla lo anuncia
 *     cuando termina de leer lo que estaba leyendo, sin interrumpir. Con
 *     `alert`/`assertive` cortaría la frase a la mitad.
 *
 * El botón es la salida explícita, pero cualquier gesto real —una tecla, un
 * toque, un scroll— ya lo cancela. Eso es lo que pidió el "seguir con un toque".
 */
export default function AvisoInactividad({
  restante,
  onSeguir,
}: {
  restante: number;
  onSeguir: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex justify-center p-2 sm:p-3"
    >
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-amber-500/40 bg-background p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <ClockIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">¿Seguís ahí?</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Hace un rato que no tocás nada, así que vamos a cerrar la sesión por seguridad.
              Se cierra en{' '}
              <strong className="tabular-nums text-foreground">
                {formatearRestante(restante)}
              </strong>
              .
            </p>
          </div>
        </div>

        <Button type="button" onClick={onSeguir} className="w-full">
          Seguir trabajando
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Podés seguir escribiendo y no se cierra. Si igual se cierra, lo que cargaste queda
          guardado en este teléfono y lo vas a encontrar cuando vuelvas a entrar.
        </p>
      </div>
    </div>
  );
}
