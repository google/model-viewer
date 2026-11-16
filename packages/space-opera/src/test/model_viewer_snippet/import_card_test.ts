/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';
import {expect} from 'chai';

import {ModelViewerPreview} from '../../components/model_viewer_preview/model_viewer_preview.js';
import {getModel} from '../../components/model_viewer_preview/reducer.js';
import {ImportCard} from '../../components/model_viewer_snippet/components/open_button.js';
import {resolveExternalResource} from '../../components/utils/resolve_resource.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';

suite('import card', () => {
  let preview: ModelViewerPreview;
  let importCard: ImportCard;
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

  setup(async () => {
    reduxStore.dispatch(dispatchReset());
    preview = new ModelViewerPreview();
    document.body.appendChild(preview);
    await preview.updateComplete;
    importCard = new ImportCard();
  });

  teardown(() => {
    ModelViewerElement.mapURLs((url) => url);
    if (preview.gltfUrl) {
      URL.revokeObjectURL(preview.gltfUrl);
    }
    preview.remove();
  });

  async function upload(
      modelPath: string,
      uri: string,
      bufferPath?: string,
      images: Array<{uri: string, path: string}> = []) {
    const model = {
      asset: {version: '2.0'},
      scene: 0,
      scenes: [{nodes: [0]}],
      nodes: [{mesh: 0}],
      meshes: [{
        primitives: Array.from(
            {length: Math.max(images.length, 1)},
            (_, index) => ({
              attributes: {POSITION: 0},
              ...(images.length ? {material: index} : {})
            }))
      }],
      ...(images.length ? {
        images: images.map(({uri}) => ({uri})),
        textures: images.map((_, source) => ({source})),
        materials: images.map(
            (_, index) => ({pbrMetallicRoughness: {baseColorTexture: {index}}}))
      } :
                          {}),
      accessors: [{
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [1, 1, 0]
      }],
      bufferViews: [{buffer: 0, byteLength: positions.byteLength}],
      buffers: [{uri, byteLength: positions.byteLength}]
    };
    const files = new Map<string, File>([[
      modelPath,
      new File([JSON.stringify(model)], modelPath.split('/').pop()!)
    ]]);
    if (bufferPath) {
      files.set(
          bufferPath, new File([positions], bufferPath.split('/').pop()!));
    }
    if (images.length) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      for (const [index, {path}] of images.entries()) {
        context.fillStyle = index === 0 ? 'red' : 'blue';
        context.fillRect(0, 0, 1, 1);
        const png = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!));
        });
        files.set(path, new File([png], path.split('/').pop()!));
      }
    }
    const failed = new Promise<never>((_, reject) => {
      preview.modelViewer.addEventListener(
          'error',
          () => reject(new Error(`Failed to load ${modelPath}`)),
          {once: true});
    });
    await importCard.onUpload(files);
    await preview.updateComplete;
    await Promise.race([preview.loadComplete, failed]);
    expect(preview.modelViewer.loaded).to.equal(true);
    const resource = await resolveExternalResource(
        uri, getModel(reduxStore.getState()).rootPath!, files);
    expect(resource).to.deep.equal(new Uint8Array(positions.buffer));
    for (const image of images) {
      const texture = await resolveExternalResource(
          image.uri, getModel(reduxStore.getState()).rootPath!, files);
      expect(texture).to.deep.equal(
          new Uint8Array(await files.get(image.path)!.arrayBuffer()));
    }
    expect(getModel(reduxStore.getState()).thumbnailsById!.size)
        .to.equal(images.length);
    expect(preview.modelViewer.getDimensions().x).to.equal(1);
    expect(getModel(reduxStore.getState()).rootPath)
        .to.equal(modelPath.slice(0, modelPath.lastIndexOf('/') + 1));
  }

  for (const {name, modelPath, uri, bufferPath} of
           [{
             name: 'a dropped directory',
             modelPath: '/folder/model.gltf',
             uri: 'data/buffer.bin',
             bufferPath: '/folder/data/buffer.bin'
           },
            {
              name: 'a sibling buffer',
              modelPath: 'model.gltf',
              uri: 'buffer.bin',
              bufferPath: 'buffer.bin'
            },
            {
              name: 'a child folder',
              modelPath: 'folder/model.gltf',
              uri: 'data/buffer.bin',
              bufferPath: 'folder/data/buffer.bin'
            },
            {
              name: 'a parent folder',
              modelPath: 'folder/model.gltf',
              uri: '../data/buffer.bin',
              bufferPath: 'data/buffer.bin'
            },
            {
              name: 'raw UTF-8 paths',
              modelPath: '모델/model.gltf',
              uri: '你好/안녕하세요.bin',
              bufferPath: '모델/你好/안녕하세요.bin'
            },
            {
              name: 'percent-encoded UTF-8 paths',
              modelPath: '모델/model.gltf',
              uri: encodeURI('你好/안녕하세요.bin'),
              bufferPath: '모델/你好/안녕하세요.bin'
            },
            {
              name: 'encoded reserved characters',
              modelPath: 'models #1/model.gltf',
              uri: 'data/' + encodeURIComponent('100% #1?.bin'),
              bufferPath: 'models #1/data/100% #1?.bin'
            },
            {
              name: 'dot segments',
              modelPath: 'folder/model.gltf',
              uri: './data/../buffer.bin',
              bufferPath: 'folder/buffer.bin'
            },
            {
              name: 'the model filename in a folder name',
              modelPath: 'model.gltf/assets/model.gltf',
              uri: 'buffer.bin',
              bufferPath: 'model.gltf/assets/buffer.bin'
            }]) {
    test(`loads ${name}`, async () => {
      await upload(modelPath, uri, bufferPath);
    });
  }

  test('loads percent-encoded UTF-8 textures', async () => {
    await upload('모델/model.gltf', 'buffer.bin', '모델/buffer.bin', [
      {uri: encodeURI('이미지/你好.png'), path: '모델/이미지/你好.png'}
    ]);
  });

  test(
      'keeps textures with the same filename in different folders distinct',
      async () => {
        await upload('model.gltf', 'buffer.bin', 'buffer.bin', [
          {uri: 'first/color.png', path: 'first/color.png'},
          {uri: 'second/color.png', path: 'second/color.png'}
        ]);
      });

  test('keeps data URIs intact', async () => {
    const binary = String.fromCharCode(...new Uint8Array(positions.buffer));
    await upload(
        'model.gltf', 'data:application/octet-stream;base64,' + btoa(binary));
  });

  test('keeps blob URIs intact', async () => {
    const bufferUrl = URL.createObjectURL(new Blob([positions]));
    try {
      await upload('model.gltf', bufferUrl);
    } finally {
      URL.revokeObjectURL(bufferUrl);
    }
  });
});
