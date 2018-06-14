'use strict';

var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./invert-fs.glsl');

function InvertPass() {
  Pass.call(this);
  this.setShader(vertex, fragment);
}

module.exports = InvertPass;

InvertPass.prototype = Object.create(Pass.prototype);
InvertPass.prototype.constructor = InvertPass;
