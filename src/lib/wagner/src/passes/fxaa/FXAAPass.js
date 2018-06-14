'use strict';

var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./fxaa-fs.glsl');

function FXAAPass() {
  Pass.call(this);
  this.setShader(vertex, fragment);
}

module.exports = FXAAPass;

FXAAPass.prototype = Object.create(Pass.prototype);
FXAAPass.prototype.constructor = FXAAPass;
