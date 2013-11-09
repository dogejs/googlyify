var mongoose = require("mongoose");

var Gif = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  frames: [{
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
});

mongoose.model("Gif", Gif);
