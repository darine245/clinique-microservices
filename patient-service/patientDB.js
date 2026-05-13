// patient-service/patientDB.js
const Database = require('better-sqlite3');
const path     = require('path');

// Créer/ouvrir la base de données
// Le fichier patients.db sera créé automatiquement
const db = new Database(path.join(__dirname, 'patients.db'));

// Créer la table si elle n'existe pas encore
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id            TEXT PRIMARY KEY,
    nom           TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    telephone     TEXT,
    dateNaissance TEXT,
    createdAt     TEXT NOT NULL
  )
`);

console.log('Base de données patients prête');

// ── FONCTIONS CRUD ──

// Créer un patient
function createPatient(patient) {
  const stmt = db.prepare(`
    INSERT INTO patients (id, nom, email, telephone, dateNaissance, createdAt)
    VALUES (@id, @nom, @email, @telephone, @dateNaissance, @createdAt)
  `);
  stmt.run(patient);
  return patient;
}

// Récupérer un patient par son id
function getPatient(id) {
  const stmt = db.prepare('SELECT * FROM patients WHERE id = ?');
  return stmt.get(id);
}

// Récupérer tous les patients
function listPatients() {
  const stmt = db.prepare('SELECT * FROM patients ORDER BY createdAt DESC');
  return stmt.all();
}

// Modifier un patient
function updatePatient(id, data) {
  const stmt = db.prepare(`
    UPDATE patients
    SET nom = @nom,
        email = @email,
        telephone = @telephone,
        dateNaissance = @dateNaissance
    WHERE id = @id
  `);
  stmt.run({ ...data, id });
  return getPatient(id);
}

// Supprimer un patient
function deletePatient(id) {
  const stmt = db.prepare('DELETE FROM patients WHERE id = ?');
  const result = stmt.run(id);
  // result.changes = nombre de lignes supprimées
  // si 0 → patient pas trouvé
  return result.changes > 0;
}

module.exports = {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  deletePatient
};