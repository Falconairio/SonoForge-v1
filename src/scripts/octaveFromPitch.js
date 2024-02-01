var octaveFromPitch = (frequency) => {
    /* this should be set to zero ideally, but for some reason when the frquency hits the mic 
    it is double what it should be, and thus thinks its an octave higher */
    let counter = 1;
    let currentFrequency = frequency;
    let hasReachedLowestOctave = false;
    while(!hasReachedLowestOctave) {
      if(currentFrequency/2 <= 30.87) {
        hasReachedLowestOctave = true;
      } else {
        currentFrequency /= 2
        counter++;
      }
    }
    return counter;
  }

export default octaveFromPitch