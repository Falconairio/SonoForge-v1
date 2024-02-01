import React, { Component } from 'react'
import { MusicRNN, Player, sequences } from "@magenta/music";
import autoCorrelate from "./../scripts/autocorrelate";
import generateLookupTable from "./../scripts/noteLTableGenerator";
import octaveFromPitch from '../scripts/octaveFromPitch';
import Timeline from './Timeline';

export default class RecognizerComponent extends Component {
    state = {
        player : null,
        isRecording : false,
        noteSequence: {
            notes: [
            ],
            totalTime: 0
        },
        notes: [],
        seconds: 0,
        timerCallback: null,
        source: null,
        inputStream: null
    }

    componentDidMount = () => {
        this.setState({
            player: new Player()
        }, () => {
            this.state.player.polySynth.volume._initialValue = 0.5
            this.state.player.bassSynth.volume._initialValue = 0.5
        })
    }

    handleStartStopRecognition = () => {
        if(!this.state.isRecording) {
            this.setState({
                isRecording: true
            })

            let callback = setInterval(this.updateTimer, 1000)
            this.setState({timerCallback: callback})

            this.recognize()
        } else {
            this.state.inputStream.getTracks().forEach(function(track) {
                track.stop();
            });
            this.state.inputStream = null;

            clearInterval(this.state.timerCallback)
            if(this.state.notes.length === 0) {
                alert('No notes recognized. Please try again.')
            }
            document.getElementById('note').innerText = ""
            this.setState({
                isRecording: false, 
                timerCallback: null
            })
        }
    }

    isRecording = () => {
        return this.state.isRecording
    }

    setStream = (stream) => {
        this.setState({inputStream : stream})
    }

    playSequence = () => {
        if (this.state.player.isPlaying()) {
            this.state.player.stop();
        }
        this.state.player.start(this.state.noteSequence)
    }

    clearSequence = () => {
        this.setState({notes: [], noteSequence: {notes: [], totalTime: 0}})
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
        var streamSetter = this.setStream
        var lookupTable = generateLookupTable();
        var checkRecording = this.isRecording;
    
          navigator.mediaDevices.getUserMedia(constraints)
            .then(
              function(stream) {
                // Initialize the SourceNode
                source = audioContext.createMediaStreamSource(stream);
                streamSetter(stream)
                // Connect the source node to the analyzer
                source.connect(analyser);
                updateNote();
              }
            )
            .catch(function(err) {
              console.error(err)
              alert('Sorry, microphone permissions are required for the app. Feel free to read on without playing :)')
            });
      
            var startingTime = 0.0;
            var heldNote = "";
            var heldNoteOctave = 0
        
            // Thanks to PitchDetect: https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
            var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      
          var updateNote = function () {
            if(checkRecording()) {
                requestAnimationFrame(updateNote)
            }
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
                try {
                    document.getElementById('note').innerText = 'None';
                } catch (error) {
                    console.log(error)
                } finally {
                    return;
                }
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
            try {
                document.getElementById('note').innerText = currentNote + currentOctave;
            } catch (error) {
                console.log(error)
            }
          }

        var noteFromPitch = (frequency) => {
            var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
            return Math.round( noteNum ) + 69;
        }

        var roundToNearest = (numToRound, numToRoundTo) => {
            numToRoundTo = 1 / (numToRoundTo)
        
            return Math.round(numToRound * numToRoundTo) / numToRoundTo;
        }
    }

    updateTimer = () =>  {
        let seconds = this.state.seconds
        seconds++;
        this.setState({ seconds: seconds })
    }

  render() {
    return (
    <div className='recognizer-container'>
        {
            !this.state.isRecording && this.state.notes.length === 0 
            ? 
            <button className='recording-page-button'
            onClick={() => {
                this.handleStartStopRecognition()
                }}>Start Recording</button> 
            : 
            <div className='recording-container'>
                {
                    this.state.isRecording 
                    ? 
                    <div className="recording-box">
                        <div className='recording-top-row'>
                            <button onClick={() => {
                                this.handleStartStopRecognition()
                                }}>Stop Recording</button> 
                            <div>
                                <h1>Currently Played Note:</h1>
                                <h2 id="note"></h2>
                            </div>
                            <div className='timer'>{
                                this.state.seconds > 0
                                ? this.state.seconds + "seconds"
                                : null
                            }</div>
                        </div>
                    </div>
                    : 
                    <div className="finish-recording-box">
                        <button className="recording-page-button"
                        onClick={this.playSequence}>
                        Listen
                        </button>
                        <button className="recording-page-button"
                        onClick={this.clearSequence}>
                        Rerecord
                        </button>
                        <button className="recording-page-button"
                        onClick={this.props.complete}>
                        Continue
                        </button>
                    </div>
                }
            </div>
        }
       
    </div>
    )
  }
}
