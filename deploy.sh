#!/bin/bash
echo "🚀 Déploiement..."
echo "📥 Git pull..."
git pull
echo "📦 Install + Build frontend..."
cd client && npm install && npm run build && cd ..
echo "📦 Install backend..."
cd server && npm install && cd ..
echo "🔁 Restart backend..."
pm2 restart backend --update-env
echo "🌐 Reload nginx..."
nginx -s reload
echo "✅ Deploy terminé"