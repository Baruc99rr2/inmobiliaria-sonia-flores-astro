import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';

/**
 * Un `<select>` con la opción de agregar una entrada nueva sin salir del
 * formulario.
 *
 * Se usa para tipo, localidad y barrio. El `<select>` es nativo a propósito: en
 * el celular abre el selector del sistema, que es lo que la dueña ya sabe usar.
 *
 * Agregar es de dos pasos —botón, campo, "Agregar"— y no un `prompt()`, para que
 * se pueda cancelar y para poder mostrar el error donde ocurrió.
 */
export default function SelectorCatalogo({
  id,
  etiqueta,
  ayuda,
  opciones,
  valor,
  onCambio,
  onAgregar,
  placeholderNuevo,
  deshabilitado = false,
  textoVacio = 'Sin especificar',
  motivoDeshabilitado,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  opciones: Array<{ id: number; label: string }>;
  valor: number | null;
  onCambio: (v: number | null) => void;
  onAgregar: (label: string) => Promise<{ ok: boolean; error?: string }>;
  placeholderNuevo: string;
  deshabilitado?: boolean;
  textoVacio?: string;
  motivoDeshabilitado?: string;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);

    const r = await onAgregar(nuevo);
    if (r.ok) {
      setNuevo('');
      setAgregando(false);
    } else {
      setError(r.error ?? 'No pudimos agregarlo.');
    }
    setGuardando(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>

      <div className="flex gap-2">
        <select
          id={id}
          value={valor ?? ''}
          onChange={(e) => onCambio(e.target.value ? Number(e.target.value) : null)}
          disabled={deshabilitado}
          /* `disabled:bg-muted` además del opacity: en tema claro el 50% de
             opacidad solo lo deja pálido (1.96:1, el número flojo de la Fase
             5.5) y se confunde con un campo vacío. Con fondo gris se lee como
             apagado. */
          /* `min-w-0`: un ítem flex no baja de su ancho intrínseco, y el de un
             `<select>` lo fija la opción más larga ("Local Comercial", nombres
             de barrio). Sin esto, en pantallas muy angostas el select se niega a
             encogerse y empuja al botón "+" fuera de la fila. De 320px para
             arriba no cambia nada: ahí el select ya entra y `flex-1` le sigue
             dando todo el espacio sobrante. */
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
        >
          <option value="">{textoVacio}</option>
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        {!agregando && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => {
              setAgregando(true);
              setError(null);
            }}
            disabled={deshabilitado}
          >
            <PlusIcon />
            <span className="sr-only sm:not-sr-only">Agregar</span>
          </Button>
        )}
      </div>

      {deshabilitado && motivoDeshabilitado && (
        <p className="text-xs text-muted-foreground">{motivoDeshabilitado}</p>
      )}

      {agregando && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
          <Label htmlFor={`${id}-nuevo`} className="text-xs">
            {placeholderNuevo}
          </Label>
          <div className="flex gap-2">
            <Input
              id={`${id}-nuevo`}
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              disabled={guardando}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmar();
                }
                if (e.key === 'Escape') setAgregando(false);
              }}
            />
            <Button type="button" size="sm" className="h-8" onClick={confirmar} disabled={guardando}>
              {guardando ? 'Agregando…' : 'Agregar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setAgregando(false);
                setError(null);
              }}
              disabled={guardando}
            >
              Cancelar
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {ayuda && !agregando && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}
