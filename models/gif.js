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
      x2: 0,
      y2: 0,
      r: src.width*0.06,
      gap: 1, // multiple of radius between eye1.cx & eye2.cx
      rx: 0,
      ry: 0,
      rz: 0
    });
  });
  
  var gif = new G({
    url: src.url,
    frames: frames,
    key: crypto.createHash("md5").digest("hex").substring(0, 10)
  });
  
  gif.save(function (err) {
    next(err, gif);
  });
};

mongoose.model("Gif", Gif);
