var mongoose = require("mongoose");
var ShortId = require("mongoose-shortid");
var _ = require("lodash");
var crypto = require("crypto");

var Gif = new mongoose.Schema({
  _id: {
    type: ShortId,
    len: 9,
    retries: 10
  },
  key: String,
  url: {
    type: String,
    required: true
  },
  width: Number,
  height: Number,
  delay: Number,
  frames: [{
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
});

Gif.statics.fromSource = function (src, next) {
  var G = mongoose.model("Gif");
  
  var frames = [];
  _.each(src.frames, function (frame) {
    frames.push({
      path: frame,
      visible: false,
      keyframe: false,
      x: 0,
      y: 0,
      eye1x: 0,
      eye1y: 0,
      eye2x: 0,
      eye2y: 0,
      size: 0.06, // radius as fraction of src width
      gap: 1, // multiple of size between eye1.cx & eye2.cx
      rx: 0,
      ry: 0,
      rz: 0
    });
  });
  
  var gif = new G({
    url: src.url,
    frames: frames,
    width: src.width,
    height: src.height,
    delay: src.delay,
    key: crypto.createHash("md5").update(Math.random().toString()).digest("hex").substring(0, 10)
  });
  
  gif.save(function (err) {
    next(err, gif);
  });
};

mongoose.model("Gif", Gif);
