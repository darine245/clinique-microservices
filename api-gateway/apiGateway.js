// api-gateway/apiGateway.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express      = require('express');
const cors         = require('cors');
const { ApolloServer }      = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const fs           = require('fs');
const path         = require('path');
const grpc         = require('@grpc/grpc-js');
const protoLoader  = require('@grpc/proto-loader');
const resolvers    = require('./resolvers');

const app  = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// ── Charger les protos pour REST ──
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

// ── Clients gRPC ──
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

// Helper callback → Promise
function grpcCall(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

app.use(cors());
app.use(express.json());

// ── Route d'accueil ──
app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway — Clinique Microservices',
    rest: {
      patients:     'GET/POST /patients',
      patient:      'GET/PUT/DELETE /patients/:id',
      doctors:      'GET/POST /doctors',
      doctor:       'GET/PUT/DELETE /doctors/:id',
      appointments: 'GET/POST /appointments',
      appointment:  'GET/PUT/DELETE /appointments/:id'
    },
    graphql: 'POST /graphql'
  });
});

// ════════════════════════════════
// ── ROUTES REST PATIENTS ──
// ════════════════════════════════

app.get('/patients', async (req, res) => {
  try {
    const result = await grpcCall(getPatientClient(), 'ListPatients', {});
    res.json(result.patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/patients/:id', async (req, res) => {
  try {
    const result = await grpcCall(getPatientClient(), 'GetPatient', { id: req.params.id });
    res.json(result.patient);
  } catch (err) { res.status(404).json({ error: 'Patient non trouvé' }); }
});

app.post('/patients', async (req, res) => {
  try {
    const result = await grpcCall(getPatientClient(), 'CreatePatient', req.body);
    res.status(201).json(result.patient);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/patients/:id', async (req, res) => {
  try {
    const result = await grpcCall(
      getPatientClient(), 'UpdatePatient',
      { id: req.params.id, ...req.body }
    );
    res.json(result.patient);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/patients/:id', async (req, res) => {
  try {
    await grpcCall(getPatientClient(), 'DeletePatient', { id: req.params.id });
    res.json({ message: 'Patient supprimé avec succès' });
  } catch (err) { res.status(404).json({ error: 'Patient non trouvé' }); }
});

// ════════════════════════════════
// ── ROUTES REST MÉDECINS ──
// ════════════════════════════════

app.get('/doctors', async (req, res) => {
  try {
    const result = await grpcCall(getDoctorClient(), 'ListDoctors', {});
    res.json(result.doctors);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/doctors/:id', async (req, res) => {
  try {
    const result = await grpcCall(getDoctorClient(), 'GetDoctor', { id: req.params.id });
    res.json(result.doctor);
  } catch (err) { res.status(404).json({ error: 'Médecin non trouvé' }); }
});

app.post('/doctors', async (req, res) => {
  try {
    const result = await grpcCall(getDoctorClient(), 'CreateDoctor', req.body);
    res.status(201).json(result.doctor);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/doctors/:id', async (req, res) => {
  try {
    const result = await grpcCall(
      getDoctorClient(), 'UpdateDoctor',
      { id: req.params.id, ...req.body }
    );
    res.json(result.doctor);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/doctors/:id', async (req, res) => {
  try {
    await grpcCall(getDoctorClient(), 'DeleteDoctor', { id: req.params.id });
    res.json({ message: 'Médecin supprimé avec succès' });
  } catch (err) { res.status(404).json({ error: 'Médecin non trouvé' }); }
});

// ════════════════════════════════
// ── ROUTES REST RENDEZ-VOUS ──
// ════════════════════════════════

app.get('/appointments', async (req, res) => {
  try {
    const result = await grpcCall(getAppointmentClient(), 'ListAppointments', {});
    res.json(result.appointments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/appointments/:id', async (req, res) => {
  try {
    const result = await grpcCall(
      getAppointmentClient(), 'GetAppointment',
      { id: req.params.id }
    );
    res.json(result.appointment);
  } catch (err) { res.status(404).json({ error: 'Rendez-vous non trouvé' }); }
});

app.post('/appointments', async (req, res) => {
  try {
    const result = await grpcCall(
      getAppointmentClient(), 'CreateAppointment', req.body
    );
    res.status(201).json(result.appointment);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/appointments/:id', async (req, res) => {
  try {
    const result = await grpcCall(
      getAppointmentClient(), 'UpdateAppointment',
      { id: req.params.id, ...req.body }
    );
    res.json(result.appointment);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/appointments/:id', async (req, res) => {
  try {
    await grpcCall(
      getAppointmentClient(), 'DeleteAppointment',
      { id: req.params.id, motifAnnulation: req.body.motifAnnulation || '' }
    );
    res.json({ message: 'Rendez-vous annulé avec succès' });
  } catch (err) { res.status(404).json({ error: 'Rendez-vous non trouvé' }); }
});

// ════════════════════════════════
// ── GRAPHQL ──
// ════════════════════════════════

const typeDefs = fs.readFileSync(
  path.join(__dirname, 'schema.gql'), 'utf8'
);

const apolloServer = new ApolloServer({ typeDefs, resolvers });

apolloServer.start().then(() => {
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(apolloServer)
  );

  // Démarrer Express après Apollo
  app.listen(PORT, () => {
    console.log(`API Gateway démarré sur http://localhost:${PORT}`);
    console.log(`GraphQL disponible sur http://localhost:${PORT}/graphql`);
    console.log(`REST disponible sur http://localhost:${PORT}`);
  });
});