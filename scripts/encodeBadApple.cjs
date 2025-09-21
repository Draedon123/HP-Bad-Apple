// @ts-check

const { Jimp } = require("jimp");
const { extractFrames } = require("./extractFrames.cjs");
const { runLengthEncode, OFFSET } = require("./runLengthEncode.cjs");

const LIGHTNESS_THRESHOLD = 64;
const DIMENSIONS = {
  x: 320,
  y: 240,
};

const NO_CHANGE = 0;
const BLACK = 1;
const WHITE = 2;

const HORIZONTAL = 0;
const VERTICAL = 1;

/**
 * @returns { Promise<string[]> }
 */
async function encode() {
  const frames = await extractFrames();
  /** @type { string[] } */
  const encodedFrames = [];

  let lastFrame = new Jimp({
    width: DIMENSIONS.x,
    height: DIMENSIONS.y,
    color: "#000",
  }).bitmap.data;

  console.log("Encoding frames");

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const directions = {
      [HORIZONTAL]: encodeFrame(frame, lastFrame, HORIZONTAL),
      [VERTICAL]: encodeFrame(frame, lastFrame, VERTICAL),
    };

    const betterDirection =
      directions[HORIZONTAL].drawCalls <= directions[VERTICAL].drawCalls
        ? HORIZONTAL
        : VERTICAL;
    const compressed = runLengthEncode(directions[betterDirection].encoded);
    const encodedDirection = String.fromCodePoint(betterDirection + OFFSET);
    encodedFrames.push(
      compressed === "" ? encodedDirection : `${encodedDirection}${compressed}`
    );

    lastFrame = frame;
  }

  return encodedFrames;
}

const PIXEL_COUNT = DIMENSIONS.x * DIMENSIONS.y;
/**
 * @param { Buffer } frame
 * @param { Buffer } lastFrame
 * @param { typeof HORIZONTAL | typeof VERTICAL } direction
 * @returns { { encoded: string, drawCalls: number } }
 */
function encodeFrame(frame, lastFrame, direction) {
  let encoded = "";
  let drawCalls = 0;
  let lastPixelValue = -1;

  for (let i = 0; i < PIXEL_COUNT; i++) {
    const lightness = getLightness(frame, i, direction);
    const lastFrameLightness = getLightness(lastFrame, i, direction);
    const encodedPixel = lightness > LIGHTNESS_THRESHOLD ? WHITE : BLACK;
    const lastFramePixel =
      lastFrameLightness > LIGHTNESS_THRESHOLD ? WHITE : BLACK;
    const delta = encodedPixel === lastFramePixel ? NO_CHANGE : encodedPixel;

    if (delta !== lastPixelValue) {
      drawCalls++;
      lastPixelValue = delta;
    }

    encoded += delta;
  }

  return { encoded, drawCalls };
}

/**
 * @param { Buffer } image
 * @param { number } pixelIndex
 * @param { typeof HORIZONTAL | typeof VERTICAL } indexDirection
 * @returns { number }
 */
function getLightness(image, pixelIndex, indexDirection) {
  if (indexDirection === VERTICAL) {
    pixelIndex =
      (pixelIndex % DIMENSIONS.y) * DIMENSIONS.x +
      Math.floor(pixelIndex / DIMENSIONS.y);
  }

  return (
    (image[pixelIndex * 4] +
      image[pixelIndex * 4 + 1] +
      image[pixelIndex * 4 + 2]) /
    3
  );
}

module.exports = {
  encode,
};
