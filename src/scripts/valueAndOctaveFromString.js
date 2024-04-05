function valueAndOctaveFromString (string) {
    let noteValue = "";
    let noteOctave = 0
    for(let i = 0; i < string.length; i++) {
        if(isNaN(string[i])) {
            noteValue += string[i];
        } else {
            noteOctave = parseInt(string.substring(i))
        }
    }
    return [noteValue,noteOctave]
}

export default valueAndOctaveFromString