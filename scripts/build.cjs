// @ts-check

const { encode } = require("./encodeBadApple.cjs");
const fs = require("fs");
const path = require("path");

const HPPPL_OUTPUT = path.resolve(__dirname, "../Bad Apple.hpppl");
const FRAME_DATA = path.resolve(__dirname, "../assets/frames.txt");
const SOURCE_DIRECTORY = path.resolve(__dirname, "../src");

async function main() {
  const frames = await encode();

  const sourceFiles = fs
    .readdirSync(SOURCE_DIRECTORY, {
      recursive: true,
      withFileTypes: true,
    })
    .filter((dirent) => dirent.name.endsWith(".hpppl"))
    .map((dirent) =>
      fs.readFileSync(path.join(dirent.parentPath, dirent.name), {
        encoding: "utf-8",
      })
    )
    .join("\n");

  const joinedFramesHPPPL = frames.map((frame) => `"${frame}"`).join(",");
  const joinedFramesJS = frames.join("\n");
  const framesAsList = `CONST FRAMES := {${joinedFramesHPPPL}};\n`;

  fs.writeFileSync(HPPPL_OUTPUT, framesAsList + sourceFiles, {
    encoding: "utf-8",
  });

  fs.writeFileSync(FRAME_DATA, joinedFramesJS, {
    encoding: "utf-8",
  });
}

main();
