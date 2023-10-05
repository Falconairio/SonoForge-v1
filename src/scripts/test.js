import autoCorrelate from "./autocorrelate";
/*
The MIT License (MIT)
Copyright (c) 2014 Chris Wilson
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Note: autoCorrelate comes from https://github.com/cwilso/PitchDetect/pull/23
with the above license.

*/

function recognize() {
    var source;
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    var analyser = audioContext.createAnalyser();
    analyser.minDecibels = -100;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    var constraints = {audio: true};

      navigator.mediaDevices.getUserMedia(constraints)
        .then(
          function(stream) {
            // Initialize the SourceNode
            source = audioContext.createMediaStreamSource(stream);
            // Connect the source node to the analyzer
            source.connect(analyser);
            updateNote();
          }
        )
        .catch(function(err) {
          console.error(err)
          alert('Sorry, microphone permissions are required for the app. Feel free to read on without playing :)')
        });
    // }
  
      var previousValueToDisplay = 0;
      var smoothingCount = 0;
      var smoothingThreshold = 5;
      var smoothingCountThreshold = 5;
  
      // Thanks to PitchDetect: https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
      var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
      var updateNote = function() {
        requestAnimationFrame(updateNote);
        var bufferLength = analyser.fftSize;
        var buffer = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(buffer);
        var autoCorrelateValue = autoCorrelate(buffer, audioContext.sampleRate)

        var valueToDisplay = noteStrings[noteFromPitch(autoCorrelateValue) % 12];
  
        // var smoothingValue = document.querySelector('input[name="smoothing"]:checked').value
        var smoothingValue = 'basic';
  
        if (autoCorrelateValue === -1) {
          document.getElementById('note').innerText = 'Too quiet... ';
          return;
        }
        if (smoothingValue === 'none') {
          smoothingThreshold = 99999;
          smoothingCountThreshold = 0;
        } else if (smoothingValue === 'basic') {
          smoothingThreshold = 10;
          smoothingCountThreshold = 5;
        } else if (smoothingValue === 'very') {
          smoothingThreshold = 5;
          smoothingCountThreshold = 10;
        }
        function noteIsSimilarEnough() {
          // Check threshold for number, or just difference for notes.
          if (typeof(valueToDisplay) == 'number') {
            return Math.abs(valueToDisplay - previousValueToDisplay) < smoothingThreshold;
          } else {
            return valueToDisplay === previousValueToDisplay;
          }
        }
        // Check if this value has been within the given range for n iterations
        if (noteIsSimilarEnough()) {
          if (smoothingCount < smoothingCountThreshold) {
            smoothingCount++;
            return;
          } else {
            previousValueToDisplay = valueToDisplay;
            smoothingCount = 0;
          }
        } else {
          previousValueToDisplay = valueToDisplay;
          smoothingCount = 0;
          return;
        }
        if (typeof(valueToDisplay) == 'number') {
          valueToDisplay += ' Hz';
        }
        document.getElementById('note').innerText = valueToDisplay + octaveFromPitch(autoCorrelateValue);
      }
    }

  function noteFromPitch(frequency) {
    var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
    return Math.round( noteNum ) + 69;
  }

  function octaveFromPitch(frequency) {
    /* this should be set to zero ideally, but for some reason when the frquency hits the mic 
    it is double what it should be, and thus thinks its an octave higher */
    let counter = 1;
    let currentFrequency = frequency;
    let hasReachedLowestOctave = false;
    while(!hasReachedLowestOctave) {
      if(currentFrequency/2 <= 30.87) {
        hasReachedLowestOctave = true;
      } else {
        currentFrequency /= 2
        counter++;
      }
    }
    return counter;
  }

export default recognize;