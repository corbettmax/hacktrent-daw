#!/usr/bin/env python3
"""
DrumMachine Backend Server (Python/Flask)
Implements the same endpoints as the original Motoko canister:
- GET /defaultPattern
- GET /pattern/<user>/<name>
- POST /pattern/<user>/<name>
- GET /tempo/<user>
- POST /tempo/<user>

Also serves the frontend static files from /static directory
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
# --- ADDED IMPORTS / AI SETUP ---
import re
import json
from typing import Any, Dict

USE_AI = bool(os.getenv("OPENAI_API_KEY"))
try:
    if USE_AI:
        from openai import OpenAI
        oai_client = OpenAI()
except Exception:
    USE_AI = False

# Google Gemini setup
USE_GEMINI = bool(os.getenv("GOOGLE_API_KEY"))
gemini_model = None
try:
    if USE_GEMINI:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        gemini_model = genai.GenerativeModel('gemini-pro')
except Exception as e:
    print(f"Warning: Failed to initialize Gemini: {e}")
    USE_GEMINI = False

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Enable CORS for Electron/browser access

# In-memory storage
user_patterns = {}  # user -> { pattern_name -> pattern }
user_tempos = {}    # user -> tempo


def default_pattern():
    """Returns a 4x16 grid of False values"""
    return [[False for _ in range(16)] for _ in range(4)]


# --- DUMB REGEX PARSER ---
ADD_RE   = re.compile(r"^(add|put in)\s+(an?\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
REMOVE_RE= re.compile(r"^(remove|delete)\s+(the\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
MUTE_RE  = re.compile(r"^mute\s+(the\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
UNMUTE_RE= re.compile(r"^unmute\s+(the\s+)?(808|kick|snare|hi\s*hat|hihat|clap|bass|piano|pad)$", re.I)
TEMPO_ABS= re.compile(r"^set\s+tempo\s+to\s+(\d{2,3})$", re.I)
TEMPO_DEL= re.compile(r"^(increase|decrease)\s+tempo\s+by\s+(\d{1,2})$", re.I)
KEY_RE   = re.compile(r"^set\s+key\s+to\s+(C|G|A\s*minor|E\s*minor)$", re.I)
SWING_RE = re.compile(r"^swing\s+(5[0-9]|6[0-5])%$", re.I)

def parse_command(text: str) -> Dict[str, Any]:
    t = text.strip()
    if m := ADD_RE.match(t):     return {"type":"add","instrument":m.group(3).replace(" ","")}
    if m := REMOVE_RE.match(t):  return {"type":"remove","instrument":m.group(3).replace(" ","")}
    if m := MUTE_RE.match(t):    return {"type":"mute","instrument":m.group(2).replace(" ","")}
    if m := UNMUTE_RE.match(t):  return {"type":"unmute","instrument":m.group(2).replace(" ","")}
    if m := TEMPO_ABS.match(t):  return {"type":"tempo:set","bpm":int(m.group(1))}
    if m := TEMPO_DEL.match(t):
        sign = 1 if m.group(1).lower()=="increase" else -1
        return {"type":"tempo:delta","delta":sign*int(m.group(2))}
    if m := KEY_RE.match(t):     return {"type":"key:set","key":m.group(1).replace("  "," ").title()}
    if m := SWING_RE.match(t):   return {"type":"swing:set","percent":int(m.group(1))}
    return {"type":"unknown","raw":t}

# --- OPTIONAL OPENAI-BASED PLANNER ---
def ai_plan_from_text(text: str) -> Dict[str, Any]:
    prompt = f"""
Return ONLY a JSON object named plan with one of these shapes:
{{"type":"add|remove|mute|unmute","instrument":"808|kick|snare|hihat|clap|bass|piano|pad","pattern":optional}}
{{"type":"tempo:set","bpm":40..220}}
{{"type":"tempo:delta","delta":-50..50}}
{{"type":"key:set","key":"C|G|A minor|E minor"}}
{{"type":"swing:set","percent":50..65}}
User: {text}
Only the JSON. No code fences.
"""
    try:
        resp = oai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":prompt}],
            temperature=0
        )
        raw = resp.choices[0].message.content.strip()
        raw = raw.replace("```json","").replace("```","").strip()
        return json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"OpenAI error: {e}")

# Serve frontend
@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # For SPA routing, serve index.html for unknown routes
        return send_from_directory(app.static_folder, 'index.html')


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


# --- NEW: AI / RULES COMMAND ROUTE ---
@app.route('/api/command', methods=['POST'])
def command_agent():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({"error":"text required"}), 400
    if USE_AI:
        try:
            plan = ai_plan_from_text(text)
            return jsonify({"plan": plan, "source": "ai"})
        except Exception as e:
            # graceful fallback to rules
            plan = parse_command(text)
            return jsonify({"plan": plan, "source": "rules", "ai_error": str(e)}), 200
    # no key: use rules
    plan = parse_command(text)
    return jsonify({"plan": plan, "source": "rules"})


# --- NEW: AI-POWERED SYNTH PARAMETER GENERATION ---
@app.route('/api/generate-synth-params', methods=['POST'])
def generate_synth_params():
    """
    Uses Google Gemini to generate synth parameters based on user description.
    Returns JSON with waveform, frequency, duration, amplitude, and envelope settings.
    """
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '').strip()
    
    if not prompt:
        return jsonify({"error": "prompt required"}), 400
    
    if not USE_GEMINI:
        # Fallback to sensible defaults based on simple keyword matching
        return fallback_synth_params(prompt)
    
    try:
        # Construct the AI prompt for Gemini
        ai_prompt = f"""You are a synthesizer parameter expert. Generate synth parameters for the following sound description: "{prompt}"

