var mongoose = require("mongoose");

var Gif = mongoose.model("Gif");

module.exports = function (req, res, next) {
  var id = req.params.id;
  
  if (!id || id == "") {
    return next();
  }
  
  Gif.findOne({_id: id}, function (err, gif) {
    if (err) return res.render(500);
    if (!gif) return next();
    res.render("show", {gif: gif, _id: id});
  });
}