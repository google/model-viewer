export interface ValueNode {
  type: 'value';
  value: string|number|null;
  unit: string|null;
}

/**
 * Parses input strings that are a series of whitespace-separated CSS-like value
 * expressions. Expressions in such strings include values such as:
 *
 *  - A color e.g., red or #8800ff
 *  - A named orientation e.g., center
 *  - A length e.g., 25px or 1m
 *
 * Some example value strings:
 *
 *  - 0 10px 100px
 *  - red green 100%
 *  - 180deg 3rad
 *  - 1em
 *
 * NOTE(cdata): CSS function values currently not supported, so no rgb(...) etc.
 */
export const parseValues = (valuesString: string): Array<ValueNode> => {
  return whitespaceSplit(valuesString.trim())
      .map(valueString => parseAtomicValue(valueString));
};

const parseAtomicValue = (valueString: string): ValueNode => {
  const value = extractValue(valueString);
  const unit = (value != null ? valueString.replace(value, '') : null) || null;

  return {type: 'value', value, unit};
};

const extractValue = (() => {
  const VALUE_RE = /^(([^-^.^0-9].*)|([-]?[0-9.]+))/;

  return (inputString: string): string|null => {
    const match = inputString.match(VALUE_RE);
    return match ? match[0] : null;
  };
})();

const whitespaceSplit = (() => {
  const WHITESPACE_RE = /\s+/g;

  return (inputString: string) => {
    if (!inputString) {
      return [];
    }

    return inputString.split(WHITESPACE_RE);
  };
})();
