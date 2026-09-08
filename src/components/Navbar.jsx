import { useEffect, useRef, useState } from 'react';
import { BiMenu, BiX } from 'react-icons/bi';

// IMPORTACIÓN DE LOS DOS LOGOS
import SoniaLogo from '../assets/SoniaLogo.png';
import SoniaLogo2 from '../assets/SoniaLogo2.png';

/**
 * El corte entre el menú de escritorio y el de celular.
 *
 * Está acá y no en un `windowWidth < 1217` porque el ancho de la ventana no
 * existe en el servidor: antes se arrancaba con 1200 fijo, así que el HTML que
 * salía del servidor SIEMPRE traía el menú de escritorio y recién al hidratar
 * React lo cambiaba por el hamburguesa. En un celular eso es un salto visible
 * en cada carga. Ahora deciden las media queries de CSS, que el navegador aplica
 * antes de pintar y sin JavaScript de por medio.
 */
const CORTE_ESCRITORIO = '(min-width: 1217px)';

/** @param {{ pathname?: string }} props */
const Navbar = ({ pathname = '' }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeMobileItem, setActiveMobileItem] = useState(null);
  const navRef = useRef(null);

  // La ruta la manda `Layout.astro`, que la conoce en el servidor. Antes se leía
  // en un efecto y arrancaba vacía, y como el vacío contaba como "home", toda
  // página que no fuera la home pintaba el navbar transparente durante un frame
  // y después saltaba a rojo.
  const currentPath = pathname;

  // ==========================================
  // PARÁMETROS CONFIGURABLES DE DISEÑO
  // ==========================================
  //
  // Los tamaños pasaron de valores sueltos en `style` a clases de Tailwind con
  // el prefijo `min-[1217px]:` para escritorio. Son los mismos números de antes;
  // lo que cambia es QUIÉN elige entre celular y escritorio: ahora el CSS, y no
  // un ancho de ventana leído en JavaScript que el servidor no puede conocer.
  const LOGO_SIZE = {
    expandido: "w-[180px] h-[80px] min-[1217px]:h-[90px]",   // 80px celular / 90px escritorio
    comprimido: "w-[80px] h-[50px] min-[1217px]:h-[70px]",   // 50px celular / 70px escritorio
  };

  // El escritorio comprimido va SIN padding vertical, y es a propósito.
  //
  // Acá había un `py-1.3`, que no es una clase válida de Tailwind y nunca generó
  // CSS: o sea que el navbar de escritorio venía sin padding desde siempre, solo
  // que por accidente. Comparando las dos versiones en pantalla, el logo trae su
  // propio margen dentro del PNG y queda equilibrado sin agregar nada (~10px de
  // rojo arriba y ~12px abajo); con 6px el navbar crece 12px y no se ve mejor.
  // Así que se saca la clase rota y el cero queda escrito de forma explícita, en
  // vez de depender de que una clase no exista.
  const NAVBAR_PADDING = {
    expandido: "py-3",
    comprimido: "py-1 min-[1217px]:py-0",
  };
  // ==========================================

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Publica el alto real del navbar en `--navbar-h`.
   *
   * El navbar es `fixed`, así que no ocupa lugar en el flujo y el contenido de
   * las páginas le arranca por debajo. En la home eso es a propósito —el navbar
   * es transparente sobre el video—, pero en la ficha de propiedad el navbar es
   * rojo opaco y le tapaba la parte de arriba a la foto de portada.
   *
   * Se mide en vez de escribir un número fijo porque el alto sale de
   * `LOGO_SIZE` + `NAVBAR_PADDING`, que están pensados para tocarse a ojo. Con
   * un `pt-[100px]` escrito a mano, la próxima vez que alguien agrande el logo
   * el corte vuelve en silencio.
   *
   * SOLO se publica con la página arriba de todo. El navbar se achica ~20px al
   * scrollear (logo de 90px a 70px), y si el padding siguiera ese cambio en
   * vivo, la página entera se desplazaría hacia arriba mientras uno scrollea.
   * Lo que hace falta es el alto expandido, que es el que tapa la portada.
   */
  useEffect(() => {
    const nodo = navRef.current;
    if (!nodo) return;

    const publicar = () => {
      // 50 es el mismo umbral que usa `handleScroll` para decidir si el navbar
      // está comprimido.
      if (window.scrollY > 50) return;
      document.documentElement.style.setProperty(
        '--navbar-h',
        `${Math.round(nodo.getBoundingClientRect().height)}px`
      );
    };

    publicar();
    const observador = new ResizeObserver(publicar);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  /**
   * Si estamos en el menú hamburguesa. Se consulta en el momento del clic, no
   * al renderizar: acá sí hay navegador y no hay riesgo de desajuste.
   */
  const enModoMovil = () => !window.matchMedia(CORTE_ESCRITORIO).matches;

  // Función para ir a Búsqueda con filtro de categoría (Venta / Alquiler)
  const navigateToSearch = (category = null, itemName = null) => {
    const esMovil = enModoMovil();
    if (esMovil && itemName) {
      setActiveMobileItem(itemName);
    }

    setTimeout(() => {
      setIsOpen(false);
      setActiveMobileItem(null);

      if (category) {
        // Redirige pasando el estado por Query Params de la URL
        window.location.href = `/busqueda?estado=${encodeURIComponent(category)}`;
      } else {
        window.location.href = '/busqueda';
      }
    }, esMovil && itemName ? 250 : 0);
  };

  const scrollToSection = (id, itemName = null) => {
    const esMovil = enModoMovil();
    if (esMovil && itemName) {
      setActiveMobileItem(itemName);
    }

    setTimeout(() => {
      setIsOpen(false);
      setActiveMobileItem(null);

      // Si no está en la Home, primero viaja a la Home
      if (id === 'home' && currentPath !== '/') {
        window.location.href = '/';
        return;
      }

      if (currentPath !== '/') {
        window.location.href = `/#${id}`;
      } else {
        executeScroll(id);
      }
    }, esMovil && itemName ? 250 : 0);
  };

  const executeScroll = (id) => {
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const offset = element.offsetTop - 80; 
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  // Sin el `|| currentPath === ''` de antes: si por lo que sea no llega la ruta,
  // el valor seguro es NO ser la home. El navbar rojo se lee sobre cualquier
  // fondo; el transparente sobre una página clara no se lee.
  const isHomePage = currentPath === '/';
  const isTransparentActive = isHomePage && !isScrolled;

  const currentPadding = isTransparentActive
    ? NAVBAR_PADDING.expandido
    : NAVBAR_PADDING.comprimido;

  const navbarClasses = isTransparentActive
    ? `bg-transparent ${currentPadding} text-white` 
    : `bg-[#d64531] shadow-xl ${currentPadding} text-white border-b border-white/10`;

  const navLinkDesktopClass = "relative overflow-hidden pb-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-left after:scale-x-0 after:bg-white after:transition-transform after:duration-300 after:ease-in-out hover:after:scale-x-100 cursor-pointer text-white font-normal uppercase tracking-wider text-sm lg:text-base select-none";

  const navLinkMobileClass = (itemName) => {
    const isActive = activeMobileItem === itemName;
    return `relative overflow-hidden pb-1 cursor-pointer text-white font-normal uppercase tracking-wider text-base select-none after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-white after:transition-transform after:duration-300 after:ease-in-out ${
      isActive ? "after:scale-x-100" : "after:scale-x-0"
    }`;
  };

  const renderLogoContainer = () => {
    // `isScrolled` sí puede decidirse en JavaScript sin desajuste: arranca en
    // false tanto en el servidor como en el cliente, porque toda página se abre
    // arriba de todo.
    const tamañoLogo = isScrolled ? LOGO_SIZE.comprimido : LOGO_SIZE.expandido;

    return (
      <div
        onClick={() => scrollToSection('home')}
        className={`relative flex items-center justify-center cursor-pointer select-none transition-all duration-500 ease-in-out ${tamañoLogo}`}
      >
        <img
          src={typeof SoniaLogo === 'string' ? SoniaLogo : SoniaLogo.src}
          alt="Sonia Flores Inmobiliaria"
          className={`absolute max-w-full max-h-full object-contain transition-all duration-500 ease-in-out ${
            isScrolled ? "opacity-0 scale-75 pointer-events-none" : "opacity-100 scale-100"
          }`}
        />
        <img
          src={typeof SoniaLogo2 === 'string' ? SoniaLogo2 : SoniaLogo2.src}
          alt="Sonia Flores"
          className={`absolute max-w-full max-h-full object-contain transition-all duration-500 ease-in-out ${
            isScrolled ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
          }`}
        />
      </div>
    );
  };

  return (
    <div>
      <nav ref={navRef} className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-in-out ${navbarClasses} px-6 md:px-12 lg:px-16`}>
        {/* Una sola fila para los dos modos. El logo se renderiza UNA vez y las
            listas de links aparecen o no según el ancho: en escritorio queda
            [links] [logo] [links]; en celular, con las listas ocultas y el
            hamburguesa visible, el mismo `justify-between` da [logo] [botón].
            Antes había dos ramas de JSX excluyentes elegidas por `windowWidth`,
            que es justo lo que producía el salto al hidratar. */}
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">

          <ul className="hidden min-[1217px]:flex items-center space-x-6 lg:space-x-8 w-1/2 justify-end pr-6 lg:pr-10">
            <li onClick={() => navigateToSearch('Venta')} className={navLinkDesktopClass}>
              Ventas
            </li>
            <li onClick={() => navigateToSearch('Alquiler')} className={navLinkDesktopClass}>
              Alquiler
            </li>
            <li onClick={() => navigateToSearch(null)} className={navLinkDesktopClass}>
              Búsqueda
            </li>
          </ul>

          {renderLogoContainer()}

          <ul className="hidden min-[1217px]:flex items-center space-x-6 lg:space-x-8 w-1/2 justify-start pl-6 lg:pl-10">
            <li onClick={() => scrollToSection('about-section')} className={navLinkDesktopClass}>
              Sobre Mí
            </li>
            <li onClick={() => scrollToSection('services')} className={navLinkDesktopClass}>
              Nuestros Servicios
            </li>
            <li onClick={() => scrollToSection('contact')} className={navLinkDesktopClass}>
              Contacto
            </li>
          </ul>

          {/* Botón hamburguesa: solo por debajo del corte. */}
          <button
            type="button"
            aria-label={isOpen ? 'Cerrar el menú' : 'Abrir el menú'}
            aria-expanded={isOpen}
            className="min-[1217px]:hidden text-3xl focus:outline-none transition-transform duration-200 active:scale-95 text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <BiX /> : <BiMenu />}
          </button>

          {/* MENÚ MÓVIL */}
          <div className={`min-[1217px]:hidden absolute top-full left-0 w-full bg-[#d64531] shadow-2xl transition-all duration-300 flex flex-col items-center space-y-6 py-8 border-t border-white/10 ${
            isOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 pointer-events-none"
          }`}>
            <div className="flex flex-col items-center gap-5 w-auto">
              <span onClick={() => scrollToSection('home', 'inicio')} className={navLinkMobileClass('inicio')}>Inicio</span>
              <span onClick={() => navigateToSearch('Venta', 'ventas')} className={navLinkMobileClass('ventas')}>Ventas</span>
              <span onClick={() => navigateToSearch('Alquiler', 'alquiler')} className={navLinkMobileClass('alquiler')}>Alquiler</span>
              <span onClick={() => navigateToSearch(null, 'busqueda')} className={navLinkMobileClass('busqueda')}>Búsqueda</span>
              <span onClick={() => scrollToSection('about-section', 'about')} className={navLinkMobileClass('about')}>Sobre Mí</span>
              <span onClick={() => scrollToSection('services', 'services')} className={navLinkMobileClass('services')}>Nuestros Servicios</span>
              <span onClick={() => scrollToSection('contact', 'contact')} className={navLinkMobileClass('contact')}>Contacto</span>
            </div>
          </div>

        </div>
      </nav>
    </div>
  );
};

export default Navbar;