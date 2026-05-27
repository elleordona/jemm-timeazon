// functions/addToCart.js

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";

// CDK should set this via lambdaEnvVars
const TABLE_NAME = process.env.CART_TABLE_NAME;

// Use Lambda’s default region (no need for a custom env var)
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  body: JSON.stringify(body)
});

const parseBody = (event) => {
  if (!event?.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const normaliseEmail = (email) => String(email || "").trim().toLowerCase();
const normaliseProductId = (productId) => String(productId || "").trim();

/**
 * POST /api/addtocart
 * Body: { email, productId }
 * Adds an item to the user’s cart 
 */
export const postToCartHandler = async (event) => {
  console.log("postToCartHandler event:", JSON.stringify(event));

  try {
    if (!TABLE_NAME) {
      return jsonResponse(500, {
        status: "error",
        message: "Missing CART_TABLE_NAME env var"
      });
    }

    const body = parseBody(event);
    const email = normaliseEmail(body.email);
    const productId = normaliseProductId(body.productId);

    if (!email || !productId) {
      return jsonResponse(400, {
        status: "error",
        message: "email and productId are required"
      });
    }

    const item = {
      email,
      productId,
      createdAt: new Date().toISOString()
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      })
    );

    return jsonResponse(201, {
      status: "added to cart",
      cartItem: item
    });
  } catch (err) {
    console.error("postToCartHandler error:", err);
    return jsonResponse(500, {
      status: "error",
      message: "Could not add product to cart"
    });
  }
};

/**
 * GET /api/addtocart?email=...
 * Returns all items in the user’s cart
 */
export const getToCartHandler = async (event) => {
  console.log("getToCartHandler event:", JSON.stringify(event));

  try {
    if (!TABLE_NAME) {
      return jsonResponse(500, {
        status: "error",
        message: "Missing CART_TABLE_NAME env var"
      });
    }

    const email = normaliseEmail(event?.queryStringParameters?.email);

    if (!email) {
      return jsonResponse(400, {
        status: "error",
        message: "Missing email query parameter"
      });
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: { "#email": "email" },
        ExpressionAttributeValues: { ":email": email }
      })
    );

    const cartItems = result?.Items || [];

    return jsonResponse(200, {
      status: "ok",
      email,
      count: cartItems.length,
      cartItems
    });
  } catch (err) {
    console.error("getToCartHandler error:", err);
    return jsonResponse(500, {
      status: "error",
      message: "Could not load cart"
    });
  }
};

/**
 * DELETE /api/addtocart
 * Body: { email, productId }
 * Removes an item from the cart
 */
export const deleteFromCartHandler = async (event) => {
  console.log("deleteFromCartHandler event:", JSON.stringify(event));

  try {
    if (!TABLE_NAME) {
      return jsonResponse(500, {
        status: "error",
        message: "Missing CART_TABLE_NAME env var"
      });
    }

    const body = parseBody(event);
    const email = normaliseEmail(body.email);
    const productId = normaliseProductId(body.productId);

    if (!email || !productId) {
      return jsonResponse(400, {
        status: "error",
        message: "email and productId are required"
      });
    }

    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { email, productId }
      })
    );

    return jsonResponse(200, {
      status: "deleted",
      email,
      productId
    });
  } catch (err) {
    console.error("deleteFromCartHandler error:", err);
    return jsonResponse(500, {
      status: "error",
      message: "Could not delete product from cart"
    });
  }
};
