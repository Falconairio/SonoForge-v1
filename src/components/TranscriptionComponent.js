import React, { Component } from 'react'
import * as mm from '@magenta/music';

export default class TranscriptionComponent extends Component {

  state = {
    currentSequence: null
  }

  componentDidMount() {
    this.setState({
      currentSequence: this.props.notes
    }, () => {
      console.log(this.state)
  });
  }

  saveMidi = () => {
    const { currentSequence } = this.state;
    if (!currentSequence) return;

    currentSequence.notes.forEach(n => n.velocity = currentSequence.tempos[0].qpm);

    console.log(currentSequence)

    // Convert NoteSequence to MIDI
    const midi = mm.sequenceProtoToMidi(currentSequence);

    // Create a Blob and trigger download
    const blob = new Blob([midi], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.mid';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  render() {
    return (
      <div className="transcription-container">
        <button onClick={this.saveMidi}>CONVERT</button>
      </div>
    )
  }
}
