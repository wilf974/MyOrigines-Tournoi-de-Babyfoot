# Script de test de connexion simple
Write-Host "=== Test de connexion MyOrigines ===" -ForegroundColor Cyan
Write-Host ""

# IP publique
$publicIP = "88.120.19.87"
$localIP = "192.168.1.69"

Write-Host "IP Publique : $publicIP" -ForegroundColor Green
Write-Host "IP Locale : $localIP" -ForegroundColor Green
Write-Host ""

# Test local
Write-Host "Test accès local..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:2000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ Local : http://localhost:2000 - OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Local : http://localhost:2000 - ERREUR" -ForegroundColor Red
}

# Test public
Write-Host "Test accès public..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$publicIP:2000" -TimeoutSec 10 -UseBasicParsing
    Write-Host "  ✅ Public : http://$publicIP:2000 - OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Public : http://$publicIP:2000 - ERREUR" -ForegroundColor Red
    Write-Host "     Cause probable : Routeur non configuré" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Diagnostic ===" -ForegroundColor Cyan
Write-Host "Si l'accès public ne fonctionne pas :" -ForegroundColor Yellow
Write-Host "1. Configurez votre routeur (Port Forwarding)" -ForegroundColor White
Write-Host "2. Redirigez le port 2000 vers 192.168.1.69:2000" -ForegroundColor White
Write-Host "3. Redirigez le port 2001 vers 192.168.1.69:2001" -ForegroundColor White
Write-Host "4. Redirigez le port 2002 vers 192.168.1.69:2002" -ForegroundColor White
Write-Host ""
Write-Host "URLs à tester après configuration routeur :" -ForegroundColor Cyan
Write-Host "  Frontend : http://$publicIP:2000" -ForegroundColor Green
Write-Host "  API : http://$publicIP:2001" -ForegroundColor Green
Write-Host "  Proxy : http://$publicIP:2002" -ForegroundColor Green
