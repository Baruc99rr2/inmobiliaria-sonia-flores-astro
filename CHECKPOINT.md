# CHECKPOINT — antes del sistema de alquileres

Fecha: 8 de septiembre de 2026 · `main` en `6a71964` · desplegado y verificado en
producción.

Este documento es un mapa, no un plan de trabajo. Sirve para saber dónde estamos
parados antes de arrancar con lo grande.

---

## ESTADO ACTUAL

### Sitio público

Funciona y está en producción.

| | Estado |
|---|---|
| Home, búsqueda y fichas de propiedad | Leen de Supabase, con `data.jsx` como respaldo de solo lectura si la consulta falla |
| Filtros de búsqueda | Por operación, localidad, barrio, tipo, estado y palabra clave |
| Mapa de resultados y mapa de la ficha | Leaflet con tiles de CARTO, clave cargada en los tres entornos de Vercel |
| Formulario de contacto | Guarda en `contact_messages`. Ya no depende de Web3Forms |
| Tri-estado en los datos | `NULL` = "A consultar", `0` = "No tiene", `n` = el número |
| `hide_location` | Oculta barrio y calle en el texto, nunca el mapa |
| SEO | Canónicas, Open Graph, 404 reales y 503 con `Retry-After` cuando Supabase se cae |
| Rendimiento en celular | Peso del home de 10,2 MB a 4,8 MB; hilo principal de 17,8 s a 11,4 s; LCP de 10,9 s a 5,2 s |
| Diseño | "Sobre Mí" y "Nuestros Servicios" rediseñados; glassmorphism solo donde hay mouse |

**Cómo saber de dónde salieron los datos de una respuesta:**
`curl -sI <url> | grep -i x-datos-origen` → `supabase` o `fallback-data-jsx`.

### Panel de administración

Funciona y está en producción, en `/admin`.

- Alta, edición y archivado de propiedades, con todos los campos del formulario.
- Subida de fotos y videos con compresión en el navegador (WebP, máximo 1920px),
  barra de progreso, reordenamiento arrastrando y borrado que limpia el bucket.
- Mapa con marcador arrastrable para ubicar la propiedad.
- Notas privadas por propiedad, con autoguardado.
- Agenda mensual con una nota de texto libre por día.
- Bandeja de mensajes del formulario de contacto.
- Configuración del sitio: teléfono, redes, requisitos, orden de las propiedades.
- Cierre de sesión por inactividad.

### Base de datos

- Supabase Postgres, plan **Pro**.
- RLS activo en todas las tablas. **Lo que protege los datos es RLS, no el guard
  del router**, que es solo comodidad visual.
- `property_notes` y `agenda_notes` son privadas: verificado que no aparecen en
  ninguna respuesta del sitio público.
- `anon` sin `TRUNCATE`, `REFERENCES` ni `TRIGGER` (revocado en la Fase 9).
- El código de propiedad lo asigna una secuencia que arranca en 21, así que no
  hay riesgo de duplicados ni de que alguien se olvide de cargarlo.

### Infraestructura

- Hosting en Vercel, despliegue automático desde `main`.
- Backups automáticos diarios de la base, con **7 días de retención** (incluidos
  en el plan Pro).
- Respaldo manual a JSON: `node --env-file=.env scripts/respaldo-base.mjs`.
- **El bucket de Storage NO lo respalda nadie.** Ver pendientes.

---

## PENDIENTES POSTERGADOS

Ordenados por lo que pasa si nunca se hacen.

### 1. Respaldo del bucket de Storage

**Qué es:** las fotos y videos que sube la dueña viven solo en Supabase Storage.

**Por qué se postergó:** la prioridad era dejar el sitio funcionando. Se
verificó contra la documentación de Supabase que los backups de la base
explícitamente NO incluyen los objetos del Storage.

**Qué pasa si nunca se hace:** si el bucket se pierde o alguien borra algo por
error, `property_media` queda con filas apuntando a archivos que ya no existen.
Las fichas quedan sin fotos y **no hay forma de recuperarlas**. Las fotos son lo
que vende una propiedad.

**Trabajo estimado:** medio día. El plan ya está pensado: espejo incremental a
un repo privado de GitHub, aprovechando que las rutas del uploader son únicas e
inmutables (`x-upsert: false`), así que git guarda cada archivo una sola vez.

