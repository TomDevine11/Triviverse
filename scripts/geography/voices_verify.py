#!/usr/bin/env python3
"""Earshot — build-time language check for candidate recordings.

Called by scripts/geography/build-voices.mjs, never at runtime. Reads a JSON job on
stdin and writes one JSON result per line on stdout (as each finishes):

  in:  {"model": "medium", "items": [{"id", "wav", "expect", "clip", "min", "speech", "skip", "start"?, "notext"?}]}
       wav     16 kHz mono WAV of the whole recording
       expect  Whisper language code, or null for languages Whisper doesn't know
       clip    longest window wanted (the full reveal); min = shortest acceptable
       speech  minimum fraction of the window that must be speech
       skip    seconds at the start never to use (channel intros)
       start   re-check a known window instead of searching (with notext: no transcript)
  out: {"id", "start", "dur", "speech", "prob", "top": [[code, p] x3], "en",
        "chunks": [[code, p] per ~5 s], "text"}

How a window is chosen:
  1. Silero VAD (bundled with faster-whisper) finds the speech.
  2. Every speech onset is a candidate start; its window runs `clip` seconds, or to
     the end of the speech if that comes first (but at least `min`), and must be at
     least `speech` speech. Up to 10 candidates, spread across the recording.
  3. Whisper's language identification scores each window; the one with the highest
     probability for `expect` wins (for a language Whisper doesn't know, the window
     least likely to be English).
  4. The winning window is split into ~5-second chunks, each identified on its own —
     a 20-second score can hide a few seconds of English, and the first chunk is what
     the opening guesses hear.
  5. The window is transcribed in `expect`, so the build can reject clips where the
     speaker names the language.

Setup (one-off, nothing committed):
  python3 -m venv .cache/langid-venv
  .cache/langid-venv/bin/pip install faster-whisper
"""
import json
import sys

from faster_whisper import WhisperModel, decode_audio
from faster_whisper.vad import VadOptions, get_speech_timestamps

SR = 16000


def coverage(spans, a, b):
    return sum(max(0, min(e, b) - max(s, a)) for s, e in spans) / max(1e-6, b - a)


def main():
    job = json.load(sys.stdin)
    model = WhisperModel(job.get("model", "medium"), device="cpu", compute_type="int8")
    for it in job["items"]:
        audio = decode_audio(it["wav"], sampling_rate=SR)
        total = len(audio) / SR
        want, least = float(it["clip"]), float(it["min"])
        vad = get_speech_timestamps(audio, VadOptions(min_silence_duration_ms=300, speech_pad_ms=60))
        spans = [(v["start"] / SR, v["end"] / SR) for v in vad]
        # trailing silence doesn't count towards the window
        end = min(total, spans[-1][1] + 0.3) if spans else total

        def window(s):
            return min(want, end - s)

        if it.get("start") is not None:
            cands = [float(it["start"])]
        else:
            skip = float(it.get("skip") or 0)
            starts = [max(0.0, s - 0.08) for s, _ in spans if s >= skip]
            cands = [s for s in starts if window(s) >= least and coverage(spans, s, s + window(s)) >= float(it["speech"])]
            if len(cands) > 10:
                step = len(cands) / 10
                cands = [cands[int(i * step)] for i in range(10)]
        best = None
        for s in cands:
            L = window(s)
            win = audio[int(s * SR):int((s + L) * SR)]
            _, p, probs = model.detect_language(win)
            d = dict(probs)
            score = d.get(it["expect"], 0) if it["expect"] else 1 - d.get("en", 0)
            if best is None or score > best[0]:
                best = (score, s, L, probs)
        if best is None:
            print(json.dumps({"id": it["id"], "error": "no speech-dense window", "total": round(total, 1)}), flush=True)
            continue
        score, s, L, probs = best
        win = audio[int(s * SR):int((s + L) * SR)]
        n = max(3, round(L / 5))
        chunks = []
        for i in range(n):
            part = win[int(i * len(win) / n):int((i + 1) * len(win) / n)]
            c, p, _ = model.detect_language(part)
            chunks.append([c, round(p, 2)])
        text = None
        if not it.get("notext"):
            segs, _ = model.transcribe(win, language=it["expect"], beam_size=1, condition_on_previous_text=False, vad_filter=False)
            text = " ".join(x.text.strip() for x in segs)
        print(json.dumps({
            "id": it["id"],
            "start": round(s, 2),
            "dur": round(L, 2),
            "speech": round(coverage(spans, s, s + L), 2),
            "prob": round(score, 3),
            "top": [[c, round(p, 3)] for c, p in sorted(probs, key=lambda x: -x[1])[:3]],
            "en": round(dict(probs).get("en", 0), 3),
            "chunks": chunks,
            "text": text,
        }, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
