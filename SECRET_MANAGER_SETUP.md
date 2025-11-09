# Google Secret Manager Setup Guide

This guide shows how to securely store the Google Gemini API key using Google Secret Manager.

## Prerequisites

- Google Cloud Project with billing enabled
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

```bash
# Create a new secret named 'gemini-api-key'
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

**Alternative: Create secret from file**
```bash
# Save your API key to a file (don't commit this!)
echo "YOUR_ACTUAL_GEMINI_API_KEY" > api_key.txt

# Create secret from file
gcloud secrets create gemini-api-key \
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
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Also grant Cloud Build service account access (for deployment)
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Verify Secret Creation

```bash
# List all secrets
gcloud secrets list

# View secret metadata (not the actual value)
gcloud secrets describe gemini-api-key

# Access the secret value (to verify it's correct)
gcloud secrets versions access latest --secret="gemini-api-key"
```

## Step 5: Deploy with Cloud Build

The `cloudbuild.yaml` is already configured to use the secret. Just push your code:

```bash
git add .
git commit -m "Configure Secret Manager for Gemini API"
git push origin main
```

Cloud Build will automatically:
1. Build the Docker image
2. Access the secret from Secret Manager
3. Deploy to Cloud Run with the secret mounted as an environment variable

## Step 6: Verify Deployment

```bash
# Check if the secret is properly configured
gcloud run services describe hacktrent-daw \
  --region=us-central1 \
  --format='value(spec.template.spec.containers[0].env)'

# Test the API endpoint
curl -X POST https://YOUR-SERVICE-URL/api/generate-synth-params \
  -H "Content-Type: application/json" \
  -d '{"prompt": "deep bass kick"}'
```

## Updating the Secret

If you need to update the API key:

```bash
# Add a new version
echo -n "NEW_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

# Cloud Run will automatically use the latest version
# You may need to redeploy for the change to take effect:
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
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### Secret Not Found
```bash
# Verify the secret exists
gcloud secrets list

# Check the secret name matches in cloudbuild.yaml
# It should be: gemini-api-key
```

### Cloud Build Can't Access Secret
```bash
# Grant Cloud Build service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
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
export GOOGLE_API_KEY=$(gcloud secrets versions access latest --secret="gemini-api-key")

# Run the server
python backend/server.py
```

## Additional Resources

- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Secrets](https://cloud.google.com/run/docs/configuring/secrets)
- [IAM for Secret Manager](https://cloud.google.com/secret-manager/docs/access-control)
