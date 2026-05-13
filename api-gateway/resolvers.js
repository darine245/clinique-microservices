// api-gateway/resolvers.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');

// ── Charger les fichiers proto ──
const opts = {
  keepCase: true, longs: String,
  enums: String, defaults: true, oneofs: true
};

const patientProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(__dirname, '../proto/patient.proto'), opts)
).patient;

const doctorProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(__dirname, '../proto/doctor.proto'), opts)
).doctor;

const appointmentProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(__dirname, '../proto/appointment.proto'), opts)
).appointment;

// ── Créer les clients gRPC ──
// Fonctions pour créer un nouveau client à chaque appel
const getPatientClient = () => new patientProto.PatientService(
  `localhost:${process.env.PATIENT_SERVICE_PORT || 50051}`,
  grpc.credentials.createInsecure()
);

const getDoctorClient = () => new doctorProto.DoctorService(
  `localhost:${process.env.DOCTOR_SERVICE_PORT || 50052}`,
  grpc.credentials.createInsecure()
);

const getAppointmentClient = () => new appointmentProto.AppointmentService(
  `localhost:${process.env.APPOINTMENT_SERVICE_PORT || 50053}`,
  grpc.credentials.createInsecure()
);

// ── Helper : convertir callback gRPC en Promise ──
// Apollo attend des Promises, gRPC utilise des callbacks
// Cette fonction fait la conversion automatiquement
function grpcCall(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

// ── Resolvers GraphQL ──
const resolvers = {

  Query: {
    // ── Patients ──
    patients: async () => {
      const res = await grpcCall(getPatientClient(), 'ListPatients', {});
      return res.patients;
    },

    patient: async (_, { id }) => {
      const res = await grpcCall(getPatientClient(), 'GetPatient', { id });
      return res.patient;
    },

    // ── Médecins ──
    doctors: async () => {
      const res = await grpcCall(getDoctorClient(), 'ListDoctors', {});
      return res.doctors;
    },

    doctor: async (_, { id }) => {
      const res = await grpcCall(getDoctorClient(), 'GetDoctor', { id });
      return res.doctor;
    },

    // ── Rendez-vous ──
    appointments: async () => {
      const res = await grpcCall(getAppointmentClient(), 'ListAppointments', {});
      return res.appointments;
    },

    appointment: async (_, { id }) => {
      const res = await grpcCall(getAppointmentClient(), 'GetAppointment', { id });
      return res.appointment;
    },
  },

  Mutation: {
    // ── Patients ──
    createPatient: async (_, args) => {
      const res = await grpcCall(getPatientClient(), 'CreatePatient', args);
      return res.patient;
    },

    updatePatient: async (_, args) => {
      const res = await grpcCall(getPatientClient(), 'UpdatePatient', args);
      return res.patient;
    },

    deletePatient: async (_, { id }) => {
      const res = await grpcCall(getPatientClient(), 'DeletePatient', { id });
      return res.success;
    },

    // ── Médecins ──
    createDoctor: async (_, args) => {
      const res = await grpcCall(getDoctorClient(), 'CreateDoctor', args);
      return res.doctor;
    },

    updateDoctor: async (_, args) => {
      const res = await grpcCall(getDoctorClient(), 'UpdateDoctor', args);
      return res.doctor;
    },

    deleteDoctor: async (_, { id }) => {
      const res = await grpcCall(getDoctorClient(), 'DeleteDoctor', { id });
      return res.success;
    },

    // ── Rendez-vous ──
    createAppointment: async (_, args) => {
      const res = await grpcCall(getAppointmentClient(), 'CreateAppointment', args);
      return res.appointment;
    },

    updateAppointment: async (_, args) => {
      const res = await grpcCall(getAppointmentClient(), 'UpdateAppointment', args);
      return res.appointment;
    },

    deleteAppointment: async (_, { id, motifAnnulation }) => {
      const res = await grpcCall(
        getAppointmentClient(),
        'DeleteAppointment',
        { id, motifAnnulation }
      );
      return res.success;
    },
  }
};

module.exports = resolvers;