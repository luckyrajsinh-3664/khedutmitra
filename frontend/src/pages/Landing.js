import React from "react";
import { useNavigate } from "react-router-dom";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-content">
      <h1>🌾 KhedutMitra</h1>
      <p className="tagline">ખેડૂત મિત્ર — Your Farming Companion</p>

      <div className="description">
        <p>
          Gujarat's farmers face uncertainty every season — will crop prices
          rise or fall? Which mandi pays the best price? When is the right
          time to harvest and sell?
        </p>
        <p>
          <strong>KhedutMitra</strong> uses real market data and AI to answer
          these questions for you — giving price forecasts, demand trends,
          and harvest recommendations for 9 major Gujarat crops, so you can
          make confident decisions and get the best value for your produce.
        </p>
      </div>

      <button className="btn-getstarted" onClick={() => navigate("/login")}>
        Get Started
      </button>
    </div>
  );
}

export default Landing; 