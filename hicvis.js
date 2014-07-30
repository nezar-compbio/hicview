var color = d3.scale.log()
    .domain([1, 2000.0])
    .range(["white", "red"]);

function paintMatrix(canvas, lenX, lenY, data, color) {
  canvas.width = lenX;
  canvas.height = lenY;
  var ctx = canvas.getContext("2d");

  // prevent anti-aliasing (still a bug in chrome)
  ctx.imageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;

  // paint pixels
  imgData = ctx.createImageData(lenX, lenY);
  for (var i = 0, p = -1; i < lenY; ++i) {
    for (var j = 0; j < lenX; ++j) {
      var value = data[lenY*i + j];
      var c = d3.rgb(value < 1.0 ? "white" : color(value));
      imgData.data[++p] = c.r;
      imgData.data[++p] = c.g;
      imgData.data[++p] = c.b;
      imgData.data[++p] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// wipe canvas and redraw image on transformed canvas
function redraw(ctx, imageObj){
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0, canvas.width, canvas.height);
  ctx.restore();
  ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
}