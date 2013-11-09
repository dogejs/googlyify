var editor = {
  canvasReady: new ko.observable(false),
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
    var frame = {
      x: editor.currentFrame().x()*editor.width(),
      y: editor.currentFrame().y()*editor.height(),
      size: editor.currentFrame().size()*editor.width(),
      gap: editor.currentFrame().gap() * editor.currentFrame().size() * editor.width(),
      rx: editor.currentFrame().rx(),
      ry: editor.currentFrame().ry(),
      rz: editor.currentFrame().rz()
    }
  } else {
    return;
  }
  
  var f = editor.currentFrame();
  if (!editor.canvasReady()) return;
  ctx.clearRect(0, 0, editor.width(), editor.height());
  
  //ctx.drawImage(editor.currentFrame().img, 0, 0, editor.width(), editor.height());
  if (!editor.currentFrame().visible()) return;
  
  opts = {
    //fillStyle: "rgba(255, 255, 255, 0.5)",
    //strokeStyle: "rgba(255, 255, 255, 0.8)"
    fillStyle: "#fff",
    strokeStyle: "none"
  };
  googly.drawEyes(ctx, frame, opts);
  opts = {
    fillStyle: "#000",
    strokeStyle: "none",
    size: frame.size*0.4
  };
  googly.drawEyes(ctx, frame, opts);
});


// events
editor.selectFrame = function (frame) {
  editor.currentFrameId(frame.id());
}

editor.makeKeyframe = function () {
  editor.currentFrame().keyframe = true;
}

editor.addEyes = function (context, event) {
  event.originalEvent.preventDefault();
  if (editor.currentFrame()) {
    if (!editor.currentFrame().visible()) {
      editor.currentFrame().visible(true);
      if (editor.currentFrameId() > 0) {
        var prev = editor.frames()[editor.currentFrameId()-1];
        if (prev.visible()) {
          editor.currentFrame().x(prev.x());
          editor.currentFrame().y(prev.y());
          editor.currentFrame().size(prev.size());
          editor.currentFrame().gap(prev.gap());
          editor.currentFrame().rx(prev.rx());
          editor.currentFrame().ry(prev.ry());
          editor.currentFrame().rz(prev.rz());
          return false;
        }
      }
    }
    editor.currentFrame().x(event.offsetX/editor.width());
    editor.currentFrame().y(event.offsetY/editor.height());
  }
  return false;
}

editor.save = function () {
  var outputFrames = []
  ko.utils.arrayForEach(editor.frames(), function (frame) {
    outputFrames.push({
      x: frame.x(),
      y: frame.y(),
      size: frame.size(),
      gap: frame.gap(),
      rx: frame.rx(),
      ry: frame.ry(),
      rz: frame.rz(),
      keyframe: frame.keyframe(),
      visible: frame.visible()
    });
  });
  var gif = {};
  gif.frames = outputFrames;
  $.post("/save/"+_id+"/"+_key+".json", gif, function (data) {
    console.log(data);
  }, "json");
  console.log(JSON.stringify(gif, null, 2));
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
  
  canvas = $(".editor-canvas");
  canvas.css({width:w, height:h});
  canvas.attr({width:w, height:h});
  canvas[0].onselectstart = function () { return false; } // prevent highlight on double click
  
  var startX = 0;
  var startY = 0;
  var startMouseX = 0;
  var startMouseY = 0;
  canvas.mousedown(function (event) {
    event.preventDefault();
    startMouseX = event.pageX - canvas.offset().left;
    startMouseY = event.pageY - canvas.offset().top;
    startX = editor.currentFrame().x()*editor.width();
    startY = editor.currentFrame().y()*editor.height();
    $(window).bind("mousemove", function (event) {
      event.preventDefault();
      var _x = startX + (event.pageX - canvas.offset().left - startMouseX);
      var _y = startY + (event.pageY - canvas.offset().top - startMouseY);
      editor.currentFrame().x(_x/editor.width());
      editor.currentFrame().y(_y/editor.height());
      return false;
    });
    return false;
  });
  canvas.mouseup(function () {
    $(window).unbind("mousemove");
  });
  
  ctx = canvas[0].getContext("2d");
  editor.canvasReady(true);
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
  if (editor.currentFrameId() >= editor.frames().length-1) {
    editor.currentFrameId(0);
  } else {
    editor.currentFrameId(editor.currentFrameId()+1);
  }
});

key("backspace", function (event) {
  if (editor.currentFrame() && editor.currentFrame().visible()) {
    editor.currentFrame().visible(false);
    event.preventDefault();
    return false;
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