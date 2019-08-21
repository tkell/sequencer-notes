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
    }, timeout)

}

// audio code from here -----------------------------
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

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

function playBeep(when) {
    var timeInSeconds = when / 1000;
    var oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.connect(context.destination);
    oscillator.start(timeInSeconds);
    oscillator.stop(timeInSeconds + 0.1);
}

var transport = {
    'tempo':  120,
    'isPlaying': false,
    'lookAhead': 100, // milliseconds
    'scheduleInterval': 30, // milliseconds
    'sequences': [],
}

// Helper function to do playback and visuals
function doPlay(sequence, playTime, visualDelay) {
    var circle = sequence.circles[sequence.currentIndex];
    var nextIndex = (sequence.currentIndex + 1) % sequence.numNotes
    if (nextIndex === 0) {
        sequence.numLoops += 1;
    }

    var timeToNextNote = sequence.noteTimes[nextIndex];
    playVisual(circle, visualDelay);
    playBeep(playTime);
    sequence.currentIndex = nextIndex;
    sequence.absoluteNextNoteTime = sequence.absoluteNextNoteTime += timeToNextNote
}

function schedulePlays(startTime) {
    for (var i = 0; i < transport.sequences.length; i++) {
        var sequence = transport.sequences[i];
        // play the first note!
        if (sequence.currentIndex === 0 && sequence.numLoops === 0) {
            doPlay(sequence, context.currentTime, sequence.noteTimes[0]);
        } else if (sequence.absoluteNextNoteTime < context.currentTime * 1000 + transport.lookAhead) {
            var nextIndex = (sequence.currentIndex + 1) % sequence.numNotes
            doPlay(sequence, sequence.absoluteNextNoteTime, sequence.noteTimes[nextIndex]);
       }
    }

    // Once all notes for all sequencers in this range are added,
    // schedule the next call
    setTimeout(function() {
        schedulePlays(startTime)
    }, transport.scheduleInterval)
}

// Sequencer functions from here ---------------------------------------
function euclidianDistance(x1, y1, x2, y2) {
    return Math.pow(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2), 0.5);
}

function makeNoteTimes(points, tempo) {
    var sixteenthNote = 60000 / tempo / 4;
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
    sequence.absoluteNextNoteTime = (context.currentTime * 1000);
    return sequence;
}

// Unsure why xLength is 1025 and not 1028?
drawGrid(0, 0, 1025, 512, 16, 32, "#a4c3b5");

// CONVERT ALL WEB AUDIO TO SECONDS, OOOOPS
// MAKE A DAMN POINT CLASS
// FIGURE OUT HOW TO DO DELETES
var seq1 = makeSequence([1, 1, 1, 5, 5, 5, 3, 3, 5, 1], "blue");
var seq2 = makeSequence([8, 8, 10, 12, 12, 8], "red");
transport.sequences.push(seq1);
transport.sequences.push(seq2);
console.log(transport);


window.addEventListener('click', function() {
    context.resume();
    schedulePlays(context.currentTime);
}, false);
