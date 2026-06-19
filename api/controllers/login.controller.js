// Workflow:
// 1. User clicks Login
// 2. Configuration Check (Check if the AWS db settings loaded)
// 3. Input Validation: (This will check if the user type an email and a password?)
// 4. Database Search: (This will look up the email in DynamoDB. Does it exist?)
// 5. Password Match: (Will hash user's input password and compare to DB)
// 6. Success Response: (Will generate a success response to confirm that user is logged in)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"
import crypto from "crypto" // Built-in Node.js module to verify passwords

// This section will initialize environment variables
const TABLE_NAME = process.env.DYNAMO_TABLE_NAME
const REGION = process.env.DYNAMO_REGION || "eu-west-2"

// This section initializes the DynamoDB document client
const client = new DynamoDBClient({ region: REGION })
const ddb = DynamoDBDocumentClient.from(client)

//This section acts as a helper function to verify hashed passwords
// Flexible, in case codebase uses a different hashing method 
const verifyPassword = (inputPassword, storedHash) => {
  const hashedInput = crypto.createHash("sha256").update(inputPassword).digest("hex")

  return hashedInput === storedHash
}

//Acts as controller logic
export const loginController = async (req, res) => {
  try {
    if (!TABLE_NAME) {
      return res.status(500).json({ status: "error", message: "Missing DYNAMO_TABLE_NAME" })
    }
    if (!REGION) {
      return res.status(500).json({ status: "error", message: "Missing DYNAMO_REGION" })
    }

    const email = req.body.email?.trim()?.toLowerCase()
    const password = req.body.password

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Requires an email and password"
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
      return res.status(401).json({ status: "error", message: "Invalid email or password" })
    }

    const ok = verifyPassword(password, user.password)
    if (!ok) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" })
    }

    return res.status(200).json({
      status: "logged_in",
      user: { email }
    })
  } catch (err) {
    console.error("loginController error:", err)
    return res.status(500).json({
      status: "error",
      message: "Could not log in"
    })
  }
}
