var mongoose = require("mongoose");
var _ = require("lodash");

var Gif = mongoose.model("Gif");

module.exports = function (req, res, next) {
  var recent = true;
  var _sort;
  var where = {};
  if (req.params.sort == "views") {
    _sort = {views: -1};
    where.views = {"$gt": 1};
  } else
  if (req.params.sort == "likes") {
    _sort = {likes: -1};
    where.likes = {"$gt": 0};
  } else {
    return next();
  }
  if (req.query.recent) {
    where.created_at = {"$gt": new Date(Date.now()-24*60*60*1000)};
  }
  
  Gif.find(where)
  .sort(_sort)
  .limit(20)
  .find(function (err, results) {
    if (err) console.error(err);
    results = _.map(results, function (result) {
      result.frames = null;
      delete result.frames;
      return result;
    });
    res.send(results);
  });
}
