#!/bin/bash
# scripts/pre-commit-scan.sh
set -e
echo "Running secret scan..."
if command -v gitleaks > /dev/null 2>&1; then
  gitleaks detect --source . --config .gitleaks.toml --no-git --redact
  echo "No secrets detected"
else
  echo "WARNING: gitleaks not installed. Install with: brew install gitleaks"
fi
