import React from 'react'
import Ledger from './Ledger'

export default function Bar() {
  return (
    <div className='bar-container'>
        <Ledger last = {false}/>
        <Ledger last = {false}/>
        <Ledger last = {false}/>
        <Ledger last = {true}/>
    </div>
  )
}
