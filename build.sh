#!/bin/sh
set -eu
mkdir -p dist/css dist/js dist/img
cp index.html achadinhos.html post.html admin.html reels.html reels-post.html reels-admin.html _headers dist/
cp css/estilo.css dist/css/
cp css/reels-extra.css dist/css/
cp js/dados.js js/reels-dados.js js/tema-feed.js js/loja.js js/reels-loja.js js/admin.js dist/js/
cp img/image.png img/icon-feed.png img/icon-reels.png dist/img/
