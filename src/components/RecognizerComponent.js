import React, { Component } from 'react'
import { Player, sequences } from "@magenta/music";
import autoCorrelate from "./../scripts/autocorrelate";
import generateLookupTable from "./../scripts/noteLTableGenerator";
import octaveFromPitch from '../scripts/octaveFromPitch';

export default class RecognizerComponent extends Component {
    state = {
        player : null,
        isRecording : false,
        notes: [],
        seconds: 0,
        timerCallback: null,
        source: null,
        inputStream: null,
        selectedTS: "4/4",
        selectedQZ: 4,
        selectedTP: 60,
        noteSequence: {
            notes: [],
            totalTime: 0
          },
        inputsInView: true
    }

    componentDidMount = () => {
        this.setState({
            player: new Player(),
            notes: this.state.noteSequence.notes
        }, () => {
            this.handleSetSelects()
        })
    }

    handleSetSelects = () => {
        if(this.state.inputsInView) {
            const qz = document.getElementById("qz")
            const ts = document.getElementById("ts")
            const tp = document.getElementById("tp")

            qz.value = this.state.selectedQZ
            ts.value = this.state.selectedTS
            tp.value = this.state.selectedTP
        }
    }

    handleStartStopRecognition = () => {
        if(this.state.selectedTP >= 1 && this.state.selectedTP <= 220) {
            if(!this.state.isRecording) {
                this.setState({
                    isRecording: true
                })

                const callback = setInterval(this.updateTimer, 1000)
                this.setState({timerCallback: callback, inputsInView: false})

                this.recognize()
            } else {
                this.state.inputStream.getTracks().forEach(function(track) {
                    track.stop();
                });

                clearInterval(this.state.timerCallback)
                if(this.state.notes.length === 0) {
                    this.setState({ inputsInView: true, seconds: 0})
                    alert('No notes recognized. Please try again.')
                    
                }
                document.getElementById('note').innerText = ""
                this.setState({
                    isRecording: false, 
                    timerCallback: null,
                    inputStream: null
                }, () => {
                    this.handleSetSelects()
                })
            }
        } else {
            alert("Please select a tempo within the range 1-220, otherwise your" +
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
        const notesUp = this.state.notes
        const noteEndTime = Math.ceil(note["endTime"])

        notesUp.push(note)

        const newNS = {
            notes: notesUp,
            totalTime: noteEndTime
        }
        this.setState({
            noteSequence: newNS,
            notes: notesUp,
        })   
    }

    /**
     * A function that is called to recognize the user's musical input.
     * Will do so until the user presses the stop button. This function is a
     * heavily edited version of the Visualize function from Alex Ellis's
     * tuner program, which can be found at https://alexanderell.is/posts/tuner/.
     * Massive thanks to Alex Ellis.
     */
    recognize = () => {
        let source;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.minDecibels = -100;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;
        const storeNoteInSequence = this.addNoteToSequence
        const streamSetter = this.setStream
        const lookupTable = generateLookupTable();
        let checkRecording = this.isRecording;
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
    
        let startingTime = 0.0;
        let heldNote = "";
        let lastNote;
        let heldNoteOctave = 0
    
        // Thanks to PitchDetect: https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
        const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      
        const updateNote = function () {
            /* if the user has not pressed the stop button yet, schedule another
            run of this function on the next frame */
            if(checkRecording()) {
                requestAnimationFrame(updateNote)
            }

            //analyze audio data using the method provided by Alex Ellis and PitchDetect
            const bufferLength = analyser.fftSize;
            const buffer = new Float32Array(bufferLength);
            analyser.getFloatTimeDomainData(buffer);
            const detectedPitch = autoCorrelate(buffer, audioContext.sampleRate)

            //get current note data, if there is any
            const currentNote = noteStrings[noteFromPitch(detectedPitch) % 12];
            const currentOctave = octaveFromPitch(detectedPitch);

            //snap our note start and end times into place
            const noteLengthToRoundTo = typeOfBeat/amountToRound * beatLengthInSeconds
            let st = roundToNearest(startingTime,noteLengthToRoundTo)
            let et = roundToNearest(audioContext.currentTime,noteLengthToRoundTo)

            //decide what is happening on this frame
            const noNoteDetected = detectedPitch === -1
            const differentNoteDetected = (currentNote !== heldNote || currentOctave !== heldNoteOctave)
            const noteHeldLongEnough = (heldNote.length > 0 && audioContext.currentTime - startingTime >= noteLengthToRoundTo/2)

            //do something about the current note event
            if(noNoteDetected || differentNoteDetected) {
                //resolve the last note's detection
                if(noteHeldLongEnough) {
                    if(lastNote && st < lastNote.endTime) {
                        st = lastNote.endTime
                    }
                    const note = {
                        /* find the right pitch value from a lookup table, as 
                        Magenta itself uses a different pitch system than normal */
                        pitch: lookupTable[`${heldNote}${heldNoteOctave}`], 
                        startTime: st, 
                        endTime: st !== et ? et : et + noteLengthToRoundTo
                    }
                    storeNoteInSequence(note)
                    lastNote = note;
                }

                //set the current note stored in memory accordingly
                if(noNoteDetected) {
                    heldNote = ""
                    heldNoteOctave = 0
                    try {
                        document.getElementById('note').innerText = 'None';
                    } catch (error) {
                        console.log(error)
                    } 
                } else {
                    startingTime = audioContext.currentTime
                    heldNote = currentNote
                    heldNoteOctave = currentOctave
                }
            //if the same note continues to be detected
            } else {
                if(noteHeldLongEnough) {
                    try {
                        document.getElementById('note').innerText = currentNote + currentOctave;
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
        }

        // Thanks to PitchDetect: https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
        /* A sub-function to convert a frequency to a musical note pitch. 
        NOT WRITTEN BY ME, FOLLOW THE LINK FOR SOURCE */
        const noteFromPitch = (frequency) => {
            const noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
            return Math.round( noteNum ) + 69;
        }

        /**
         * A sub-function to round a note to the nearest quantized time value, using
         * the user provided quantization value
         * @param {*} numToRound 
         * @param {*} numToRoundTo the decimal time value to round to
         * @returns the rounded number
         */
        const roundToNearest = (numToRound, numToRoundTo) => {
            const reciprocal = 1 / (numToRoundTo)
            return Math.round(numToRound * reciprocal) / reciprocal;
        }
    }

    updateTimer = () =>  {
        let seconds = this.state.seconds
        seconds++;
        this.setState({ seconds: seconds })
    }

    submit = () => {
        const updateSequence = {...this.state.noteSequence};
        const tS = this.state.selectedTS
        updateSequence.timeSignatures = [{time: 0, numerator: tS.charAt(0), denominator: tS.charAt(2)}]
        updateSequence.tempos = [{time: 0, qpm: this.state.selectedTP}]
        this.props.complete(
            sequences.quantizeNoteSequence(updateSequence, this.state.selectedQZ/tS.charAt(2)),
            this.state.selectedTS,
            this.state.selectedQZ,
            this.state.selectedTP,
            "main")
    }

  render() {
    return (
    <div className='recognizer-container'>
        {
            !this.state.isRecording && this.state.notes.length === 0 
            ? 
            <div className='options-box'>

            <div className="recognizer-rows">
                <div className='recognizer-row'>
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
                </div>
                <div className='recognizer-row'>
                    <h2 className="recognizer-column-title">
                        Tempo/BPM:
                        <span className='tooltip tt2'>
                        The Tempo, or more simply the Beats Per Minute, is the number of single
                        beats that come within one minute of music. What you select for this will
                        work in conjunction with the time signature to generate the correct
                        representation for your recorded music.
                        </span>
                    </h2>
                    <input type = "number" id = "tp" onChange={
                        (event) => {
                            this.setState({"selectedTP": parseInt(event.target.value)})}
                    }/>
                </div>
                <div className='recognizer-row'>
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
                    <select name="timesignatures" id="ts" onChange={
                        (event) => {this.setState({"selectedTS": event.target.value})}
                    }>
                        <option value="2/2">2/2</option>
                        <option value="2/4">2/4</option>
                        <option value="3/4">3/4</option>
                        <option value="4/4">4/4</option>
                        <option value="5/4">5/4</option>
                        <option value="6/8">6/8</option>
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