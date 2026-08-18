import { useEffect, useRef, useState } from 'react';
import { borrarBorrador, cuandoFue, guardarBorrador, leerBorrador } from '@/lib/admin/borrador';
import { ArrowLeftIcon } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import SelectorCatalogo from '@/components/admin/SelectorCatalogo';
import CamposNumericos, { type ValoresNumericos } from '@/components/admin/CamposNumericos';
import CamposTags from '@/components/admin/CamposTags';
import CamposDireccion from '@/components/admin/CamposDireccion';
import CampoMapa from '@/components/admin/CampoMapa';
import GaleriaMedia from '@/components/admin/GaleriaMedia';
import { Checkbox } from '@/components/admin/ui/checkbox';
import {
  contableDesdeDb,
  contableADb,
  montoADb,
  medidaDesdeDb,
  medidaADb,
} from '@/lib/admin/tri-estado';
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
  obtenerServicios,
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
  ambientes: null,
  dormitorios: null,
  banos: null,
  cocheras: null,
  expensas: null,
  superficie_m2: null,
  frente_m: null,
  fondo_m: null,
  calle: '',
  numero: '',
  show_exact_address: false,
  hide_location: false,
  adicionales: [],
  lat: null,
  lon: null,
};

const CONTABLE_VACIO = { noTiene: false, valor: '' };

const NUMERICOS_VACIOS: ValoresNumericos = {
  ambientes: CONTABLE_VACIO,
  dormitorios: CONTABLE_VACIO,
  banos: CONTABLE_VACIO,
  cocheras: CONTABLE_VACIO,
  expensas: CONTABLE_VACIO,
  superficie_m2: '',
  frente_m: '',
  fondo_m: '',
};

/** base -> formulario. Es donde un 0 se confundiría con un NULL. */
function numericosDesdeDb(p: DatosBasicos): ValoresNumericos {
  return {
    ambientes: contableDesdeDb(p.ambientes),
    dormitorios: contableDesdeDb(p.dormitorios),
    banos: contableDesdeDb(p.banos),
    cocheras: contableDesdeDb(p.cocheras),
    expensas: contableDesdeDb(p.expensas),
    superficie_m2: medidaDesdeDb(p.superficie_m2),
    frente_m: medidaDesdeDb(p.frente_m),
    fondo_m: medidaDesdeDb(p.fondo_m),
  };
}

/** formulario -> base. */
function numericosADb(n: ValoresNumericos) {
  return {
    ambientes: contableADb(n.ambientes),
    dormitorios: contableADb(n.dormitorios),
    banos: contableADb(n.banos),
    cocheras: contableADb(n.cocheras),
    expensas: montoADb(n.expensas),
    superficie_m2: medidaADb(n.superficie_m2),
    frente_m: medidaADb(n.frente_m),
    fondo_m: medidaADb(n.fondo_m),
  };
}

