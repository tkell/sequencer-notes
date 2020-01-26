// visual code from here -----------------------------
var gridSize = 32;

function drawDot(x, y, width, height, color) {
    var rect = new Rectangle(x, y, width, height);
    var path = new Path.Rectangle(rect);
    path.fillColor = color;
}

function drawDots(xCenter, yCenter, color, offset) {
    for (var i = offset * -1; i < offset; i+=8) {
        var x = xCenter + i;
        for (var j = offset * -1; j < offset; j+=8) {
            var y = yCenter + j;
            drawDot(x, y, 2, 2, color);
        }
    }
}

function drawDotArea(xStart, xEnd, yStart, yEnd, color) {
    for (var i = xStart; i <= xEnd; i++) {
        var x = i * gridSize;
        for (var j = yStart; j <= yEnd; j++) {
            var y = j * gridSize
            if (i === xStart || j === yStart || i === xEnd || j  === yEnd) {
                drawDots(x, y, color, gridSize / 2);
            }
        }
    }
}

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

function drawSequence(points, notes) {
    sequence = {
        circles: [],
        lines: [],
    };
    // careful of the +=2 here,
    // and the draw back to the beginning,
    // and the weird lists-of-different-lengths!
    for (var i = 0; i < points.length; i+=2) {
        var colorIndex = Math.floor(i / 2);
        var color = transport.areas[notes[colorIndex]].color;
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
        var colorIndex = Math.floor(j / 2);
        var color = transport.areas[notes[colorIndex]].color;
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

function entryVisual(xVal, yVal, color) {
    var lines = [];
    var yLine = drawGridLine(0, yVal, 31, yVal, color);
    var xLine = drawGridLine(xVal, 0, xVal, 15, color);
    lines.push(yLine, xLine);
    return lines;
}

function inputVisual(color, timeout) {
    var line1 = drawGridLine(0, 0, 31, 0, color);
    var line2 = drawGridLine(31, 0, 31, 15, color);
    var line3 = drawGridLine(31, 15, 0, 15, color);
    var line4 = drawGridLine(0, 15, 0, 0, color);
    setTimeout(function() {
        line1.remove();
        line2.remove();
        line3.remove();
        line4.remove();
    }, timeout * 1000)
}

// audio code from here -----------------------------
// WebAudio code is in seconds.
// JavaScript time is in milliseconds
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();
var audioUrls = ["kick.mp3", "snare.mp3", "hihat.mp3", "rim.wav", "cowbell.mp3"];

function loadAudio(url, area) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            // Clean this up!
            area.buffer = buffer;
        }, function() {
            console.log("Audio did not load!");
        });
    }
    request.send();
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
    if (midiOutput) {
        var timeOffset = WebMidi.time - (context.currentTime * 1000)
        var midiTimeInMs = when * 1000 + timeOffset;
        // milliseconds
        midiOutput.playNote(note, channel, {time: midiTimeInMs, duration: 100, velocity: gain});
    }
}

function playBeep(when) {
    var timeInSeconds = when
    var oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.connect(context.destination);
    oscillator.start(timeInSeconds);
    oscillator.stop(timeInSeconds + 0.1);
}

function changeTempo(transport, newTempo) {
    transport.tempo = newTempo;
    for (var i = 0; i < transport.sequences.length; i++) {
        var sequence = transport.sequences[i];
        if (sequence.locations) {
            sequence.noteTimes = makeNoteTimes(sequence.locations, transport.tempo);
        }
    }
    var tempoSpan = document.getElementById("tempo");
    tempoSpan.textContent = transport.tempo;
}

function createArea(color, note, layout, index) {
    var area = {};
    area.color = color;
    area.note = note;
    area.buffer = null;
    area.layout = layout;
    area.index = index;
    return area;
}

function createNoteMap(areas) {
    var noteMap = new Array(gridSize);
    for (var i = 0; i < noteMap.length; i++) {
        noteMap[i] = new Array(gridSize / 2);
    }
    for (var i = 0; i < areas.length; i++) {
        var area = areas[i];
        var layout = area.layout;
        var index = i;
        for (var x = layout[0]; x <= layout[1]; x++) {
            for (var y = layout[2]; y <= layout[3]; y++) {
                // we can just store the index here!
                noteMap[x][y] = index;
            }
        }
    }
    return noteMap;
}