**Decisión tuya pendiente:** ¿se guardan todos los archivos para siempre, o solo
los que están en uso? Mi recomendación es guardar todo: el espacio es barato y
un borrado por error es justamente el caso que se quiere cubrir.

### 2. Automatizar el respaldo de la base

**Qué es:** hoy `scripts/respaldo-base.mjs` se corre a mano.

**Por qué se postergó:** con los backups diarios de Pro, dejó de ser urgente.

**Qué pasa si nunca se hace:** los backups de Supabase vencen a los 7 días. Un
problema que se descubra tarde —por ejemplo, un dato que se borró hace tres
semanas— ya no tiene de dónde recuperarse.

**Trabajo estimado:** dos o tres horas.

**Ojo:** el workflow tiene que vivir en el repo de RESPALDOS, no en este.
GitHub desactiva los workflows programados después de 60 días sin actividad en
el repo, y el repo de respaldos recibe un commit por corrida, así que nunca se
queda quieto.

### 3. El aviso por correo de mensajes nuevos

**Qué es:** cuando alguien escribe por el formulario, no llega ningún correo.

**Por qué se postergó:** Web3Forms lo hacía y se perdió al migrar a Supabase en
la Fase 8.5. Migrar era lo importante.

**Qué pasa si nunca se hace:** los mensajes esperan en el panel. **Si la dueña
no entra, no se entera de que alguien consultó.** En una inmobiliaria, una
consulta sin responder es un cliente perdido.

**Trabajo estimado:** medio día con un webhook de Supabase o un cron.

**Decisión tuya pendiente:** a qué dirección van los avisos. Hoy
`site_settings.email` está vacío y el contacto público sigue figurando como el
correo del dev.

### 4. Limpieza de `public/`

**Qué es:** 53 MB de fotos originales versionadas en el repo, de las cuales solo
64 se usan.

**Por qué se postergó:** 81 de las filas de `property_media` todavía apuntan a
esos archivos. No es un borrado a ciegas.

**Qué pasa si nunca se hace:** nada grave. El repo y cada despliegue cargan peso
muerto, y clonar el proyecto es más lento. No afecta a quien visita el sitio,
porque un archivo que nadie referencia no se descarga.

**Trabajo estimado:** dos horas, cuando la mayoría del media esté en el bucket.

### 5. CARTO va a retirar los tiles rasterizados

**Qué es:** el proveedor del fondo de los mapas avisó que discontinúa el
servicio. Sin fecha.

**Por qué se postergó:** no dieron plazo y hoy funciona.

**Qué pasa si nunca se hace:** el día que lo apaguen, **los cuatro mapas del
sitio se quedan sin fondo**: el marcador queda flotando sobre un cuadro gris.

**Trabajo estimado:** una o dos horas. Las cuatro URLs están centralizadas en
`src/lib/mapa-tiles.ts` a propósito, así que la migración toca un solo archivo.
Alternativas: OpenStreetMap directo, MapTiler, Stadia.

### 6. Transformaciones de imagen de Supabase, que se facturan

**Qué es:** las fotos que sube la dueña se sirven por el endpoint de
transformación de Supabase, que las redimensiona al vuelo. Se factura por
cantidad de imágenes de origen distintas.

**Por qué se postergó:** hoy son unas 21 imágenes y no mueve la aguja.

**Qué pasa si nunca se hace:** nada se rompe, pero **el costo crece con cada
propiedad que cargue la dueña** y puede aparecer una factura inesperada.

**Trabajo estimado:** revisar el consumo son 10 minutos. Si molesta, medio día:
o se pre-generan como se hizo con las fotos legacy, o se guardan dos tamaños al
momento de subir.

### 7. Costo de hidratación de React (TBT)

**Qué es:** el home hidrata todo de una con `client:load`. Al bajar el peso a la
mitad, el bloqueo medido subió de 53 ms a 116 ms.

**Por qué se postergó:** no es una regresión. Se midió y se descartó la sospecha
inicial. El TBT solo cuenta el bloqueo posterior al primer pintado, y al llegar
éste 2,4 segundos antes, el trabajo de hidratación dejó de quedar escondido
detrás de la espera de red. Trabajo total hay MENOS.

