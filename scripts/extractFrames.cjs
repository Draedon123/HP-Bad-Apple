const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { Jimp } = require("jimp");

const VIDEO_PATH = path.resolve(__dirname, "../src/Bad Apple.mp4");
const OUTPUT = path.resolve(__dirname, `../frames`);
const NUM_FRAMES = Infinity;
// in terms of frames. video is 30fps
const START_TIME = 0 / 30;
const DIMENSIONS = {
  x: 320,
  y: 240,
};

async function extractFrames() {
  const option = process.argv[2];

  if (option === "-genframes") {
    if (fs.existsSync(OUTPUT)) {
      console.log("Clearing frames directory");
      fs.rmSync(OUTPUT, { recursive: true });
    }

    fs.mkdirSync(OUTPUT);
    console.log("Extracting frames\n");
    const framesParameter =
      NUM_FRAMES === Infinity ? "" : `-frames:v ${NUM_FRAMES}`;

    execSync(
      `cd frames && ffmpeg -ss ${START_TIME} -i "${VIDEO_PATH}" -s ${DIMENSIONS.x}x${DIMENSIONS.y} -f image2 ${framesParameter} frame-%03d.jpeg`
    );
  }

  console.log("\nLoading frames");

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

/**
 * @param { string } path
 * @returns { number }
 */
function frameNumberFromPath(path) {
  // "frame-10.jpeg" -> ["frame", "10", "jpeg"] -> 10
  return parseInt(path.split(/-|\./)[1]);
}

module.exports = {
  extractFrames,
};
