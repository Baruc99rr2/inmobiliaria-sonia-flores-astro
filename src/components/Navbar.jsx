import { useEffect, useState } from 'react';
import { BiMenu, BiX } from 'react-icons/bi';

// IMPORTACIÓN DE LOS DOS LOGOS
import SoniaLogo from '../assets/SoniaLogo.png';   
import SoniaLogo2 from '../assets/SoniaLogo2.png'; 

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [activeMobileItem, setActiveMobileItem] = useState(null);
  const [currentPath, setCurrentPath] = useState('');

  // ==========================================
  // PARÁMETROS CONFIGURABLES DE DISEÑO
  // ==========================================
  const LOGO_SIZE = {
    heightDesktop: "90px", 
    heightMobile: "80px",
    heightDesktopCompressed: "70px",
    heightMobileCompressed: "50px"
  };

  const NAVBAR_PADDING = {
    desktopExpanded: "py-3",  
    mobileExpanded: "py-3",
    desktopCompressed: "py-1.3", 
    mobileCompressed: "py-1"
  };
  // ==========================================

  useEffect(() => {
    // Obtenemos la ruta actual al montar
    setCurrentPath(window.location.pathname);

    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const handleResize = () => setWindowWidth(window.innerWidth);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Función para ir a Búsqueda con filtro de categoría (Venta / Alquiler)
  const navigateToSearch = (category = null, itemName = null) => {
    if (isResponsiveMode && itemName) {
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
    }, isResponsiveMode && itemName ? 250 : 0);
  };

  const scrollToSection = (id, itemName = null) => {
    if (isResponsiveMode && itemName) {
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
    }, isResponsiveMode && itemName ? 250 : 0); 
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

  const isResponsiveMode = windowWidth < 1217;
  const isHomePage = currentPath === '/' || currentPath === '';
  const isTransparentActive = isHomePage && !isScrolled;

  const currentPadding = isTransparentActive
    ? (isResponsiveMode ? NAVBAR_PADDING.mobileExpanded : NAVBAR_PADDING.desktopExpanded)
    : (isResponsiveMode ? NAVBAR_PADDING.mobileCompressed : NAVBAR_PADDING.desktopCompressed);

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
    let currentHeight = LOGO_SIZE.heightDesktop;
    if (isResponsiveMode) {
      currentHeight = isScrolled ? LOGO_SIZE.heightMobileCompressed : LOGO_SIZE.heightMobile;
    } else {
      currentHeight = isScrolled ? LOGO_SIZE.heightDesktopCompressed : LOGO_SIZE.heightDesktop;
    }

    return (
      <div 
        onClick={() => scrollToSection('home')} 
        className="relative flex items-center justify-center cursor-pointer select-none transition-all duration-500 ease-in-out"
        style={{ width: isScrolled ? "80px" : "180px", height: currentHeight }}
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
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-in-out ${navbarClasses} px-6 md:px-12 lg:px-16`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          
          {/* MODO DESKTOP */}
          {!isResponsiveMode ? (
            <div className="flex items-center justify-between w-full">
              <ul className="flex items-center space-x-6 lg:space-x-8 w-1/2 justify-end pr-6 lg:pr-10">
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

              <ul className="flex items-center space-x-6 lg:space-x-8 w-1/2 justify-start pl-6 lg:pl-10">
                <li onClick={() => scrollToSection('about-section')} className={navLinkDesktopClass}>
                  Sobre Nosotros
                </li>
                <li onClick={() => scrollToSection('services')} className={navLinkDesktopClass}>
                  Nuestros Servicios
                </li>
                <li onClick={() => scrollToSection('contact')} className={navLinkDesktopClass}>
                  Contacto
                </li>
              </ul>
            </div>
          ) : (
            // MODO MÓVIL
            <div className="flex justify-between items-center w-full">
              {renderLogoContainer()}
              <button 
                className="text-3xl focus:outline-none transition-transform duration-200 active:scale-95 text-white" 
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <BiX /> : <BiMenu />}
              </button>
            </div>
          )}

          {/* MENÚ MÓVIL */}
          {isResponsiveMode && (
            <div className={`absolute top-full left-0 w-full bg-[#d64531] shadow-2xl transition-all duration-300 flex flex-col items-center space-y-6 py-8 border-t border-white/10 ${
              isOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 pointer-events-none"
            }`}>
              <div className="flex flex-col items-center gap-5 w-auto">
                <span onClick={() => scrollToSection('home', 'inicio')} className={navLinkMobileClass('inicio')}>Inicio</span>
                <span onClick={() => navigateToSearch('Venta', 'ventas')} className={navLinkMobileClass('ventas')}>Ventas</span>
                <span onClick={() => navigateToSearch('Alquiler', 'alquiler')} className={navLinkMobileClass('alquiler')}>Alquiler</span>
                <span onClick={() => navigateToSearch(null, 'busqueda')} className={navLinkMobileClass('busqueda')}>Búsqueda</span>
                <span onClick={() => scrollToSection('about-section', 'about')} className={navLinkMobileClass('about')}>Sobre Nosotros</span>
                <span onClick={() => scrollToSection('services', 'services')} className={navLinkMobileClass('services')}>Nuestros Servicios</span>
                <span onClick={() => scrollToSection('contact', 'contact')} className={navLinkMobileClass('contact')}>Contacto</span>
              </div>
            </div>
          )}

        </div>
      </nav>
    </div>
  );
};

export default Navbar;