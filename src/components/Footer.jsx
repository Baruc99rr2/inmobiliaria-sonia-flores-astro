import { useState } from 'react'
import { BsInstagram } from 'react-icons/bs'
import { FaFacebook, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaLock } from 'react-icons/fa'
import SoniaLogo from '../assets/SoniaLogo.png'; 
import { enviarConsulta, propiedadDeLaUrl } from '../lib/contacto';

// Extraemos la URL en string (.src) del objeto que genera Astro
const logoUrl = SoniaLogo?.src || SoniaLogo;

// FASE 8.5: se retiró Web3Forms. El mensaje va a `contact_messages` en Supabase
// y la dueña lo lee desde el panel. La variable PUBLIC_WEB3FORMS_ACCESS_KEY
// sigue en el .env a propósito, marcada como sin uso, por si hay que volver
// atrás rápido. Ver `src/lib/contacto.ts`.

const ESTADO_INICIAL = {
  nombre: '', email: '', telefono: '', ciudad: '', asunto: '', mensaje: ''
};

const Footer = () => {
  const DEGRADEZ_CONFIG = { rojoIntensidad: "rgba(214, 69, 49, 1)" };

  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok: boolean, texto: string }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;

    // Puede llegar un click (el botón es `type="button"`, ver el comentario del
    // <form>) o un submit. Desde un botón, `.form` da el formulario; desde el
    // submit, el formulario ES el currentTarget.
    const form = e.currentTarget?.form ?? e.currentTarget ?? null;

    // Al no haber botón submit, el navegador ya no valida `required` solo. Se le
    // pide explícitamente para que el visitante siga viendo los mismos avisos de
    // campo obligatorio de siempre.
    if (form?.reportValidity && !form.reportValidity()) return;

    // Honeypot: si viene con contenido, es un bot. Cortamos sin avisarle nada.
    // Sigue teniendo sentido en el cliente —su gracia es que el bot complete un
    // campo que un humano no ve—, pero el LÍMITE DE ENVÍOS ya no está acá: lo
    // hace un trigger en la base, porque un tope en JavaScript se saltea
    // abriendo la consola. Ver `scripts/fase85-contacto.sql`.
    if (form?.botcheck?.checked) return;

    setEnviando(true);
    setResultado(null);

    // Si la consulta salió desde una ficha, queda atada a esa propiedad. Se
    // saca de la URL porque este formulario vive en el layout y no sabe qué
    // página lo contiene.
    const propiedadLegacyId =
      typeof window !== 'undefined' ? propiedadDeLaUrl(window.location.pathname) : null;

    const r = await enviarConsulta({ ...formData, propiedadLegacyId });

    if (r.ok) {
      setResultado({
        ok: true,
        texto: `¡Gracias ${formData.nombre}! Recibimos tu consulta y te vamos a responder a la brevedad.`
      });
      setFormData(ESTADO_INICIAL);
    } else {
      // No limpiamos el formulario: lo que escribió tiene que seguir ahí para
      // que pueda reintentar sin volver a tipear todo.
      setResultado({ ok: false, texto: r.error });
    }

    setEnviando(false);
  };

  return (
    <div 
      id="contact" 
      className='text-white pt-8 pb-6'
      style={{ background: `linear-gradient(135deg, ${DEGRADEZ_CONFIG.rojoIntensidad} 0%, #0c0a09 45%, #000000 100%)` }}
    >
      {/* Contenedor principal */}
      <div className='max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-gray-800/60'>
        
        {/* LADO IZQUIERDO: LOGO Y FORMULARIO */}
        <div className='flex flex-col space-y-4 w-full'>
          <div className='flex flex-col items-center md:items-start'>
            <img 
              src={logoUrl} 
              alt="Sonia Flores Inmobiliaria" 
              className='h-[70px] md:h-[90px] w-auto object-contain select-none pointer-events-none'
            />
          </div>

          {/* `method="post"` y `action` vacío NO alcanzan: sin JavaScript, un
              <form> con un botón submit manda los datos por GET a la URL actual.
              Se comprobó: el nombre, el correo, el teléfono y el mensaje del
              visitante terminaron en la barra de direcciones, y de ahí van al
              historial del navegador y a los registros del servidor.
              Este formulario NO funciona sin JavaScript de ninguna manera —el
              envío lo hace React—, así que la única salida sensata es que sin JS
              no pase nada, en vez de que se filtren datos. Por eso el botón es
              `type="button"`: sin submit no hay envío nativo, y sin botón submit
              tampoco hay envío implícito al apretar Enter. */}
          <form onSubmit={handleSubmit} className='space-y-3 bg-black/30 p-4 rounded-xl border border-white/5 backdrop-blur-sm shadow-xl'>
            <h3 className='text-sm font-semibold tracking-wide border-b border-white/10 pb-1.5 mb-1'>Formulario de Contacto</h3>
            
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='flex flex-col gap-0.5'>
                <label className='text-[11px] text-gray-300 font-medium'>Nombre y Apellido *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" required className='w-full bg-stone-900/80 text-white rounded-md p-2 text-xs border border-gray-800 focus:outline-none focus:border-red-500' />
              </div>
              <div className='flex flex-col gap-0.5'>
                <label className='text-[11px] text-gray-300 font-medium'>Correo Electrónico *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ejemplo@correo.com" required className='w-full bg-stone-900/80 text-white rounded-md p-2 text-xs border border-gray-800 focus:outline-none focus:border-red-500' />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='flex flex-col gap-0.5'>
                <label className='text-[11px] text-gray-300 font-medium'>Teléfono *</label>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 3885488124" required className='w-full bg-stone-900/80 text-white rounded-md p-2 text-xs border border-gray-800 focus:outline-none focus:border-red-500' />
              </div>
              <div className='flex flex-col gap-0.5'>
                <label className='text-[11px] text-gray-300 font-medium'>Ciudad *</label>
                <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} placeholder="Ej: S. S. de Jujuy" required className='w-full bg-stone-900/80 text-white rounded-md p-2 text-xs border border-gray-800 focus:outline-none focus:border-red-500' />
              </div>
            </div>

            <div className='flex flex-col gap-0.5'>
              <label className='text-[11px] text-gray-300 font-medium'>Motivo de consulta *</label>
              <select name="asunto" value={formData.asunto} onChange={handleChange} required className='w-full bg-stone-900/90 text-white rounded-md p-2 text-xs border border-gray-800 focus:outline-none focus:border-red-500 cursor-pointer' >
                <option value="" disabled hidden>Selecciona una opción...</option>
                <option value="Soy propietario y quiero Alquilar">Soy propietario y quiero Alquilar mi propiedad</option>
                <option value="Soy propietario y quiero Vender / Tasar">Soy propietario y quiero Vender o Tasar mi propiedad</option>
                <option value="Busco una propiedad para Alquilar">Busco una propiedad para Alquilar (Inquilino)</option>
                <option value="Busco una propiedad para Comprar">Busco una propiedad para Comprar / Invertir</option>
              </select>
            </div>

            <div className='flex flex-col gap-0.5'>
              <label className='text-[11px] text-gray-300 font-medium'>Mensaje o Detalles *</label>
              <textarea name="mensaje" value={formData.mensaje} onChange={handleChange} rows="2" placeholder="Detalles del inmueble..." required className='w-full bg-stone-900/80 text-white rounded-md p-2 text-xs border border-gray-800 focus:outline-none focus:border-red-500 resize-none' ></textarea>
            </div>

            {/* Honeypot anti-spam: invisible para personas, tentador para bots. */}
            <input
              type="checkbox"
              name="botcheck"
              tabIndex="-1"
              autoComplete="off"
              aria-hidden="true"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={enviando}
              className={`w-full text-white font-bold uppercase text-xs tracking-wider py-2.5 rounded-md transition-all duration-300 shadow-md ${
                enviando
                  ? 'bg-stone-600 cursor-wait'
                  : 'bg-[#d64531] hover:bg-red-600 cursor-pointer'
              }`}
            >
              {enviando ? 'Enviando…' : 'Enviar Mensaje'}
            </button>

            {resultado && (
              <p
                role="status"
                aria-live="polite"
                className={`text-[11px] leading-snug rounded-md p-2.5 border ${
                  resultado.ok
                    ? 'bg-green-950/60 border-green-800/60 text-green-200'
                    : 'bg-red-950/60 border-red-800/60 text-red-200'
                }`}
              >
                {resultado.texto}
              </p>
            )}
          </form>
        </div>

        {/* LADO DERECHO: MAPA, DATOS Y REDES */}
        <div className='flex flex-col space-y-4 w-full pt-2 md:pt-[106px]'>
          
          {/* 1. Mapa de Google Maps */}
          <div className='w-full h-[160px] sm:h-[180px] md:h-[200px] rounded-xl overflow-hidden shadow-2xl border border-gray-800/60'>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d909.8806999227825!2d-65.30947393042678!3d-24.188463075288798!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x941b0f40afb13253%3A0xcac02626db062985!2sIndependencia%201167%2C%20Y4600%20San%20Salvador%20de%20Jujuy%2C%20Jujuy!5e0!3m2!1ses-419!2sar!4v1782938575020!5m2!1ses-419!2sar"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="Sonia Flores Inmobiliaria Ubicación"
              className="grayscale invert opacity-75 hover:grayscale-0 hover:invert-0 hover:opacity-100 transition-all duration-500"
            ></iframe>
          </div>

          {/* 2. Bloque de Datos de Contacto Compacto */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-3 rounded-xl border border-gray-800/40 text-left w-full backdrop-blur-sm text-xs'>
            {/* Dirección */}
            <div className='flex items-center gap-2'>
              <FaMapMarkerAlt className='text-red-500 shrink-0 text-sm' />
              <div>
                <p className='text-white font-medium'>Independencia 1172</p>
                <p className='text-[10px] text-gray-500'>Ubicación</p>
              </div>
            </div>

            {/* Teléfono */}
            <div className='flex items-center gap-2 sm:border-l sm:border-gray-800/40 sm:pl-3'>
              <FaPhoneAlt className='text-red-500 shrink-0 text-xs' />
              <div>
                <a href="tel:+5438854881245" className='text-white font-medium hover:text-red-400 transition-colors'>+54 9 388 54881245</a>
                <p className='text-[10px] text-gray-500'>Lunes a Viernes</p>
              </div>
            </div>

            {/* Email */}
            <div className='flex items-center gap-2 sm:border-l sm:border-gray-800/40 sm:pl-3'>
              <FaEnvelope className='text-red-500 shrink-0 text-xs' />
              <div>
                <p className='text-white font-medium truncate max-w-[140px]' title="baruc276@gmail.com">baruc276@gmail.com</p>
                <p className='text-[10px] text-gray-500'>Soporte / Consultas</p>
              </div>
            </div>
          </div>
          
          {/* 3. Redes Sociales */}
          <div className='flex justify-center md:justify-start space-x-5 pt-1 items-center'>
            <a href="https://www.facebook.com/profile.php?id=100063523751546&sk=reels_tab" target="_blank" rel="noopener noreferrer">
              <FaFacebook className='text-xl cursor-pointer hover:text-blue-500 transition duration-300 ' title="Visitar Facebook"/>
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
              <BsInstagram className='text-xl cursor-pointer hover:text-pink-500 transition duration-300 ' title="Visitar Instagram"/>
            </a>
          </div>
        </div>

      </div>

      {/* Copyright */}
      <div className='text-center pt-4'>
        <p className='text-gray-500 text-[11px]'>©SkyTech Jujuy 2026. Todos los derechos reservados.</p>

        {/* Acceso al panel. No se esconde: quien no es la dueña se topa con el
            login y no pasa de ahí, y esconderlo solo lograría que ella no lo
            encuentre. Lo que protege es RLS, no que el enlace sea secreto. */}
        <a
          href="/admin"
          className='inline-flex items-center gap-1.5 rounded-md bg-[#c9412e] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#b43a29]'
        >
          <FaLock className='text-[9px]' />
          Ingresar a sección administración
        </a>
      </div>
    </div>
  )
}

export default Footer;