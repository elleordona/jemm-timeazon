// imports
import 'dotenv/config'
import express from 'express';
import cors from 'cors';

// import controllers
import { getHealthcheck } from './controllers/healthcheck.controller.js'
import { getImageUploadUrl } from './controllers/getimageupload.controller.js';
import { postProduct, deleteProduct } from './controllers/products.controller.js';

const app = express();
const port = process.env.PORT

app.use(cors());
app.use(express.json());

//* Routes

// Healthcheck
app.get('/api/healthcheck', getHealthcheck)

//TODO: Products (GET, POST, DELETE)
// app.post('/api/products', postProducts)
// app.delete('/api/products', deleteProducts)

//TODO: Users

//TODO: Login

//TODO: Cart (GET, POST, DELETE)

// Image
app.post('/api/image-upload-url', getImageUploadUrl)

const server = app.listen(port, () => {
    const SERVERPORT = server.address().port
    console.log(`API is running on port: http://localhost:${SERVERPORT}`)
})
