import { useEffect, useState } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import SelectorCatalogo from '@/components/admin/SelectorCatalogo';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Switch } from '@/components/admin/ui/switch';
import { Alert, AlertDescription } from '@/components/admin/ui/alert';
import { Skeleton } from '@/components/admin/ui/skeleton';
import {
  cargarCatalogos,
  agregarTipo,
  agregarLocalidad,
  agregarBarrio,
  type Catalogos,
} from '@/lib/admin/catalogos';
import {
  obtenerPropiedad,
  crearPropiedad,
  actualizarPropiedad,
  REQUISITOS_ESTANDAR,
  type DatosBasicos,
} from '@/lib/admin/guardar';

/**
 * Formulario de propiedad — Fase 6b: textos, selects y precio.
 *
 * Los numéricos (6c), servicios y dirección (6d) y el mapa (6e) se agregan
 * después. Mientras tanto **el guardado solo toca las claves de esta pantalla**,
 * así que editar una propiedad existente no pisa lo que cargó la migración.
 *
 * Regla del proyecto: un campo vacío NO es un error. Solo se exigen título y
 * operación.
 */

const VACIO: DatosBasicos = {
  name: '',
  description: '',
  requisitos: '',
  operation: 'alquiler',
  property_type_id: null,
  localidad_id: null,
  neighborhood_id: null,
  price: null,
  show_price: true,
  price_from: false,
};

