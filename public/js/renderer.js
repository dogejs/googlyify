var renderer = {
  canvasReady: new ko.observable(false),
  frames: new ko.observableArray([]),
  currentFrameId: new ko.observable(0),
  width: new ko.observable(1),
  height: new ko.observable(1),
  srcWidth: new ko.observable(1),
  srcHeight: new ko.observable(1)
};

renderer.currentFrame = ko.dependentObservable(function () {
  return renderer.frames().length > 0 ? renderer.frames()[renderer.currentFrameId()] : null;
});

renderer.img = new ko.computed(function () {
  return renderer.currentFrame() ? renderer.currentFrame().url() : "";
});

renderer._render = new ko.computed(function () {
  var f = renderer.currentFrame();
  if (f) {
    renderer.render();
    var frame = {
      x: f.x()*renderer.width(),
      y: f.y()*renderer.height(),
      size: f.size()*renderer.width(),
      gap: f.gap() * f.size() * renderer.width(),
      rx: f.rx(),
      ry: f.ry(),
      rz: f.rz(),
      eye1x: f.eye1x(),
      eye1y: f.eye1y(),
      eye2x: f.eye2x(),
      eye2y: f.eye2y()
    }
  } else {
    return;
  }
  
  if (!renderer.canvasReady()) return;
  ctx.clearRect(0, 0, renderer.width(), renderer.height());
  
  //ctx.drawImage(f.img, 0, 0, renderer.width(), renderer.height());
  if (!f.visible()) return;
  
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
    size: frame.size*0.4,
    offset: true
  };
  googly.drawEyes(ctx, frame, opts);
});


renderer.selectFrame = function (frame) {
  renderer.currentFrameId(frame.id());
}

lastRender = -1;
renderer.render = function () {
  if (lastRender == renderer.currentFrameId()) { return; }
  var p = renderer.currentFrameId() > 0 ? renderer.frames()[renderer.currentFrameId()-1] : null;
  var f = renderer.currentFrame();
  if (f.visible()) {
    var previousPosition = null;
    var previousPupilPosition = null;
    if (p) {
      previousPosition = {
        x: p.x()*renderer.srcWidth(),
        y: p.y()*renderer.srcHeight()
      };
      previousPupilPosition = {
        x: p.eye1x(),
        y: p.eye1y()
      }
    }
    var currentPosition = {
      x: f.x()*renderer.srcWidth(),
      y: f.y()*renderer.srcHeight()
    };
    
    var newpos1 = world1.eye.render(previousPosition, currentPosition, previousPupilPosition);
    
    var previousPosition = null;
    var previousPupilPosition = null;
    if (p) {
      previousPosition = {
        x: p.x()*renderer.srcWidth(),
        y: p.y()*renderer.srcHeight()
      };
      previousPupilPosition = {
        x: p.eye2x(),
        y: p.eye2y()
      }
    }
    var currentPosition = {
      x: f.x()*renderer.srcWidth(),
      y: f.y()*renderer.srcHeight()
    };
        
    newpos2 = world2.eye.render(previousPosition, currentPosition, previousPupilPosition);
    
    world1.draw();
    world2.draw();
    
    if (!newpos1 || !newpos2) { return console.log("Render unsuccessful", newpos1, newpos2); }
    f.eye1x(newpos1.x);
    f.eye1y(newpos1.y);
    f.eye2x(newpos2.x);
    f.eye2y(newpos2.y);
  }
  lastRender = renderer.currentFrameId();
}

var Frame = function (f) {
  this.keyframe = ko.observable(f.keyframe);
  this.visible = ko.observable(f.visible);
  this.x = ko.observable(f.x);
  this.y = ko.observable(f.y);
  this.eye1x = ko.observable(f.eye1x || 0);
  this.eye1y = ko.observable(f.eye1y || 0);
  this.eye2x = ko.observable(f.eye2x || 0);
  this.eye2y = ko.observable(f.eye2y || 0);
  this.size = ko.observable(f.size);
  this.gap = ko.observable(f.gap);
  this.rx = ko.observable(f.rx);
  this.ry = ko.observable(f.ry);
  this.rz = ko.observable(f.rz);
  this.id = ko.observable(f.id);
  var self = this;
  this.selected = ko.computed(function () {
    return renderer.currentFrameId() == self.id();
  });
  
  var url = "http://googlyify.s3.amazonaws.com/" + f.path;
  this.url = ko.observable(url);
  this.img = new Image();
  this.img.src = url;
}


var world1, world2;


var canvas, ctx; // set up on dom ready below

function setupGif (gif) {
  
  world1 = new googly.World("preview1");
  world2 = new googly.World("preview2");
  
  var cnt = 0;
  
  var mapped = ko.observableArray(ko.utils.arrayMap(gif.frames, function(f) {
    f.id = cnt;
    cnt++;
    return new Frame(f);
  }));
  ko.utils.arrayForEach(mapped(), function (f) {
    renderer.frames.push(f);
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
  
  renderer.srcWidth(gif.width);
  renderer.srcHeight(gif.height);
  renderer.width(Math.round(w));
  renderer.height(Math.round(h));
  
  canvas = $(".renderer-canvas");
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
    startX = renderer.currentFrame().x()*renderer.width();
    startY = renderer.currentFrame().y()*renderer.height();
    $(window).bind("mousemove", function (event) {
      event.preventDefault();
      var _x = startX + (event.pageX - canvas.offset().left - startMouseX);
      var _y = startY + (event.pageY - canvas.offset().top - startMouseY);
      renderer.currentFrame().x(_x/renderer.width());
      renderer.currentFrame().y(_y/renderer.height());
      return false;
    });
    return false;
  });
  canvas.mouseup(function () {
    $(window).unbind("mousemove");
  });
  
  ctx = canvas[0].getContext("2d");
  renderer.canvasReady(true);
  ko.applyBindings(renderer, $("#renderer")[0]);
}