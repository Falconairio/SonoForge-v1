import React, { Component } from 'react'
import { MusicRNN, Player } from "@magenta/music";
import generateLookupTable from "./../scripts/noteLTableGenerator";
import noteToHeightAdjust from '../scripts/noteToHeightAdjust';
import octaveToColor from '../scripts/octaveToColor';
import Timeline from './Timeline';
import ReactGridLayout from 'react-grid-layout';
import "/node_modules/react-grid-layout/css/styles.css"
import "/node_modules/react-resizable/css/styles.css"
import valueAndOctaveFromString from '../scripts/valueAndOctaveFromString';

/**
 * A React Component that displays a musical workspace, while containing all of
 * the state and logic to make it work. 
 */
export default class WorkspaceComponent extends Component {
    state = {
        //note player used to listen to the current composition and generations
        player : null,
        //instance of Magenta.js's MusicRNN model
        model : new MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
        //randomness value for the ML model
        temperature : 0.9,
        //amount of notes for the model to generate
        steps: 16,
        //the current data of the composition
        currentSequence: {
            notes: [
            ],
            totalTime: 0
        },
        //the data of the current AI generation, if there is one
        generatedSequence: null,
        /* a flag to tell if the model is generating a sequence, used to update the generate
        button */
        generating: false,
        /* two flags for playing the composition and playing the generation respectively,
        used to update their respective play buttons */
        playing: false,
        playingGeneration: false,
        /* a counter that is used when notes are highlighted during playback, since note ids
        are just N followed by a counter value, this can be used to easily loop through
        them */
        noteCounter: 0,
        /* the 12 possible note values used by this app, used to populate the note column as
        well as decide note value from row position */
        noteArr : ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
        /* the three values of time signature, quantization, and tempo, as imported from the
        previous screen */
        selectedTS: "4/4",
        selectedQZ: 4,
        selectedTP: 60,
        /* a lookup table filled from a script which has letter octave combos for pitch values
        as well as pitch values for letter octave combos */
        lookupTable: null,
        //position data of the html elements
        layout: [],
        //notes to create html elements for
        notesToRender: [],
        //grid positions to not fill when making whitespace
        positionsFilled: {},
        //this is the number of notes there are in an octave
        numberRows: 12,
        //3.1875 is the amount in rem that a row should be in height
        rowHeight: 3.1875 * parseFloat(getComputedStyle(document.documentElement).fontSize),
        numberColumns: 0,
        hasFinishedCalculating: false,
        //a table that can tell you which html elements have which octave value
        elementOctaveTable: {},
        //a table that can tell you which html elements have which note value
        elementValueTable: {},
        //two flags that tell if either a note has been selected or whitespace has been selected
        noteSelected: false,
        whiteSpaceSelected: false,
        /* the ID of the element selected, stored here so its element can be found when changes
        need to be made to the note or the html element itself */
        selectedElement: "",
        //a flag to tell if there is a menu open
        isMenuOpen: false,
        //a flag to tell which menu is open, so it can be properly rendered
        specificMenuOpen: 0,
        //the value and octave of the note selected
        selectedNoteValue: "",
        selectedNoteOctave: "4"
    }

