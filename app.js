// Application MyOrigines - Tournoi de Babyfoot en Temps Réel
class MyOriginesTournament {
    constructor() {
        this.currentView = 'selection';
        this.currentDay = 'lundi';
        this.selectedMatch = null;
        this.autoRefreshInterval = null;
        this.lastUpdate = null;
        
        // Données du tournoi
        this.teams = {
            "A": {"id": "A", "nom": "Équipe A", "joueurs": ["Mercier Vincent", "Rossini Laora"], "points": 0, "buts": 0, "gamelles": 0},
            "B": {"id": "B", "nom": "Équipe B", "joueurs": ["Duponchel Mathias", "Raffalli Sandrine"], "points": 0, "buts": 0, "gamelles": 0},
            "C": {"id": "C", "nom": "Équipe C", "joueurs": ["Lamarque Frédéric", "Aiazzi Elodie"], "points": 0, "buts": 0, "gamelles": 0},
            "D": {"id": "D", "nom": "Équipe D", "joueurs": ["Fauré Léa", "Gueoguieff Stéphan"], "points": 0, "buts": 0, "gamelles": 0},
            "E": {"id": "E", "nom": "Équipe E", "joueurs": ["Clémence Loviconi", "Durand Gregory"], "points": 0, "buts": 0, "gamelles": 0},
            "F": {"id": "F", "nom": "Équipe F", "joueurs": ["Carré Emmanuel", "Guyenot Benjamin"], "points": 0, "buts": 0, "gamelles": 0},
            "G": {"id": "G", "nom": "Équipe G", "joueurs": ["Caroline Stolfi", "Maillot Wilfred"], "points": 0, "buts": 0, "gamelles": 0},
            "H": {"id": "H", "nom": "Équipe H", "joueurs": ["Stella Michelacci", "Grosjean Cédric"], "points": 0, "buts": 0, "gamelles": 0}
        };

        this.schedule = {
            "lundi": [
                {"heure": "12:00", "equipe1": "A", "equipe2": "B", "id": "lundi-1"},
                {"heure": "13:00", "equipe1": "C", "equipe2": "D", "id": "lundi-2"},
                {"heure": "13:30", "equipe1": "E", "equipe2": "F", "id": "lundi-3"}
            ],
            "mardi": [
                {"heure": "12:00", "equipe1": "A", "equipe2": "C", "id": "mardi-1"},
                {"heure": "13:00", "equipe1": "B", "equipe2": "D", "id": "mardi-2"},
                {"heure": "13:30", "equipe1": "G", "equipe2": "H", "id": "mardi-3"}
            ],
            "mercredi": [
                {"heure": "12:00", "equipe1": "A", "equipe2": "E", "id": "mercredi-1"},
                {"heure": "13:00", "equipe1": "B", "equipe2": "F", "id": "mercredi-2"},
                {"heure": "13:30", "equipe1": "C", "equipe2": "G", "id": "mercredi-3"}
            ],
            "jeudi": [
                {"heure": "12:00", "equipe1": "D", "equipe2": "H", "id": "jeudi-1"},
                {"heure": "13:00", "equipe1": "E", "equipe2": "G", "id": "jeudi-2"},
                {"heure": "13:30", "equipe1": "F", "equipe2": "H", "id": "jeudi-3"}
            ]
        };

        this.matches = {};
        this.init();
    }

