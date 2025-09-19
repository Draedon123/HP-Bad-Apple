// @ts-check

const path = require("path");
const fs = require("fs");
const { Jimp } = require("jimp");
const { execSync } = require("child_process");
const { runLengthEncode } = require("./runLengthEncode.cjs");

const VIDEO_PATH = path.resolve(__dirname, "../src/Bad Apple.mp4");
const OUTPUT = path.resolve(__dirname, `../frames`);
const NUM_FRAMES = 500;
const START_TIME = 0;
const DIMENSIONS = {
  x: 319,
  y: 239,
};
const LIGHTNESS_THRESHOLD = 200;

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
    .map((dirent) => {
      const filePath = path.join(dirent.parentPath, dirent.name);
      const buffer = fs.readFileSync(filePath);
      const image = Jimp.fromBuffer(buffer);

      return image;
    });

  return await Promise.all(promises);
}

/**
 * @returns { Promise<string[]> }
 */
async function encode() {
  const frames = await extractFrames();
  /** @type { string[] } */
  const encodedFrames = [];

  for (const frame of frames) {
    const pixelCount = frame.width * frame.height;
    let encoded = "";

    for (let i = 0; i < pixelCount; i++) {
      // all pixels are grayscale
      const lightness = frame.bitmap.data[i * 4];
      const encodedPixel = lightness > LIGHTNESS_THRESHOLD ? 1 : 0;

      encoded += encodedPixel;
    }

    const compressed = runLengthEncode(encoded);
    encodedFrames.push(compressed);
  }

  return encodedFrames;
}

module.exports = {
  encode,
};
