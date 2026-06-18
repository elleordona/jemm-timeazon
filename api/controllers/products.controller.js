// Controller for Products Endpoint

import { runQuery } from "../../CDK/functions/db.js"

// Get Products function
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
