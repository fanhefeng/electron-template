#!/bin/bash

# Certificate Name
CERT_NAME="Electron Self-Signed"

echo "Generating Self-Signed Certificate: $CERT_NAME"

# Check if certificate already exists
if security find-identity -v -p codesigning | grep -q "$CERT_NAME"; then
    echo "Certificate '$CERT_NAME' already exists."
    echo "If you want to regenerate it, please delete it from Keychain Access first."
    exit 0
fi

# Generate the certificate
# -g: Generate a new certificate
# -d: The name of the certificate
# -S: Self-signed
# -k: The keychain to install into (login.keychain)
# -t: The type of certificate (codesign)
sudo security create-certificate -g -d "$CERT_NAME" -S -k /Library/Keychains/System.keychain -t codesign

echo "Certificate generated."

# Trust the certificate
# -d: The certificate to modify
# -t: Trust setting (code signing)
# -k: The keychain containing the certificate
echo "Setting trust settings..."
sudo security add-trusted-cert -d -r trustRoot -p codeSign -k /Library/Keychains/System.keychain "/Library/Keychains/System.keychain"

echo "Done! You may need to restart your computer or re-login for changes to take full effect."
echo "Please verify the certificate in Keychain Access app if you encounter issues."
