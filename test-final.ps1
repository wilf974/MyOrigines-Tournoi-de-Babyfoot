# Script de test final pour vérifier la persistance des scores

Write-Host "Test final de persistance des scores..." -ForegroundColor Green
Write-Host ""

# 1. Test de connexion
Write-Host "1. Test de connexion..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/health" -Method Get
    Write-Host "Serveur actif: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Authentification
Write-Host "`n2. Authentification..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "123456"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.token) {
        Write-Host "Token obtenu" -ForegroundColor Green
        $token = $loginResponse.token
    } else {
        Write-Host "Pas de token reçu" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Erreur d'authentification: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Test de sauvegarde avec des scores différents
Write-Host "`n3. Test de sauvegarde avec scores différents..." -ForegroundColor Yellow
try {
    $matchesResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/matches/lundi" -Method Get
    
    if ($matchesResponse.Count -gt 0) {
        $firstMatch = $matchesResponse[0]
        Write-Host "Match test: $($firstMatch.team1_nom) vs $($firstMatch.team2_nom)" -ForegroundColor Cyan
        
        # Test avec des scores différents
        $testScores = @(
            @{ team1_goals = 2; team2_goals = 1; team1_gamelles = 0; team2_gamelles = 1 },
            @{ team1_goals = 3; team2_goals = 0; team1_gamelles = 1; team2_gamelles = 0 },
            @{ team1_goals = 1; team2_goals = 2; team1_gamelles = 0; team2_gamelles = 0 }
        )
        
        foreach ($scores in $testScores) {
            Write-Host "`n  Test avec scores: $($scores.team1_goals)-$($scores.team2_goals) (gamelles: $($scores.team1_gamelles)-$($scores.team2_gamelles))" -ForegroundColor Gray
            
            $updateBody = $scores | ConvertTo-Json
            $headers = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            
            $updateResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/matches/$($firstMatch.id)" -Method Put -Body $updateBody -Headers $headers
            
            if ($updateResponse.success) {
                Write-Host "    Sauvegarde réussie" -ForegroundColor Green
                
                # Vérifier la persistance
                Start-Sleep -Seconds 1
                $verifyMatches = Invoke-RestMethod -Uri "http://localhost:2001/api/matches/lundi" -Method Get
                $updatedMatch = $verifyMatches | Where-Object { $_.id -eq $firstMatch.id }
                
                if ($updatedMatch) {
                    Write-Host "    Scores persistés: $($updatedMatch.team1_goals)-$($updatedMatch.team2_goals)" -ForegroundColor Green
                    
                    # Vérifier le classement
                    $rankings = Invoke-RestMethod -Uri "http://localhost:2001/api/rankings" -Method Get
                    $team1 = $rankings | Where-Object { $_.nom -eq $firstMatch.team1_nom }
                    $team2 = $rankings | Where-Object { $_.nom -eq $firstMatch.team2_nom }
                    
                    Write-Host "    $($team1.nom): $($team1.points) pts, $($team1.buts) buts" -ForegroundColor Cyan
                    Write-Host "    $($team2.nom): $($team2.points) pts, $($team2.buts) buts" -ForegroundColor Cyan
                } else {
                    Write-Host "    Erreur: Match non trouvé après mise à jour" -ForegroundColor Red
                }
            } else {
                Write-Host "    Erreur de sauvegarde" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest terminé" -ForegroundColor Green
