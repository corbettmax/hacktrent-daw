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
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
USE_GEMINI = bool(GOOGLE_API_KEY)
gemini_model = None

print(f"[STARTUP] GOOGLE_API_KEY present: {bool(GOOGLE_API_KEY)}")
print(f"[STARTUP] USE_GEMINI: {USE_GEMINI}")

try:
    if USE_GEMINI:
        import google.generativeai as genai
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        print("[STARTUP] Gemini model initialized successfully")
except Exception as e:
    print(f"[ERROR] Failed to initialize Gemini: {e}")
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
    
    print(f"[API] generate-synth-params called with prompt: '{prompt}'")
    print(f"[API] USE_GEMINI: {USE_GEMINI}")
    print(f"[API] gemini_model: {gemini_model}")
    
    if not prompt:
        return jsonify({"error": "prompt required"}), 400
    
    if not USE_GEMINI:
        print("[API] Using fallback - Gemini not available")
        # Fallback to sensible defaults based on simple keyword matching
        return fallback_synth_params(prompt)
    
    try:
        # Construct the AI prompt for Gemini
        ai_prompt = f"""You are an expert sound designer with deep knowledge of synthesis parameters. Create unique and musically interesting synth parameters for: "{prompt}"

IMPORTANT: Be creative and vary the parameters significantly based on the description. Don't default to similar values.

Return ONLY a valid JSON object (no markdown, no code blocks, no explanations):
{{
  "waveform": "sine|square|sawtooth|triangle|noise",
  "frequency": 20-2000 (number in Hz),
  "duration": 0.1-2.0 (number in seconds),
  "amplitude": 0.3-0.9 (number),
  "envelope": {{
    "attack": 0.001-1.5 (number in seconds),
    "decay": 0.001-1.2 (number in seconds),
    "sustain": 0.1-0.95 (number, 0-1 range),
    "release": 0.01-2.5 (number in seconds)
  }}
}}

Sound Design Guidelines (vary these based on context):

BASS SOUNDS:
- Deep bass: sine, 30-60 Hz, attack 0.001-0.01s, long release 0.8-1.5s
- Sub bass: sine, 40-80 Hz, very short attack, sustain 0.9
- Fat bass: triangle, 50-100 Hz, medium attack 0.05s, decay 0.3s
- Growl bass: sawtooth, 60-120 Hz, short attack, low sustain 0.2-0.4

LEAD SOUNDS:
- Bright lead: sawtooth, 300-800 Hz, attack 0.01-0.03s, sustain 0.7-0.85
- Sharp lead: square, 400-1000 Hz, very short attack 0.001s, medium release
- Smooth lead: triangle, 250-600 Hz, attack 0.05-0.1s, long release
- Aggressive lead: square, 500-1200 Hz, attack 0.001s, low sustain 0.3

PAD SOUNDS:
- Warm pad: sine/triangle, 150-400 Hz, long attack 0.5-1.2s, long release 1.5-2.5s
- Bright pad: sawtooth, 300-700 Hz, attack 0.3-0.8s, sustain 0.85-0.95
- Dark pad: sine, 100-250 Hz, slow attack 0.8-1.5s, very long release 2.0s+
- Ethereal pad: triangle, 200-500 Hz, very slow attack 1.0-1.5s

PLUCK SOUNDS:
- Bright pluck: sawtooth, 300-800 Hz, attack 0.001s, decay 0.15-0.3s, sustain 0.1-0.3
- Soft pluck: triangle, 250-600 Hz, attack 0.01s, decay 0.2-0.4s, sustain 0.4
- Bell-like: sine, 400-1000 Hz, attack 0.001s, long decay 0.5s, low sustain 0.1

PERCUSSION:
- Snappy: noise, 200-800 Hz, attack 0.001s, decay 0.02-0.08s, release 0.05-0.15s
- Soft hit: filtered noise, 150-400 Hz, attack 0.005s, decay 0.1s
- Click: noise, 800-1500 Hz, very short duration 0.05s, attack 0.001s

FX SOUNDS:
- Sweep: sawtooth, vary frequency 100-2000, long duration 1.5-2s, long attack
- Rise: triangle, 50-500 Hz, duration 1-2s, slow attack 0.5-1s
- Zap: square, 300-1500 Hz, short duration 0.15s, fast attack/release

ANALYZE the user's prompt for:
- Mood descriptors (warm, cold, bright, dark, aggressive, soft, smooth, harsh)
- Sonic qualities (punchy, fat, thin, wide, narrow, rich, hollow)
- Musical context (techno, ambient, jazz, rock, cinematic)
- Energy level (energetic, laid-back, intense, gentle)

Then creatively combine and adjust parameters to match. BE CREATIVE and VARY the values significantly!

Return ONLY the JSON object:"""

        # Call Gemini
        response = gemini_model.generate_content(
            ai_prompt,
            generation_config={
                'temperature': 0.9,  # Higher temperature for more variety
                'top_p': 0.95,
                'top_k': 40,
            }
        )
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
