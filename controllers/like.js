var mongoose = require("mongoose");

var Gif = mongoose.model("Gif");

var Like = {};

Like.like = function (req, res, next) {
  Like.go(true, req, res, next);
}
Like.unlike = function (req, res, next) {
  Like.go(false, req, res, next);
}

Like.go = function (liked, req, res, next) {
  var id = req.params.id;
  
  if (!id || id == "") {
    return next();
  }
  
  Gif.findOne({_id: id}, function (err, gif) {
    if (err) return res.render(500);
    if (!gif) return next();
    
    var update = {"$inc": {likes: (liked ? 1 : -1)}};
    Gif.update({_id: id}, update, function (err) {
      if (err) {
        res.send(err);
      } else {
        res.send({message: "success"});
      }
    });
  });
}

module.exports = Like;