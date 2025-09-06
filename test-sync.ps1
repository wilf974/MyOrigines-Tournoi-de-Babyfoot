# Script pour tester la synchronisation entre matchs et classement

Write-Host "Test de synchronisation entre matchs et classement..." -ForegroundColor Green
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

# 3. Vérifier l'état actuel des matchs
Write-Host "`n3. État actuel des matchs..." -ForegroundColor Yellow
try {
    $matchesResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/matches/lundi" -Method Get
    
    Write-Host "$($matchesResponse.Count) matchs récupérés" -ForegroundColor Green
    foreach ($match in $matchesResponse) {
        Write-Host "  $($match.team1_nom) vs $($match.team2_nom): $($match.team1_goals)-$($match.team2_goals)" -ForegroundColor Cyan
        Write-Host "    Gamelles: $($match.team1_gamelles)-$($match.team2_gamelles)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Erreur récupération matchs: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Vérifier l'état actuel du classement
Write-Host "`n4. État actuel du classement..." -ForegroundColor Yellow
try {
    $rankingsResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/rankings" -Method Get
    
    Write-Host "$($rankingsResponse.Count) équipes dans le classement" -ForegroundColor Green
    foreach ($team in $rankingsResponse) {
        Write-Host "  $($team.nom): $($team.points) pts, $($team.buts) buts, $($team.gamelles) gamelles" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Erreur récupération classement: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test de mise à jour d'un match
Write-Host "`n5. Test de mise à jour d'un match..." -ForegroundColor Yellow
if ($matchesResponse.Count -gt 0) {
    $firstMatch = $matchesResponse[0]
    Write-Host "Mise à jour du match: $($firstMatch.team1_nom) vs $($firstMatch.team2_nom)" -ForegroundColor Cyan
    
    $updateBody = @{
        team1_goals = 3
        team2_goals = 1
        team1_gamelles = 0
        team2_gamelles = 1
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    try {
        $updateResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/matches/$($firstMatch.id)" -Method Put -Body $updateBody -Headers $headers
        
        if ($updateResponse.success) {
            Write-Host "Match mis à jour avec succès" -ForegroundColor Green
            
            # 6. Vérifier la synchronisation
            Write-Host "`n6. Vérification de la synchronisation..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
            
            # Vérifier les matchs
            $verifyMatches = Invoke-RestMethod -Uri "http://localhost:2001/api/matches/lundi" -Method Get
            $updatedMatch = $verifyMatches | Where-Object { $_.id -eq $firstMatch.id }
            
            if ($updatedMatch) {
                Write-Host "Match mis à jour: $($updatedMatch.team1_goals)-$($updatedMatch.team2_goals)" -ForegroundColor Green
            }
            
            # Vérifier le classement
            $verifyRankings = Invoke-RestMethod -Uri "http://localhost:2001/api/rankings" -Method Get
            $team1 = $verifyRankings | Where-Object { $_.nom -eq $firstMatch.team1_nom }
            $team2 = $verifyRankings | Where-Object { $_.nom -eq $firstMatch.team2_nom }
            
            if ($team1) {
                Write-Host "$($team1.nom): $($team1.points) pts, $($team1.buts) buts" -ForegroundColor Green
            }
            if ($team2) {
                Write-Host "$($team2.nom): $($team2.points) pts, $($team2.buts) buts" -ForegroundColor Green
            }
            
        } else {
            Write-Host "Erreur de mise à jour du match" -ForegroundColor Red
        }
    } catch {
        Write-Host "Erreur lors de la mise à jour: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTest terminé" -ForegroundColor Green