    /**
     * A React life-cycle method, mandles setting up of the model, player, grid,
     * and gets the notes and music data from the previous screen
     */
    componentDidMount = () => {
        this.setState({
            player: new Player(false, {
                run: (note) => {
                    /* A handy method from Magenta that is called every time a note is played
                    in this instance it is used to select the note last played as to highlight
                    it to the user */
                    if(this.state.playing) {
                        let soundedNote = valueAndOctaveFromString(
                            this.state.lookupTable[note.pitch]
                        )
                        this.setState({selectedElement: "N" + this.state.noteCounter,
                        noteCounter: this.state.noteCounter + 1,
                        selectedNoteValue: soundedNote[0],
                        selectedNoteOctave: soundedNote[1]})
                    }
                },
                stop: () => {
                    /* A corresponding method that will be called on the stopping of a sequence,
                    will unselect any notes and tell the state it is done playing */
                    if(this.state.playing) {
                        this.setState({playing: false, selectedElement: "", noteCounter: 0})
                    } else if(this.state.playingGeneration) {
                        this.setState({playingGeneration: false})
                    } 
                }
            }),
            currentSequence: this.props.notes,
            selectedTS: this.props.ts,
            selectedQZ: this.props.qz,
            selectedTP: this.props.tp,
            lookupTable: generateLookupTable(),
        /* The below syntax indicates a state callback, which means that the provided function will
        run after the state has been set, as state setting is asynchronous. Order matters a lot for
        this program, as many visual changes cannot update without the corresponding musical data 
        also being updated. You will see this syntax used a lot, often multiple times in succession
        as seen below. */
        }, () => {
            this.setState({
                numberColumns: this.calculateTotalCols(),
            }, () => {
                this.state.model.initialize();
                this.setupGrid();
                document.addEventListener('mousedown', this.handleClickOutside);
            })
        })
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
    }

    /**
     * A function for when the user clicks outside of the "work area", this
     * will cancel any selections they have made, which include notes,
     * whitespace, and menus.
     * @param {*} event any click made on this page
     */
    handleClickOutside = (event) => {
        let workspace = document.getElementById("nh");
        let toolbar = document.getElementById("wf")
        if (workspace && toolbar && !workspace.contains(event.target) 
        && !toolbar.contains(event.target)) {
            this.setState({
              whiteSpaceSelected: false,
              noteSelected: false,
              isMenuOpen: false,
              specificMenuOpen: 0,
              selectedElement: ""
            });
          }
    }

    /**
     * A function that uses the Magenta.js MusicRNN model to generate a new sequence
     * using the current sequence. Will attempt to do so 5 times before giving an
     * error message, though the model will usually output by then.
     */
    generateSequence = () => {
        //Stop the player if it is playing. Only one musical operation at a time!
        if (this.state.player.isPlaying()) {  
            this.state.player.stop();
            this.state.playing 
            ? this.setState({playing: false, selectedElement: "", noteCounter: 0})
            : this.setState({playingGeneration: false})
        }

        const tS = this.state.selectedTS
        let generationCount = 0
        //maximum generations allowed
        const MAX_GEN_COUNT = 5;

        const generate = () => {
            if(generationCount === MAX_GEN_COUNT) {
                alert("The AI could not generate a suitable generation for your sample. For very short samples " +
                        "there will be nothing outputted for low levels of randomness. If your sample is short, try " +
                        "increasing the randomness")
                this.setState({
                    generating: false
                })
                return;
            } else {
                //call the musicRNN model
                this.state.model
                .continueSequence(this.state.currentSequence, this.state.steps, this.state.temperature)
                .then((sample) => {
                    /* apply the user's selected time signature and tempo, as generated sequences from 
                    magenta will always come with a tempo of 120 and time signature of 4/4 */
                    sample.timeSignatures = [{time: 0, numerator: tS.charAt(0), denominator: tS.charAt(2)}]
                    sample.tempos = [{time: 0, qpm: this.state.selectedTP}]
                    //If a suitable generation was found then apply it
                    if(sample.notes.length > 0) {
                        this.setState({
                            generatedSequence : sample,
                            generating: false
                        })
                    //if not try again
                    } else {
                        generationCount++;
                        generate();
                    }
                }).catch( (err) => console.log(err))
            }
        }

        generate();
    }
    playSequence = (sequence) => {
        if (this.state.player.isPlaying()) {  
            this.state.player.stop();
            this.state.playing && this.state.playingGeneration
            ? this.setState({playing: false, selectedElement: "", noteCounter: 0, playingGeneration: false})
            : this.state.playing 
            ? this.setState({playing: false, selectedElement: "", noteCounter: 0})
            : this.setState({playingGeneration: false})
            return;
        }
        this.state.player.start(sequence)
    }

