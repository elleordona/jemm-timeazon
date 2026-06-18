// Controller for User Sign Up & Login

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
} from "@aws-sdk/lib-dynamodb"
import crypto from "crypto"

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME
const REGION = process.env.DYNAMO_REGION

const normaliseEmail = (email) =>
	String(email || "")
		.trim()
		.toLowerCase()
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }))

const hashPassword = (
	password,
	salt = crypto.randomBytes(16).toString("hex"),
) => {
	const iterations = 100_000
	const keylen = 64
	const digest = "sha512"

	const hash = crypto
		.pbkdf2Sync(password, salt, iterations, keylen, digest)
		.toString("hex")

	return { salt, hash, iterations, digest }
}

const verifyPassword = (password, stored) => {
	const { salt, hash, iterations, digest } = stored

	const candidate = crypto
		.pbkdf2Sync(password, salt, iterations, 64, digest)
		.toString("hex")

	return crypto.timingSafeEqual(
		Buffer.from(candidate, "hex"),
		Buffer.from(hash, "hex"),
	)
}

export const createUser = async (req, res) => {
	try {
		if (!TABLE_NAME) {
			return res.status(500).json({
				status: "error",
				message: "Missing DYNAMO_TABLE_NAME",
			})
		}
		if (!REGION) {
			return res.status(500).json({
				status: "error",
				message: "Missing DYNAMO_REGION",
			})
		}

		const body = event.body ? JSON.parse(event.body) : {}

		const email = normaliseEmail(body?.email)
		const password = body?.password

		if (!email || !password) {
			return res.status(400).json({
				status: "error",
				message: "Email and password are required",
			})
		}

		const existing = await ddb.send(
			new GetCommand({
				TableName: TABLE_NAME,
				Key: { email },
			}),
		)

		if (existing.Item) {
			return res
				.status(409)
				.json({ status: "error", message: "User already exists" })
		}

		const passwordData = hashPassword(password)

		await ddb.send(
			new PutCommand({
				TableName: TABLE_NAME,
				Item: {
					email,
					password: passwordData,
					createdAt: new Date().toISOString(),
				},
				ConditionExpression: "attribute_not_exists(email)",
			}),
		)

		return res.status(201).json({
			status: "created",
			user: { email },
		})
	} catch (e) {
		if (e?.name === "ConditionalCheckFailedException") {
			return res.status(409).json({
				status: "error",
				message: "User already exists",
			})
		}

		console.error("createUser error:", e)
		return res.status().json({
			status: "error",
			message: "Could not create user",
		})
	}
}
