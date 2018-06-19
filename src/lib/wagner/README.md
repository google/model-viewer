# wagner-common

Fork of [superguigui/Wagner](https://github.com/superguigui/Wagner) in commonjs for webpack.

[demo](http://superguigui.github.io/Wagner)

## Installation

```bash
npm install @alex_toudic/wagner three --save
```

## Usage

```javascript
var THREE = require('three');
var WAGNER = require('@alex_toudic/wagner');
var BloomPass = require('@alex_toudic/wagner/src/passes/bloom/MultiPassBloomPass');

// ...

var composer = new WAGNER.Composer(renderer);
var bloomPass = new BloomPass({
  blurAmount: 2,
  applyZoomBlur: true
});

// ...

renderer.autoClearColor = true;
composer.reset();
composer.render(scene, camera);
composer.pass(bloomPass);
composer.toScreen();
```