    init() {
        console.log('Initialisation MyOrigines Tournament');
        this.initializeMatches();
        this.loadData();
        
        // Setup dès que le DOM est prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM loaded, setting up app');
                this.setupApp();
            });
        } else {
            console.log('DOM already loaded, setting up app');
            this.setupApp();
        }
    }

    setupApp() {
        this.setupEventListeners();
        this.showView('selection');
        console.log('Application MyOrigines prête');
    }

    setupEventListeners() {
        console.log('Configuration des event listeners...');
        
        // Navigation principale - avec vérification d'existence
        const goAdminBtn = document.getElementById('go-admin');
        const goDisplayBtn = document.getElementById('go-display');
        const backToSelectionBtn = document.getElementById('back-to-selection');
        const backToSelectionDisplayBtn = document.getElementById('back-to-selection-display');

        if (goAdminBtn) {
            goAdminBtn.addEventListener('click', () => {
                console.log('Clic sur go-admin');
                this.showView('admin');
            });
        } else {
            console.error('Bouton go-admin non trouvé');
        }

        if (goDisplayBtn) {
            goDisplayBtn.addEventListener('click', () => {
                console.log('Clic sur go-display');
                this.showView('display');
            });
        } else {
            console.error('Bouton go-display non trouvé');
        }

        if (backToSelectionBtn) {
            backToSelectionBtn.addEventListener('click', () => {
                console.log('Clic sur back-to-selection');
                this.showView('selection');
            });
        }

        if (backToSelectionDisplayBtn) {
            backToSelectionDisplayBtn.addEventListener('click', () => {
                console.log('Clic sur back-to-selection-display');
                this.showView('selection');
            });
        }

        // Onglets de jour - avec délégation d'événement pour s'assurer qu'ils existent
        setTimeout(() => {
            const dayTabs = document.querySelectorAll('.day-tab');
            console.log(`Nombre d'onglets trouvés: ${dayTabs.length}`);
            dayTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    console.log(`Clic sur onglet: ${e.target.dataset.day}`);
                    this.switchDay(e.target.dataset.day);
                });
            });
        }, 100);

        // Contrôles de score - seront configurés quand nécessaire
        this.setupScoreControls();
        
        // Actions de match
        setTimeout(() => {
            this.addListener('reset-match', 'click', () => this.resetCurrentMatch());
            this.addListener('save-match', 'click', () => this.saveCurrentMatch());
        }, 100);

        console.log('Event listeners configurés');
    }

    addListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`Event listener ajouté à ${elementId}`);
        } else {
            console.warn(`Élément ${elementId} non trouvé pour event listener`);
        }
    }

    setupScoreControls() {
        // Délai pour s'assurer que les éléments existent
        setTimeout(() => {
            // Équipe 1
            this.addListener('team1-goals-plus', 'click', () => this.updateScore('team1', 'goals', 1));
            this.addListener('team1-goals-minus', 'click', () => this.updateScore('team1', 'goals', -1));
            this.addListener('team1-gamelles-plus', 'click', () => this.updateScore('team1', 'gamelles', 1));
            this.addListener('team1-gamelles-minus', 'click', () => this.updateScore('team1', 'gamelles', -1));

            // Équipe 2
            this.addListener('team2-goals-plus', 'click', () => this.updateScore('team2', 'goals', 1));
            this.addListener('team2-goals-minus', 'click', () => this.updateScore('team2', 'goals', -1));
            this.addListener('team2-gamelles-plus', 'click', () => this.updateScore('team2', 'gamelles', 1));
            this.addListener('team2-gamelles-minus', 'click', () => this.updateScore('team2', 'gamelles', -1));
        }, 200);
    }

    initializeMatches() {
        // Initialiser tous les matchs avec des scores à 0
        Object.keys(this.schedule).forEach(day => {
            this.schedule[day].forEach(match => {
                if (!this.matches[match.id]) {
                    this.matches[match.id] = {
                        ...match,
                        team1Goals: 0,
                        team1Gamelles: 0,
                        team2Goals: 0,
                        team2Gamelles: 0,
                        finished: false,
                        lastUpdated: null
                    };
                }
            });
        });
    }

    showView(viewName) {
        console.log(`Changement de vue vers: ${viewName}`);
        
        // Cacher toutes les vues
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Arrêter l'auto-refresh si on quitte la vitrine
        if (this.currentView === 'display' && viewName !== 'display') {
            this.stopAutoRefresh();
        }

        // Afficher la vue demandée
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;

            // Initialiser la vue avec un délai pour s'assurer que les éléments sont rendus
            setTimeout(() => {
                if (viewName === 'admin') {
                    this.initAdminView();
                } else if (viewName === 'display') {
                    this.initDisplayView();
                    this.startAutoRefresh();
                }
            }, 50);
        } else {
            console.error(`Vue ${viewName}-view non trouvée`);
        }
    }

    initAdminView() {
        console.log('Initialisation vue admin');
        this.switchDay(this.currentDay);
        this.renderRankings('live-rankings');
        this.updateSyncStatus();
    }

    initDisplayView() {
        console.log('Initialisation vitrine live');
        this.updateCurrentDay();
        this.renderDisplayMatches();
        this.renderRankings('display-rankings');
        this.updateLastUpdateTime();
    }

    switchDay(day) {
        if (!day) return;
        
        console.log(`Changement de jour: ${day}`);
        this.currentDay = day;
        
        // Mettre à jour l'onglet actif
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.day === day);
        });

        this.renderSchedule();
    }

    renderSchedule() {
        const container = document.getElementById('schedule-display');
        if (!container || !this.schedule[this.currentDay]) {
            console.log('Container ou schedule non trouvé pour', this.currentDay);
            return;
        }

        let html = '';
        this.schedule[this.currentDay].forEach(match => {
            const matchData = this.matches[match.id];
            const team1 = this.teams[match.equipe1];
            const team2 = this.teams[match.equipe2];
            
            const team1FinalScore = matchData.team1Goals - matchData.team2Gamelles;
            const team2FinalScore = matchData.team2Goals - matchData.team1Gamelles;
            
            const scoreDisplay = matchData.finished 
                ? `${team1FinalScore} - ${team2FinalScore}`
                : '- : -';

            const itemClass = `match-item ${matchData.finished ? 'finished' : ''} ${this.selectedMatch?.id === match.id ? 'selected' : ''}`;

            html += `
                <div class="${itemClass}" data-match-id="${match.id}">
                    <div class="match-header-item">
                        <span class="match-time-item">${match.heure}</span>
                        <span class="match-score-display">${scoreDisplay}</span>
                    </div>
                    <div class="match-teams">
                        <span class="team-name">${team1.nom}</span>
                        <span class="team-name">${team2.nom}</span>
                    </div>
                    <div class="match-players">
                        <small>${team1.joueurs.join(' & ')}</small>
                        <small>${team2.joueurs.join(' & ')}</small>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Ajouter les event listeners
        container.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', () => {
                const matchId = item.dataset.matchId;
                this.selectMatch(matchId);
            });
        });
    }

    selectMatch(matchId) {
        console.log(`Sélection du match: ${matchId}`);
        
        // Trouver le match dans le planning
        let selectedMatch = null;
        Object.keys(this.schedule).forEach(day => {
            const match = this.schedule[day].find(m => m.id === matchId);
            if (match) {
                selectedMatch = { ...match, day };
            }
        });

        if (!selectedMatch) return;

        this.selectedMatch = selectedMatch;
        const matchData = this.matches[matchId];

        // Mettre à jour l'interface
        this.updateMatchSelection();
        this.showMatchControls(selectedMatch, matchData);
    }

    updateMatchSelection() {
        // Mettre à jour la sélection visuelle
        document.querySelectorAll('.match-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.matchId === this.selectedMatch?.id);
        });
    }

    showMatchControls(match, matchData) {
        const currentMatchDiv = document.getElementById('current-match');
        const noMatchDiv = document.getElementById('no-match');
        
        if (currentMatchDiv) currentMatchDiv.classList.remove('hidden');
        if (noMatchDiv) noMatchDiv.classList.add('hidden');

        const team1 = this.teams[match.equipe1];
        const team2 = this.teams[match.equipe2];

        // Mettre à jour les informations du match
        this.setElementText('match-title', `${team1.nom} vs ${team2.nom}`);
        this.setElementText('match-time', `${this.capitalizeFirst(match.day)} - ${match.heure}`);
        this.setElementText('team1-name', team1.nom);
        this.setElementText('team2-name', team2.nom);

        // Mettre à jour les scores
        this.updateScoreDisplay(matchData);
        
        // Reconfigurer les contrôles de score pour ce match spécifique
        this.setupScoreControls();
    }

    updateScoreDisplay(matchData) {
        if (!matchData) return;

        // Scores individuels
        this.setElementText('team1-goals', matchData.team1Goals);
        this.setElementText('team1-gamelles', matchData.team1Gamelles);
        this.setElementText('team2-goals', matchData.team2Goals);
        this.setElementText('team2-gamelles', matchData.team2Gamelles);

        // Scores finaux (Buts - Gamelles adverses)
        const team1Final = matchData.team1Goals - matchData.team2Gamelles;
        const team2Final = matchData.team2Goals - matchData.team1Gamelles;
        
        this.setElementText('team1-final', Math.max(0, team1Final));
        this.setElementText('team2-final', Math.max(0, team2Final));
    }

    updateScore(team, type, delta) {
        if (!this.selectedMatch) return;

        const matchData = this.matches[this.selectedMatch.id];
        const field = `${team}${this.capitalizeFirst(type)}`;
        
        const newValue = Math.max(0, matchData[field] + delta);
        matchData[field] = newValue;

        console.log(`Mise à jour score: ${team} ${type} = ${newValue}`);

        this.updateScoreDisplay(matchData);
        this.renderSchedule(); // Mettre à jour l'affichage du planning
        this.triggerScoreAnimation();
    }

    triggerScoreAnimation() {
        const currentMatch = document.getElementById('current-match');
        if (currentMatch) {
            currentMatch.classList.add('updated');
            setTimeout(() => {
                currentMatch.classList.remove('updated');
            }, 2000);
        }
    }

    resetCurrentMatch() {
        if (!this.selectedMatch) return;

        if (confirm('Êtes-vous sûr de vouloir réinitialiser les scores de ce match ?')) {
            const matchData = this.matches[this.selectedMatch.id];
            matchData.team1Goals = 0;
            matchData.team1Gamelles = 0;
            matchData.team2Goals = 0;
            matchData.team2Gamelles = 0;
            matchData.finished = false;

            this.updateScoreDisplay(matchData);
            this.renderSchedule();
            this.saveData();
            
            console.log('Match réinitialisé');
            this.showNotification('Match réinitialisé', 'success');
        }
    }

    saveCurrentMatch() {
        if (!this.selectedMatch) return;

        const matchData = this.matches[this.selectedMatch.id];
        matchData.finished = true;
        matchData.lastUpdated = new Date();

        // Mettre à jour les statistiques des équipes
        this.updateTeamStats(matchData);

        this.renderSchedule();
        this.renderRankings('live-rankings');
        this.saveData();
        this.updateSyncStatus();

        console.log('Match sauvegardé');
        this.showNotification('Match sauvegardé avec succès', 'success');
        
        // Animation flash pour indiquer la mise à jour
        this.triggerUpdateFlash();
    }

    updateTeamStats(matchData) {
        const team1 = this.teams[this.selectedMatch.equipe1];
        const team2 = this.teams[this.selectedMatch.equipe2];

        // Calculer les scores finaux
        const team1Final = Math.max(0, matchData.team1Goals - matchData.team2Gamelles);
        const team2Final = Math.max(0, matchData.team2Goals - matchData.team1Gamelles);

        // Ajouter les stats (pour la démo, on accumule)
        team1.buts += matchData.team1Goals;
        team1.gamelles += matchData.team1Gamelles;
        team2.buts += matchData.team2Goals;
        team2.gamelles += matchData.team2Gamelles;

        // Points (3 pour victoire, 1 pour égalité)
        if (team1Final > team2Final) {
            team1.points += 3;
        } else if (team2Final > team1Final) {
            team2.points += 3;
        } else {
            team1.points += 1;
            team2.points += 1;
        }
    }

    renderRankings(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Trier les équipes par points, puis par différence buts-gamelles
        const sortedTeams = Object.values(this.teams).sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points;
            const diffA = a.buts - a.gamelles;
            const diffB = b.buts - b.gamelles;
            if (diffA !== diffB) return diffB - diffA;
            return b.buts - a.buts;
        });

        let html = `
            <table class="ranking-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Équipe</th>
                        <th>Pts</th>
                        <th>Buts</th>
                        <th>Gamelles</th>
                        <th>Diff</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sortedTeams.forEach((team, index) => {
            const diff = team.buts - team.gamelles;
            html += `
                <tr>
                    <td class="ranking-position">${index + 1}</td>
                    <td class="team-name-cell">${team.nom}</td>
                    <td class="score-cell">${team.points}</td>
                    <td>${team.buts}</td>
                    <td>${team.gamelles}</td>
                    <td class="score-cell">${diff > 0 ? '+' : ''}${diff}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // Fonctions pour la vitrine live
    startAutoRefresh() {
        console.log('Démarrage auto-refresh');
        this.autoRefreshInterval = setInterval(() => {
            this.refreshDisplayView();
        }, 5000); // 5 secondes
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            console.log('Arrêt auto-refresh');
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    refreshDisplayView() {
        if (this.currentView !== 'display') return;

        console.log('Rafraîchissement vitrine live');
        this.renderDisplayMatches();
        this.renderRankings('display-rankings');
        this.updateLastUpdateTime();
        this.triggerLiveAnimation();
    }

    updateCurrentDay() {
        const days = {
            'lundi': 'Lundi',
            'mardi': 'Mardi', 
            'mercredi': 'Mercredi',
            'jeudi': 'Jeudi'
        };

        const currentDayElement = document.getElementById('current-day-display');
        if (currentDayElement) {
            currentDayElement.textContent = days[this.currentDay] || 'Lundi';
        }
    }

    renderDisplayMatches() {
        const container = document.getElementById('display-matches');
        if (!container || !this.schedule[this.currentDay]) return;

        let html = '';
        this.schedule[this.currentDay].forEach(match => {
            const matchData = this.matches[match.id];
            const team1 = this.teams[match.equipe1];
            const team2 = this.teams[match.equipe2];
            
            const team1Final = Math.max(0, matchData.team1Goals - matchData.team2Gamelles);
            const team2Final = Math.max(0, matchData.team2Goals - matchData.team1Gamelles);
            
            const scoreDisplay = matchData.finished 
                ? `${team1Final} - ${team2Final}`
                : '- : -';

            const isNew = matchData.lastUpdated && 
                         (Date.now() - new Date(matchData.lastUpdated).getTime() < 10000);

            html += `
                <div class="match-item ${matchData.finished ? 'finished' : ''} ${isNew ? 'new-score' : ''}">
                    <div class="match-header-item">
                        <span class="match-time-item">${match.heure}</span>
                        <span class="match-score-display">${scoreDisplay}</span>
                        ${isNew ? '<span class="new-badge">NOUVEAU</span>' : ''}
                    </div>
                    <div class="match-teams">
                        <div class="team-info">
                            <span class="team-name">${team1.nom}</span>
                            <small class="team-players">${team1.joueurs.join(' & ')}</small>
                        </div>
                        <div class="team-info">
                            <span class="team-name">${team2.nom}</span>
                            <small class="team-players">${team2.joueurs.join(' & ')}</small>
                        </div>
                    </div>
                    ${matchData.finished ? `
                        <div class="match-details">
                            <span>Buts: ${matchData.team1Goals} - ${matchData.team2Goals}</span>
                            <span>Gamelles: ${matchData.team1Gamelles} - ${matchData.team2Gamelles}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateLastUpdateTime() {
        const element = document.getElementById('last-update');
        if (element) {
            const now = new Date();
            element.textContent = `Dernière mise à jour: ${now.toLocaleTimeString()}`;
        }
    }

    triggerLiveAnimation() {
        const liveIndicators = document.querySelectorAll('.live-dot');
        liveIndicators.forEach(dot => {
            dot.style.animation = 'none';
            dot.offsetHeight; // Trigger reflow
            dot.style.animation = 'pulse 1s infinite';
        });
    }

    triggerUpdateFlash() {
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.style.background = '#22C55E';
            syncStatus.style.color = 'white';
            setTimeout(() => {
                syncStatus.style.background = 'rgba(255, 255, 255, 0.2)';
                syncStatus.style.color = 'var(--color-slate-900)';
            }, 1000);
        }
    }

    updateSyncStatus() {
        const element = document.getElementById('sync-status');
        if (element) {
            element.innerHTML = '<span class="sync-icon">✓</span> Synchronisé';
            setTimeout(() => {
                element.innerHTML = '<span class="sync-icon">🔄</span> Synchronisé';
            }, 2000);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notifications';
        container.className = 'notifications';
        document.body.appendChild(container);
        return container;
    }

    // Persistance des données
    saveData() {
        const data = {
            matches: this.matches,
            teams: this.teams,
            lastSave: new Date().toISOString()
        };
        
        try {
            // Simulation de sauvegarde pour la démo
            console.log('Données sauvegardées:', data);
            this.lastUpdate = new Date();
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
        }
    }

    loadData() {
        try {
            // Simulation de chargement pour la démo
            console.log('Données chargées depuis la mémoire');
        } catch (error) {
            console.error('Erreur chargement:', error);
        }
    }

    // Utilitaires
    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialisation de l'application
let tournament;

// Fonction d'initialisation globale
function initTournament() {
    console.log('Initialisation du tournoi MyOrigines...');
    tournament = new MyOriginesTournament();
}

// Initialisation selon l'état du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTournament);
} else {
    initTournament();
}