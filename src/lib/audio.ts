export type CaptureHandle = {
  context: AudioContext;
  worklet: AudioWorkletNode;
  stop: () => Promise<void>;
};

async function makeCaptureGraph(playback: boolean): Promise<{
  context: AudioContext;
  worklet: AudioWorkletNode;
}> {
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
  if (playback) {
    worklet.connect(context.destination);
  } else {
    const mute = context.createGain();
    mute.gain.value = 0;
    worklet.connect(mute);
    mute.connect(context.destination);
  }
  return { context, worklet };
}

export async function startMicCapture(
  onPcm: (chunk: ArrayBuffer) => void,
): Promise<CaptureHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  const { context, worklet } = await makeCaptureGraph(false);
  const source = context.createMediaStreamSource(stream);
  source.connect(worklet);
  worklet.port.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) onPcm(event.data);
  };

  return {
    context,
    worklet,
    stop: async () => {
      worklet.port.onmessage = null;
      source.disconnect();
      worklet.disconnect();
      for (const track of stream.getTracks()) track.stop();
      await context.close();
    },
  };
}

export async function startFileCapture(
  file: File,
  onPcm: (chunk: ArrayBuffer) => void,
  onEnded: () => void,
): Promise<CaptureHandle & { audio: HTMLAudioElement }> {
  const url = URL.createObjectURL(file);
  const audio = new Audio(url);
  audio.preload = "auto";
  const { context, worklet } = await makeCaptureGraph(true);
  const source = context.createMediaElementSource(audio);
  source.connect(worklet);
  worklet.port.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) onPcm(event.data);
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
    context,
    worklet,
    audio,
    stop: async () => {
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
