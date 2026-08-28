class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = new Float32Array(0);
    this.targetRate = 16000;
    this.frameSamples = 1600;
    this.queued = new Int16Array(this.frameSamples);
    this.queuedCount = 0;
  }

  /**
   * @param {Float32Array} extra
   */
  appendPending(extra) {
    if (!extra.length) return;
    const next = new Float32Array(this.pending.length + extra.length);
    next.set(this.pending);
    next.set(extra, this.pending.length);
    this.pending = next;
  }

  resampleTo16k(input) {
    if (sampleRate === this.targetRate) {
      this.pending = new Float32Array(0);
      return input;
    }
    const ratio = sampleRate / this.targetRate;
    const outLength = Math.floor(input.length / ratio);
    if (outLength <= 0) {
      this.pending = input;
      return new Float32Array(0);
    }
    const output = new Float32Array(outLength);
    for (let i = 0; i < outLength; i += 1) {
      const srcIndex = i * ratio;
      const i0 = Math.floor(srcIndex);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const frac = srcIndex - i0;
      output[i] = input[i0] * (1 - frac) + input[i1] * frac;
    }
    const consumed = Math.floor(outLength * ratio);
    this.pending = input.subarray(consumed);
    return output;
  }

  flushInt16(samples) {
    for (let i = 0; i < samples.length; i += 1) {
      const clipped = Math.max(-1, Math.min(1, samples[i]));
      this.queued[this.queuedCount] =
        clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
      this.queuedCount += 1;
      if (this.queuedCount === this.frameSamples) {
        const copy = this.queued.buffer.slice(0);
        this.port.postMessage(copy, [copy]);
        this.queued = new Int16Array(this.frameSamples);
        this.queuedCount = 0;
      }
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    const channel = input && input[0];

    if (output && output[0] && channel) {
      output[0].set(channel);
      for (let c = 1; c < output.length; c += 1) {
        output[c].set(channel);
      }
    }

    if (channel && channel.length) {
      this.appendPending(channel);
      const resampled = this.resampleTo16k(this.pending);
      if (resampled.length) this.flushInt16(resampled);
    }

    return true;
  }
}

registerProcessor("pcm-capture", PcmCaptureProcessor);
