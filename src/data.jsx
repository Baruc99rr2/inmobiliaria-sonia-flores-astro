// ============================================================================
// SNAPSHOT CONGELADO — NO SE EDITA A MANO NI SE VUELVE A MIGRAR
// ============================================================================
//
// Esto NO es la fuente de verdad. La fuente de verdad es la base de datos.
//
// Qué es: la foto de las 20 propiedades tal como estaban el día que se cargaron
// por primera vez en Supabase. Quedó vivo por UNA sola razón: si Supabase se
// cae, los componentes públicos caen a este archivo y el sitio muestra algo en
// vez de quedar en cero. Es un fallback de LECTURA y nada más.
//
// Lo que NO hay que hacer, y por qué:
//
//   NO editarlo para "corregir" una propiedad.
//     Lo que se ve en la web sale de la base. Tocar acá no cambia nada en
//     producción y deja las dos fuentes discrepando.
//
//   NO volver a correr la migración desde acá.
//     Escribir la base desde este archivo PISA lo que cargó la dueña desde el
//     panel. Pasó dos veces: se perdieron títulos editados, y en otra ocasión
//     el precio, el tipo y la localidad de una propiedad. Por eso
//     `scripts/migrate-data.mjs` ya no puede correrse en modo escritura: aborta
//     con una explicación.
//
// Para cargar o corregir una propiedad: el panel, en /admin.
// Para restaurar tras una pérdida real de datos:
//   node --env-file=.env scripts/respaldo-base.mjs        (respaldo primero)
//   node --env-file=.env scripts/restaurar-desde-respaldo.mjs respaldos/<carpeta>
//
// Este archivo no incluye ninguna propiedad cargada después de la migración
// inicial. Si Supabase se cae, esas no van a aparecer: para ese caso está la
// página de "estamos con problemas técnicos".
// ============================================================================

export const categoryItem = [
  { category_title: "Todos", image: "/propiedades/departamento-losperales-alquiler.png"},
  { category_title: "Venta", image: "/propiedades/departamento-centro-venta.png"},
  { category_title: "Alquiler", image: "/propiedades/local-centro-alquila.png"},
];

