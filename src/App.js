import React from "react";
import './styles/App.css';
import { Outlet, Link } from "react-router-dom";

export default function App() {
  return (
    <div className="App">
      <div className="top-bar-container">
          <h1 className="top-bar-title">MusicMaker</h1>
          <div className="top-bar-items">
              <Link to="/" id = "homelink">Home</Link>
              <Link to="/about" id = "aboutlink">About</Link>
          </div>
      </div>
      <Outlet />
    </div>
  );
}
