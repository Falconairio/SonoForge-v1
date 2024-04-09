import React, { Component } from 'react'

export default class About extends Component {
  render() {
    return (
      <div className='about-blurb'>
        <h1><b>Hello!</b> Thanks for checking out my app!</h1>
        <p>This is SonoForgeAI, which I made for my third year dissertation at Swansea University.
        It is essentially an AI-powered DAW which can recognize user input, translate it into a 
        workspace, allowing you to edit it to your hearts content, and output it as sheet music
        to play at home (work in progress). It has been very fun to make and I am very proud of how it came out.
        </p>
        <p>This project would not have been possible without the tools provided by many talented
        developers. Heres a link of what technologies I used and who made em:</p>
        <ul className='about-list'>
            <li>Pitch Detection algorithm from <a href = "https://alexanderell.is/posts/tuner/">Alexander Ellis</a>,
            using certain methods from <a href = "https://github.com/cwilso/PitchDetect/blob/main/js/pitchdetect.js">PitchDetect</a>,
            which allowed me to recognize musical notes to translate into data.
            </li>
            <li>Grid Layout from <a href='https://github.com/react-grid-layout/react-grid-layout'>React-Grid-Layout</a>, which is what allows the notes
            seen in the workspace to move and be positioned as they are.</li>

            <li>Machine Learning API, Note Structure, and Note player from <a href="https://magenta.tensorflow.org/">Magenta.js</a>,
            which is the backbone for the whole application. Any time audio is being worked with, it is through the musical data structures and
            methods which are provided open source from Magenta, there would be no project if not for them.</li>
        </ul>
      </div>
    )
  }
}
