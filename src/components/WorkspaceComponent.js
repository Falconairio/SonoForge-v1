import React, { Component } from 'react'
import { MusicRNN, Player, sequences } from "@magenta/music";
import generateLookupTable from "./../scripts/noteLTableGenerator";
import Timeline from './Timeline';
import ReactGridLayout from 'react-grid-layout';
import "/node_modules/react-grid-layout/css/styles.css"
import "/node_modules/react-resizable/css/styles.css"

export default class WorkspaceComponent extends Component {
    state = {
        player : null,
        model : new MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
        temperature : 0.0,
        steps: 16,
        currentSequence: {
            notes: [
            ],
            totalTime: 0
        },
        changedSequence: null,
        noteArr : ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
        selectedTS: "4/4",
        selectedQZ: 4,
        selectedTP: 60,
        lookupTable: null,
        layout: [],
        notesToRender: [],
        positionsFilled: {},
        numberRows: 11,
        numberColumns: 0,
        hasFinishedCalculating: false
    }

    componentDidMount = () => {
        this.setState({
            player: new Player(),
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
                console.log(this.calculateTotalCols() + " total cols");
            })
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

    noteFromPitch = (pitch) => {
        var noteNum = 12 * (Math.log( pitch / 440 )/Math.log(2) );
        return this.state.noteArr[(Math.round( noteNum ) + 69) % 12];
    }

    octaveToColor = (octave) => {
        switch(octave) {
            case 0:
                return "blue"
            case 1:
                return "red"
            case 2:
                return "green"
            case 3:
                return "yellow"
            case 4:
                return "orange"
            case 5:
                return "purple"
            case 6:
                return "pink"
            case 7:
                return "teal"
            case 8:
                return "brown"
            default:
                return
        }
    }

    noteToHeightAdjust = (note) => {
        switch(note) {
            case "C":
                return 0;
            case "C#":
                return 1;
            case "D":
                return 2;
            case "D#":
                return 3;
            case "E":
                return 4;
            case "F":
                return 5;
            case "F#":
                return 6;
            case "G":
                return 7;
            case "G#":
                return 8;
            case "A":
                return 9;
            case "A#":
                return 10;
            case "B":
                return 11;
            default:
                return;
        }
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

    dumpGrid = () => {
        this.setState({
            layout: [],
            notesToRender: [],
            positionsFilled: {}
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
            let colorClass = this.octaveToColor(octave)
            let rowToSet = this.noteToHeightAdjust(note)

            let noteLayout = {
                i: `N${counter}`,
                x: startBeat,
                y: rowToSet,
                w: endBeat - startBeat,
                h: 1,
                minH: 1,
                maxH: 1,
                minW: 1,
                isResizable: true
            }

            this.registerPosition(startBeat,endBeat,rowToSet)

            let noteObj = {
                key: `N${counter}`,
                class: colorClass
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

    populateWhiteSpace = () => {
        let layout = this.state.layout
        let wsLayout;
        let renderedEls = this.state.notesToRender
        let wsObj;
        let posObj = this.state.positionsFilled
        for(let i = 0; i < this.state.numberColumns; i++) {
            for(let j = 0; j < this.state.numberRows; j++) {
                if(!(`${i},${j}` in posObj)) {
                    wsLayout = {
                        i: `W${i},${j}`,
                        x: i,
                        y: j,
                        w: 1,
                        h: 1,
                        minH: 1,
                        maxH: 1,
                        minW: 1,
                        isResizable: false
                    }

                    wsObj = {
                        key: `W${i},${j}`,
                        class: "transparent"
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
        this.dumpGrid()
        this.setupNotesOnGrid()
        this.populateWhiteSpace()
        console.log(this.state);
    }

    giveRowHeight = () => {
        return 3.1875 * 16
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


  render() {
    return (
      <div className='workspace-container'>
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
                    rowHeight={this.giveRowHeight()}
                    width={this.calculateWidthsOfNotes()}
                    containerPadding= {[0,0]}
                    margin = {[0,0]}
                    onLayoutChange={(layout) => {
                        this.setState({layout : layout})
                    }}
                >
                {
                    this.state.notesToRender.map((element) => {
                        return <div key={element.key} className={element.class}></div>
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
      </div>
    )
  }
}
