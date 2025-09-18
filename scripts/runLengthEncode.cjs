// @ts-check

/**
 * @param { string } string
 * @returns { string }
 */
function runLengthEncode(string) {
  // header, which determines parity of 1 and 0s
  let encoded = `${string[0]},`;
  let lastCharacter = string[0];
  let count = 1;

  for (let i = 1; i < string.length; i++) {
    const character = string[i];

    if (character === lastCharacter) {
      count++;
      continue;
    }

    // don't need to append the repeated character since it alternates between 1 and 0
    encoded += `${count},`;

    // prevent immediate breaking
    lastCharacter = character;
    count = 1;
  }

  encoded += `${count}`;
  return encoded;
}

module.exports = { runLengthEncode };
