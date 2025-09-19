// @ts-check

const path = require("path");
const fs = require("fs");
const { Jimp } = require("jimp");
const { execSync } = require("child_process");
const { runLengthEncode } = require("./runLengthEncode.cjs");

const VIDEO_PATH = path.resolve(__dirname, "../src/Bad Apple.mp4");
const OUTPUT = path.resolve(__dirname, `../frames`);
const LOG_PATH = path.resolve(__dirname, "../frameData.txt");
const NUM_FRAMES = 1000;
// in terms of frames. video is 30fps
const START_TIME = 140 / 30;
const DIMENSIONS = {
  x: 319,
  y: 239,
};
const LIGHTNESS_THRESHOLD = 127;

async function extractFrames() {
  if (fs.existsSync(OUTPUT)) {
    console.log("Clearing frames directory");
    fs.rmSync(OUTPUT, { recursive: true });
  }

  fs.mkdirSync(OUTPUT);
  console.log("Cleared frames directory");

  console.log("Extracting frames\n");
  const framesParameter =
    NUM_FRAMES === Infinity ? "" : `-frames:v ${NUM_FRAMES}`;
  execSync(
    `cd frames && ffmpeg -ss ${START_TIME} -i "${VIDEO_PATH}" -s ${DIMENSIONS.x}x${DIMENSIONS.y} -f image2 ${framesParameter} frame-%03d.jpeg`
  );
  console.log("\nFrames extracted");

  const promises = fs
    .readdirSync(OUTPUT, { withFileTypes: true })
    .sort((a, b) => frameNumberFromPath(a.name) - frameNumberFromPath(b.name))
    .map(async (dirent) => {
      const filePath = path.join(dirent.parentPath, dirent.name);
      const buffer = fs.readFileSync(filePath);
      const image = await Jimp.fromBuffer(buffer);

      return image.bitmap.data;
    });

  return await Promise.all(promises);
}

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

  fs.writeFileSync(LOG_PATH, "");

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
    encodedFrames.push(
      compressed === ""
        ? betterDirection.toString()
        : `${betterDirection},${compressed}`
    );

    fs.appendFileSync(
      LOG_PATH,
      [
        `Frame ${i + 1}:`,
        betterDirection === HORIZONTAL ? "H" : "V",
        directions[betterDirection].drawCalls,
        compressed.length,
        compressed,
      ].join(" ") + "\n"
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

  for (let j = 0; j < PIXEL_COUNT; j++) {
    const lightness = getLightness(frame, j, direction);
    const lastFrameLightness = getLightness(lastFrame, j, direction);
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

/**
 * @param { string } path
 * @returns { number }
 */
function frameNumberFromPath(path) {
  // "frame-10.jpeg" -> ["frame", "10", "jpeg"] -> 10
  return parseInt(path.split(/-|\./)[1]);
}

module.exports = {
  encode,
};
