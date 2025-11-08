#!/usr/bin/env python3
"""
DrumMachine Backend Server (Python/Flask)
Implements the same endpoints as the original Motoko canister:
- GET /defaultPattern
- GET /pattern/<user>/<name>
- POST /pattern/<user>/<name>
- GET /tempo/<user>
- POST /tempo/<user>
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for Electron/browser access

# In-memory storage
user_patterns = {}  # user -> { pattern_name -> pattern }
user_tempos = {}    # user -> tempo


def default_pattern():
    """Returns a 4x16 grid of False values"""
    return [[False for _ in range(16)] for _ in range(4)]


@app.route('/defaultPattern', methods=['GET'])
def get_default_pattern():
    return jsonify(default_pattern())


@app.route('/pattern/<user>/<name>', methods=['GET'])
def get_pattern(user, name):
    if user not in user_patterns:
        return jsonify(None), 404
    
    patterns = user_patterns[user]
    if name not in patterns:
        return jsonify(None), 404
    
    return jsonify(patterns[name])


@app.route('/pattern/<user>/<name>', methods=['POST'])
def save_pattern(user, name):
    try:
        pattern = request.get_json()
        
        # Basic validation: should be a list of lists
        if not isinstance(pattern, list):
            return jsonify({"error": "Pattern must be an array"}), 400
        
        if user not in user_patterns:
            user_patterns[user] = {}
        
        user_patterns[user][name] = pattern
        return jsonify({}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/tempo/<user>', methods=['GET'])
def get_tempo(user):
    tempo = user_tempos.get(user, 120)  # Default tempo is 120
    return jsonify(tempo)


@app.route('/tempo/<user>', methods=['POST'])
def set_tempo(user):
    try:
        data = request.get_json()
        tempo = data.get('tempo', 120)
        
        if not isinstance(tempo, int) or tempo <= 0:
            return jsonify({"error": "Tempo must be a positive integer"}), 400
        
        user_tempos[user] = tempo
        return jsonify({}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f'DrumMachine Python backend starting on port {port}')
    app.run(host='0.0.0.0', port=port, debug=False)
