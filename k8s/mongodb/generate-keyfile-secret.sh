#!/bin/bash

# Generate random keyfile content
KEYFILE_CONTENT=$(openssl rand -base64 756)

# Base64 encode it for Kubernetes Secret
KEYFILE_BASE64=$(echo -n "$KEYFILE_CONTENT" | base64 | tr -d '\n')

# Create the Secret YAML file
cat > k8s/mongodb/keyfile-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-keyfile
  namespace: bookingapp
type: Opaque
data:
  keyfile: $KEYFILE_BASE64
EOF

echo "✓ keyfile-secret.yaml created successfully!"