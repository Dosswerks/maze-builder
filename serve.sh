#!/bin/bash
# Simple local server for Maze Builder
# ES modules require HTTP, they won't work with file:// protocol
echo "Starting Maze Builder at http://localhost:8080"
echo "Press Ctrl+C to stop"
cd "$(dirname "$0")"
python3 -m http.server 8080
