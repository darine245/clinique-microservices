// patient-service/patientService.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./patientDB');
const {
  connectProducer,
  connectConsumer,
  publierPatientAjoute
} = require('./patientKafka');

// ── Charger le fichier proto ──
const packageDef = protoLoader.loadSync(
  path.join(__dirname, '../proto/patient.proto'),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const patientProto = grpc.loadPackageDefinition(packageDef).patient;

// ── Implémenter les méthodes gRPC ──
const patientService = {

  // Créer un patient
  CreatePatient: async (call, callback) => {
    try {
      const { nom, email, telephone, dateNaissance } = call.request;

      // Créer l'objet patient
      const patient = {
        id:            uuidv4(),
        nom,
        email,
        telephone,
        dateNaissance,
        createdAt:     new Date().toISOString()
      };

      // Sauvegarder en base
      db.createPatient(patient);

      // Publier dans Kafka → notifier les autres services
      await publierPatientAjoute(patient);

      callback(null, { patient });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  // Récupérer un patient par id
  GetPatient: (call, callback) => {
    const patient = db.getPatient(call.request.id);
    if (!patient) {
      return callback({
        code:    grpc.status.NOT_FOUND,
        message: 'Patient non trouvé'
      });
    }
    callback(null, { patient });
  },

  // Lister tous les patients
  ListPatients: (call, callback) => {
    const patients = db.listPatients();
    callback(null, { patients });
  },

  // Modifier un patient
  UpdatePatient: (call, callback) => {
    const { id, nom, email, telephone, dateNaissance } = call.request;
    const patient = db.updatePatient(id, { nom, email, telephone, dateNaissance });
    if (!patient) {
      return callback({
        code:    grpc.status.NOT_FOUND,
        message: 'Patient non trouvé'
      });
    }
    callback(null, { patient });
  },

  // Supprimer un patient
  DeletePatient: (call, callback) => {
    const success = db.deletePatient(call.request.id);
    if (!success) {
      return callback({
        code:    grpc.status.NOT_FOUND,
        message: 'Patient non trouvé'
      });
    }
    callback(null, { success });
  }
};

// ── Démarrer le serveur gRPC ──
async function main() {
  // Connecter Kafka
  await connectProducer();
  await connectConsumer();

  // Créer le serveur gRPC
  const server = new grpc.Server();
  server.addService(patientProto.PatientService.service, patientService);

  const port = process.env.PATIENT_SERVICE_PORT || '50051';

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Erreur démarrage:', err);
        return;
      }
      console.log(`[Patient] Serveur gRPC démarré sur le port ${port}`);
    }
  );
}

main().catch(console.error);