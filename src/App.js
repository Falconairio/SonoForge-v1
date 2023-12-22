import React from "react";
import './App.css';
import MusicComponent from "./MusicComponent";
import RecognizerComponent from "./RecognizerComponent";

export default function App() {
  return (
    <div className="App">
    <div className="box-holder">
        <RecognizerComponent />
      </div>
    </div>
  );
}
