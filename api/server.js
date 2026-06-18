// imports
import 'dotenv/config'
import express from 'express';
import cors from 'cors';

// import controllers
import { getHealthcheck } from './controllers/healthcheck.controller.js'
import { getImageUploadUrl } from './controllers/getimageupload.controller.js';
import { getCart, deleteFromCart } from './controllers/cart.controller.js'
import { getProducts, postProduct, deleteProduct } from './controllers/products.controller.js';

const app = express();
const port = process.env.PORT

app.use(cors());
app.use(express.json());

//* Routes

// Healthcheck
app.get('/api/healthcheck', getHealthcheck)

// Products (GET, POST, DELETE)
app.get('/api/product', getProducts)
app.post('/api/product', postProduct)
app.delete('/api/product', deleteProduct)

//TODO: Users

//TODO: Login

// Cart
app.get('/api/addtocart', getCart)
app.delete('/api/addtocart', deleteFromCart)

// Image
app.post('/api/image-upload-url', getImageUploadUrl)

const server = app.listen(port, () => {
    const SERVERPORT = server.address().port
    console.log(`API is running on port: http://localhost:${SERVERPORT}`)
})
