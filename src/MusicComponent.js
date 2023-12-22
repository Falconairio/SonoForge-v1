import React, { Component } from 'react'
import { MusicRNN, Player, sequences } from "@magenta/music";

export default class MusicComponent extends Component {
    state = {
        model : new MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/melody_rnn'),
        player : null,
        temperature : 0.0,
        steps: 16,
        currentSample: {
            notes: [
              {pitch: 1, startTime: 0.0, endTime: 0.5},
              {pitch: 60, startTime: 0.5, endTime: 1.0},
              {pitch: 67, startTime: 1.0, endTime: 1.5},
              {pitch: 67, startTime: 1.5, endTime: 2.0},
              {pitch: 69, startTime: 2.0, endTime: 2.5},
              {pitch: 69, startTime: 2.5, endTime: 3.0},
              {pitch: 67, startTime: 3.0, endTime: 4.0},
              {pitch: 65, startTime: 4.0, endTime: 4.5},
              {pitch: 65, startTime: 4.5, endTime: 5.0},
              {pitch: 64, startTime: 5.0, endTime: 5.5},
              {pitch: 64, startTime: 5.5, endTime: 6.0},
              {pitch: 62, startTime: 6.0, endTime: 6.5},
              {pitch: 62, startTime: 6.5, endTime: 7.0},
              {pitch: 60, startTime: 7.0, endTime: 8.0},
            ],
            totalTime: 8
          },
          pitchTester : {
            notes: [
              {pitch: -1, startTime: 0.0, endTime: 2.0},
            ],
            totalTime: 2
        }
    }

    componentDidMount = () => {
        this.setState({
            player: new Player()
        }, () => {
            this.state.model.initialize();
        })
    }

    testFunc = () => {
        if (this.state.player.isPlaying()) {
            this.state.player.stop();
            return;
          }
        
        let notes = sequences.quantizeNoteSequence(this.state.currentSample, 4);

        
        this.state.model
        .continueSequence(notes, this.state.steps,this.state.temperature)
        .then((sample) => {
            console.log("Updated sample: ");
            console.log(sample.notes)
            if(sample.notes.length > 0) {
                this.setState({
                    currentSample : sample
                })
            }
        }).catch( (err) => console.log(err));;
    }

  render() {
    return (
        <div className="box4 tester">
        <button onClick={() => {
            if(this.state.player.isPlaying()) {
              this.state.player.stop()
            }
          this.state.player.start(this.state.pitchTester)
        }}>Test</button>
        <input onChange={(change) => {
            this.setState({pitchTester: {
            notes: [
              {pitch: change.target.value, startTime: 0.0, endTime: 2.0},
            ],
            totalTime: 4
        }})
        }}></input>
        <p>Magenta AI test</p>
        <button onClick={() => {
            this.testFunc()
          }}>generate music</button>
        <button onClick={() => {
          this.state.player.start(this.state.currentSample)
        }}>play music</button>
        <input placeholder='steps' onChange={(change) => {
            this.setState({steps: parseFloat(change.target.value)})
        }}></input>
        <input placeholder='temperature' onChange={(change) => {
            this.setState({temperature: parseFloat(change.target.value)})
        }}></input>
        
      </div>
    )
  }
}
