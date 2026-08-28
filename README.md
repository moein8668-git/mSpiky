# Live Transcribe

Local web app that streams your microphone or an audio file to **Gemini 3.5 Transcribe Live** and shows captions as the audio is heard.

## Setup

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
3. Install and run:

```bash
npm install
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173).

If `.env` has no key, the app shows a key field instead. That value stays in this browser only.

## How to use

- **Start mic**: grant microphone access. Words appear while you speak.
- **Transcribe a file**: pick wav, mp3, m4a, webm, and similar. The file plays through the speakers and captions follow playback.
- **Smart** cleans fillers and self-corrections. **Verbatim** keeps word-for-word speech.
- Pick a language if you know it. Leave detect on if you do not.

## Notes

- The browser sends 16 kHz PCM to a local server. The server holds the API key and talks to Gemini over the Live API.
- Live sessions last about 10 minutes. Start again for a longer sitting.
- Headphones help when using the mic, so playback does not get recaptured.
