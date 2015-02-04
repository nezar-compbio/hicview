/*************************************************************
 *  
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014-2015 Nezar Abdennur
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */


// Client-side parser for .npy files
var NumpyLoader = (function () {
    function bytes2ascii(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    function readUint16LE(buffer) {
        var view = new DataView(buffer);
        var val = view.getUint8(0);
        val |= view.getUint8(1) << 8;
        return val;
    }

    function fromArrayBuffer(buf) {
      // Check the magic number
      var magic = bytes2ascii(buf.slice(0,6));
      if (magic.slice(1,6) != 'NUMPY') {
          throw new Error('unknown file type');
      }

      var version = new Uint8Array(buf.slice(6,8)),
          headerLength = readUint16LE(buf.slice(8,10)),
          headerStr = bytes2ascii(buf.slice(10, 10+headerLength));
          offsetBytes = 10 + headerLength;
          //rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

      // Hacky conversion of dict literal string to JS Object
      eval("var info = " + headerStr.toLowerCase().replace('(','[').replace('),',']'));

      // Intepret the bytes according to the specified dtype
      if (info.descr === "|u1") {
          data = new Uint8Array(buf, offsetBytes);
      } else if (info.descr === "|i1") {
          data = new Int8Array(buf, offsetBytes);
      } else if (info.descr === "<u2") {
          data = new Uint16Array(buf, offsetBytes);
      } else if (info.descr === "<i2") {
          data = new Int16Array(buf, offsetBytes);
      } else if (info.descr === "<u4") {
          data = new Uint32Array(buf, offsetBytes);
      } else if (info.descr === "<i4") {
          data = new Int32Array(buf, offsetBytes);
      } else if (info.descr === "<f4") {
          data = new Float32Array(buf, offsetBytes);
      } else if (info.descr === "<f8") {
          data = new Float64Array(buf, offsetBytes);
      } else {
          throw new Error('unknown numeric dtype')
      }

      return {
          shape: info.shape,
          fortran_order: info.fortran_order,
          data: data
      };
    }

    function open(file, callback) {
        var reader = new FileReader();
        reader.onload = function() {
            // the file contents have been read as an array buffer
            var buf = reader.result;
            var ndarray = fromArrayBuffer(buf);
            callback(ndarray);
        };
        reader.readAsArrayBuffer(file);
    }

    function ajax(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
            var buf = xhr.response; // not responseText
            var ndarray = fromArrayBuffer(buf);
            callback(ndarray);
        };
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
    }

    return {
        open: open,
        ajax: ajax
    };
})();
 



// https://github.com/timmywil/jquery.panzoom/issues/84
// http://bost.ocks.org/mike/chart/
function chart() {
  var width = 720, // default width
      height = 80; // default height

  function self() {
    // generate chart here, using `width` and `height`
  }

  self.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    return self;
  };

  self.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    return self;
  };

  return self;
}

// Global module
var HiCView = (function ($) {
    var self = {};

    var canvas,
        Reds = d3.scale.log()
            .domain([1, 2000.0])
            .range(["white", "red"]),

        config = {
           colormap: Reds
        };


    function init() {
        canvas = document.createElement("canvas");

        $('#fileloader').on('change', function (e) {
            var file = e.target.files[0];
            NumpyLoader.open(file, function(ndarray) {
                render(ndarray);
            });
        });

        return self;
    };

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

    function render(matrix) {
        var data = matrix.data,
            lenX = matrix.shape[0],
            lenY = matrix.shape[1];
        // paint the matrix onto the canvas context
        paintMatrix(canvas, lenX, lenY, data, self.config().colormap)

        // encode the canvas context and embed it in img tag
        $img = $('.heatmap');
        $img.attr("src", canvas.toDataURL("image/png"));

        $widget = $('.hicview');

        // resize the bounding window
        // var side = $heatmap.attr("width");
        // var offset = side/Math.sqrt(2) - side/2.0;
        // $widget.css("width", side*Math.sqrt(2));
        // $widget.css("height", side/Math.sqrt(2));
        $widget.css("visibility", "visible");

        // apply panzoom
        (function() {
            $buttons = $('.panzoom-buttons')
            $widget.find('.panzoom').panzoom({
                $zoomIn: $buttons.find(".zoom-in"),
                $zoomOut: $buttons.find(".zoom-out"),
                $zoomRange: $buttons.find(".zoom-range"),
                $reset: $buttons.find(".reset"),
                // more options here
                maxScale: 10
                //startTransform: 'translate(145px, -350px)'
            });
        })();
    };

    // File Select button
    function handleFileSelect(evt) {
      var file = evt.target.files[0];
      var reader = new FileReader();
      reader.onload = function() {
          // read file contents as array buffer
          var buf = reader.result;
          var matrix = NumpyLoader.load(buf);
          render(matrix);
      };
      reader.readAsArrayBuffer(file);
    };

    self.version = "0.2.0";
    self.init = init;
    self.render = render;
    self.config = function(options){
            if (!arguments.length) return config;
            $.extend(options, config);
    }

    return init();
})( jQuery );
 

