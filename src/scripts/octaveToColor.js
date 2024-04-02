function octaveToColor (octave) {
    switch(octave) {
        case 0:
            return "blue"
        case 1:
            return "red"
        case 2:
            return "green"
        case 3:
            return "yellow"
        case 4:
            return "orange"
        case 5:
            return "purple"
        case 6:
            return "pink"
        case 7:
            return "teal"
        case 8:
            return "brown"
        default:
            return
    }
}

export default octaveToColor