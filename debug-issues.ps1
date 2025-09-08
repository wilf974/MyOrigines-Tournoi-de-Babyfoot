# Script de diagnostic des problèmes du Tournoi Baby
# - Vérification des matchs et de leur statut
# - Instructions pour l'authentification

Write-Host "🚀 Diagnostic des problèmes du Tournoi Baby" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Yellow

# Vérifier le statut des conteneurs Docker
Write-Host "`n📦 Vérification des conteneurs Docker..." -ForegroundColor Cyan
try {
    $containers = docker-compose ps --format json | ConvertFrom-Json
    foreach ($container in $containers) {
        $status = if ($container.State -eq "running") { "✅" } else { "❌" }
        Write-Host "   $status $($container.Name): $($container.State)" -ForegroundColor $(if ($container.State -eq "running") { "Green" } else { "Red" })
    }
} catch {
    Write-Host "   ❌ Impossible de vérifier les conteneurs Docker" -ForegroundColor Red
}

# Vérifier l'accès à l'API
Write-Host "`n🌐 Test de l'API..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:2001/api/matches/jeudi" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API accessible (HTTP $($response.StatusCode))" -ForegroundColor Green
        $data = $response.Content | ConvertFrom-Json
        Write-Host "   📊 Matchs du jeudi: $($data.Count) matchs trouvés" -ForegroundColor Green
        
        # Analyser le statut des matchs
        $finished = ($data | Where-Object { $_.finished -eq $true }).Count
        $ongoing = ($data | Where-Object { $_.finished -eq $false }).Count
        Write-Host "   📈 Terminés: $finished, En cours: $ongoing" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ API non accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Instructions pour l'authentification
Write-Host "`n🔐 Instructions pour résoudre le problème d'authentification:" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez les outils de développement du navigateur (F12)" -ForegroundColor White
Write-Host "2. Allez dans l'onglet 'Application' ou 'Stockage'" -ForegroundColor White
Write-Host "3. Dans la section 'Local Storage', trouvez 'http://localhost:2000'" -ForegroundColor White
Write-Host "4. Supprimez les clés suivantes:" -ForegroundColor White
Write-Host "   - tournoi_token" -ForegroundColor Red
Write-Host "   - tournoi_user" -ForegroundColor Red
Write-Host "5. Rafraîchissez la page (F5)" -ForegroundColor White
Write-Host "6. L'application devrait maintenant demander le mot de passe" -ForegroundColor White
Write-Host ""
Write-Host "Alternative: Ouvrez la console et exécutez:" -ForegroundColor Yellow
Write-Host "localStorage.removeItem('tournoi_token');" -ForegroundColor Green
Write-Host "localStorage.removeItem('tournoi_user');" -ForegroundColor Green
Write-Host "location.reload();" -ForegroundColor Green

# Solutions proposées
Write-Host "`n💡 Solutions proposées:" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Pour voir les matchs en cours:" -ForegroundColor White
Write-Host "   - Les matchs du jeudi sont probablement tous marqués comme 'terminés'" -ForegroundColor Yellow
Write-Host "   - Il faut les remettre en statut 'en cours' dans la base de données" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Pour l'authentification:" -ForegroundColor White
Write-Host "   - Suivez les instructions ci-dessus pour nettoyer le localStorage" -ForegroundColor Yellow
Write-Host ""

# Vérifier si l'utilisateur veut remettre les matchs en cours
$resetMatches = Read-Host "Voulez-vous remettre tous les matchs en statut 'en cours'? (y/N)"
if ($resetMatches -eq "y" -or $resetMatches -eq "Y") {
    Write-Host "`n🔄 Remise des matchs en statut 'en cours'..." -ForegroundColor Cyan
    try {
        # Exécuter une requête SQL pour remettre les matchs en cours
        $sqlCommand = "UPDATE matches SET finished = false WHERE finished = true;"
        $result = docker exec tournoibaby-database-1 psql -U postgres -d tournoi -c $sqlCommand
        Write-Host "✅ Matchs remis en statut 'en cours'" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de la remise à zéro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Diagnostic terminé!" -ForegroundColor Green
