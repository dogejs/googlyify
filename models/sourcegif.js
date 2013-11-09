var mongoose = require("mongoose");
var ShortId = require("mongoose-shortid");
var fs = require("fs");
var request = require("request");
var gm = require("gm");
var exec = require("child_process").exec;
var _ = require("lodash");

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
  frames: [String],
  delay: Number,
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
          
          var dir = "cache/"+gif._id;
          gif.path = dir+"/source.gif";
          
          request(url)
          .pipe(fs.createWriteStream(gif.path))
          .on("close", function (err) {
            if (err) return next(err);
        
            // do stuff with gif
            gm(gif.path).identify(function (err, data) {
              if (err) return next(err);
              
              gif.width = data.size.width;
              gif.height = data.size.height;
              gif.delay = data.Delay;
              exec("gm convert "+gif.path+" +adjoin "+dir+"/frame-%03d.jpg", function (err, data) {
                if (err) return next(err);
                
                fs.readdir(dir, function (err, files) {
                  gif.frames = gif.frames || [];
                  _.each(files, function (file) {
                    if (file.substring(file.length-4) == ".jpg") {
                      gif.frames.push(file);
                    }
                  });
                  //gif.commit("frames");
                  gif.save(function (err) {
                    if (err) return next(err);
                    next(null, gif);
                  });
                });
              });
            });
          });
        });
      });
    }
  });
};

mongoose.model("SourceGif", SourceGif);
