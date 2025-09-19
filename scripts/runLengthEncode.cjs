// @ts-check

const EMPTY_FRAME = /^0\,\d+$/;

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

    if (character === lastCharacter) {
      count++;
      continue;
    }

    encoded += `${lastCharacter},${count},`;

    // prevent immediate breaking
    lastCharacter = character;
    count = 1;
  }

  encoded += `${lastCharacter},${count}`;

  return EMPTY_FRAME.test(encoded) ? "" : encoded;
}

module.exports = { runLengthEncode };
