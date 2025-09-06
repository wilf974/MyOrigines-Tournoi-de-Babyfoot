# Script PowerShell pour démarrer l'application Docker
Write-Host "🐳 Démarrage de l'application Tournoi MyOrigines avec Docker..." -ForegroundColor Green

# Vérifier si Docker est installé
try {
    docker --version | Out-Null
    Write-Host "✅ Docker détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer Docker Desktop depuis: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Vérifier si Docker Compose est disponible
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose n'est pas disponible" -ForegroundColor Red
    exit 1
}

# Arrêter les conteneurs existants
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose down

# Construire et démarrer les conteneurs
Write-Host "🔨 Construction et démarrage des conteneurs..." -ForegroundColor Blue
docker-compose up --build -d

# Attendre que les services soient prêts
Write-Host "⏳ Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Vérifier le statut des conteneurs
Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker-compose ps

# Afficher les URLs d'accès
Write-Host "`n🌐 URLs d'accès:" -ForegroundColor Green
Write-Host "   Frontend React: http://localhost:2000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:2001" -ForegroundColor White
Write-Host "   Application complète: http://localhost:2002" -ForegroundColor White

Write-Host "`n📝 Informations:" -ForegroundColor Cyan
Write-Host "   - Mot de passe admin: 123456" -ForegroundColor White
Write-Host "   - Base de données: PostgreSQL sur le port 2003" -ForegroundColor White
Write-Host "   - Auto-refresh: 3 secondes" -ForegroundColor White

Write-Host "`n🔧 Commandes utiles:" -ForegroundColor Cyan
Write-Host "   Arrêter: docker-compose down" -ForegroundColor White
Write-Host "   Logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   Redémarrer: docker-compose restart" -ForegroundColor White

Write-Host "`n✅ Application démarrée avec succès!" -ForegroundColor Green
