//  USAGE :
//  https://gist.github.com/Samsy/7219c148e6cbd179883a

//  Port by Samsy for Wagner from http://bkcore.com/blog/3d/webgl-three-js-volumetric-light-godrays.html

'use strict';

var THREE = require('three');
var Pass = require('../../Pass');

var FullBoxBlurPass = require('../box-blur/FullBoxBlurPass');

var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./godray-fs.glsl');

function Godray(options) {

  Pass.call(this);

  options = options || {};

  this.setShader(vertex, fragment);

  this.blurPass = new FullBoxBlurPass(2);

  this.width = options.width || 512;
  this.height = options.height || 512;

  this.params.blurAmount = options.blurAmount || 2;

  this.params.fX = 0.5;
  this.params.fY = 0.5;
  this.params.fExposure = 0.6;
  this.params.fDecay = 0.93;
  this.params.fDensity = 0.88
  this.params.fWeight = 0.4
  this.params.fClamp = 1.0

}

module.exports = Godray;

Godray.prototype = Object.create(Pass.prototype);
Godray.prototype.constructor = Godray;

Godray.prototype.run = function(composer) {

  this.shader.uniforms.fX.value = this.params.fX;
  this.shader.uniforms.fY.value = this.params.fY;
  this.shader.uniforms.fExposure.value = this.params.fExposure;
  this.shader.uniforms.fDecay.value = this.params.fDecay;
  this.shader.uniforms.fDensity.value = this.params.fDensity;
  this.shader.uniforms.fWeight.value = this.params.fWeight;
  this.shader.uniforms.fClamp.value = this.params.fClamp;

  this.blurPass.params.amount = this.params.blurAmount;

  composer.pass(this.blurPass);
  composer.pass(this.blurPass);

  composer.pass(this.shader);

};
