import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import "./App.css";
import farmBg from "./farm-bg.jpg";

// Simple check: is someone currently logged in? (stored in browser for now)
function isLoggedIn() {
  return localStorage.getItem("currentUser") !== null;
}

// A "protected route" - if not logged in, bounce back to login page
function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <div
        className="farm-background"
        style={{
          backgroundImage: `linear-gradient(rgba(20, 40, 20, 0.75), rgba(20, 40, 20, 0.75)), url(${farmBg})`
        }}
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;