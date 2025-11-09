# Google Secret Manager Setup Guide

This guide shows how to securely store the Google Gemini API key using Google Secret Manager.

## Prerequisites

- Google Cloud Project with billing enabled (Project ID: `beaming-force-477622-f4`)
- `gcloud` CLI installed and configured
- Appropriate IAM permissions (Secret Manager Admin, Cloud Run Admin)

## Step 1: Enable Required APIs

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Enable Cloud Run API (if not already enabled)
gcloud services enable run.googleapis.com

# Enable Cloud Build API (if not already enabled)
gcloud services enable cloudbuild.googleapis.com
```

## Step 2: Create the Secret

**IMPORTANT:** The secret name must be `hacktrent-daw-api-key-secret` to match the code.

```bash
# Create a new secret named 'hacktrent-daw-api-key-secret'
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets create hacktrent-daw-api-key-secret \
  --data-file=- \
  --replication-policy="automatic"
```

**Alternative: Create secret from file**
```bash
# Save your API key to a file (don't commit this!)
echo "YOUR_ACTUAL_GEMINI_API_KEY" > api_key.txt

# Create secret from file
gcloud secrets create hacktrent-daw-api-key-secret \
  --data-file=api_key.txt \
  --replication-policy="automatic"

# Delete the file for security
rm api_key.txt
```

## Step 3: Grant Cloud Run Access to Secret

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

# Grant the Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding hacktrent-daw-api-key-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Also grant Cloud Build service account access (for deployment)
gcloud secrets add-iam-policy-binding hacktrent-daw-api-key-secret \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Set the GCP_PROJECT Environment Variable

The application needs to know which GCP project to use. Update your Cloud Run service:

```bash
# Deploy or update Cloud Run with the GCP_PROJECT environment variable
gcloud run services update hacktrent-daw \
  --region=us-central1 \
  --set-env-vars="GCP_PROJECT=beaming-force-477622-f4"
```

**Or include it in your initial deployment:**
```bash
gcloud run deploy hacktrent-daw \
  --region=us-central1 \
  --set-env-vars="GCP_PROJECT=beaming-force-477622-f4" \
  --allow-unauthenticated
```

## Step 4: Set the GCP_PROJECT Environment Variable

The application needs to know which GCP project to use. Update your Cloud Run service:

```bash
# Deploy or update Cloud Run with the GCP_PROJECT environment variable
gcloud run services update hacktrent-daw \
  --region=us-central1 \
  --set-env-vars="GCP_PROJECT=beaming-force-477622-f4"
```

**Or include it in your initial deployment:**
```bash
gcloud run deploy hacktrent-daw \
  --region=us-central1 \
  --set-env-vars="GCP_PROJECT=beaming-force-477622-f4" \
  --allow-unauthenticated
```

## Step 5: Verify Secret Creation

```bash
# List all secrets
gcloud secrets list

# View secret metadata (not the actual value)
gcloud secrets describe hacktrent-daw-api-key-secret

# Access the secret value (to verify it's correct)
gcloud secrets versions access latest --secret="hacktrent-daw-api-key-secret"
```

## Step 6: Deploy or Redeploy Your Service

After setting up the secret and environment variables, redeploy your service:

```bash
git add .
git commit -m "Configure Secret Manager for Gemini API"
git push origin main
```

Cloud Build will automatically:
1. Build the Docker image
2. Deploy to Cloud Run

The application will automatically:
1. Detect the GCP_PROJECT environment variable
2. Retrieve the API key from Secret Manager
3. Initialize Gemini with the retrieved key

## Step 7: Verify Deployment

```bash
# Check deployment logs
gcloud run services logs read hacktrent-daw --region=us-central1 --limit=50

# You should see log messages like:
# [STARTUP] GCP_PROJECT detected: beaming-force-477622-f4
# [STARTUP] Attempting to retrieve API key from Secret Manager...
# [SECRET] Successfully retrieved secret 'hacktrent-daw-api-key-secret'
# [STARTUP] ✓ API key retrieved from Secret Manager
# [STARTUP] GOOGLE_API_KEY present: True
# [STARTUP] USE_GEMINI: True
# [STARTUP] Gemini model initialized successfully

# Test the API endpoint
curl -X POST https://YOUR-SERVICE-URL/api/generate-synth-params \
  -H "Content-Type: application/json" \
  -d '{"prompt": "deep bass kick"}'
```

## Updating the Secret

If you need to update the API key:

```bash
# Add a new version
echo -n "NEW_API_KEY" | gcloud secrets versions add hacktrent-daw-api-key-secret --data-file=-

# The application will automatically use the latest version on next restart
# Force a restart by redeploying:
gcloud run services update hacktrent-daw --region=us-central1
```

## Security Best Practices

### ✅ DO:
- Use Secret Manager for all sensitive credentials
- Rotate API keys regularly
- Use IAM to restrict access to secrets
- Enable audit logging for secret access
- Use least privilege principle for service accounts

### ❌ DON'T:
- Never commit API keys to git
- Don't store secrets in environment variables in `cloudbuild.yaml`
- Don't share secrets via email or chat
- Don't use the same API key across multiple projects

## Troubleshooting

### Permission Denied Error
```bash
# Ensure the service account has the correct role
gcloud secrets add-iam-policy-binding hacktrent-daw-api-key-secret \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### Secret Not Found
```bash
# Verify the secret exists
gcloud secrets list

# Check the secret name in the application logs
# It should be: hacktrent-daw-api-key-secret
```

### Cloud Build Can't Access Secret
```bash
# Grant Cloud Build service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding hacktrent-daw-api-key-secret \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### GCP_PROJECT Not Set
If you see `[STARTUP] Falling back to GOOGLE_API_KEY environment variable`, the GCP_PROJECT env var is missing:

```bash
# Set it on your Cloud Run service
gcloud run services update hacktrent-daw \
  --region=us-central1 \
  --set-env-vars="GCP_PROJECT=beaming-force-477622-f4"
```

## Cost Considerations

- Secret Manager pricing:
  - $0.06 per secret per month
  - $0.03 per 10,000 access operations
  
- For this application (single secret, low access frequency):
  - Estimated cost: < $1/month

## Local Development

For local development, you can still use environment variables:

```bash
# Set locally (not in production)
export GOOGLE_API_KEY="your-api-key-for-local-dev"

# Run the server
python backend/server.py
```

Or use the gcloud CLI to access the secret:

```bash
# Fetch secret and set as environment variable
export GOOGLE_API_KEY=$(gcloud secrets versions access latest --secret="gemeni_key")

# Run the server
python backend/server.py
```

## Additional Resources

- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Secrets](https://cloud.google.com/run/docs/configuring/secrets)
- [IAM for Secret Manager](https://cloud.google.com/secret-manager/docs/access-control)
