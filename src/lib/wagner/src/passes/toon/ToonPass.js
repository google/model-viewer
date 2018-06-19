'use strict';

var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./toon-fs.glsl');

function ToonPass() {
  Pass.call(this);
  this.setShader(vertex, fragment);
}

module.exports = ToonPass;

ToonPass.prototype = Object.create(Pass.prototype);
ToonPass.prototype.constructor = ToonPass;
