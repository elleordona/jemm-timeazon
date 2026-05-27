import { useParams } from "react-router-dom";
import { useState } from "react";
import { BackButton } from "./BackButton.jsx";
import "./ProductPage.css";

export default function ProductPage({ products }) {
  const { id } = useParams();
  const [added, setAdded] = useState(false);

  const product = products.find((p) => p.id === Number(id));

  if (!product) {
    return <h2>Product not found</h2>;
  }

  const s3domain = "https://timeazon-static-images.s3.eu-west-2.amazonaws.com";

  const imageUrl = `${s3domain}/${product.image_url}`;


  const handleAddToCart = async () => {
    const email = sessionStorage.getItem("userEmail");
  
    if (!email) {
      alert("Please log in to add items to your cart.");
      return;
    }
  
    try {
      const response = await fetch("/api/addtocart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,                     
          productId: product.name   
        })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        setAdded(true);
        console.log("Added to cart:", result);
        window.dispatchEvent(new Event("cartUpdated"));
      } else {
        console.error("Error adding to cart:", result);
        alert(result.message || "Could not add to cart.");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error while adding to cart.");
    }
  };

  return (
    <div className="productPageElements">
      

      <div className="pageImage">
        <img src={imageUrl} className="productPageImage" alt={product.title} />
      </div>

      <div className="productDetails">
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        <h3>{product.price}</h3>

        <button
          className="addToCartButton"
          onClick={handleAddToCart}
          disabled={added}
        >
          {added ? "Added to Cart" : "Add to Cart"}
        </button>
      </div>
      <BackButton className="productPageBackButton" />
    </div>
  );
}
