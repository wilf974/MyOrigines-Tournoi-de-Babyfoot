# Script simple pour remettre les matchs en statut "en cours"
Write-Host "🔄 Remise des matchs en statut 'en cours'..." -ForegroundColor Green

try {
    # Exécuter la requête SQL pour remettre tous les matchs en cours
    $sqlCommand = "UPDATE matches SET finished = false WHERE finished = true;"
    $result = docker exec tournoibaby-database-1 psql -U postgres -d tournoi -c $sqlCommand
    
    Write-Host "✅ Matchs remis en statut 'en cours'" -ForegroundColor Green
    Write-Host "🎯 Les matchs devraient maintenant apparaître dans la gestion manuelle!" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Assurez-vous que Docker est démarré et que les conteneurs sont en cours d'exécution" -ForegroundColor Yellow
}

Write-Host "`n📝 Instructions pour l'authentification:" -ForegroundColor Cyan
Write-Host "1. Ouvrez les outils de développement (F12)" -ForegroundColor White
Write-Host "2. Allez dans Application > Local Storage > http://localhost:2000" -ForegroundColor White
Write-Host "3. Supprimez 'tournoi_token' et 'tournoi_user'" -ForegroundColor White
Write-Host "4. Rafraîchissez la page (F5)" -ForegroundColor White
