import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "https://khedutmitra-backend.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: mobile, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify({ name: data.name, token: data.token }));
      navigate("/dashboard");
    } catch (err) {
      setError("Could not connect to the server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2>🙏 Welcome Back</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Mobile Number</label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <div className="show-password-toggle">
          <input
            type="checkbox"
            id="showPassLogin"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)}
          />
          <label htmlFor="showPassLogin">Show password</label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="switch-link">
        New farmer? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default Login;