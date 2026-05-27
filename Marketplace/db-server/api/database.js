require("dotenv").config();
const { Pool } = require("pg");

// Use a pool of connections so our API can serve many requests
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Small helper to run queries
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

// Getting all the users 
async function getAllUsers() {
  // TODO: replace this with a real query
  const result = await query(
    //SQL GOES HERE
    `SELECT * FROM users
    ORDER BY user_id;`
  ); 
  console.log (result)
  return result.rows;
}

module.exports = {
  query,
  getAllUsers,
};
