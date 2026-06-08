#!/usr/bin/env bash
# Sekondment — local bootstrap (Phase 0-2 of SETUP.md).
# Safe to re-run. Does NOT touch live infra; that's Phase 1/4 in SETUP.md.
set -e

echo "▶ Sekondment setup — checking prerequisites…"

# Node 20+ check
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node not found. Install Node 20 LTS from nodejs.org and re-run."; exit 1
fi
NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node $(node -v) is too old. Need Node 20 LTS."; exit 1
fi
echo "✓ Node $(node -v)"

# Install deps
echo "▶ Installing dependencies (npm install)…"
npm install

# .env.local scaffold
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "✓ Created .env.local from .env.example — FILL IN your Supabase keys before 'npm run dev'."
else
  echo "✓ .env.local already exists (left untouched)."
fi

# Type-check (non-fatal: report but continue)
echo "▶ Type-checking (npx tsc --noEmit)…"
npx tsc --noEmit && echo "✓ Type-check clean" || echo "⚠ Type errors above — fix per SETUP.md Phase 0."

# Build (the real test)
echo "▶ Building (npm run build)…"
if npm run build; then
  echo "✓ Build succeeded."
else
  echo "⚠ Build failed — fix exactly the errors reported, then re-run. See SETUP.md Phase 0."
  exit 1
fi

echo ""
echo "✅ Local bootstrap done. Next:"
echo "   1. Fill .env.local with Supabase (and later Stripe) keys."
echo "   2. Create Supabase project + run migrations 0001→0022 in order (SETUP.md Phase 1)."
echo "   3. npm run dev → smoke-test the core flow (SETUP.md Phase 3)."
