#!/usr/bin/env python3
"""
Combined server for Docker deployment
Serves both the Python API and static frontend files
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys

# Import the EDHREC service
sys.path.append('api')
from edhrec_service import app as edhrec_app

# Create main app
app = FastAPI(title="MTG Commander Picker - Combined Server")

# Mount the EDHREC API under /api
app.mount("/api", edhrec_app)

# Serve static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse("static/index.html")
    
    @app.get("/{path:path}")
    async def serve_static_files(path: str):
        file_path = f"static/{path}"
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Fallback to index.html for SPA routing
        return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)