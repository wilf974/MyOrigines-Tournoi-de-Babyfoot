# Test simple de mise à jour d'un match

Write-Host "Test simple de mise à jour..." -ForegroundColor Green

# 1. Authentification
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token

Write-Host "Token obtenu: $($token.Substring(0, 20))..." -ForegroundColor Green

# 2. Récupérer les matchs
$headers = @{
    "Authorization" = "Bearer $token"
}
$matchesResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/matches" -Method Get -Headers $headers
$firstMatch = $matchesResponse[0]

Write-Host "Premier match: $($firstMatch.team1_nom) vs $($firstMatch.team2_nom) (ID: $($firstMatch.id))" -ForegroundColor Cyan
Write-Host "Scores actuels: $($firstMatch.team1_goals)-$($firstMatch.team2_goals)" -ForegroundColor Cyan

# 3. Mise à jour
$updateBody = @{
    team1_goals = 2
    team2_goals = 1
    team1_gamelles = 0
    team2_gamelles = 1
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Envoi de la mise à jour..." -ForegroundColor Yellow
Write-Host "Body: $updateBody" -ForegroundColor Gray

try {
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/matches/$($firstMatch.id)" -Method Put -Body $updateBody -Headers $headers
    Write-Host "Réponse: $($updateResponse | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.Exception.Response)" -ForegroundColor Red
}

# 4. Vérification
Write-Host "Vérification..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

$verifyResponse = Invoke-RestMethod -Uri "http://localhost:2001/api/matches" -Method Get -Headers $headers
$updatedMatch = $verifyResponse | Where-Object { $_.id -eq $firstMatch.id }

if ($updatedMatch) {
    Write-Host "Scores après mise à jour: $($updatedMatch.team1_goals)-$($updatedMatch.team2_goals)" -ForegroundColor Green
} else {
    Write-Host "Match non trouvé" -ForegroundColor Red
}
