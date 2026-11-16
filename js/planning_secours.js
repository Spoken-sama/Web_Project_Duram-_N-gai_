// Copie de secours de Json/planning.json : utilisée seulement si fetch échoue
// (page ouverte en double-cliquant, en file://, le navigateur bloque fetch).
// Utilisée par agenda.js ET team.js.
// Si vous modifiez planning.json, pensez à mettre à jour cette copie aussi.
const PLANNING_SECOURS = {
    "personnel": [
        "Benjamin Durame",
        "Dényce Negai",
        "Abasse Minté"
    ],
    "jours": [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday"
    ],
    "heures": [
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00"
    ],
    "planning": [
        {
            "id": 1,
            "type": "tache",
            "titre": "Accueil clients",
            "description": "Gestion des arrivées et des départs.",
            "jour": "monday",
            "heure": "09:00",
            "lieu": "Réception",
            "personnes": [
                "Dényce Negai"
            ]
        },
        {
            "id": 2,
            "type": "tache",
            "titre": "Accueil clients",
            "description": "Permanence de l'après-midi.",
            "jour": "tuesday",
            "heure": "15:00",
            "lieu": "Réception",
            "personnes": [
                "Dényce Negai"
            ]
        },
        {
            "id": 3,
            "type": "tache",
            "titre": "Service du midi",
            "description": "Préparation et service du déjeuner.",
            "jour": "wednesday",
            "heure": "11:00",
            "lieu": "Cantine",
            "personnes": [
                "Benjamin Durame"
            ]
        },
        {
            "id": 4,
            "type": "tache",
            "titre": "Surveillance",
            "description": "Surveillance du bassin.",
            "jour": "friday",
            "heure": "09:00",
            "lieu": "Piscine",
            "personnes": [
                "Benjamin Durame"
            ]
        },
        {
            "id": 5,
            "type": "evenement",
            "titre": "Soirée détente",
            "description": "Ouverture prolongée du spa pour les membres.",
            "jour": "friday",
            "heure": "14:00",
            "lieu": "Spa",
            "personnes": [
                "Dényce Negai"
            ]
        },
        {
            "id": 6,
            "type": "tache",
            "titre": "Matinée",
            "description": "Ménage des chambres.",
            "jour": "monday",
            "heure": "08:00",
            "lieu": "Chambres",
            "personnes": [
                "Abasse Minté"
            ]
        }
    ]
};
