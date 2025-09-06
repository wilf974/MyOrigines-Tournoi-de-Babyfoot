import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialise et configure la base de données SQLite
 * @returns {Database.Database} Instance de la base de données
 */
export async function initDatabase() {
  // Chemin vers le fichier de base de données
  const dbPath = join(__dirname, '..', 'data', 'tournoi.db');
  
  // Créer le dossier data s'il n'existe pas
  const dataDir = join(__dirname, '..', 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  
  const db = new Database(dbPath);
  
  // Activer les clés étrangères
  db.pragma('foreign_keys = ON');
  
  // Créer les tables
  createTables(db);
  
  // Initialiser les données par défaut
  await initializeDefaultData(db);
  
  return db;
}

/**
 * Crée les tables de la base de données
 * @param {Database.Database} db - Instance de la base de données
 */
function createTables(db) {
  // Table des équipes
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      joueurs TEXT NOT NULL, -- JSON array des joueurs
      points INTEGER DEFAULT 0,
      buts INTEGER DEFAULT 0,
      gamelles INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des matchs
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      jour TEXT NOT NULL,
      heure TEXT NOT NULL,
      equipe1_id TEXT NOT NULL,
      equipe2_id TEXT NOT NULL,
      team1_goals INTEGER DEFAULT 0,
      team1_gamelles INTEGER DEFAULT 0,
      team2_goals INTEGER DEFAULT 0,
      team2_gamelles INTEGER DEFAULT 0,
      finished BOOLEAN DEFAULT FALSE,
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipe1_id) REFERENCES teams(id),
      FOREIGN KEY (equipe2_id) REFERENCES teams(id)
    )
  `);

  // Table des administrateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Trigger pour mettre à jour updated_at
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_teams_timestamp 
    AFTER UPDATE ON teams
    BEGIN
      UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);
}

/**
 * Initialise les données par défaut
 * @param {Database.Database} db - Instance de la base de données
 */
async function initializeDefaultData(db) {
  // Vérifier si des équipes existent déjà
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get();
  
  if (teamCount.count === 0) {
    // Insérer les équipes par défaut
    const teams = [
      { id: "A", nom: "Équipe A", joueurs: JSON.stringify(["Mercier Vincent", "Rossini Laora"]) },
      { id: "B", nom: "Équipe B", joueurs: JSON.stringify(["Duponchel Mathias", "Raffalli Sandrine"]) },
      { id: "C", nom: "Équipe C", joueurs: JSON.stringify(["Lamarque Frédéric", "Aiazzi Elodie"]) },
      { id: "D", nom: "Équipe D", joueurs: JSON.stringify(["Fauré Léa", "Gueoguieff Stéphan"]) },
      { id: "E", nom: "Équipe E", joueurs: JSON.stringify(["Clémence Loviconi", "Durand Gregory"]) },
      { id: "F", nom: "Équipe F", joueurs: JSON.stringify(["Carré Emmanuel", "Guyenot Benjamin"]) },
      { id: "G", nom: "Équipe G", joueurs: JSON.stringify(["Caroline Stolfi", "Maillot Wilfred"]) },
      { id: "H", nom: "Équipe H", joueurs: JSON.stringify(["Stella Michelacci", "Grosjean Cédric"]) }
    ];

    const insertTeam = db.prepare(`
      INSERT INTO teams (id, nom, joueurs) 
      VALUES (?, ?, ?)
    `);

    teams.forEach(team => {
      insertTeam.run(team.id, team.nom, team.joueurs);
    });

    // Insérer les matchs par défaut
    const matches = [
      // Lundi
      { id: "lundi-1", jour: "lundi", heure: "12:00", equipe1_id: "A", equipe2_id: "B" },
      { id: "lundi-2", jour: "lundi", heure: "13:00", equipe1_id: "C", equipe2_id: "D" },
      { id: "lundi-3", jour: "lundi", heure: "13:30", equipe1_id: "E", equipe2_id: "F" },
      // Mardi
      { id: "mardi-1", jour: "mardi", heure: "12:00", equipe1_id: "A", equipe2_id: "C" },
      { id: "mardi-2", jour: "mardi", heure: "13:00", equipe1_id: "B", equipe2_id: "D" },
      { id: "mardi-3", jour: "mardi", heure: "13:30", equipe1_id: "G", equipe2_id: "H" },
      // Mercredi
      { id: "mercredi-1", jour: "mercredi", heure: "12:00", equipe1_id: "A", equipe2_id: "E" },
      { id: "mercredi-2", jour: "mercredi", heure: "13:00", equipe1_id: "B", equipe2_id: "F" },
      { id: "mercredi-3", jour: "mercredi", heure: "13:30", equipe1_id: "C", equipe2_id: "G" },
      // Jeudi
      { id: "jeudi-1", jour: "jeudi", heure: "12:00", equipe1_id: "D", equipe2_id: "H" },
      { id: "jeudi-2", jour: "jeudi", heure: "13:00", equipe1_id: "E", equipe2_id: "G" },
      { id: "jeudi-3", jour: "jeudi", heure: "13:30", equipe1_id: "F", equipe2_id: "H" }
    ];

    const insertMatch = db.prepare(`
      INSERT INTO matches (id, jour, heure, equipe1_id, equipe2_id) 
      VALUES (?, ?, ?, ?, ?)
    `);

    matches.forEach(match => {
      insertMatch.run(match.id, match.jour, match.heure, match.equipe1_id, match.equipe2_id);
    });
  }

  // Vérifier si un admin existe déjà
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  
  if (adminCount.count === 0) {
    // Créer l'admin par défaut avec le mot de passe 123456
    const bcrypt = await import('bcryptjs');
    const passwordHash = bcrypt.default.hashSync('123456', 10);
    
    const insertAdmin = db.prepare(`
      INSERT INTO admins (username, password_hash) 
      VALUES (?, ?)
    `);
    
    insertAdmin.run('admin', passwordHash);
  }
}

/**
 * Obtient une instance de la base de données
 * @returns {Promise<Database.Database>} Instance de la base de données
 */
export async function getDatabase() {
  return await initDatabase();
}
