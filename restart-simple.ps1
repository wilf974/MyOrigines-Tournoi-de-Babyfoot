Write-Host "🔄 Redémarrage de l'application..." -ForegroundColor Yellow

# Arrêter les conteneurs
docker-compose down

# Démarrer les conteneurs
docker-compose up -d

Write-Host "⏳ Attente du démarrage..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker ps

Write-Host "🌐 Application disponible sur http://localhost:2000" -ForegroundColor Green
