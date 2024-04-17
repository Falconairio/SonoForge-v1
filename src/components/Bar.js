import React from 'react'
import Ledger from './Ledger'

export default function Bar(props) {
  return (
    <div className='bar-container'>
        {
        [...Array(props.noCols).keys()].map((v,i) => {
          if(i !== props.noCols - 1) {
            return <Ledger key = {i} last = {false}/>
          } else {
            return <Ledger key = {i} last = {true}/>
          }
        })
      }
    </div>
  )
}