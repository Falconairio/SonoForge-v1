function generateLookupTable() {
    var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let pitch = 12
    let table = {}

    for(let i = 0; i < 9; i++) {
        for(let j = 0; j < 12; j++) {
            table[`${noteStrings[j]}${i}`] = pitch
            table[`${pitch}`] = `${noteStrings[j]}${i}`
            pitch++;
        }
    }

    return table
}

export default generateLookupTable