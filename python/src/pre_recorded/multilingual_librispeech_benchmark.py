"""
CLI for testing qwen3 ASR via the Gladia HTTP API.

Flow:
  1. POST /v2/upload           — upload audio file, get back audio_url
  2. POST /v2/pre-recorded     — create transcription job with audio_url
  3. GET  /v2/pre-recorded/:id — poll until status is "done" or "error"

Mirrors the test matrix from cli_qwen3_asr_utterance_ensemble.py but goes
through the full API stack instead of direct Triton gRPC.

# Single file transcription
uv run python src/pre_recorded/multilingual_librispeech_benchmark.py --api-key YOUR_KEY single --audio-file test.wav --languages fr

# Full investigation with MLS dataset
uv run python src/pre_recorded/multilingual_librispeech_benchmark.py --api-key YOUR_KEY investigate --mls-languages french,german

# Test all 30 languages on one sample
uv run python src/pre_recorded/multilingual_librispeech_benchmark.py --api-key YOUR_KEY all-languages --audio-file test.wav

# Skip upload if you already have an audio_url
uv run python src/pre_recorded/multilingual_librispeech_benchmark.py --api-key YOUR_KEY single --audio-url https://files.gladia.io/...
"""

import argparse
import json
import mimetypes
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

import requests

DEFAULT_API_URL = "https://api.gladia.io"
POLL_INTERVAL_S = 2.0
POLL_TIMEOUT_S = 300.0

QWEN3_SUPPORTED_LANGUAGES = [
    "zh",
    "en",
    "yue",
    "ar",
    "de",
    "fr",
    "es",
    "pt",
    "id",
    "it",
    "ko",
    "ru",
    "th",
    "vi",
    "ja",
    "tr",
    "hi",
    "ms",
    "nl",
    "sv",
    "da",
    "fi",
    "pl",
    "cs",
    "fil",
    "fa",
    "el",
    "ro",
    "hu",
    "mk",
]

MLS_LANGUAGES = [
    "german",
    "dutch",
    "french",
    "spanish",
    "italian",
    "portuguese",
    "polish",
]
MLS_ISO = {
    "german": "de",
    "dutch": "nl",
    "french": "fr",
    "spanish": "es",
    "italian": "it",
    "portuguese": "pt",
    "polish": "pl",
}


@dataclass
class TestCase:
    name: str
    audio_source: str
    audio_language: str
    languages: Optional[list[str]] = None
    code_switching: Optional[bool] = None


@dataclass
class TestResult:
    test_case: str
    audio_source: str
    audio_language: str
    languages: Optional[list[str]]
    code_switching: Optional[bool]
    detected_languages: list[str] | None = None
    transcription: str = ""
    elapsed_s: float = 0.0
    error: str = ""


class APIClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers["x-gladia-key"] = api_key

    def upload_audio(self, audio_path: str) -> str:
        url = f"{self.base_url}/v2/upload"
        filename = Path(audio_path).name
        content_type = mimetypes.guess_type(audio_path)[0] or "audio/wav"
        with open(audio_path, "rb") as f:
            resp = self.session.post(
                url,
                files={"audio": (filename, f, content_type)},
            )
        resp.raise_for_status()
        data = resp.json()
        return data["audio_url"]

    def create_job(
        self,
        audio_url: str,
        languages: list[str] | None = None,
        code_switching: bool | None = None,
        model: str = "solaria-3",
    ) -> dict:
        url = f"{self.base_url}/v2/pre-recorded"
        body: dict = {"audio_url": audio_url, "model": model}

        lang_config = {}
        if languages:
            lang_config["languages"] = languages
        if code_switching is not None:
            lang_config["code_switching"] = code_switching
        if lang_config:
            body["language_config"] = lang_config

        resp = self.session.post(url, json=body)
        resp.raise_for_status()
        return resp.json()

    def poll_job(self, job_id: str, timeout: float = POLL_TIMEOUT_S) -> dict:
        url = f"{self.base_url}/v2/pre-recorded/{job_id}"
        deadline = time.time() + timeout
        while time.time() < deadline:
            resp = self.session.get(url)
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status")
            if status in ("done", "error"):
                return data
            time.sleep(POLL_INTERVAL_S)
        raise TimeoutError(f"Job {job_id} did not complete within {timeout}s")


