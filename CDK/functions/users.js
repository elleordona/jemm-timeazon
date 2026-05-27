// functions/users.js
//
// Two Lambdas live in this file:
// 1) postUsersHandler  -> POST /api/users  (sign up)
// 2) loginHandler      -> POST /api/login  (log in)

// We store users in DynamoDB using `email` as the partition key.
// We NEVER store a raw password. We store a salted hash instead.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb"
import crypto from "crypto"

// CDK passes these in as Lambda environment variables
const TABLE_NAME = process.env.DYNAMO_TABLE_NAME
const REGION = process.env.DYNAMO_REGION

// DocumentClient lets us read and write normal JavaScript objects.
const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION })
)

// Standard JSON response helper for API Gateway
const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  body: JSON.stringify(body)
})

/**
 * Turn a password into a salted hash we can safely store
 */
const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString("hex")
) => {
  const iterations = 100_000
  const keylen = 64
  const digest = "sha512"

  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, keylen, digest)
    .toString("hex")

  return { salt, hash, iterations, digest }
}

/**
 * Check if a supplied password matches the stored hash
 */
const verifyPassword = (password, stored) => {
  const { salt, hash, iterations, digest } = stored

  const candidate = crypto
    .pbkdf2Sync(password, salt, iterations, 64, digest)
    .toString("hex")

  return crypto.timingSafeEqual(
    Buffer.from(candidate, "hex"),
    Buffer.from(hash, "hex")
  )
}

// ------------------------------------------------------------
// POST /api/users  (Sign up)
// ------------------------------------------------------------
export const postUsersHandler = async (event) => {
  try {
    if (!TABLE_NAME) {
      return jsonResponse(500, { status: "error", message: "Missing DYNAMO_TABLE_NAME" })
    }
    if (!REGION) {
      return jsonResponse(500, { status: "error", message: "Missing DYNAMO_REGION" })
    }

    const body = event.body ? JSON.parse(event.body) : {}

    const email = body.email?.trim()?.toLowerCase()
    const password = body.password

    if (!email || !password) {
      return jsonResponse(400, {
        status: "error",
        message: "Email and password are required"
      })
    }

    // 1) Check if user already exists
    const existing = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { email }
      })
    )

    if (existing.Item) {
      return jsonResponse(409, { status: "error", message: "User already exists" })
    }

    // 2) Hash password
    const passwordData = hashPassword(password)

    // 3) Store user
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          email,
          password: passwordData,
          createdAt: new Date().toISOString()
        },
        ConditionExpression: "attribute_not_exists(email)"
      })
    )

    return jsonResponse(201, {
      status: "created",
      user: { email }
    })
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      return jsonResponse(409, { status: "error", message: "User already exists" })
    }

    console.error("postUsersHandler error:", err)
    return jsonResponse(500, {
      status: "error",
      message: "Could not create user"
    })
  }
}

// ------------------------------------------------------------
// POST /api/login  (Log in)
// ------------------------------------------------------------
export const loginHandler = async (event) => {
  try {
    if (!TABLE_NAME) {
      return jsonResponse(500, { status: "error", message: "Missing DYNAMO_TABLE_NAME" })
    }
    if (!REGION) {
      return jsonResponse(500, { status: "error", message: "Missing DYNAMO_REGION" })
    }

    const body = event.body ? JSON.parse(event.body) : {}
    const email = body.email?.trim()?.toLowerCase()
    const password = body.password

    if (!email || !password) {
      return jsonResponse(400, {
        status: "error",
        message: "Email and password are required"
      })
    }

    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { email }
      })
    )

    const user = result.Item

    if (!user) {
      return jsonResponse(401, { status: "error", message: "Invalid email or password" })
    }

    const ok = verifyPassword(password, user.password)
    if (!ok) {
      return jsonResponse(401, { status: "error", message: "Invalid email or password" })
    }

    return jsonResponse(200, {
      status: "logged_in",
      user: { email }
    })
  } catch (err) {
    console.error("loginHandler error:", err)
    return jsonResponse(500, {
      status: "error",
      message: "Could not log in"
    })
  }
}
