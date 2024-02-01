import React, { Component } from 'react'

export default class Timeline extends Component {
    
    state = {
        notes: this.props.notes
    }

  render() {
    return (
      <div>Timeline</div>
    )
  }
}
