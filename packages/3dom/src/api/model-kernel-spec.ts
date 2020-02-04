import {ConstructedWithArguments, Constructor, Material, Model, PBRMetallicRoughness, RGBA} from '../api.js';
import {SerializedMaterial, SerializedModel, SerializedPBRMetallicRoughness} from '../protocol.js';
import {getLocallyUniqueId} from '../utilities.js';

import {defineModelKernel, ModelKernel, ModelKernelConstructor} from './model-kernel.js';

suite('model-kernel', () => {
  suite('defineModelKernel', () => {
    let FakeModel: Constructor<Model>&
        ConstructedWithArguments<[ModelKernel, SerializedModel]>;
    let FakeMaterial: Constructor<Material>&
        ConstructedWithArguments<[ModelKernel, SerializedMaterial]>;
    let FakePBRMetallicRoughness: Constructor<PBRMetallicRoughness>&
        ConstructedWithArguments<[ModelKernel, SerializedPBRMetallicRoughness]>;
    let ModelKernel: ModelKernelConstructor;

    setup(() => {
      (() => {
        let count = 0;
        FakePBRMetallicRoughness = class implements PBRMetallicRoughness {
          readonly baseColorFactor: RGBA = [0, 0, 0, 1];

          constructor(
              private kernel: ModelKernel,
              _serialized: SerializedPBRMetallicRoughness,
              readonly name = `fake-pbr-metallic-roughness-${++count}`) {
          }

          get ownerModel() {
            return this.kernel.model;
          }

          setBaseColorFactor(_value: RGBA) {
            return Promise.resolve();
          }
        };
      })();

      (() => {
        let count = 0;
        FakeMaterial = class implements Material {
          readonly pbrMetallicRoughness = new FakePBRMetallicRoughness(
              this.kernel, this.serialized.pbrMetallicRoughness);

          constructor(
              private kernel: ModelKernel,
              private serialized: SerializedMaterial,
              readonly name = `fake-material-${++count}`) {
          }

          get ownerModel() {
            return this.kernel.model;
          }
        };
      })();

      (() => {
        let count = 0;
        FakeModel = class implements Model {
          readonly materials: Readonly<Array<Material>>;
          constructor(
              kernel: ModelKernel, serialized: SerializedModel,
              readonly name = `fake-model-${++count}`) {
            const materials: Material[] = [];
            for (const material of serialized.materials) {
              materials.push(new FakeMaterial(kernel, material));
            }
            this.materials = Object.freeze(materials);
          }
        };
      })();

      ModelKernel =
          defineModelKernel(FakeModel, FakeMaterial, FakePBRMetallicRoughness);
    });

    suite('ModelKernel', () => {
      test('deserializes a sparse, serialized model', () => {
        const channel = new MessageChannel();

        const kernel = new ModelKernel(
            channel.port1,
            {materials: [], modelUri: '', id: getLocallyUniqueId()});

        expect(kernel.model).to.be.ok;
        expect(kernel.model.materials).to.be.ok;
        expect(kernel.model.materials.length).to.be.equal(0);

        kernel.deactivate();
      });

      suite('with a Model cntaining a Material', () => {
        let kernel: ModelKernel;

        setup(() => {
          const channel = new MessageChannel();
          kernel = new ModelKernel(channel.port1, {
            id: getLocallyUniqueId(),
            materials: [{
              id: getLocallyUniqueId(),
              pbrMetallicRoughness: {
                id: getLocallyUniqueId(),
                baseColorFactor: [0, 0, 0, 1] as RGBA
              }
            }],
            modelUri: ''
          });
        });

        teardown(() => {
          kernel.deactivate();
        });

        test('creates a corresponding deserialized material', () => {
          expect(kernel.model.materials.length).to.be.equal(1);
          expect(kernel.model.materials[0]).to.be.ok;
          expect(kernel.model.materials[0].pbrMetallicRoughness).to.be.ok;
        });
      });
    });
  });
});