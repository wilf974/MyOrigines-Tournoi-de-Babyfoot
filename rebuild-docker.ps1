# Script PowerShell pour reconstruire les conteneurs Docker
Write-Host "🔄 Arrêt des conteneurs Docker..." -ForegroundColor Yellow
docker-compose down

Write-Host "🧹 Nettoyage du cache Docker..." -ForegroundColor Yellow
docker system prune -f

Write-Host "🔨 Reconstruction des images..." -ForegroundColor Yellow
docker-compose build --no-cache

Write-Host "🚀 Démarrage des conteneurs..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "✅ Déploiement terminé !" -ForegroundColor Green
Write-Host "🌐 Application disponible sur http://localhost:2000" -ForegroundColor Cyan

