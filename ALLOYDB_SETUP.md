# AlloyDB Connection Setup

This guide explains how to connect your HackTrent DAW application to AlloyDB.

## Prerequisites

1. **AlloyDB cluster created** in Google Cloud
2. **Database and user configured** in AlloyDB
3. **Cloud Run service** with proper IAM permissions

## Environment Variables

Your Cloud Run service needs these environment variables:

### Required Variables:

```bash
ALLOYDB_INSTANCE="projects/YOUR_PROJECT/locations/YOUR_REGION/clusters/YOUR_CLUSTER/instances/YOUR_INSTANCE"
ALLOYDB_USER="postgres"  # or your custom user
ALLOYDB_PASSWORD="your-secure-password"
ALLOYDB_DATABASE="postgres"  # or your custom database name
```

## Setup Steps

### 1. Get your AlloyDB Instance Connection String

```bash
gcloud alloydb instances describe YOUR_INSTANCE \
  --cluster=YOUR_CLUSTER \
  --region=YOUR_REGION \
  --format="value(name)"
```

This returns something like:
```
projects/my-project/locations/us-central1/clusters/my-cluster/instances/my-instance
```

### 2. Update Cloud Run with Environment Variables

Using `gcloud`:

```bash
gcloud run services update hacktrent-daw \
  --region=us-central1 \
  --set-env-vars="ALLOYDB_INSTANCE=projects/YOUR_PROJECT/locations/YOUR_REGION/clusters/YOUR_CLUSTER/instances/YOUR_INSTANCE,ALLOYDB_USER=postgres,ALLOYDB_PASSWORD=your-password,ALLOYDB_DATABASE=drummachine"
```

Or add to `cloudbuild.yaml`:

```yaml
- name: 'gcr.io/cloud-builders/gcloud'
  args:
    - 'run'
    - 'deploy'
    - 'hacktrent-daw'
    - '--image=gcr.io/$PROJECT_ID/hacktrent-daw:$COMMIT_SHA'
    - '--region=us-central1'
    - '--platform=managed'
    - '--allow-unauthenticated'
    - '--port=8080'
    - '--set-env-vars=ALLOYDB_INSTANCE=projects/$PROJECT_ID/locations/us-central1/clusters/CLUSTER/instances/INSTANCE'
    - '--set-env-vars=ALLOYDB_USER=postgres'
    - '--set-env-vars=ALLOYDB_PASSWORD=your-password'
    - '--set-env-vars=ALLOYDB_DATABASE=drummachine'
```

### 3. Grant Cloud Run Service Account Access

Your Cloud Run service account needs AlloyDB Client role:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/alloydb.client"
```

### 4. Enable VPC Connector (if needed)

AlloyDB requires private IP access. You may need a VPC connector:

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create alloydb-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28

# Update Cloud Run to use it
gcloud run services update hacktrent-daw \
  --region=us-central1 \
  --vpc-connector=alloydb-connector
```

## Database Schema

The application automatically creates these tables on startup:

### user_patterns
```sql
CREATE TABLE user_patterns (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, pattern_name)
);
```

### user_tempos
```sql
CREATE TABLE user_tempos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    tempo INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Connection

The app will log on startup:
- ✅ "Connected to AlloyDB successfully" - Database is working
- ⚠️ "Warning: Database modules not available, using in-memory storage" - Fallback mode

Check Cloud Run logs:
```bash
gcloud run services logs read hacktrent-daw --region=us-central1
```

## Troubleshooting

### Connection Timeout
- Check VPC connector is attached
- Verify AlloyDB instance is in same VPC network
- Ensure AlloyDB accepts connections from Cloud Run's IP range

### Authentication Failed
- Verify ALLOYDB_USER and ALLOYDB_PASSWORD are correct
- Check if user has proper database permissions

### Permission Denied
- Ensure service account has `roles/alloydb.client` role
- Check IAM policy bindings

## Cost Optimization

AlloyDB can be expensive. Consider:
- Using **Cloud SQL** instead (cheaper alternative)
- **Shared core** instances for development
- **Auto-scaling** to zero when not in use (Cloud Run handles this)

## Alternative: Cloud SQL PostgreSQL

If AlloyDB is too expensive, you can switch to Cloud SQL by:

1. Change `ALLOYDB_INSTANCE` format to Cloud SQL format:
   ```
   PROJECT:REGION:INSTANCE
   ```

2. The Cloud SQL Python Connector works with both!

No code changes needed - just update environment variables.
