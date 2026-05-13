// doctor-service/doctorDB.js
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'doctors.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id         TEXT PRIMARY KEY,
    nom        TEXT NOT NULL,
    specialite TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    telephone  TEXT,
    createdAt  TEXT NOT NULL
  )
`);

console.log('Base de données médecins prête');

// Créer un médecin
function createDoctor(doctor) {
  const stmt = db.prepare(`
    INSERT INTO doctors (id, nom, specialite, email, telephone, createdAt)
    VALUES (@id, @nom, @specialite, @email, @telephone, @createdAt)
  `);
  stmt.run(doctor);
  return doctor;
}

// Récupérer un médecin par id
function getDoctor(id) {
  return db.prepare('SELECT * FROM doctors WHERE id = ?').get(id);
}

// Lister tous les médecins
function listDoctors() {
  return db.prepare('SELECT * FROM doctors ORDER BY createdAt DESC').all();
}

// Modifier un médecin
function updateDoctor(id, data) {
  db.prepare(`
    UPDATE doctors
    SET nom        = @nom,
        specialite = @specialite,
        email      = @email,
        telephone  = @telephone
    WHERE id = @id
  `).run({ ...data, id });
  return getDoctor(id);
}

// Supprimer un médecin
function deleteDoctor(id) {
  const result = db.prepare('DELETE FROM doctors WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { createDoctor, getDoctor, listDoctors, updateDoctor, deleteDoctor };