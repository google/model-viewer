# Polyfills

`<xr-model>` relies on standardized features of the Web Platform to do a lot of
what it does. Some of these features are very new and don't exist in all
browsers yet. In order to maximize browser compatibility, you should install
[polyfills](https://en.wikipedia.org/wiki/Polyfill_(programming)) to fill in the
gaps for some of the newest features.

## Browser Support

The following emerging standard web platform APIs are needed by this library:

 - [Custom Elements](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements) ([CanIUse](https://caniuse.com/#feat=custom-elementsv1), [Platform Status](https://www.chromestatus.com/features/4696261944934400))
 - [Shadow DOM](https://dom.spec.whatwg.org/#shadow-trees) ([CanIUse](https://caniuse.com/#feat=shadowdomv1), [Platform Status](https://www.chromestatus.com/features/4667415417847808))
 - [Resize Observer](https://wicg.github.io/ResizeObserver/) ([CanIUse](https://caniuse.com/#feat=resizeobserver), [Platform Status](https://www.chromestatus.com/features/5705346022637568))
 - [Intersection Observer](https://w3c.github.io/IntersectionObserver/) ([CanIUse](https://caniuse.com/#feat=intersectionobserver), [Platform Status](https://www.chromestatus.com/features/5695342691483648))
 - [Fullscreen API](https://fullscreen.spec.whatwg.org/) ([CanIUse](https://caniuse.com/#feat=fullscreen), [Platform Status](https://www.chromestatus.com/features/6596356319739904))

Additionally, the following _highly experimental and volatile_ APIs are needed
to enable in-browser AR (currently available in Chrome Canary only):

 - [Web XR Device API](https://immersive-web.github.io/webxr/) ([Platform Status](https://www.chromestatus.com/features/5680169905815552))
 - [Web XR Hit Test API](https://github.com/immersive-web/hit-test/blob/master/explainer.md) ([Platform Status](https://www.chromestatus.com/features/4755348300759040))

Some browser support for these features can be enabled with polyfills. Any
polyfills that faithfully implement the required platform features should be
fine. The following is a selection of recommended polyfill implementations:

 - [Web Components Polyfill](https://github.com/webcomponents/webcomponentsjs) (includes Custom Elements and Shadow DOM)
 - [Resize Observer Polyfill](https://github.com/que-etc/resize-observer-polyfill)
 - [Intersection Observer Polyfill](https://github.com/w3c/IntersectionObserver/tree/master/polyfill)
 - [Fullscreen Polyfill](https://github.com/nguyenj/fullscreen-polyfill)

Please keep in mind that your mileage may vary depending on the browsers you
need to support and the fidelity of the polyfills used.

## Usage Example

If you are using the polyfills recommended above, you can install them with
this NPM command:

```
npm i --save @webcomponents/webcomponentjs \
             resize-observer-polyfill \
             fullscreen-polyfill \
             intersection-observer
```

Once you have them installed, it is generally required that you load them before
the rest of your application code:

```html
<!doctype>
<html>
  <head>
    <title>Polyfill Example</title>

    <!-- The following libraries and polyfills are recommended to maximize browser support -->
    <!-- NOTE: you must adjust the paths as appropriate for your project -->

    <!-- Web Components polyfill is required to support Edge and Firefox < 63: -->
    <script src="./node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"></script>

    <!-- Resize Observer polyfill is required for non-Chrome browsers: -->
    <script src="./node_modules/resize-observer-polyfill/dist/ResizeObserver.js"></script>

    <!-- Intersection Observer polyfill is required for Safari and IE11 -->
    <script src="./node_modules/intersection-observer/intersection-observer.js"></script>

    <!-- Fullscreen polyfill is required to support all stable browsers: -->
    <script src="./node_modules/fullscreen-polyfill/dist/fullscreen.polyfill.js"></script>
  </head>
  <body>
    <!-- etc -->
  </body>
</html>
```

