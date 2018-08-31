 var canvas = document.getElementById('src'),
    context = canvas.getContext('2d'),
	files,        // file list
	fileIndex,   // current processing number of files
    image = new Image(),
    draw = {},    // canvas using area
    sele = {},    // canvas selectied area
    drag = {},    // drag start point
    isDragging,
    isMoving = false,
    isResizing = false;

var offcanvas = document.createElement('canvas');    // canvas -> photo tmp
offcanvas.width = 250 * 1.2;    // output pixel
offcanvas.height = 300 * 1.2;

var ASPECT = offcanvas.height / offcanvas.width;    // height / width

/*
*******************************************************************************
    canvas edit
*******************************************************************************
*/
function getMousePos(e) {
        var rect = canvas.getBoundingClientRect();
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
}

canvas.onmousedown = function(e) {
    var loc = getMousePos(e);
    if (canvas.style.cursor == 'se-resize') {
        isResizing = true;
    } else if (canvas.style.cursor == 'move') {
        isMoving = true;
        drag = { dx: sele.x - loc.x, dy: sele.y - loc.y };
    } else {
        sele = { x: loc.x, y: loc.y, w: 0, h: 0 };
        isResizing = true;       
    }
    e.preventDefault();
};

canvas.onmouseup = function(e) {
    pasteImage();
    isResizing = false;
    isMoving = false;
    e.preventDefault();
};

canvas.onmousemove = function(e) {
    document.getElementById('x').innerHTML = e.clientX;
    document.getElementById('y').innerHTML = e.clientY;
    var loc = getMousePos(e);
    if (isResizing) {
        resizing(e);
    } else if (isMoving) {
        moving(e);
    } else {
        if (context.isPointInPath(loc.x, loc.y)) {
            canvas.style.cursor = 'se-resize';
        } else if (loc.x > sele.x && loc.x < sele.x + sele.w &&
                   loc.y > sele.y && loc.y < sele.y + sele.h) {
            canvas.style.cursor = 'move';
        } else {
        canvas.style.cursor = 'default';
        }
    }
};

// Initialize canvas
function initCanvas() {
	context.clearRect( 0, 0, canvas.width, canvas.height ); 
    var sw,    // selected area witdh
        sh;    // selected area height
    if (image.width / canvas.width  > image.height / canvas.height) {
        // landscape
        draw = { w: canvas.width, h: image.height * canvas.width / image.width};
    } else {
        // portrait
        draw = { w: image.width * canvas.height / image.height, h: canvas.height};
    }
    context.drawImage(image, 0, 0, draw.w, draw.h);
    
    // set selected area
    if (image.height / image.width > ASPECT) {
        sw = draw.w - 10;
        sh = sw * ASPECT;
    } else {
        sh = draw.h - 10;
        sw = sh / ASPECT;
    }
    sele = { x: (draw.w - sw) / 2, y: (draw.h - sh) / 2, w: sw, h: sh };
    drawSelectedArea();
}

function resizing(e) {
    var loc = getMousePos(e);
    var dx = loc.x - (sele.x + sele.w);
    var dy = dx * 300 / 250;
    var w = sele.w + dx * 2;
    var h = w * 300 / 250;    // from aspect
    var log = document.getElementById('log');
    if (sele.x - dx > 0 && sele.y - dy > 0 && loc.x > sele.x && loc.y > sele.y && loc.x < draw.w && sele.y + h < draw.h) {
        sele.x = sele.x - dx;
        sele.y = sele.y - dy;
        sele.w = w;
        sele.h = h;
        drawSelectedArea();
    }
}

function moving(e) {
    var loc = getMousePos(e);
    var x = e.clientX + drag.dx;
    var y = loc.y + drag.dy;
    if (x > 0 && x + sele.w < draw.w && y > 0 && y + sele.h < draw.h) {
        sele.x = x;
        sele.y = y;
        context.drawImage(image, 0, 0, draw.w, draw.h);
        context.strokeRect(sele.x, sele.y, sele.w, sele.h);
        drawSelectedArea();
    }
}