export const productsData = [
    {
        id: 1,
        images: [
          '/propiedades/departamento-losperales-alquiler.png', 
          '/propiedades/departamento-losperales-alquila.mp4', 
        ],
        name: 'DEPARTAMENTO en Barrio Los Perales',
        price: "480000",
        category: 'Alquiler',
        description: 'Cocina , comedor, dormitorio,  antebaño baño , balcón y cochera.',
        detalles: {
            tipo: 'Departamento',
            barrio: 'Barrio Los Perales',
            cocheras: 1,
            ambientes:2,
            calle: '',
            numero: '',
            dormitorios: 1,
            banos:2,
            mostrarDireccionExacta: false,
            superficie_m2: "a consultar",
            frente_m: "a consultar",
            fondo_m: "a consultar",
            servicios: ['A consultar'],
            adicionales: ['Cochera'],
            mapaQuery: 'Barrio los Perales, San Salvador de Jujuy',
            lat: -24.16926436167806, 
            lon: -65.32529026568182,
        }
    },
    {
        id: 2, 
        images: [
        '/propiedades/casa-belgrano-alquiler.png', 
        '/propiedades/casa-belgrano-alquiler.mp4',
        '/propiedades/casa-belgrano-alquiler2.mp4',
        ],
        name: 'CASA en Calle Belgrano en Barrio Centro',
        price: "A consultar", // Al estar en 0, mostrará 'A consultar' gracias a tu lógica
        category: 'Alquiler',
        description: 'Excelente casa de dos plantas en calle Belgrano. Cuenta con recibidor, living comedor, cocina, patio, cochera y habitación de servicio. En planta alta dispone de 3 dormitorios (uno con vestidor, uno con balcón y otro con placard) y baño completo.',
        detalles: {
            tipo: 'Casa',
            barrio: 'Barrio Centro',
            cocheras: 1,
            ambientes: 6, // Recibidor, Living Comedor, Cocina + 3 Dormitorios
            calle: 'Belgrano',
            numero: '', // Se deja vacío ya que no se especifica la altura exacta
            dormitorios: 3, // Planta alta (1 con vestidor, 1 con balcón, 1 con placard) + 1 de servicio abajo
            banos: 2, // Toilette en Planta Baja y Baño completo en Planta Alta
            mostrarDireccionExacta: false,
            superficie_m2: "a consultar",
            frente_m: "a consultar",
            fondo_m: "a consultar",
            servicios: ['A consultar'],
            adicionales: ['Cochera', 'Patio', 'Balcón', 'Vestidor', 'Habitación de servicio'],
            mapaQuery: 'Calle Belgrano, San Salvador de Jujuy',
            lat: -24.185404, 
            lon: -65.304056,
            }
    },
    {
        id: 3, // Cambiá el ID según corresponda en tu array
        images: [
        '/propiedades/local-palpala-alquiler.png', 
        '/propiedades/local-palpala-alquiler.mp4',
        // Podés agregar más fotos o videos del salón acá
        ],
        name: 'SALON COMERCIAL en Palpalá',
        price: "650000", // Precio establecido en $650.000
        category: 'Alquiler',
        description: 'Excelente salón comercial de 180m² en Palpalá con baño, patio y dos habitaciones. Ideal para gimnasio, estética, salón de fiestas, emprendimientos o vivienda. Zona de fácil acceso y estacionamiento.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Local', // O 'salón' según cómo manejes tus tipos en el filtro
            barrio: 'Palpalá',
            cocheras: 0, // Se especifica zona de fácil estacionamiento afuera
            ambientes: 3, // El salón principal + las 2 habitaciones
            calle: '', // Sin especificar en los datos
            numero: '',
            dormitorios: 2, // Mapeado a las dos habitaciones que tiene
            banos: 1,
            mostrarDireccionExacta: false,
            superficie_m2: "180", // Usamos los 180m2 del dato
            frente_m: "a consultar",
            fondo_m: "a consultar",
            servicios: ['A consultar'],
            adicionales: ['Patio', 'Estacionamiento fácil'],
            mapaQuery: 'Palpalá, Jujuy',
            lat: -24.2562, // Coordenadas aproximadas del centro de Palpalá
            lon: -65.2119,
         }
    },
    {
        id: 4,
        images: [
        '/propiedades/oficina-centro-venta.png',
        '/propiedades/oficina-centro-venta-i1.png',
        '/propiedades/oficina-centro-venta-i3.png',
        '/propiedades/oficina-centro-venta-i4.png',
        '/propiedades/oficina-centro-venta-i5.png',
        '/propiedades/oficina-centro-venta-i6.png',
        '/propiedades/oficina-centro-venta-i7.png',
        '/propiedades/oficina-centro-venta-i8.png',
        '/propiedades/oficina-centro-venta-i9.png',
        ],
        name: 'Oficina céntrica con vista a la calle en Barrio Centro',
        price: 'A consultar',
        category: 'Venta',
        description: 'Excelente oficina ubicada en primer piso, con vista a la calle y emplazada en una zona céntrica. Ideal para estudios profesionales, consultorios u oficinas comerciales. Una excelente oportunidad de inversión, con opciones de entrega y financiación.',
        detalles: {
            tipo: 'Oficina',
            barrio: 'Barrio Centro',
            calle: 'Guemes y Necochea',
            numero: '',
            mostrarDireccionExacta: false,
            superficie_m2: "", 
            ambientes: 1,
            dormitorios: 0,
            banos: 1,
            servicios: ['Agua', 'Cloaca', 'Luz'],
            adicionales: [
            ],
            mapaQuery: 'Centro, San Salvador de Jujuy',
            lat: -24.182943, 
            lon: -65.304468,
    }
    },
    {
        id: 5,
        images: [
          '/propiedades/deposito-altocomedero-alquiler.png', 
          '/propiedades/deposito-altocomedero-alquiler-i1.png', 
          '/propiedades/deposito-altocomedero-alquiler-i2.png',
          '/propiedades/deposito-altocomedero-alquiler-i3.png',
          '/propiedades/deposito-altocomedero-alquiler-i4.png',
          '/propiedades/deposito-altocomedero-alquiler-i5.png',
          '/propiedades/deposito-altocomedero-alquiler-i6.png',
          '/propiedades/deposito-altocomedero-alquiler-i7.png',
          '/propiedades/deposito-altocomedero-alquiler-i8.png',
        ],
        name: 'Depósitos/Galpónes de 640 m² frente a Ruta N° 9 en Alto Comedero',
        price: "A consultar",
        category: 'Alquiler',
        description: 'Excelente depósito a estrenar con ubicación estratégica y de alta visibilidad frente a la Ruta Nacional N° 9, en Barrio Alto Comedero. El predio cuenta con un total de 640 m² cubiertos, distribuidos en dos galpones modulares. Existe la opción de fragmentar el espacio para alquilar únicamente un solo sector de 320 m², adaptándose a la medida de tu negocio. Cada módulo cuenta con salón libre, baño, kitchenette y patio privado.',
        detalles: {
            tipo: 'Galpon',
            barrio: 'Barrio Alto Comedero',
            calle: 'Ruta Nacional N° 9',
            numero: '',
            mostrarDireccionExacta: false,
            superficie_m2: 640,
            frente_m: 0,
            fondo_m: 0,
            ambientes: 1,
            banos: 1,
            expensas: 0,
            servicios: ['Agua', 'Cloaca', 'Luz', 'Pavimento'],
            adicionales: ['A estrenar', 'Kitchenette', 'Patio', 'Frente a Ruta Nacional N° 9'],
            mapaQuery: 'Ruta Nacional 9, Alto Comedero, San Salvador de Jujuy',
            lat: -24.218112,
            lon: -65.272239,
        }
    },
    {
        id: 6,
        images: [
          '/propiedades/departamento-centro-venta.png', 
          '/propiedades/departamento-centro-venta-i1.png', 
          '/propiedades/departamento-centro-venta-i2.png',
          '/propiedades/departamento-centro-venta-i3.png',
          '/propiedades/departamento-centro-venta-i4.png',
          '/propiedades/departamento-centro-venta-i5.png',
          '/propiedades/departamento-centro-venta-i6.png',
          '/propiedades/departamento-centro-venta-i7.png',
          '/propiedades/departamento-centro-venta-i8.png',
          '/propiedades/departamento-centro-venta-i9.png',
          '/propiedades/departamento-centro-venta-i10.png',
          '/propiedades/departamento-centro-venta-i11.png',
          '/propiedades/departamento-centro-venta-i12.png',
          '/propiedades/departamento-centro-venta-i13.png',
          '/propiedades/departamento-centro-venta-i14.png',
        ],
        name: 'Departamento de 1 dormitorio cerca del Parque San Martín Barrio Centro',
        price: 'A consultar',
        category: 'Venta',
        description: 'Departamento con excelente ubicación, a pocos metros del Parque San Martín. Cuenta con comedor, cocina, un dormitorio y baño. Ideal para vivienda o inversión.',
        detalles: {
            tipo: 'Departamento',
            barrio: 'Barrio Centro',
            calle: '',
            numero: '',
            mostrarDireccionExacta: false,
            superficie_m2: 0,
            ambientes: 3,
            dormitorios: 1,
            banos: 1,
            expensas: 0,
            servicios: ['Agua', 'Cloaca', 'Luz', 'Pavimento',"Gas"],
            adicionales: ['Excelente ubicación', 'Cerca del Parque San Martín'],
            mapaQuery: 'Parque San Martín, San Salvador de Jujuy',
            lat: -24.182718,
            lon: -65.315007,
        }
    },
    {
        id: 7,
        images: [
          '/propiedades/departamentos-pasaje-alquiler.png', 
          '/propiedades/departamento-pasaje-alquila.mp4', 
        ],
        name: 'Departamentos de 1 dormitorio en Pasaje El Tala Barrio Cuyaya',
        price: "400000",
        category: 'Alquiler',
        description: 'Departamento amplio y luminoso, ideal para una persona o pareja. Cuenta con un dormitorio, cocina comedor, baño y balcón. Excelente ubicación en Pasaje El Tala.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Departamento',
            barrio: 'Barrio Cuyaya',
            calle: 'Pasaje El Tala',
            numero: '',
            mostrarDireccionExacta: false,
            superficie_m2: 0,
            ambientes: 2,
            dormitorios: 1,
            banos: 1,
            expensas: 0,
            servicios: ['Agua', 'Cloaca', 'Luz', 'Pavimento',"Gas"],
            adicionales: ['Balcón', 'Amplio y luminoso', 'Ideal para una persona o pareja', 'Excelente ubicación'],
            mapaQuery: 'Pasaje El Tala, San Salvador de Jujuy',
            lat: -24.186500,
            lon: -65.297800,
        }
    },
    {
        id: 8, // Cambiá el ID según corresponda en tu array
        images: [
        '/propiedades/oficina-centro-alquiler-n2.png',
        '/propiedades/oficina-centro-alquiler-n2.mp4', 
        // Podés agregar más fotos o videos de la oficina acá
        ],
        name: 'OFICINA CÉNTRICA en Alquiler Barrio Centro',
        price: "350000", // Precio establecido en $350.000 (se le aplicará el /mes automáticamente)
        category: 'Alquiler',
        description: 'Excelente oficina céntrica, ideal para profesionales (abogados, contadores, arquitectos, etc.). Cuenta con 2 salas de espera y opción de alquilar con o sin muebles. El precio incluye servicios (WiFi, etc.).',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Oficina',
            barrio: 'Barrio Centro',
            cocheras: 0,
            ambientes: 2, // Basado en las 2 salas de espera/oficinas
            calle: '', // Zona céntrica sin especificar altura
            numero: '',
            dormitorios: 0, // Al ser de uso profesional se setea en 0
            banos: 1, // Baño estándar de oficina (o "a consultar")
            mostrarDireccionExacta: false,
            superficie_m2: "a consultar",
            frente_m: "a consultar",
            fondo_m: "a consultar",
            servicios: ['Wifi', 'Luz', 'Agua'], // Especificados en el anuncio
            adicionales: ['Opción amoblado', 'Salas de espera'],
            mapaQuery: 'Centro, San Salvador de Jujuy',
            lat: -24.1856, // Coordenadas aproximadas para el centro de San Salvador de Jujuy
            lon: -65.3032,
        }
    },
    {
        id: 9,
        images: [
          '/propiedades/departamento-losperales-alquila-n2.png', 
          '/propiedades/departamento-losperales-alquila-n2.mp4', 
        ],
        name: 'Departamento de 2 dormitorios con excelente vista Barrio Los Perales',
        price: "700000",
        category: 'Alquiler',
        description: 'Departamento con living comedor, cocina, dos dormitorios, baño, lavadero y balcón. Se destaca por su excelente vista e iluminación natural.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Departamento',
            barrio: 'Barrio Los Perales',
            calle: '',
            numero: '',
            mostrarDireccionExacta: false,
            superficie_m2: 0,
            ambientes: 4,
            dormitorios: 2,
            banos: 1,
            expensas: 0,
            servicios: ['Agua', 'Cloaca', 'Luz', 'Pavimento',"Gas"],
            adicionales: ['Lavadero', 'Balcón', 'Excelente vista', 'Iluminación natural'],
            mapaQuery: 'San Salvador de Jujuy',
            lat: -24.185786,
            lon: -65.299476,
        }
    },
    {
        id: 10,
        images: [
          '/propiedades/casa-chijra-venta.png', 
          '/propiedades/casa-chijra-venta.mp4', 
        ],
        name: 'Casa con departamento independiente a 30 m de Av. Mosconi Barrio Chijra',
        price: 'A consultar',
        category: 'Venta',
        description: 'Excelente propiedad desarrollada en dos plantas. En planta baja cuenta con living comedor, cocina comedor, dos dormitorios, habitación de usos múltiples, asador y cochera. En planta alta dispone de un departamento con entrada independiente, living comedor, amplia cocina con comedor diario, un dormitorio y baño. Todos los servicios y excelente ubicación, a solo 30 metros de Av. Mosconi.',
        detalles: {
            tipo: 'Casa',
            barrio: 'Barrio Chijra',
            calle: 'Av. Mosconi',
            numero: '',
            mostrarDireccionExacta: false,
            superficie_m2: 0,
            ambientes: 8,
            dormitorios: 3,
            banos: 2,
            expensas: 0,
            servicios: ['Agua', 'Cloaca', 'Gas', 'Luz', 'Pavimento'],
            adicionales: [
                'Departamento con entrada independiente',
                'Habitación de usos múltiples',
                'Asador',
                'Cochera',
                'Comedor diario',
                'Excelente ubicación',
                'A 30 m de Av. Mosconi'
            ],
            mapaQuery: 'Avenida Mosconi, San Salvador de Jujuy',
            lat: -24.174281946644435,
            lon: -65.30463208760564,
        }
    },
    {
        id: 11,
        images: [
          '/propiedades/hectareas-sanantonio-venta.png', 
          '/propiedades/hectareas-sanantonio-venta.mp4', 
        ],
        name: 'Terreno de 20 hectáreas en San Antonio',
        price: 'A consultar',
        category: 'Venta',
        description: 'Campo de 20 hectáreas ubicado en San Antonio, sobre El Camino Real. Superficie totalmente plana, ideal para diversos emprendimientos. Zona con gran valor cultural e histórico por ser punto de partida de la Marcha Patriótica por el Camino Real. ',
        detalles: {
            tipo: 'Terreno',
            barrio: 'San Antonio',
            calle: 'calle Camino Real',
            numero: '',
            mostrarDireccionExacta: false,
            superficie_m2: 200000,
            servicios: [],
            adicionales: [
                'Superficie totalmente plana',
                'Ideal para emprendimientos',
                'Ubicación con valor histórico y cultural'
            ],
            mapaQuery: 'Camino Real, San Antonio, Jujuy',
            lat: -24.365787548293422, 
            lon: -65.33530500933232,
        }
    },
    {
        id: 12,
        images: [
            '/propiedades/casa-santaana-alquiler.png', 
            '/propiedades/casa-santaana-alquiler.mp4',
        ],
        name: 'Amplia Casa de 3 Dormitorios',
        price: "580000", // En número sin comillas para que funcione perfecto con tus formateadores de precio
        category: 'Alquiler',
        description: 'Excelente casa familiar en alquiler ubicada en estratégica zona cercana a la empresa Santa Ana, con rápido y fácil acceso al centro y líneas de transporte. La propiedad cuenta con un cómodo living, comedor independiente, cocina funcional, 3 amplios dormitorios, 2 baños completos y un lindo patio ideal para disfrutar al aire libre.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Casa',
            barrio: 'A consultar', // Mantiene la referencia de valor sin mencionar San Isidro
            cocheras: 0, 
            ambientes: 5, // Living, comedor, y los 3 dormitorios
            calle: 'A consultar', 
            numero: '',
            dormitorios: 3,
            banos: 2,
            mostrarDireccionExacta: false,
            superficie_m2: "a consultar", 
            frente_m: "a consultar",
            fondo_m: "a consultar",
            servicios: ['Agua', 'Luz', 'Gas'],
            adicionales: ['Patio', 'Cercanía a colectivos', 'Excelente conectividad'],
            mapaQuery: 'Empresa Santa Ana, San Salvador de Jujuy, Jujuy', // Apunta el mapa a la zona de referencia
            lat: -24.190449, 
            lon: -65.284728,
        }
    },
    {
        id: 13,
        images: [
            '/propiedades/local-brown-alquiler.jpg', 
            '/propiedades/local-brown-alquiler.mp4', 
        ],
        name: 'Amplio Salón Comercial en Calle Almirante Brown',
        price: "A consultar",
        category: 'Alquiler',
        description: 'Excelente salón comercial estratégicamente ubicado sobre la calle Almirante Brown al 800, ideal para empresas automotoras o venta de productos de gran porte, zona de alto flujo.\n\nLa propiedad dispone de un amplio salón principal, oficina de gran tamaño, oficina secundaria, kitchenette, baño y antebaño.',
        detalles: {
            tipo: 'Local',
            barrio: 'Barrio Almirante Brown',
            cocheras: 0, 
            ambientes: 3, 
            calle: 'Avenida Almirante Brown', 
            numero: '800',
            dormitorios: 0,
            banos: 1,
            mostrarDireccionExacta: false,
            superficie_m2: 'a consultar', 
            frente_m: 'a consultar',
            fondo_m: 'a consultar',
            servicios: ['Agua', 'Luz'],
            adicionales: ['Salón principal amplio', 'Oficina grande', 'Oficina chica', 'Kitchenette', 'Antebaño', 'Ubicación comercial estratégica'],
            mapaQuery: 'Almirante Brown 800, San Salvador de Jujuy, Jujuy',
            lat: -24.198048, 
            lon: -65.287170,
        }
    },
    {
        id: 14,
        images: [
            '/propiedades/nave-sanpedrito-alquiler/nave-sanpedrito-alquiler.jpg', 
            '/propiedades/nave-sanpedrito-alquiler/nave-sanpedrito-alquiler.mp4'
        ],
        name: 'Amplia Nave Industrial en San Pedrito por Avenida 2 de Abril',
        price: "A consultar",
        category: 'Alquiler',
        description: 'Excelente nave versátil con posibilidad de subdividirse en 2, 3 o 4 módulos según la necesidad del emprendimiento. Ubicación estratégica sobre rotonda antes de llegar a Río Blanco, ideal para corralones, depósitos, empresas constructoras o venta de materiales de todo tipo.',
        detalles: {
            tipo: 'Nave',
            barrio: 'Barrio San Pedrito',
            cocheras: 0, 
            ambientes: 1,
            calle: 'Avenida 2 de Abril', 
            numero: '',
            dormitorios: 0,
            banos: 0,
            mostrarDireccionExacta: false,
            superficie_m2: 'a consultar', 
            frente_m: 'a consultar',
            fondo_m: 'a consultar',
            servicios: ['Agua'], 
            adicionales: ['Posibilidad de subdivisión (2, 3 o 4 módulos)', 'Apto corralón', 'Apto depósito', 'Excelente acceso para logística', 'Ubicación en rotonda'],
            mapaQuery: 'San Pedrito, Jujuy',
            lat: -24.219350, 
            lon: -65.262579,
        }
    },
    {
        id: 15,
        images: [
            '/propiedades/casa-gorriti-alquiler/gorriti-casa-alquiler.jpg',
            '/propiedades/casa-gorriti-alquiler/gorriti-casa-alquiler.mp4'
        ],
        name: 'Departamento con 2 Dormitorios en Barrio Gorriti',
        price: "620000",
        category: 'Alquiler',
        description: 'Cómodo departamento ubicada en Barrio Gorriti, a metros de la intersección de calle Uriondo y Juana Manuela Gorriti. Cuenta con dos dormitorios, living, comedor, cocina, lavadero y baño, ideal para familias que buscan una excelente ubicación y ambientes funcionales.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
                tipo: 'Departamento',
                barrio: 'Barrio Gorriti',
                cocheras: 0,
                ambientes: 3,
                calle: 'calle Uriondo',
                numero: '',
                dormitorios: 2,
                banos: 1,
                mostrarDireccionExacta: false,
                superficie_m2: 'a consultar',
                frente_m: 'a consultar',
                fondo_m: 'a consultar',
                servicios: [],
                adicionales: [
                    'Living',
                    'Comedor',
                    'Cocina',
                    'Lavadero',
                    'Ubicación cercana a Juana Manuela Gorriti'
                ],
                mapaQuery: 'Uriondo casi Juana Manuela Gorriti, Barrio Gorriti, San Salvador de Jujuy',
                lat: -24.191679,
                lon: -65.296576,
            }
    },
    {
        id: 16,
        images: [
            '/propiedades/centro-departamento-alquiler/centro-departamento-alquiler.png',
            '/propiedades/centro-departamento-alquiler/centro-departamento-alquiler.mp4'
        ],
        name: 'Departamento de 1 Dormitorio en Barrio Centro',
        price: 'A consultar',
        category: 'Alquiler',
        description: 'Amplio y luminoso departamento ubicado sobre calle Belgrano en pleno Barrio Centro. Cuenta con cocina, comedor, un dormitorio y baño completo. Posee acceso a todos los servicios básicos, ideal para quienes buscan comodidad y excelente ubicación céntrica.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Departamento',
            barrio: 'Barrio Centro',
            cocheras: 0,
            ambientes: 2,
            calle: 'calle Belgrano',
            numero: '',
            dormitorios: 1,
            banos: 1,
            mostrarDireccionExacta: false,
            superficie_m2: 'a consultar',
            frente_m: 'a consultar',
            fondo_m: 'a consultar',
            servicios: [
                'Agua',
                'Luz',
                'Gas',
                'Cloaca',
                'Pavimento',
                'Wifi'
            ],
            adicionales: [
                'Comedor',
                'Cocina',
                'Luminoso',
                'Amplios Ambientes',
                'Ubicación Céntrica'
            ],
            mapaQuery: 'Calle Belgrano, Barrio Centro, San Salvador de Jujuy',
            lat: -24.185335,
            lon: -65.302671,
        }
    },
    {
        id: 17, // O el ID que corresponda en tu sistema
        images: [
            '/propiedades/departamento-losperales-alquiler/departamento-losperales-alquiler.jpg',
            '/propiedades/departamento-losperales-alquiler/departamento-losperales-alquilervideofinal.mp4'
        ],
        name: 'Departamento de 2 Dormitorios en Barrio Los Perales',
        price: 'A consultar',
        category: 'Alquiler',
        description: 'Hermoso y pintoresco departamento de 2 dormitorios ubicado en Barrio Los Perales, a metros de la Av. Illia.\n\nCuenta con living-comedor integrado muy amplio y luminoso, cocina funcional, antebaño, baño completo y balcón. Además, el edificio dispone de terraza con asador y cochera.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Departamento',
            barrio: 'Barrio Los Perales',
            cocheras: 1,
            ambientes: 3, // Living-comedor + 2 dormitorios
            calle: '',
            numero: '',
            dormitorios: 2,
            banos: 1,
            mostrarDireccionExacta: false,
            superficie_m2: 'a consultar',
            frente_m: 'a consultar',
            fondo_m: 'a consultar',
            servicios: [
                'Agua',
                'Luz',
                'Gas',
                'Cloaca',
                'Pavimento',
                'Wifi'
            ],
            adicionales: [
                'Living Comedor',
                'Cocina',
                'Antebaño',
                'Baño Completo',
                'Balcón',
                'Cochera',
                'Terraza con Asador',
                'Luminoso',
                'Amplios Ambientes',
                'Cerca de Zona Comercial'
            ],
            mapaQuery: 'Barrio Los Perales San Salvador de Jujuy',
            lat: -24.167417,
            lon: -65.327809
        }
    },
    {
            id: 18, // O el ID que corresponda en tu sistema
            images: [
                '/propiedades/local-palpala-alquiler/local-palpala-alquiler1.jpg',
                '/propiedades/local-palpala-alquiler/local-palpala-alquiler.mp4'
            ],
            name: 'Local/locales Comerciales sobre Av. Libertad en Palpala',
            price: '200000',
            category: 'Alquiler',
            description: 'Inmobiliaria Sonia Flores alquila locales comerciales sobre Avenida Libertad al 200, Palpalá. Ideales para emprender o expandir tu negocio en una zona de constante tránsito.\n\nPrecios desde $200.000.',
            detalles: {
                requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
                tipo: 'Local',
                barrio: 'Palpalá',
                cocheras: 0,
                ambientes: 1,
                calle: 'Avenida Libertad',
                numero: '200',
                dormitorios: 0,
                banos: 1,
                mostrarDireccionExacta: true,
                superficie_m2: 'a consultar',
                frente_m: 'a consultar',
                fondo_m: 'a consultar',
                servicios: [
                    'Agua',
                    'Luz',
                    'Cloaca',
                    'Pavimento'
                ],
                adicionales: [
                    'A Estrenar',
                    'Sobre Avenida Principal',
                    'Zona Comercial',
                    'Plano Disponible'
                ],
                mapaQuery: 'Avenida Libertad 200, Palpalá, Jujuy',
                lat: -24.255143,
                lon: -65.203527
            }
    },
    {
        id: 19, 
        images: [
            '/propiedades/casa-nueva/casa-nueva.jpg',
            '/propiedades/casa-nueva/casa-nueva.mp4'
        ],
        name: 'Casa en Venta con Cochera Doble, Asador y Salida a Dos Calles',
        price: 'A consultar',
        category: 'Venta',
        description: 'Inmobiliaria Sonia Flores vende hermosa propiedad construida con materiales de primera calidad, excelente ubicación y una distribución impecable.\n\nLa casa cuenta con amplio living comedor, cocina, cocina comedor diario, lavadero, 2 dormitorios principales, antebaño, baño completo y un espacio versátil ideal para escritorio, biblioteca o 3er dormitorio, además de baño de cortesía para visitas.\n\nEn el exterior dispone de cochera para 2 vehículos, asador, habitación de guardado y lote en esquina/quinoa con un valioso acceso por 2 calles.',
        detalles: {
            tipo: 'Casa',
            barrio: 'A consultar',
            cocheras: 2,
            ambientes: 4,
            calle: 'A consultar',
            numero: '',
            dormitorios: 2,
            banos: 2,
            mostrarDireccionExacta: false,
            superficie_m2: 'a consultar',
            frente_m: 'a consultar',
            fondo_m: 'a consultar',
            servicios: [
                'Agua',
                'Luz',
                'Cloaca',
                'Gas',
                'Pavimento'
            ],
            adicionales: [
                'Materiales de Primera',
                'Salida a 2 Calles',
                'Cochera Doble',
                'Asador',
                'Habitación de Guardado',
                'Living Comedor',
                'Cocina Comedor Diario',
                'Lavadero',
                'Escritorio / Biblioteca',
                'Baño de Visitas'
            ],
            mapaQuery: 'San Salvador de Jujuy, Jujuy',
            lat: null,
            lon: null
        }
    },
    {
        id: 20, // Reemplazar por el ID que corresponda
        images: [
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero1.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero.mp4',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero2.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero3.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero4.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero5.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero6.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero7.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero8.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero9.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero10.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero11.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero12.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero13.jpg',
            '/propiedades/casa-alto-comedero-alquiler/casa-alto-comedero14.jpg',
        ],
        name: 'Casa Linda, Cómoda y Luminosa con Galería y Asador en Alto Comedero',
        price: '800000',
        category: 'Alquiler',
        description: 'Inmobiliaria Sonia Flores alquila hermosa casa muy linda, cómoda y luminosa sobre calle Teniente Farías en Alto Comedero.\n\nLa propiedad cuenta con entrada para auto, amplio living comedor, cocina equipada, 3 dormitorios confortables, antebaño y baño completo.\n\nEn el exterior dispone de agradable galería, patio espacioso y asador ideal para reuniones familiares.',
        detalles: {
            requisitos: '• Recibo de sueldo del Solicitante y garante, que tripliquen el valor del alquiler.',
            tipo: 'Casa',
            barrio: 'Barrio Alto Comedero',
            cocheras: 1,
            ambientes: 5,
            calle: 'Teniente Farías',
            numero: '',
            dormitorios: 3,
            banos: 1,
            mostrarDireccionExacta: true,
            superficie_m2: 'a consultar',
            frente_m: 'a consultar',
            fondo_m: 'a consultar',
            servicios: [
                'Agua',
                'Luz',
                'Cloaca',
                'Gas',
                'Pavimento'
            ],
            adicionales: [
                'Entrada para Auto',
                'Galería',
                'Patio',
                'Asador',
                'Living Comedor',
                'Muy Luminosa',
                'Antebaño'
            ],
            mapaQuery: 'Teniente Farías, Alto Comedero, San Salvador de Jujuy, Jujuy',
            lat: -24.235552,
            lon: -65.260669
        }
    }
]
