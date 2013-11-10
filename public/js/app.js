
$(document).ready(function () {
  
});





function showStatusMessage (message, tag, type) {
  var statusEl = $(".status-messages");
  
  var div = false;
  if (tag) {
    existing = $(".status-"+tag, statusEl);
    if (existing && existing.length > 0) {
      div = existing;
    } else {
      div = $("<div>");
      div.addClass("status-"+tag);
    }
  }
  if (!div) {
    div = $("<div>");
  }
  div.addClass("alert");
  if (type == "error") {
    div.addClass("alert-danger");
  } else
  if (type == "complete") {
    div.addClass("alert-success");
  } else {
    div.addClass("alert-info");
  }
  div.html(message);
  statusEl.prepend(div);
}




var currentImage = 0;
function setNewImage () {
  var attempts = 0;
  var imageCount = 4;
  var newImage = currentImage;
  while (++attempts < 10 && newImage == currentImage) {
    newImage = Math.ceil(Math.random()*imageCount);
  }
  currentImage = newImage;
  $(".status-image").removeClass("show-1 show-2 show-3 show-4").addClass("show-"+newImage);
}

function rotateDogeImages () {
  setInterval(function () {
    setNewImage();
  }, 4000);
  setNewImage();
}

