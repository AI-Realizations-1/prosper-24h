#!/bin/bash
set -e
REPO="emi5650/Prosper"

# Atelier 1 - P0
gh issue create --repo "$REPO" --title "A1-01 : Définir le périmètre et l'objet de l'étude" --body "" --label "atelier-1,P0"
gh issue create --repo "$REPO" --title "A1-02 : Identifier les valeurs métier (VM)" --body "" --label "atelier-1,P0"
gh issue create --repo "$REPO" --title "A1-03 : Identifier les biens supports (BS) et les lier aux VM" --body "" --label "atelier-1,P0"
gh issue create --repo "$REPO" --title "A1-04 : Identifier les événements redoutés (ER) liés aux VM" --body "" --label "atelier-1,P0"
gh issue create --repo "$REPO" --title "A1-05 : Évaluer l'impact (gravité) des événements redoutés" --body "" --label "atelier-1,P0"
gh issue create --repo "$REPO" --title "A1-06 : Définir le socle de sécurité (conformité, référentiels)" --body "" --label "atelier-1,P0"
gh issue create --repo "$REPO" --title "A1-07 : Identifier les écarts par rapport au socle" --body "" --label "atelier-1,P0"

# Atelier 2 - P0
gh issue create --repo "$REPO" --title "A2-01 : Identifier les sources de risque (SR)" --body "" --label "atelier-2,P0"
gh issue create --repo "$REPO" --title "A2-02 : Identifier les objectifs visés (OV) par chaque SR" --body "" --label "atelier-2,P0"
gh issue create --repo "$REPO" --title "A2-03 : Évaluer la pertinence des couples SR/OV" --body "" --label "atelier-2,P0"
gh issue create --repo "$REPO" --title "A2-04 : Sélectionner les couples SR/OV retenus" --body "" --label "atelier-2,P0"

# Atelier 3 - P1
gh issue create --repo "$REPO" --title "A3-01 : Cartographier l'écosystème (parties prenantes)" --body "" --label "atelier-3,P1"
gh issue create --repo "$REPO" --title "A3-02 : Évaluer les dépendances et niveaux de menace des parties prenantes" --body "" --label "atelier-3,P1"
gh issue create --repo "$REPO" --title "A3-03 : Construire les scénarios stratégiques" --body "" --label "atelier-3,P1"
gh issue create --repo "$REPO" --title "A3-04 : Évaluer la vraisemblance des scénarios stratégiques" --body "" --label "atelier-3,P1"
gh issue create --repo "$REPO" --title "A3-05 : Définir les mesures de sécurité sur l'écosystème" --body "" --label "atelier-3,P1"

# Atelier 4 - P1
gh issue create --repo "$REPO" --title "A4-01 : Décliner les scénarios stratégiques en scénarios opérationnels" --body "" --label "atelier-4,P1"
gh issue create --repo "$REPO" --title "A4-02 : Lier les scénarios opérationnels aux biens supports" --body "" --label "atelier-4,P1"
gh issue create --repo "$REPO" --title "A4-03 : Évaluer la vraisemblance technique" --body "" --label "atelier-4,P1"
gh issue create --repo "$REPO" --title "A4-04 : Définir les mesures de sécurité techniques" --body "" --label "atelier-4,P1"

# Atelier 5 - P1
gh issue create --repo "$REPO" --title "A5-01 : Synthèse des risques (matrice gravité × vraisemblance)" --body "" --label "atelier-5,P1"
gh issue create --repo "$REPO" --title "A5-02 : Cartographie des risques" --body "" --label "atelier-5,P1"
gh issue create --repo "$REPO" --title "A5-03 : Décision de traitement par risque" --body "" --label "atelier-5,P1"
gh issue create --repo "$REPO" --title "A5-04 : Élaborer le plan de traitement des risques (PTR)" --body "" --label "atelier-5,P1"
gh issue create --repo "$REPO" --title "A5-05 : Évaluer les risques résiduels après traitement" --body "" --label "atelier-5,P1"
gh issue create --repo "$REPO" --title "A5-06 : Tableau de suivi des mesures de sécurité" --body "" --label "atelier-5,P1"

echo "=== Toutes les issues créées ==="
