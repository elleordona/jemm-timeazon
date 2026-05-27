import React from 'react';
import "./PasswordReset.css";
import { Link } from "react-router-dom";

const PasswordReset = () => {
  return (
    <div className='password-container'>
      <div className="password-page">
        <form action="">
          <h1>Reset Your Password</h1>
          <div className="input-container">
            <input type="password" placeholder="Password" required/>
          </div>
            <div className="input-container">
            <input type="password" placeholder="Enter Your Password Again" required/>
          </div>
          <button className='submit-btn' type="submit">Confirm</button>


          <div className="login-link">
          <p>Already have an account? <a className='login' as={Link} href="/login">Login</a></p>
          </div>
          
        </form>
</div>
</div>
);
};

export default PasswordReset;