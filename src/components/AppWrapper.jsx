import React from 'react';
import ShopContextProvider from './ShopContext';

export default function AppWrapper({ children }) {
  return (
    <ShopContextProvider>
      {children}
    </ShopContextProvider>
  );
}