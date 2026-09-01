export type MicDevice = {
  deviceId: string;
  label: string;
};

export type StudioMicHandle = {
  stop(): Promise<void>;
};

async function makeMutedCaptureGraph(): Promise<{
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
  const mute = context.createGain();
  mute.gain.value = 0;
  worklet.connect(mute);
  mute.connect(context.destination);
  return { context, worklet };
}

export async function listMics(): Promise<MicDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Microphone ${index + 1}`,
    }));
}

export async function startStudioMic(
  deviceId: string | undefined,
  onPcm: (chunk: Uint8Array) => void,
): Promise<StudioMicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  const { context, worklet } = await makeMutedCaptureGraph();
  const source = context.createMediaStreamSource(stream);
  source.connect(worklet);
  worklet.port.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      onPcm(new Uint8Array(event.data));
    }
  };

  return {
    async stop() {
      worklet.port.onmessage = null;
      source.disconnect();
      worklet.disconnect();
      for (const track of stream.getTracks()) track.stop();
      await context.close();
    },
  };
}
