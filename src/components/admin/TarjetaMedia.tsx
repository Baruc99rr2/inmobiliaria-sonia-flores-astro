import {
  ImageIcon,
  VideoIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripVerticalIcon,
} from 'lucide-react';
import { urlDeMedia, type MediaItem } from '@/lib/admin/media';

/**
 * Una foto o video en la grilla, con sus controles (Fase 7d).
 *
 * >>> Los botones de mover NO son un adorno de accesibilidad: son la forma
 * principal de reordenar en el celular. <<<
 *
 * El arrastre se implementó con Pointer Events y no con la API de
 * drag-and-drop de HTML5, porque esa última no existe en móviles: en un
 * teléfono no se dispara nunca. Aun así, arrastrar en una pantalla chica y con
 * la página scrolleando es incómodo, y ella carga las fotos desde el teléfono.
 * Por eso cada tarjeta tiene además "◀" y "▶", que mueven de a una posición y
 * funcionan igual con el dedo, con el mouse y con el teclado.
 */
export default function TarjetaMedia({
  item,
  indice,
  total,
  arrastrando,
  esDestino,
  ocupado,
  onMover,
  onBorrar,
  onPointerDownAgarre,
}: {
  item: MediaItem;
  indice: number;
  total: number;
  arrastrando: boolean;
  esDestino: boolean;
  ocupado: boolean;
  onMover: (desde: number, hasta: number) => void;
  onBorrar: (item: MediaItem) => void;
  onPointerDownAgarre: (e: React.PointerEvent, indice: number) => void;
}) {
  const esPortada = indice === 0;

  return (
    <li
      data-indice={indice}
      className={`flex flex-col gap-1.5 transition-opacity ${arrastrando ? 'opacity-40' : ''}`}
    >
      <div
        className={`relative aspect-4/3 overflow-hidden rounded-lg border-2 bg-muted ${
          esDestino ? 'border-primary' : 'border-transparent'
        }`}
      >
        {item.kind === 'video' ? (
          <video
            src={urlDeMedia(item)}
            className="pointer-events-none size-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        ) : (
          <img
            src={urlDeMedia(item)}
            alt={item.alt || `Foto ${indice + 1}`}
            className="pointer-events-none size-full object-cover"
            loading="lazy"
          />
        )}

        {/* El agarre para arrastrar. `touch-none` es imprescindible: sin eso el
            navegador se queda con el gesto para scrollear y el arrastre nunca
            llega a empezar. */}
        <button
          type="button"
          aria-label={`Arrastrar ${item.kind === 'video' ? 'el video' : 'la foto'} ${indice + 1}`}
          onPointerDown={(e) => onPointerDownAgarre(e, indice)}
          disabled={ocupado || total < 2}
          className="absolute left-1.5 top-1.5 grid size-7 cursor-grab touch-none place-items-center rounded bg-background/90 active:cursor-grabbing disabled:opacity-40"
        >
          <GripVerticalIcon className="size-4" />
        </button>

        <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded bg-background/90">
          {item.kind === 'video' ? (
            <VideoIcon className="size-3.5" />
          ) : (
            <ImageIcon className="size-3.5" />
          )}
        </span>

        {esPortada && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Portada
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMover(indice, indice - 1)}
          disabled={indice === 0 || ocupado}
          aria-label={`Mover ${indice + 1} hacia adelante`}
          className="grid size-7 place-items-center rounded border text-muted-foreground disabled:opacity-30 hover:bg-muted"
        >
          <ChevronLeftIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => onMover(indice, indice + 1)}
          disabled={indice === total - 1 || ocupado}
          aria-label={`Mover ${indice + 1} hacia atrás`}
          className="grid size-7 place-items-center rounded border text-muted-foreground disabled:opacity-30 hover:bg-muted"
        >
          <ChevronRightIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => onBorrar(item)}
          disabled={ocupado}
          aria-label={`Borrar ${item.kind === 'video' ? 'el video' : 'la foto'} ${indice + 1}`}
          className="ml-auto grid size-7 place-items-center rounded border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>
    </li>
  );
}
