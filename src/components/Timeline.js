import React from 'react'
import Bar from './Bar'

export default function Timeline(props) {
  return (
    <div className='timeline-container'>
      {
        [...Array(props.noBars).keys()].map((value, index) => {
          return <Bar key = {index} noCols = {props.noBeats}/>
        })
      }
    </div>
  )
}
