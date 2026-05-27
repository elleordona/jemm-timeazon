import React, { useState } from "react";
import "./Login.css";
import { Link, useNavigate } from "react-router-dom";
import { setSessionEmail } from "../sessionUser";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        "https://timeazon.cta-training.academy/api/login",
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
        throw new Error(data.message || "Login failed");
      }

      // remember the user for this browser tab
      setSessionEmail(email);
      setMessage("Login successful!");

      // let the rest of the app know auth + cart may have changed
      window.dispatchEvent(new Event("authChanged"));
      window.dispatchEvent(new Event("cartUpdated"));

      // redirect after login
      setTimeout(() => {
        navigate("/Homepage");
      }, 800);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="login-container">
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        <h1>Initialize Access</h1>

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

        {message && <p>{message}</p>}

        <div className="forgot-password">
          <Link className="password" to="/PasswordReset">
            Forgot Password?
          </Link>
        </div>

        <div className="signup-link">
          <p>
            Do not have an account?{" "}
            <Link className="signup" to="/signup">
              Sign Up
            </Link>
          </p>
        </div>
      </form>
    </div>
    </div>
  );
};

export default Login;
