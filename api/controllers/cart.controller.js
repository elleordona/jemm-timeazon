import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb"

const TABLE_NAME = process.env.CART_TABLE_NAME
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const normaliseEmail = (email) => String(email || "").trim().toLowerCase()
const normaliseProductId = (productId) => String(productId || "").trim()

export const getCart = async (req, res) => {
  try {
    const email = normaliseEmail(req.query.email)

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Missing email query parameter"
      })
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: { "#email": "email" },
        ExpressionAttributeValues: { ":email": email }
      })
    )

    const cartItems = result?.Items || []

    return res.status(200).json({
      status: "ok",
      email,
      count: cartItems.length,
      cartItems
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      status: "error",
      message: "Could not load cart"
    })
  }
}

export const deleteFromCart = async (req, res) => {
  try {
    const { email, productId } = req.body

    const normalisedEmail = normaliseEmail(email)
    const normalisedProductId = normaliseProductId(productId)

    if (!normalisedEmail || !normalisedProductId) {
      return res.status(400).json({
        status: "error",
        message: "email and productId are required"
      })
    }

    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          email: normalisedEmail,
          productId: normalisedProductId
        }
      })
    )

    return res.status(200).json({
      status: "deleted",
      email: normalisedEmail,
      productId: normalisedProductId
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      status: "error",
      message: "Could not delete product from cart"
    })
  }
}

export const postToCart = async (req, res) => {
  try {
    const { email, productId, quantity } = req.body

    const normalisedEmail = normaliseEmail(email)
    const normalisedProductId = normaliseProductId(productId)

    //Implements a validation error
    if (!normalisedEmail || !normalisedProductId) {
      return res.status(400).json({
        status: "error",
        message: "email and productId required"
      })
    }

    // Adds an item into DynamoDB
    // PutCommand: creates a new item or overwrites existing one
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          email: normalisedEmail,
          productId: normalisedProductId,
          updatedAt: new Date().toISOString()
        }
      })
    )

    // Will generate a success response
    return res.status(201).json({
      status: "ok",
      message: "Item added to cart successfully",
      cartItem: {
        email: normalisedEmail,
        productId: normalisedProductId
      }
    })

  } catch (error) {
    console.error("Error in postToCart:", error)

    return res.status(500).json({
      status: "error",
      message: "Could not add product to cart"
    })
  }
}
