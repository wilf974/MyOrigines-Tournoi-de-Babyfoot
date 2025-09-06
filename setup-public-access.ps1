# Script PowerShell pour configurer l'accès public complet
# MyOrigines Tournoi de Babyfoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration de l'accès public" -ForegroundColor Yellow
Write-Host "  MyOrigines Tournoi de Babyfoot" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour obtenir l'IP publique
function Get-PublicIP {
    try {
        Write-Host "🌐 Récupération de votre adresse IP publique..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 10
        return $response.Trim()
    } catch {
        Write-Host "❌ Impossible de récupérer l'IP publique : $_" -ForegroundColor Red
        return $null
    }
}

# Fonction pour obtenir l'IP locale
function Get-LocalIP {
    try {
        $networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.IPAddress -notlike "127.*" -and 
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
        }
        
        if ($networkAdapters) {
            return $networkAdapters[0].IPAddress
        }
        return $null
    } catch {
        Write-Host "❌ Impossible de récupérer l'IP locale : $_" -ForegroundColor Red
        return $null
    }
}

# Récupérer les adresses IP
$publicIP = Get-PublicIP
$localIP = Get-LocalIP

Write-Host ""
Write-Host "📍 Informations réseau :" -ForegroundColor Cyan
if ($publicIP) {
    Write-Host "  🌍 IP Publique : $publicIP" -ForegroundColor Green
} else {
    Write-Host "  🌍 IP Publique : Non disponible" -ForegroundColor Red
}

if ($localIP) {
    Write-Host "  🏠 IP Locale : $localIP" -ForegroundColor Green
} else {
    Write-Host "  🏠 IP Locale : Non disponible" -ForegroundColor Red
}

Write-Host ""

# Vérifier si Docker est installé et en cours d'exécution
Write-Host "🐳 Vérification de Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "  ✅ Docker installé : $dockerVersion" -ForegroundColor Green
        
        # Vérifier si Docker est en cours d'exécution
        $dockerInfo = docker info 2>$null
        if ($dockerInfo) {
            Write-Host "  ✅ Docker en cours d'exécution" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Docker installé mais pas en cours d'exécution" -ForegroundColor Yellow
            Write-Host "  💡 Démarrez Docker Desktop avant de continuer" -ForegroundColor White
        }
    } else {
        Write-Host "  ❌ Docker non installé" -ForegroundColor Red
        Write-Host "  💡 Installez Docker Desktop depuis https://www.docker.com/products/docker-desktop" -ForegroundColor White
    }
} catch {
    Write-Host "  ❌ Erreur lors de la vérification de Docker : $_" -ForegroundColor Red
}

Write-Host ""

# Afficher les instructions de configuration
Write-Host "📋 Instructions de configuration :" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  CONFIGURATION DU ROUTEUR (Port Forwarding) :" -ForegroundColor Yellow
Write-Host "   Accédez à l'interface d'administration de votre routeur" -ForegroundColor White
Write-Host "   (généralement http://192.168.1.1 ou http://192.168.0.1)" -ForegroundColor White
Write-Host ""
Write-Host "   Configurez les redirections de port suivantes :" -ForegroundColor White
Write-Host "   ┌─────────────┬─────────────┬─────────────┐" -ForegroundColor Gray
Write-Host "   │ Port Externe│ Port Interne│ IP Locale   │" -ForegroundColor Gray
Write-Host "   ├─────────────┼─────────────┼─────────────┤" -ForegroundColor Gray
Write-Host "   │ 2000        │ 2000        │ $localIP" -ForegroundColor Gray
Write-Host "   │ 2001        │ 2001        │ $localIP" -ForegroundColor Gray
Write-Host "   │ 2002        │ 2002        │ $localIP" -ForegroundColor Gray
Write-Host "   │ 2003        │ 2003        │ $localIP" -ForegroundColor Gray
Write-Host "   └─────────────┴─────────────┴─────────────┘" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  DÉMARRAGE DE L'APPLICATION :" -ForegroundColor Yellow
Write-Host "   Exécutez la commande suivante :" -ForegroundColor White
Write-Host "   docker-compose up -d" -ForegroundColor Green
Write-Host ""

Write-Host "3️⃣  TEST DE L'ACCÈS PUBLIC :" -ForegroundColor Yellow
if ($publicIP) {
    Write-Host "   Testez ces URLs depuis l'extérieur :" -ForegroundColor White
    Write-Host "   - Frontend : http://$publicIP:2000" -ForegroundColor Green
    Write-Host "   - API : http://$publicIP:2001/api/health" -ForegroundColor Green
    Write-Host "   - Reverse Proxy : http://$publicIP:2002" -ForegroundColor Green
} else {
    Write-Host "   Remplacez VOTRE_IP_PUBLIQUE par votre adresse IP publique :" -ForegroundColor White
    Write-Host "   - Frontend : http://VOTRE_IP_PUBLIQUE:2000" -ForegroundColor Green
    Write-Host "   - API : http://VOTRE_IP_PUBLIQUE:2001/api/health" -ForegroundColor Green
    Write-Host "   - Reverse Proxy : http://VOTRE_IP_PUBLIQUE:2002" -ForegroundColor Green
}

Write-Host ""

Write-Host "4️⃣  SÉCURITÉ (IMPORTANT) :" -ForegroundColor Yellow
Write-Host "   ⚠️  Votre application sera accessible depuis Internet" -ForegroundColor Red
Write-Host "   🔒 Assurez-vous que :" -ForegroundColor White
Write-Host "      - Votre mot de passe admin est fort (actuellement : 123456)" -ForegroundColor White
Write-Host "      - Votre pare-feu Windows est configuré" -ForegroundColor White
Write-Host "      - Votre routeur a un mot de passe fort" -ForegroundColor White
Write-Host "      - Vous surveillez les accès" -ForegroundColor White

Write-Host ""

# Proposer de démarrer l'application
$startApp = Read-Host "Voulez-vous démarrer l'application maintenant ? (o/n)"
if ($startApp -eq "o" -or $startApp -eq "O" -or $startApp -eq "oui") {
    Write-Host ""
    Write-Host "🚀 Démarrage de l'application..." -ForegroundColor Yellow
    
    try {
        # Vérifier si docker-compose.yml existe
        if (Test-Path "docker-compose.yml") {
            Write-Host "  📦 Construction et démarrage des conteneurs..." -ForegroundColor Cyan
            docker-compose up -d --build
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Application démarrée avec succès !" -ForegroundColor Green
                Write-Host ""
                Write-Host "🌐 URLs d'accès :" -ForegroundColor Cyan
                if ($publicIP) {
                    Write-Host "  - Local : http://localhost:2000" -ForegroundColor White
                    Write-Host "  - Public : http://$publicIP:2000" -ForegroundColor Green
                } else {
                    Write-Host "  - Local : http://localhost:2000" -ForegroundColor White
                    Write-Host "  - Public : http://VOTRE_IP_PUBLIQUE:2000" -ForegroundColor Green
                }
            } else {
                Write-Host "  ❌ Erreur lors du démarrage de l'application" -ForegroundColor Red
            }
        } else {
            Write-Host "  ❌ Fichier docker-compose.yml non trouvé" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Erreur : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📚 Documentation complète disponible dans README.md" -ForegroundColor Cyan
Write-Host ""

Read-Host "Appuyez sur Entrée pour quitter"
