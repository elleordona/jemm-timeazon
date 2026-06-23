// Logic for products API endpoint

// Imports
import { runQuery } from './utility-functions.js'

// GET products
export const getProducts = async (req, res) => {
	try {
		const result = await runQuery(
			`SELECT id, name, description, price_credit, image_url, era
            FROM products;`,
		)
		const products = result?.records || result?.rows || []

		return res.status(200).json({
			status: "ok",
			products,
		})
	} catch (e) {
		console.error("Catalogue Error: ", e)
		return res.status(500).json({
			message: "Failed to load products",
		})
	}
}

// POST products
export const postProduct = async (req, res) => {
    try {
        const body = req.body || '{}';

        if (!body.name || typeof body.price_credit !== 'number') {
            return res.status(400).json({
                status: 'error',
                message: 'name and price_credit are required'
            })
        };

        const insertSql = `
            INSERT INTO products (name, description, price_credit, image_url, era)
            VALUES (:name, :description, :price_credit, :image_url, :era)
            RETURNING id, name, description, price_credit, image_url, era
        `;

        const result = await runQuery(insertSql, {
            name: body.name,
            description: body.description || "",
            price_credit: body.price_credit,
            image_url: body.image_url || "",
            era: body.era || ""
        });

        const product = result?.records?.[0] || result?.rows?.[0];

        return res.status(201).json({
            status: 'created',
            product
        })
    } catch (e) {
        console.log(e)

        return res.status(500).json({
            status: 'error',
            message: 'Could not create product'
        })
    }
}

// DELETE products
export const deleteProduct = async (req, res) => {
    try {
        const id = req.params;

        if (!id) {
            return res.status(400).json({
                status: 'error',
                message: 'Product ID is required'
            })
        };

        const deleteSQL = `
            DELETE FROM product
            WHERE id = :id
            RETURNING id, name, description, price_credit, image_url, era
            `;

        const result = await runQuery(deleteSQL, {
            id
        });

        const product =
            result?.records?.[0] ||
            result?.rows?.[0];

        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            })
        };

        return res.json(200).json({
            status: 'deleted',
            product
        })

    } catch (e) {
        console.error(e);

        return res.status(500).json({
            status: 'error',
            message: 'Could not delete product'
        })
    }
}
