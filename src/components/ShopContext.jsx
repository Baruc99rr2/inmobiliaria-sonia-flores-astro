import { createContext, useState, useEffect } from "react";
import { productsData } from "../data";

// Agrupamos todos los imports arriba de todo para evitar warnings de Node/Vite
export const ShopContext = createContext();

const ShopContextProvider = ({ children }) => {
  const [products, setProducts] = useState(productsData);
  const [cart, setCart] = useState([]);
  const [quantity, setQuantity] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const totalSum = cart.reduce((accumulator, currentItem) => {
      const priceAsNumber = parseFloat(currentItem.price);
      if (isNaN(priceAsNumber)) return accumulator;
      return accumulator + priceAsNumber * currentItem.amount;
    }, 0);
    setTotal(totalSum);
  }, [cart]);

  useEffect(() => {
    if (cart) {
      const amount = cart.reduce((accumulator, currentItem) => {
        return accumulator + currentItem.amount;
      }, 0);
      setQuantity(amount);
    }
  }, [cart]);

  // FUNCIÓN REPARADA: Usa el id real del producto y acepta cantidades dinámicas
  const addToCart = (product, id, amountToAdd = 1) => {
    const productId = parseInt(id); // Nos aseguramos de comparar números
    
    // Buscamos si el producto ya existe en el carrito usando su ID real
    const cartItem = cart.find((item) => item.id === productId);

    if (cartItem) {
      // Si ya existe, le sumamos la cantidad seleccionada
      const newCart = cart.map((item) =>
        item.id === productId ? { ...item, amount: item.amount + amountToAdd } : item
      );
      setCart(newCart);
    } else {
      // Si es nuevo, lo creamos con la cantidad elegida inicialmente
      const newItem = { ...product, amount: amountToAdd };
      setCart([...cart, newItem]);
    }
  };

  const removeFromCart = (id) => {
    const productId = parseInt(id);
    const newCart = cart.filter((item) => item.id !== productId);
    setCart(newCart);
  };

  const clearCart = () => {
    setCart([]);
  };

  const increaseAmount = (id) => {
    const productId = parseInt(id);
    const cartItem = cart.find((item) => item.id === productId);
    if (cartItem) {
      addToCart(cartItem, productId, 1);
    }
  };

  const decreaseAmount = (id) => {
    const productId = parseInt(id);
    const cartItem = cart.find((item) => item.id === productId);

    if (cartItem) {
      if (cartItem.amount < 2) {
        removeFromCart(productId);
      } else {
        const newCart = cart.map((item) =>
          item.id === productId ? { ...item, amount: item.amount - 1 } : item
        );
        setCart(newCart);
      }
    }
  };

  return (
    <ShopContext.Provider
      value={{
        products,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        increaseAmount,
        decreaseAmount,
        quantity,
        total,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;