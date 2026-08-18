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
import { esLegacy, urlDeMedia, type MediaItem } from '@/lib/admin/media';

/**
 * Confirmación antes de borrar una foto o un video (Fase 7d).
 *
 * Más liviano que el diálogo de borrar una propiedad, que pide dos acciones
 * deliberadas: borrar una foto de más se arregla volviéndola a subir, borrar
 * una propiedad no. Igual se confirma, porque no hay deshacer y porque en el
 * teléfono el dedo se va fácil.
 *
 * Se muestra la miniatura de la que se va a borrar: en una grilla de quince
 * fotos parecidas, el nombre del archivo no alcanza para saber cuál es.
 */
export default function DialogoBorrarMedia({
  item,
  borrando,
  onCancelar,
  onConfirmar,
}: {
  item: MediaItem | null;
  borrando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const esVideo = item?.kind === 'video';

  return (
    <AlertDialog open={item !== null} onOpenChange={(abierto) => !abierto && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Borrar {esVideo ? 'este video' : 'esta foto'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer. Si te arrepentís vas a tener que volver a subirla.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {item && (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <div className="size-20 shrink-0 overflow-hidden rounded bg-muted">
              {esVideo ? (
                <video
                  src={urlDeMedia(item)}
                  className="size-full object-cover"
                  preload="metadata"
                  muted
                  playsInline
                />
              ) : (
                <img src={urlDeMedia(item)} alt="" className="size-full object-cover" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {esLegacy(item)
                ? 'Esta es una de las fotos originales del sitio.'
                : 'Se va a borrar también del almacenamiento, así te libera espacio.'}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={borrando}>No, dejala</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Sin esto el diálogo se cierra solo antes de que termine el
              // borrado, y el "Borrando…" no se llega a ver.
              e.preventDefault();
              onConfirmar();
            }}
            disabled={borrando}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {borrando ? 'Borrando…' : 'Sí, borrala'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
