var mongoose = require("mongoose");
var ShortId = require("mongoose-shortid");
var fs = require("fs");
var request = require("request");
var async = require("async");
var gm = require("gm");
var exec = require("child_process").exec;
var _ = require("lodash");
var knox = require("knox");
var EventEmitter = require("events").EventEmitter;

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
  var ev = new EventEmitter();
  ev.on("error", function (err) { return true;});
  var end = function (err, data) {
    ev.removeAllListeners();
    next(err, data);
  }
  SG = mongoose.model("SourceGif");
  SG.findOne({url: url, frames: {"$exists": true}}, function (err, gif) {
    if (err) return end(err);
    if (gif) {
      end(null, gif);
    } else {
      gif = new SG({url: url});
      gif.save(function (err) {
        if (err) return end(err);
        
        var dir = __dirname.replace("/models", "") + "/public/uploads";
        var path = dir + "/" + gif._id;
        fs.mkdir(path, function (err) {
          if (err) return end(err);
          
          gif.path = path + "/source.gif";
          
          ev.emit("status", {message: "Fetching "+url+"..."});
          request(url)
          .on("error", function (err) {
            //console.error(err);
            ev.emit("error", err);
            SG.remove({_id: gif._id}, function (_err) {
              end(err);
            });
            return true;
          })
          .on("response", function (data) {
            if (data.statusCode >= 400) {
              ev.emit("err", {message: "Nope. "+data.statusCode});
              var err = new Error("Bad HTTP response code ("+data.statusCode+")");
              this.emit("error", err);
              SG.remove({_id: gif._id}, function (_err) {
                end(err);
              });
            }
          })
          .pipe(fs.createWriteStream(gif.path))
          .on("close", function (err, data) {
            if (err) return end(err);
            //console.log("data", data);
            
            ev.emit("status", {message: "Download complete."});
            // do stuff with gif
            gm(gif.path).identify(function (err, data) {
              if (err) return end(err);
              
              gif.width = data.size.width;
              gif.height = data.size.height;
              gif.delay = data.Delay;
              
              var frameCount = "unknown";
              try {
                str = String(data.Scene).replace(/^(.*) ([\d]+)$/, "$2");
                if (parseInt(str) > 1) {
                  frameCount = parseInt(str);
                }
              } catch (ex) {
                frameCount = "unknown";
              }
              cnt = frameCount > 0 ? frameCount : 0;
              ev.emit("status", {message: "GIF identified. "+frameCount+" frames @ "+gif.width+"x"+gif.height, tag: "count", info: {totalFrames: cnt}});
              exec("gm convert "+gif.path+" -coalesce +adjoin "+path+"/frame-%03d.jpg", function (err, data) {
                if (err) return end(err);
                fs.readdir(path, function (err, files) {
                  gif.frames = gif.frames || [];
                  
                  _.each(files, function (file) {
                    if (file.substring(file.length-4) == ".jpg") {
                      gif.frames.push(gif._id+"/"+file);
                    }
                  });
                  
                  frameCount = gif.frames.length;
                  ev.emit("status", {message: "GIF identified. "+frameCount+" frames @ "+gif.width+"x"+gif.height, tag: "count", info: {totalFrames: frameCount}});
                  
                  var uploadCount = 0;
                  async.eachSeries(gif.frames, function (frame, done) {
                    s3.putFile(dir+"/"+frame, frame, {"x-amz-acl": "public-read"}, function (err, res) {
                      uploadCount++;
                      ev.emit("status", {message: "Cached image "+uploadCount+" of "+frameCount, tag: "cache", info: {cachedFrames: uploadCount}});
                      if (err) return done(err);
                      res.resume();
                      res.on("end", function () {
                        fs.rmdir(path, function (err) {
                          done();
                        });
                      });
                    });
                  }, function (err) {
                    ev.emit("status", {message: "Complete!"});
                    gif.save(function (err) {
                      if (err) return end(err);
                      end(null, gif);
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
  return ev;
};

mongoose.model("SourceGif", SourceGif);
