// @ts-check

const EMPTY_FRAME = /^0,\d+$/;
// 160 removes all control characters, but apparently U+00A0 (160 in decimal) can't be used either?
const OFFSET = 161;
// stop before surrogate characters
const MAX_COUNT = 0xd7ff - OFFSET;

/**
 * @param { string } string
 * @returns { string }
 */
function runLengthEncode(string) {
  let encoded = "";
  let lastCharacter = string[0];
  let count = 1;

  for (let i = 1; i < string.length; i++) {
    const character = string[i];

    if (character === lastCharacter && count < MAX_COUNT) {
      count++;
      continue;
    }

    encoded += encodePair(lastCharacter, count);

    lastCharacter = character;
    count = 1;
  }

  // don't need to repeat 0's on the end in this case since they represent no change
  if (lastCharacter !== "0") {
    encoded += encodePair(lastCharacter, count);
  }

  return EMPTY_FRAME.test(encoded) ? "" : encoded;
}

/**
 * @param { string } character
 * @param { number } count
 * @returns { string }
 */
function encodePair(character, count) {
  return `${String.fromCodePoint(parseInt(character) + OFFSET)}${String.fromCodePoint(count + OFFSET)}`;
}

module.exports = {
  runLengthEncode,
  OFFSET,
};
