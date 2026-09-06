import { expect, test } from "vitest";
import { chimeTone, playChimeTone } from "./chime";

test("open chime is a short higher beep", () => {
  expect(chimeTone("open")).toMatchObject({
    frequencyHz: 880,
    durationMs: 70,
  });
});

test("close chime is lower than open", () => {
  expect(chimeTone("close").frequencyHz).toBeLessThan(chimeTone("open").frequencyHz);
});

test("talk and release are distinct from paste", () => {
  expect(chimeTone("talk").frequencyHz).not.toBe(chimeTone("paste").frequencyHz);
  expect(chimeTone("release").frequencyHz).not.toBe(chimeTone("talk").frequencyHz);
});

test("playChimeTone schedules oscillator and gain", () => {
  const stops: number[] = [];
  const context = {
    currentTime: 1,
    destination: {},
    createOscillator() {
      return {
        type: "sine",
        frequency: {
          setValueAtTime() {},
        },
        connect() {},
        start() {},
        stop(time: number) {
          stops.push(time);
        },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
  };

  playChimeTone(context, "open");
  expect(stops).toHaveLength(1);
  expect(stops[0]).toBeGreaterThan(1);
});
