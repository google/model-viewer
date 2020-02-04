import {Material, Model, PBRMetallicRoughness, RGBA, ThreeDOMElement, ThreeDOMElementMap} from './api.js';
import {ModelKernel} from './api/model-kernel.js';
import {SerializedElementMap, SerializedMaterial, SerializedModel, SerializedPBRMetallicRoughness} from './protocol.js';

export class FakePBRMetallicRoughness implements PBRMetallicRoughness {
  readonly baseColorFactor: RGBA = [0, 0, 0, 1];
  private static count = 0;

  constructor(
      private kernel: ModelKernel, _serialized: SerializedPBRMetallicRoughness,
      readonly name = `fake-pbr-metallic-roughness-${
          FakePBRMetallicRoughness.count++}`) {
  }

  get ownerModel() {
    return this.kernel.model;
  }

  setBaseColorFactor(_value: RGBA) {
    return Promise.resolve();
  }
};

export class FakeMaterial implements Material {
  readonly pbrMetallicRoughness = new FakePBRMetallicRoughness(
      this.kernel, this.serialized.pbrMetallicRoughness);

  private static count = 0;

  constructor(
      private kernel: ModelKernel, private serialized: SerializedMaterial,
      readonly name = `fake-material-${FakeMaterial.count++}`) {
  }

  get ownerModel() {
    return this.kernel.model;
  }
};

export class FakeModel implements Model {
  readonly materials: Readonly<Array<Material>>;
  private static count = 0;

  constructor(
      kernel: ModelKernel, serialized: SerializedModel,
      readonly name = `fake-model-${FakeModel.count++}`) {
    const materials: Material[] = [];
    for (const material of serialized.materials) {
      materials.push(new FakeMaterial(kernel, material));
    }
    this.materials = Object.freeze(materials);
  }
};

export const FakeThreeDOMElementMap = {
  'model': FakeModel,
  'material': FakeMaterial,
  'pbr-metallic-roughness': FakePBRMetallicRoughness
};

export class FakeModelKernel implements ModelKernel {
  readonly model: Model = {} as any;

  async mutate(_element: ThreeDOMElement, _property: string, _value: any):
      Promise<void> {
  }
  deserialize<T extends keyof ThreeDOMElementMap>(
      type: T, serialized: SerializedElementMap[T]): ThreeDOMElementMap[T] {
    const ElementConstructor = FakeThreeDOMElementMap[type];
    const element = new ElementConstructor(this, serialized as any);

    return element as unknown as ThreeDOMElementMap[T];
  }
  getElementsByType<T extends keyof ThreeDOMElementMap>(_type: T):
      Array<ThreeDOMElementMap[T]> {
    return [];
  }
  deactivate(): void {
  }
}