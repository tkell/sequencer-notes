// visual code from here -----------------------------
var gridSize = 32;

function drawLine(startX, startY, offsetX, offsetY, color) {
    var path = new Path();
    path.strokeColor = color;
    var start = new Point(startX, startY);
    path.moveTo(start);
    path.lineTo(start + [offsetX, offsetY]);
    return path;
}

function drawGrid(startX, startY, xLength, yLength, numRows, numCols, color) {
    for (var i = 0; i <= numRows; i++) {
        var x = startX;
        var y = startY + (gridSize * i);
        drawLine(x, y, xLength, 0, color);
    }

    for (var i = 0; i <= numCols; i++) {
        var x = startX + (gridSize * i);
        var y = startY
        drawLine(x, y, 0, yLength, color);
    }
}

function drawGridCircle(x, y, color) {
    var xLoc = x * gridSize;
    var yLoc = y * gridSize;
    var size = gridSize / 3
    var circle = new Path.Circle(new Point(xLoc, yLoc), size);
    circle.fillColor = color;
    return circle;
}

function drawGridLine(x1, y1, x2, y2, color) {
    var xLoc1 = x1 * gridSize;
    var yLoc1 = y1 * gridSize;
    var xLoc2 = x2 * gridSize;
    var yLoc2 = y2 * gridSize;
    var line = drawLine(xLoc1, yLoc1, xLoc2 - xLoc1, yLoc2 - yLoc1, color)
    return line;
}

function drawSequence(points, color) {
    sequence = {
        circles: [],
        lines: [],
    };
    // careful of the +=2 here,
    // and the draw back to the beginning!
    for (var i = 0; i < points.length; i+=2) {
        // Last line
        if (i === points.length - 2) {
            var x1 = points[i];
            var y1 = points[i + 1];
            var x2 = points[0];
            var y2 = points[1];
            var line = drawGridLine(x1, y1, x2, y2, color);
            sequence.lines.push(line);
        } else {
            var x1 = points[i];
            var y1 = points[i + 1];
            var x2 = points[i + 2];
            var y2 = points[i + 3];
            var line = drawGridLine(x1, y1, x2, y2, color);
            sequence.lines.push(line);
        }
    }

    // careful of the +=2 here!
    for (var j = 0; j < points.length; j+=2) {
        var x = points[j];
        var y = points[j + 1];
        var circle = drawGridCircle(x, y, color);
        sequence.circles.push(circle);
    }
    return sequence;
}

function playVisual(circle, timeout) {
    circle.fillColor.saturation += 1.0;
    circle.fillColor.alpha = 0.5;
    setTimeout(function() {
        circle.fillColor.saturation -= 1.0;
        circle.fillColor.alpha = 1.0;
    }, timeout * 1000)

}

// audio code from here -----------------------------
// WebAudio code is in seconds.
// JavaScript time is in milliseconds
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();
var audioUrls = ["kick.mp3", "snare.mp3", "hihat.mp3", "rim.wav", "cowbell.mp3"];

function loadAudio(url, sequence) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            // Clean this up!
            sequence.buffer = buffer;
            sequence.gain = 0.8;
        }, function() {
            console.log("Audio did not load!");
        });
    }
    request.send();
}

function togglePlay(event) {
    if (event.keyCode === 32) {
        event.preventDefault();
        event.stopPropagation();
        if (transport.isPlaying === false) {
            transport.isPlaying = true
            schedulePlays();
        } else {
            for (var i = 0; i < transport.sequences.length; i++) {
                transport.sequences[i].hasStarted = false;
            }
            transport.isPlaying = false;
        }
    }
}

// Raw, strongly-timed WebAudio playback
function playSound(when, buffer, gain) {
    var source = context.createBufferSource()
    source.buffer = buffer
    var gainNode = context.createGain();
    gainNode.gain.value = gain;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(when)
    return source
}

function playMidi(when, note, channel, gain) {
    // when is absolute web audio time in seconds, started on first click
    // webMidi time is in milliseconds, started on page load.
    // we need to play at when in midi-time
    // so we get the difference in ms, and add that to when
    var timeOffset = WebMidi.time - (context.currentTime * 1000)
    var midiTimeInMs = when * 1000 + timeOffset;
    midiOutput.playNote(note, 1, {time: midiTimeInMs, duration: 100, velocity: gain}); // milliseconds
}

function playBeep(when) {
    var timeInSeconds = when
    var oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.connect(context.destination);
    oscillator.start(timeInSeconds);
    oscillator.stop(timeInSeconds + 0.1);
}

var transport = {
    "tempo":  120,
    "isPlaying": false,
    "lookAhead": 0.10, // seconds
    "scheduleInterval": 30, // milliseconds
    "sequences": [],
    "colors": ["#453c7c", "#9acea1", "#daf2fd", "#34f7b1", "#f7347a"],
    "notes": ["C3", "D3", "E3", "F3", "G3"],
}

// Helper function to do playback and visuals
function doPlay(sequence, playTime, visualDelay) {
    var circle = sequence.circles[sequence.currentIndex];
    var nextIndex = (sequence.currentIndex + 1) % sequence.numNotes
    if (nextIndex === 0) {
        sequence.numLoops += 1;
    }

    var timeToNextNote = sequence.noteTimes[sequence.currentIndex];
    playVisual(circle, visualDelay);
    playSound(playTime, sequence.buffer, sequence.gain);
    playMidi(playTime, sequence.note, 1, sequence.gain);
    sequence.currentIndex = nextIndex;
    sequence.absoluteNextNoteTime = sequence.absoluteNextNoteTime += timeToNextNote
}

