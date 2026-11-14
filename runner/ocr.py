"""On-Mac text recognition (Apple Vision) for phones that give no UI tree (PhoneUse adb_cloud).
Returns words/lines with boxes in PhoneUse's 0-1000 grid, so the guard can read labels from pixels."""
from __future__ import annotations

import Quartz
import Vision
from Foundation import NSData


def read(png: bytes) -> list[dict]:
    data = NSData.dataWithBytes_length_(png, len(png))
    src = Quartz.CGImageSourceCreateWithData(data, None)
    img = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    req.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    req.setUsesLanguageCorrection_(True)
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(img, None)
    handler.performRequests_error_([req], None)
    out = []
    for obs in req.results() or []:
        cand = obs.topCandidates_(1)
        if not cand:
            continue
        text = str(cand[0].string()).strip()
        (x, y), (w, h) = obs.boundingBox()  # normalized, origin bottom-left
        if text:
            out.append({"label": text, "rect": {"x": x * 1000, "y": (1 - y - h) * 1000, "width": w * 1000, "height": h * 1000}})
    out.sort(key=lambda e: (round(e["rect"]["y"] / 15), e["rect"]["x"]))
    return out
