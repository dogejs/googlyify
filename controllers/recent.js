var mongoose = require("mongoose");

var Gif = mongoose.model("Gif");

module.exports = function (req, res, next) {
  Gif.find({})
  .sort({created_at: -1})
  .limit(20)
  .find(function (err, gifs) {
    if (err) return res.render(500);
    if (!gifs) return next();
    
    if (req.params.format == "json") {
      res.send(gifs);
    } else {
      res.render("recent", {gifs: gifs});
    }
  });
}