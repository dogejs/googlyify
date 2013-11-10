
if (typeof require != "undefined") {
  _ = require("lodash");
  Box2D = require("./box2dweb-rope");
}

var b2World = Box2D.Dynamics.b2World;
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2RopeJointDef = Box2D.Dynamics.Joints.b2RopeJointDef


var googly = {};

googly.createCirclePoints = function (cx, cy, cz, rad, steps) {
  var i;
  var pts = [];
  if (steps > 2) {
    for (i=0; i<360; i+=360/steps) {
      var ang = i/180*Math.PI;
      pts.push({x: cx+Math.cos(ang)*rad, y: cy+Math.sin(ang)*rad, z: cz});
    }
  }
  return pts;
}

googly.drawEyes = function (ctx, frame, opts) {
  var objects = [];
  var points = [];
  var steps = 24;
  var defaultOpts = {
    strokeStyle: "none",
    fillStyle: "#fff",
    lineWidth: 4,
    size: frame.size,
    offset: false
  };
  opts = _.extend(defaultOpts, opts);
  
  var cx = frame.x;
  var cy = frame.y;
  
  var rad2 = frame.size - opts.size;
  
  objects.push({points: googly.createCirclePoints(-frame.gap+(opts.offset ? frame.eye1x*rad2 : 0), (opts.offset ? frame.eye1y*rad2 : 0), frame.size, opts.size, steps)});
  objects.push({points: googly.createCirclePoints(frame.gap+(opts.offset ? frame.eye2x*rad2 : 0), (opts.offset ? frame.eye2y*rad2 : 0), frame.size, opts.size, steps)});
  
  _.each(objects, function (object) {
    // rotate about the z axis
    object.points = _.map(object.points, function (point) {
      var _a = Math.atan2(point.y, point.x) + frame.rz/180*Math.PI;
      var _r = Math.sqrt(Math.pow(point.x,2) + Math.pow(point.y,2));
      var _x = Math.cos(_a)*_r;
      var _y = Math.sin(_a)*_r;
      var _z = point.z;
      return {x:_x, y:_y, z:_z};
    });
    
    // rotate about the y axis
    object.points = _.map(object.points, function (point) {
      var _a = Math.atan2(point.z, point.x) + frame.ry/180*Math.PI;
      var _r = Math.sqrt(Math.pow(point.x,2) + Math.pow(point.z,2));
      var _x = Math.cos(_a)*_r;
      var _y = point.y;
      var _z = Math.sin(_a)*_r;
      return {x:_x, y:_y, z:_z};
    });
    
    // rotate about the x axis
    object.points = _.map(object.points, function (point) {
      var _a = Math.atan2(point.y, point.z) + frame.rx/180*Math.PI;
      var _r = Math.sqrt(Math.pow(point.z,2) + Math.pow(point.y,2));
      var _x = point.x;
      var _y = Math.sin(_a)*_r;
      var _z = Math.cos(_a)*_r;
      return {x:_x, y:_y, z:_z};
    });
    
    object.points = _.map(object.points, function (point) {
      return {x:cx+point.x, y:cy+point.y};
    });
    
    ctx.beginPath();
    ctx.moveTo(object.points[0].x, object.points[0].y);
    _.each(object.points, function (point) {
      ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    if (opts.fillStyle != "none") {
      ctx.fillStyle = opts.fillStyle;
      ctx.fill();
    }
    if (opts.strokeStyle != "none") {
      ctx.strokeStyle = opts.strokeStyle;
      ctx.lineWidth = opts.lineWidth;
      ctx.stroke();
    }
  });
}

var World = function (debugId) {
  this.world = new b2World(
    new b2Vec2(0, 20), //gravity vector
    true
  );
  this.scale = 30;
  this.debug = false;
  if (debugId) {
    this.debug = true;
    var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(document.getElementById(debugId).getContext("2d"));
        debugDraw.SetDrawScale(2.0);
        debugDraw.SetFillAlpha(0.5);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(
            b2DebugDraw.e_shapeBit | 
            b2DebugDraw.e_jointBit |
            b2DebugDraw.e_aabbBit |
            b2DebugDraw.e_pairBit |
            b2DebugDraw.e_centerOfMassBit |
            b2DebugDraw.e_controllerBit
        );
        this.world.SetDebugDraw(debugDraw);
  }
  this.eye = new googly.Eye(this);
  if (this.debug) this.world.DrawDebugData();
}

World.prototype.draw = function () {
  this.world.Step(1 / 60, 10, 10);
  if (this.debug) this.world.DrawDebugData();
  this.world.ClearForces();
}

var Eye = function (world, id) {
  var eyeSize = 4;
  var pupilSize = 4;
  this.radius = 20;
  
  this.eyeId = id; // 1 or 2
  this.world = world;
  
  var fixDef = new b2FixtureDef;
    fixDef.shape = new b2PolygonShape;
    fixDef.density = 1.0;
    fixDef.friction = 1.0;
    fixDef.restitution = .5;
    fixDef.shape.SetAsBox(eyeSize, eyeSize);
  var bodyDef = new b2BodyDef;
    //bodyDef.type = state.static ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
    bodyDef.type = b2Body.b2_staticBody;
    bodyDef.position.Set(this.radius, this.radius);
  this.eye = this.world.world.CreateBody(bodyDef);
  this.eye.CreateFixture(fixDef);

  var fixDef = new b2FixtureDef;
  fixDef.shape = new b2PolygonShape;
    fixDef.density = 1.0;
    fixDef.friction = 1.0;
    fixDef.restitution = 0.3;
    fixDef.shape.SetAsBox(pupilSize, pupilSize);
  var bodyDef = new b2BodyDef;
    bodyDef.type = b2Body.b2_dynamicBody;
  this.pupil = this.world.world.CreateBody(bodyDef);
  this.pupil.SetLinearDamping(0.2);
  this.pupil.CreateFixture(fixDef);
  
  var jointDef = new b2RopeJointDef();
    jointDef.bodyA = this.eye;
    jointDef.bodyB = this.pupil;
    jointDef.localAnchorA.Set(0, 0);
    jointDef.localAnchorB.Set(0, 0);
    jointDef.maxLength = this.radius;
  var rope = this.world.world.CreateJoint(jointDef);
}
Eye.prototype.render = function (previousPosition, currentPosition, previousPupilPosition) {
  if (previousPupilPosition && typeof previousPupilPosition.x == "number") {
    
  } else {
    previousPupilPosition = {x: 0, y: 0};
  }
  
  if (!this.pupil || !this.eye) { console.log("eye not set up yet?", this.pupil, this.eye); return false; }
  
  if (previousPosition && typeof previousPosition.x == "number") {
    //this.pupil.SetPosition(new b2Vec2(previousPosition.x+previousPupilPosition.x*this.radius, previousPosition.y+previousPupilPosition.y*this.radius));
    this.eye.SetPosition(new b2Vec2(previousPosition.x, previousPosition.y));
    this.world.draw();
    var steps = 2;
    for (var i=0; i<=steps; i++) {
      _x = previousPosition.x + (currentPosition.x-previousPosition.x)*(i/steps);
      _y = previousPosition.y + (currentPosition.y-previousPosition.y)*(i/steps);
      this.eye.SetPosition(new b2Vec2(_x, _y));
      this.world.draw();
    }
  } else {
    this.eye.SetPosition(new b2Vec2(currentPosition.x, currentPosition.y));
    this.pupil.SetPosition(new b2Vec2(currentPosition.x, currentPosition.y));
  }
  
  this.world.draw();
  
  return this.getPupilCoords();
}
Eye.prototype.getPupilCoords = function () {
  this.world.draw();
  
  _x = (this.pupil.GetPosition().x-this.eye.GetPosition().x)/this.radius;
  _y = (this.pupil.GetPosition().y-this.eye.GetPosition().y)/this.radius;
  dist = Math.sqrt(_x*_x + _y*_y);
  console.log("dist?", this.pupil.GetPosition().x, this.eye.GetPosition().x, this.radius, dist);
  maxDist = 0.9;
  if (dist > maxDist) {
    //_x *= maxDist/dist;
    //_y *= maxDist/dist;
  }
  return {x: _x, y: _y};
}

googly.World = World;
googly.Eye = Eye;

if (typeof window != "undefined") {
  window.googly = googly;
}
if (typeof module != "undefined") {
  module.exports = googly;
}