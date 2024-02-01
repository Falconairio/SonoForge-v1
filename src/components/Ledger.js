import React from 'react'

export default function Ledger(props) {
    return (
        <div className={props.last ? "ledger-line-hard" : "ledger-line-soft"}>
            {Array(12).fill().map(() => (
                <div className='note-seperator' />
            ))}
        </div>
    )
}
