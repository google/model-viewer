/* @license
 * Copyright 2022 Google LLC. All Rights Reserved.
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
 */
import {
  directive,
  Directive,
  DirectiveParameters,
  ElementPart,
  PartInfo,
  PartType,
} from 'lit/directive.js';

const Binding = {
  ATTRIBUTE: 'ATTRIBUTE' as 'ATTRIBUTE',
  PROPERTY: 'PROPERTY' as 'PROPERTY',
  BOOLEAN_ATTRIBUTE: 'BOOLEAN_ATTRIBUTE' as 'BOOLEAN_ATTRIBUTE',
  EVENT: 'EVENT' as 'EVENT',
};

type Binding = keyof typeof Binding;

class Spread extends Directive {
  oldBinds: { [bind: string]: unknown } = {};

  constructor(info: PartInfo) {
    super(info);

    if (info.type !== PartType.ELEMENT) {
      throw new Error(`spread directive can only be used on element parts.`);
    }
  }

  update(part: ElementPart, [binds]: DirectiveParameters<this>) {
    const newEntires = Object.entries(binds);
    this.oldBinds.hasOwnProperty('$spread');
    for (const [bind, value] of newEntires) {
      const [bindKind, bindName] = this.parseBind(bind);

      if (this.oldBinds.hasOwnProperty(bind)) {
        this.handleExistingBind(part, bind, bindName, value, bindKind);
      } else {
        this.handleNewBind(part, bindName, value, bindKind);
      }
    }

    const oldEntries = Object.entries(this.oldBinds);

    for (const [bind, value] of oldEntries) {
      const [bindKind, bindName] = this.parseBind(bind);
      if (!binds.hasOwnProperty(bind)) {
        this.handleRemovedBind(part, bindName, value, bindKind);
      }
    }

    this.oldBinds = {...binds};
  }

  handleExistingBind(
    part: ElementPart,
    bind: string,
    bindName: string,
    value: unknown,
    bindKind: Binding
  ) {
    const hasBindChanged = this.oldBinds[bind] !== value;

    if (!hasBindChanged) {
      return;
    }

    if (bindKind === Binding.EVENT) {
      part.element.removeEventListener(
        bindName,
        this.oldBinds[bind] as EventListener
      );
    }

    this.handleNewBind(part, bindName, value, bindKind);

    return;
  }

  handleNewBind(
    part: ElementPart,
    bindName: string,
    value: unknown,
    bindKind: Binding
  ) {
    switch (bindKind) {
      case Binding.ATTRIBUTE:
        part.element.setAttribute(bindName, value as string);
        break;
      case Binding.PROPERTY:
        part.element[bindName] = value;
        break;
      case Binding.BOOLEAN_ATTRIBUTE:
        part.element.toggleAttribute(bindName, !!value);
        break;
      case Binding.EVENT:
        part.element.addEventListener(bindName, value as EventListener);
        break;
    }
  }

  handleRemovedBind(
    part: ElementPart,
    bindName: string,
    value: unknown,
    bindKind: Binding
  ) {
    switch (bindKind) {
      case Binding.ATTRIBUTE:
      case Binding.BOOLEAN_ATTRIBUTE:
        part.element.removeAttribute(bindName);
        break;
      case Binding.EVENT:
        part.element.removeEventListener(bindName, value as EventListener);
        break;
      case Binding.PROPERTY:
        break;
    }
  }

  parseBind(bind: string): [Binding, string] {
    const firstChar = bind[0];
    switch (firstChar) {
      case '@':
        return [Binding.EVENT, bind.slice(1)];
      case '.':
        return [Binding.PROPERTY, bind.slice(1)];
      case '?':
        return [Binding.BOOLEAN_ATTRIBUTE, bind.slice(1)];
      default:
        return [Binding.ATTRIBUTE, bind];
    }
  }

  render(binds: { [bind: string]: unknown }) {
    this.oldBinds = {...binds};
  }
}

export const spread = directive(Spread);
export type { Spread };
