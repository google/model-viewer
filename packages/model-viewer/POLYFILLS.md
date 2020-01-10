# Polyfills

`<model-viewer>` relies on standardized features of the Web Platform to do a lot
of what it does. Some of these features are very new and don't exist in all
browsers yet. In order to maximize browser compatibility, you should install
[polyfills](https://en.wikipedia.org/wiki/Polyfill_(programming)) to fill in the
gaps for some of the newest features.

---

 - ✅ Natively supported
 - ✋ Available with polyfill
 - 🚧 Behind a flag, unstable
 - 🚫 Not available

These browser features are **required** for `<model-viewer>` to work correctly:

Feature                    | Chrome | Canary | Safari 12 | Firefox 65 | Edge | IE 11 | Samsung Internet 
---------------------------|--------|--------|-----------|------------|------|-------|------------------
Custom Elements            |     ✅ |     ✅ |        ✅ |         ✅ |   ✋ |   ✋ |               ✅
Shadow DOM                 |     ✅ |     ✅ |        ✅ |         ✅ |   ✋ |   ✋ |               ✅

These browser features are **optional** and are only used if available for
performance optimization or specific features:

Feature                    | Chrome | Canary | Safari 12 | Firefox 65 | Edge | IE 11 | Samsung Internet 
---------------------------|--------|--------|-----------|------------|------|-------|------------------
Resize Observer[¹](1)      |     ✅ |     ✅ |        ✋ |         ✋ |   ✋ |   ✋ |               ✅
Intersection Observer[²](2)|     ✅ |     ✅ |        ✋ |         ✅ |   ✅ |   ✋ |               ✅
Fullscreen API[³](3)       |     ✅ |     ✅ |        ✋ |         ✅ |   ✋ |   ✋ |               ✋
`:focus-visible`[⁴](4)     |     ✋ |     ✋ |        ✋ |         ✋ |   ✋ |   ✋ |               ✋

These browser features are **optional** and are only needed if you wish to use
the `unstable-webxr` feature:

Feature                    | Chrome | Canary | Safari 12 | Firefox 65 | Edge | IE 11 | Samsung Internet 
---------------------------|--------|--------|-----------|------------|------|-------|------------------
WebXR Device API           |     🚫 |     🚧 |        🚫 |         🚫 |   🚫 |   🚫 |               🚫 
WebXR HitTest API          |     🚫 |     🚧 |        🚫 |         🚫 |   🚫 |   🚫 |               🚫


[1]: https://github.com/PolymerLabs/model-viewer/blob/master/POLYFILLS.md#regarding-resize-observer
[2]: https://github.com/PolymerLabs/model-viewer/blob/master/POLYFILLS.md#regarding-intersection-observer
[3]: https://github.com/PolymerLabs/model-viewer/blob/master/POLYFILLS.md#regarding-fullscreen-api
[4]: https://github.com/PolymerLabs/model-viewer/blob/master/POLYFILLS.md#regarding-focus-visible

### Regarding IE 11

We currently test and support Internet Explorer 11. We also distribute a special
["legacy" bundle](https://unpkg.com/@google/model-viewer/dist/model-viewer-legacy.js)
that is compatible with IE 11 but comes with the following important caveat:
the "legacy" bundle includes JavaScript language feature polyfills and code
transformations that will incur a byte size and execution time penalty
compared to the non-legacy versions of the code.

## Browser Support

The following emerging standard web platform APIs are *required* by
`<model-viewer>`:

 - [Custom Elements](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements) ([CanIUse](https://caniuse.com/#feat=custom-elementsv1), [Chrome Platform Status](https://www.chromestatus.com/features/4696261944934400))
 - [Shadow DOM](https://dom.spec.whatwg.org/#shadow-trees) ([CanIUse](https://caniuse.com/#feat=shadowdomv1), [Chrome Platform Status](https://www.chromestatus.com/features/4667415417847808))

The following emerging web platform APIs are *optional*, and will be used by
`<model-viewer>` if they are detected on the page:

 - [Resize Observer](https://wicg.github.io/ResizeObserver/) ([CanIUse](https://caniuse.com/#feat=resizeobserver), [Chrome Platform Status](https://www.chromestatus.com/features/5705346022637568))
 - [Intersection Observer](https://w3c.github.io/IntersectionObserver/) ([CanIUse](https://caniuse.com/#feat=intersectionobserver), [Chrome Platform Status](https://www.chromestatus.com/features/5695342691483648))
 - [Fullscreen API](https://fullscreen.spec.whatwg.org/) ([CanIUse](https://caniuse.com/#feat=fullscreen), [Chrome Platform Status](https://www.chromestatus.com/features/6596356319739904))
 - [`:focus-visible`]() ([CanIUse](https://caniuse.com/#feat=css-focus-visible), [Chrome Platform Status](https://chromestatus.com/features/5823526732824576))

Additionally, the following _highly experimental and volatile_ APIs are needed
to enable in-browser AR (currently available in Chrome Canary only):

 - [Web XR Device API](https://immersive-web.github.io/webxr/) ([Chrome Platform Status](https://www.chromestatus.com/features/5680169905815552))
 - [Web XR Hit Test API](https://github.com/immersive-web/hit-test/blob/master/explainer.md) ([Chrome Platform Status](https://www.chromestatus.com/features/4755348300759040))

### Recommended Polyfills

Some browser support for these features can be enabled with polyfills. Any
polyfills that faithfully implement the required platform features should be
fine. The following is a selection of recommended polyfill implementations:

 - [Web Components Polyfill](https://github.com/webcomponents/webcomponentsjs) (includes Custom Elements and Shadow DOM)
 - [Resize Observer Polyfill](https://github.com/que-etc/resize-observer-polyfill)
 - [Intersection Observer Polyfill](https://github.com/w3c/IntersectionObserver/tree/master/polyfill)
 - [Fullscreen Polyfill](https://github.com/nguyenj/fullscreen-polyfill)
 - [`:focus-visible` Polyfill](https://github.com/WICG/focus-visible)

Please keep in mind that your mileage may vary depending on the browsers you
need to support and the fidelity of the polyfills used.

### Regarding Fullscreen API

The Fullscreen API is necessary for AR use cases. Currently, it is  necessary
for the experimental Web XR Device API-based AR mode. Since this is only
available behind a flag in Chrome Dev today, it is not necessary to load a
Fullscreen API polyfill in production scenarios.

**Importantly:** Fullscreen API is used as a fallback when Scene Viewer fails
to launch on Android. If you do not include a polyfill for this API, the AR
button may appear to do nothing on Samsung Internet and other browsers like it
that do not have Fullscreen API yet.

### Regarding Resize Observer

If Resize Observer is available in the page, `<model-viewer>` will be able
to automatically recompute the scale and framing of its 3D content in many types
of scenarios where layout is changing (for example, when its parent container
changes size due to an animation or transition).

However, it is important to note that Resize Observer is optional because the
polyfill is known to have performance consequences that might be considered
unacceptable for some use cases (it uses a Mutation Observer that observes the
whole document tree).

If Resize Observer is _not_ available, `<model-viewer>` will fall back to
observing window `resize` events. In this condition, you can force the element
to recompute its internal layout by dispatching a synthetic window `resize`
event.

### Regarding Intersection Observer

If Intersection Observer is available in the page, `<model-viewer>` will be
able to automatically detect if it is currently visible or not. This allows it
to pause rendering or delay loading model files when `<model-viewer>` is not in
the viewport.

Intersection Observer is optional because it is not strictly required to make
`<model-viewer>` work. However, if Intersection Observer is not available, the
general performance characteristics of `<model-viewer>` will be worse overall.

Unlike Resize Observer, there is not fallback for Intersection Observer unles
you use a polyfill.

### Regarding `:focus-visible`

`:focus-visible` is an as-yet unimplemented web platform feature that enables
content authors to style a component on the condition that it received focus in
such a way that suggests the focus state should be visibly evident.

The `:focus-visible` capability has not been implemented in any stable browsers
yet. If [the polyfill][6] is available on the page, `<model-viewer>` will use it
and only display focus rings when `:focus-visible` should apply.

Check out [this related MDN][5] article for more details on `:focus-visible`.

[5]: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
[6]: https://github.com/WICG/focus-visible

## Usage Example

If you are using the polyfills recommended above, you can install them with
this NPM command:

```
npm i --save @webcomponents/webcomponentsjs \
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

    <!-- 🚨 REQUIRED: Web Components polyfill to support Edge and Firefox < 63 -->
    <script src="./node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"></script>

    <!-- 💁 OPTIONAL: Intersection Observer polyfill for better performance in Safari and IE11 -->
    <script src="./node_modules/intersection-observer/intersection-observer.js"></script>

    <!-- 💁 OPTIONAL: Resize Observer polyfill improves resize behavior in non-Chrome browsers -->
    <script src="./node_modules/resize-observer-polyfill/dist/ResizeObserver.js"></script>

    <!-- 💁 OPTIONAL: Fullscreen polyfill is required for experimental AR features in Canary -->
    <script src="./node_modules/fullscreen-polyfill/dist/fullscreen.polyfill.js"></script>

    <!-- 💁 OPTIONAL: The :focus-visible polyfill removes the focus ring for some input types -->
    <script src="./node_modules/focus-visible/dist/focus-visible.js" defer></script>

    <!-- 💁 OPTIONAL: Include prismatic.js for Magic Leap support -->
    <!--<script src="./node_modules/@magicleap/prismatic/prismatic.min.js"></script>-->

  </head>
  <body>
    <!-- etc -->

    <!-- Loads <model-viewer> only on modern browsers: -->
    <script type="module"
        src="./node_modules/@google/model-viewer/dist/model-viewer.js">
    </script>

    <!-- Loads <model-viewer> only on old browsers like IE11: -->
    <script nomodule
        src="./node_modules/@google/model-viewer/dist/model-viewer-legacy.js">
    </script>
  </body>
</html>
```

### Using Unpkg.com CDN

If do not use Node.js/NPM, one option is to use the Unpkg.com CDN to load the
recommended polyfills and `<model-viewer>`:

```html
<!doctype>
<html>
  <head>
    <title>Polyfill Example</title>

    <!-- The following libraries and polyfills are recommended to maximize browser support -->

    <!-- 🚨 REQUIRED: Web Components polyfill to support Edge and Firefox < 63 -->
    <script src="https://unpkg.com/@webcomponents/webcomponentsjs@2.1.3/webcomponents-loader.js"></script>

    <!-- 💁 OPTIONAL: Intersection Observer polyfill for better performance in Safari and IE11 -->
    <script src="https://unpkg.com/intersection-observer@0.5.1/intersection-observer.js"></script>

    <!-- 💁 OPTIONAL: Resize Observer polyfill improves resize behavior in non-Chrome browsers -->
    <script src="https://unpkg.com/resize-observer-polyfill@1.5.0/dist/ResizeObserver.js"></script>

    <!-- 💁 OPTIONAL: Fullscreen polyfill is required for experimental AR features in Canary -->
    <script src="https://unpkg.com/fullscreen-polyfill@1.0.2/dist/fullscreen.polyfill.js"></script>

    <!-- 💁 OPTIONAL: The :focus-visible polyfill removes the focus ring for some input types -->
    <script src="https://unpkg.com/focus-visible@5.0.1/dist/focus-visible.js" defer></script>

    <!-- 💁 OPTIONAL: Include prismatic.js for Magic Leap support -->
    <!--<script src="https://unpkg.com/@magicleap/prismatic@0.18.2/prismatic.min.js"></script>-->

  </head>
  <body>
    <!-- etc -->

    <!-- Loads <model-viewer> only on modern browsers: -->
    <script type="module"
        src="https://unpkg.com/@google/model-viewer@0.1.0/dist/model-viewer.js">
    </script>

    <!-- Loads <model-viewer> only on old browsers like IE11: -->
    <script nomodule
        src="https://unpkg.com/@google/model-viewer@0.1.0/dist/model-viewer-legacy.js">
    </script>
  </body>
</html>
```

