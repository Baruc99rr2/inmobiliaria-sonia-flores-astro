import Hero from './Hero'
import ProductList from './ProductList'
import Carrusel from './Carrusel'
import Nosotros from './Nosotros'
import AboutUs from './AboutUs'
import Servicios from './Servicios'

// `products` llega desde index.astro con lo que hay en Supabase. Si es null
// (consulta fallida), ProductList y Carrusel caen al fallback de data.jsx.
//
// El default TIENE que ser null/undefined, no []: los hijos deciden con
// `productsProp ?? productsData`, y un array vacío no es nullish, así que
// desactivaría el fallback y dejaría el home sin propiedades.
/** @param {{ onVideoLoaded?: any, products?: any[] | null }} props */
const Homepage = ({ onVideoLoaded, products = null }) => {
  return (
    <div>
      {/* LE PASAMOS LA FUNCIÓN DE CARGA AL HERO */}
      <Hero onVideoLoaded={onVideoLoaded} />
      <ProductList products={products} />
      <Carrusel products={products} />
      <Nosotros />
      <AboutUs />
      <Servicios />
    </div>
  )
}

export default Homepage