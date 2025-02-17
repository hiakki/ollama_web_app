import logging
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import argparse
import os

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI()

# CORS setup for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Parse command-line arguments
parser = argparse.ArgumentParser(description="Ollama FastAPI Server")
parser.add_argument("--ollama-url", type=str, help="Ollama API URL (default: env OLLAMA_API_URL or http://localhost:11434)")
args, _ = parser.parse_known_args()

# Get OLLAMA_API_URL from environment variable or command-line argument
OLLAMA_API_URL = args.ollama_url or os.getenv("OLLAMA_API_URL", "http://localhost:11434")
logger.info(f"Using Ollama API URL: {OLLAMA_API_URL}")

# Request model
class PromptRequest(BaseModel):
    prompt: str
    model: str  # User-selected model

# Fetch available models dynamically
@app.get("/models")
def list_models():
    try:
        timeout = httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)
        response = httpx.get(f"{OLLAMA_API_URL}/api/tags", timeout=timeout)
        response.raise_for_status()
        models = [model["name"] for model in response.json().get("models", [])]
        return {"models": models if models else ["llama3.2"]}  # Default fallback
    except httpx.RequestError as e:
        logger.error(f"Error fetching models: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve models")

# Generate text dynamically using selected model
@app.post("/generate")
async def generate_text(request: PromptRequest):
    try:
        logger.info(f"Generating text with model: {request.model}")

        async def stream_response():
            timeout = httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)

            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_API_URL}/api/generate",
                    json={"model": request.model, "prompt": request.prompt},
                ) as response:
                    async for chunk in response.aiter_bytes():
                        json_str = chunk.decode("utf-8").strip()
                        try:
                            json_data = json.loads(json_str)
                            response_value = json_data.get("response", "")
                            yield response_value
                        except json.JSONDecodeError:
                            logger.error(f"Invalid JSON: {json_str}")

        return StreamingResponse(stream_response(), media_type="text/event-stream")

    except httpx.RequestError as e:
        logger.error(f"Error generating response: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
def health_check():
    return {"status": "running"}

# Run FastAPI with Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
