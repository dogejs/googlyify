var fs = require("fs");
var mongoose = require("mongoose");
var async = require("async");
var _ = require("lodash");
var request = require("request");
var knox = require("knox");
var Canvas = require("canvas");
var Image = Canvas.Image;
var googly = require("../public/js/googly"); // lol
var exec = require("child_process").exec;

var s3 = knox.createClient({
  key: process.env.AMAZON_KEY,
  secret: process.env.AMAZON_SECRET,
  bucket: "googlyify"
});

var Gif = mongoose.model("Gif");


module.exports = function (req, res) {
  var id = req.params.id;
  var key = req.params.key;
  
  Gif.findOne({_id: id, key: key}, function (err, gif) {
    if (err) return res.render(500);
    if (!gif) console.log("not found?", gif);
    if (!gif) return res.render(404);
    
    var dir = "public/uploads";
    var path = dir + "/" + gif._id;
    
    frames = _.clone(gif.frames);
    _.each(frames, function (frame, id) {
      frame.id = id;
      frame.previous = false;
      if (id > 0) {
        frame.previous = frames[id-1];
      }
    });
    
    var createCanvas = function (frame, next) {
      console.log("createCanvas["+frame.id+"])");
      var url = "http://googlyify.s3.amazonaws.com/" + frame.path;
      console.log("url", url);
      var local = dir + "/" + gif._id + "/frame-"+frame.id+".jpg";
      request(url)
      .pipe(fs.createWriteStream(local))
      .on("close", function () {
        fs.readFile(local, function (err, src) {
          if (err) return next(err);
          
          frame.canvas = new Canvas(gif.width, gif.height);
          frame.ctx = frame.canvas.getContext("2d");
          frame.img = new Image();
          frame.img.onload = function () {
            console.log("onload");
            frame.ctx.drawImage(frame.img, 0, 0, gif.width, gif.height);
            next();
          }
          frame.img.onerror = function (err) {
            console.log("onerror");
            console.error(err);
            next(err);
          }
          frame.img.src = src;
        });
      });
    }

    var drawEyes = function (frame, next) {
      console.log("drawEyes["+frame.id+"])");
      var opts;
      if (frame.visible) {
        frame.x *= gif.width;
        frame.y *= gif.height;
        frame.size *= gif.width;
        frame.gap *= frame.size;
        opts = {
          fillStyle: "#fff",
          strokeStyle: "none"
        };
        googly.drawEyes(frame.ctx, frame, opts);
        console.log(frame.ctx, frame, opts);
        opts = {
          fillStyle: "#000",
          strokeStyle: "none",
          size: frame.size*0.4
        };
        googly.drawEyes(frame.ctx, frame, opts);
      }
      next();
    }
    
    var padZero = function (str, ln) {
      str = String(str);
      while (str.length < ln) {
        str = "0" + str;
      }
      return str;
    }
    
    var writeFile = function (frame, next) {
      console.log("writeFile["+frame.id+"])");
      var output = fs.createWriteStream(path + "/render-" + padZero(frame.id, 3) + ".jpg");
      var writeStream = frame.canvas.jpegStream();
      writeStream.pipe(output);
      writeStream.on("end", function () {
          next();
      });
    }
    
    var finished = function (err) {
      if (err) throw err;
      console.log("finished");
      
      fs.rmdir(path, function (err) {
        exec("gm convert -delay 10 -loop 0 "+path+"/render-*.jpg "+path+"/render.gif", function (err, data) {
          if (err) throw err;
          
          s3.putFile(path+"/render.gif", gif._id+"/render.gif", {"x-amz-acl": "public-read"}, function (err, _res) {
            if (err) throw err;
            
            if (req.params.format == "json") {
              res.send({message: "success"});
            } else {
              res.redirect("/edit/"+id+"/"+key);
            }
          });
        });
      });
    }
    
    var go = function () {
      async.each(frames, async.applyEachSeries([createCanvas, drawEyes, writeFile]), finished);
    }
    fs.exists(path, function (err, exists) {
      if (exists) {
        go();
      } else {
        fs.mkdir(path, function (err) {
          if (err) console.error(err);
          go();
        });
      }
    });
  });
}