Return ONLY a valid JSON object with these exact fields (no markdown, no code blocks):
{{
  "waveform": "sine|square|sawtooth|triangle|noise",
  "frequency": 20-2000 (number in Hz),
  "duration": 0.1-2.0 (number in seconds),
  "amplitude": 0.0-1.0 (number),
  "envelope": {{
    "attack": 0.001-1.0 (number in seconds),
    "decay": 0.001-1.0 (number in seconds),
    "sustain": 0.0-1.0 (number, percentage),
    "release": 0.001-2.0 (number in seconds)
  }}
}}

Guidelines:
- Bass sounds: use sine or triangle, low frequency (40-150 Hz), long release
- Lead sounds: use sawtooth or square, mid frequency (200-800 Hz), short attack
- Pad sounds: use multiple waveforms, long attack/release
- Percussion: use noise or square, short duration, fast attack/release
- Bright sounds: higher frequency, faster attack
- Soft sounds: sine wave, slower attack, longer release

Return ONLY the JSON object, nothing else."""

        # Call Gemini
        response = gemini_model.generate_content(ai_prompt)
        response_text = response.text.strip()
        
        # Clean up response (remove markdown code blocks if present)
        response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Parse the JSON
        params = json.loads(response_text)
        
        # Validate the structure
        required_fields = ['waveform', 'frequency', 'duration', 'amplitude', 'envelope']
        for field in required_fields:
            if field not in params:
                raise ValueError(f"Missing required field: {field}")
        
        envelope_fields = ['attack', 'decay', 'sustain', 'release']
        for field in envelope_fields:
            if field not in params['envelope']:
                raise ValueError(f"Missing envelope field: {field}")
        
        # Return the generated parameters
        return jsonify(params), 200
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error from Gemini response: {e}")
        print(f"Response was: {response_text if 'response_text' in locals() else 'N/A'}")
        return fallback_synth_params(prompt)
    except Exception as e:
        print(f"Error generating synth params with Gemini: {e}")
        return fallback_synth_params(prompt)


def fallback_synth_params(prompt: str) -> tuple:
    """
    Fallback synth parameter generation using simple keyword matching.
    """
    prompt_lower = prompt.lower()
    
    # Default params
    params = {
        "waveform": "sine",
        "frequency": 440,
        "duration": 0.5,
        "amplitude": 0.7,
        "envelope": {
            "attack": 0.01,
            "decay": 0.1,
            "sustain": 0.7,
            "release": 0.3
        }
    }
    
    # Bass sounds
    if any(word in prompt_lower for word in ['bass', 'kick', 'sub', 'low', 'deep']):
        params['waveform'] = 'sine'
        params['frequency'] = 60
        params['duration'] = 1.0
        params['envelope']['attack'] = 0.001
        params['envelope']['decay'] = 0.2
        params['envelope']['sustain'] = 0.3
        params['envelope']['release'] = 0.8
    
    # Lead sounds
    elif any(word in prompt_lower for word in ['lead', 'melody', 'synth', 'bright']):
        params['waveform'] = 'sawtooth'
        params['frequency'] = 440
        params['duration'] = 0.8
        params['envelope']['attack'] = 0.01
        params['envelope']['decay'] = 0.1
        params['envelope']['sustain'] = 0.8
        params['envelope']['release'] = 0.2
    
    # Pad sounds
    elif any(word in prompt_lower for word in ['pad', 'ambient', 'atmosphere', 'soft']):
        params['waveform'] = 'triangle'
        params['frequency'] = 220
        params['duration'] = 2.0
        params['envelope']['attack'] = 0.5
        params['envelope']['decay'] = 0.3
        params['envelope']['sustain'] = 0.9
        params['envelope']['release'] = 1.5
    
    # Percussion sounds
    elif any(word in prompt_lower for word in ['percussion', 'hit', 'snare', 'clap', 'snap']):
        params['waveform'] = 'noise'
        params['frequency'] = 200
        params['duration'] = 0.2
        params['envelope']['attack'] = 0.001
        params['envelope']['decay'] = 0.05
        params['envelope']['sustain'] = 0.2
        params['envelope']['release'] = 0.1
    
    # Pluck sounds
    elif any(word in prompt_lower for word in ['pluck', 'string', 'guitar', 'harp']):
        params['waveform'] = 'sawtooth'
        params['frequency'] = 330
        params['duration'] = 0.6
        params['envelope']['attack'] = 0.001
        params['envelope']['decay'] = 0.3
        params['envelope']['sustain'] = 0.3
        params['envelope']['release'] = 0.4
    
    return jsonify(params), 200


if __name__ == '__main__':
    # Use PORT env var if provided by the host (Cloud Run sets PORT=8080)
    port = int(os.environ.get('PORT', 8080))
    print(f'DrumMachine Python backend starting on port {port}')
    app.run(host='0.0.0.0', port=port, debug=False)