var transport = {
    "tempo":  120,
    "isPlaying": false,
    "lookAhead": 0.10, // seconds
    "scheduleInterval": 30, // milliseconds
    "sequences": [],
    "areas": [
        createArea("#453c7c", 60, [0, 7, 0, 7], 0),
        createArea("#9acea1", 62, [8, 15, 0, 7], 1),
        createArea("#aab2ff", 64, [16, 23, 0, 7], 2),
        createArea("#34f7b1", 65, [24, 31, 0, 7], 3),
        createArea("#f7347a", 67, [0, 31, 8, 15], 4),
        ],
    "noteMap": {},
    "midiActivated": false,
    "midiOutputs": [],
    "midiIndex": 0,
}
transport.noteMap = createNoteMap(transport.areas);

// Helper function to do playback and visuals
function doPlay(sequence, playTime, visualDelay, midiChannel) {
    var circle = sequence.circles[sequence.currentIndex];
    var areaIndex = sequence.notes[sequence.currentIndex];
    var areaToPlay = transport.areas[areaIndex];
    var nextIndex = (sequence.currentIndex + 1) % sequence.numNotes
    if (nextIndex === 0) {
        sequence.numLoops += 1;
    }

    var timeToNextNote = sequence.noteTimes[sequence.currentIndex];
    playVisual(circle, visualDelay);
    if (midiOutput) {
        playMidi(playTime, areaToPlay.note, midiChannel, sequence.gain);
    }
    else {
        playSound(playTime, areaToPlay.buffer, sequence.gain);
    }
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
            doPlay(sequence, context.currentTime, sequence.noteTimes[sequence.currentIndex], i + 1);
            sequence.hasStarted = true;
        } else if (sequence.absoluteNextNoteTime < context.currentTime + transport.lookAhead) {
            doPlay(sequence, sequence.absoluteNextNoteTime, sequence.noteTimes[sequence.currentIndex], i + 1);
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
            midiSpan.textContent = "enabled, but not activated";
            transport.midiOuts = WebMidi.outputs;
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

function initSequence(gain) {
    var sequence = {};
    sequence.gain = gain;
    sequence.numLoops = 0;
    sequence.hasStarted = false;
    sequence.magicSeparator = ",";
    sequence.startLines = [];
    return sequence;
}

function getNotes(locations) {
    var notes = [];
    for (var i = 0; i < locations.length; i+=2) {
        var x = parseInt(locations[i]);
        var y = parseInt(locations[i + 1]);
        notes.push(transport.noteMap[x][y]);
    }
    return notes;
}

function makeSequence(locations, color, gain) {
    var sequence = initSequence(gain)
    sequence.notes = getNotes(locations)
    sequence.numNotes = locations.length / 2;
    sequence.locations = locations;
    sequence.noteTimes = makeNoteTimes(locations, transport.tempo);
    sequence.absoluteNextNoteTime = (context.currentTime);
    sequence.currentIndex = 0;
    var drawn = drawSequence(locations, sequence.notes);
    sequence.circles = drawn.circles;
    sequence.lines = drawn.lines;
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
    transport.sequences[index] = initSequence(transport.sequences[index].gain)
}

// Setup code from here --------------------------------------

function parseInput(inputString) {
    // trim whitespace
    var inputString = inputString.replace(/(^\s+|\s+$)/g,'');
    var re = /^(\d+,\d+;)+$/
    var match = inputString.match(re);
    // Does the regex match?
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

// Keypress handlers --------------------------------------
function displayMidiNotes(transport) {
    for (var i = 0; i < transport.areas.length; i++) {
        var idString = "midiNote" + (i + 1);
        var midiString = transport.areas[i].note;
        var midiNoteSpan = document.getElementById(idString);
        midiNoteSpan.textContent = midiString;
    }
}

function hideMidiNotes(transport) {
    for (var i = 0; i < transport.areas.length; i++) {
        var idString = "midiNote" + (i + 1);
        var midiString = "";
        var midiNoteSpan = document.getElementById(idString);
        midiNoteSpan.textContent = midiString;
    }
}

function processGlobalInput(event) {
    // space: play / pause
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
    // +: increase tempo by 1
    else if (event.keyCode === 43) {
        event.preventDefault();
        event.stopPropagation();
        changeTempo(transport, transport.tempo + 1);
    }
    // -: decrease tempo by 1
    else if (event.keyCode === 45) {
        event.preventDefault();
        event.stopPropagation();
        changeTempo(transport, transport.tempo - 1);
    }
    // |: Toggle between midi and no midi
    else if (event.keyCode === 124) {
        event.preventDefault();
        event.stopPropagation();
        if (transport.midiActivated == false) {
            transport.midiActivated = true;
            midiOutput = transport.midiOuts[transport.midiIndex];
            var midiSpan = document.getElementById("midi");
            midiSpan.textContent = midiOutput.name;
            displayMidiNotes(transport);
        }
        else if (transport.midiActivated == true) {
            transport.midiActivated = false;
            midiOutput = null;
            var midiSpan = document.getElementById("midi");
            midiSpan.textContent = "midi deactivated"
            hideMidiNotes(transport);
        }
    }
    // {: Select previous midi out
    else if (event.keyCode === 123) {
        event.preventDefault();
        event.stopPropagation();
        if (transport.midiActivated == true) {
            transport.midiIndex = Math.max(0, transport.midiIndex - 1);
            midiOutput = transport.midiOuts[transport.midiIndex];
            var midiSpan = document.getElementById("midi");
            midiSpan.textContent = midiOutput.name;
        }
    }
    // }: Select next midi out
    else if (event.keyCode === 125) {
        event.preventDefault();
        event.stopPropagation();
        if (transport.midiActivated == true) {
            transport.midiIndex = Math.min(transport.midiOuts.length - 1, transport.midiIndex + 1);
            midiOutput = transport.midiOuts[transport.midiIndex];
            var midiSpan = document.getElementById("midi");
            midiSpan.textContent = midiOutput.name;
        }
    }
}

function updateSeq(inputList, seqIndex, sequence, event) {
    if (inputList.length > 0) {
        deleteSequence(seqIndex);
        var newSequence = makeSequence(inputList,
            transport.areas[seqIndex].color,
            sequence.gain);
        transport.sequences[seqIndex] = newSequence;
        var newInputString = createStringFromInputList(inputList);
        event.target.value = newInputString;
    }
}

function getFunctionParameter(funcName, defaultRes) {
    var param = defaultRes;
    if (funcName.length > 1) {
        param = parseInt(funcName.slice(1, funcName.length));
    }
    return param;
}

function runUpdateFunction(seqIndex, event, funcName) {
    var sequence = transport.sequences[seqIndex];
    // E:  Expand
    if (funcName === "E" || funcName[0] === "E") {
        var size = getFunctionParameter(funcName, 1)
        var inputList = expandLocations(sequence.locations, size);
        updateSeq(inputList, seqIndex, sequence, event);
    }
    // e:  Contract
    if (funcName === "e" || funcName[0] === "e") {
        var size = getFunctionParameter(funcName, 1) * -1
        var inputList = expandLocations(sequence.locations, size);
        updateSeq(inputList, seqIndex, sequence, event);
    }
    // S:  Spin right
    if (funcName === "S" || funcName[0] === "S") {
        var angle = getFunctionParameter(funcName, 90)
        var inputList = rotateLocations(sequence.locations, angle);
        updateSeq(inputList, seqIndex, sequence, event);
    }
    // s:  Spin left
    if (funcName === "s" || funcName[0] === "s") {
        var angle = getFunctionParameter(funcName, 90) * -1;
        var inputList = rotateLocations(sequence.locations, angle);
        updateSeq(inputList, seqIndex, sequence, event);
    }
    // R: Move right
    if (funcName === "R" || funcName[0] === "R") {
        var size = getFunctionParameter(funcName, 1);
        var inputList = translateLocations(sequence.locations, "X", size);
        updateSeq(inputList, seqIndex, sequence, event);
    }
    // L: Move left
    if (funcName === "L" || funcName[0] === "L") {
        var size = getFunctionParameter(funcName, 1) * -1;
        var inputList = translateLocations(sequence.locations, "X", size);
        updateSeq(inputList, seqIndex, sequence, event);
    }
    // U: Move up
    if (funcName === "U" || funcName[0] === "U") {
        var size = getFunctionParameter(funcName, 1) * -1;
        var inputList = translateLocations(sequence.locations, "Y", size);
        updateSeq(inputList, seqIndex, sequence, event);
    }
    // D: Move down
    if (funcName === "D" || funcName[0] === "D") {
        var size = getFunctionParameter(funcName, 1);
        var inputList = translateLocations(sequence.locations, "Y", size);
        updateSeq(inputList, seqIndex, sequence, event);
    }
}

function processInput(event) {
    var seqIndex = parseInt(event.target.dataset.seqIndex);
    var sequence = transport.sequences[seqIndex];

    // Backtick: add magic separator,
    // and draw lines
    if (event.keyCode === 96) {
        if (!sequence.magicSeparator) {
            sequence.magicSeparator = ",";
        }
        if (!sequence.startLines) {
            sequence.startLines = [];
        }
        var inputString = event.target.value;
        inputString += sequence.magicSeparator
        if (sequence.magicSeparator === ",") {
            sequence.magicSeparator = ";";
        } else {
            sequence.magicSeparator = ",";
        }
        event.target.value = inputString;
        event.preventDefault();
        // Draw starting lines
        var color = transport.areas[seqIndex].color;
        var pairs = parseInput(inputString);
        if (pairs.length >= 2) {
            var x = pairs[pairs.length - 2];
            var y = pairs[pairs.length - 1];
            var newLines = entryVisual(x, y, color)
            sequence.startLines.push.apply(sequence.startLines, newLines);
        }
        return;
    }
    // Ignore spaces
    if (event.keyCode === 32) {
        event.preventDefault();
        return;
    }
    // ctrl: raise midi notes
    if (event.ctrlKey) {
        if (event.code.indexOf("Digit") == 0) {
            event.preventDefault();
            var offset = parseInt(event.code.replace("Digit", ""));
            transport.areas[seqIndex].note += offset
            sequence.midiNote = transport.areas[seqIndex].note;
            displayMidiNotes(transport);
        }
        return; // just in case
    }
    // alt: lower midi notes
    if (event.altKey) {
        if (event.code.indexOf("Digit") == 0) {
            event.preventDefault();
            var offset = parseInt(event.code.replace("Digit", ""));
            transport.areas[seqIndex].note -= offset
            sequence.midiNote = transport.areas[seqIndex].note;
            displayMidiNotes(transport);
        }
        return; // just in case
    }
    // Enter:  update sequences or run an updating function
    if (event.keyCode === 13) {
        event.preventDefault();
        event.stopPropagation();
        var inputString = event.target.value;

        if (inputString.indexOf('=>') != -1) {
            var funcName = inputString.split("=>")[1];
            runUpdateFunction(seqIndex, event, funcName);
            return;
        }

        var inputList = parseInput(inputString);
        if (inputList.length > 0) {
            for (var i = 0; i < sequence.startLines.length; i++) {
                var line = sequence.startLines[i];
                line.remove();
            }
            deleteSequence(seqIndex);
            var newSequence = makeSequence(inputList,
                transport.areas[seqIndex].color,
                sequence.gain);
            transport.sequences[seqIndex] = newSequence;
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
    // m: minimize 
    else if (event.keyCode === 109) {
        event.preventDefault();
        zoomOutCss(seqIndex);
    }
    // shift-m: maximize 
    else if (event.keyCode === 77) {
        event.preventDefault();
        zoomInCss(seqIndex);
    }
    // fall through to regular input: pulse the grid
    var color = transport.areas[seqIndex].color;
    inputVisual(color, 0.5);
}

function createStringFromInputList(inputList) {
    var pairsList = [];
    for (var i = 0; i < inputList.length; i+=2) {
        var pair = [];
        pair.push(inputList[i]);
        pair.push(inputList[i + 1]);
        pairsList.push(pair.join(","));
    }
    // Add trailing semicolon
    return pairsList.join(";") + ";";
}

// Pattern modification fuctions and helpers from here
function findCenter(locations) {
    var xSum = 0;
    var ySum = 0;
    for (var i = 0; i < locations.length; i+=2) {
        xSum += parseInt(locations[i]);
        ySum += parseInt(locations[i + 1]);
    }
    var xCenter = xSum / (locations.length / 2);
    var yCenter = ySum / (locations.length / 2);
    return {x: xCenter, y: yCenter}
}

function rotateLocations(locations, angle) {
    angle = angle * Math.PI / 180.0;
    var center = findCenter(locations);
    var newLocations = [];
    for (var i = 0; i < locations.length; i+=2) {
        var x = parseInt(locations[i]);
        var y = parseInt(locations[i + 1]);
        var newX = Math.cos(angle) * (x - center.x) - Math.sin(angle) * (y - center.y) + center.x;
        var newY = Math.sin(angle) * (x - center.x) + Math.cos(angle) * (y - center.y) + center.y
        newLocations.push(Math.round(newX).toString());
        newLocations.push(Math.round(newY).toString());
    }
    return newLocations;
}

function expandLocations(locations, size) {
    var center = findCenter(locations);
    var newLocations = [];
    for (var i = 0; i < locations.length; i+=2) {
        var x = parseInt(locations[i]);
        var y = parseInt(locations[i + 1]);
        if (x > center.x) x+=size;
        if (x < center.x) x-=size;
        if (y > center.y) y+=size;
        if (y < center.y) y-=size;
        newLocations.push(x.toString());
        newLocations.push(y.toString());
    }
    return newLocations;
}

function translateLocations(locations, axis ,size) {
    var newLocations = [];
    for (var i = 0; i < locations.length; i+=2) {
        var x = parseInt(locations[i]);
        var y = parseInt(locations[i + 1]);
        if (axis === "X") x+=size;
        if (axis === "Y") y+=size;
        newLocations.push(x.toString());
        newLocations.push(y.toString());
    }
    return newLocations;
}

function zoomInCss(seqIndex) {
    var id = "seq" + (seqIndex + 1);
    var topDistance = (seqIndex + 1) * 80;
    var textArea = document.getElementById(id);
    textArea.classList.remove('seqInput');
    textArea.classList.add('zoomSeq');
    textArea.style.top = topDistance + "px";
}

// CSS helpers
function zoomOutCss(seqIndex) {
    var id = "seq" + (seqIndex + 1);
    var textArea = document.getElementById(id);
    textArea.classList.remove('zoomSeq');
    textArea.classList.add('seqInput');
    textArea.style.top = "";
}

function zoomIn(event) {
    var seqIndex = parseInt(event.target.dataset.seqIndex);
    zoomInCss(seqIndex);
}

function zoomOut(event) {
    var seqIndex = parseInt(event.target.dataset.seqIndex);
    zoomOutCss(seqIndex);
}

// Raw run-this-first setup code
var inputs = document.getElementsByClassName("seqInput");
for (var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    input.onkeypress = processInput;
    input.onfocus = zoomIn;
    input.onblur = zoomOut;
    transport.sequences[i] = initSequence(0.8);
}

for (var i = 0; i < transport.areas.length; i++) {
    var url = "audio/" + audioUrls[i];
    loadAudio(url, transport.areas[i]);
}

window.onkeypress = processGlobalInput;

// Unsure why xLength is 1025 and not 1028?
drawGrid(0, 0, 996, 480, 15, 31, "#a4c3b5");

for (var i = 0; i < transport.areas.length; i++) {
    var area = transport.areas[i].layout;
    var x1 = area[0];
    var x2 = area[1];
    var y1 = area[2];
    var y2 = area[3];
    var color = transport.areas[i].color;
    drawDotArea(x1, x2, y1, y2, color);
}

window.addEventListener('click', function() {
    if (context.state !== 'running') {
        console.log('Audio Context on.')
        context.resume();
    }
}, false);
