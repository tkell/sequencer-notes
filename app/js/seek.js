function drawLine(startX, startY, offsetX, offsetY) {
    var path = new Path();
    path.strokeColor = 'black';
    var start = new Point(startX, startY);
    path.moveTo(start);
    path.lineTo(start + [offsetX, offsetY]);
}


function drawGrid(startX, startY, offsetX, offsetY, xLength, yLength, numRows, numCols) {
    for (var i = 0; i < numRows; i++) {
        var x = startX;
        var y = startY + (offsetY * i);
        drawLine(x, y, xLength, 0);
    }

    for (var i = 0; i < numCols; i++) {
        var x = startX + (offsetX * i);
        var y = startY
        drawLine(x, y, 0, yLength);
    }
}

drawGrid(5, 5, 20, 20, 400, 400, 20, 20);
