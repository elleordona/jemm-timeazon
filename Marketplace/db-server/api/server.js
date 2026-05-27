require("dotenv").config();
const express = require("express");
const database = require("./database");

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// Health check
app.get("/", (request, response) => {
  response.json({ message: "User API is running" });
});

// GET /users  – list all users
app.get("/users", async (request, response) => {
  try {
    const users = await database.getAllUsers();
    response.json(users);
  } catch (err) {
    console.error(err);
    response.status(500).json({ error: "Failed to fetch users" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
