"""Download navai-uz/whisper-small-uzbek and convert it to CTranslate2 (int8) for faster-whisper.
usage: python tools/convert_navai.py [model_id] [out_dir]   (needs: pip install transformers torch ctranslate2)"""
import sys, os
from ctranslate2.converters import TransformersConverter
from transformers import WhisperProcessor
mid = sys.argv[1] if len(sys.argv) > 1 else "navai-uz/whisper-small-uzbek"
out = sys.argv[2] if len(sys.argv) > 2 else "models/navai-small-ct2"
TransformersConverter(mid).convert(out, quantization="int8", force=True)
WhisperProcessor.from_pretrained(mid).save_pretrained(out + "_proc")
import shutil
for f in ("tokenizer.json", "preprocessor_config.json"):
    src = os.path.join(out + "_proc", f)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(out, f))
shutil.rmtree(out + "_proc", ignore_errors=True)
print("ok", os.listdir(out))
