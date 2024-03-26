const octaveFromPitch = (frequency) => {
    let counter = 0;
    let currentFrequency = frequency;
    let hasReachedLowestOctave = false;
    const BENCHMARK_FRQUENCY = 16.35
    while(!hasReachedLowestOctave) {
      //16.35 is the frequency of the lowest note of the lowest octave
      if(currentFrequency/2 <= BENCHMARK_FRQUENCY) {
        hasReachedLowestOctave = true;
      } else {
        currentFrequency /= 2
        counter++;
      }
    }
    return counter;
  }

export default octaveFromPitch