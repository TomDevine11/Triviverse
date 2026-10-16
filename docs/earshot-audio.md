# Earshot — audio sourcing, licensing and pipeline

Earshot (`/geography/earshot`) plays a short recording of someone speaking and asks for
the language. This note records where the audio comes from, why those sources, and how to
add more clips. The tooling is `scripts/geography/build-voices.mjs`.

## Sources considered (October 2026)

| Source | Licence | Can we rehost excerpts on a static site? | Used? |
|---|---|---|---|
| **Wikitongues** oral histories on Wikimedia Commons | Per file: CC BY-SA 4.0, CC BY 3.0 or CC0 (checked per file via the Commons API) | Yes, with attribution; adapted CC BY-SA excerpts stay CC BY-SA 4.0 | **Yes, the primary source.** It's unscripted speech, ~160 language categories, and every file has a machine-readable licence |
| **Google FLEURS** (Hugging Face `google/fleurs`) | CC BY 4.0 (whole dataset) | Yes, with attribution | **Yes, to fill gaps** (Mandarin, Japanese, Cantonese, Vietnamese, Czech, Zulu…). It's read speech of Wikipedia-style sentences |
| Mozilla Common Voice | CC0 audio | The licence allows it, but downloads sit behind an account plus terms acceptance (Mozilla Data Collective / gated HF). The terms forbid re-identifying speakers, and the clips are short scripted sentences | No. It needs an account the build can't create, and the speech is scripted |
| Lingua Libre (Commons) | Mostly CC BY-SA | Yes | No. Its recordings are single words, too short to identify a language |
| Spoken Wikipedia (Commons) | CC BY-SA | Yes | No. It covers few languages, and recordings open by naming the language/article |

Nothing is taken just because it is downloadable. Commons files must pass the same licence
whitelist as Postcard's photos (CC0 / PD / CC BY / CC BY-SA, not flagged non-free).

## What the build does

1. **Candidates.** `scripts/geography/voices.source.mjs` lists one or more candidates per puzzle, best first:
   - a Commons file name;
   - or a FLEURS config. Only a few dev-split utterances are fetched, one by one, through the Hugging Face dataset viewer. The multi-hundred-MB archives are never downloaded.
2. **Licence check.** For Commons files, the licence and author come from `extmetadata`, and the smallest rendition is downloaded (a low-resolution transcode for videos).
3. **Window choice.** `scripts/geography/voices_verify.py` (faster-whisper, run locally) finds the speech with Silero VAD and takes candidate 20-second windows that are at least 80% speech (65% for read speech). Whisper's language ID scores each window and the best one is kept.
4. **Rejections.** A candidate is rejected when:
   - Whisper's top language isn't the label, or p < 0.6;
   - the window's transcript contains the language's name, endonym or an alias, or the per-config words in `AVOID` (e.g. 日本 for Japanese).
   - Languages Whisper doesn't know (Irish, Zulu, Xhosa, Igbo, Wolof, Oromo, Kyrgyz, Kurdish, Cebuano) come only from FLEURS, whose labels are the dataset's own.
5. **Encoding.** ffmpeg (`ffmpeg-static`, already a dev dependency) trims the window and applies a high-pass filter, loudnorm (−17 LUFS) and short fades. The output is mono 24 kHz MP3 at 48 kb/s, with metadata stripped, named by content hash.
6. **Manifest.** `src/geography/data/voices.generated.json` holds, per clip:
   - id, language id, variety, path, duration, the six reveal stages and a 72-bar loudness envelope;
   - credit (title, author, licence and URL, source page, excerpt times);
   - the check (model, p, speech ratio).

Whisper results are cached in `scripts/geography/voices.verified.json`, which is committed. A rebuild therefore only needs Python for new candidates.

## Delivery

- **Storage.** Each clip is one ~110 KB MP3 under `public/geography/voices/`, cached immutably (`_headers`).
- **Loading.** The game fetches only the current puzzle's file. It decodes it with the Web Audio API and plays it with `AudioBufferSourceNode.start(0, 0, unlockedSeconds)`. That is sample-accurate in every browser, with no seeking, no `<audio>` controls and no media-session scrubbing, so the page offers no way to hear past the unlocked stage. The file itself is of course downloadable; this is a casual game, not an exam.
- **Hiding the answer.** File names and clip ids are hashes, so neither says the language.
- **Waveform.** It's drawn from the precomputed envelope, so it appears before the audio has loaded.

## The bank today (2026-10-11)

- **Size:** 83 clips across 81 languages, 8.85 MB in total, about 110 KB each. 37 are conversational, 46 read aloud (FLEURS plus a few Spoken Wikipedia recordings).
- **How each clip's language was established** (`check.rule` in the manifest):
  - **65 clips, Whisper confirmed:** it was Whisper's top pick with p ≥ 0.6, and from the opening seconds onward.
  - **1 clip, close relative:** Whisper heard the language or a close relative.
  - **17 clips, source label:** FLEURS's own dataset labels, or a language Whisper doesn't know.
- **No usable clip yet:** Irish, Scottish Gaelic, Breton, Belarusian, Occitan, Yiddish, Kazakh, Marathi, Burmese, Sundanese, Māori, Somali, Hausa, Zulu, Xhosa, Shona, Quechua, Guarani, Tok Pisin and Esperanto.
  - Most of these are FLEURS configs that the Hugging Face viewer refuses ("scan size limit"), and the full archives download at ~10 KB/s.
  - The rest are Wikitongues recordings that switch into a contact language (the Breton speaker drifts into French).
  - The build retries all of them on every run.

## Adding clips

```
python3 -m venv .cache/langid-venv && .cache/langid-venv/bin/pip install faster-whisper   # once
# add { lang, try: [...] } to scripts/geography/voices.source.mjs (lang must exist in src/geography/data/languages.js, with a fact)
npm run build:voices -- --list          # prints each accepted clip's transcript
ONLY=welsh,irish npm run build:voices   # dry run for a few languages; writes nothing
npm test -- earshot                     # bank invariants
```

Listen to new clips before committing. Adding clips reshuffles the future daily order.
Saved progress is keyed by clip id, so nobody's history breaks.

## Attribution

- **In the game.** Each reveal credits its clip (collection, title, author, licence link, source link). "Audio credits" lists every clip.
- **FLEURS.** Conneau et al., *FLEURS: Few-shot Learning Evaluation of Universal Representations of Speech*, 2022, CC BY 4.0.
