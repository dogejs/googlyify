// https://github.com/nko4/website/blob/master/module/README.md#nodejs-knockout-deploy-check-ins
require('nko')('cRqaydoFRmct9opC');

var fs = require('fs');
var connect = require('connect');
var express = require('express');
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
var app = express();

// if run as root, downgrade to the owner of this file
if (process.getuid() === 0) {
  fs.stat(__filename, function(err, stats) {
    if (err) { return console.error(err); }
    process.setuid(stats.uid);
  });
}


app.configure(function () {
  app.set("views", __dirname + "/views");
  app.set("view engine", "ejs");
  app.use(express.cookieParser());
  app.use(express.session({
    cookie: {
      maxAge: 1000 * 86400 * 365 * 5
    },
    secret: "nodeknockout!",
    store: mongooseSessionStore
  }));
  //app.dynamicHelpers
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.get('/upload', require('./controllers/upload'));

app.get('/', function(req, res) {
  var voteko = '<iframe src="http://nodeknockout.com/iframe/googlyify" frameborder=0 scrolling=no allowtransparency=true width=115 height=25></iframe>';
  
  res.end('<html><body>' + voteko + '</body></html>\n');
});

app.use(express.static(__dirname+"/public"));
app.use(function (req, res) {
  res.render("404");
});

app.listen(port);

