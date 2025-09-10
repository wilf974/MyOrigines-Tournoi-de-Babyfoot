@echo off
echo 🐳 Démarrage de Docker Compose...
docker-compose down
docker-compose up -d --build
echo.
echo ⏳ Attente du démarrage...
timeout /t 15 /nobreak > nul
echo.
echo 📊 Statut des conteneurs:
docker ps
echo.
echo 🌐 Application disponible sur http://localhost:2000
echo 🔧 Backend API sur http://localhost:2001
echo.
pause
