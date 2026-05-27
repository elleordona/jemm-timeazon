import React from "react";
import "./App.css";
import ProductCatalogue from "./pages/ProductCatalogue";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProductPage from "./components/Productpage";
import Layout from "./Layout/Layout";
import Carousel from "./components/Carousel";
import Error from "./components/Error"
import ContactUs from "./components/ContactUs";
import Login from "./components/Login";
// import TimePortal from "./components/TimePortal";
import Signup from "./components/Signup";
import PasswordReset from "./components/passwordreset";
import SellItem from "./pages/SellItem";
import Homepage from "./components/Homepage.jsx"
import { useEffect, useState } from "react";
import Cart from "./components/Cart.jsx";

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => setProducts(data.products))
      .catch(err => console.error(err));
  }, []);

  return (
    <Routes>
    {/* Layout route */}
    <Route path="/" element={<Layout />}>
     <Route index element={<Homepage />} />
     <Route path="login" element={<Login />} />
     <Route path="signup" element={<Signup />} />
     <Route path="PasswordReset" element={<PasswordReset />} />   
      <Route path="product" element={<ProductCatalogue products={products} />} />
      <Route path="product/:id" element={<ProductPage products={products} />} />
      <Route path="Homepage" element={<Homepage />} />
      {/* /:id is for each of the product ids - for the individual pages*/}
      <Route path="sell" element={<SellItem />} />
      <Route path="cart" element={<Cart />} />
      <Route path="contact-us" element={<ContactUs />} />
      <Route path="*" element={<Error />} />
      
      
    </Route>
  </Routes>
  );
};

export default App;
