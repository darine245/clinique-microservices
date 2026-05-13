// patient-service/patientKafka.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'patient-service',
  brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
});

// ── PRODUCTEUR ──
const producer = kafka.producer();

async function connectProducer() {
  await producer.connect();
  console.log('[Patient] Producteur Kafka connecté');
}

// Envoie un événement "patient-ajoute" dans Kafka
async function publierPatientAjoute(patient) {
  await producer.send({
    topic: process.env.TOPIC_PATIENT_AJOUTE || 'patient-ajoute',
    messages: [
      {
        key:   patient.id,
        value: JSON.stringify({
          patientId:     patient.id,
          nom:           patient.nom,
          email:         patient.email,
          telephone:     patient.telephone,
          dateNaissance: patient.dateNaissance,
          createdAt:     patient.createdAt
        })
      }
    ]
  });
  console.log('[Patient] Événement patient-ajoute publié :', patient.nom);
}

// ── CONSOMMATEUR ──
const consumer = kafka.consumer({ groupId: 'patient-service-group' });

async function connectConsumer() {
  await consumer.connect();

  // S'abonner aux topics rdv-cree et rdv-annule
  await consumer.subscribe({
    topics: [
      process.env.TOPIC_RDV_CREE    || 'rdv-cree',
      process.env.TOPIC_RDV_ANNULE  || 'rdv-annule'
    ],
    fromBeginning: false  // lire seulement les nouveaux messages
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());

      if (topic === (process.env.TOPIC_RDV_CREE || 'rdv-cree')) {
        // Un RDV a été créé → mettre à jour l'historique du patient
        console.log(
          `[Patient] RDV créé pour le patient ${data.patientNom}`,
          `le ${data.date} à ${data.heure} avec ${data.doctorNom}`
        );
      }

      if (topic === (process.env.TOPIC_RDV_ANNULE || 'rdv-annule')) {
        // Un RDV a été annulé → noter dans l'historique du patient
        console.log(
          `[Patient] RDV annulé pour le patient ${data.patientNom}`,
          `motif : ${data.motifAnnulation}`
        );
      }
    }
  });

  console.log('[Patient] Consommateur Kafka connecté');
}

module.exports = { connectProducer, connectConsumer, publierPatientAjoute };