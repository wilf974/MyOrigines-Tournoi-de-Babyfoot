@echo off
echo ========================================
echo   MyOrigines Tournoi de Babyfoot
echo   Demarrage du serveur API
echo ========================================
echo.

echo Verification de Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe ou pas dans le PATH
    pause
    exit /b 1
)

echo.
echo Demarrage du serveur sur le port 2001...
echo.
echo Pour arreter le serveur, appuyez sur Ctrl+C
echo.

node server.js

pause
