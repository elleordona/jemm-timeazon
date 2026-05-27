import React, { useRef } from "react";
import "./Carousel.css";

export default function Carousel() {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const { current } = scrollRef;
    if (direction === "left") {
      current.scrollBy({ left: -300, behavior: "smooth" });
    } else {
      current.scrollBy({ left: 300, behavior: "smooth" });
    }


  };
const s3domain = "https://timeazon-static-images.s3.eu-west-2.amazonaws.com";

const imageUrl1 = `${s3domain}/toasterShoe.jpg`;
const imageUrl2 = `${s3domain}/HeroditusSandals.png`;
const imageUrl3 = `${s3domain}/atgSword.jpg`;
const imageUrl4 = `${s3domain}/temporalStabiliser.jpg`;
const imageUrl5 = `${s3domain}/almanac.jpg`;
const imageUrl6 = `${s3domain}/playfry5.jpg`;
const imageUrl7 = `${s3domain}/magnaCarta.png`;
const imageUrl8 = `${s3domain}/MedievalFireStartingKit.png`;
const imageUrl9 = `${s3domain}/watch.jpg`;

  return (
    <div className="carousel-wrapper">
      <button className="scroll-btn left" onClick={() => scroll("left")}>
        ◀
      </button>

      <div className="scroll-container" ref={scrollRef}>
        <div className="scroll-item item-1">
          <span><img src={imageUrl1}></img></span>
        </div>
        <div className="scroll-item item-3">
          <span><img src={imageUrl2}></img></span>
        </div>
        <div className="scroll-item item-3">
          <span><img src={imageUrl3}></img></span>
        </div>
        <div className="scroll-item item-3">
          <span><img src={imageUrl4}></img></span>
        </div>
        <div className="scroll-item item-3">
          <span><img src={imageUrl5}></img></span>
        </div>
        <div className="scroll-item item-2">
          <span><img src={imageUrl6}></img></span>
        </div>
        <div className="scroll-item item-2">
          <span><img src={imageUrl7}></img></span>
        </div>
        <div className="scroll-item item-2">
          <span><img src={imageUrl8}></img></span>
        </div>
        <div className="scroll-item item-2">
          <span><img src={imageUrl9}></img></span>
        </div>
      </div>

      <button className="scroll-btn right" onClick={() => scroll("right")}>
        ▶
      </button>
    </div>
  );
}

