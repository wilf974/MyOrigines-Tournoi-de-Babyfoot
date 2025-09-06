# Script PowerShell pour tester l'accès public
# MyOrigines Tournoi de Babyfoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test de l'accès public" -ForegroundColor Yellow
Write-Host "  MyOrigines Tournoi de Babyfoot" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour tester une URL
function Test-URL {
    param(
        [string]$URL,
        [string]$ServiceName
    )
    
    Write-Host "🔍 Test de $ServiceName..." -ForegroundColor Cyan
    Write-Host "   URL : $URL" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $URL -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ $ServiceName accessible (Status: $($response.StatusCode))" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ⚠️  $ServiceName répond mais avec un code d'erreur : $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "   ❌ $ServiceName non accessible : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Fonction pour obtenir l'IP publique
function Get-PublicIP {
    try {
        $response = Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 10
        return $response.Trim()
    } catch {
        Write-Host "❌ Impossible de récupérer l'IP publique : $_" -ForegroundColor Red
        return $null
    }
}

# Récupérer l'IP publique
Write-Host "🌐 Récupération de votre adresse IP publique..." -ForegroundColor Yellow
$publicIP = Get-PublicIP

if (-not $publicIP) {
    Write-Host "❌ Impossible de récupérer l'IP publique. Tests locaux uniquement." -ForegroundColor Red
    $publicIP = "localhost"
}

Write-Host "📍 IP Publique : $publicIP" -ForegroundColor Green
Write-Host ""

# Tests des services
Write-Host "🧪 Tests des services..." -ForegroundColor Yellow
Write-Host ""

$tests = @(
    @{URL="http://localhost:2000"; Name="Frontend Local"},
    @{URL="http://localhost:2001/api/health"; Name="API Local"},
    @{URL="http://localhost:2002"; Name="Reverse Proxy Local"},
    @{URL="http://$publicIP:2000"; Name="Frontend Public"},
    @{URL="http://$publicIP:2001/api/health"; Name="API Public"},
    @{URL="http://$publicIP:2002"; Name="Reverse Proxy Public"}
)

$results = @{
    Local = @{}
    Public = @{}
}

foreach ($test in $tests) {
    $isPublic = $test.URL -like "*$publicIP*"
    $category = if ($isPublic) { "Public" } else { "Local" }
    
    $success = Test-URL -URL $test.URL -ServiceName $test.Name
    $results[$category][$test.Name] = $success
    
    Write-Host ""
}

# Résumé des résultats
Write-Host "📊 Résumé des tests :" -ForegroundColor Cyan
Write-Host ""

Write-Host "🏠 Tests locaux :" -ForegroundColor Yellow
foreach ($test in $results.Local.GetEnumerator()) {
    $status = if ($test.Value) { "✅" } else { "❌" }
    Write-Host "   $status $($test.Key)" -ForegroundColor $(if ($test.Value) { "Green" } else { "Red" })
}

Write-Host ""
Write-Host "🌍 Tests publics :" -ForegroundColor Yellow
foreach ($test in $results.Public.GetEnumerator()) {
    $status = if ($test.Value) { "✅" } else { "❌" }
    Write-Host "   $status $($test.Key)" -ForegroundColor $(if ($test.Value) { "Green" } else { "Red" })
}

# Diagnostic
Write-Host ""
Write-Host "🔍 Diagnostic :" -ForegroundColor Cyan

$localWorking = ($results.Local.Values | Where-Object { $_ -eq $true }).Count -gt 0
$publicWorking = ($results.Public.Values | Where-Object { $_ -eq $true }).Count -gt 0

if ($localWorking -and $publicWorking) {
    Write-Host "✅ Excellent ! Votre application est accessible localement ET publiquement." -ForegroundColor Green
    Write-Host "🌐 Votre tournoi est maintenant accessible depuis Internet !" -ForegroundColor Green
} elseif ($localWorking -and -not $publicWorking) {
    Write-Host "⚠️  L'application fonctionne localement mais n'est pas accessible publiquement." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 Solutions possibles :" -ForegroundColor Yellow
    Write-Host "   1. Vérifiez la configuration du routeur (Port Forwarding)" -ForegroundColor White
    Write-Host "   2. Vérifiez le pare-feu Windows" -ForegroundColor White
    Write-Host "   3. Vérifiez que Docker écoute sur toutes les interfaces" -ForegroundColor White
    Write-Host "   4. Redémarrez l'application avec : docker-compose restart" -ForegroundColor White
} elseif (-not $localWorking) {
    Write-Host "❌ L'application n'est pas accessible localement." -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Solutions possibles :" -ForegroundColor Yellow
    Write-Host "   1. Démarrez l'application : docker-compose up -d" -ForegroundColor White
    Write-Host "   2. Vérifiez que Docker est en cours d'exécution" -ForegroundColor White
    Write-Host "   3. Vérifiez les logs : docker-compose logs" -ForegroundColor White
} else {
    Write-Host "❌ Aucun service n'est accessible." -ForegroundColor Red
    Write-Host "🔧 Vérifiez que l'application est démarrée et que Docker fonctionne." -ForegroundColor Yellow
}

# Instructions finales
Write-Host ""
Write-Host "📋 URLs d'accès :" -ForegroundColor Cyan
Write-Host "   🏠 Local :" -ForegroundColor White
Write-Host "      - Frontend : http://localhost:2000" -ForegroundColor Gray
Write-Host "      - API : http://localhost:2001" -ForegroundColor Gray
Write-Host "      - Reverse Proxy : http://localhost:2002" -ForegroundColor Gray
Write-Host ""
Write-Host "   🌍 Public :" -ForegroundColor White
Write-Host "      - Frontend : http://$publicIP:2000" -ForegroundColor Gray
Write-Host "      - API : http://$publicIP:2001" -ForegroundColor Gray
Write-Host "      - Reverse Proxy : http://$publicIP:2002" -ForegroundColor Gray

Write-Host ""
Write-Host "🔐 Connexion Admin :" -ForegroundColor Cyan
Write-Host "   - Utilisateur : admin" -ForegroundColor White
Write-Host "   - Mot de passe : 123456" -ForegroundColor White

Write-Host ""
Read-Host "Appuyez sur Entrée pour quitter"
