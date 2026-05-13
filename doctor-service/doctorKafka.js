// doctor-service/doctorKafka.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'doctor-service',
  brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
});

// ── CONSOMMATEUR UNIQUEMENT ──
// MS2 Médecins ne produit pas de messages
// il consomme les 3 topics
const consumer = kafka.consumer({ groupId: 'doctor-service-group' });

async function connectConsumer() {
  await consumer.connect();

  // S'abonner aux 3 topics
  await consumer.subscribe({
    topics: [
      process.env.TOPIC_PATIENT_AJOUTE || 'patient-ajoute',
      process.env.TOPIC_RDV_CREE       || 'rdv-cree',
      process.env.TOPIC_RDV_ANNULE     || 'rdv-annule'
    ],
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const data = JSON.parse(message.value.toString());

      if (topic === (process.env.TOPIC_PATIENT_AJOUTE || 'patient-ajoute')) {
        // Un nouveau patient s'est inscrit
        console.log(
          `[Médecin] Nouveau patient inscrit : ${data.nom}`,
          `(${data.email})`
        );
      }

      if (topic === (process.env.TOPIC_RDV_CREE || 'rdv-cree')) {
        // Un nouveau RDV a été créé
        console.log(
          `[Médecin] Nouveau RDV pour Dr. ${data.doctorNom}`,
          `avec ${data.patientNom} le ${data.date} à ${data.heure}`
        );
      }

      if (topic === (process.env.TOPIC_RDV_ANNULE || 'rdv-annule')) {
        // Un RDV a été annulé
        console.log(
          `[Médecin] RDV annulé pour Dr. ${data.doctorNom}`,
          `avec ${data.patientNom} — motif : ${data.motifAnnulation}`
        );
      }
    }
  });

  console.log('[Médecin] Consommateur Kafka connecté');
}

module.exports = { connectConsumer };