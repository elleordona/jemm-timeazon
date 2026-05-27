import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import EraSelect from "../components/EraSelect";
import "./ProductCatalogue.css";
import { useSearchParams } from "react-router-dom";

export default function ProductCatalogue() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedEra = searchParams.get("filter") || "";

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []); 
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
      });
  }, []);

  const allEras = [...new Set(products.map(p => p.era))];
  const filteredProducts = selectedEra
    ? products.filter(p => p.era === selectedEra)
    : products;

    
  return (
      <div className="app">
        <h1 className="shop-title">Time Machine Market</h1>
        <EraSelect
    eras={allEras}
    selected={selectedEra}
    onChange={(value) => {
      if (value) {
        setSearchParams({ filter: value });
      } else {
        setSearchParams({});
      }
    }}
    />
      

      <div className="product-row">
        {filteredProducts.map(product => (
          <Link key={product.id} to={`/product/${product.id}`}>
            <ProductCard 
              product={product}
              image={product.image_url}
              title={product.title}
              price={product.price_credit}
              description={product.description}
              era={product.era} />
          </Link>
        ))}
      </div>

    </div>
  );
}

