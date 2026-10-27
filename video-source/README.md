# Recreating the 90-second Review Lab video

The video is generated entirely from code, so every frame and every word can be edited and rebuilt.

| File | Role |
|---|---|
| `script.json` | Narration sentence by sentence. `text` is shown in captions; `tts` is what the voice reads; `cues` are words that trigger animations. |
| `make_narration.py` | Synthesises each sentence with Kokoro-82M, joins them with fixed pauses, pads the track to exactly 90.000 s, writes `build/narration.wav` and `build/timeline.json`. |
| `make_captions.py` | Writes `../video/captions.vtt` from the timeline. |
| `render.html` | Draws any frame on a 1280×720 canvas with `renderFrame(t)`; open it (served from the repository root) and drag the slider to scrub. |
| `render.mjs` | Captures all 2,700 frames (30 fps × 90 s) with headless Chromium and pipes them into ffmpeg. |

## Steps

Requirements: Python 3.10+, Node 18+, ffmpeg, Playwright with Chromium.

```bash
pip install kokoro-onnx soundfile numpy
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
python3 video-source/make_narration.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin
python3 video-source/make_captions.py

python3 -m http.server 8790 &          # from the repository root
node video-source/render.mjs           # -> video-source/build/frames.mp4

ffmpeg -y -i video-source/build/frames.mp4 -i video-source/build/narration.wav \
  -map 0:v -map 1:a -c:v libx264 -preset veryfast -tune animation -crf 27 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -t 90 -movflags +faststart video/literature-review-explained-90s.mp4
ffmpeg -y -i video-source/build/narration.wav -c:a libmp3lame -b:a 128k video/narration.mp3
```

Mispronounced terms are corrected in the `PHONEME_FIXES` table of `make_narration.py` (heterogeneity, PRISMA, meta-analyses).
