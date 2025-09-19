// @ts-check

const path = require("path");
const fs = require("fs");
const { Jimp } = require("jimp");
const { execSync } = require("child_process");
const { runLengthEncode } = require("./runLengthEncode.cjs");

const VIDEO_PATH = path.resolve(__dirname, "../src/Bad Apple.mp4");
const OUTPUT = path.resolve(__dirname, `../frames`);
const NUM_FRAMES = 1000;
// in terms of frames. video is 30fps
const START_TIME = 0 / 30;
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
    .map(async (dirent) => {
      const filePath = path.join(dirent.parentPath, dirent.name);
      const buffer = fs.readFileSync(filePath);
      const image = await Jimp.fromBuffer(buffer);

      return image.bitmap.data;
    });

  return await Promise.all(promises);
}

const WHITE = 2;
const BLACK = 1;
const NO_CHANGE = 0;

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
  for (const frame of frames) {
    const pixelCount = DIMENSIONS.x * DIMENSIONS.y;
    let encoded = "";

    for (let i = 0; i < pixelCount; i++) {
      const lightness = getLightness(frame, i);
      const lastFrameLightness = getLightness(lastFrame, i);
      const encodedPixel = lightness > LIGHTNESS_THRESHOLD ? WHITE : BLACK;
      const lastFramePixel =
        lastFrameLightness > LIGHTNESS_THRESHOLD ? WHITE : BLACK;

      encoded += encodedPixel === lastFramePixel ? NO_CHANGE : encodedPixel;
    }

    const compressed = runLengthEncode(encoded);
    encodedFrames.push(compressed);

    lastFrame = frame;
  }

  return encodedFrames;
}

/**
 * @param { Buffer } image
 * @param { number } pixelIndex
 * @returns { number }
 */
function getLightness(image, pixelIndex) {
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
