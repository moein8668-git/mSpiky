export type StudioFileHandle = {
  stop(): Promise<void>;
};

export async function startStudioFile(
  file: File,
  onPcm: (chunk: Uint8Array) => void,
  onEnded: () => void,
): Promise<StudioFileHandle> {
  const url = URL.createObjectURL(file);
  const audio = new Audio(url);
  audio.preload = "auto";

  const context = new AudioContext({ sampleRate: 16000 });
  if (context.state === "suspended") {
    await context.resume();
  }
  await context.audioWorklet.addModule("/pcm-processor.js");
  const worklet = new AudioWorkletNode(context, "pcm-capture", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });
  worklet.connect(context.destination);
  const source = context.createMediaElementSource(audio);
  source.connect(worklet);
  worklet.port.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      onPcm(new Uint8Array(event.data));
    }
  };

  const cleanupUrl = () => URL.revokeObjectURL(url);
  audio.addEventListener("ended", () => {
    onEnded();
  });

  try {
    await audio.play();
  } catch (error) {
    cleanupUrl();
    await context.close();
    throw error;
  }

  return {
    async stop() {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      cleanupUrl();
      worklet.port.onmessage = null;
      source.disconnect();
      worklet.disconnect();
      await context.close();
    },
  };
}
