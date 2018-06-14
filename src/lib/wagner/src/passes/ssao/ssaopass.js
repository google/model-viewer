'use strict';

var THREE = require('three');
var Pass = require('../../Pass');
var vertex = require('../../shaders/vertex/basic.glsl');
var fragment = require('./ssao-fs.glsl');
var BlendPass = require('../blend/BlendPass');
var FullBoxBlurPass = require('../box-blur/FullBoxBlurPass');
var Composer = require('../../Composer');

function SSAO(options) {
  Pass.call(this);
  this.setShader(vertex, fragment);



  this.blendPass = new BlendPass();

  this.blurPass = new FullBoxBlurPass(2);
  this.params.tDepth = new THREE.Texture()
  this.params.isPacked = false
  this.params.onlyOcclusion = false

  this.params.blurAmount = 1;

}

module.exports = SSAO;

SSAO.prototype = Object.create(Pass.prototype);
SSAO.prototype.constructor = SSAO;


SSAO.prototype.run = function(composer) {



    this.shader.uniforms.tDepth.value = this.tDepth;


    if( !this.composer ) {
        var s = 4;
        this.composer = new Composer( composer.renderer, { useRGBA: true } );
        this.composer.setSize( composer.width / s, composer.height / s );
      }

      this.composer.reset();

      this.composer.setSource( composer.output );

      this.shader.uniforms.tDepth.value = this.params.tDepth;
      this.shader.uniforms.isPacked.value = this.params.isPacked;
      this.shader.uniforms.onlyOcclusion.value = this.params.onlyOcclusion;
      this.composer.pass( this.shader );

      this.blurPass.params.amount = this.params.blurAmount;
      this.composer.pass(this.blurPass);

      if( this.params.onlyOcclusion ) {
        composer.setSource( this.composer.output );
      } else {
        this.blendPass.params.mode = 4;
        this.blendPass.params.tInput2 = this.composer.output;

        composer.pass( this.blendPass );
      }


};
