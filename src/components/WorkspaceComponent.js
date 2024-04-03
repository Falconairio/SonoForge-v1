import React, { Component } from 'react'
import { MusicRNN, Player, sequences } from "@magenta/music";
import generateLookupTable from "./../scripts/noteLTableGenerator";
import noteToHeightAdjust from '../scripts/noteToHeightAdjust';
import octaveToColor from '../scripts/octaveToColor';
import Timeline from './Timeline';
import ReactGridLayout from 'react-grid-layout';
import "/node_modules/react-grid-layout/css/styles.css"
import "/node_modules/react-resizable/css/styles.css"
import octaveFromPitch from '../scripts/octaveFromPitch';
import valueAndOctaveFromString from '../scripts/valueAndOctaveFromString';

export default class WorkspaceComponent extends Component {
    state = {
        player : null,
        model : new MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
        temperature : 0.9,
        steps: 16,
        currentSequence: {
            notes: [
            ],
            totalTime: 0
        },
        generatedSequence: null,
        generating: false,
        playing: false,
        playingGeneration: false,
        noteCounter: 0,
        noteArr : ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
        selectedTS: "4/4",
        selectedQZ: 4,
        selectedTP: 60,
        lookupTable: null,
        layout: [],
        notesToRender: [],
        positionsFilled: {},
        numberRows: 12,
        rowHeight: 3.1875 * 16,
        numberColumns: 0,
        hasFinishedCalculating: false,
        elementToNoteLookupTable: {},
        noteSelected: false,
        whiteSpaceSelected: false,
        selectedElement: "",
        isMenuOpen: false,
        specificMenuOpen: 0,
        selectedNoteValue: "",
        selectedOctave: ""
    }

