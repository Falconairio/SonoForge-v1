function noteToHeightAdjust (note) {
    switch(note) {
        case "C":
            return 0;
        case "C#":
            return 1;
        case "D":
            return 2;
        case "D#":
            return 3;
        case "E":
            return 4;
        case "F":
            return 5;
        case "F#":
            return 6;
        case "G":
            return 7;
        case "G#":
            return 8;
        case "A":
            return 9;
        case "A#":
            return 10;
        case "B":
            return 11;
        default:
            return;
    }
}

export default noteToHeightAdjust;