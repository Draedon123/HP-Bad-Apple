// @ts-check

const { encode } = require("./encodeBadApple.cjs");
const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.resolve(__dirname, "../build.hpppl");
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

  const joinedFrames = frames.map((frame) => `{${frame}}`).join(",");
  const framesAsList = `CONST FRAMES := {${joinedFrames}};\n`;

  fs.writeFileSync(OUTPUT_FILE, framesAsList + sourceFiles);
}

main();