**Qué pasa si nunca se hace:** nada urgente. 116 ms está por debajo de los
200 ms que Google considera bueno. En teléfonos muy lentos puede notarse un
instante de demora antes de que responda el menú.

**Trabajo estimado:** medio día. Pasar a `client:visible` las secciones que no
necesitan ser interactivas de entrada.

### 8. Inactivity timeout del servidor de Supabase

**Qué es:** hoy el cierre por inactividad del panel es 100% del lado del
navegador.

**Por qué se postergó:** requería el plan Pro, que recién se contrató.

**Qué pasa si nunca se hace:** si alguien deja la sesión abierta en una
computadora ajena y cierra la pestaña sin salir, el token sigue vivo del lado
del servidor.

**Trabajo estimado:** 15 minutos en el panel de Supabase. Es red de fondo, no
reemplazo: para Supabase "actividad" es que se refresque el token, y
`supabase-js` lo refresca solo en segundo plano.

### 9. Restos menores

- **`data.jsx`** sigue vivo como respaldo de solo lectura. La escritura desde
  ese archivo ya está bloqueada. Es deuda deliberada, no un olvido.
- **Clave `pk_test_` de Stripe** en el historial de git, del ecommerce original.
  Es una clave pública de prueba, sin riesgo real, pero queda en el historial.
- **`ShopContext.jsx` y `AppWrapper.jsx`** ya fueron removidos en la Fase 9.

---

## CORTO PLAZO, EN ORDEN

### 1. Segundo usuario para el panel

**Qué implica:** crear `inmobiliariasoniaflores@gmail.com` en Supabase Auth. Las
políticas de RLS ya están escritas para cualquier usuario autenticado, así que
no hay que tocar la base: el panel ya funciona para más de una persona.

**Decisiones tuyas:**
- ¿Los dos usuarios ven y pueden todo, o hace falta distinguir dueña de dev?
  Hoy no hay roles. Si alcanza con que ambos puedan todo, es media hora. Si hace
  falta separar permisos, es un día y toca RLS.
- Quién define la contraseña inicial. **Yo no puedo crear la cuenta ni escribir
  contraseñas**; te paso los pasos y lo hacés vos desde el panel de Supabase.

**Riesgos:** bajo. El único cuidado es que las notas privadas y la agenda pasan
a ser visibles para ambos usuarios, porque las políticas dicen "cualquiera
autenticado". Si eso no es lo que querés, hay que hablarlo antes de crear el
usuario, no después.

### 2. Recuperación de contraseña

**Qué implica:** hoy **no existe**. Lo verifiqué: no hay ninguna llamada a
`resetPasswordForEmail` en el proyecto. Si la dueña olvida la contraseña, no
puede entrar y depende de que vos se la cambies a mano.

Hace falta: un enlace "Olvidé mi contraseña" en el login, una página para
definir la nueva, y configurar en Supabase la plantilla del correo y la URL de
redirección.

**Decisiones tuyas:**
- El texto del correo que recibe la dueña, en castellano y sin tecnicismos.
- Si querés que además haya un "cambiar contraseña" dentro del panel, para
  cambiarla sin haberla olvidado.

**Riesgos:** medio. La URL de redirección tiene que estar en la lista blanca de
Supabase o el enlace del correo lleva a una página rota. Y el correo puede caer
en spam: hay que probar con el Gmail real, no asumir.

**Trabajo estimado:** un día.

### 3. Campanita de recordatorios de la agenda

**Qué implica:** avisar en el panel sobre lo anotado en la agenda dentro de los
próximos 3 días.

**Hay un problema de diseño que hay que resolver antes de escribir código.** La
tabla `agenda_notes` guarda **un texto libre por día**: `dia` (date) es la clave
primaria y `body` es un bloque de texto. No hay eventos individuales, ni hora,
ni estado de "visto". Entonces la campanita puede decir *"tenés algo anotado
para el jueves"* y mostrar el texto completo, pero **no puede** listar eventos
sueltos, ordenarlos por hora, ni marcar uno como leído dejando los otros.

**Decisiones tuyas:**
- ¿Alcanza con la versión simple —un contador de días con notas en los próximos
  3, y al tocar se abre la agenda en ese día—? Es medio día.
