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

/*
// The visual tick function!
var c = sequences[0].circles[0];
c.fillColor.saturation += 1.0;
c.fillColor.alpha = 0.5;
*/

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

var transport = {
    'tempo':  120,
    'isPlaying': false,
    'lookAhead': 0.1, // seconds
    'scheduleInterval': 30, // milliseconds
    'sequences': [],
}

// Not using this, but keeping it for reference
function getNextNoteTime(startTime, sequence) {
    var loopOffset = sequence.numLoops * sequence.totalTime
    var nextNote = sequence.getNextTime()
    return startTime + loopOffset + nextNote
}

function schedulePlays(startTime) {
    for (var i = 0; i < transport.sequences.length; i++) {
        var sequence = transport.sequences[i];
        var nextNoteTime = sequence.nextNoteTime;
        while (nextNoteTime < context.currentTime + transport.lookAhead) {
            // gotta somehow sneak the visual updates in here too
            playSound(nextNoteTime, sequence.buffer, sequence.gain)
            sequence.currentIndex = (sequence.currentIndex + 1) % sequence.numNotes;
            var noteTime = sequence.noteTimes[sequence.currentIndex];
            sequence.nextNoteTime = sequence.nextNoteTime += noteTime
       }
    }

    // Once all notes for all sequencers in this range are added,
    // schedule the next call
    Window.timeout(function() {
        schedulePlay(startTime)
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
    sequence.nextNoteTime = context.currentTime + sequence.noteTimes[0];
    return sequence;
}

// Unsure why xLength is 1025 and not 1028?
drawGrid(0, 0, 1025, 512, 16, 32, "#a4c3b5");

var seq1 = makeSequence([1, 1, 1, 2, 2, 2], "blue");
var seq1 = makeSequence([9, 9, 8, 8, 9, 8], "green");
transport.sequences.push(seq1);
console.log(transport);