# Finsight OS — backend Dockerfile
#
# Builds a single image that contains:
#   - Python 3.11 + the FastAPI backend
#   - Ollama binary + gemma4:e2b weights pre-pulled into the layer
#
# Designed for `docker compose up` from the repo root, but also runnable
# standalone:
#   docker build -t finsight-backend ./backend
#   docker run -p 8000:8000 -p 11434:11434 -v ./backend/data:/app/data finsight-backend
#
# On hardware without a GPU, gemma4:e2b runs on CPU and the demo fallback
# kicks in for /analyze-behavior past the timeout (same as the native install).
# On hardware with NVIDIA GPU + nvidia-container-toolkit, set OLLAMA_NUM_GPU=99
# in the env and real Gemma inference completes in ~5-8s.

FROM python:3.11-slim

# OS deps + Ollama binary (single-step layer for caching)
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL https://ollama.com/install.sh | sh \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer caches across code changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-pull Gemma 4 E2B into the image so first-run is fast.
# This adds ~2.5 GB to the image but saves 5-10 minutes of cold-start
# on every fresh container.
RUN ollama serve & \
    sleep 5 && \
    ollama pull gemma4:e2b && \
    pkill ollama || true

# Copy the application
COPY . .

# Both the FastAPI port and the Ollama port (so frontend / judges can hit
# either directly if they want to inspect Ollama responses)
EXPOSE 8000 11434

# Default env — overridable via docker compose or `docker run -e`
ENV DEMO_MODE=true \
    OLLAMA_HOST=http://localhost:11434 \
    OLLAMA_MODEL=gemma4:e2b \
    OLLAMA_NUM_GPU=0 \
    PYTHONUNBUFFERED=1

# Start Ollama in background, then the FastAPI server in foreground.
# Using a small entrypoint so signals propagate cleanly to both.
COPY <<'EOF' /entrypoint.sh
#!/bin/sh
set -e
ollama serve > /tmp/ollama.log 2>&1 &
sleep 3
exec python main.py
EOF
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
