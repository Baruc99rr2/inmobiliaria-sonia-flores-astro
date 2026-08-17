import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { AYUDA_NUMERICOS, type CampoContable } from '@/lib/admin/tri-estado';

/**
 * Los ocho campos numéricos, con el tri-estado de la §8 del plan.
 *
 * Dos grupos con reglas distintas:
 *
 *   Contables  (ambientes, dormitorios, baños, cocheras, expensas)
 *     llevan casilla "No tiene". Marcarla deshabilita el campo y guarda 0.
 *     Desmarcarla lo vacía y guarda NULL.
 *
 *   Medidas    (superficie, frente, fondo)
 *     NO llevan casilla: toda propiedad tiene superficie, solo puede
 *     desconocerse. Vacío = "A consultar".
 *
 * Un campo vacío no es un error: no hay validación, ni advertencia, ni
 * confirmación.
 */

export type ValoresNumericos = {
  ambientes: CampoContable;
  dormitorios: CampoContable;
  banos: CampoContable;
  cocheras: CampoContable;
  expensas: CampoContable;
  superficie_m2: string;
  frente_m: string;
  fondo_m: string;
};

type ClaveContable = 'ambientes' | 'dormitorios' | 'banos' | 'cocheras' | 'expensas';
type ClaveMedida = 'superficie_m2' | 'frente_m' | 'fondo_m';

const CONTABLES: Array<{ clave: ClaveContable; etiqueta: string; decimal?: boolean; prefijo?: string }> = [
  { clave: 'ambientes', etiqueta: 'Ambientes' },
  { clave: 'dormitorios', etiqueta: 'Dormitorios' },
  { clave: 'banos', etiqueta: 'Baños' },
  { clave: 'cocheras', etiqueta: 'Cocheras' },
  { clave: 'expensas', etiqueta: 'Expensas', decimal: true, prefijo: '$' },
];

const MEDIDAS: Array<{ clave: ClaveMedida; etiqueta: string; unidad: string }> = [
  { clave: 'superficie_m2', etiqueta: 'Superficie', unidad: 'm²' },
  { clave: 'frente_m', etiqueta: 'Frente', unidad: 'm' },
  { clave: 'fondo_m', etiqueta: 'Fondo', unidad: 'm' },
];

export default function CamposNumericos({
  valores,
  onCambio,
}: {
  valores: ValoresNumericos;
  onCambio: (v: ValoresNumericos) => void;
}) {
  const setContable = (clave: ClaveContable, parcial: Partial<CampoContable>) =>
    onCambio({ ...valores, [clave]: { ...valores[clave], ...parcial } });

  const setMedida = (clave: ClaveMedida, v: string) => onCambio({ ...valores, [clave]: v });

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Ambientes y medidas</h2>

      <div className="flex flex-col gap-3">
        {CONTABLES.map(({ clave, etiqueta, decimal, prefijo }) => {
          const campo = valores[clave];
          return (
            <div key={clave} className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor={`num-${clave}`}>{etiqueta}</Label>
                <div className="relative">
                  {prefijo && (
                    <span
                      className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm ${
                        campo.noTiene ? 'text-muted-foreground/50' : 'text-muted-foreground'
                      }`}
                    >
                      {prefijo}
                    </span>
                  )}
                  <Input
                    id={`num-${clave}`}
                    type="number"
                    inputMode={decimal ? 'decimal' : 'numeric'}
                    min={0}
                    step={decimal ? '0.01' : '1'}
                    value={campo.valor}
                    onChange={(e) => setContable(clave, { valor: e.target.value })}
                    disabled={campo.noTiene}
                    placeholder={campo.noTiene ? 'No tiene' : 'A consultar'}
                    className={`${prefijo ? 'pl-6' : ''} disabled:bg-muted disabled:opacity-60`}
                  />
                </div>
              </div>

              <label className="flex h-9 shrink-0 items-center gap-2 text-sm">
                <Checkbox
                  checked={campo.noTiene}
                  onCheckedChange={(v) =>
                    // Al marcar, se vacía el campo: si quedara el número viejo,
                    // desmarcar más tarde lo reviviría sin que ella lo escriba.
                    setContable(clave, { noTiene: v === true, valor: '' })
                  }
                  aria-label={`${etiqueta}: no tiene`}
                />
                <span>No tiene</span>
              </label>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <div className="flex flex-col gap-3">
          {MEDIDAS.map(({ clave, etiqueta, unidad }) => (
            <div key={clave} className="flex flex-col gap-1.5">
              <Label htmlFor={`num-${clave}`}>
                {etiqueta} <span className="text-muted-foreground">({unidad})</span>
              </Label>
              <Input
                id={`num-${clave}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={valores[clave]}
                onChange={(e) => setMedida(clave, e.target.value)}
                placeholder="A consultar"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Estos tres no llevan “No tiene”: toda propiedad tiene medidas, lo que puede pasar es
          que no las sepas.
        </p>
      </div>

      {/* El texto de ayuda fijo que pide la §8. */}
      <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed">{AYUDA_NUMERICOS}</p>
    </section>
  );
}
