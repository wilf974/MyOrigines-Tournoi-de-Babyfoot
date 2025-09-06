# Script PowerShell pour configurer le pare-feu Windows
# et ouvrir les ports nécessaires pour l'accès public

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration du pare-feu Windows" -ForegroundColor Yellow
Write-Host "  MyOrigines Tournoi de Babyfoot" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si le script est exécuté en tant qu'administrateur
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Ce script doit être exécuté en tant qu'administrateur" -ForegroundColor Red
    Write-Host "Clic droit sur PowerShell → 'Exécuter en tant qu'administrateur'" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "✅ Script exécuté en tant qu'administrateur" -ForegroundColor Green
Write-Host ""

# Ports à ouvrir pour l'accès public
$ports = @(
    @{Port=2000; Name="Frontend React"; Protocol="TCP"},
    @{Port=2001; Name="Backend API"; Protocol="TCP"},
    @{Port=2002; Name="Nginx Reverse Proxy"; Protocol="TCP"},
    @{Port=2003; Name="PostgreSQL Database"; Protocol="TCP"}
)

Write-Host "🔧 Configuration des règles de pare-feu..." -ForegroundColor Yellow
Write-Host ""

foreach ($portConfig in $ports) {
    $port = $portConfig.Port
    $name = $portConfig.Name
    $protocol = $portConfig.Protocol
    
    Write-Host "📡 Configuration du port $port ($name)..." -ForegroundColor Cyan
    
    try {
        # Vérifier si la règle existe déjà
        $existingRule = Get-NetFirewallRule -DisplayName "MyOrigines-$name-$port" -ErrorAction SilentlyContinue
        
        if ($existingRule) {
            Write-Host "  ⚠️  Règle existante trouvée, suppression..." -ForegroundColor Yellow
            Remove-NetFirewallRule -DisplayName "MyOrigines-$name-$port" -ErrorAction SilentlyContinue
        }
        
        # Créer la nouvelle règle
        New-NetFirewallRule -DisplayName "MyOrigines-$name-$port" `
                           -Direction Inbound `
                           -Protocol $protocol `
                           -LocalPort $port `
                           -Action Allow `
                           -Profile Any `
                           -Description "Règle pour MyOrigines Tournoi Babyfoot - $name" | Out-Null
        
        Write-Host "  ✅ Port $port ouvert avec succès" -ForegroundColor Green
        
    } catch {
        Write-Host "  ❌ Erreur lors de l'ouverture du port $port : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔍 Vérification des règles créées..." -ForegroundColor Yellow

# Afficher les règles créées
$createdRules = Get-NetFirewallRule -DisplayName "MyOrigines-*" | Where-Object {$_.Enabled -eq "True"}
if ($createdRules) {
    Write-Host ""
    Write-Host "✅ Règles de pare-feu actives :" -ForegroundColor Green
    foreach ($rule in $createdRules) {
        $portInfo = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $rule
        Write-Host "  - $($rule.DisplayName) : Port $($portInfo.LocalPort)" -ForegroundColor White
    }
} else {
    Write-Host "❌ Aucune règle trouvée" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 Configuration terminée !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes :" -ForegroundColor Yellow
Write-Host "1. Configurer la redirection de port sur votre routeur" -ForegroundColor White
Write-Host "2. Démarrer l'application avec Docker" -ForegroundColor White
Write-Host "3. Tester l'accès depuis l'extérieur" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs d'accès (après configuration routeur) :" -ForegroundColor Cyan
Write-Host "  - Frontend : http://VOTRE_IP_PUBLIQUE:2000" -ForegroundColor White
Write-Host "  - API : http://VOTRE_IP_PUBLIQUE:2001" -ForegroundColor White
Write-Host "  - Reverse Proxy : http://VOTRE_IP_PUBLIQUE:2002" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT : Assurez-vous de configurer votre routeur pour rediriger ces ports vers votre machine !" -ForegroundColor Red
Write-Host ""

Read-Host "Appuyez sur Entrée pour quitter"
