import React from "react";
import FileSaver from "file-saver";
import './App.css';
import * as tf from '@tensorflow/tfjs';
import * as speechCommands from '@tensorflow-models/speech-commands';
import recognize from "./scripts/test";
import { MusicVAE } from "@magenta/music";

export default function App() {
  function sayHello() {
    let lytext = `\\relative {
      d' f a g
      c b f d
      }`
    var blob = new Blob([lytext], {
      type: "text/plain;charset=utf-8"
    });
    FileSaver.saveAs(blob, "test.ly");
  }

  function onDragOver (event){
    event.preventDefault();
    console.log("hello");
  }

  function dropHandler(ev) {
    ev.preventDefault();
    console.log("File(s) dropped");
  
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
  
    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      [...ev.dataTransfer.items].forEach((item, i) => {
        // If dropped items aren't files, reject them
        if (item.kind === "file") {
          const file = item.getAsFile();
          console.log(file);
        }
      });
    } else {
      // Use DataTransfer interface to access the file(s)
      [...ev.dataTransfer.files].forEach((file, i) => {
        console.log(file);
      });
    }
  }

  async function createModel() {
    console.log("im before the URL");
    const URL = "https://teachablemachine.withgoogle.com/models/zooc9DnKb/";

    const checkpointURL = URL + "model.json"; // model topology
    const metadataURL = URL + "metadata.json"; // model metadata

    const recognizer = speechCommands.create(
      "BROWSER_FFT", // fourier transform type, not useful to change
      undefined, // speech commands vocabulary feature, not useful for your models
      checkpointURL,
      metadataURL
    );

    // check that model and metadata are loaded via HTTPS requests.
    await recognizer.ensureModelLoaded();

    return recognizer;
  }

  async function init() {
    const recognizer = await createModel();
    const classLabels = recognizer.wordLabels(); // get class labels
    const labelContainer = document.getElementById("label-container");
    for (let i = 0; i < classLabels.length; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // listen() takes two arguments:
    // 1. A callback function that is invoked anytime a word is recognized.
    // 2. A configuration object with adjustable fields
    recognizer.listen(
      (result) => {
        const scores = result.scores; // probability of prediction for each class
        // render the probability scores per class
        for (let i = 0; i < classLabels.length; i++) {
          const classPrediction =
            classLabels[i] + ": " + result.scores[i].toFixed(2);
            console.log(classLabels[i]);
          labelContainer.childNodes[i].innerHTML = classPrediction;
        }
      },
      {
        includeSpectrogram: true, // in case listen should return result.spectrogram
        probabilityThreshold: 0.75,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.5, // probably want between 0.5 and 0.75. More info in README
      }
    );

    // Stop the recognition in 5 seconds.
    // setTimeout(() => recognizer.stopListening(), 5000);
  }

  return (
    <div className="App">
    <div className="box-holder">
      <div className="box1 tester">
          <p>File input and output test</p>
          <button onClick={sayHello}>Click me!</button>
          <div
            id = "drop_zone"
            onDragOver={onDragOver}
            onDrop={dropHandler}
            >
            Drag and drop file here
          </div>
        </div>

        <div className="box2 tester">
          <p>Teachable Machine Audio Model</p>
          <button type="button" onClick={init}>Start</button>
          <div id="label-container">test text</div>
        </div>

        <div className="box3 tester">
          <p>Audio Recognition Algorithm</p>
          <div id="note"></div>
          <button onClick={() => {
            window.requestAnimationFrame(recognize)
          }}>Start Recognizing</button>
        </div>

        <div className="box4 tester">
          <p>Magenta AI test</p>
        </div>
      </div>
    </div>
  );
}
