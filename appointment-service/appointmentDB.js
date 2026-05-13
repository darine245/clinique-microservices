// appointment-service/appointmentDB.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createRxDatabase }          = require('rxdb');
const { getRxStorageMemory }        = require('rxdb/plugins/storage-memory');
const { wrappedValidateAjvStorage } = require('rxdb/plugins/validate-ajv');
const { createHash }                = require('crypto');
const fs                            = require('fs/promises');
const path                          = require('path');

// Dossier où RxDB sauvegarde les données
const DATA_DIR      = path.join(__dirname, 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'appointments.snapshot.json');

// Schéma RxDB — définit la structure d'un rendez-vous
const appointmentSchema = {
  title:      'appointment schema',
  version:    0,
  primaryKey: 'id',
  type:       'object',
  properties: {
    id:         { type: 'string', maxLength: 100 },
    patientId:  { type: 'string', maxLength: 100 },
    doctorId:   { type: 'string', maxLength: 100 },
    patientNom: { type: 'string', maxLength: 150 },
    doctorNom:  { type: 'string', maxLength: 150 },
    date:       { type: 'string', maxLength: 20  },
    heure:      { type: 'string', maxLength: 10  },
    motif:      { type: 'string', maxLength: 500 },
    statut:     {
      type: 'string',
      maxLength: 20,
      // enum : seulement ces 2 valeurs sont acceptées
      enum: ['confirme', 'annule']
    },
    motifAnnulation: { type: 'string', maxLength: 500 },
    createdAt:       { type: 'string', maxLength: 50  }
  },
  required: ['id', 'patientId', 'doctorId', 'date', 'heure', 'statut']
};

// Fonction de hachage requise par RxDB
async function hashFunction(input) {
  if (input instanceof ArrayBuffer) input = Buffer.from(input);
  if (!Buffer.isBuffer(input)) input = Buffer.from(String(input));
  return createHash('sha256').update(input).digest('hex');
}

// Charger les données sauvegardées depuis le fichier JSON
async function loadSnapshot() {
  try {
    const raw    = await fs.readFile(SNAPSHOT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return []; // fichier absent = base vide
    throw err;
  }
}

// Sauvegarder tous les RDV dans le fichier JSON
async function persistAppointments(collection) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const docs         = await collection.find().exec();
  const appointments = docs.map(doc => doc.toJSON());
  await fs.writeFile(
    SNAPSHOT_FILE,
    JSON.stringify(appointments, null, 2),
    'utf8'
  );
}

// Initialiser RxDB
async function initDatabase() {
  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageMemory()
  });

  const db = await createRxDatabase({
    name:          'appointment-rxdb',
    storage,
    eventReduce:   true,
    multiInstance: false,
    hashFunction
  });

  await db.addCollections({
    appointments: { schema: appointmentSchema }
  });

  // Recharger les données sauvegardées au démarrage
  const saved = await loadSnapshot();
  if (saved.length > 0) {
    await db.appointments.bulkInsert(saved);
  }

  console.log('Base de données rendez-vous (RxDB) prête');

  return {
    appointments: db.appointments,
    persist:      () => persistAppointments(db.appointments)
  };
}

// On exporte une promesse
// Les autres fichiers feront : const { appointments, persist } = await dbPromise
module.exports = initDatabase();