def save_mls_sample_to_wav(language: str, idx: int = 0) -> tuple[str, str]:
    """Download an MLS sample and save as a temporary wav file. Returns (path, reference_text)."""
    import tempfile

    import numpy as np
    import soundfile as sf
    from datasets import load_dataset

    ds = load_dataset(
        "facebook/multilingual_librispeech", language, split="test", streaming=True
    )
    for i, sample in enumerate(ds):
        if i == idx:
            audio_arr = np.array(sample["audio"]["array"], dtype=np.float32)
            sr = sample["audio"]["sampling_rate"]
            transcript = sample.get("transcript", sample.get("text", ""))
            tmp = tempfile.NamedTemporaryFile(
                suffix=".wav", delete=False, prefix=f"mls_{language}_"
            )
            sf.write(tmp.name, audio_arr, sr)
            return tmp.name, transcript
    raise ValueError(f"No sample at index {idx} for language {language}")


def extract_result(job_data: dict) -> dict:
    """Extract transcription and language info from a completed job response."""
    result = job_data.get("result") or {}
    print(result)
    transcription = result.get("transcription") or {}
    return {
        "languages": transcription.get("languages", []),
        "full_transcript": transcription.get("full_transcript", ""),
    }


def run_test(
    client: APIClient, tc: TestCase, audio_url: str, model: str = "solaria-3"
) -> TestResult:
    result = TestResult(
        test_case=tc.name,
        audio_source=tc.audio_source,
        audio_language=tc.audio_language,
        languages=tc.languages,
        code_switching=tc.code_switching,
    )
    try:
        t0 = time.time()
        job = client.create_job(
            audio_url,
            languages=tc.languages,
            code_switching=tc.code_switching,
            model=model,
        )
        job_id = job["id"]
        print(f"  job={job_id}", end=" ", flush=True)
        completed = client.poll_job(job_id)
        elapsed = time.time() - t0

        if completed["status"] == "error":
            result.error = json.dumps(completed.get("error", "unknown error"))
        else:
            extracted = extract_result(completed)
            result.detected_languages = extracted["languages"]
            result.transcription = extracted["full_transcript"]
        result.elapsed_s = round(elapsed, 2)
    except Exception as e:
        result.error = str(e)
    return result


def build_test_matrix(
    audio_sources: dict[str, tuple[str, str]],
) -> list[tuple[TestCase, str]]:
    """Build test matrix. audio_sources maps name -> (audio_url, expected_iso_lang)."""
    tests = []

    for src_name, (audio_url, expected_lang) in audio_sources.items():
        tests.append(
            (
                TestCase(
                    name=f"{src_name}_no_inputs",
                    audio_source=src_name,
                    audio_language=expected_lang,
                ),
                audio_url,
            )
        )

        if expected_lang:
            tests.append(
                (
                    TestCase(
                        name=f"{src_name}_correct_lang",
                        audio_source=src_name,
                        audio_language=expected_lang,
                        languages=[expected_lang],
                    ),
                    audio_url,
                )
            )

        wrong = "ja" if expected_lang != "ja" else "en"
        tests.append(
            (
                TestCase(
                    name=f"{src_name}_wrong_lang_{wrong}",
                    audio_source=src_name,
                    audio_language=expected_lang,
                    languages=[wrong],
                ),
                audio_url,
            )
        )

        tests.append(
            (
                TestCase(
                    name=f"{src_name}_code_switch_true",
                    audio_source=src_name,
                    audio_language=expected_lang,
                    code_switching=True,
                ),
                audio_url,
            )
        )

        tests.append(
            (
                TestCase(
                    name=f"{src_name}_code_switch_false",
                    audio_source=src_name,
                    audio_language=expected_lang,
                    code_switching=False,
                ),
                audio_url,
            )
        )

        if expected_lang:
            multi = [expected_lang, "en"] if expected_lang != "en" else ["en", "fr"]
            tests.append(
                (
                    TestCase(
                        name=f"{src_name}_multi_lang",
                        audio_source=src_name,
                        audio_language=expected_lang,
                        languages=multi,
                        code_switching=True,
                    ),
                    audio_url,
                )
            )

    return tests


def print_results_table(results: list[TestResult]):
    header = (
        f"{'Test Case':<40} | {'Audio Lang':>10} | {'Languages':>14} | "
        f"{'CodeSwitch':>10} | {'Detected':>12} | "
        f"{'Time':>6} | {'Transcription (first 80 chars)'}"
    )
    print("\n" + "=" * 160)
    print(header)
    print("-" * 160)
    for r in results:
        langs_str = ",".join(r.languages) if r.languages else ""
        if r.error:
            print(
                f"{r.test_case:<40} | {'ERROR':>10} | {langs_str:>14} | "
                f"{str(r.code_switching or ''):>10} | {'':>12} | "
                f"{'':>6} | {r.error[:80]}"
            )
        else:
            detected = ",".join(r.detected_languages) if r.detected_languages else ""
            print(
                f"{r.test_case:<40} | {r.audio_language:>10} | {langs_str:>14} | "
                f"{str(r.code_switching or ''):>10} | {detected:>12} | "
                f"{r.elapsed_s:>6.1f} | {r.transcription[:80]}"
            )
    print("=" * 160)


