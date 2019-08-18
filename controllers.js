// Ignoring loading audio, for now

// Global transport object for dealing with timing
var transport = {
    'tempo':  120,
    'isPlaying': false,
    'lookAhead': 0.1, // seconds
    'scheduleInterval': 30, // milliseconds
}

// a Sequence has tempo, numLoops, currentIndex, totalTime

// This will need to be calculated for each sequence!
getNextNoteTime = function(startTime, sequence) {
    var loopOffset = sequence.numLoops * sequence.totalTime
    var nextNote = sequence.getNextTime()
    return startTime + loopOffset + nextNote
}
//
// Schedule the next note or notes using playSound
// this weird less-than is saying "notes that are within the range of your 0.1 second lookahead", 
// because maybe the next 16th note is not, in which case it won't get played!
// so how do we track our next note?
// this is saying "play the next step"
// I need to say "if any of my sequencers have a note that is within context.currentTime + transport.lookAhead, play it

// so I need indexes for each sequencer, as well as a nextNoteTime in absolute time for each sequencer
// and then the for loop in there is for sequencer in sequencers, '
//  if nextNoteTime is less than currentTime + lookAhead
//      play sequencer note i 
//      update sequencer.nextNoteTime - it is += notes[i].length
//      increatment the index, i, for that sequencer, mod the lenght of that sequence
schedulePlays = function(startTime) {
    for (var i = 0; i < transport.sequences.length; i++) {
        let sequence = transport.sequences[i];
        let nextNoteTime = getNextNoteTime(startTime, sequence);
        while (nextNoteTime < context.currentTime + transport.lookAhead) {
            playSound(nextNoteTime, sequence.buffer, sequence.gain)
            sequence.currentIndex = sequence.currentIndex + 1;
        }
    }

    // Once all notes for all sequencers in this range are added,
    // schedule the next call
    Window.timeout(function() {
        schedulePlay(startTime)
    }, transport.scheduleInterval)
}

// Raw, strongly-timed WebAudio playback
playSound = function(when, buffer, gain) {
    var source = context.createBufferSource()
    source.buffer = buffer
    var gainNode = context.createGain();
    gainNode.gain.value = gain;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(when)
    return source
}
