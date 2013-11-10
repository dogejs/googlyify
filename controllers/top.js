var mongoose = require("mongoose");
var _ = require("lodash");

var Gif = mongoose.model("Gif");

module.exports = function (req, res, next) {
  Gif.find({likes: {"$gt": 0}, created_at: {"$gt": new Date(Date.now()-24*60*60*1000)}})
  .sort({likes: -1})
  .limit(20)
  .find(function (err, results) {
    if (err) console.error(err);
    
    if (results.length < 10) {
      Gif.find()
      .sort({likes: -1})
      .limit(20)
      .find(function (err, results) {
        if (err) console.error(err);
        res.send(results);
      });
    } else {
      results = _.map(results, function (item) {
        item = item.toObject();
        var timesince = (Date.now()-item.created_at.getTime())/1000/60/60;
        item.likesPerHour = (item.likes+1) / (timesince + 2);
        item.frames = null;
        delete item.frames;
        return item;
      });
    
      results = _.sortBy(results, function (item) {
        return -item.likesPerHour;
      });
      
      console.log(results);
      res.send(results);
    }
  });
}
