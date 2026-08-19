import { useState } from 'react';
import { BiChevronLeft, BiChevronRight, BiBed, BiArea, BiHomeAlt, BiCar, BiWater, BiBlanket, BiBuildingHouse, BiWifi, BiShareAlt, BiLogoWhatsapp, BiLogoFacebook, BiLogoInstagram } from 'react-icons/bi';
import { IoMdClose } from 'react-icons/io';
import { MdOutlineBathtub, MdLocationOn, MdOutlineLocalDrink, MdOutlineElectricBolt, MdOutlineGasMeter, MdFullscreen, MdInfoOutline } from 'react-icons/md';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { formatTriEstado, formatMedida, formatUbicacion, etiquetaZona } from '../lib/format';
import { estaDisponible } from '../lib/mapProperty';
import { esVideo, kindDe, SIN_FOTO } from '../lib/media';
import {
    CONFIGURACION_POR_DEFECTO,
    lineaDeContacto,
    lineaDeMatricula,
} from '../lib/configuracion-sitio';

// Las claves tienen que coincidir con los labels del catálogo `services`
// (§5.3 del plan): Agua, Luz, Gas, Cloaca, Pavimento, Wifi.
//
// Antes estaban mapeadas a nombres viejos —'Agua Potable', 'Gas Natural',
// 'Electricidad', 'Internet'— que ya no existen en el dato, así que cuatro de
// los seis servicios caían al ícono genérico de manta.
//
// La clave se normaliza a minúsculas al buscar, para que un cambio de mayúsculas
// en el catálogo no vuelva a romper el mapeo.
const serviceIcons = {
    agua: <MdOutlineLocalDrink />,
    luz: <MdOutlineElectricBolt />,
    gas: <MdOutlineGasMeter />,
    cloaca: <BiWater />,
    pavimento: <BiBuildingHouse />,
    wifi: <BiWifi />,
};

const iconoDeServicio = (nombre) =>
    serviceIcons[String(nombre ?? '').trim().toLowerCase()] ?? <BiBlanket />;

