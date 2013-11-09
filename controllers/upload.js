var mongoose = require("mongoose");

var SourceGif = mongoose.model("SourceGif");

module.exports = function (req, res) {
  var url = req.query.url;
  
  if (url.toLowerCase().substring(url.length-4) != ".gif") {
    return res.render(500);
  }
  SourceGif.getOrCreate(url, function (err, gif) {
    if (err) return res.render(500);
    res.send({gif: gif});
  });
}