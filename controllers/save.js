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
    console.log(req.body);
    var oldFrames = [];
    _.each(gif.frames, function (frame) { oldFrames.push(frame); });
    gif.frames = [];
    _.each(oldFrames, function (frame, k) {
      if (req.body.frames[k]) {
        inputFrame = req.body.frames[k];
        _.each(props, function (prop) {
          if (typeof inputFrame[prop] != "undefined") {
            if (oldFrames[k][prop] != inputFrame[prop]) {
              console.log("Updating frame "+k+"["+prop+"] to "+inputFrame[prop]);
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