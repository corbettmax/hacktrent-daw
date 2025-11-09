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

# --- Google Cloud Secret Manager Setup ---
def get_secret_value(project_id, secret_id, version_id="1"):
    """Access the payload for the given secret version if one exists.
    
    Args:
        project_id (str): The Google Cloud project ID.
        secret_id (str): The ID of the secret to access.
        version_id (str): The version of the secret to access (e.g., "latest").
    
    Returns:
        str: The secret payload as a string, or None if error.
    """
    try:
        import google.cloud.secretmanager as secretmanager
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
        response = client.access_secret_version(request={"name": name})
        payload = response.payload.data.decode("UTF-8")
        print(f"[SECRET] Successfully retrieved secret '{secret_id}'")
        return payload
    except Exception as e:
        print(f"[SECRET] Error accessing secret '{secret_id}': {e}")
        return None

# Get the GCP Project ID from the environment (Cloud Run automatically sets this)
PROJECT_ID = os.environ.get("GCP_PROJECT")
API_KEY_SECRET_ID = "gemini_key"

# Try environment variable FIRST (Cloud Run sets this via --set-secrets)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    print("[STARTUP] ✓ API key found in GOOGLE_API_KEY environment variable")
else:
    print("[STARTUP] GOOGLE_API_KEY not in environment, trying Secret Manager...")
    # Fallback to Secret Manager for other deployment scenarios
    if PROJECT_ID:
        print(f"[STARTUP] GCP_PROJECT detected: {PROJECT_ID}")
        print(f"[STARTUP] Attempting to retrieve API key from Secret Manager...")
        GOOGLE_API_KEY = get_secret_value(PROJECT_ID, API_KEY_SECRET_ID)
        if GOOGLE_API_KEY:
            print("[STARTUP] ✓ API key retrieved from Secret Manager")
        else:
            print("[STARTUP] ✗ Failed to retrieve API key from Secret Manager")
    else:
        print("[STARTUP] ✗ No GCP_PROJECT found, cannot use Secret Manager")

USE_AI = bool(os.getenv("OPENAI_API_KEY"))
try:
    if USE_AI:
        from openai import OpenAI
        oai_client = OpenAI()
except Exception:
    USE_AI = False

# Google Gemini setup
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


# --- NEW: AI-POWERED FULL SYNTH SETTINGS GENERATION ---
@app.route('/api/generate-synth-settings', methods=['POST'])
def generate_synth_settings():
    """
    Uses Google Gemini to generate complete synthesizer settings based on user description.
    Returns JSON with oscillators, envelope, filter, and effects settings.
    """
    data = request.get_json(silent=True) or {}
    prompt = data.get('prompt', '').strip()
    
    print(f"[API] generate-synth-settings called with prompt: '{prompt}'")
    print(f"[API] USE_GEMINI: {USE_GEMINI}")
    
    if not prompt:
        return jsonify({"error": "prompt required"}), 400
    
    if not USE_GEMINI:
        print("[API] Using fallback - Gemini not available")
        return fallback_synth_settings(prompt)
    
    try:
        # Construct the AI prompt for Gemini
        ai_prompt = f"""You are an expert synthesizer designer with deep knowledge of sound synthesis. Create unique and musically interesting synth settings for: "{prompt}"

IMPORTANT: Be creative and vary the parameters significantly based on the description.

Return ONLY a valid JSON object (no markdown, no code blocks, no explanations):
{{
  "oscillators": [
    {{
      "waveform": "sine|square|sawtooth|triangle",
      "detune": -50 to 50 (number in cents),
      "volume": 0.1-1.0 (number)
    }}
  ],
  "envelope": {{
    "attack": 0.001-2.0 (seconds),
    "decay": 0.001-2.0 (seconds),
    "sustain": 0.0-1.0 (level),
    "release": 0.01-3.0 (seconds)
  }},
  "filter": {{
    "filterType": "lowpass|highpass|bandpass|notch",
    "cutoff": 20-20000 (Hz),
    "resonance": 0.1-20.0 (Q factor)
  }},
  "effects": {{
    "delayTime": 0.0-1.0 (seconds),
    "delayFeedback": 0.0-0.9 (level),
    "reverbAmount": 0.0-1.0 (level)
  }}
}}

Synth Design Guidelines:

WARM/ANALOG SOUNDS:
- Use sine or triangle waves
- Multiple slightly detuned oscillators (detune: ±5 to ±15 cents)
- Slow attack (0.1-0.5s), medium-long release
- Lowpass filter with moderate cutoff (500-2000 Hz)
- Add subtle reverb (0.2-0.4)

BRIGHT/AGGRESSIVE LEADS:
- Sawtooth or square waves
- Sharp attack (0.001-0.01s)
- Highpass or lowpass with high cutoff (2000-8000 Hz)
- High resonance (5-15) for character
- Minimal effects or short delay

PADS/AMBIENT:
- Multiple oscillators with wider detune (±10 to ±30 cents)
- Very slow attack (0.5-2.0s), long release (1.0-3.0s)
- Lowpass filter with lower cutoff (400-1500 Hz)
- Heavy reverb (0.5-1.0), longer delay

PLUCKS/PERCUSSIVE:
- Sawtooth or triangle
- Instant attack (0.001s), fast decay (0.05-0.2s)
- Low sustain (0.1-0.3), short release
- Bandpass or lowpass filter
- Minimal effects

BASS SOUNDS:
- Sine, triangle, or sawtooth
- Single oscillator or unison with tight detune (±2 to ±5)
- Fast attack, moderate decay/release
- Lowpass filter with low cutoff (200-800 Hz)

ANALYZE the prompt for mood, texture, and musical style, then creatively combine parameters!

Return ONLY the JSON object:"""

        # Call Gemini
        response = gemini_model.generate_content(
            ai_prompt,
            generation_config={
                'temperature': 0.9,
                'top_p': 0.95,
                'top_k': 40,
            }
        )
        response_text = response.text.strip()
        
        print(f"[API] Gemini response: {response_text[:200]}...")
        
        # Clean up response
        response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Parse the JSON
        settings = json.loads(response_text)
        
        # Validate and sanitize the structure
        if 'oscillators' not in settings or not isinstance(settings['oscillators'], list):
            settings['oscillators'] = [{"waveform": "sine", "detune": 0, "volume": 0.5}]
        
        if 'envelope' not in settings:
            settings['envelope'] = {"attack": 0.1, "decay": 0.2, "sustain": 0.7, "release": 0.3}
        
        if 'filter' not in settings:
            settings['filter'] = {"filterType": "lowpass", "cutoff": 2000, "resonance": 1.0}
        
        if 'effects' not in settings:
            settings['effects'] = {"delayTime": 0.3, "delayFeedback": 0.3, "reverbAmount": 0.2}
        
        print(f"[API] Successfully generated synth settings")
        return jsonify(settings), 200
        
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON decode error: {e}")
        print(f"[ERROR] Response text: {response_text}")
        return fallback_synth_settings(prompt)
    except Exception as e:
        print(f"[ERROR] Error generating synth settings with Gemini: {e}")
        return fallback_synth_settings(prompt)


def fallback_synth_settings(prompt: str):
    """Fallback synth settings based on keyword matching"""
    prompt_lower = prompt.lower()
    
    settings = {
        "oscillators": [
            {"waveform": "sine", "detune": 0, "volume": 0.5}
        ],
        "envelope": {
            "attack": 0.1,
            "decay": 0.2,
            "sustain": 0.7,
            "release": 0.3
        },
        "filter": {
            "filterType": "lowpass",
            "cutoff": 2000,
            "resonance": 1.0
        },
        "effects": {
            "delayTime": 0.3,
            "delayFeedback": 0.3,
            "reverbAmount": 0.2
        }
    }
    
    # Warm/Analog
    if any(word in prompt_lower for word in ['warm', 'analog', 'vintage', 'soft']):
        settings['oscillators'] = [
            {"waveform": "sine", "detune": -7, "volume": 0.5},
            {"waveform": "triangle", "detune": 7, "volume": 0.4}
        ]
        settings['envelope'] = {"attack": 0.3, "decay": 0.2, "sustain": 0.8, "release": 0.5}
        settings['filter'] = {"filterType": "lowpass", "cutoff": 1200, "resonance": 2.0}
        settings['effects'] = {"delayTime": 0.4, "delayFeedback": 0.25, "reverbAmount": 0.35}
    
    # Bright/Aggressive Lead
    elif any(word in prompt_lower for word in ['bright', 'aggressive', 'lead', 'sharp']):
        settings['oscillators'] = [
            {"waveform": "sawtooth", "detune": 0, "volume": 0.7},
            {"waveform": "square", "detune": -5, "volume": 0.4}
        ]
        settings['envelope'] = {"attack": 0.01, "decay": 0.15, "sustain": 0.7, "release": 0.2}
        settings['filter'] = {"filterType": "lowpass", "cutoff": 5000, "resonance": 8.0}
        settings['effects'] = {"delayTime": 0.15, "delayFeedback": 0.2, "reverbAmount": 0.1}
    
    # Pad/Ambient
    elif any(word in prompt_lower for word in ['pad', 'ambient', 'atmosphere', 'dreamy', 'ethereal']):
        settings['oscillators'] = [
            {"waveform": "sine", "detune": -12, "volume": 0.4},
            {"waveform": "triangle", "detune": 12, "volume": 0.4},
            {"waveform": "sawtooth", "detune": 0, "volume": 0.3}
        ]
        settings['envelope'] = {"attack": 1.2, "decay": 0.5, "sustain": 0.9, "release": 2.0}
        settings['filter'] = {"filterType": "lowpass", "cutoff": 800, "resonance": 1.5}
        settings['effects'] = {"delayTime": 0.6, "delayFeedback": 0.4, "reverbAmount": 0.8}
    
    # Bass
    elif any(word in prompt_lower for word in ['bass', 'sub', 'low', 'deep']):
        settings['oscillators'] = [
            {"waveform": "sine", "detune": 0, "volume": 0.8},
            {"waveform": "triangle", "detune": -3, "volume": 0.3}
        ]
        settings['envelope'] = {"attack": 0.01, "decay": 0.2, "sustain": 0.5, "release": 0.3}
        settings['filter'] = {"filterType": "lowpass", "cutoff": 400, "resonance": 2.0}
        settings['effects'] = {"delayTime": 0.0, "delayFeedback": 0.0, "reverbAmount": 0.05}
    
    # Pluck
    elif any(word in prompt_lower for word in ['pluck', 'string', 'harp', 'percussive']):
        settings['oscillators'] = [
            {"waveform": "sawtooth", "detune": 0, "volume": 0.6},
            {"waveform": "triangle", "detune": 12, "volume": 0.3}
        ]
        settings['envelope'] = {"attack": 0.001, "decay": 0.15, "sustain": 0.2, "release": 0.3}
        settings['filter'] = {"filterType": "bandpass", "cutoff": 1500, "resonance": 3.0}
        settings['effects'] = {"delayTime": 0.2, "delayFeedback": 0.15, "reverbAmount": 0.15}
    
    return jsonify(settings), 200


if __name__ == '__main__':
    # Use PORT env var if provided by the host (Cloud Run sets PORT=8080)
    port = int(os.environ.get('PORT', 8080))
    print(f'DrumMachine Python backend starting on port {port}')
    app.run(host='0.0.0.0', port=port)
