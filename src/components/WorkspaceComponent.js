import React, { Component } from 'react'
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import { MusicRNN, Player, sequences } from "@magenta/music";
import octaveFromPitch from '../scripts/octaveFromPitch';
import Bar from './Bar';

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
        noteArr : ["B","A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C"]
    }

    componentDidMount = () => {
        this.setState({
            player: new Player(),
            currentSequence: this.props.notes
        }, () => {
            console.log(this.state.currentSequence);
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

    octaveToColor = (note) => {
        let octave = octaveFromPitch(note.pitch)
        switch(octave) {
            case 0:
                return "blue"
            case 1:
                return "red"
            case 2:
                return "green"
            default:
                return
        }
    }

    setupGridAndNotes = () => {
        let el = document.getElementById("nh")
        let elHeight = el.getBoundingClientRect().height
        let noteHeight =  elHeight / 12

        gsap.registerPlugin(Draggable);

            Draggable.create(".rect", {
                type: "x,y",
                bounds: ".notes-holder",
                liveSnap: {
                    points: function (point) {
                        if(point.y % noteHeight !== 0) {
                            point.y = Math.floor(point.y / noteHeight) * noteHeight
                        }
                        return point
                    },
                  },
              });
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
                        <div className="wrapper">
                            <div className="flair rect"></div>
                        </div>
                </div>
                <div className='grid-canvas' id='gc'>
                    <Bar/>
                    <Bar/>
                    <Bar/>
                    <Bar/>
                </div>
            </div>
        </div>
      </div>
    )
  }
}
