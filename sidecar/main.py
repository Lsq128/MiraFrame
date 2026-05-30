"""openOii Face + TTS Sidecar

Minimal Python FastAPI service providing:
- POST /detect-faces   — InsightFace face detection + embedding
- POST /synthesize-speech — Edge-TTS speech synthesis
- GET  /health         — Health check
"""

import io
import base64
import logging
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.responses import Response

logger = logging.getLogger("sidecar")

# ── Lazy-loaded singletons ──
_face_model = None
_face_loaded = False
_face_load_error: Optional[str] = None


def _load_face_model():
    global _face_model, _face_loaded, _face_load_error
    if _face_loaded:
        return
    _face_loaded = True
    try:
        import insightface
        _face_model = insightface.app.FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        _face_model.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("InsightFace model loaded successfully")
    except Exception as exc:
        _face_load_error = str(exc)
        logger.warning("InsightFace model not available: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models on startup (best-effort)
    _load_face_model()
    yield


app = FastAPI(title="openOii Sidecar", version="1.0.0", lifespan=lifespan)


# ── Schemas ──

class FaceDetectRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded image (JPEG/PNG)")
    min_det_score: float = Field(default=0.5, ge=0.0, le=1.0)

class FaceDetectResponse(BaseModel):
    faces: list[dict] = Field(default_factory=list, description="Detected faces with bbox, embedding")
    count: int = 0
    error: Optional[str] = None

class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize")
    voice: str = Field(default="zh-CN-XiaoxiaoNeural", description="Edge-TTS voice name")
    rate: str = Field(default="+0%", description="Speaking rate")

# ── Routes ──

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "face_model_available": _face_model is not None,
        "face_load_error": _face_load_error,
    }


@app.post("/detect-faces", response_model=FaceDetectResponse)
async def detect_faces(req: FaceDetectRequest):
    if _face_model is None:
        raise HTTPException(status_code=503, detail=f"Face model not available: {_face_load_error or 'Not loaded'}")

    try:
        # Decode base64 to numpy array
        img_bytes = base64.b64decode(req.image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        import cv2
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Run face detection
        faces = _face_model.get(img)
        results = []
        for face in faces:
            if face.det_score < req.min_det_score:
                continue
            bbox = face.bbox.astype(float).tolist()
            embedding = face.embedding.astype(float).tolist() if hasattr(face, "embedding") and face.embedding is not None else None
            results.append({
                "bbox": bbox,
                "det_score": float(face.det_score),
                "embedding": embedding,
            })

        return FaceDetectResponse(faces=results, count=len(results))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Face detection failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/synthesize-speech")
async def synthesize_speech(req: SynthesizeRequest):
    """Synthesize speech and return MP3 audio."""
    try:
        import edge_tts

        communicate = edge_tts.Communicate(req.text, req.voice, rate=req.rate)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        if not audio_chunks:
            raise HTTPException(status_code=500, detail="No audio generated")

        audio_data = b"".join(audio_chunks)
        return Response(content=audio_data, media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("TTS synthesis failed")
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
