# Create a temporary directory for the keyfile
mkdir -p temp-mongodb

# Generate the keyfile
openssl rand -base64 756 > temp-mongodb/keyfile

# Verify it was created
cat temp-mongodb/keyfile