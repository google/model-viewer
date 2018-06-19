'use strict';

var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./copy-fs.glsl');

function CopyPass() {
  Pass.call(this);
  this.setShader(vertex, fragment);
}

module.exports = CopyPass;

CopyPass.prototype = Object.create(Pass.prototype);
CopyPass.prototype.constructor = CopyPass;
