// appointment-service/appointmentService.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPromise = require('./appointmentDB');
const {
  connectProducer,
  publierRdvCree,
  publierRdvAnnule
} = require('./appointmentKafka');

// ── Charger le fichier proto ──
const packageDef = protoLoader.loadSync(
  path.join(__dirname, '../proto/appointment.proto'),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const appointmentProto = grpc.loadPackageDefinition(packageDef).appointment;

// ── Implémenter les méthodes gRPC ──
const appointmentService = {

  // Créer un rendez-vous
  CreateAppointment: async (call, callback) => {
    try {
      const { appointments, persist } = await dbPromise;
      const {
        patientId, doctorId,
        patientNom, doctorNom,
        date, heure, motif
      } = call.request;

      const appointment = {
        id:         uuidv4(),
        patientId,
        doctorId,
        patientNom,
        doctorNom,
        date,
        heure,
        motif,
        statut:     'confirme',
        motifAnnulation: '',
        createdAt:  new Date().toISOString()
      };

      // Sauvegarder dans RxDB
      await appointments.insert(appointment);
      await persist();

      // Publier dans Kafka → notifier MS1 et MS2
      await publierRdvCree(appointment);

      callback(null, { appointment });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  // Récupérer un RDV par id
  GetAppointment: async (call, callback) => {
    try {
      const { appointments } = await dbPromise;
      const doc = await appointments.findOne(call.request.id).exec();
      if (!doc) {
        return callback({
          code:    grpc.status.NOT_FOUND,
          message: 'Rendez-vous non trouvé'
        });
      }
      callback(null, { appointment: doc.toJSON() });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  // Lister tous les RDV
  ListAppointments: async (call, callback) => {
    try {
      const { appointments } = await dbPromise;
      const docs = await appointments.find().exec();
      callback(null, { appointments: docs.map(d => d.toJSON()) });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  // Modifier un RDV
  UpdateAppointment: async (call, callback) => {
    try {
      const { appointments, persist } = await dbPromise;
      const { id, date, heure, motif, statut } = call.request;

      const doc = await appointments.findOne(id).exec();
      if (!doc) {
        return callback({
          code:    grpc.status.NOT_FOUND,
          message: 'Rendez-vous non trouvé'
        });
      }

      const updated = await doc.incrementalPatch({ date, heure, motif, statut });
      await persist();

      callback(null, { appointment: updated.toJSON() });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },

  // Annuler un RDV → publie rdv-annule dans Kafka
  DeleteAppointment: async (call, callback) => {
    try {
      const { appointments, persist } = await dbPromise;
      const { id, motifAnnulation } = call.request;

      const doc = await appointments.findOne(id).exec();
      if (!doc) {
        return callback({
          code:    grpc.status.NOT_FOUND,
          message: 'Rendez-vous non trouvé'
        });
      }

      const appointmentData = doc.toJSON();

      // Changer le statut en "annule"
      await doc.incrementalPatch({
        statut:          'annule',
        motifAnnulation: motifAnnulation || 'Non spécifié'
      });
      await persist();

      // Publier dans Kafka → notifier MS1 et MS2
      await publierRdvAnnule(appointmentData, motifAnnulation);

      callback(null, { success: true });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  }
};

// ── Démarrer le serveur ──
async function main() {
  // Connecter Kafka
  await connectProducer();

  // Créer le serveur gRPC
  const server = new grpc.Server();
  server.addService(
    appointmentProto.AppointmentService.service,
    appointmentService
  );

  const port = process.env.APPOINTMENT_SERVICE_PORT || '50053';

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Erreur démarrage:', err);
        return;
      }
      console.log(`[RDV] Serveur gRPC démarré sur le port ${port}`);
    }
  );
}

main().catch(console.error);