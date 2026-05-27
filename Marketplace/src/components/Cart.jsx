import { useEffect, useState, useCallback } from "react";
import { getSessionEmail } from "../sessionUser";
import "./Cart.css";

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const email = getSessionEmail();

  // fetch cart for current user so we can reuse it after deletes
  const fetchCart = useCallback(async () => {
    if (!email) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/addtocart?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();
      // Lambda: { status, email, count, cartItems: [ { email, productId, createdAt } ] }
      setCartItems(data.cartItems || []);
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  }, [email]);

  // initial cart load
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // fetch all products once (same data as shop page)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error("Error fetching products for cart:", err);
      }
    };

    fetchProducts();
  }, []);

  const handleRemoveFromCart = async (productId) => {
    if (!email) return;

    try {
      const res = await fetch("/api/addtocart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          productId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Error removing from cart:", data);
        alert(data.message || "Could not remove from cart.");
        return;
      }

      // Update local state so the UI changes immediately
      setCartItems((prev) =>
        prev.filter((item) => item.productId !== productId)
      );

      // Let navbar know so it can refresh the badge
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Network error removing from cart:", err);
      alert("Network error while removing from cart.");
    }
  };

  if (!email) return <h2 className="cart-message">Please log in to see your cart.</h2>;
  if (loading) return <h2>Loading cart...</h2>;
  if (cartItems.length === 0) return <h2 className="cart-message">Your cart is empty</h2>;

  // join cart items to full product details
  const itemsWithProduct = cartItems
    .map((item) => ({
      ...item,
      product: products.find((p) => p.name === item.productId)
    }))
    .filter((item) => item.product);

  return (
    <div className="cart-page">
      <h2 className="cart-message">Your Cart</h2>

      <div className="cart-grid">
        {itemsWithProduct.map((item) => (
          <CartProductCard
            key={`${item.productId}-${item.createdAt}`}
            product={item.product}
            addedAt={item.createdAt}
            onRemove={() => handleRemoveFromCart(item.productId)}
          />
        ))}
      </div>
    </div>
  );
}

// simple product card for the cart
function CartProductCard({ product, addedAt, onRemove }) {

  const s3domain = "https://timeazon-static-images.s3.eu-west-2.amazonaws.com";
  const imageUrl = `${s3domain}/${product.image_url}`;

  return (
    <div className="cart-product-card">
      <img src={imageUrl} alt={product.name} className="cart-product-image" />
      <div className="cart-product-info">
        <h3>{product.name}</h3>
        <br></br>
        <p>{product.description}</p>
        <br></br>
        <p className="cart-product-price">
          {product.price_credit} credits
        </p>
        <br></br>
        <br></br>
        <p className="cart-product-added">
          Added: {new Date(addedAt).toLocaleString()}
        </p>
        <button className="cart-remove-button" onClick={onRemove}>
          Remove from cart
        </button>
      </div>
    </div>
  );
}
