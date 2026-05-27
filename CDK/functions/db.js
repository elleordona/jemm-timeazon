// functions/db.js
import client from "data-api-client";

import {
  sql00_dropAllTables,
  sql01_createProductsTable,
  sql02_seedProducts
} from "./db-bootstrap-sqls.js";

const connection = client({
  secretArn: process.env.SECRET_ARN || "NOT_SET",
  resourceArn: process.env.CLUSTER_ARN || "NOT_SET",
  database: process.env.DB_NAME || "NOT_SET"
});

export async function runQuery(sql, params = {}) {
  if (!sql || !sql.trim()) return;
  return connection.query(sql, params);
}

// Bootstrap: wipe and re seed only the products table
export async function bootstrapDatabase() {
  const statements = [
    sql00_dropAllTables,
    sql01_createProductsTable,
    sql02_seedProducts
  ];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n=== Running bootstrap SQL #${i + 1} ===`);
    console.log(statement);

    await runQuery(statement);
    console.log(`=== SQL #${i + 1} OK ===`);
  }

  return 201;
}