// paste canvas image -> photo area
function pasteImage() {
    var ctx = offcanvas.getContext('2d');
    ctx.drawImage(image, getIx(sele.x), getIy(sele.y), getIx(sele.w), getIy(sele.h), 0, 0, 300, 360);
    var photo = document.getElementById('photo');
    //photo.src = offcanvas.toDataURL('image/jpeg', 1.0);
    //photo.setAttribute('crossOrigin','anonymous');
    
    offcanvas.toBlob(function(blob) {
        url = URL.createObjectURL(blob);
        photo.src=url;
    }, 'image/jpeg', 1.0);
}

function drawSelectedArea() {
    context.drawImage(image, 0, 0, draw.w, draw.h);
    context.strokeStyle = 'yellow';
    context.strokeRect(sele.x, sele.y, sele.w, sele.h);
    context.beginPath();
    context.rect(sele.x + sele.w - 10, sele.y + sele.h - 10, 10, 10);
    context.fillStyle = 'yellow';
    context.fill();
}

function getIx(x) {
    return x * image.width / draw.w;
}

function getIy(y) {
    return y * image.height / draw.h;
}

/*
*******************************************************************************
    File Select | Drag & Drop -> read photo file
*******************************************************************************
*/
// ファイル選択ダイアログ
function handleFileSelect(evt) {
    files = evt.target.files; // get FileList object
	fileIndex = 0;
    init();
	handlePicture();
}
document.getElementById('files').addEventListener('change', handleFileSelect, false);

// Drag & Drop holder
var holder = document.getElementById('holder');
// ブラウザがAPIをサポートしているか
if (typeof window.FileReader === 'undefined') {
    holder.className = 'fail';
} else {
    holder.className = 'success';
}
// ドラッグ中に holder の上にマウスが来たとき
holder.ondragover = function(){
    this.className = 'hover'; 
	return false; 
};
// ドラッグが終わったとき
holder.ondragend = function (){
    this.className = '';
	return false;
};
// ドロップされたとき
holder.ondrop = function (e) {
    e.preventDefault();
	this.className = '';
	files = e.dataTransfer.files;
	fileIndex = 0;
	init();
	handlePicture();
};

// 画像の読み込みと表示
function handlePicture () {
	document.getElementById('fileIndex').innerHTML = fileIndex + 1 + '/' + files.length;
	document.getElementById('filename').innerHTML = files[ fileIndex ].name;
	var reader = new FileReader();		
	reader.onload = function (event) {
        /* 画像が読み込まれるのを待ってから処理を続行 */
        context.clearRect(0, 0, canvas.width, canvas.height);
        image.src = event.target.result;
        image.onload = function() {
            initCanvas();
			pasteImage();
		}
    }
    // ファイルを読み込む（読み込みが完了したら onload が実行される）
    reader.readAsDataURL(files[ fileIndex ]);
    return false;
}
/*
*******************************************************************************
    Nextボタンがクリックされたとき
*******************************************************************************
*/
nextBtn.onclick = function (e) {
	if ( files ) {
        offcanvas.toBlob(function(blob) {
          saveAs(blob, files[ fileIndex ].name);
        }, 'image/jpeg', 1.0);
		
		var thmb = document.getElementById('photo');
        var clone = thmb.cloneNode(true);
        var base = document.getElementById('thumbnail')
		var a = base.appendChild(clone);
		a.className = 'thumb';

	    if ( fileIndex < files.length - 1 ) {
		    fileIndex ++;
	        handlePicture ();
	    }
    }
}
/*
*******************************************************************************
    Initialize
*******************************************************************************
*/
function init() {
	initCanvas();
	
	// clear thumbnail picture
	var thumb = document.getElementById('thumbnail')
	while (thumb.hasChildNodes()) {   
      thumb.removeChild(thumb.firstChild);
	}
} 
/*
*******************************************************************************
    Polyfill
*******************************************************************************
*/
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
if (!HTMLCanvasElement.prototype.toBlob) {
 Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: function (callback, type, quality) {

    var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
        len = binStr.length,
        arr = new Uint8Array(len);

    for (var i=0; i<len; i++ ) {
     arr[i] = binStr.charCodeAt(i);
    }
    callback( new Blob( [arr], {type: type || 'image/png'} ) );
  }
 });
}
 
/*
image.src = 'http://jsrun.it/assets/U/4/a/U/U4aU6.jpg';
image.onload = function() {
    init();
};
*/
