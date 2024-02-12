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
        lookupTable: null
    }

    componentDidMount = () => {
        this.setState({
            player: new Player(),
            currentSequence: this.props.notes,
            selectedTS: this.props.ts,
            selectedQZ: this.props.qz,
            selectedTP: this.props.tp,
            lookupTable: generateLookupTable()
        }, () => {
            this.state.player.polySynth.volume._initialValue = 0.5
            this.state.player.bassSynth.volume._initialValue = 0.5
            this.state.model.initialize();
            this.setupGridAndNotes();
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
                return 1;
            case "C#":
                return 2;
            case "D":
                return 3;
            case "D#":
                return 4;
            case "E":
                return 5;
            case "F":
                return 6;
            case "F#":
                return 7;
            case "G":
                return 8;
            case "G#":
                return 9;
            case "A":
                return 10;
            case "A#":
                return 11;
            case "B":
                return 12;
            default:
                return;
        }
    }

    calculateNoBars = () => {
        let beatLengthInSeconds = 60/this.state.selectedTP
        return (this.state.currentSequence.totalTime / beatLengthInSeconds)/this.state.selectedTS[0]
    }

    setupGridAndNotes = () => {
        let el = document.getElementById("nh")
        let elHeight = el.getBoundingClientRect().height
        let noteHeight =  elHeight / 12

        let noteHolder = document.getElementById("nh")
        

        this.state.currentSequence.notes.map((value,index) => {
            let fullNote = this.state.lookupTable[value.pitch]
            let octave = parseInt(fullNote.charAt(fullNote.length - 1))
            let note = fullNote.slice(0,fullNote.length - 1)
            let colorClass = this.octaveToColor(octave)
            let heightAdjust = this.noteToHeightAdjust(note)

            // let wrapper = document.createElement("div")
            // wrapper.className = "wrapper"
            // let draggable = document.createElement("div")
            // draggable.id = `drag${index}`
            // draggable.classList.add("rect")
            // draggable.classList.add(colorClass)
            // // draggable.setAttribute("style", "transform: translate3d(50px, 0px, 0px)")
            // wrapper.appendChild(draggable)
            // noteHolder.appendChild(wrapper)
           

            // let drag = Draggable.create(`#drag${index}`, {
            //     type: "x,y",
            //     bounds: ".notes-holder",
            //     liveSnap: {
            //         points: function (point) {
            //             if(point.y % noteHeight !== 0) {
            //                 point.y = Math.floor(point.y / noteHeight) * noteHeight
            //             }
            //             return point
            //         },
            //       },
            //   });
            // //   draggable.setAttribute("style", "transform: translate3d(50px, 0px, 0px)")
            // //   draggable.setAttribute("style", `transform: translate3d(${index * 100}px, ${noteHeight * heightAdjust}px, 0px)`)
            // wrapper.setAttribute("style", "margin-top: 100px")
        })
    }

    returnLayout = () => {
        return [
            { i: "a", x: 0, y: 6, w: 1, h: 1, isResizable: false},
            { i: "b", x: 0, y: 1, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "c", x: 0, y: 2, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "d", x: 0, y: 3, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "e", x: 0, y: 4, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "f", x: 0, y: 5, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "g", x: 0, y: 0, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "h", x: 0, y: 7, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "i", x: 0, y: 8, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "j", x: 0, y: 9, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "k", x: 0, y: 10, w: 1, h: 1, isDraggable: false, isResizable: false},
            { i: "l", x: 0, y: 11, w: 1, h: 1, isDraggable: false, isResizable: false},
          ];
    }

  render() {
    return (
      <div className='workspace-container'>
        <div className='notes-container'>
            <div className='notes-column'>{
            this.state.noteArr.map((el) => {
                return <div>{el}</div>
            })
            }</div>
            <div className="notes-wrapper">
                <div className="notes-holder" id="nh">
                <ReactGridLayout
                    className="grid-holder"
                    layout={this.returnLayout()}
                    cols={8}
                    rowHeight={3.1875 * 16}
                    width={5.5 * 16 * 8}
                    containerPadding= {[0,0]}
                    margin = {[0,0]}
                >
                    <div key="a" className='green'></div>
                {Array.from({length: 11}, (_, i) => (
                    <div key={String.fromCharCode(98 + i)} className='transparent'>hello</div>
                ))}
                </ReactGridLayout>
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
