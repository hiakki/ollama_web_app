import os
import logging
import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request structure
class PromptRequest(BaseModel):
    prompt: str
    model: str

# Get available models
def get_available_models():
    try:
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        models = [line.split()[0] for line in result.stdout.split("\n")[1:] if line]
        return models if models else ["deepseek-r1:14b"]  # Default fallback
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        return ["deepseek-r1:14b"]

@app.get("/models")
def list_models():
    return {"models": get_available_models()}

@app.post("/generate")
async def generate_text(request: PromptRequest):
    try:
        logger.info(f"Generating text with model: {request.model}")

        def stream_response():
            process = subprocess.Popen(["ollama", "run", request.model, request.prompt], stdout=subprocess.PIPE, text=True)

            buffer = ""
            while True:
                char = process.stdout.read(1)  # Read letter by letter
                # word = process.stdout.read(1).split()  # Uncomment this to read word by word

                if not char:  # If no more data, break
                    break

                buffer += char
                yield char  # Stream character

                # Uncomment the following to stream word by word
                # if char == " " or char == "\n":  
                #     yield buffer
                #     buffer = ""
        return StreamingResponse(stream_response(), media_type="text/event-stream")

    except Exception as e:
        logger.error(f"Error generating response: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
def health_check():
    return {"status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
