if (typeof require != "undefined") {
  _ = require("lodash");
}
var googly = function () {
  
}

googly.createCirclePoints = function (cx, cy, cz, rad, steps) {
  var i;
  var pts = [];
  if (steps > 2) {
    for (i=0; i<360; i+=360/steps) {
      var ang = i/180*Math.PI;
      pts.push({x: cx+Math.cos(ang)*rad, y: cy+Math.sin(ang)*rad, z: cz});
    }
  }
  return pts;
}

googly.drawEyes = function (ctx, frame, opts) {
  var objects = [];
  var points = [];
  var steps = 24;
  var defaultOpts = {
    strokeStyle: "none",
    fillStyle: "#fff",
    lineWidth: 4,
    size: frame.size
  };
  opts = _.extend(defaultOpts, opts);
  
  var cx = frame.x;
  var cy = frame.y;
  
  objects.push({points: googly.createCirclePoints(frame.gap, 0, frame.size, opts.size, steps)});
  objects.push({points: googly.createCirclePoints(-frame.gap, 0, frame.size, opts.size, steps)});
  
  _.each(objects, function (object) {
    // rotate about the z axis
    object.points = _.map(object.points, function (point) {
      var _a = Math.atan2(point.y, point.x) + frame.rz/180*Math.PI;
      var _r = Math.sqrt(Math.pow(point.x,2) + Math.pow(point.y,2));
      var _x = Math.cos(_a)*_r;
      var _y = Math.sin(_a)*_r;
      var _z = point.z;
      return {x:_x, y:_y, z:_z};
    });
    
    // rotate about the y axis
    object.points = _.map(object.points, function (point) {
      var _a = Math.atan2(point.z, point.x) + frame.ry/180*Math.PI;
      var _r = Math.sqrt(Math.pow(point.x,2) + Math.pow(point.z,2));
      var _x = Math.cos(_a)*_r;
      var _y = point.y;
      var _z = Math.sin(_a)*_r;
      return {x:_x, y:_y, z:_z};
    });
    
    // rotate about the x axis
    object.points = _.map(object.points, function (point) {
      var _a = Math.atan2(point.y, point.z) + frame.rx/180*Math.PI;
      var _r = Math.sqrt(Math.pow(point.z,2) + Math.pow(point.y,2));
      var _x = point.x;
      var _y = Math.sin(_a)*_r;
      var _z = Math.cos(_a)*_r;
      return {x:_x, y:_y, z:_z};
    });
    
    object.points = _.map(object.points, function (point) {
      return {x:cx+point.x, y:cy+point.y};
    });
    console.log(object.points);
    ctx.beginPath();
    ctx.moveTo(object.points[0].x, object.points[0].y);
    _.each(object.points, function (point) {
      ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    if (opts.fillStyle != "none") {
      ctx.fillStyle = opts.fillStyle;
      ctx.fill();
    }
    if (opts.strokeStyle != "none") {
      ctx.strokeStyle = opts.strokeStyle;
      ctx.lineWidth = opts.lineWidth;
      ctx.stroke();
    }
  });
}

if (typeof window != "undefined") {
  window.googly = googly;
}
if (typeof module != "undefined") {
  module.exports = googly;
}