function schedulePlays() {
    if (transport.isPlaying === false) {
        return;
    }
    for (var i = 0; i < transport.sequences.length; i++) {
        var sequence = transport.sequences[i];
        if (sequence.currentIndex === undefined) {
            continue;
        }
        // play the first note, then all the other notes
        if (sequence.hasStarted === false) {
            sequence.absoluteNextNoteTime = context.currentTime;
            doPlay(sequence, context.currentTime, sequence.noteTimes[sequence.currentIndex]);
            sequence.hasStarted = true;
        } else if (sequence.absoluteNextNoteTime < context.currentTime + transport.lookAhead) {
            doPlay(sequence, sequence.absoluteNextNoteTime, sequence.noteTimes[sequence.currentIndex]);
       }
    }

    // Once all notes for all sequencers in this range are added,
    // schedule the next call
    setTimeout(function() {
        schedulePlays()
    }, transport.scheduleInterval)
}


// WebMidi functions from here -------------------------------
var midiOutput = null;
WebMidi.enable(function (err) {
    if (err) {
        console.log("WebMidi could not be enabled.", err);
    } else {
        if (WebMidi.outputs.length > 0) {
            console.log("WebMidi enabled!");
            var midiSpan = document.getElementById("midi");
            midiOutput = WebMidi.outputs[0];
            midiSpan.textContent = midiOutput.name;
        }
    }
});

// Sequencer functions from here ---------------------------------------
function euclidianDistance(x1, y1, x2, y2) {
    return Math.pow(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2), 0.5);
}

function makeNoteTimes(points, tempo) {
    // In seconds
    var sixteenthNote = 60 / tempo / 4;
    noteTimes = [];
    for (var i = 0; i < points.length; i+=2) {
        // Last jump
        if (i === points.length - 2) {
            var x1 = points[i];
            var y1 = points[i + 1];
            var x2 = points[0];
            var y2 = points[1];
            noteTimes.push(euclidianDistance(x1, y1, x2, y2) * sixteenthNote);
        } else {
            var x1 = points[i];
            var y1 = points[i + 1];
            var x2 = points[i + 2];
            var y2 = points[i + 3];
            noteTimes.push(euclidianDistance(x1, y1, x2, y2) * sixteenthNote);
        }
    }
    return noteTimes;
}

function makeSequence(locations, color) {
    var sequence = drawSequence(locations, color);
    sequence.numNotes = locations.length / 2;
    sequence.noteTimes = makeNoteTimes(locations, transport.tempo);
    sequence.currentIndex = 0;
    sequence.numLoops = 0;
    sequence.hasStarted = false;
    sequence.absoluteNextNoteTime = (context.currentTime);
    return sequence;
}

function deleteSequence(index) {
    var circles = transport.sequences[index].circles;
    var lines = transport.sequences[index].lines;

    if (circles) {
        for (var i = 0; i < circles.length; i++) {
            circles[i].remove();
        }
    }
    if (lines) {
        for (var i = 0; i < lines.length; i++) {
            lines[i].remove();
        }
    }
    var buffer = transport.sequences[index].buffer;
    transport.sequences[index] = {buffer: buffer};
}

// Setup code from here --------------------------------------

function parseInput(inputString) {
    // trim whitespace
    var inputString = inputString.replace(/(^\s+|\s+$)/g,'');
    var re = /^(\d+,\d+;)+$/
    var match = inputString.match(re);
    // Does the regex match?
    console.log(re, inputString, match);
    if (match) {
        var pairs = inputString.split(";")
        if (pairs.length < 2) {
            return [];
        }
        var output = [];
        // hacky due to there being a trailing pair
        for (var i = 0; i < pairs.length - 1; i++) {
            var pair = pairs[i];
            var digits = pair.split(",");
            output.push(digits[0]);
            output.push(digits[1]);
        }
        return output;
    } else {
        return []
    }
}

function processInput(event) {
    var seqIndex = parseInt(event.target.dataset.seqIndex);
    // Ignore spaces
    if (event.keyCode === 32) {
        event.preventDefault();
        return;
    }
    // Enter:  update sequences
    if (event.keyCode === 13) {
        event.preventDefault();
        event.stopPropagation();
        var inputString = event.target.value;
        var inputList = parseInput(inputString);
        if (inputList.length > 0) {
            var buffer = transport.sequences[seqIndex].buffer;
            var gain = transport.sequences[seqIndex].gain;
            var color = transport.colors[seqIndex];
            deleteSequence(seqIndex);
            var seq = makeSequence(inputList, color);
            // fix alllll thisss
            seq.buffer = buffer;
            seq.gain = gain;
            seq.note = transport.notes[seqIndex];
            transport.sequences[seqIndex] = seq;
        }
    }
    // shift-x:  delete sequence
    else if (event.keyCode === 88) {
        event.preventDefault();
        deleteSequence(seqIndex);
        event.target.value = "";
    }
    // f:  volume up
    else if (event.keyCode === 102) {
        event.preventDefault();
        if (sequence.gain < 1.01) {
            sequence.gain = sequence.gain + 0.1;
        }
    }
    // v:  volume down
    else if (event.keyCode === 118) {
        event.preventDefault();
        if (sequence.gain > 0.01) {
            sequence.gain = sequence.gain - 0.1;
        }
    }
}
var inputs = document.getElementsByClassName("seqInput");
for (var i = 0; i < inputs.length; i++) {
    inputs[i].onkeypress = processInput
    transport.sequences[i] = {};
    var url = "audio/" + audioUrls[i];
    loadAudio(url, transport.sequences[i]);
}

window.onkeypress = togglePlay;

// Unsure why xLength is 1025 and not 1028?
drawGrid(0, 0, 1025, 512, 16, 32, "#a4c3b5");

window.addEventListener('click', function() {
    if (context.state !== 'running') {
        console.log('Audio Context on.')
        context.resume();
    }
}, false);
