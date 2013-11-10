var mongoose = require("mongoose");
var _ = require("lodash");

var Gif = mongoose.model("Gif");

module.exports = function (req, res) {
  var id = req.params.id;
  var key = req.params.key;
  
  Gif.findOne({_id: id, key: key}, function (err, gif) {
    if (err) return res.render(500);
    if (!gif) return res.render(404);
    res.render("renderer", {gif: gif, _id: id, _key: key});
  });
}