    insertGeneration = () => {
        const generationCopy = {...this.state.generatedSequence};
        const currentSequenceCopy = {...this.state.currentSequence}
        const genLength = generationCopy.totalQuantizedSteps;
        if(generationCopy && generationCopy.notes.length > 0 && this.state.whiteSpaceSelected) {
            const el = this.state.selectedElement;
            
            let selectedStep = parseInt(el.substring(1,el.indexOf(",")))
            const qzNS = {...this.state.currentSequence}

            const firstHalf = [];

            let secondHalf = [];

            for(let i = 0; i < qzNS.notes.length; i++) {
                const currentNote = qzNS.notes[i];
                if(currentNote.quantizedStartStep < selectedStep &&
                    currentNote.quantizedEndStep <= selectedStep) {
                        firstHalf.push(currentNote)
                } else if(currentNote.quantizedStartStep >= selectedStep) {
                    const restOfNotes = qzNS.notes.slice(i, qzNS.notes.length);
                    const pushedBackNotes = this.pushBackSequenceByLengthOfSteps(genLength, restOfNotes);
                    secondHalf = secondHalf.concat(pushedBackNotes);
                    break;
                } else if(currentNote.quantizedStartStep < selectedStep &&
                    currentNote.quantizedEndStep > selectedStep) {
                        firstHalf.push(
                            {
                                pitch: currentNote.pitch,
                                quantizedStartStep: currentNote.quantizedStartStep,
                                quantizedEndStep: selectedStep
                            }
                        )
                        secondHalf.push(
                            {
                                pitch: currentNote.pitch,
                                quantizedStartStep: selectedStep + genLength,
                                quantizedEndStep: currentNote.quantizedEndStep + genLength
                            }
                        )
                        if(i < qzNS.notes.length) {
                            const restOfNotes = qzNS.notes.slice(i + 1, qzNS.notes.length);
                            const pushedBackNotes = this.pushBackSequenceByLengthOfSteps(genLength, restOfNotes);
                            secondHalf = secondHalf.concat(pushedBackNotes);
                        }
                        break;
                    }
            }
            const offsetGeneration = this.pushBackSequenceByLengthOfSteps(selectedStep,
                generationCopy.notes)

            const finalSequence = firstHalf.concat(offsetGeneration.concat(secondHalf))

            currentSequenceCopy.notes = finalSequence
            const spq = currentSequenceCopy.quantizationInfo.stepsPerQuarter
            const finalStep = finalSequence[finalSequence.length - 1].quantizedEndStep
            currentSequenceCopy.totalQuantizedSteps = finalStep + (finalStep % spq)
            currentSequenceCopy.totalTime = currentSequenceCopy.totalQuantizedSteps / spq

            this.setState({currentSequence: currentSequenceCopy}, () => {
                this.setState({numberColumns: this.calculateTotalCols()}, () => {
                    this.setupGrid()
                })
            })
        }
    }

    pushBackSequenceByLengthOfSteps = (length, sequence) => {
        return sequence.map(note => {
            return {
                ...note,
                quantizedStartStep: note.quantizedStartStep + length,
                quantizedEndStep: note.quantizedEndStep + length,
                startTime: note.startTime + length,
                endTime: note.endTime + length
            };
        });
    }

    noteFromPitch = (pitch) => {
        var noteNum = 12 * (Math.log( pitch / 440 )/Math.log(2) );
        return this.state.noteArr[(Math.round( noteNum ) + 69) % 12];
    }

    calculateNoBars = () => {
        return Math.ceil(this.state.currentSequence.totalQuantizedSteps/this.state.selectedQZ)
    }

    addBar = () => {
        const currentSequenceCopy = {...this.state.currentSequence}
        const spq = currentSequenceCopy.quantizationInfo.stepsPerQuarter
        const totalSteps = currentSequenceCopy.totalQuantizedSteps
        currentSequenceCopy.totalQuantizedSteps = totalSteps + this.state.selectedQZ
        currentSequenceCopy.totalTime = currentSequenceCopy.totalQuantizedSteps / spq
        this.setState({
            currentSequence: currentSequenceCopy
        }, () => {
            this.setState({numberColumns: this.calculateTotalCols()}, () => {
                this.setupGrid()
            })
        })
    }

