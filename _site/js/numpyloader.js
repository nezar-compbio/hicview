// Client-side parser for .npy files

function bytes2ascii(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function readUint16LE(buffer) {
  view = new DataView(buffer);
  var val = view.getUint8(0);
  val |= view.getUint8(1) << 8;
  return val;
}

function parseNumpyFileBuffer(buf) {
  var magic = bytes2ascii(buf.slice(0,6));
  if (magic.slice(1,6) != 'NUMPY') {
    throw new Error('unknown file type');
  }

  var version = new Uint8Array(buf.slice(6,8)),
      headerLength = readUint16LE(buf.slice(8,10)),
      s = bytes2ascii(buf.slice(10, 10+headerLength)),
      data = buf.slice(10+headerLength);

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

function ajaxLoadNumpyArray(url, onload) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function(e) {
    var buf = xhr.response; // not responseText
    var ndarray = parseNumpyFileBuffer(buf);
    onload(ndarray);
  };
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.send(null);
}



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


