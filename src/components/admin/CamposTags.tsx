import { useState } from 'react';
import { XIcon, PlusIcon } from 'lucide-react';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Button } from '@/components/admin/ui/button';

/**
 * Los "adicionales": texto libre, uno por etiqueta.
 *
 * Es una columna `text[]` sin catálogo, a propósito: son cosas sueltas de cada
 * propiedad ("Asador", "Cerca del Parque San Martín", "Plano disponible") que no
 * tiene sentido normalizar.
 *
 * Se agrega con Enter o con el botón. Se quita con la X de cada etiqueta. No hay
 * arrastrar y soltar: en el teléfono no funciona bien y el orden acá no importa.
 */
export default function CamposTags({
  valores,
  onCambio,
}: {
  valores: string[];
  onCambio: (v: string[]) => void;
}) {
  const [nuevo, setNuevo] = useState('');

  const agregar = () => {
    const limpio = nuevo.trim();
    if (!limpio) return;
    // Sin repetidos, comparando sin distinguir mayúsculas: "Asador" y "asador"
    // son lo mismo para quien lee la ficha.
    const yaEsta = valores.some((v) => v.toLowerCase() === limpio.toLowerCase());
    if (!yaEsta) onCambio([...valores, limpio]);
    setNuevo('');
  };

  const quitar = (i: number) => onCambio(valores.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="adicional-nuevo">Detalles que suman</Label>

      <div className="flex gap-2">
        <Input
          id="adicional-nuevo"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Ej: Asador, Balcón, Cerca del centro…"
        />
        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={agregar}>
          <PlusIcon />
          <span className="sr-only sm:not-sr-only">Agregar</span>
        </Button>
      </div>

      {valores.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {valores.map((v, i) => (
            <li
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/60 py-1 pl-3 pr-1 text-sm"
            >
              <span>{v}</span>
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar ${v}`}
                className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Todavía no agregaste ninguno. Son opcionales.
        </p>
      )}
    </div>
  );
}
