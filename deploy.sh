#!/bin/bash
echo "🚀 Déploiement..."
echo "📥 Git sync forcé..."
git fetch origin
git reset --hard origin/main
echo "📦 Install + Build frontend..."
cd client && npm install && npm run build && cd ..
echo "📦 Install backend..."
cd server && npm install && cd ..
echo "🔁 Restart backend..."
pm2 restart backend --update-env
echo "🌐 Reload nginx..."
nginx -s reload
echo "✅ Deploy terminé"