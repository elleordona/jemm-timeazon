// Logic for get image upload
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3 = new S3Client({});

export const getImageUploadUrl = async (req, res) => {
    try {
        console.log(req.body)
        const body = req.body || '{}'
        const { fileName, fileType } = body

        if (!fileName || !fileType) {
            return res.status(400).json({
                message: 'fileName and fileType are required'
            })
        }

        const bucketName = process.env.STATIC_IMAGES_BUCKET
        const baseUrl = process.env.STATIC_IMAGES_BASE_URL

        if (!bucketName || !baseUrl) {
            return res.status(500).json({
                message: 'Missing static image env variables'
            })
        }

        const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
        const key = safeName
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType
        })

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 })

        const finalUrl = `${baseUrl}/${key}`

        return res.status(200).json({
            uploadUrl,
            finalUrl,
            key: safeName
        })

    } catch (e) {
        console.error("Image Upload Error: ", e)
        return res.status(500).json({
            message: "Could not create upload URL"
        })
    }
}