    removeBar = () => {
        const currentSequenceCopy = {...this.state.currentSequence}
        const seqNotes = currentSequenceCopy.notes;
        let totalSteps = currentSequenceCopy.totalQuantizedSteps
        const spq = currentSequenceCopy.quantizationInfo.stepsPerQuarter
        currentSequenceCopy.totalQuantizedSteps = totalSteps -= this.state.selectedQZ
        currentSequenceCopy.totalTime = currentSequenceCopy.totalQuantizedSteps / spq
        const notes = []
        for(let i = 0; i < seqNotes.length; i++) {
            const curNote = seqNotes[i]
            if(curNote.quantizedStartStep < totalSteps) {
                const noteCopy = {...curNote}
                if(curNote.quantizedEndStep > totalSteps) {
                    noteCopy.quantizedEndStep = totalSteps
                } 
                notes.push(noteCopy)
            }
        }
        currentSequenceCopy.notes = notes;
        this.setState({
            currentSequence: currentSequenceCopy
        }, () => {
            this.setState({numberColumns: this.calculateTotalCols()}, () => {
                this.setupGrid()
            })
        })
    }

    calculateTotalCols = () => {
        return (this.state.selectedTS[0] * (this.state.selectedQZ/this.state.selectedTS[2])) * this.calculateNoBars()
    }

    calculateWidthsOfNotes = () => {
        const REM_AMOUNT = 5.5
        let remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        let quantizationAmount = this.state.selectedTS[2]/this.state.selectedQZ

        return (((REM_AMOUNT * remSize) * quantizationAmount) * this.calculateTotalCols())
    }

    /**
     * A deprecated function which decides which step a note of a particular time would
     * fall on. I realized in the end it is essentially doing the same thing as the
     * magenta.js quantization algorithm, and keeping the note sequence in real world
     * time in state was actually harmful for maintainability of the program. All
     * sequences have now been changed to quantized sequences.
     * @param {float} noteTime the time of the start or end of a note 
     * @returns the step, given the tempo, time signature, and quantization
     */
    decideBeat = (noteTime) => {
        let beatsInColumn = this.state.selectedQZ/this.state.selectedTS[2]
        let beatsInBar = this.state.selectedTS[0]
        let beatLengthInSeconds = 60/this.state.selectedTP
        let secondsInBar = beatLengthInSeconds * beatsInBar
        let smallestBeatLength = beatLengthInSeconds/beatsInColumn

        return (Math.floor(noteTime/secondsInBar) * (beatsInColumn * beatsInBar)) +
        (noteTime % secondsInBar)/smallestBeatLength
    }

    setupNotesOnGrid = () => {
        let counter = 0
        let layout = this.state.layout
        let renderedEls = this.state.notesToRender
        const octaveTableCopy = {...this.state.elementOctaveTable}
        const valueTableCopy = {...this.state.elementValueTable}
        this.state.currentSequence.notes.map((value,index) => {
            let fullNote = this.state.lookupTable[value.pitch]
            let octave = parseInt(fullNote.charAt(fullNote.length - 1))
            let note = fullNote.slice(0,fullNote.length - 1)
            const startBeat = value.quantizedStartStep
            const endBeat = value.quantizedEndStep
            let colorClass = octaveToColor(octave)
            let rowToSet = noteToHeightAdjust(note)

            let elementKey = `N${counter}`;

            let noteLayout = {
                i: elementKey,
                x: startBeat,
                y: rowToSet,
                w: endBeat - startBeat,
                h: 1,
                minH: 1,
                maxH: 1,
                minW: 1,
                isResizable: true,
                isDraggable: true
            }

            this.registerPosition(startBeat,endBeat,rowToSet)
            octaveTableCopy[elementKey] = octave;
            valueTableCopy[elementKey] = value;

            let noteObj = {
                key: elementKey,
                class: colorClass,
                onclick: () => {
                    this.setState({
                        noteSelected: true,
                        whiteSpaceSelected: false,
                        selectedElement: elementKey,
                        //this is so even if the position of the note is changed the
                        //right value can still be found
                        selectedNoteOctave: this.state.elementOctaveTable[elementKey],
                        selectedNoteValue: this.state.elementValueTable[elementKey]
                    })
                }
            }
            
            layout.push(noteLayout)
            renderedEls.push(noteObj)

            counter++

            return true
        })

        this.setState({
            layout: layout,
            notesToRender: renderedEls,
            elementOctaveTable: octaveTableCopy,
            elementValueTable: valueTableCopy
        })
    }

