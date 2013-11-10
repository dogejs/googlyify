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
    //gif.views = gif.views || 0;
    gif.views++;
    //gif.likes = gif.likes || 0;
    Gif.update({_id: id}, {"$inc": {views:1}}, function (err) {
      if (err) throw err;
      res.render("show", {gif: gif, _id: id});
    });
  });
}