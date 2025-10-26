import "./style.css";

const FPS = 30;
const FRAME_TIME = 1 / FPS;

const NO_CHANGE = 0;
const BLACK = 1;
// const WHITE = 2;

const HORIZONTAL = 0;
// const VERTICAL = 1;

const DIMENSIONS_X = 320;
const DIMENSIONS_Y = 160;

const OFFSET = 161;

const FRAME_DATA_SIZE_MB = 18.67;

async function main(): Promise<void> {
  const loadingElement = document.getElementById("loading") as HTMLSpanElement;
  let totalResourceSize = 0;

  const rawFramesData = await streamText(
    `${import.meta.env.BASE_URL}/frames.txt`,
    (_, buffer) => {
      if (buffer === null) {
        return;
      }

      const size_mb = buffer.byteLength / 1024 / 1024;
      totalResourceSize += size_mb;

      loadingElement.textContent = `Loading... (${totalResourceSize.toFixed(2)}/${FRAME_DATA_SIZE_MB}mb)`;
    }
  );

  const FRAMES = rawFramesData.split("\n");

  const audio = document.querySelector("audio") as HTMLAudioElement;
  const canvas = document.getElementById("main") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  if (ctx === null) {
    throw new Error("Could not get 2D Canvas Rendering Context");
  }

  RECT_P(0, 0, canvas.width, canvas.height, "black");

  loadingElement.textContent =
    "Click Space to start/pause (has audio). YouTube Demos below";
  loadingElement.style.color = "white";

  let frame = 1;
  let timeout: NodeJS.Timeout | null = null;

  document.addEventListener("keydown", async (event) => {
    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();
    loadingElement.remove();

    if (timeout === null) {
      await start();
    } else {
      stop();
    }
  });

  let expected = 0;
  async function start(): Promise<void> {
    if (frame >= FRAMES.length) {
      frame = 1;
    }

    audio.currentTime = (frame - 1) * FRAME_TIME;
    await audio.play();
    expected = performance.now() + FRAME_TIME * 1000;

    function step() {
      if (frame > FRAMES.length) {
        clearTimeout(timeout as NodeJS.Timeout);
        timeout = null;
        return;
      }

      const drift = performance.now() - expected;
      if (drift > FRAME_TIME * 1000) {
        audio.currentTime = (frame - 1) * FRAME_TIME;
        expected = performance.now();
      }
      expected += FRAME_TIME * 1000;

      renderFrame(frame);
      frame++;

      timeout = setTimeout(step, Math.max(0, FRAME_TIME * 1000 - drift));
    }

    timeout = setTimeout(step, FRAME_TIME * 1000);
  }

  function stop(): void {
    audio.pause();

    clearTimeout(timeout as NodeJS.Timeout);
    timeout = null;
  }

  function renderFrame(frame: number) {
    const frameData = FRAMES[frame - 1];
    const frameDataLength = (frameData.length - 1) / 2;
    const direction = frameData.charCodeAt(0) - OFFSET;
    const sideLength = direction === HORIZONTAL ? DIMENSIONS_X : DIMENSIONS_Y;

    let major = 0;
    let minor = 0;

    for (let i = 0; i < frameDataLength; i++) {
      const delta = frameData.charCodeAt(i * 2 + 1) - OFFSET;
      let chunkSize = frameData.charCodeAt(i * 2 + 2) - OFFSET;

      if (delta === NO_CHANGE) {
        major += chunkSize;

        if (major >= sideLength) {
          minor += Math.floor(major / sideLength);
          major %= sideLength;
        }

        continue;
      }

      while (chunkSize > 0) {
        const usableChunkSize = Math.min(sideLength - major, chunkSize);
        const colour = delta === BLACK ? "black" : "white";

        if (direction === HORIZONTAL) {
          RECT_P(major, minor, major + usableChunkSize - 1, minor, colour);
        } else {
          RECT_P(minor, major, minor, major + usableChunkSize - 1, colour);
        }

        chunkSize -= usableChunkSize;
        major += usableChunkSize;

        if (major == sideLength) {
          minor++;
          major = 0;
        }
      }
    }
  }

  function RECT_P(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    colour: string
  ): void {
    ctx.fillStyle = colour;
    ctx.fillRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
  }
}

async function streamText(
  url: string,
  onStream: (textChunk: string, binaryChunk: Uint8Array | null) => unknown
): Promise<string> {
  const response = await fetch(url);
  const reader =
    response.body?.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const decoder = new TextDecoder();

  let responseText = "";

  async function stream() {
    const { done, value } = await reader.read();

    if (done) {
      onStream("", null);
      return responseText;
    }

    const chunk = decoder.decode(value, { stream: true });
    onStream(chunk, value);
    responseText += chunk;

    return stream();
  }

  return stream();
}

main().catch((error) => {
  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);

  alert(errorMessage);
  throw error;
});
