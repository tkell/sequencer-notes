function drawLine(startX, startY, offsetX, offsetY) {
    var path = new Path();
    path.strokeColor = '#a4c3b5';
    var start = new Point(startX, startY);
    path.moveTo(start);
    path.lineTo(start + [offsetX, offsetY]);
}

function drawGrid(startX, startY, offsetX, offsetY, xLength, yLength, numRows, numCols) {
    for (var i = 0; i <= numRows; i++) {
        var x = startX;
        var y = startY + (offsetY * i);
        drawLine(x, y, xLength, 0);
    }

    for (var i = 0; i <= numCols; i++) {
        var x = startX + (offsetX * i);
        var y = startY
        drawLine(x, y, 0, yLength);
    }
}
// Unsure why xLength is 1025 and not 1028?
drawGrid(0, 0, 32, 32, 1025, 512, 16, 32);