    registerPosition = (x1,x2,y) => {
        let posObj = this.state.positionsFilled
        for(let i = x1; i < x2; i++) {
            posObj[`${i},${y}`] = true;
        } 
        this.setState({
            positionsFilled: posObj
        })
    }

    populateWhiteSpace = () => {
        let layout = this.state.layout
        let wsLayout;
        let renderedEls = this.state.notesToRender
        let wsObj;
        let posObj = this.state.positionsFilled
        for(let i = 0; i < this.state.numberColumns; i++) {
            for(let j = 0; j < this.state.numberRows; j++) {
                if(!(`${i},${j}` in posObj)) {
                    let elementKey = `W${i},${j}`;
                    wsLayout = {
                        i: elementKey,
                        x: i,
                        y: j,
                        w: 1,
                        h: 1,
                        minH: 1,
                        maxH: 1,
                        minW: 1,
                        isResizable: false,
                        isDraggable: false
                    }

                    wsObj = {
                        key: elementKey,
                        class:
                            this.state.selectedWhiteSpace === elementKey ? "transparent selected" : "transparent"
                        ,
                        onclick: () => {
                            this.setState({
                                noteSelected: false,
                                whiteSpaceSelected: true,
                                selectedElement: elementKey
                            })
                        }
                    }

                    layout.push(wsLayout)
                    renderedEls.push(wsObj)
                }
            }
        }

        this.setState({
            layout: layout,
            notesToRender: renderedEls,
            hasFinishedCalculating: true
        })
    }

    setupGrid = () => {
        this.setState({
            layout: [],
            notesToRender: [],
            positionsFilled: {},
            elementOctaveTable: {},
            hasFinishedCalculating: false,
            selectedElement: "",
            noteSelected: false,
            whiteSpaceSelected: false
        }, () => {
            this.setupNotesOnGrid()
            this.populateWhiteSpace()
        })
    }

    changeNotePosition = (deleteFlag) => {
        const selectedElementCopy = this.state.selectedElement
        const notePosition = parseInt(this.state.selectedElement.substring(1));
        const currentSequenceCopy = {...this.state.currentSequence};
        const notesCopy = [...currentSequenceCopy.notes];
        const selectedNote = notesCopy[notePosition];

        if(deleteFlag) {
            notesCopy.splice(notePosition,1)
        } else {
            selectedNote.pitch = this.state.lookupTable[
                `${this.state.selectedNoteValue}${this.state.selectedNoteOctave}`
            ]; 
            notesCopy[notePosition] = selectedNote;
        }
        currentSequenceCopy.notes = notesCopy;

        this.setState({ currentSequence: currentSequenceCopy }, () => {
            this.setupGrid()
            if(!deleteFlag) {
                this.setState({
                    selectedElement: selectedElementCopy,
                    noteSelected: true
                })
            } else {
                this.setState({
                    isMenuOpen: false,
                    specificMenuOpen: 0,
                    selectedElement: "",
                    noteSelected: false
                })
            }
        });
    }