const ProductDetailsReact = ({ product, currentUrl, configuracion }) => {
    // El fallback cubre que la consulta falle: la ficha nunca puede quedarse sin
    // telefono. Una inmobiliaria sin forma de contacto es peor que una sin fotos.
    const contacto = configuracion ?? CONFIGURACION_POR_DEFECTO;
    const [currentImgIndex, setCurrentImgIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);

    if (!product) return <div className="text-center py-20 font-medium">Propiedad no encontrada.</div>;

    const coords = [
        product.detalles?.lat || -24.185,
        product.detalles?.lon || -65.300
    ];

    // `product.image` (singular) no existe en ningún dato: era un resto del
    // ecommerce. Sin propiedades cargadas quedaba `[undefined]` y el carrusel
    // renderizaba un `<img src="undefined">`. Con el uploader va a poder haber
    // propiedades recién creadas sin nada todavía, así que cae al placeholder.
    const imagesList = product.images?.length ? product.images : [SIN_FOTO];

    const prevImage = (e) => { e?.stopPropagation(); setCurrentImgIndex(prev => prev === 0 ? imagesList.length - 1 : prev - 1); };
    const nextImage = (e) => { e?.stopPropagation(); setCurrentImgIndex(prev => prev === imagesList.length - 1 ? 0 : prev + 1); };

    // Tri-estado (§2.3): NULL -> "A consultar" | 0 -> "No tiene" | n -> el número.
    // La superficie usa `formatMedida` porque no admite "No tiene": toda
    // propiedad tiene superficie, solo puede desconocerse.
    const specs = [
        { icon: <BiBuildingHouse />, label: 'Tipo', value: product.detalles?.tipo || 'A consultar' },
        { icon: <BiHomeAlt />, label: 'Ambientes', value: formatTriEstado(product.detalles?.ambientes) },
        { icon: <BiBed />, label: 'Dormitorios', value: formatTriEstado(product.detalles?.dormitorios) },
        { icon: <MdOutlineBathtub />, label: 'Baños', value: formatTriEstado(product.detalles?.banos) },
        { icon: <BiArea />, label: 'm² Cubiertos', value: formatMedida(product.detalles?.superficie_m2, 'm²') },
        { icon: <BiCar />, label: 'Cocheras', value: formatTriEstado(product.detalles?.cocheras) },
    ];

    const ubicacion = formatUbicacion(product.detalles);

    const serviciosDisponibles = product.detalles?.servicios || [];
    const serviciosGrid = serviciosDisponibles.map(servicio => ({
        icon: iconoDeServicio(servicio),
        label: servicio,
    }));

    const propertyTitle = product.name;
    const categoryUpper = product.category ? product.category.toUpperCase() : 'VENTA';
    
    // Fase 6.6: el contacto sale de la configuración, no hardcodeado acá. Antes
    // esta plantilla tenía el teléfono escrito a mano, y además la propiedad 18
    // lo repetía dentro de su descripción: al compartirla salía dos veces.
    const shareText = `INMOBILIARIA SONIA FLORES\n${categoryUpper}\n${propertyTitle}\n\n${product.description || ''}\n\n${lineaDeContacto(contacto)}\n${lineaDeMatricula(contacto)}`;

    const shareLinks = [
        { platform: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(shareText + "\n\n" + currentUrl)}`, icon: <BiLogoWhatsapp size={24} /> },
        { platform: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, icon: <BiLogoFacebook size={24} /> },
        { platform: 'Instagram', url: '#', icon: <BiLogoInstagram size={24} /> },
        { platform: 'Copiar Enlace', url: currentUrl, icon: <BiShareAlt size={24} /> },
    ];

    const handleShare = (link) => {
        if (link.platform === 'Copiar Enlace') {
            navigator.clipboard.writeText(currentUrl).then(() => alert('Enlace de la propiedad copiado al portapapeles'));
            return;
        }
        if (link.platform === 'Instagram') {
            alert('Para compartir en Instagram, copia el enlace y pégalo manualmente en tu historia.');
            return;
        }
        
        if (link.platform === 'Facebook') {
            navigator.clipboard.writeText(shareText)
                .then(() => {
                    alert('¡Texto de la propiedad copiado! Cuando se abra Facebook, mantén presionado y dale a "Pegar" en tu publicación.');
                    window.open(link.url, '_blank', 'width=600,height=400');
                })
                .catch((err) => {
                    console.error('Error al copiar el texto: ', err);
                    window.open(link.url, '_blank', 'width=600,height=400');
                });
            return;
        }

        window.open(link.url, '_blank', 'width=600,height=400');
    };

    const hasValidPrice = product.price !== undefined && product.price !== null && !isNaN(product.price) && product.price !== '';

    return (
        <div className='flex flex-col min-h-screen bg-gray-50 w-full overflow-x-hidden'>
            {/* Hero Image / Video Carrusel */}
            <div className='w-full relative bg-black h-[40vh] md:h-[65vh] cursor-pointer overflow-hidden' onClick={() => setIsFullscreen(true)}>
                <div className="flex w-full h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}>
                    {imagesList.map((file, index) => {
                        const isVideo = esVideo(file, kindDe(product, index));

                        return (
                            <div key={index} className="min-w-full h-full bg-zinc-950 relative flex items-center justify-center overflow-hidden p-4 md:p-6">
                                {!isVideo && (
                                    <>
                                        <img 
                                            src={file} 
                                            className='absolute inset-0 w-full h-full object-cover blur-3xl opacity-55 scale-110 pointer-events-none' 
                                            alt="" 
                                        />
                                        <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-md pointer-events-none"></div>
                                    </>
                                )}

                                {isVideo ? (
                                    <video 
                                        src={file} 
                                        className='relative max-w-full max-h-full object-contain z-10 rounded-lg shadow-2xl' 
                                        controls 
                                        playsInline
                                        onClick={(e) => e.stopPropagation()} 
                                    />
                                ) : (
                                    <img 
                                        src={file} 
                                        className='relative max-w-full max-h-full object-contain z-10 rounded-lg shadow-2xl' 
                                        alt={`Vista ${index + 1}`} 
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <button onClick={prevImage} className='absolute left-2 md:left-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 md:p-4 rounded-full text-white transition-colors z-20'>
                    <BiChevronLeft size={28} />
                </button>
                <button onClick={nextImage} className='absolute right-2 md:right-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 md:p-4 rounded-full text-white transition-colors z-20'>
                    <BiChevronRight size={28} />
                </button>

                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-4 py-1 rounded-full z-20">
                    {currentImgIndex + 1} / {imagesList.length}
                </div>
            </div>

            <div className='w-full max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8'>
                <div className='lg:col-span-8 space-y-6 lg:space-y-8'>
                    <div className="bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase">
                                <MdLocationOn /> {etiquetaZona(product.detalles)}
                                <span className='bg-gray-100 text-gray-600 px-3 py-1 ml-2 rounded-full text-xs font-medium'>
                                    {product.category}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                {shareLinks.map((link, i) => (
                                    <button key={i} onClick={() => handleShare(link)} className="text-gray-400 hover:text-red-600 p-2 transition-colors" title={`Compartir en ${link.platform}`}>
                                        {link.icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fase 6.6: la propiedad no se oculta cuando ya se
                            alquiló o se vendió, pero quien entra tiene que
                            enterarse ANTES de leer el precio y entusiasmarse.
                            Por eso va arriba del título y no al pie. */}
                        {!estaDisponible(product) && (
                            <div className="mb-4 flex items-start gap-3 rounded-xl border border-gray-300 bg-gray-100 p-4">
                                <MdInfoOutline className="mt-0.5 shrink-0 text-xl text-gray-600" />
                                <div>
                                    <p className="font-bold text-gray-900">
                                        Esta propiedad ya no está disponible
                                    </p>
                                    {/* Sin decir si se alquiló o se vendió: eso le
                                        sirve a un competidor y no al cliente.
                                        Ver `etiquetaEstado` en mapProperty.ts. */}
                                    <p className="mt-0.5 text-sm text-gray-600">
                                        La dejamos publicada como referencia. Escribinos y te
                                        contamos qué tenemos parecido.
                                    </p>
                                </div>
                            </div>
                        )}

                        <h1 className='text-2xl sm:text-4xl font-black text-gray-900 leading-tight mb-3'>{product.name}</h1>
                        <p className='text-2xl sm:text-3xl font-extrabold text-red-600'>
                            {hasValidPrice ? (
                                <>
                                    ${new Intl.NumberFormat('es-AR').format(product.price)}
                                    {product.category.toLowerCase() === 'alquiler' && <span className='text-base sm:text-lg font-medium text-gray-500 ml-1'>/ mes</span>}
                                </>
                            ) : (
                                "A consultar"
                            )}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {specs.map((item, i) => (
                            <div key={i} className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 flex items-start gap-3">
                                <div className="text-2xl sm:text-3xl text-red-600 mt-0.5">{item.icon}</div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">{item.label}</p>
                                    <p className="text-sm sm:text-base font-semibold text-gray-900">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-bold mb-4">Descripción</h3>
                        <p className='text-gray-600 leading-relaxed text-[15px] sm:text-lg whitespace-pre-line'>{product.description}</p>
                    </div>

                    {/* Fase 6.6: el contacto va en TODAS las fichas.
                        Antes solo la propiedad 18 lo tenía, porque estaba
                        escrito adentro de su descripción. Ahora sale de
                        `site_settings`, que la dueña edita desde Catálogos. */}
                    <div className="bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-bold mb-4">Consultá por esta propiedad</h3>
                        <p className="text-gray-600 leading-relaxed text-[15px] sm:text-lg">
                            Comunicate al{' '}
                            <a
                                href={`tel:${contacto.telefono.replace(/\s/g, '')}`}
                                className="font-bold text-red-600 hover:underline"
                            >
                                {contacto.telefono}
                            </a>
                            {contacto.horario ? `, ${contacto.horario}` : ''}.
                        </p>
                        {contacto.email && (
                            <p className="text-gray-600 leading-relaxed text-[15px] sm:text-lg mt-1">
                                O escribinos a{' '}
                                <a
                                    href={`mailto:${contacto.email}`}
                                    className="font-bold text-red-600 hover:underline"
                                >
                                    {contacto.email}
                                </a>
                                .
                            </p>
                        )}
                        <p className="text-sm text-gray-400 mt-3">
                            {lineaDeMatricula(contacto)}
                        </p>
                    </div>

                    {/* Fase 6.6: los requisitos salen de su propia columna.
                        Hasta ahora venían pegados dentro de la descripción, con
                        el "⚠️" y todo, en 10 propiedades. Se sacaron de ahí y se
                        pasaron a `requisitos` para que la dueña los edite por
                        separado y para poder darles este formato.

                        `whitespace-pre-line` porque el texto trae saltos de
                        línea reales (una viñeta por requisito). */}
                    {product.detalles?.requisitos && (
                        <div className="bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-bold mb-4">Requisitos para alquilar</h3>
                            <p className='text-gray-600 leading-relaxed text-[15px] sm:text-lg whitespace-pre-line'>
                                {product.detalles.requisitos}
                            </p>
                        </div>
                    )}

                    {serviciosGrid.length > 0 && (
                        <div className="bg-white p-5 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-bold mb-5">Servicios Incluidos</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {serviciosGrid.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                                        <div className="text-2xl text-red-600">{s.icon}</div>
                                        <span className="font-medium text-gray-800">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mapa + Dirección */}
                <div className={`lg:col-span-4 ${isFullscreen ? 'hidden lg:block' : 'block'} pt-16 lg:pt-0`}>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden lg:sticky lg:top-8">
                        <div className="h-[300px] sm:h-[380px] lg:h-[520px] w-full relative z-10 isolation-auto">
                            <MapContainer center={coords} zoom={15} className="w-full h-full z-0">
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                <Marker position={coords} icon={L.divIcon({ className: 'custom-marker', html: `<div class="w-9 h-9 bg-red-600 rounded-full border-4 border-white shadow-xl"></div>` })} />
                            </MapContainer>

                            <button 
                                onClick={() => setIsMapFullscreen(true)}
                                className="absolute top-4 right-4 bg-white/95 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg z-[450] transition-all hover:scale-105 active:scale-95"
                                type="button"
                                title="Ver mapa en pantalla completa"
                            >
                                <MdFullscreen size={28} />
                            </button>
                        </div>

                        {/* Antes esto concatenaba barrio + calle + numero sin ninguna
                            condición, y con la ubicación reservada imprimía
                            "A consultar, A consultar, Jujuy, Argentina". */}
                        <div className="p-5 flex items-start gap-3 text-gray-700 border-t border-gray-100">
                            <MdLocationOn className="text-red-600 text-2xl mt-0.5 flex-shrink-0" />
                            <div className="text-sm leading-tight">
                                <p>{ubicacion.texto}</p>
                                {ubicacion.reservada && (
                                    <p className="text-gray-500 text-xs mt-1">
                                        La dirección exacta se reserva. Consultanos y te la pasamos.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen Multimedia */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center" onClick={() => setIsFullscreen(false)}>
                    <button onClick={() => setIsFullscreen(false)} className='absolute top-6 right-6 text-white z-[510]'><IoMdClose size={40} /></button>
                    <div className="w-full h-full flex items-center justify-center p-6 md:p-10" onClick={(e) => e.stopPropagation()}>
                        <div className="flex w-full h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}>
                            {imagesList.map((file, index) => {
                                const isVideo = esVideo(file, kindDe(product, index));

                                return (
                                    <div key={index} className="min-w-full h-full flex items-center justify-center p-2">
                                        {isVideo ? (
                                            <video 
                                                src={file} 
                                                className='max-w-full max-h-full object-contain rounded-md shadow-2xl' 
                                                controls 
                                                playsInline
                                                onClick={e => e.stopPropagation()} 
                                            />
                                        ) : (
                                            <img 
                                                src={file} 
                                                className='max-w-full max-h-full object-contain rounded-md shadow-2xl' 
                                                onClick={e => e.stopPropagation()} 
                                                alt="Full" 
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <button onClick={prevImage} className='absolute left-4 md:left-8 text-white z-[510]'><BiChevronLeft size={48} /></button>
                    <button onClick={nextImage} className='absolute right-4 md:right-8 text-white z-[510]'><BiChevronRight size={48} /></button>
                </div>
            )}

            {/* Fullscreen Mapa */}
            {isMapFullscreen && (
                <div 
                    className="fixed inset-0 z-[999] bg-black/90 flex flex-col backdrop-blur-sm" 
                    onClick={() => setIsMapFullscreen(false)}
                >
                    <button 
                        onClick={() => setIsMapFullscreen(false)} 
                        className='absolute top-6 right-6 text-white hover:text-red-500 transition-colors z-[1010] bg-black/40 p-2 rounded-full'
                    >
                        <IoMdClose size={32} />
                    </button>
                    
                    <div 
                        className="flex-1 m-4 sm:m-10 bg-white rounded-2xl overflow-hidden shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MapContainer center={coords} zoom={17} className="w-full h-full">
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                            <Marker position={coords} icon={L.divIcon({ className: 'custom-marker', html: `<div class="w-12 h-12 bg-red-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center"><div class="w-5 h-5 bg-white rounded-full"></div></div>` })} />
                        </MapContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetailsReact;