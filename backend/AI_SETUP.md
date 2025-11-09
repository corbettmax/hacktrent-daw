# AI-Powered Synth Parameter Generation

This backend now supports AI-powered synthesizer parameter generation using Google Gemini.

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 3. Set Environment Variable

#### On Linux/Mac:
```bash
export GOOGLE_API_KEY="your-api-key-here"
```

#### On Windows (PowerShell):
```powershell
$env:GOOGLE_API_KEY="your-api-key-here"
```

#### On Windows (CMD):
```cmd
set GOOGLE_API_KEY=your-api-key-here
```

#### For Cloud Run Deployment:

**Recommended: Use Google Secret Manager (Secure)**

See [SECRET_MANAGER_SETUP.md](../SECRET_MANAGER_SETUP.md) for detailed instructions.

Quick setup:
```bash
# Create the secret
echo -n "your-api-key-here" | gcloud secrets create gemeni_key \
  --data-file=- \
  --replication-policy="automatic"

# Grant access to Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemeni_key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Alternative: Direct Environment Variable (Less Secure)**
**Alternative: Direct Environment Variable (Less Secure)**

```bash
gcloud run services update hacktrent-daw \
  --set-env-vars GOOGLE_API_KEY=your-api-key-here \
  --region us-central1
```

> ⚠️ **Security Note**: Using Secret Manager is strongly recommended for production deployments as it provides better security, audit logging, and key rotation capabilities.

### 4. Run the Server

```bash
python server.py
```

## How It Works

### API Endpoint
**POST** `/api/generate-synth-params`

**Request Body:**
```json
{
  "prompt": "deep bass kick"
}
```

**Response:**
```json
{
  "waveform": "sine",
  "frequency": 60,
  "duration": 1.0,
  "amplitude": 0.8,
  "envelope": {
    "attack": 0.001,
    "decay": 0.2,
    "sustain": 0.3,
    "release": 0.8
  }
}
```

### Fallback Mode

If the `GOOGLE_API_KEY` is not set, the system will use a rule-based fallback that matches keywords in the prompt to generate sensible default parameters:

- **Bass sounds**: Keywords like "bass", "kick", "sub", "low", "deep"
- **Lead sounds**: Keywords like "lead", "melody", "synth", "bright"
- **Pad sounds**: Keywords like "pad", "ambient", "atmosphere", "soft"
- **Percussion**: Keywords like "percussion", "hit", "snare", "clap"
- **Pluck sounds**: Keywords like "pluck", "string", "guitar", "harp"

## Usage in Frontend

The Wave Editor's "Generate with AI" button will:
1. Prompt the user to describe the sound they want
2. Send the description to `/api/generate-synth-params`
3. Apply the AI-generated parameters to the synthesizer controls
4. Update the waveform display with the new sound

### Example Prompts

- "deep bass kick"
- "bright synth lead"
- "ambient pad"
- "snappy percussion hit"
- "soft plucked string"
- "aggressive sawtooth lead"
- "warm analog bass"

## Security Notes

- Never commit your API key to git
- Use environment variables for production
- Consider implementing rate limiting for the API endpoint
- Monitor your Google Cloud billing for API usage
