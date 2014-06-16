var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
// prevent anti-aliasing (still a bug in chrome)
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
var color = d3.scale.log()
    .domain([1, 2000.0])
    .range(["white", "red"]);

// File Select button
function handleFileSelect(evt) {
  var file = evt.target.files[0];
  var reader = new FileReader();
  reader.onload = function() {
    // read file contents
    var buf = reader.result;
    var array = parseNumpyFileBuffer(buf);
    var matrix = array.data,
        lenX = array.shape[0],
        lenY = array.shape[1];

    // paint the matrix
    canvas.width = lenX;
    canvas.height = lenY;
    imgData = ctx.createImageData(lenX, lenY);
    for (var i = 0, p = -1; i < lenY; ++i) {
      for (var j = 0; j < lenX; ++j) {

        var value = matrix[lenY*i + j];
        
        var c = d3.rgb(value < 1.0 ? "white" : color(value));

        imgData.data[++p] = c.r;
        imgData.data[++p] = c.g;
        imgData.data[++p] = c.b;
        imgData.data[++p] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // encode the canvas contents and apply to img tag's src
    $heatmap = $('.heatmap');
    $heatmap.attr("src", canvas.toDataURL("image/png"));
    
    // resize the bounding window
    var side = $heatmap.attr("width");
    var offset = side/Math.sqrt(2) - side/2.0;
    $hicWindow = $('.hic-window');
    $hicWindow.css("width", side*Math.sqrt(2));
    $hicWindow.css("height", side/Math.sqrt(2));
    $hicWindow.css("visibility", "visible");

    // apply panzoom
    (function() {
      var $section = $('section').first();
      $section.find('.panzoom').panzoom({
        $zoomIn: $section.find(".zoom-in"),
        $zoomOut: $section.find(".zoom-out"),
        $zoomRange: $section.find(".zoom-range"),
        $reset: $section.find(".reset"),
        // more options here
        maxScale: 10,
        startTransform: 'translate(145px, -350px)'
      });
    })();
  };
  reader.readAsArrayBuffer(file);
};
document.getElementById('fileloader')
    .addEventListener('change', handleFileSelect, false);


// wipe canvas and redraw image on transformed canvas
function redraw(ctx, imageObj){
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0, canvas.width, canvas.height);
  ctx.restore();
  ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
}