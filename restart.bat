@echo off
echo Redemarrage de Docker...
docker-compose down
docker-compose up -d
echo.
echo Attente du demarrage...
timeout /t 20 /nobreak > nul
echo.
echo Statut des conteneurs:
docker ps
echo.
echo Test de l'API...
curl -s http://localhost:2001/api/health
echo.
echo Application disponible sur http://localhost:2000
pause