def cmd_investigate(args):
    """Run full investigation using MLS dataset samples."""
    client = APIClient(args.api_url, args.api_key)
    audio_sources: dict[str, tuple[str, str]] = {}

    mls_langs = (
        args.mls_languages.split(",") if args.mls_languages else MLS_LANGUAGES[:3]
    )
    for lang in mls_langs:
        lang = lang.strip()
        iso = MLS_ISO.get(lang, lang)
        print(f"Loading & uploading MLS sample: {lang} (iso={iso})...")
        try:
            wav_path, ref_text = save_mls_sample_to_wav(lang, idx=args.sample_idx)
            print(f"  ref: {ref_text[:80]}")
            audio_url = client.upload_audio(wav_path)
            audio_sources[f"mls_{lang}"] = (audio_url, iso)
            print(f"  uploaded -> {audio_url}")
            Path(wav_path).unlink(missing_ok=True)
        except Exception as e:
            print(f"  Failed: {e}")

    if args.audio_files:
        for fpath in args.audio_files:
            p = Path(fpath)
            if p.exists():
                print(f"Uploading local file: {p.name}...")
                audio_url = client.upload_audio(str(p))
                lang_hint = args.audio_lang or ""
                audio_sources[p.stem] = (audio_url, lang_hint)
                print(f"  uploaded -> {audio_url}")

    if not audio_sources:
        print("No audio sources loaded, exiting.")
        sys.exit(1)

    tests = build_test_matrix(audio_sources)
    print(f"\nRunning {len(tests)} test cases...\n")

    results = []
    for i, (tc, audio_url) in enumerate(tests):
        print(f"[{i + 1}/{len(tests)}] {tc.name}...", end=" ", flush=True)
        r = run_test(client, tc, audio_url, model=args.model)
        if r.error:
            print(f"ERROR: {r.error[:60]}")
        else:
            detected = ",".join(r.detected_languages) if r.detected_languages else "?"
            print(f"lang={detected} t={r.elapsed_s}s")
        results.append(r)

    print_results_table(results)

    out_path = Path(args.output)
    out_path.write_text(json.dumps([asdict(r) for r in results], indent=2))
    print(f"\nResults saved to {out_path}")


def cmd_single(args):
    """Run a single transcription with specified parameters."""
    client = APIClient(args.api_url, args.api_key)

    if args.audio_file:
        p = Path(args.audio_file)
        print(f"Uploading {p.name}...")
        audio_url = client.upload_audio(str(p))
    elif args.mls_language:
        print(f"Loading MLS sample: {args.mls_language}[{args.sample_idx}]...")
        wav_path, ref = save_mls_sample_to_wav(args.mls_language, idx=args.sample_idx)
        print(f"Reference text: {ref[:200]}")
        audio_url = client.upload_audio(wav_path)
        Path(wav_path).unlink(missing_ok=True)
    elif args.audio_url:
        audio_url = args.audio_url
    else:
        print("Provide --audio-file, --audio-url, or --mls-language", file=sys.stderr)
        sys.exit(1)

    print(f"Audio URL: {audio_url}")

    languages = args.languages.split(",") if args.languages else None
    code_switching = args.code_switching

    print(f"Parameters: languages={languages}, code_switching={code_switching}")

    t0 = time.time()
    job = client.create_job(
        audio_url, languages=languages, code_switching=code_switching, model=args.model
    )
    job_id = job["id"]
    result_url = job.get("result_url", f"{args.api_url}/v2/pre-recorded/{job_id}")
    print(f"Job created: id={job_id}")
    print(f"Result URL: {result_url}")

    completed = client.poll_job(job_id)
    elapsed = time.time() - t0

    if completed["status"] == "error":
        print(f"\nERROR: {json.dumps(completed.get('error', 'unknown'), indent=2)}")
        sys.exit(1)

    extracted = extract_result(completed)
    print(f"\nResult ({elapsed:.1f}s):")
    print(f"  Languages: {extracted['languages']}")
    print(f"  Transcription: {extracted['full_transcript']}")

    if args.output:
        Path(args.output).write_text(json.dumps(completed, indent=2))
        print(f"\nFull response saved to {args.output}")