    componentDidMount = () => {
        this.setState({
            player: new Player(false, {
                run: (note) => {
                    console.log();
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
        }, () => {
            this.setState({
                numberColumns: this.calculateTotalCols(),
            }, () => {
                this.state.player.polySynth.volume._initialValue = 0.5
                this.state.player.bassSynth.volume._initialValue = 0.5
                this.state.model.initialize();
                this.setupGrid();
                document.addEventListener('mousedown', this.handleClickOutside);
            })
        })
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
    }

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

    generateSequence = () => {
        if (this.state.player.isPlaying()) {  
            this.state.player.stop();
            this.state.playing 
            ? this.setState({playing: false, selectedElement: "", noteCounter: 0})
            : this.setState({playingGeneration: false})
        }

        const tS = this.state.selectedTS
        const notes = sequences.quantizeNoteSequence(this.state.currentSequence, 4/this.state.selectedQZ);
        let generationCount = 0
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
                this.state.model
                .continueSequence(notes, this.state.steps, this.state.temperature)
                .then((sample) => {
                    sample.timeSignatures = [{time: 0, numerator: tS.charAt(0), denominator: tS.charAt(2)}]
                    sample.tempos = [{time: 0, qpm: this.state.selectedTP}]
                    if(sample.notes.length > 0) {
                        this.setState({
                            generatedSequence : sample,
                            generating: false
                        })
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
        const genSeqRef = this.state.generatedSequence;
        const generation = {
            notes: [...genSeqRef.notes],
            quantizationInfo: genSeqRef.quantizationInfo,
            tempos: genSeqRef.tempos,
            timeSignatures: genSeqRef.timeSignatures,
            totalQuantizedSteps: genSeqRef.totalQuantizedSteps
        };
        const genLength = generation.totalQuantizedSteps;
        if(generation && generation.notes.length > 0 && this.state.whiteSpaceSelected) {
            const el = this.state.selectedElement;
            
            let selectedStep = parseInt(el.substring(1,el.indexOf(",")))
            const qzNS = sequences.quantizeNoteSequence(this.state.currentSequence, 4/this.state.selectedQZ);

            const firstHalf = {
                notes: [],
                quantizationInfo: qzNS.quantizationInfo,
                tempos: qzNS.tempos,
                timeSignatures: qzNS.timeSignatures
            };

            const secondHalf = {
                notes: [],
                quantizationInfo: qzNS.quantizationInfo,
                tempos: qzNS.tempos,
                timeSignatures: qzNS.timeSignatures
            };

            for(let i = 0; i < qzNS.notes.length; i++) {
                const currentNote = qzNS.notes[i];
                if(currentNote.quantizedStartStep < selectedStep &&
                    currentNote.quantizedEndStep <= selectedStep) {
                        firstHalf.notes.push(currentNote)
                } else if(currentNote.quantizedStartStep >= selectedStep) {
                    const restOfNotes = qzNS.notes.slice(i, qzNS.notes.length);
                    const pushedBackNotes = this.pushBackSequenceByLengthOfSteps(genLength, restOfNotes);
                    secondHalf.notes = secondHalf.notes.concat(pushedBackNotes);
                    break;
                } else if(currentNote.quantizedStartStep < selectedStep &&
                    currentNote.quantizedEndStep > selectedStep) {
                        firstHalf.notes.push(
                            {
                                pitch: currentNote.pitch,
                                quantizedStartStep: currentNote.quantizedStartStep,
                                quantizedEndStep: selectedStep
                            }
                        )
                        secondHalf.notes.push(
                            {
                                pitch: currentNote.pitch,
                                quantizedStartStep: selectedStep + genLength,
                                quantizedEndStep: currentNote.quantizedEndStep + genLength
                            }
                        )
                        if(i < qzNS.notes.length) {
                            const restOfNotes = qzNS.notes.slice(i + 1, qzNS.notes.length);
                            const pushedBackNotes = this.pushBackSequenceByLengthOfSteps(genLength, restOfNotes);
                            secondHalf.notes = secondHalf.notes.concat(pushedBackNotes);
                        }
                        break;
                    }
            }
            const offsetGeneration = this.pushBackSequenceByLengthOfSteps(selectedStep,
                generation.notes)

            const finalSequence = {
                notes: firstHalf.notes.concat(offsetGeneration.concat(secondHalf.notes)),
                quantizationInfo: qzNS.quantizationInfo,
                tempos: qzNS.tempos,
                timeSignatures: qzNS.timeSignatures
            }

            const newSeq = sequences.unquantizeSequence(finalSequence,this.state.selectedTP)

            this.setState({currentSequence: newSeq}, () => {
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
        let beatLengthInSeconds = 60/this.state.selectedTP
        return Math.ceil((this.state.currentSequence.totalTime / beatLengthInSeconds)/this.state.selectedTS[0])
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

    decideBeat = (noteTime) => {
        let beatsInColumn = this.state.selectedQZ/this.state.selectedTS[2]
        let beatsInBar = this.state.selectedTS[0]
        let beatLengthInSeconds = 60/this.state.selectedTP
        let secondsInBar = beatLengthInSeconds * beatsInBar
        let smallestBeatLength = beatLengthInSeconds/beatsInColumn

        return (Math.floor(noteTime/secondsInBar) * (beatsInColumn * beatsInBar)) +
        (noteTime % secondsInBar)/smallestBeatLength
    }

    /**
     * A function that resets everything to do with the visual representation
     * of this grid, including the position of the notes and whitespace.
     * When finished it will set the finished flag to true so that the 
     * workspace becomes usable.
     */
    dumpGrid = () => {
        this.setState({
            layout: [],
            notesToRender: [],
            positionsFilled: {},
            hasFinishedCalculating: false
        })
    }

    setupNotesOnGrid = () => {
        let counter = 0
        let layout = this.state.layout
        let renderedEls = this.state.notesToRender
        this.state.currentSequence.notes.map((value,index) => {
            let fullNote = this.state.lookupTable[value.pitch]
            let octave = parseInt(fullNote.charAt(fullNote.length - 1))
            let note = fullNote.slice(0,fullNote.length - 1)
            let startBeat = this.decideBeat(value.startTime)
            let endBeat = this.decideBeat(value.endTime)
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
                isResizable: true
            }

            this.registerPosition(elementKey,startBeat,endBeat,rowToSet)

            let noteObj = {
                key: elementKey,
                class: colorClass,
                onclick: () => {
                    this.setState({
                        noteSelected: true,
                        whiteSpaceSelected: false,
                        // isMenuOpen: false,
                        selectedElement: elementKey,
                        selectedNoteOctave: octave,
                        selectedNoteValue: note
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
            notesToRender: renderedEls
        })
    }

    registerPosition = (x1,x2,y) => {
        let posObj = this.state.positionsFilled
        for(let i = x1; i < x2; i++) {
            posObj[`${x1},${y}`] = true;
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
                            console.log(elementKey);
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
                        this.setState({layout : layout})
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
                <div className='grid-canvas' id='gc'>
                    <Timeline 
                    noBars = {this.calculateNoBars()} 
                    noBeats = {parseInt(this.state.selectedTS[0])} 
                    />
                </div>
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
                    this.setState({
                        isMenuOpen : true,
                        specificMenuOpen : 3
                    })}
                }
            }>Add Note</button>
                {this.state.isMenuOpen && this.state.specificMenuOpen === 3 && (
                    <div className="workspace-button-menu">
                        <h1>Adding Note!</h1>
                    </div>
            )}
            </div>
            <div className="button-container">
            <button className={this.state.noteSelected ? "workspace-page-button active" 
            : " workspace-page-button inactive"}
            onClick = {() => {
                if(this.state.noteSelected) {
                    this.setState({
                        isMenuOpen : true,
                        specificMenuOpen : 4
                    })}
                }
            }>Edit Note</button>
                {this.state.isMenuOpen && this.state.specificMenuOpen === 4 && (
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
                        specificMenuOpen : 5
                    })}
                }>Finish</button>
                {this.state.isMenuOpen && this.state.specificMenuOpen === 5 && (
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