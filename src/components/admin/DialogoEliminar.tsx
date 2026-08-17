import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/admin/ui/alert-dialog';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { Label } from '@/components/admin/ui/label';

/**
 * Confirmación para eliminar una propiedad.
 *
 * La dueña usa el panel desde el celular, donde un toque mal dado es cuestión de
 * tiempo. Un diálogo con "¿Estás seguro?" y un botón "Aceptar" no alcanza: se
 * acepta por reflejo, sin leer.
 *
 * Por eso pide DOS acciones deliberadas:
 *   1. Marcar una casilla que dice explícitamente qué va a pasar.
 *   2. Recién ahí se habilita el botón de eliminar.
 *
 * La casilla y no escribir el título: escribir en el teléfono es incómodo, y el
 * objetivo es que frene y lea, no que sufra.
 *
 * El título de la propiedad va destacado, para que si abrió el diálogo de la
 * tarjeta equivocada lo note antes de confirmar.
 */
export default function DialogoEliminar({
  abierto,
  onCambio,
  titulo,
  eliminando,
  onConfirmar,
}: {
  abierto: boolean;
  onCambio: (abierto: boolean) => void;
  titulo: string;
  eliminando: boolean;
  onConfirmar: () => void;
}) {
  const [entendido, setEntendido] = useState(false);

  // Cada vez que se abre, la casilla arranca sin marcar. Si no, alcanzaría con
  // haber confirmado una vez para que el siguiente borrado sea un solo toque.
  useEffect(() => {
    if (abierto) setEntendido(false);
  }, [abierto]);

  return (
    <AlertDialog open={abierto} onOpenChange={onCambio}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta propiedad?</AlertDialogTitle>
          <AlertDialogDescription>
            Va a desaparecer del panel y de la web. Si te equivocaste, el desarrollador puede
            recuperarla.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* El título va afuera de la descripción y destacado: si abrió el diálogo
            de la tarjeta equivocada, tiene que notarlo antes de confirmar.
            (Base UI no acepta `asChild`, así que no se anida dentro.) */}
        <p className="rounded-lg border bg-muted/50 p-3 text-sm font-medium">
          {titulo || 'Propiedad sin título'}
        </p>

        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 p-3">
          <Checkbox
            id="confirmar-eliminar"
            checked={entendido}
            onCheckedChange={(v) => setEntendido(v === true)}
            disabled={eliminando}
            className="mt-0.5"
          />
          <Label htmlFor="confirmar-eliminar" className="text-sm leading-snug font-normal">
            Entiendo que esta propiedad va a dejar de verse en el panel y en la web.
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={eliminando}>No, dejarla</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // el diálogo lo cierra el padre, cuando termina
              onConfirmar();
            }}
            disabled={!entendido || eliminando}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
