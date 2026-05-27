import React, { useState } from "react";
import "./Signup.css";
import { Link } from "react-router-dom";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // optional for later
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); // stop page reload

    try {
      const response = await fetch(
        "https://timeazon.cta-training.academy/api/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      setMessage("Account created successfully!");
      setEmail("");
      setPassword("");
      setUsername("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="signup-container">
    <div className="signup-page">
      <form onSubmit={handleSubmit}>
        <h1>Create An Account</h1>

        <div className="input-container">
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-container">
          <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-container">
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="submit-btn" type="submit">
          Confirm
        </button>

        {message && <p className="accountconfirm">{message}</p>}

        <div className="forgot-password">
          <Link className="password" to="/PasswordReset">
            Forgot Password?
          </Link>
        </div>

        <div className="login-link">
          <p>
            Already have an account?{" "}
            <Link className="login" to="/login">
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
    </div>
  );
};

export default Signup;