def cmd_all_languages(args):
    """Test forcing each supported language on a single audio sample."""
    client = APIClient(args.api_url, args.api_key)

    if args.audio_file:
        p = Path(args.audio_file)
        print(f"Uploading {p.name}...")
        audio_url = client.upload_audio(str(p))
    elif args.audio_url:
        audio_url = args.audio_url
    else:
        print("Loading MLS french sample...")
        wav_path, ref = save_mls_sample_to_wav("french", idx=0)
        print(f"Reference: {ref[:200]}")
        audio_url = client.upload_audio(wav_path)
        Path(wav_path).unlink(missing_ok=True)

    print(f"Audio URL: {audio_url}")
    print(f"\nTesting all {len(QWEN3_SUPPORTED_LANGUAGES)} supported languages...\n")

    results = []
    for lang in QWEN3_SUPPORTED_LANGUAGES:
        print(f"  {lang}...", end=" ", flush=True)
        try:
            t0 = time.time()
            job = client.create_job(audio_url, languages=[lang], model=args.model)
            completed = client.poll_job(job["id"])
            elapsed = time.time() - t0

            if completed["status"] == "error":
                print(f"ERROR: {completed.get('error', 'unknown')}")
                results.append(
                    {"lang_input": lang, "error": str(completed.get("error"))}
                )
            else:
                extracted = extract_result(completed)
                print(
                    f"detected={extracted['languages']} text={extracted['full_transcript'][:60]} ({elapsed:.1f}s)"
                )
                results.append(
                    {
                        "lang_input": lang,
                        "detected_languages": extracted["languages"],
                        "transcription": extracted["full_transcript"],
                        "elapsed_s": round(elapsed, 2),
                    }
                )
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"lang_input": lang, "error": str(e)})

    print(f"  auto...", end=" ", flush=True)
    try:
        t0 = time.time()
        job = client.create_job(audio_url, model=args.model)
        completed = client.poll_job(job["id"])
        elapsed = time.time() - t0
        extracted = extract_result(completed)
        print(
            f"detected={extracted['languages']} text={extracted['full_transcript'][:60]} ({elapsed:.1f}s)"
        )
        results.append(
            {
                "lang_input": "auto",
                "detected_languages": extracted["languages"],
                "transcription": extracted["full_transcript"],
                "elapsed_s": round(elapsed, 2),
            }
        )
    except Exception as e:
        print(f"ERROR: {e}")
        results.append({"lang_input": "auto", "error": str(e)})

    out_path = Path(args.output)
    out_path.write_text(json.dumps(results, indent=2))
    print(f"\nResults saved to {out_path}")


def main():
    parser = argparse.ArgumentParser(
        description="CLI for testing Pre-recorded Flow via the Gladia HTTP API"
    )
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="API base URL")
    parser.add_argument(
        "--api-key", required=True, help="Gladia API key (x-gladia-key)"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    model_arg = {
        "flags": ["--model"],
        "default": "solaria-3",
        "help": "Transcription model (default: solaria-3)",
    }

    inv = subparsers.add_parser(
        "investigate", help="Full investigation with MLS dataset"
    )
    inv.add_argument(
        *model_arg["flags"], default=model_arg["default"], help=model_arg["help"]
    )
    inv.add_argument(
        "--mls-languages",
        default=None,
        help=f"Comma-separated MLS languages (default: first 3 of {MLS_LANGUAGES})",
    )
    inv.add_argument("--audio-files", nargs="*", help="Additional local audio files")
    inv.add_argument(
        "--audio-lang", default=None, help="ISO language code for local audio files"
    )
    inv.add_argument(
        "--sample-idx", type=int, default=0, help="MLS dataset sample index"
    )
    inv.add_argument(
        "--output", default="api_investigation_results.json", help="Output JSON file"
    )
    inv.set_defaults(func=cmd_investigate)

    sg = subparsers.add_parser("single", help="Single test with specific parameters")
    sg.add_argument(
        *model_arg["flags"], default=model_arg["default"], help=model_arg["help"]
    )
    sg.add_argument("--audio-file", help="Path to audio file")
    sg.add_argument("--audio-url", help="Already-uploaded audio URL (skips upload)")
    sg.add_argument("--mls-language", help="MLS language to load")
    sg.add_argument("--sample-idx", type=int, default=0, help="MLS sample index")
    sg.add_argument(
        "--languages",
        default=None,
        help="Comma-separated language codes for language_config",
    )
    sg.add_argument(
        "--code-switching", type=bool, default=None, help="Enable code switching"
    )
    sg.add_argument("--output", default=None, help="Save full response JSON to file")
    sg.set_defaults(func=cmd_single)

    al = subparsers.add_parser(
        "all-languages", help="Test all supported languages on one sample"
    )
    al.add_argument(
        *model_arg["flags"], default=model_arg["default"], help=model_arg["help"]
    )
    al.add_argument("--audio-file", help="Path to audio file")
    al.add_argument("--audio-url", help="Already-uploaded audio URL (skips upload)")
    al.add_argument(
        "--output", default="api_all_languages_results.json", help="Output JSON file"
    )
    al.set_defaults(func=cmd_all_languages)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
