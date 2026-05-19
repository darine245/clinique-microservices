# Clinique Microservices

Application de gestion de clinique basée sur une architecture microservices en Node.js.

## Auteur
- **Nom** : Darine Mnasri
- **Classe** : 4Info
- **Matière** : SoA et Microservices
- **Enseignant** : Dr. Salah Gontara
- **Année** : 2025-2026



## Description rapide

Application de gestion de clinique avec 3 microservices indépendants,
une API Gateway REST + GraphQL, une communication gRPC et un broker
Kafka pour les événements asynchrones.



## Technologies 

Node.js 
Express.js : Serveur HTTP REST
Apollo Server:Serveur GraphQL 
gRPC + Protobuf:Communication inter-services 
Kafka 4.2 (Docker) | Communication asynchrone 
SQLite3 : Base de données MS1 + MS2 
RxDB: Base de données MS3 



## Architecture rapide


Client → API Gateway (REST + GraphQL)
              │
              ├── gRPC → MS1 Patients    → SQLite3
              ├── gRPC → MS2 Médecins    → SQLite3
              └── gRPC → MS3 Rendez-vous → RxDB
                              │
                         Kafka Broker
                         ├── patient-ajoute
                         ├── rdv-cree
                         └── rdv-annule




## Installation rapide



#  Démarrer Kafka
docker compose up -d
#  Lancer les services
npm run patient
npm run doctor
npm run appointment
npm run gateway




