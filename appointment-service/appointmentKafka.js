// appointment-service/appointmentKafka.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'appointment-service',
  brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
});

// ── PRODUCTEUR UNIQUEMENT ──
// MS3 produit des événements mais ne consomme rien
const producer = kafka.producer();

async function connectProducer() {
  await producer.connect();
  console.log('[RDV] Producteur Kafka connecté');
}

// Publier "rdv-cree" quand un RDV est créé
async function publierRdvCree(appointment) {
  await producer.send({
    topic: process.env.TOPIC_RDV_CREE || 'rdv-cree',
    messages: [
      {
        key:   appointment.id,
        value: JSON.stringify({
          appointmentId: appointment.id,
          patientId:     appointment.patientId,
          doctorId:      appointment.doctorId,
          patientNom:    appointment.patientNom,
          doctorNom:     appointment.doctorNom,
          date:          appointment.date,
          heure:         appointment.heure,
          motif:         appointment.motif,
          statut:        appointment.statut,
          createdAt:     appointment.createdAt
        })
      }
    ]
  });
  console.log('[RDV] Événement rdv-cree publié pour :', appointment.patientNom);
}

// Publier "rdv-annule" quand un RDV est annulé
async function publierRdvAnnule(appointment, motifAnnulation) {
  await producer.send({
    topic: process.env.TOPIC_RDV_ANNULE || 'rdv-annule',
    messages: [
      {
        key:   appointment.id,
        value: JSON.stringify({
          appointmentId:   appointment.id,
          patientId:       appointment.patientId,
          doctorId:        appointment.doctorId,
          patientNom:      appointment.patientNom,
          doctorNom:       appointment.doctorNom,
          date:            appointment.date,
          heure:           appointment.heure,
          motifAnnulation: motifAnnulation || 'Non spécifié',
          cancelledAt:     new Date().toISOString()
        })
      }
    ]
  });
  console.log('[RDV] Événement rdv-annule publié pour :', appointment.patientNom);
}

module.exports = { connectProducer, publierRdvCree, publierRdvAnnule };