// Utility functions for controllers

// Imports
import client from 'data-api-client'

// Create a connection to the RDS database
const connection = client({
    secretArn: process.env.SECRET_ARN || "NOT_SET",
    resourceArn: process.env.CLUSTER_ARN || "NOT_SET",
    database: process.env.DB_NAME || "NOT_SET"
});

export const runQuery = async (sql, params = {}) => {
    if (!sql || !sql.trim()) return;

    return connection.query(sql, params);
}
