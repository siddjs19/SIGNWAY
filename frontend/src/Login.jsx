

import { useState } from "react";
import authService from "./services/authService";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      let response;

      if (isLogin) {
        // Login existing user
        response = await authService.login(email, password);
      } else {
        // Register a new user
        response = await authService.register({
          name,
          email,
          password,
        });
      }

      setMessage(response.message || "Success!");

      if (isLogin) {
        // Notify App.jsx that login succeeded
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess(response.user);
        }
      } else {
        // Switch back to Login after successful registration
        setIsLogin(true);
        setPassword("");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-icon">🤟</div>

        <h1>SignBridge AI</h1>

        <p className="auth-subtitle">
          Learn Indian Sign Language. Connect with the world.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              setMessage("");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={!isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(false);
              setMessage("");
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>

              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login"
                : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Making communication more inclusive, one sign at a time.
        </p>
      </div>
    </div>
  );
}

export default Login;

