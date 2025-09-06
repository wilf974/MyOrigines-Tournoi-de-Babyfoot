# Script PowerShell pour démarrer le serveur MyOrigines
# Résout le problème "Node.js n'est pas dans le PATH"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MyOrigines Tournoi de Babyfoot" -ForegroundColor Yellow
Write-Host "  Démarrage du serveur API" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Chemins possibles pour Node.js
$possiblePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

$nodePath = $null
$nodeVersion = $null

# Rechercher Node.js dans les chemins possibles
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $nodePath = $path
        try {
            $nodeVersion = & $path --version 2>$null
            if ($nodeVersion) {
                break
            }
        } catch {
            continue
        }
    }
}

# Vérifier si Node.js a été trouvé
if ($nodePath -and $nodeVersion) {
    Write-Host "✅ Node.js trouvé: $nodePath" -ForegroundColor Green
    Write-Host "Version Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js non trouvé dans les emplacements standards" -ForegroundColor Red
    Write-Host "Chemins vérifiés:" -ForegroundColor Yellow
    foreach ($path in $possiblePaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Solutions possibles:" -ForegroundColor Yellow
    Write-Host "1. Installer Node.js depuis https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Ajouter Node.js au PATH système" -ForegroundColor White
    Write-Host "3. Utiliser ce script qui contourne le problème de PATH" -ForegroundColor White
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""
Write-Host "🚀 Démarrage du serveur sur le port 2001..." -ForegroundColor Yellow
Write-Host "Pour arrêter le serveur, appuyez sur Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Vérifier si le fichier server.js existe
if (-not (Test-Path "server.js")) {
    Write-Host "❌ Fichier server.js non trouvé dans le répertoire courant" -ForegroundColor Red
    Write-Host "Répertoire courant: $(Get-Location)" -ForegroundColor Gray
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Démarrer le serveur
try {
    Write-Host "Commande exécutée: `"$nodePath`" server.js" -ForegroundColor Gray
    & $nodePath server.js
} catch {
    Write-Host "❌ Erreur lors du démarrage du serveur: $_" -ForegroundColor Red
    Write-Host "Vérifiez que le serveur peut démarrer correctement" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
}
