import React, { Component } from 'react'
import { Link } from 'react-router-dom'

export default class Home extends Component {
  render() {
    return (
      <div>
        <h1>Time to Create Something</h1>
        <p className='home-blurb'>
          SonoForge is a tool that lets your composition dreams become reality <br/>
            Just play into the mic and our program will transcribe it for you to tweak <br/>
            If you're stumped on what to add next just ask the Magenta.js AI to generate a continuation <br/>
            When you're satisfied with your piece you can output it to sheet music for you to play at home <br/>
            Happy composing!
        </p>
        <Link to="/compose">Lets Go</Link>
      </div>
    )
  }
}
