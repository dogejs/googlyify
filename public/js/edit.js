var editor = {
  frames: new ko.observableArray([]),
  currentFrameId: new ko.observable(0),
  width: new ko.observable(1),
  height: new ko.observable(1),
  srcWidth: new ko.observable(1),
  srcHeight: new ko.observable(1)
};

editor.currentFrame = ko.dependentObservable(function () {
  return editor.frames().length > 0 ? editor.frames()[editor.currentFrameId()] : null;
});

editor.img = new ko.computed(function () {
  return editor.currentFrame() ? editor.currentFrame().url() : "";
});

var canvas, ctx; // set up on dom ready below

editor.render = new ko.computed(function () {
  if (editor.currentFrame()) {
    var x = editor.currentFrame().x()*editor.width();
    var y = editor.currentFrame().y()*editor.height();
    var r = editor.currentFrame().size()*editor.width();
    var gap = editor.currentFrame().gap()*r;
    var rx = editor.currentFrame().rx();
    var ry = editor.currentFrame().ry();
    var rz = editor.currentFrame().rz();
  }
  console.log("render "+(editor.currentFrame() ? editor.currentFrame().x() : "x"));
  if (!editor.currentFrame()) return;
  var f = editor.currentFrame();
  if (!canvas || !ctx) return console.log("no canvas");;
  ctx.clearRect(0, 0, editor.width(), editor.height());
  
  //ctx.drawImage(editor.currentFrame().img, 0, 0, editor.width(), editor.height());
  if (!editor.currentFrame().visible()) return console.log("invisible!");
  
  
  ctx.fillStyle = "#fff";
  
  var addCirclePoints = function (pts, cx, cy, rad, steps) {
    if (steps > 2) {
      for (i=0; i<360; i+=360/steps) {
        var ang = i/180*Math.PI;
        pts.push({x: cx+Math.cos(ang)*rad, y: cy+Math.sin(ang)*rad, z: rad});
      }
    }
  }
  
  var points = [];
  
  addCirclePoints(points, gap, 0, r, 16);
  addCirclePoints(points, -gap, 0, r, 16);
  
  points = _.map(points, function (point) {
    var _a = Math.atan2(point.y, point.x) + rz/180*Math.PI;
    var _r = Math.sqrt(Math.pow(point.x,2) + Math.pow(point.y,2));
    var _x = Math.cos(_a)*_r;
    var _y = Math.sin(_a)*_r;
    var _z = point.z;
    return {x:_x, y:_y, z:_z};
  });
  
  points = _.map(points, function (point) {
    var _a = Math.atan2(point.z, point.x) + ry/180*Math.PI;
    var _r = Math.sqrt(Math.pow(point.x,2) + Math.pow(point.z,2));
    var _x = Math.cos(_a)*_r;
    var _y = point.y;
    var _z = Math.sin(_a)*_r;
    return {x:_x, y:_y, z:_z};
  });
  
  var cx = x;
  var cy = y;
  
  points = _.map(points, function (point) {
    return {x:cx+point.x, y:cy+point.y};
  });
  
  eye1 = points.splice(0, points.length/2);
  eye2 = points;
  
  ctx.beginPath();
  ctx.moveTo(eye1[0].x, eye1[0].y);
  _.each(eye1, function (point) {
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(eye2[0].x, eye2[0].y);
  _.each(eye2, function (point) {
    ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  //ctx.fillRect(0, 0, 100, 100);
});


// events
editor.selectFrame = function (frame) {
  editor.currentFrameId(frame.id);
}

editor.makeKeyframe = function () {
  editor.currentFrame().keyframe = true;
}

editor.addEyes = function (context, event) {
  event.originalEvent.preventDefault();
  if (editor.currentFrame()) {
    if (!editor.currentFrame().visible()) {
      console.log("make visible");
      editor.currentFrame().visible(true);
    }
    console.log("Setting new x and y");
    editor.currentFrame().x(event.offsetX/editor.width());
    editor.currentFrame().y(event.offsetY/editor.height());
  }
  return false;
}

var Frame = function (f) {
  this.keyframe = ko.observable(f.keyframe);
  this.visible = ko.observable(f.visible);
  this.x = ko.observable(f.x);
  this.y = ko.observable(f.y);
  this.size = ko.observable(f.size);
  this.gap = ko.observable(f.gap);
  this.rx = ko.observable(f.rx);
  this.ry = ko.observable(f.ry);
  this.rz = ko.observable(f.rz);
  this.id = ko.observable(f.id);
  var self = this;
  this.selected = ko.computed(function () {
    return editor.currentFrameId() == self.id();
  });
  
  var url = "http://googlyify.s3.amazonaws.com/" + f.path;
  this.url = ko.observable(url);
  this.img = new Image();
  this.img.src = url;
}

var frames = [];
function setupGif (gif) {
  
  var cnt = 0;
  
  var mapped = ko.observableArray(ko.utils.arrayMap(gif.frames, function(f) {
    f.id = cnt;
    cnt++;
    return new Frame(f);
  }));
  ko.utils.arrayForEach(mapped(), function (f) {
    editor.frames.push(f);
  });
  
  var w = gif.width;
  var h = gif.height;
  var maxWidth = 640;
  var maxHeight = 480;
  var aspect = maxWidth/maxHeight;
  if (w/h > maxWidth/maxHeight) {
    h *= maxWidth/w;
    w = maxWidth;
  } else {
    w *= maxHeight/h;
    h = maxHeight;
  }
  
  editor.srcWidth(gif.width);
  editor.srcHeight(gif.height);
  editor.width(Math.round(w));
  editor.height(Math.round(h));
  
  console.log("Setting up canvas");
  canvas = $(".editor-canvas");
  canvas.css({width:w, height:h});
  canvas.attr({width:w, height:h});
  canvas[0].onselectstart = function () { return false; } // prevent highlight on double click
  
  canvas.mousedown(function (event) {
    canvas.bind("mousemove", function (event) {
      editor.currentFrame().x(event.offsetX/editor.width());
      editor.currentFrame().y(event.offsetY/editor.height());
    });
  });
  canvas.mouseup(function () {
    canvas.unbind("mousemove");
  });
  
  ctx = canvas[0].getContext("2d");
  ko.applyBindings(editor, $("#editor")[0]);
}

key("left", function () {
  if (editor.currentFrameId() == 0) {
    editor.currentFrameId(editor.frames().length-1);
  } else {
    editor.currentFrameId(editor.currentFrameId()-1);
  }
});

key("right", function () {
  if (editor.currentFrameId() >= editor.frames().length-2) {
    editor.currentFrameId(0);
  } else {
    editor.currentFrameId(editor.currentFrameId()+1);
  }
});



function drawEllipseByCenter(ctx, cx, cy, w, h) {
  drawEllipse(ctx, cx - w/2.0, cy - h/2.0, w, h);
}

function drawEllipse(ctx, x, y, w, h) {
  var kappa = .5522848,
      ox = (w / 2) * kappa, // control point offset horizontal
      oy = (h / 2) * kappa, // control point offset vertical
      xe = x + w,           // x-end
      ye = y + h,           // y-end
      xm = x + w / 2,       // x-middle
      ym = y + h / 2;       // y-middle

  ctx.beginPath();
  ctx.moveTo(x, ym);
  ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
  ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
  ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
  ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
  ctx.closePath();
  ctx.fill();
}