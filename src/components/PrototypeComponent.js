import React, { Component } from 'react'
import { MusicRNN, Player, sequences } from "@magenta/music";
// import recognize from "./scripts/recognize";
import autoCorrelate from "./scripts/autocorrelate";
import generateLookupTable from "./scripts/noteLTableGenerator";

export default class PrototypeComponent extends Component {
    state = {
        model : new MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
        player : null,
        hasBeenClicked : false,
        functionRun : null,
        temperature : 0.0,
        steps: 16,
        noteSequence: {
            notes: [
            ],
            totalTime: 0
        },
        notes: [],
        changedSequence: null
    }

    componentDidMount = () => {
        this.setState({
            player: new Player()
        }, () => {
            
            this.state.player.polySynth.volume._initialValue = 0.5
            this.state.player.bassSynth.volume._initialValue = 0.5
            this.state.model.initialize();
        })
    }

    playUpdatedSequence = () => {
        let origNotes = this.state.noteSequence.notes
        let qNotes = sequences.quantizeNoteSequence(origNotes,4)
        let origTime = this.state.noteSequence.totalTime
        let extraNotes = this.state.changedSequence.notes
        let extraTime = this.state.changedSequence.totalTime

        let newNS = {
            notes: [
                qNotes.notes.concat(extraNotes)
            ],
            totalTime: 20
        }

        if (this.state.player.isPlaying()) {  
            this.state.player.stop();
            return;
          }
        this.state.player.start(newNS)
    }

    testFunc = () => {
        if (this.state.player.isPlaying()) {  
            this.state.player.stop();
            return;
          }
        
        let notes = sequences.quantizeNoteSequence(this.state.noteSequence, 4);

        this.state.model
        .continueSequence(notes, this.state.steps,this.state.temperature)
        .then((sample) => {
            if(sample.notes.length > 0) {
                this.setState({
                    changedSequence : sample
                })
            }
        }).catch( (err) => console.log(err))
    }

    handleStartStopRecognition = () => {
        if(!this.state.hasBeenClicked) {
            this.setState({
                hasBeenClicked: true
            })
            this.recognize()
            document.getElementById('recbutton').innerText = "Stop Recognizing";
        } else {
            cancelAnimationFrame(this.state.functionRun)
            document.getElementById('recbutton').innerText = "Start Recognizing";
            document.getElementById('note').innerText = ""
            this.setState({hasBeenClicked: false, 
                functionRun: null})
            console.log(this.state.noteSequence);
        }
    }

    setCallback = (callback) => {
        this.setState({functionRun : callback})
    }

    addNoteToSequence = (note) => {
        let notesUp = this.state.notes
        let noteEndTime = Math.ceil(note["endTime"])

        notesUp.push(note)

        let newNS = {
            notes: notesUp,
            totalTime: noteEndTime
        }
        this.setState({
            noteSequence: newNS,
            notes: notesUp,
        })   
    }

    recognize = () => {
        var source;
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var analyser = audioContext.createAnalyser();
        analyser.minDecibels = -100;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;
        var constraints = {audio: true};
        var stateSetter = this.addNoteToSequence
        var callbackSetter = this.setCallback
        var lookupTable = generateLookupTable();
    
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
      
          var startingTime = 0.0;
          var heldNote = "";
          var heldNoteOctave = 0
        //   var smoothingCount = 0;
        //   var smoothingCountThreshold = 5;
      
          // Thanks to PitchDetect: https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
          var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      
          var updateNote = function () {
            callbackSetter(requestAnimationFrame(updateNote));
            var bufferLength = analyser.fftSize;
            var buffer = new Float32Array(bufferLength);
            analyser.getFloatTimeDomainData(buffer);
            var autoCorrelateValue = autoCorrelate(buffer, audioContext.sampleRate)
    
            var currentNote = noteStrings[noteFromPitch(autoCorrelateValue) % 12];
            var currentOctave = octaveFromPitch(autoCorrelateValue);

            // console.log(lookupTable);

            if (autoCorrelateValue === -1) {
                if(heldNote.length > 0) {
                    if(audioContext.currentTime - startingTime > 0.15) {
                        let note = {pitch: lookupTable[`${heldNote}${heldNoteOctave}`], 
                        startTime: startingTime, endTime: audioContext.currentTime}
                        stateSetter(note)
                    }
                    heldNote = ""
                    heldNoteOctave = 0
                   
                }
              document.getElementById('note').innerText = 'Too quiet... ';
              return;
            } else {
                if(currentNote !== heldNote) {
                    if(heldNote.length > 0 && audioContext.currentTime - startingTime > 0.125) {
                        let note = {pitch: lookupTable[`${heldNote}${heldNoteOctave}`], 
                        startTime: roundToNearest(startingTime,0.125), 
                        endTime: roundToNearest(audioContext.currentTime,0.125)}
                        stateSetter(note)
                    }
                    startingTime = audioContext.currentTime
                    heldNote = currentNote
                    heldNoteOctave = currentOctave
                }
            }

            // Check if this value has been within the given range for n iterations
            // if (valueToDisplay === previousValueToDisplay) {
            //   if (smoothingCount < smoothingCountThreshold) {
            //     smoothingCount++;
            //     return;
            //   } else {
            //     previousValueToDisplay = valueToDisplay;
            //     smoothingCount = 0;
            //   }
            // } else {
            //   previousValueToDisplay = valueToDisplay;
            //   smoothingCount = 0;
            //   return;
            // } 
    
            document.getElementById('note').innerText = currentNote + currentOctave;
          }

        var noteFromPitch = (frequency) => {
            var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
            return Math.round( noteNum ) + 69;
        }
        
        var octaveFromPitch = (frequency) => {
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

        var roundToNearest = (numToRound, numToRoundTo) => {
            numToRoundTo = 1 / (numToRoundTo)
        
            return Math.round(numToRound * numToRoundTo) / numToRoundTo;
        }
    }

  render() {
    return (
    <div className="box3 tester">
        {/* <button onClick={this.playUpdatedSequence}>Put em' together</button> */}
        <button onClick={() => {
          this.state.player.start(this.state.changedSequence)
        }}>Play Generation</button>
        <button onClick={() => {
            this.testFunc()
          }}>Generate Music</button>
        <input placeholder='steps' onChange={(change) => {
            this.setState({steps: parseFloat(change.target.value)})
        }}></input>
        <input placeholder='temperature' onChange={(change) => {
            this.setState({temperature: parseFloat(change.target.value)})
        }}></input>
        <button onClick={() => {
          this.state.player.start(this.state.noteSequence)
        }}>Play Recording</button>
        <div id="note"></div>
        <button id = "recbutton" onClick={() => {
            this.handleStartStopRecognition()
        }}>Start Recognizing</button>
    </div>
    )
  }
}
