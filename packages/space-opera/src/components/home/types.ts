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

export const CARD_CONTENT = {
  save: {
    iconForDark:
        'https://fonts.gstatic.com/s/i/materialiconsextended/import_export/v6/white-24dp/1x/baseline_import_export_white_24dp.png',
    iconForLight:
        'https://fonts.gstatic.com/s/i/materialiconsextended/import_export/v6/black-24dp/1x/baseline_import_export_black_24dp.png',
    header: 'Import/ Export',
    body: 'Import or export GLB models as well as model-viewer HTML snippets.'
  },
  edit: {
    iconForDark:
        'https://fonts.gstatic.com/s/i/googlematerialicons/create/v6/white-24dp/1x/gm_create_white_24dp.png',
    iconForLight:
        'https://fonts.gstatic.com/s/i/materialiconsextended/create/v6/black-24dp/1x/baseline_create_black_24dp.png',
    header: 'Edit',
    body:
        'Adjust <model-viewer>\'s parameters for lighting, hotspots, and posters.'
  },
  camera: {
    iconForDark:
        'https://fonts.gstatic.com/s/i/materialiconsextended/photo_camera/v6/white-24dp/1x/baseline_photo_camera_white_24dp.png',
    iconForLight:
        'https://fonts.gstatic.com/s/i/materialiconsextended/photo_camera/v6/black-24dp/1x/baseline_photo_camera_black_24dp.png',
    header: 'Camera',
    body:
        'Adjust <model-viewer>\'s camera parameters for interactivity, rotation, and targets.'
  },
  materials: {
    iconForDark:
        'https://fonts.gstatic.com/s/i/materialiconsextended/color_lens/v7/white-24dp/1x/baseline_color_lens_white_24dp.png',
    iconForLight:
        'https://fonts.gstatic.com/s/i/materialiconsextended/color_lens/v7/black-24dp/1x/baseline_color_lens_black_24dp.png',
    header: 'Materials',
    body:
        'Modify GLB materials such as base color, roughness, normal maps, etc.'
  },
  inspector: {
    iconForDark:
        'https://fonts.gstatic.com/s/i/materialiconsextended/search/v7/white-24dp/1x/baseline_search_white_24dp.png',
    iconForLight:
        'https://fonts.gstatic.com/s/i/materialiconsextended/search/v7/black-24dp/1x/baseline_search_black_24dp.png',
    header: 'Inspector',
    body: 'Visualize the model\'s JSON string.'
  }
};

export interface CardContentInterface {
  iconForDark?: string;
  iconForLight?: string;
  header?: string;
  body?: string;
}

interface CSSAttributes {
  cardBackground: string;
  cardBorder: string;
  expandableSectionText: string;
  expandableSectionHeaderBackground: string;
  expandableSectionHeaderHover: string;
  textOnExpandableBackground: string;
  expandableSectionBackground: string;
  secondaryTextOnExpandbleBackground: string;
  dropdownBackground: string;
  numberInputBackground: string;
}

interface ThemeInterface {
  dark: CSSAttributes;
  light: CSSAttributes;
}

export const THEMES: ThemeInterface = {
  dark: {
    cardBackground: '#3c4043',
    cardBorder: '#2b2d30',
    expandableSectionText: '#EEEEEE',
    expandableSectionHeaderBackground: '#111111',
    expandableSectionHeaderHover: '#424242',
    textOnExpandableBackground: '#F5F5F5',
    expandableSectionBackground: '#2b2d30',
    secondaryTextOnExpandbleBackground: '#E0E0E0',
    dropdownBackground: '#212121',
    numberInputBackground: '#212121',
  },
  light: {
    cardBackground: '#FFFFFF',
    cardBorder: '#E0E0E0',
    expandableSectionText: '#212121',
    expandableSectionHeaderBackground: '#EEEEEE',
    expandableSectionHeaderHover: '#BDBDBD',
    textOnExpandableBackground: '#212121',
    expandableSectionBackground: '#FFFFFF',
    secondaryTextOnExpandbleBackground: '#424242',
    dropdownBackground: '#F5F5F5',
    numberInputBackground: '#F5F5F5',
  }
}
