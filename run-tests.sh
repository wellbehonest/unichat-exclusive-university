#!/bin/bash
# Run integration tests against Firebase emulators
# Usage: ./run-tests.sh [test-file]

set -e

# Default emulator ports
export FIRESTORE_EMULATOR_HOST="${FIRESTORE_EMULATOR_HOST:-localhost:8080}"
export RTDB_EMULATOR_HOST="${RTDB_EMULATOR_HOST:-localhost:9000}"
export FIREBASE_AUTH_EMULATOR_HOST="${FIREBASE_AUTH_EMULATOR_HOST:-localhost:9099}"
export FIREBASE_CONFIG='{"projectId":"chattingmap-c97b0"}'

echo "🔧 Firebase Emulator Environment:"
echo "  Firestore: $FIRESTORE_EMULATOR_HOST"
echo "  RTDB: $RTDB_EMULATOR_HOST"
echo "  Auth: $FIREBASE_AUTH_EMULATOR_HOST"
echo ""

if [ -z "$1" ]; then
  echo "▶️  Running all integration tests..."
  node --test tests/reserve_consume_test.cjs
else
  echo "▶️  Running test: $1"
  node --test "$1"
fi
