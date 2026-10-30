"""
Split a Howler audio sprite (sounds.json + sounds.mp3) into individual files.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

try:
	import imageio_ffmpeg
except ImportError:
	print("Missing imageio-ffmpeg. Run: pip install imageio-ffmpeg")
	sys.exit(1)

AUDIO_DIR = Path(__file__).resolve().parents[1] / "static" / "assets" / "audio"
JSON_PATH = AUDIO_DIR / "sounds.json"
SOURCE_CANDIDATES = [
	AUDIO_DIR / "sounds.mp3",
	AUDIO_DIR / "sounds.m4a",
	AUDIO_DIR / "sounds.ogg",
	AUDIO_DIR / "sounds.ac3",
]
OUT_DIR = AUDIO_DIR / "individual"


def is_fx(name: str) -> bool:
	return not name.startswith("bgm_")


def main() -> None:
	if not JSON_PATH.exists():
		raise SystemExit(f"Missing {JSON_PATH}")

	source = next((p for p in SOURCE_CANDIDATES if p.exists()), None)
	if source is None:
		raise SystemExit(f"No sounds.* audio file found in {AUDIO_DIR}")

	data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
	sprite: dict[str, list] = data["sprite"]

	# FX only by default; pass --all to include BGM
	include_all = "--all" in sys.argv
	entries = {
		name: timing
		for name, timing in sprite.items()
		if include_all or is_fx(name)
	}

	OUT_DIR.mkdir(parents=True, exist_ok=True)
	ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

	print(f"Source: {source}")
	print(f"Output: {OUT_DIR}")
	print(f"Clips:  {len(entries)} ({'all' if include_all else 'fx only'})")
	print()

	for name, timing in entries.items():
		start_ms = float(timing[0])
		duration_ms = float(timing[1])
		start_s = start_ms / 1000.0
		duration_s = duration_ms / 1000.0
		out_path = OUT_DIR / f"{name}.wav"

		cmd = [
			ffmpeg,
			"-y",
			"-hide_banner",
			"-loglevel",
			"error",
			"-ss",
			f"{start_s:.6f}",
			"-t",
			f"{duration_s:.6f}",
			"-i",
			str(source),
			"-acodec",
			"pcm_s16le",
			str(out_path),
		]
		subprocess.run(cmd, check=True)
		print(f"  {name}.wav  ({start_s:.3f}s, {duration_s:.3f}s)")

	print()
	print(f"Done. Wrote {len(entries)} files to:\n  {OUT_DIR}")


if __name__ == "__main__":
	main()
