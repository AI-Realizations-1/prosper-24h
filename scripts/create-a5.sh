#!/bin/bash
REPO="emi5650/Prosper"

echo "Creating A5-02..."
gh issue create --repo "$REPO" --title "A5-02 : Cartographie des risques" --body "" --label "atelier-5,P1"
echo "Creating A5-03..."
gh issue create --repo "$REPO" --title "A5-03 : Décision de traitement par risque" --body "" --label "atelier-5,P1"
echo "Creating A5-04..."
gh issue create --repo "$REPO" --title "A5-04 : Élaborer le plan de traitement des risques (PTR)" --body "" --label "atelier-5,P1"
echo "Creating A5-05..."
gh issue create --repo "$REPO" --title "A5-05 : Évaluer les risques résiduels après traitement" --body "" --label "atelier-5,P1"
echo "Creating A5-06..."
gh issue create --repo "$REPO" --title "A5-06 : Tableau de suivi des mesures de sécurité" --body "" --label "atelier-5,P1"
echo "=== A5 done ==="
