import React, { Component } from 'react'
import { Player } from "@magenta/music";
import autoCorrelate from "./../scripts/autocorrelate";
import generateLookupTable from "./../scripts/noteLTableGenerator";
import octaveFromPitch from '../scripts/octaveFromPitch';

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
        inputStream: null,
        selectedTS: "4/4",
        selectedQZ: 4,
        selectedTP: 60,
        inputsInView: true
    }

    componentDidMount = () => {
        this.setState({
            player: new Player(),
        }, () => {
            this.handleSetSelects()
            this.state.player.polySynth.volume._initialValue = 0.5
            this.state.player.bassSynth.volume._initialValue = 0.5
        })
    }

    handleSetSelects = () => {
        if(this.state.inputsInView) {
            let qz = document.getElementById("qz")
            let ts = document.getElementById("ts")
            let tp = document.getElementById("tp")

            qz.value = this.state.selectedQZ
            ts.value = this.state.selectedTS
            tp.value = this.state.selectedTP
        }
    }

    handleStartStopRecognition = () => {
        if(this.state.selectedTP >= 60 && this.state.selectedTP <= 250) {
            if(!this.state.isRecording) {
                this.setState({
                    isRecording: true
                })

                let callback = setInterval(this.updateTimer, 1000)
                this.setState({timerCallback: callback, inputsInView: false})

                this.recognize()
            } else {
                this.state.inputStream.getTracks().forEach(function(track) {
                    track.stop();
                });
                this.state.inputStream = null;

                clearInterval(this.state.timerCallback)
                if(this.state.notes.length === 0) {
                    this.setState({ inputsInView: true, seconds: 0})
                    alert('No notes recognized. Please try again.')
                    
                }
                document.getElementById('note').innerText = ""
                this.setState({
                    isRecording: false, 
                    timerCallback: null
                }, () => {
                    this.handleSetSelects()
                })
            }
        } else {
            alert("Please select a tempo within the range 60-250, otherwise your" +
                "composition will be near impossible to play :)")
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
        this.setState({notes: [], 
            noteSequence: {notes: [], totalTime: 0},
            inputsInView: true,
            seconds: 0 } , () => {
                this.handleSetSelects()
            })
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
        var stateSetter = this.addNoteToSequence
        var streamSetter = this.setStream
        var lookupTable = generateLookupTable();
        var checkRecording = this.isRecording;
        const amountToRound = this.state.selectedQZ
        const tempo = this.state.selectedTP;
        const beatLengthInSeconds = 60/tempo
        const typeOfBeat = parseInt(this.state.selectedTS.charAt(2))
    
          navigator.mediaDevices.getUserMedia({audio: true})
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

            let noteLengthToRoundTo = typeOfBeat/amountToRound * beatLengthInSeconds
            let st = roundToNearest(startingTime,noteLengthToRoundTo)
            let et = roundToNearest(audioContext.currentTime,noteLengthToRoundTo)
            //if there is no note detected on this loop
            if (autoCorrelateValue === -1) {
                //and there was a note being held
                if(heldNote.length > 0) {
                    //CHANGE THIS TO ROUND
                    if(audioContext.currentTime - startingTime >= noteLengthToRoundTo/2) {
                        let note = {pitch: lookupTable[`${heldNote}${heldNoteOctave}`], 
                        startTime: st, 
                        endTime: st !== et ? et : et + noteLengthToRoundTo}
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
            //if there IS a note detected on this loop
            } else {
                //and it is DIFFERENT to the note 
                if(currentNote !== heldNote) {
                    //and it is close enough to the note length we need to round to, as well as the held note
                    //not being empty
                    if(audioContext.currentTime - startingTime >= noteLengthToRoundTo/2 && heldNote.length > 0) {
                        let note = {pitch: lookupTable[`${heldNote}${heldNoteOctave}`], 
                        startTime: st, 
                        endTime: st !== et ? et : et + noteLengthToRoundTo}
                        stateSetter(note)

                        try {
                            document.getElementById('note').innerText = currentNote + currentOctave;
                        } catch (error) {
                            console.log(error)
                        }
                    }
                    startingTime = audioContext.currentTime
                    heldNote = currentNote
                    heldNoteOctave = currentOctave
                } else {
                    if(audioContext.currentTime - startingTime >= noteLengthToRoundTo/2 && heldNote.length > 0) {
                        try {
                            document.getElementById('note').innerText = currentNote + currentOctave;
                        } catch (error) {
                            console.log(error)
                        }
                    }
                }
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

    submit = () => {
        this.props.complete(
            this.state.noteSequence,
            this.state.selectedTS,
            this.state.selectedQZ,
            this.state.selectedTP)
    }

  render() {
    return (
    <div className='recognizer-container'>
        {
            !this.state.isRecording && this.state.notes.length === 0 
            ? 
            <div className='options-box'>

            <div className="recognizer-columns">
                <div className="recognizer-column">
                    <h2 className="recognizer-column-title">
                        Quantization:
                        <span className='tooltip tt1'>
                        Quantization is the closest your note can get to the selected note 
                        length while playing. When your input is recognized, any notes will
                        be rounded to the nearest value of what has been selected. This 
                        will make your computed audio more accurate to what was played, but 
                        can cause inconsistencies due to tiny frequency changes being picked
                        up as different notes.
                        </span>
                    </h2>
                    <h2 className="recognizer-column-title">
                        Tempo/BPM:
                        <span className='tooltip tt2'>
                        The Tempo, or more simply the Beats Per Minute, is the number of single
                        beats that come within one minute of music. What you select for this will
                        work in conjunction with the time signature to generate the correct
                        representation for your recorded music.
                        </span>
                    </h2>
                    <h2 className="recognizer-column-title">
                        Time Signature:
                        <span className='tooltip tt3'>
                        The Time Signature signifies which type of note makes up a beat, as well
                        as how many beats exist in a bar. The number on the left denotes the latter
                        and the number on the right denotes the former. For example, a time signature
                        of 4/4 means that 4 notes a quarter in length make up a bar. Likewise, a time
                        signature of 2/4 means that a bar holds 2 notes a quarter in length.
                        </span>
                    </h2>
                </div>
                <div className="recognizer-column">
                    <select name="quantization" id="qz" onChange={
                        (event) => {this.setState({"selectedQZ": parseInt(event.target.value)})}
                            }defaultValue={this.state.selectedQZ}>
                        <option value={1}>Whole/Semibreave</option>
                        <option value={2}>Half/Minim</option>
                        <option value={4}>Quarter/Crochet</option>
                        <option value={8}>Eighth/Quaver</option>
                        <option value={16}>Sixteenth/Semiquaver</option>
                        <option value={32}>Thirty-Second/Demisemiquaver</option>
                    </select>
                    <input type = "number" id = "tp" onChange={
                        (event) => {
                            this.setState({"selectedTP": parseInt(event.target.value)})}
                    }/>
                    <select name="timesignatures" id="ts" onChange={
                        (event) => {this.setState({"selectedTS": event.target.value})}
                    }>
                        {/* <option value="2/2">2/2</option> */}
                        <option value="2/4">2/4</option>
                        <option value="3/4">3/4</option>
                        <option value="4/4">4/4</option>
                        <option value="5/4">5/4</option>
                        {/* <option value="6/8">6/8</option>
                        <option value="3/8">3/8</option> */}
                    </select>
                </div>
            </div>
            <button className='recording-page-button'
            onClick={() => {
                this.handleStartStopRecognition()
                }}>Start Recording</button> 

            <p>Mouse over titles to see an explanation</p>
            </div>
            : 
            <div className='recording-container'>
                {
                    this.state.isRecording 
                    ? 
                    <div className="recording-box">
                        <div className="current-note flexrow">
                            <h2>Currently Played Note:</h2>
                            <h2 id="note">None</h2>
                        </div>
                        <div className="flexrow">
                            <button className='recording-page-button'
                            onClick={() => {
                                    this.handleStartStopRecognition()
                                    }}>Stop Recording
                            </button> 
                            <div className='timer'>{
                                    this.state.seconds + " seconds"
                                }
                            </div>
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
                        onClick={this.submit}>
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