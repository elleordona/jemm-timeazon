import { useState } from "react";
import "./SellItem.css"

export default function SellItem() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_credit: "",
    image_url: "",
    era: ""
  });

  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      return;
    }

    setImageFile(file);
    // optional: clear manual url if a file has been chosen
    // setForm(prev => ({ ...prev, image_url: "" }));
  };

  const uploadImageIfNeeded = async () => {
    // If they typed a url manually, just use that
    if (!imageFile) {
      return form.image_url || "";
    }

    setUploading(true);

    // 1. Ask backend for a pre signed url
    const presignRes = await fetch("/api/image-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: imageFile.name,
        fileType: imageFile.type
      })
    });

    if (!presignRes.ok) {
      const errBody = await presignRes.text();
      console.error("Failed to get upload url", errBody);
      throw new Error("Could not get upload url");
    }

    const { uploadUrl, key } = await presignRes.json();

    // 2. Upload the file directly to S3
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": imageFile.type
      },
      body: imageFile
    });

    if (!putRes.ok) {
      console.error("Failed to upload image", putRes.status, putRes.statusText);
      throw new Error("Image upload failed");
    }

    setUploading(false);
    return key;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      // Upload image first (if there is one)
      const imageKey = await uploadImageIfNeeded();

      // Then create the product as before
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price_credit: Number(form.price_credit),
          image_url: imageKey,
          era: form.era
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error from server");
      }

      setMessage("Product created successfully.");

      // quick refresh back to catalogue
      window.location.href = "/product";
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Error creating product.");
      setUploading(false);
    }
  };

  return (
    <div className="sell-container">
    <div class="sellItem">
      <h2 class="sellTitle">Sell an artifact</h2>

      <form className="addItemForm" onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />

        <input
          name="price_credit"
          type="number"
          placeholder="Price"
          value={form.price_credit}
          onChange={handleChange}
          required
        />

        <input className="uploadImage"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        <select 
          className="eraInput" 
          name="era" 
          value={form.era} 
          onChange={handleChange}
          required
        >
          <option value="" disabled>Select Era</option>
          <option value="past">Past</option>
          <option value="present">Present</option>
          <option value="future">Future</option>
        </select>
        

        <button className="sellButton" type="submit" disabled={uploading}>
          {uploading ? "Uploading image..." : "Post Product"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
    </div>
  );
}
