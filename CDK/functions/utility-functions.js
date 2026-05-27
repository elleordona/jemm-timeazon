// functions/utility-functions.js
import { runQuery, bootstrapDatabase } from './db.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3 = new S3Client({})


// Small helper to keep responses consistent
function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    body: JSON.stringify(payload)
  };
}

// Normalise the result from data-api-client / RDS Data API
const normaliseRows = (result) => {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows)) return result.rows;
  if (Array.isArray(result.records)) return result.records;
  return [];
};

const logInvocationDetails = (event, context) => {
  console.log('Event received:');
  console.log(JSON.stringify(event, null, 2));

  if (context) {
    console.log('Context received:');
    console.log({
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      awsRequestId: context.awsRequestId,
      remainingTimeMs: context.getRemainingTimeInMillis()
    });
  }
};

// -------------------------
// S3 HANDLER 
// -------------------------

export const getImageUploadUrlHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}")
    const { fileName, fileType } = body

    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "fileName and fileType are required" })
      }
    }

    const bucketName = process.env.STATIC_IMAGES_BUCKET
    const baseUrl = process.env.STATIC_IMAGES_BASE_URL

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
    const key = safeName
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 })

    const finalUrl = `${baseUrl}/${key}`

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        uploadUrl,
        finalUrl,
        key
      })
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not create upload url" })
    }
  }
}

// -------------------------
// BOOTSTRAP HANDLER (optional)
// -------------------------
export const bootstrapHandler = async (event, context) => {
  logInvocationDetails(event, context);

  try {
    const code = await bootstrapDatabase();

    return jsonResponse(code, {
      status: 'ok',
      message: 'Database reset and seeded with sample timeazon data'
    });
  } catch (err) {
    console.error('bootstrapHandler error:', err);

    return jsonResponse(500, {
      status: 'error',
      message: 'Failed to bootstrap database'
    });
  }
};

// -------------------------
// PRODUCTS
// -------------------------
export const productCatalogHandler = async () => {
  try {
    const result = await runQuery(`
      SELECT id, name, description, price_credit, image_url, era
      FROM products;
    `);

    const products =
      result?.records ||
      result?.rows ||
      [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        products
      })
    };

  } catch (error) {
    console.error("Catalog error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: "Failed to load products"
      })
    };
  }
};

  // try {
    
//     const result = await runQuery(`
//       SELECT name, description, price_credit, image_url, era
//       FROM products;
//     `)

//     const rows = normaliseRows(result)

//     // Use the pdf_url to derive the slug the front end expects
//     const productObjects = rows.map((r) => ({
//       name: r.name,
//       description: r.description,
//       priceCredit: r.price_credit,
//       imageUrl: r.image_url,
//       slug: r.image_url.replace(/\.image$/i, '')
//     }))

//     const productSlugs = productObjects.map((p) => p.slug)

//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         status: 'ok',
//         featuredProduct: process.env.FEATURED_PRODUCT || null,
//         products: productSlugs,        // what the UI already uses
//         productDetails: productObjects // extra data if you need it later
//       })
//     }
//   } catch (error) {
//     console.error('productCatalogHandler error:', error)

//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         status: 'error',
//         message: 'Failed to load products'
//       })
//     }
//   }
// }

export const postProductHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    if (!body.name || typeof body.price_credit !== "number") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: "error",
          message: "name and price_credit required"
        })
      };
    }

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

    const product =
      result?.records?.[0] ||
      result?.rows?.[0];

    return {
      statusCode: 201,
      body: JSON.stringify({
        status: "created",
        product
      })
    };

  } catch (error) {
    console.error("Error creating product:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: "Could not create product"
      })
    };
  }
};

export const deleteProductHandler = async (event) => {
  try {
    const id =event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: "error",
          message: "Product Id is required"
        })
      };
    }
  
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
    return {
      statusCode: 404,
      body: JSON.stringify({
        status: "error",
        message: "Product not found"
      })
    };
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "deleted",
      product
    })
  };

} catch (error) {
    console.error("Error creating product:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: "Could not create product"
      })
    };
  }
};





  //Signup 
  export const postUsersHandler = async (event, context) => {
  logInvocationDetails(event, context);

  try {
    if (!event.body) {
      return jsonResponse(400, {
        status: 'error',
        message: 'Request body is required'
      });
    }

    const { user_id, name, username, email } = JSON.parse(event.body);

    // Basic validation
    if (!user_id || !name || !username || !email) {
      return jsonResponse(400, {
        status: 'error',
        message: 'username, email and password are required'
      });
    }

    // For now, just echo back what was sent
    return jsonResponse(201, {
      status: 'User created successfully',
      user: {
        user_id,
        name,
        username,
        email
      }
    });

  } catch (error) {
    console.error('postUsersHandler error:', error);

    return jsonResponse(500, {
      status: 'error',
      message: 'Failed to create user'
    });
  }
}

export const loginHandler = async (event, context) => {
  logInvocationDetails(event, context);

  try {
    if (!event.body) {
      return jsonResponse(400, {
        status: 'error',
        message: 'Request body is required'
      });
    }

    const { email, password } = JSON.parse(event.body);

    // Basic validation
    if (!email || !password) {
      return jsonResponse(400, {
        status: 'error',
        message: 'email and password are required'
      });
    }

    // Replace this later with DB lookup + password hash comparison
    if (email === 'dash@example.com' && password === 'password123') {
      return jsonResponse(200, {
        status: 'Login successful',
        user: {
          email
        },
        token: 'fake-jwt-token'
      });
    }

    return jsonResponse(401, {
      status: 'error',
      message: 'Invalid email or password'
    });

  } catch (error) {
    console.error('loginHandler error:', error);

    return jsonResponse(500, {
      status: 'error',
      message: 'Login failed'
    });
  }
};