const claseTextarea =
  'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none ' +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default function FormularioPropiedad({ id }: { id?: string }) {
  const esNueva = !id;

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos>({
    tipos: [],
    localidades: [],
    barrios: [],
    servicios: [],
  });
  const [servicios, setServicios] = useState<number[]>([]);
  const [datos, setDatos] = useState<DatosBasicos>(VACIO);
  const [numericos, setNumericos] = useState<ValoresNumericos>(NUMERICOS_VACIOS);
  const [publicada, setPublicada] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  /** Cuándo se guardó el borrador que se recuperó, o `null` si no había. */
  const [borradorDe, setBorradorDe] = useState<number | null>(null);

  /**
   * Cómo quedó el formulario recién cargado. Sirve para no dejar un borrador por
   * el solo hecho de ABRIR una propiedad: si lo que hay en pantalla es igual a
   * lo que hay en la base, no hay nada que recuperar. Sin esto, cada propiedad
   * que abriera dejaría un borrador y al volver le diríamos "recuperamos lo que
   * escribiste" cuando no escribió nada.
   */
  const base = useRef<string | null>(null);
  const instantanea = (): string => JSON.stringify({ datos, numericos, servicios });

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

      let baseDatos: DatosBasicos = VACIO;
      let baseNumericos: ValoresNumericos = NUMERICOS_VACIOS;
      let baseServicios: number[] = [];

      if (id) {
        const p = await obtenerPropiedad(id);
        if (!vigente) return;
        if (!p.ok) {
          setErrorCarga(p.error);
          setCargando(false);
          return;
        }
        const { id: _i, legacy_id: _l, published, ...resto } = p.propiedad;
        baseDatos = resto;
        baseNumericos = numericosDesdeDb(resto);
        baseServicios = await obtenerServicios(id);
        if (!vigente) return;
        setPublicada(published);
      }

      setDatos(baseDatos);
      setNumericos(baseNumericos);
      setServicios(baseServicios);
      base.current = JSON.stringify({
        datos: baseDatos,
        numericos: baseNumericos,
        servicios: baseServicios,
      });

      // Si quedó trabajo sin guardar —típicamente porque cerró la sesión por
      // inactividad—, se recupera y se le avisa. No se pisa en silencio: el
      // cartel le deja volver a lo que hay en la base con un toque.
      const b = leerBorrador<{
        datos: DatosBasicos;
        numericos: ValoresNumericos;
        servicios: number[];
      }>(id);
      if (b) {
        setDatos(b.datos.datos);
        setNumericos(b.datos.numericos);
        setServicios(b.datos.servicios);
        setBorradorDe(b.guardadoEn);
      }

      setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [id]);

  /**
   * Guarda el borrador en el teléfono mientras escribe.
   *
   * Con un respiro de 600 ms para no escribir en `localStorage` en cada tecla, y
   * solo si de verdad cambió algo respecto de lo que hay en la base: si volvió
   * todo para atrás, el borrador se borra en vez de quedar dando vueltas.
   *
   * Ojo: esto NO cuenta como actividad para el cierre por inactividad. Son
   * cosas separadas a propósito — escribir sí cuenta, pero porque lo detecta el
   * `keydown`, no porque se haya guardado un borrador.
   */
  useEffect(() => {
    if (cargando || base.current === null) return;
    const actual = instantanea();
    const t = window.setTimeout(() => {
      if (actual === base.current) borrarBorrador(id);
      else guardarBorrador(id, { datos, numericos, servicios });
    }, 600);
    return () => window.clearTimeout(t);
  }, [datos, numericos, servicios, cargando, id]);

  // Los barrios se filtran por localidad. Sin localidad elegida no hay barrios
  // que ofrecer: elegir un barrio suelto no significa nada.
  const barriosDeLaLocalidad = datos.localidad_id
    ? catalogos.barrios.filter((b) => b.localidad_id === datos.localidad_id)
    : [];

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    setErrorGuardar(null);

    // Los numéricos se convierten recién acá: el formulario los guarda como
    // texto + casilla, y la base los quiere como número o NULL.
    const aGuardar: DatosBasicos = { ...datos, ...numericosADb(numericos) };

    const r = esNueva
      ? await crearPropiedad(aGuardar, servicios)
      : await actualizarPropiedad(id!, aGuardar, servicios);

    if (r.ok) {
      // Guardado con éxito: ya está en la base, el borrador local no tiene nada
      // que salvar. Si quedara, al volver le ofreceríamos "recuperar" algo que
      // ya está guardado.
      borrarBorrador(id);
      if (esNueva && 'id' in r) {
        window.location.replace(`/admin/propiedades/${r.id}?nueva=1`);
        return;
      }
      // Se arma igual que `instantanea()`, con `datos` y no con `aGuardar`:
      // `aGuardar` ya pasó por `numericosADb`, así que compararlo contra la
      // instantánea daría distinto siempre y volvería a crear un borrador.
      base.current = JSON.stringify({ datos, numericos, servicios });
      setBorradorDe(null);
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

      {/* --- Numéricos (6c) --- */}
      <CamposNumericos
        valores={numericos}
        onCambio={(v) => {
          setNumericos(v);
          setGuardado(false);
        }}
      />

      {/* --- Dirección (6d) --- */}
      <CamposDireccion
        calle={datos.calle}
        numero={datos.numero}
        showExactAddress={datos.show_exact_address}
        hideLocation={datos.hide_location}
        onCambio={(parcial) => {
          setDatos((d) => ({ ...d, ...parcial }));
          setGuardado(false);
        }}
      />

      {/* --- Fotos y video (7b) --- */}
      <GaleriaMedia propiedadId={id} />

      {/* --- Mapa (6e) --- */}
      <CampoMapa
        lat={datos.lat}
        lon={datos.lon}
        onCambio={(lat, lon) => {
          setDatos((d) => ({ ...d, lat, lon }));
          setGuardado(false);
        }}
      />

      {/* --- Servicios y adicionales (6d) --- */}
      <section className="flex flex-col gap-5 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Servicios</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {catalogos.servicios.map((s) => {
              const marcado = servicios.includes(s.id);
              return (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={marcado}
                    onCheckedChange={(v) => {
                      setServicios((prev) =>
                        v === true ? [...prev, s.id] : prev.filter((x) => x !== s.id)
                      );
                      setGuardado(false);
                    }}
                    aria-label={s.label}
                  />
                  <span>{s.label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Marcá los que tiene. Si no marcás ninguno, en la web no aparece la sección.
          </p>
        </div>

        <div className="border-t pt-4">
          <CamposTags
            valores={datos.adicionales}
            onCambio={(v) => {
              set('adicionales', v);
            }}
          />
        </div>
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
          <p className="text-xs text-muted-foreground">
            Se guarda por propiedad: podés borrarlo o escribir otra cosa según el caso.
          </p>

        </div>
      </section>

      {errorGuardar && (
        <Alert variant="destructive">
          <AlertDescription>{errorGuardar}</AlertDescription>
        </Alert>
      )}

      {/* Se recuperó trabajo sin guardar. Se le dice qué pasó y se le deja
          volver a lo que hay en la base, por si prefiere descartarlo. */}
      {borradorDe !== null && (
        <Alert>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              Recuperamos lo que habías cargado {cuandoFue(borradorDe)} y no llegó a
              guardarse. Revisalo y tocá “Guardar” para que quede.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                borrarBorrador(id);
                window.location.reload();
              }}
            >
              Descartar y volver a lo guardado
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {guardado && (
        <Alert>
          <AlertDescription>Guardado.</AlertDescription>
        </Alert>
      )}

      {/* Barra de acciones. Pegada abajo en el celular, para no tener que
          scrollear hasta el final cada vez que se quiere guardar. */}
      {/* `flex-wrap`: de 320px para arriba entra todo en una línea y el wrap
          nunca se activa. Abajo de eso, en vez de que "Publicada" se salga de la
          barra, baja a un renglón propio. */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-4">
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
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
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