    addNoteAtPosition = () => {
        if(this.state.whiteSpaceSelected) {
            const el = this.state.selectedElement;
            const selectedStep = parseInt(el.substring(1,el.indexOf(",")))
            const selectedRow = parseInt(el.substring(el.indexOf(",") + 1))
            const currentSequenceCopy = {...this.state.currentSequence};
            // const qzNS = sequences.quantizeNoteSequence(currentSequenceCopy, this.state.selectedQZ/4);
            const notesCopy = [...currentSequenceCopy.notes];
            const selectedNote = this.state.noteArr[selectedRow]

            /* The octave chosen will either be the default value held in the state,
            which is an average octave of 4, or the octave of the last note selected.
            this makes the assumption that the user will be placing a note in the same
            octave as the last note */
            const createdNote = {
                pitch: this.state.lookupTable[selectedNote + this.state.selectedNoteOctave],
                quantizedStartStep: selectedStep,
                quantizedEndStep: selectedStep + 1
            }

            const insertIndex = notesCopy.findIndex((note) => {
                return note.quantizedStartStep > createdNote.quantizedStartStep
            });

            if (insertIndex === -1) {
                notesCopy.push(createdNote);
            } else {
                notesCopy.splice(insertIndex, 0, createdNote);
            }

            currentSequenceCopy.notes = notesCopy;
            this.setState({ currentSequence: currentSequenceCopy}, () => {
                    this.setupGrid()
                });
        }
    }

    updateNotesFromNewLayout = (layout) => {
        this.setState({positionsFilled: {}}, () => {
            const currentSequenceCopy = {...this.state.currentSequence}
            const newElementValueTable = {}
            const notes = []
            const numNotes = this.state.currentSequence.notes.length

            for(let i = 0; i < numNotes; i++) {
                const currentNote = layout[i]
                const currentNoteValue = this.state.noteArr[currentNote.y]
                const currentNoteOctave = this.state.elementOctaveTable[currentNote.i]
                const noteObj = {
                    pitch: this.state.lookupTable[currentNoteValue + currentNoteOctave],
                    quantizedStartStep: currentNote.x,
                    quantizedEndStep: currentNote.x + currentNote.w
                }
                notes.push(noteObj)
                this.registerPosition(currentNote.x, currentNote.x + currentNote.w, currentNote.y)
                newElementValueTable[`N${i}`] = currentNoteValue;
            }

            currentSequenceCopy.notes = notes;

            this.setState({ 
                currentSequence: currentSequenceCopy,
                elementValueTable: newElementValueTable,
                numberColumns: this.calculateTotalCols()});
            })
        
    }

    /* Submit the current sequence and music data to whichever component needs it, used for both
    the rerecord and finish buttons */
    submit = (component) => {
        this.props.complete(
            this.state.currentSequence,
            this.state.selectedTS,
            this.state.selectedQZ,
            this.state.selectedTP,
            component)
    }


