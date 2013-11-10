var fs = require("fs");
var mongoose = require("mongoose");
var async = require("async");
var _ = require("lodash");
var rimraf = require("rimraf");
var request = require("request");
var knox = require("knox");
var Canvas = require("canvas");
var Image = Canvas.Image;
var exec = require("child_process").exec;
var googly = require("../public/js/googly"); // lol
var Box2d = require("../public/js/lib/box2dweb-rope"); // lol

var s3 = knox.createClient({
  key: process.env.AMAZON_KEY,
  secret: process.env.AMAZON_SECRET,
  bucket: "googlyify"
});

var Gif = mongoose.model("Gif");


module.exports = function (req, res) {
  var id = req.params.id;
  var key = req.params.key;
  
  var world1 = new googly.World();
  var world2 = new googly.World();
  
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
      var sc = 640/gif.width;
      console.log("drawEyes["+frame.id+"])");
      console.log("=======================");
      var opts;
      if (frame.visible) {
        frame.xs = frame.x * gif.width;
        frame.ys = frame.y * gif.height;
        frame.sizes = frame.size * gif.width;
        frame.gaps = frame.gap * frame.sizes;
        opts = {
          fillStyle: "#fff",
          strokeStyle: "none"
        };
        
        _frame = _.clone(frame);
        _frame.x = frame.xs;
        _frame.y = frame.ys;
        _frame.size = frame.sizes;
        _frame.gap = frame.gaps;
        googly.drawEyes(frame.ctx, _frame, opts);
        
        
        p = frame.previous;
        f = frame;
        var previousPosition = null;
        var previousPupilPosition = null;
        if (p) {
          previousPosition = {
            x: p.xs,
            y: p.ys
          };
          previousPupilPosition = {
            x: p.eye1x,
            y: p.eye1y
          }
        }
        var currentPosition = {
          x: f.xs,
          y: f.ys
        };

        var newpos1 = world1.eye.render(previousPosition, currentPosition, previousPupilPosition);

        var previousPosition = null;
        var previousPupilPosition = null;
        if (p) {
          previousPosition = {
            x: p.xs,
            y: p.ys
          };
          previousPupilPosition = {
            x: p.eye2x,
            y: p.eye2y
          }
        }
        var currentPosition = {
          x: f.xs,
          y: f.ys
        };
        console.log({a: previousPosition, b: currentPosition, c: previousPupilPosition});
        newpos2 = world2.eye.render(previousPosition, currentPosition, previousPupilPosition);
        
        world1.draw();
        world2.draw();
        
        setTimeout(function () {
          world1.draw();
          world2.draw();
          
          if (!newpos1 || !newpos2) { return console.log("Render unsuccessful", newpos1, newpos2); }
          
          setTimeout(function () {
            newpos1 = world1.eye.getPupilCoords();
            newpos2 = world2.eye.getPupilCoords();
            
            f.eye1x = newpos1.x;
            f.eye1y = newpos1.y;
            f.eye2x = newpos2.x;
            f.eye2y = newpos2.y;
        
            console.log("eyes", f.eye1x, f.eye1y, f.eye2x, f.eye2y);
        
            opts = {
              fillStyle: "#000",
              strokeStyle: "none",
              size: frame.sizes*0.4,
              offset: true
            };
            _frame = _.clone(frame);
            _frame.x = frame.xs;
            _frame.y = frame.ys;
            _frame.size = frame.sizes;
            _frame.gap = frame.gaps;
            googly.drawEyes(frame.ctx, _frame, opts);
            next();
          }, 100);
        }, 100);
      } else {
        next();
      }
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
      
      exec("gm convert -delay 10 -loop 0 "+path+"/render-*.jpg "+path+"/render.gif", function (err, data) {
        if (err) throw err;
        
        s3.putFile(path+"/render.gif", gif._id+"/render.gif", {"x-amz-acl": "public-read"}, function (err, _res) {
          if (err) throw err;
          
          rimraf(path+"__", function (err) {
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
      async.eachSeries(frames, async.applyEachSeries([createCanvas, drawEyes, writeFile]), finished);
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