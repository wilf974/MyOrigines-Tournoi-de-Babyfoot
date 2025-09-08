# Script simple pour créer des matchs de test
Write-Host "🔄 Création de matchs de test..." -ForegroundColor Green

# Créer des matchs pour chaque jour
$days = @("lundi", "mardi", "mercredi", "jeudi", "vendredi")
$times = @("12:00", "13:00", "13:30")
$teams = @("A", "B", "C", "D", "E", "F", "G", "H", "I")

foreach ($day in $days) {
    Write-Host "📅 Création des matchs pour $day..." -ForegroundColor Yellow
    
    for ($i = 0; $i -lt $times.Count; $i++) {
        $time = $times[$i]
        $team1 = $teams[($i * 2) % $teams.Count]
        $team2 = $teams[($i * 2 + 1) % $teams.Count]
        
        $matchId = "${day}_${time.Replace(':', '')}_$(Get-Date -Format 'yyyyMMddHHmmss')"
        
        try {
            $sqlCommand = "INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id, team1_goals, team1_gamelles, team2_goals, team2_gamelles, finished) VALUES ('$matchId', '$day', '$time', '$team1', '$team2', 0, 0, 0, 0, false);"
            docker exec tournoibaby-database-1 psql -U postgres -d tournoi -c $sqlCommand | Out-Null
            Write-Host "   ✅ $day $time - Équipe $team1 vs Équipe $team2" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Erreur pour $day $time" -ForegroundColor Red
        }
    }
}

Write-Host "`n🎉 Matchs créés avec succès!" -ForegroundColor Green
Write-Host "💡 Rafraîchissez la page dans votre navigateur." -ForegroundColor Yellow
