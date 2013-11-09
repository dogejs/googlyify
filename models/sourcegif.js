var mongoose = require("mongoose");
var ShortId = require("mongoose-shortid");
var fs = require("fs");
var request = require("request");
var async = require("async");
var gm = require("gm");
var exec = require("child_process").exec;
var _ = require("lodash");
var knox = require("knox");

var s3 = knox.createClient({
  key: process.env.AMAZON_KEY,
  secret: process.env.AMAZON_SECRET,
  bucket: "googlyify"
});

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
  SG.findOne({url: url, frames: {"$exists": true}}, function (err, gif) {
    if (err) return next(err);
    if (gif) {
      next(null, gif);
    } else {
      gif = new SG({url: url});
      gif.save(function (err) {
        if (err) return next(err);
        
        var dir = "public/uploads";
        var path = dir + "/" + gif._id;
        
        fs.mkdir(path, function (err) {
          if (err) return next(err);
          
          gif.path = path + "/source.gif";
          
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
              exec("gm convert "+gif.path+" -coalesce +adjoin "+path+"/frame-%03d.jpg", function (err, data) {
                if (err) return next(err);
                
                fs.readdir(path, function (err, files) {
                  gif.frames = gif.frames || [];
                  _.each(files, function (file) {
                    if (file.substring(file.length-4) == ".jpg") {
                      gif.frames.push(gif._id+"/"+file);
                    }
                  });
                  async.eachSeries(gif.frames, function (frame, done) {
                    s3.putFile(dir+"/"+frame, frame, {"x-amz-acl": "public-read"}, function (err, res) {
                      if (err) return done(err);
                      res.resume();
                      res.on("end", function () {
                        fs.rmdir(path, function (err) {
                          done();
                        });
                      });
                    });
                  }, function (err) {
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
      });
    }
  });
};

mongoose.model("SourceGif", SourceGif);
