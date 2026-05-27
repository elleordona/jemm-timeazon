export default function ProductCard({ product, onClick }) {

   const s3domain = "https://timeazon-static-images.s3.eu-west-2.amazonaws.com";

  const imageUrl = `${s3domain}/${product.image_url}`;

  return (
    <div className="product-card">
      <div className="card-frame">
        <div className="image-wrapper" onClick={onClick}>
          <img src={imageUrl} alt={product.name} />

          <div className="overlay" />

          <div className="card-info">
            <h3 className="title">{product.name}</h3>
            <h4 className="price">ⓣ{product.price_credit}</h4>
            <p className="starrating">★★★☆☆</p>
          </div>
        </div>
      </div>
    </div>
  );
}

