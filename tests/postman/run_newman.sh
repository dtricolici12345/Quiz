#!/usr/bin/env bash
# --- Run Postman collection with newman (no Postman app required) ---
# Prereqs: 1) Install Node.js  2) npm install -g newman

COLLECTION="FootballQuiz_Friends.postman_collection.json"
ENV="FootballQuiz_Local.postman_environment.json"

echo "Running collection: $COLLECTION"
echo "Using environment:  $ENV"
echo

# Adjust timeout if your local server is slow to start
newman run "$COLLECTION" -e "$ENV" --reporters cli --timeout-request 15000 "$@"
