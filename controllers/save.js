var mongoose = require("mongoose");
var _ = require("lodash");

var Gif = mongoose.model("Gif");

module.exports = function (req, res) {
  var id = req.params.id;
  var key = req.params.key;
  
  Gif.findOne({_id: id, key: key}, function (err, gif) {
    if (err) return res.render(500);
    if (!gif) return res.render(404);
    
    if (!req.body.frames) return res.render(500);
    
    var props = ["x", "y", "keyframe", "visible", "size", "gap", "rx", "ry", "rz"];
    var floats = ["x", "y", "size", "gap", "rx", "ry", "rz"];
    var booleans = ["keyframe", "visible"];
    var oldFrames = []; // clear gif.frames and use .push() to repopulate and trigger mongoose save
    _.each(gif.frames, function (frame) { oldFrames.push(frame); });
    gif.frames = [];
    _.each(oldFrames, function (frame, k) {
      if (req.body.frames[k]) {
        inputFrame = req.body.frames[k];
        _.each(props, function (prop) {
          if (typeof inputFrame[prop] != "undefined") {
            if (floats.indexOf(prop) != -1) {
              inputFrame[prop] = parseFloat(inputFrame[prop]);
            }
            if (booleans.indexOf(prop) != -1) {
              inputFrame[prop] = inputFrame[prop] == true || inputFrame[prop] == "true" ? true : false;
            }
            oldFrames[k][prop] = inputFrame[prop];
          }
        });
        gif.frames.push(oldFrames[k]);
      }
    });
    gif.save(function (err) {
      if (req.params.format == "json") {
        res.send({message: "success"});
      } else {
        res.redirect("/edit/"+id+"/"+key);
      }
    });
  });
}