// Client-side parser for .npy files
var NumpyLoader = (function () {
    function bytes2ascii(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    function readUint16LE(buffer) {
        var view = new DataView(buffer);
        var val = view.getUint8(0);
        val |= view.getUint8(1) << 8;
        return val;
    }

    function fromFileBuffer(buf) {
      var magic = bytes2ascii(buf.slice(0,6));
      if (magic.slice(1,6) != 'NUMPY') {
          throw new Error('unknown file type');
      }

      var version = new Uint8Array(buf.slice(6,8)),
          headerLength = readUint16LE(buf.slice(8,10)),
          s = bytes2ascii(buf.slice(10, 10+headerLength)),
          data = buf.slice(10+headerLength);

      // Hacky conversion of dict literal string to JS Object
      eval("var info = " + s.toLowerCase().replace('(','[').replace('),',']'));

      if (info.descr === "|u1") {
          data = new Uint8Array(data);
      } else if (info.descr === "|i1") {
          data = new Int8Array(data);
      } else if (info.descr === "<u2") {
          data = new Uint16Array(data);
      } else if (info.descr === "<i2") {
          data = new Int16Array(data);
      } else if (info.descr === "<u4") {
          data = new Uint32Array(data);
      } else if (info.descr === "<i4") {
          data = new Int32Array(data);
      } else if (info.descr === "<f4") {
          data = new Float32Array(data);
      } else if (info.descr === "<f8") {
          data = new Float64Array(data);
      } else {
          throw new Error('unknown numeric dtype')
      }

      return {
          shape: info.shape,
          fortran_order: info.fortran_order,
          data: data
      };
    }

    function ajax(url, onload) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
            var buf = xhr.response; // not responseText
            var ndarray = fromFileBuffer(buf);
            onload(ndarray);
        };
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
    }

    return {
        load: fromFileBuffer,
        ajax: ajax
    };
})();
 









// // wipe canvas and redraw image on transformed canvas
// function redraw(ctx, imageObj){
//   ctx.save();
//   ctx.setTransform(1,0,0,1,0,0);
//   ctx.clearRect(0,0, canvas.width, canvas.height);
//   ctx.restore();
//   ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
// }







// // old school
// var xhr = new XMLHttpRequest();
// xhr.onreadystatechange = function() {
//   if (xhr.readyState==4 && xhr.status==200) {
//     buf = xhr.responseText;
//   }
// };
// xhr.open("GET", "ajax_info.txt", true);
// xhr.overrideMimeType("text/plain; charset=x-user-defined"); // retrieve data unprocessed as a binary string
// xhr.send();

// function endianness () {
//   var b = new ArrayBuffer(4);
//   var a = new Uint32Array(b);
//   var c = new Uint8Array(b);
//   a[0] = 0xdeadbeef;
//   if (c[0] == 0xef) return 'LE';
//   if (c[0] == 0xde) return 'BE';
//   throw new Error('unknown endianness');
// }
