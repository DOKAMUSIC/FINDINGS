# FINDINGS — moteur

Branche de travail, non publiée : le programme d'ingestion (`ingest.mjs`), le générateur du site
(`build.mjs`), le catalogue complet (`catalog.js`) et la page figée (`publie/`).

Le passage automatique tourne ici, sur GitHub Actions (`.github/workflows/ingestion.yml`), un jour
sur deux. Il met à jour `catalog.js` sur cette branche et le site publié sur `main`.
`journal.txt` garde le compte rendu du dernier passage.
