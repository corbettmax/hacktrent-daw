# Quick Setup: Gemini API with Secret Manager

## For New Deployments

```bash
# 1. Enable required APIs
gcloud services enable secretmanager.googleapis.com

# 2. Create the secret with your Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"

# 3. Get your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

# 4. Grant Cloud Run service account access
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 5. Grant Cloud Build service account access
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 6. Deploy (Cloud Build will automatically use the secret)
git push origin main
```

## Verify Setup

```bash
# Check if secret exists
gcloud secrets describe gemini-api-key

# Test the deployed API
curl -X POST https://YOUR-SERVICE-URL/api/generate-synth-params \
  -H "Content-Type: application/json" \
  -d '{"prompt": "warm analog bass"}'
```

## Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key and use it in step 2 above

## Architecture

```
Frontend (WaveEditor)
    ↓ POST /api/generate-synth-params
Backend (Flask server.py)
    ↓ GOOGLE_API_KEY from env
Secret Manager
    ↓ gemini-api-key secret
Google Gemini API
    ↓ AI-generated synth parameters
Backend → Frontend (apply parameters)
```

## What's Configured

- ✅ `cloudbuild.yaml` - Configured to mount secret as environment variable
- ✅ `server.py` - Reads `GOOGLE_API_KEY` from environment
- ✅ `requirements.txt` - Includes Google Cloud Secret Manager library
- ✅ Fallback system - Works without API key using rule-based generation

## Local Development

```bash
# Option 1: Use environment variable
export GOOGLE_API_KEY="your-dev-api-key"
python backend/server.py

# Option 2: Fetch from Secret Manager
export GOOGLE_API_KEY=$(gcloud secrets versions access latest --secret="gemini-api-key")
python backend/server.py
```

## Security Benefits

- 🔒 API key never stored in code or git
- 📝 Audit logging of secret access
- 🔄 Easy key rotation
- 🛡️ IAM-based access control
- 🌐 Works across Cloud Build and Cloud Run

For detailed information, see [SECRET_MANAGER_SETUP.md](./SECRET_MANAGER_SETUP.md)
