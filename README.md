# FINDINGS — moteur

Branche de travail, non publiée : le programme d'ingestion (`ingest.mjs`), le générateur du site
(`build.mjs`), le catalogue complet (`catalog.js`) et la page figée (`publie/`). Le Mac s'y
synchronise à chaque publication (`publish.sh`).

Le passage automatique tourne sur le Mac. Un essai sur GitHub Actions (13 octobre 2026) a montré
que YouTube bloque les serveurs de GitHub : la tâche a été retirée, et `ingest.mjs` s'arrête
désormais sans rien écrire quand YouTube le bloque.
