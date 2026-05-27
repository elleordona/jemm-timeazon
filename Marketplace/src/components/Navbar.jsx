import React, { useEffect, useState, useCallback } from "react";
import "./Navbar.css";
import { NavLink } from "react-router-dom";
import BackendStatus from "./healthCheckButton.jsx";
import { getSessionEmail, clearSessionEmail } from "../sessionUser";

const Navbar = () => {
  const [cartCount, setCartCount] = useState(0);
  const [userEmail, setUserEmail] = useState(getSessionEmail() || "");

  const fetchCartCount = useCallback(async () => {
    const email = getSessionEmail();

    if (!email) {
      setCartCount(0);
      return;
    }

    try {
      const response = await fetch(
        `/api/addtocart?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      // Lambda: { status, email, count, cartItems }
      if (typeof data.count === "number") {
        setCartCount(data.count);
      } else if (Array.isArray(data.cartItems)) {
        setCartCount(data.cartItems.length);
      } else {
        setCartCount(0);
      }
    } catch (err) {
      console.error("Error fetching cart for navbar:", err);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    // initial load
    fetchCartCount();

    const onCartUpdated = () => {
      fetchCartCount();
    };

    const onAuthChanged = () => {
      setUserEmail(getSessionEmail() || "");
      // when user changes, also refresh cart count
      fetchCartCount();
    };

    window.addEventListener("cartUpdated", onCartUpdated);
    window.addEventListener("authChanged", onAuthChanged);

    return () => {
      window.removeEventListener("cartUpdated", onCartUpdated);
      window.removeEventListener("authChanged", onAuthChanged);
    };
  }, [fetchCartCount]);

  const handleLogout = () => {
    clearSessionEmail();
    setUserEmail("");
    setCartCount(0);
    window.dispatchEvent(new Event("authChanged"));
    window.dispatchEvent(new Event("cartUpdated"));
    // optional redirect
    window.location.href = "/Homepage";
  };

  return (
    <div className="navbar">
      <div className="backend-status-wrapper">
    <BackendStatus />
    </div>
      <NavLink to="/Homepage">
        <img src="/timeazon.png" alt="Website Logo" className="logo" />
      </NavLink>

      <ul>
        <li><NavLink to="/Homepage">Homepage</NavLink></li>
        <li><NavLink to="/product">Shop</NavLink></li>
        <li><NavLink to="/sell">Sell</NavLink></li>
        <li><NavLink to="/contact-us">Contact Us</NavLink></li>

        {userEmail ? (
          <li>
            <button
              type="button"
              className="nav-logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </li>
        ) : (
          <li><NavLink to="/login">Login</NavLink></li>
        )}
      </ul>

      <div className="Search-bar">
        <input type="text" placeholder="Search" />
      </div>

      <div className="cart">
        <NavLink to="/cart">
          <img src="/shoppingCart.png" alt="Cart" />
          <span className="cart-count">{cartCount}</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Navbar;
