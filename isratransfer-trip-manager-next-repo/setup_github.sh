#!/usr/bin/env bash
set -euo pipefail

REPO_NAME=${1:-isratransfer-trip-manager-next}
VISIBILITY=${2:-private}

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install: https://cli.github.com/"
  exit 1
fi

# Authenticate if needed
gh auth status || gh auth login

# Create repo
gh repo create "$REPO_NAME" --${VISIBILITY} --source=. --remote=origin --description "IsraTransfer Trip Manager (Next.js + Supabase)" --disable-wiki --disable-issues --push

echo "Repository created: https://github.com/$(gh repo view "$REPO_NAME" --json nameWithOwner -q .nameWithOwner)"

# Set CI secrets (optional but recommended)
if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  gh secret set NEXT_PUBLIC_SUPABASE_URL --body "$NEXT_PUBLIC_SUPABASE_URL" -R ":OWNER/:REPO" || true
  gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "$NEXT_PUBLIC_SUPABASE_ANON_KEY" -R ":OWNER/:REPO" || true
  echo "Set NEXT_PUBLIC_SUPABASE_* secrets in the repo."
else
  echo "Remember to set repository secrets NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
fi

echo "All done."
