#!/bin/sh
set -eu
mkdir -p dist/css dist/js
cp index.html post.html admin.html _headers dist/
cp css/estilo.css dist/css/
cp js/dados.js js/loja.js js/admin.js dist/js/
