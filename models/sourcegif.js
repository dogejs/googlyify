var mongoose = require("mongoose");
var ShortId = require("mongoose-shortid");
var fs = require("fs");
var request = require("request");

var SourceGif = new mongoose.Schema({
  _id: {
    type: ShortId,
    len: 9,
    retries: 10
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  width: Number,
  height: Number,
  frames: [{
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
});

SourceGif.statics.getOrCreate = function (url, next) {
  SG = mongoose.model("SourceGif");
  SG.findOne({url: url}, function (err, gif) {
    if (err) return next(err);
    if (gif) {
      next(null, gif);
    } else {
      gif = new SG({url: url});
      console.log(gif);
      gif.save(function (err) {
        if (err) return next(err);
        fs.mkdir("cache/"+gif._id, function (err) {
          if (err) return next(err);
          request(url)
          .pipe(fs.createWriteStream("cache/"+gif._id+"/source.gif"))
          .on("close", function (err) {
            if (err) return next(err);
        
            // do stuff with gif
        
            next(null, gif);
          });
        });
      });
    }
  });
};

mongoose.model("SourceGif", SourceGif);
