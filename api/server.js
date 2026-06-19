// imports
import 'dotenv/config'
import express from 'express';
import cors from 'cors';

// import controllers
import { getHealthcheck } from './controllers/healthcheck.controller.js'
import { getImageUploadUrl } from './controllers/getimageupload.controller.js';
import { getCart, deleteFromCart, postToCart } from './controllers/cart.controller.js'
import { createUser } from './controllers/user.controller.js';
import { getProducts, postProduct, deleteProduct } from './controllers/products.controller.js';
import { loginController } from './controllers/login.controller.js';

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

// Users
app.post('/api/users', createUser)

// Login
app.post('/api/login', loginController);

// Cart
app.get('/api/addtocart', getCart)
app.delete('/api/addtocart', deleteFromCart)
app.post('/api/postToCart', postToCart )

// Image
app.post('/api/image-upload-url', getImageUploadUrl)

const server = app.listen(port, () => {
    const SERVERPORT = server.address().port
    console.log(`API is running on port: ${SERVERPORT}`)
})
