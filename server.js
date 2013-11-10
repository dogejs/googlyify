// https://github.com/nko4/website/blob/master/module/README.md#nodejs-knockout-deploy-check-ins
require('nko')('cRqaydoFRmct9opC');

var fs = require('fs');
var connect = require('connect');
var express = require('express');
var app = express();
//var server = require('http').createServer(app);
var sio = require('socket.io');
var engine = require("ejs-locals");
var mongoose = require("mongoose");
var SessionMongoose = require("session-mongoose")(connect);

var db = "mongodb://localhost/googlyify";
var mongooseSessionStore = new SessionMongoose({url: db});
mongoose.connect(db);

// register models
require("./models/sourcegif");
require("./models/gif");

var isProduction = (process.env.NODE_ENV === 'production');
var port = (isProduction ? 80 : 8000);

// if run as root, downgrade to the owner of this file
if (process.getuid() === 0) {
  fs.stat(__filename, function(err, stats) {
    if (err) { return console.error(err); }
    process.setuid(stats.uid);
  });
}

app.configure(function () {
  app.set("views", __dirname + "/views");
  app.engine("ejs", engine);
  app.set("view engine", "ejs");
  app.set("view options", {layout: "views/layout.ejs"});
  app.use(express.cookieParser());
  /*
  app.use(express.session({
    cookie: {
      maxAge: 1000 * 86400 * 365 * 5
    },
    secret: "nodeknockout!",
    store: mongooseSessionStore
  }));
  /**/
  //app.dynamicHelpers
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.get('/upload.:format?', require('./controllers/upload').endpoint);
app.get('/edit/:id/:key', require('./controllers/edit'));
app.post('/save/:id/:key.:format?', require('./controllers/save'));
app.all('/render/:id/:key.:format?', require('./controllers/render'));
app.get('/renderer/:id/:key.:format?', require('./controllers/renderer'));

app.get('/', function(req, res) { res.render("index"); });

app.use(express.static(__dirname+"/public"));
//app.use(function (req, res) {
//  res.render("404");
//});

var io = sio.listen(app.listen(port));

io.set("log level", 0);
io.sockets.on("connection", function (socket) {
  socket.on("uploadtest", function (data) {
    var url = data.url;
    var after = function (sec, next) {
      setTimeout(next, sec*1000);
    };
    socket.emit("status", {message: "Fetching "+url+"..."});
    after(2, function () {
      socket.emit("status", {message: "Download complete.", info: {uploadComplete: true}});
      socket.emit("status", {message: "GIF identified. unknown frames @ 123x123", tag: "count"});
      after(1, function () {
        socket.emit("status", {message: "GIF identified. 120 frames @ 123x123", tag: "count", info: {totalFrames: 120}});
        var uploadCount = 0;
        var frameCount = 120;
        var cached = function () {
          uploadCount++;
          socket.emit("status", {message: "Cached image "+uploadCount+" of "+frameCount, tag: "cache", info: {cachedFrames: uploadCount}});
          if (uploadCount < frameCount) {
            after(0.1, cached);
          } else {
            socket.emit("status", {message: "Complete!"});
            socket.emit("complete", {redirect: "/edit/asdf/asdf"});
          }
        }
        cached();
      });
    });
  });
  socket.on("upload", function (data) {
    //socket.emit("status", data);
    var uploader = new (require('./controllers/upload').uploader)(data.url);
    
    uploader.status.on("error", function (err) {
      err.msg = err.message;
      
      if (err.code == "ENOTFOUND") {
        err.msg = "Uh oh, couldn't connect! Check the URL."
      }
      if (!err.msg) {
        err.msg = "Some kind of error occurred and I feel really terrible about it. ";
        if (err.code) {
          err.msg += err.code;
        }
      }
      //err.msg = err.message;
      console.error(err);
      socket.emit("error", err);
      return true;
    });
    uploader.status.on("status", function (data) {
      socket.emit("status", data);
    });
    uploader.status.on("complete", function (data) {
      socket.emit("complete", data);
    });
    uploader.status.on("end", function (data) {
      uploader.status.removeAllListeners();
    });
  });
});