const claseTextarea =
  'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none ' +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default function FormularioPropiedad({ id }: { id?: string }) {
  const esNueva = !id;

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos>({ tipos: [], localidades: [], barrios: [] });
  const [datos, setDatos] = useState<DatosBasicos>(VACIO);
  const [publicada, setPublicada] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const set = <K extends keyof DatosBasicos>(k: K, v: DatosBasicos[K]) => {
    setDatos((d) => ({ ...d, [k]: v }));
    setGuardado(false);
  };

  useEffect(() => {
    let vigente = true;
    (async () => {
      const cat = await cargarCatalogos();
      if (!vigente) return;
      if (!cat.ok) {
        setErrorCarga(cat.error);
        setCargando(false);
        return;
      }
      setCatalogos(cat.catalogos);

      if (id) {
        const p = await obtenerPropiedad(id);
        if (!vigente) return;
        if (!p.ok) {
          setErrorCarga(p.error);
          setCargando(false);
          return;
        }
        const { id: _i, legacy_id: _l, published, ...resto } = p.propiedad;
        setDatos(resto);
        setPublicada(published);
      }
      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [id]);

  // Los barrios se filtran por localidad. Sin localidad elegida no hay barrios
  // que ofrecer: elegir un barrio suelto no significa nada.
  const barriosDeLaLocalidad = datos.localidad_id
    ? catalogos.barrios.filter((b) => b.localidad_id === datos.localidad_id)
    : [];

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    setErrorGuardar(null);

    const r = esNueva ? await crearPropiedad(datos) : await actualizarPropiedad(id!, datos);

    if (r.ok) {
      if (esNueva && 'id' in r) {
        window.location.replace(`/admin/propiedades/${r.id}?nueva=1`);
        return;
      }
      setGuardado(true);
    } else {
      setErrorGuardar(r.error);
    }
    setGuardando(false);
  };

  const titulo = esNueva ? 'Nueva propiedad' : 'Editar propiedad';

  const contenido = cargando ? (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  ) : errorCarga ? (
    <Alert variant="destructive">
      <AlertDescription>{errorCarga}</AlertDescription>
    </Alert>
  ) : (
    <form
      className="flex max-w-2xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
      noValidate
    >
      {/* --- Qué es --- */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Datos principales</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            value={datos.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Departamento de 2 dormitorios en Barrio Centro"
          />
          <p className="text-xs text-muted-foreground">
            Es lo primero que ve quien busca. Lo único obligatorio junto con la operación.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">¿Qué querés hacer con esta propiedad?</legend>
          <div className="flex gap-2">
            {(['alquiler', 'venta'] as const).map((op) => (
              <label
                key={op}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  datos.operation === op ? 'border-primary bg-primary/10 font-medium' : 'border-input'
                }`}
              >
                <input
                  type="radio"
                  name="operacion"
                  value={op}
                  checked={datos.operation === op}
                  onChange={() => set('operation', op)}
                  className="sr-only"
                />
                {op === 'alquiler' ? 'Alquilarla' : 'Venderla'}
              </label>
            ))}
          </div>
        </fieldset>

        <SelectorCatalogo
          id="tipo"
          etiqueta="Tipo de propiedad"
          opciones={catalogos.tipos}
          valor={datos.property_type_id}
          onCambio={(v) => set('property_type_id', v)}
          placeholderNuevo="Nombre del tipo nuevo (ej: Cochera)"
          onAgregar={async (label) => {
            const r = await agregarTipo(label, catalogos.tipos.map((t) => t.slug));
            if (r.ok) {
              setCatalogos((c) => ({ ...c, tipos: [...c.tipos, r.tipo] }));
              set('property_type_id', r.tipo.id);
            }
            return r;
          }}
        />
      </section>

      {/* --- Dónde --- */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Ubicación</h2>

        <SelectorCatalogo
          id="localidad"
          etiqueta="Localidad"
          opciones={catalogos.localidades}
          valor={datos.localidad_id}
          onCambio={(v) => {
            set('localidad_id', v);
            set('neighborhood_id', null); // el barrio anterior es de otra localidad
          }}
          placeholderNuevo="Nombre de la localidad nueva"
          onAgregar={async (label) => {
            const r = await agregarLocalidad(label, catalogos.localidades.map((l) => l.slug));
            if (r.ok) {
              setCatalogos((c) => ({ ...c, localidades: [...c.localidades, r.localidad] }));
              set('localidad_id', r.localidad.id);
              set('neighborhood_id', null);
            }
            return r;
          }}
        />

        <SelectorCatalogo
          id="barrio"
          etiqueta="Barrio"
          opciones={barriosDeLaLocalidad}
          valor={datos.neighborhood_id}
          onCambio={(v) => set('neighborhood_id', v)}
          placeholderNuevo="Nombre del barrio nuevo"
          deshabilitado={!datos.localidad_id}
          motivoDeshabilitado="Elegí primero una localidad."
          textoVacio={
            datos.localidad_id && barriosDeLaLocalidad.length === 0
              ? 'Esta localidad no tiene barrios cargados'
              : 'Sin especificar'
          }
          onAgregar={async (label) => {
            const r = await agregarBarrio(
              label,
              datos.localidad_id!,
              catalogos.barrios.map((b) => b.slug)
            );
            if (r.ok) {
              setCatalogos((c) => ({ ...c, barrios: [...c.barrios, r.barrio] }));
              set('neighborhood_id', r.barrio.id);
            }
            return r;
          }}
        />
      </section>

      {/* --- Precio --- */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Precio</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="precio">Precio en pesos</Label>
          <Input
            id="precio"
            type="number"
            inputMode="numeric"
            min={0}
            value={datos.price ?? ''}
            onChange={(e) => set('price', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="Dejalo vacío si es a consultar"
          />
          <p className="text-xs text-muted-foreground">
            Si lo dejás vacío, en la web aparece “A consultar”.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <Switch
            checked={datos.show_price}
            onCheckedChange={(v) => set('show_price', v === true)}
            aria-label="Mostrar el precio en la web"
          />
          <span className="text-sm">
            Mostrar el precio en la web
            <span className="block text-xs text-muted-foreground">
              Si lo apagás, la propiedad aparece como “A consultar” aunque tenga precio cargado.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <Switch
            checked={datos.price_from}
            onCheckedChange={(v) => set('price_from', v === true)}
            aria-label="El precio es desde"
          />
          <span className="text-sm">
            El precio es “desde”
            <span className="block text-xs text-muted-foreground">
              Para cuando hay varias unidades y este es el valor más bajo.
            </span>
          </span>
        </label>
      </section>

      {/* --- Textos --- */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Descripción</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            rows={7}
            value={datos.description}
            onChange={(e) => set('description', e.target.value)}
            className={claseTextarea}
            placeholder="Contá cómo es la propiedad: ambientes, estado, qué la hace linda…"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="requisitos">Requisitos para alquilar</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() =>
                set(
                  'requisitos',
                  datos.requisitos.trim()
                    ? `${datos.requisitos.trim()}\n${REQUISITOS_ESTANDAR}`
                    : REQUISITOS_ESTANDAR
                )
              }
            >
              Insertar texto estándar
            </Button>
          </div>
          <textarea
            id="requisitos"
            rows={3}
            value={datos.requisitos}
            onChange={(e) => set('requisitos', e.target.value)}
            className={claseTextarea}
            placeholder="Dejalo vacío si esta propiedad no tiene requisitos"
          />
        </div>
      </section>

      {errorGuardar && (
        <Alert variant="destructive">
          <AlertDescription>{errorGuardar}</AlertDescription>
        </Alert>
      )}

      {guardado && (
        <Alert>
          <AlertDescription>Guardado.</AlertDescription>
        </Alert>
      )}

      {/* Barra de acciones. Pegada abajo en el celular, para no tener que
          scrollear hasta el final cada vez que se quiere guardar. */}
      <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-4">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : esNueva ? 'Crear como borrador' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => (window.location.href = '/admin')}
          disabled={guardando}
        >
          Volver
        </Button>

        {!esNueva && (
          <span className="ml-auto text-xs text-muted-foreground">
            {publicada ? 'Publicada' : 'Borrador'}
          </span>
        )}
      </div>

      {esNueva && (
        <p className="text-xs text-muted-foreground">
          Se guarda como borrador: no se ve en la web hasta que la publiques desde el listado.
        </p>
      )}
    </form>
  );

  return (
    <AdminGuard>
      <AdminShell seccionActiva="propiedades" titulo={titulo}>
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/admin')}>
            <ArrowLeftIcon />
            Volver al listado
          </Button>
        </div>
        {contenido}
      </AdminShell>
    </AdminGuard>
  );
}
