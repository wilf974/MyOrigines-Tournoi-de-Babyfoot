# Script PowerShell pour ouvrir les ports du pare-feu
# MyOrigines Tournoi de Babyfoot

Write-Host "Configuration du pare-feu Windows..." -ForegroundColor Yellow

# Vérifier si le script est exécuté en tant qu'administrateur
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Ce script doit être exécuté en tant qu'administrateur" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Ports à ouvrir
$ports = @(2000, 2001, 2002, 2003)

foreach ($port in $ports) {
    Write-Host "Ouverture du port $port..." -ForegroundColor Cyan
    
    try {
        # Supprimer la règle existante si elle existe
        Remove-NetFirewallRule -DisplayName "MyOrigines-Port-$port" -ErrorAction SilentlyContinue
        
        # Créer la nouvelle règle
        New-NetFirewallRule -DisplayName "MyOrigines-Port-$port" `
                           -Direction Inbound `
                           -Protocol TCP `
                           -LocalPort $port `
                           -Action Allow `
                           -Profile Any `
                           -Description "Règle pour MyOrigines Tournoi Babyfoot - Port $port" | Out-Null
        
        Write-Host "  Port $port ouvert avec succès" -ForegroundColor Green
        
    } catch {
        Write-Host "  Erreur lors de l'ouverture du port $port : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Configuration terminée !" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes :" -ForegroundColor Yellow
Write-Host "1. Configurer la redirection de port sur votre routeur" -ForegroundColor White
Write-Host "2. Tester l'accès public" -ForegroundColor White
Write-Host ""
Write-Host "URLs d'accès (après configuration routeur) :" -ForegroundColor Cyan
Write-Host "  - Frontend : http://88.120.19.87:2000" -ForegroundColor White
Write-Host "  - API : http://88.120.19.87:2001" -ForegroundColor White
Write-Host "  - Reverse Proxy : http://88.120.19.87:2002" -ForegroundColor White

Read-Host "Appuyez sur Entrée pour quitter"
