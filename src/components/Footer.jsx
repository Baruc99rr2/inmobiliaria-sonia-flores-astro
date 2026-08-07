import React, { useState } from 'react'
import { BsInstagram } from 'react-icons/bs'
import { FaFacebook, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from 'react-icons/fa'
import SoniaLogo from '../assets/SoniaLogo.png'; 

// Extraemos la URL en string (.src) del objeto que genera Astro
const logoUrl = SoniaLogo?.src || SoniaLogo;

const Footer = () => {
  const DEGRADEZ_CONFIG = { rojoIntensidad: "rgba(214, 69, 49, 1)" };

  const [formData, setFormData] = useState({
    nombre: '', email: '', telefono: '', ciudad: '', asunto: '', mensaje: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Estructurando correo profesional para baruc276@gmail.com:", formData);
    alert(`¡Gracias ${formData.nombre}! Tu solicitud de "${formData.asunto}" ha sido enviada con éxito.`);
    setFormData({ nombre: '', email: '', telefono: '', ciudad: '', asunto: '', mensaje: '' });
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

            <button type="submit" className='w-full bg-[#d64531] text-white font-bold uppercase text-xs tracking-wider py-2.5 rounded-md hover:bg-red-600 transition-all duration-300 shadow-md cursor-pointer' >
              Enviar Mensaje
            </button>
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
      </div>
    </div>
  )
}

export default Footer;