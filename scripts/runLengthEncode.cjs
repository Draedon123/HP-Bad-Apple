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

    lastCharacter = character;
    count = 1;
  }

  // don't need to repeat 0's on the end in this case since they represent no change
  if (lastCharacter !== "0") {
    encoded += `${lastCharacter},${count}`;
  } else {
    // remove trailing comma
    encoded = encoded.slice(0, -1);
  }

  return EMPTY_FRAME.test(encoded) ? "" : encoded;
}

module.exports = { runLengthEncode };
