var mongoose = require("mongoose");
var EventEmitter = require("events").EventEmitter;

var SourceGif = mongoose.model("SourceGif");
var Gif = mongoose.model("Gif");

var Upload = {};

Upload.endpoint = function (req, res) {
  var url = req.query.url;
  
  if (url.toLowerCase().substring(url.length-4) != ".gif") {
    return res.render(500);
  }
  
  if (req.params.format == "json") {
    SourceGif.getOrCreate(url, function (err, src) {
      if (err) {
        console.error(err);
        return res.render(500);
      }
    
      Gif.fromSource(src, function (err, gif) {
        if (err) {
          console.error(err);
          return res.render(500);
        }
        res.send({message: "success", redirect: "/edit/"+gif._id+"/"+gif.key});
      });
    });
  } else {
    res.render("uploading", {url: url});
  }
}

Upload.uploader = function (url) {
  var ev = new EventEmitter();
  var srcev = SourceGif.getOrCreate(url, function (err, src) {
    if (err) {
      console.error(err);
      //ev.emit("error", err);
      ev.emit("end");
      return;
    }
    
    Gif.fromSource(src, function (err, gif) {
      if (err) {
        console.log("Uploader: err");
        ev.emit("error", err);
        ev.emit("end");
        return;
      }
      ev.emit("complete", {message: "Success!", redirect: "/edit/"+gif._id+"/"+gif.key});
    });
  });
  srcev.on("status", function (data) {
    ev.emit("status", data);
  });
  srcev.on("error", function (data) {
    ev.emit("error", data);
    return true;
  });
  ev.on("error", function (err) { console.error(err); return false; });
  this.status = ev;
}

module.exports = Upload;