- ¿O querés eventos de verdad, con hora y estado de leído? Eso es cambiar el
  modelo de datos: una tabla `agenda_eventos` con fila por evento, migrar lo que
  ya está escrito, y rehacer la pantalla de agenda. Dos o tres días, y hay que
  decidir qué pasa con las notas actuales.
- ¿"Próximos 3 días" incluye hoy? ¿Y lo vencido sin marcar?

**Riesgos:** medio-alto si se elige la segunda opción, porque migrar texto libre
a eventos estructurados no se puede hacer automáticamente sin perder información.
Mi recomendación es empezar por la simple y ver si alcanza en el uso real.

### 4. Sistema de administración de alquileres

**Qué implica:** es el más grande de todos, y por lejos. A grandes rasgos:
contratos con fechas de inicio y fin, inquilino y propietario, monto y su
actualización periódica, cobros mes a mes, estado de pago, mora, depósitos,
impuestos y expensas, y liquidación al propietario.

**Decisiones tuyas — y son muchas, por eso conviene tomarlas antes de empezar:**
- ¿Es un registro de lo que pasa, o el sistema tiene que calcular los aumentos?
  Si calcula, con qué índice y quién lo carga.
- ¿Guarda datos personales de inquilinos y propietarios? Si sí, eso cambia el
  cuidado que hay que tener: son datos de terceros, no de la inmobiliaria.
- ¿Hay que emitir algún comprobante, o alcanza con verlo en pantalla?
- ¿Cuántos contratos maneja hoy la dueña? No es lo mismo diseñar para 20 que
  para 300.
- ¿Cómo lo lleva hoy? Si hay una planilla, conviene verla antes de diseñar nada:
  va a mostrar casos reales que ninguno de los dos va a imaginar sentado acá.

**Riesgos:** alto, y de una clase distinta a todo lo anterior. Hasta ahora lo
peor que podía pasar era que una foto se viera mal. Acá se manejan **plata y
obligaciones**: un monto mal calculado o un vencimiento que no avisa tiene
consecuencias para la dueña y para terceros. Va a hacer falta más verificación,
no menos, y probablemente un período de uso en paralelo con el método actual
antes de confiarle el trabajo.

**Trabajo estimado:** no lo puedo estimar en serio hasta responder las preguntas
de arriba. Es de semanas, no de días.

---

## LO QUE NECESITO DE VOS

Todo junto, para no ir descubriéndolo de a uno.

### Decisiones

1. **Respaldo del bucket:** ¿guardamos todos los archivos para siempre o solo
   los que están en uso? (recomiendo: todos)
2. **Correo de avisos:** a qué dirección van los avisos de mensajes nuevos, y
   qué se carga en `site_settings.email` como contacto público. Hoy figura el
   correo del dev.
3. **Segundo usuario:** ¿los dos ven todo, o hace falta separar permisos? Ojo
   que las notas privadas y la agenda pasan a ser compartidas.
4. **Recuperación de contraseña:** el texto del correo, y si querés también
   "cambiar contraseña" dentro del panel.
5. **Campanita:** ¿versión simple sobre las notas de día, o eventos con hora y
   estado de leído (que implica migrar el modelo)?
6. **Alquileres:** las cinco preguntas del punto 4 de arriba.
7. **Tarjeta destacada de Servicios:** quedó en ALQUILERES. Confirmame si te
   convence ahora que lo ves en producción.

### Cosas que tenés que hacer vos, porque yo no puedo

8. **Crear el usuario** `inmobiliariasoniaflores@gmail.com` en Supabase Auth y
   definir su contraseña inicial. No creo cuentas ni manejo contraseñas.
9. **Activar el inactivity timeout** en Supabase → Auth → Sessions.
10. **Revisar el consumo** de transformaciones de imagen en el panel de Supabase
    dentro de unos meses.
11. **Volver a activar el Vercel Authentication** de los previews si lo querés
    protegido: quedó desactivado para poder medir.

### Datos que me faltan

12. **Cuántos contratos de alquiler** maneja hoy la dueña, y **cómo los lleva**.
    Si hay una planilla, verla vale más que cualquier reunión de diseño.
13. **Confirmación de la dueña** sobre el fondo de los cerros: la puso el dev,
    pero la decisión de imagen de marca es de ella.
