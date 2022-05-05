/**
 * @license
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
 *
 */

import { html, render, nothing } from 'lit';
import { spread } from '../components/utils/spread_directive';

describe('spread directive util test', () => {
  let wrapper: HTMLDivElement;
  beforeAll(() => {
    wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
  });

  beforeEach(() => {
    render(nothing, wrapper);
  });

  it('Spread will spread new binds', () => {
    let numTimesListenerCalled = 0;
    const listener = () => {
      numTimesListenerCalled++;
    };
    const template = html`
      <input
        ${spread({
          '?disabled': true,
          value: 'hello',
          '.pattern': '[0123]',
          '@event-name': listener,
        })}
      />
    `;

    render(template, wrapper);
    const input = wrapper.querySelector('input')!;
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.getAttribute('value')).toBe('hello');
    expect(input.pattern).toBe('[0123]');
    expect(numTimesListenerCalled).toBe(0);

    input.dispatchEvent(new Event('event-name'));

    expect(numTimesListenerCalled).toBe(1);
  });

  it('Spread will mutate binds if changed', () => {
    let numTimesListener1Called = 0;
    const listener1 = () => {
      numTimesListener1Called++;
    };
    let numTimesListener2Called = 0;
    const listener2 = () => {
      numTimesListener2Called++;
    };
    const getTemplate = (binds: {}) => html` <input ${spread(binds)} /> `;

    let template = getTemplate({
      '?disabled': true,
      value: 'hello',
      '.pattern': '[0123]',
      '@event-name': listener1,
    });

    render(template, wrapper);
    const input = wrapper.querySelector('input')!;
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.getAttribute('value')).toBe('hello');
    expect(input.pattern).toBe('[0123]');
    expect(numTimesListener1Called).toBe(0);

    input.dispatchEvent(new Event('event-name'));

    expect(numTimesListener1Called).toBe(1);

    template = getTemplate({
      '?disabled': false,
      value: 'world',
      '.pattern': '[01234]',
      '@event-name': listener2,
    });

    render(template, wrapper);

    expect(input.hasAttribute('disabled')).toBe(false);
    expect(input.getAttribute('value')).toBe('world');
    expect(input.pattern).toBe('[01234]');
    expect(numTimesListener1Called).toBe(1);
    expect(numTimesListener2Called).toBe(0);

    input.dispatchEvent(new Event('event-name'));

    expect(numTimesListener1Called).toBe(1);
    expect(numTimesListener2Called).toBe(1);
  });

  it('Spread will not mutate binds if not changed', () => {
    let numTimesListener1Called = 0;
    const listener1 = () => {
      numTimesListener1Called++;
    };
    const getTemplate = (binds: {}) => html` <input ${spread(binds)} /> `;

    let template = getTemplate({
      '?disabled': true,
      value: 'hello',
      '@event-name': listener1,
    });

    render(template, wrapper);
    const input = wrapper.querySelector('input')!;

    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.getAttribute('value')).toBe('hello');
    expect(numTimesListener1Called).toBe(0);

    input.dispatchEvent(new Event('event-name'));

    expect(numTimesListener1Called).toBe(1);

    let setAttributeArgs: [string, string] | [null, null] = [null, null];
    input.setAttribute = (name: string, value: string) => {
      setAttributeArgs = [name, value];
    };

    let addEventListenerArgs: [string, EventListener] | [null, null] = [
      null,
      null,
    ];
    input.addEventListener = (name: string, listener: EventListener) => {
      addEventListenerArgs = [name, listener];
    };

    let toggleAttributeArgs: [string, boolean] | [null, null] = [null, null];
    input.toggleAttribute = (name: string, value?: boolean) => {
      toggleAttributeArgs = [name, !!value];
      return !!value;
    };

    template = getTemplate({
      '?disabled': true,
      value: 'hello',
      '@event-name': listener1,
    });

    render(template, wrapper);

    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.getAttribute('value')).toBe('hello');
    expect(numTimesListener1Called).toBe(1);

    input.dispatchEvent(new Event('event-name'));

    expect(numTimesListener1Called).toBe(2);

    expect(setAttributeArgs[0]).toEqual(null);
    expect(setAttributeArgs[1]).toEqual(null);
    expect(addEventListenerArgs[0]).toEqual(null);
    expect(addEventListenerArgs[1]).toEqual(null);
    expect(toggleAttributeArgs[0]).toEqual(null);
    expect(toggleAttributeArgs[1]).toEqual(null);
  });

  it('Spread will remove specific binds if removed', () => {
    let numTimesListener1Called = 0;
    const listener1 = () => {
      numTimesListener1Called++;
    };
    const getTemplate = (binds: {}) => html` <input ${spread(binds)} /> `;

    let template = getTemplate({
      '?disabled': true,
      value: 'hello',
      '.pattern': '[0123]',
      '@event-name': listener1,
    });

    render(template, wrapper);
    const input = wrapper.querySelector('input')!;
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.getAttribute('value')).toBe('hello');
    expect(input.pattern).toBe('[0123]');
    expect(numTimesListener1Called).toBe(0);

    input.dispatchEvent(new Event('event-name'));

    expect(numTimesListener1Called).toBe(1);

    template = getTemplate({});

    render(template, wrapper);

    expect(input.hasAttribute('disabled')).toBe(false);
    expect(input.hasAttribute('value')).toBe(false);
    expect(input.pattern).toBe('[0123]');
    expect(numTimesListener1Called).toBe(1);

    input.dispatchEvent(new Event('event-name'));

    expect(numTimesListener1Called).toBe(1);
  });

  afterEach(() => {
    render(nothing, wrapper);
  });
});
