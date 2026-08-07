import React from 'react'
import Hero from './Hero'
import ProductList from './ProductList'
import Carrusel from './Carrusel'
import Nosotros from './Nosotros'
import AboutUs from './AboutUs'
import Servicios from './Servicios'

const Homepage = ({ onVideoLoaded }) => {
  return (
    <div>
      {/* LE PASAMOS LA FUNCIÓN DE CARGA AL HERO */}
      <Hero onVideoLoaded={onVideoLoaded} />
      <ProductList />
      <Carrusel />
      <Nosotros />
      <AboutUs />
      <Servicios />
    </div>
  )
}

export default Homepage