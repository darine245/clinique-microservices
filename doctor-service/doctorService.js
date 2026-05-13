// doctor-service/doctorService.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./doctorDB');
const { connectConsumer } = require('./doctorKafka');

// ── Charger le fichier proto ──
const packageDef = protoLoader.loadSync(
  path.join(__dirname, '../proto/doctor.proto'),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const doctorProto = grpc.loadPackageDefinition(packageDef).doctor;

// ── Implémenter les méthodes gRPC ──
const doctorService = {

  // Créer un médecin
  CreateDoctor: async (call, callback) => {
    try {
      const { nom, specialite, email, telephone } = call.request;

      const doctor = {
        id:        uuidv4(),
        nom,
        specialite,
        email,
        telephone,
        createdAt: new Date().toISOString()
      };

      db.createDoctor(doctor);
      callback(null, { doctor });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  // Récupérer un médecin par id
  GetDoctor: (call, callback) => {
    const doctor = db.getDoctor(call.request.id);
    if (!doctor) {
      return callback({
        code:    grpc.status.NOT_FOUND,
        message: 'Médecin non trouvé'
      });
    }
    callback(null, { doctor });
  },

  // Lister tous les médecins
  ListDoctors: (call, callback) => {
    const doctors = db.listDoctors();
    callback(null, { doctors });
  },

  // Modifier un médecin
  UpdateDoctor: (call, callback) => {
    const { id, nom, specialite, email, telephone } = call.request;
    const doctor = db.updateDoctor(id, { nom, specialite, email, telephone });
    if (!doctor) {
      return callback({
        code:    grpc.status.NOT_FOUND,
        message: 'Médecin non trouvé'
      });
    }
    callback(null, { doctor });
  },

  // Supprimer un médecin
  DeleteDoctor: (call, callback) => {
    const success = db.deleteDoctor(call.request.id);
    if (!success) {
      return callback({
        code:    grpc.status.NOT_FOUND,
        message: 'Médecin non trouvé'
      });
    }
    callback(null, { success });
  }
};

// ── Démarrer le serveur ──
async function main() {
  // Connecter Kafka
  await connectConsumer();

  // Créer le serveur gRPC
  const server = new grpc.Server();
  server.addService(doctorProto.DoctorService.service, doctorService);

  const port = process.env.DOCTOR_SERVICE_PORT || '50052';

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Erreur démarrage:', err);
        return;
      }
      console.log(`[Médecin] Serveur gRPC démarré sur le port ${port}`);
    }
  );
}

main().catch(console.error);