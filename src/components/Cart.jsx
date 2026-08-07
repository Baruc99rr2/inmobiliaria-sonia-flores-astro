import React, { useContext, useEffect } from 'react'
import { ShopContext } from './ShopContext'
import { FiTrash2 } from 'react-icons/fi'
import { IoMdAdd, IoMdRemove } from 'react-icons/io'
import { FaCreditCard } from 'react-icons/fa' // 👈 Cambiado por ícono de tarjeta
import { loadStripe } from '@stripe/stripe-js' // 👈 Importamos Stripe

// ⚠️ ACÁ PEGÁS TU CLAVE PÚBLICA DE PRUEBA (la que empieza con pk_test_...)
const stripePromise = loadStripe('pk_test_51TfP4BEBs4yTrCg0c7Djbx31G6TvGe6wbYIPSGltQ2uwWjchJO0V8jma30oFy0s9EKcCitHizNSALPlGoURLa71X00a0f0dgtx')

const Cart = () => {
  const { cart, removeFromCart, clearCart, increaseAmount, decreaseAmount, quantity, total } = useContext(ShopContext)

  // Clava la pantalla arriba de todo automáticamente al abrir el carrito
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Función para procesar el pago redirigiendo a Stripe Checkout
const handleCheckout = () => {
    if (cart.length === 0) return;

    // 1. PEGÁS TU ENLACE PÚBLICO REAL AQUÍ
    const stripeBaseUrl = "https://buy.stripe.com/test_00wbJ17KFbZh3gUfNfdQQ00";

    // 2. El resto del código se encarga de meter los productos del carrito adentro del link
    let queryParams = "?";
    cart.forEach((item, index) => {
      const priceId = item.stripePriceId || 'price_1TfPKFEBs4yTrCg0PE27W8fA';
      queryParams += `price[${index}]=${priceId}&qty[${index}]=${item.amount}&`;
    });

    queryParams = queryParams.slice(0, -1);

    // 3. Te redirige automáticamente
    const urlFinal = `${stripeBaseUrl}${queryParams}`;
    console.log("Redirigiendo a:", urlFinal);
    
    window.location.href = urlFinal;
  };
  
  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 pt-24 md:pt-28 flex flex-col lg:flex-row gap-8 mb-10 min-h-[calc(100vh-300px)]'>

      {/* Sección Izquierda: Lista de productos */}
      <div className='w-full lg:w-2/3 bg-white p-4 sm:p-6 rounded-lg shadow'>
        {/* Encabezado */}
        <div className='flex justify-between items-center border-b pb-4'>
          <h1 className='text-xl sm:text-2xl font-semibold'>Shopping Cart</h1>
          <div className='flex items-center space-x-4'>
            <h1 className='text-sm sm:text-lg text-gray-600'>Items: ({quantity})</h1>
            {cart.length > 0 && (
              <FiTrash2 onClick={clearCart} className='text-red-500 text-xl sm:text-2xl cursor-pointer hover:scale-110 transition' title="Vaciar Carrito"/>
            )}
          </div>
        </div>

        {/* Subencabezado de Tabla */}
        <div className='hidden md:grid grid-cols-[3fr_1fr_1fr_1fr] text-gray-500 font-semibold mt-6 pb-2 border-b text-sm uppercase tracking-wider'>
          <span>Products Description</span>
          <span className='text-center'>Quantity</span>
          <span className='text-center'>Price</span>
          <span className='text-right'>Total</span>
        </div>

        {/* Elementos del carrito */}
        <div className='divide-y divide-gray-100'>
          {cart.length > 0 ? (
            cart.map((item) => {
              const { id, name, image, images, price, amount } = item
              const displayImage = images && images.length > 0 ? images[0] : image;

              return (
                <div key={id} className='flex flex-col md:grid md:grid-cols-[3fr_1fr_1fr_1fr] items-center py-6 md:py-4 gap-4 md:gap-0 text-gray-700'>
                  
                  {/* Detalles e Imagen */}
                  <div className='flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 w-full'>
                    <img 
                      src={displayImage} 
                      alt={name} 
                      className='w-20 h-20 sm:w-16 sm:h-16 rounded-md object-contain bg-gray-50 p-1 shrink-0' 
                    />
                    <div className='w-full min-w-0'>
                      <h3 className='font-semibold text-base text-gray-900 break-words md:truncate'>{name}</h3>
                      <button 
                        onClick={() => removeFromCart(id)} 
                        className='text-red-500 text-xs flex items-center justify-center sm:justify-start gap-1 mt-2 mx-auto sm:mx-0 hover:underline'
                      >
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className='flex items-center justify-center space-x-3 w-full'>
                    <button onClick={() => decreaseAmount(id)} className='w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full flex items-center justify-center text-lg transition active:scale-95'>
                      <IoMdRemove />
                    </button>
                    <span className='text-lg font-medium w-6 text-center'>{amount}</span>
                    <button onClick={() => increaseAmount(id)} className='w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full flex items-center justify-center text-lg transition active:scale-95'>
                      <IoMdAdd />
                    </button>
                  </div>

                  {/* Precio Unitario */}
                  <div className='flex md:justify-center items-center text-sm sm:text-base text-gray-500 md:text-gray-700'>
                    <span className='md:hidden font-medium mr-1'>Precio unitario:</span>
                    <span>${price}</span>
                  </div>

                  {/* Total por Producto */}
                  <div className='flex md:justify-end items-center text-base sm:text-lg font-semibold text-gray-900'>
                    <span className='md:hidden font-medium text-sm text-gray-500 mr-2'>Subtotal producto:</span>
                    <span>${price * amount}</span>
                  </div>

                </div>
              )
            })
          ) : (
            <div className='text-center py-12'>
              <p className='text-gray-400 text-lg'>Your Cart is empty 🛍️</p>
            </div>
          )}
        </div>
      </div>

      {/* Sección Derecha: Resumen de compra */}
      <div className='w-full lg:w-1/3 bg-gray-50 p-6 rounded-lg border border-gray-100 h-fit'>
        <h2 className='text-lg font-semibold border-b pb-4 text-gray-800'>Cart Summary</h2>
        
        <div className='space-y-3 mt-4 border-b pb-4 text-sm sm:text-base'>
          <div className='flex justify-between text-gray-600'>
            <span>Items quantity</span>
            <span className='font-medium text-gray-900'>{quantity}</span>
          </div>
          <div className='flex justify-between text-gray-600'>
            <span>Subtotal</span>
            <span className='font-medium text-gray-900'>${total}</span>
          </div>
          <div className='flex justify-between text-gray-600'>
            <span>Shipping Fee</span>
            <span className='font-medium text-green-600 font-semibold uppercase text-xs bg-green-50 px-2 py-0.5 rounded-full'>Free</span>
          </div>
        </div>

        <div className='flex justify-between items-center mt-4 mb-6'>
          <span className='text-base sm:text-lg font-bold text-gray-800'>Total Cost</span>
          <span className='text-xl sm:text-2xl font-extrabold text-amber-600'>${total}</span>
        </div>

        {/* Botón de pago mutado a Stripe Checkout */}
        <button 
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className={`w-full flex items-center justify-center gap-2 text-white py-3.5 rounded-lg text-lg font-semibold shadow-md transition duration-300 ${
            cart.length > 0 
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-[0.99]' 
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          <FaCreditCard className='text-xl' />
          PROCEED TO CHECKOUT
        </button>
      </div>

    </div>
  )
}

export default Cart