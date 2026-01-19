#!/usr/bin/env python3
"""
Startup script to run both the Python EDHREC service and Node.js frontend
"""

import subprocess
import sys
import os
import time
import signal
from threading import Thread

def run_python_service():
    """Run the Python EDHREC service"""
    print("🐍 Starting Python EDHREC service...")
    try:
        subprocess.run([sys.executable, "api/edhrec_service.py"], check=True)
    except KeyboardInterrupt:
        print("\n🐍 Python service stopped")
    except Exception as e:
        print(f"❌ Python service error: {e}")

def run_node_service():
    """Run the Node.js frontend"""
    print("🟢 Starting Node.js frontend...")
    try:
        # Wait a moment for Python service to start
        time.sleep(2)
        subprocess.run(["npm", "run", "dev"], check=True)
    except KeyboardInterrupt:
        print("\n🟢 Node.js service stopped")
    except Exception as e:
        print(f"❌ Node.js service error: {e}")

def main():
    print("🚀 Starting MTG Commander Picker services...")
    
    # Check if Python dependencies are installed
    try:
        import pyedhrec
        import fastapi
        import uvicorn
    except ImportError:
        print("❌ Python dependencies not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Check if Node dependencies are installed
    if not os.path.exists("node_modules"):
        print("❌ Node dependencies not found. Installing...")
        subprocess.run(["npm", "install"])
    
    # Start both services in separate threads
    python_thread = Thread(target=run_python_service, daemon=True)
    node_thread = Thread(target=run_node_service, daemon=True)
    
    try:
        python_thread.start()
        node_thread.start()
        
        print("\n✅ Services started!")
        print("🐍 Python EDHREC service: http://localhost:8000")
        print("🟢 Frontend: http://localhost:3000")
        print("\nPress Ctrl+C to stop all services")
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping all services...")
        sys.exit(0)

if __name__ == "__main__":
    main()