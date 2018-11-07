import ARRenderer from '../../three-components/ARRenderer.js';
import ModelScene from '../../three-components/ModelScene.js';
import {$arRenderer} from '../../three-components/Renderer.js';
import XRModelElementBase, {$renderer} from '../../xr-model-element-base.js';

const expect = chai.expect;

customElements.define('xr-model-element', XRModelElementBase);

suite('ARRenderer', () => {
  let element;
  let scene;
  let renderer;
  let arRenderer;

  setup(() => {
    element = new XRModelElementBase();
    renderer = element[$renderer];
    arRenderer = renderer[$arRenderer];
  });

  teardown(() => {
    renderer.scenes.clear();
  });

  // NOTE(cdata): It will be a notable day when this test fails
  test('does not support presenting to AR on any browser', async () => {
    expect(await arRenderer.supportsPresentation()).to.be.equal(false);
  });

  test('is not presenting if present has not been invoked', () => {
    expect(arRenderer.isPresenting).to.be.equal(false);
  });
});
