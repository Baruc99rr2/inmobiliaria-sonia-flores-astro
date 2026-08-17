import { MapPinIcon } from 'lucide-react';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Switch } from '@/components/admin/ui/switch';

/**
 * Dirección y sus dos interruptores de visibilidad.
 *
 * >>> `hide_location` oculta barrio y calle EN EL TEXTO, no el mapa. <<<
 *
 * Es una decisión explícita de la dueña (§2.2 del plan): en las propiedades con
 * ubicación reservada, el mapa se sigue mostrando apuntando a la zona real. No
 * se difumina ni se desplazan las coordenadas. El texto de ayuda se lo dice con
 * todas las letras, para que no crea que apagándolo la propiedad queda sin
 * ubicar en el mapa.
 *
 * `show_exact_address` decide únicamente si se muestra la altura de la calle.
 */
export default function CamposDireccion({
  calle,
  numero,
  showExactAddress,
  hideLocation,
  onCambio,
}: {
  calle: string;
  numero: string;
  showExactAddress: boolean;
  hideLocation: boolean;
  onCambio: (parcial: {
    calle?: string;
    numero?: string;
    show_exact_address?: boolean;
    hide_location?: boolean;
  }) => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Dirección</h2>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="calle">Calle</Label>
          <Input
            id="calle"
            value={calle}
            onChange={(e) => onCambio({ calle: e.target.value })}
            placeholder="Ej: Belgrano"
            disabled={hideLocation}
            className="disabled:bg-muted disabled:opacity-60"
          />
        </div>
        <div className="flex w-28 flex-col gap-1.5">
          <Label htmlFor="numero">Altura</Label>
          <Input
            id="numero"
            value={numero}
            onChange={(e) => onCambio({ numero: e.target.value })}
            placeholder="800"
            disabled={hideLocation}
            className="disabled:bg-muted disabled:opacity-60"
          />
        </div>
      </div>

      <label className="flex items-start gap-3">
        <Switch
          checked={showExactAddress}
          onCheckedChange={(v) => onCambio({ show_exact_address: v === true })}
          disabled={hideLocation}
          aria-label="Mostrar la altura de la calle"
        />
        <span className="text-sm">
          Mostrar la altura de la calle
          <span className="block text-xs text-muted-foreground">
            Si lo apagás, en la web se ve la calle pero no el número.
          </span>
        </span>
      </label>

      <div className="rounded-lg border border-dashed p-3">
        <label className="flex items-start gap-3">
          <Switch
            checked={hideLocation}
            onCheckedChange={(v) => onCambio({ hide_location: v === true })}
            aria-label="Reservar la ubicación"
          />
          <span className="text-sm">
            Reservar la ubicación
            <span className="block text-xs text-muted-foreground">
              No se muestran ni el barrio ni la calle. En la web dice “La dirección exacta se
              reserva”.
            </span>
          </span>
        </label>

        {hideLocation && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs leading-relaxed">
            <MapPinIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <strong>El mapa se sigue mostrando</strong>, apuntando a la zona real. Solo se
              ocultan el barrio y la calle en el texto.
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