  render() {
    return (
      <div className='workspace-container flexcolumn'>
        <div className='notes-container'>
            <div className='notes-column'>{
            this.state.noteArr.map((el) => {
                return <div key = {el}>{el}</div>
            })
            }</div>
            <div className="notes-wrapper">
                <div className="notes-holder" id="nh">
                {
                    this.state.hasFinishedCalculating ?
                    <ReactGridLayout
                    className="grid-holder"
                    layout={this.state.layout}
                    cols = {this.calculateTotalCols()}
                    rowHeight={this.state.rowHeight}
                    width={this.calculateWidthsOfNotes()}
                    containerPadding= {[0,0]}
                    margin = {[0,0]}
                    onLayoutChange={(layout) => {
                        this.setState({layout : layout}, () => {
                            this.updateNotesFromNewLayout(layout)
                        })
                    }}
                >
                {
                    this.state.notesToRender.map((element) => {
                        let className = element.class;
                        if(this.state.selectedElement === element.key) {
                            className += " selected"
                        }
                        return <div key={element.key} className={className} onClick={element.onclick}></div>
                    })
                }
                </ReactGridLayout>
                :
                <div></div>
                }
                </div>
                {this.state.hasFinishedCalculating ?
                <div className='grid-canvas' id='gc'>
                    <Timeline 
                    noBars = {this.calculateNoBars()} 
                    noBeats = {parseInt(this.state.selectedTS[0])} 
                    />
                </div>
                :<div></div>}
            </div>
            <div className='bar-buttons flexcolumn'>
                <div className= 'triangle-button-right'
                onClick = {() => {
                    if(this.state.hasFinishedCalculating) {
                        this.addBar()
                    }
                }}></div>
                <div className= {
                    this.state.numberColumns === this.state.selectedQZ
                    ? 'triangle-button-left bb-inactive'
                    : 'triangle-button-left bb-active'
                }
                onClick = {() => {
                    if(this.state.hasFinishedCalculating &&
                    this.state.numberColumns > this.state.selectedQZ) {
                        this.removeBar()
                    }
                }}></div>
            </div>
        </div>
        <div className="workspace-footer flexrow" id = "wf">
            <div className="button-container">
                <button className='workspace-page-button active'
                onClick= {() => {
                    this.setState({
                        isMenuOpen : true,
                        specificMenuOpen : 1
                    })}
                }>Rerecord</button>
                {this.state.isMenuOpen && this.state.specificMenuOpen === 1 && (
                    <div className="workspace-button-menu confirm-menu">
                        <div className='flexcolumn'>
                            <h2>Are you sure?</h2>
                            <div className="flexrow">
                                <button className="workspace-sub-button active activeclick"
                                onClick = {() => this.submit("input")}>Yes</button>
                                <button className="workspace-sub-button active inactiveclick"
                                onClick = {() => this.setState({isMenuOpen: false, specificMenuOpen: 0})}>No</button>
                            </div>
                        </div>
                    </div>
            )}
            </div>
            <div className="button-container">
                <button className='workspace-page-button active'
                onClick= {() => {
                    this.setState({
                        isMenuOpen : true,
                        specificMenuOpen : 2
                    })}
                }>Generate Continuation</button>
                {this.state.isMenuOpen && this.state.specificMenuOpen === 2 && (
                    <div className="workspace-button-menu" id = "generator">
                        <div className='flexcolumn' id = "generator-inputs">
                            <div className = "workspace-button-menu-sub">
                                <label>
                                    Randomness: {(Math.ceil(((this.state.temperature - 0.9)/0.6) * 100))}%
                                </label>
                                <input type = "range" id = "temperature" name = "temp" 
                                value = {this.state.temperature} min = "0.9" max = "1.5" step="0.05" 
                                onChange={(event) => {
                                    this.setState({temperature: parseFloat(event.target.value)})
                                }}></input>
                            </div>
                            <div className='workspace-button-menu-sub'>
                                <label id = "steps">Steps:</label>
                                <input id = "steps" type='number' onChange={(event) => {
                                    let value = event.target.value;
                                    if (!isNaN(value) && value.trim() !== "") {
                                        this.setState({steps: parseFloat(value)})
                                    } else {
                                        this.setState({steps: ""})
                                    }
                                }} min = "0" step = "1" value={this.state.steps}></input>
                            </div>
                        </div>
                        <div className='flexcolumn' id = "generator-buttons">
                            <button className='workspace-sub-button active activeclick'
                            onClick = { () => {
                                if(this.state.steps > 0 && this.state.steps % 1 === 0) {
                                    this.setState({generating: true}, () => {
                                        this.generateSequence()
                                    })
                                } else {
                                    alert("Please provide a step value that is a whole number greater than zero.")
                                }
                            }}>
                            {
                                this.state.generating ? "Loading..." :
                                this.state.generatedSequence != null ? "Regenerate" : "Generate"
                            }
                            </button>
                            <button className={this.state.generatedSequence != null 
                            ? 'workspace-sub-button active activeclick'
                            : 'workspace-sub-button inactive inactiveclick'}
                            onClick = { () => {
                                    if(this.state.generatedSequence !== null &&
                                        this.state.generatedSequence.totalQuantizedSteps > 0) {
                                        this.setState({playingGeneration: true}, () => {
                                            this.playSequence(
                                                this.state.generatedSequence
                                            )
                                        })
                                    }
                                }}>{this.state.playingGeneration ? "Listening..." : "Listen" }</button>
                            <button className={this.state.generatedSequence !== null
                            && this.state.whiteSpaceSelected === true 
                            ? 'workspace-sub-button active activeclick'
                            : 'workspace-sub-button inactive inactiveclick'}
                            onClick = { () => {
                                    if(this.state.generatedSequence !== null &&
                                    this.state.whiteSpaceSelected === true) {
                                        this.insertGeneration()
                                    }
                                }}>Place</button>
                        </div>
                    </div>
            )}
            </div>
            <div className="button-container">
            <button className={this.state.whiteSpaceSelected ? "workspace-page-button active" 
            : " workspace-page-button inactive"}
            onClick = {() => {
                if(this.state.whiteSpaceSelected) {
                    this.addNoteAtPosition()
                }
            }}>Add Note</button>
            </div>
            <div className="button-container">
            <button className={this.state.noteSelected ? "workspace-page-button active" 
            : " workspace-page-button inactive"}
            onClick = {() => {
                if(this.state.noteSelected) {
                    this.setState({
                        isMenuOpen : true,
                        specificMenuOpen: 3
                    })}
                }
            }>Edit Note</button>
                {this.state.isMenuOpen && this.state.specificMenuOpen === 3 && (
                    <div className="workspace-button-menu flexcolumn" id = "edit">
                        <div className='flexrow' id = "edittoprow">
                            <div className='flexcolumn'>
                                <label htmlFor='editnoteselect'>
                                    Note:
                                </label>
                                <select id = "editnoteselect"
                                onChange={(event) => {
                                    this.setState({
                                        selectedNoteValue: event.target.value
                                    }, () => {
                                        this.changeNotePosition(false)
                                    })
                                }}
                                value = {this.state.selectedNoteValue}>
                                    {this.state.noteArr.map((note) => (
                                        <option key={note}>{note}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className='flexcolumn'>
                                <label htmlFor="editoctaveselect">
                                    Octave:
                                </label>
                                <select id = "editoctaveselect"
                                onChange={(event) => {
                                    this.setState({
                                        selectedNoteOctave: event.target.value
                                    }, () => {
                                        this.changeNotePosition(false)
                                    })
                                }}
                                value = {this.state.selectedNoteOctave}>
                                    {[...Array(9)].map((_, index) => (
                                        <option key={index} value={index}>{index}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p onClick = {() => {
                            this.changeNotePosition(true);
                        }}
                        >Delete Note</p>
                    </div>
            )}
            </div>

            <div className="button-container" id = "listenbutton">
                <button className= {
                   this.state.currentSequence.totalTime === 0
                    ? 'workspace-page-button inactive'
                    : this.state.playing 
                    ? 'workspace-page-button inactive'
                    : 'workspace-page-button active'
                }
                
                onClick= {() => {
                    if(this.state.currentSequence &&
                    this.state.currentSequence.totalTime > 0) {
                        this.setState({
                            playing: true
                        }, () => {
                            this.playSequence(this.state.currentSequence)
                        })
                    }
                }}>{
                    this.state.playing ? "Listening..." : "Listen"
                }</button>
            </div>

            <div className="button-container">
                <button className='workspace-page-button active'
                onClick= {() => {
                    this.setState({
                        isMenuOpen : true,
                        specificMenuOpen : 4
                    })}
                }>Finish</button>
                {this.state.isMenuOpen && this.state.specificMenuOpen === 4 && (
                    <div className="workspace-button-menu confirm-menu">
                        <div className='flexcolumn'>
                            <h2>Done Composing?</h2>
                            <div className="flexrow">
                            <button className="workspace-sub-button active activeclick"
                                onClick = {() => this.submit("output")}>Yes</button>
                                <button className="workspace-sub-button active inactiveclick"
                                onClick = {() => this.setState({isMenuOpen: false, specificMenuOpen: 0})}>No</button>
                            </div>
                        </div>
                    </div>
            )}
            </div>
        </div>
      </div>
    )
  }
}