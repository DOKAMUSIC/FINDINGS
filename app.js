
/* ============ langues : français, anglais, espagnol ============
   Le site est ecrit en francais. Pour l'anglais et l'espagnol, une couche de traduction
   remplace les textes au moment ou ils s'affichent : un dictionnaire pour les textes fixes,
   des regles pour ceux qui portent un nombre ou un nom (« 1931 prods », « Lire X »), et un
   decoupage sur « · » pour les lignes composees. Les donnees (titres des prods, beatmakers,
   artistes) ne sont jamais traduites : elles ne figurent pas au dictionnaire, et les zones
   qui les affichent portent translate="no". */
const LANGUES = { fr: "Français", en: "English", es: "Español" };
/* Sur le site publie, chaque page porte sa langue (data-langue, posee par build.mjs) :
   /en/… est anglais, /es/… espagnol, le reste francais. C'est l'adresse qui decide, y
   compris pour Google. Sans elle (la page source en local), on prend ?lang=, le choix
   retenu ou la langue du navigateur. */
const PAGE_LANGUE = LANGUES[document.documentElement.dataset.langue] ? document.documentElement.dataset.langue : null;
const LANG = (() => {
  if (PAGE_LANGUE) return PAGE_LANGUE;
  // ?lang=en dans l'adresse choisit la langue (lien partage) et la retient
  const q = new URLSearchParams(location.search).get("lang");
  if (LANGUES[q]) { try { localStorage.setItem("findings.lang", q); } catch (e) {} return q; }
  try { const l = localStorage.getItem("findings.lang"); if (LANGUES[l]) return l; } catch (e) {}
  const n = (navigator.languages && navigator.languages[0] || navigator.language || "fr").slice(0, 2).toLowerCase();
  return LANGUES[n] ? n : "fr";
})();
const LOCALE = { fr: "fr-FR", en: "en-US", es: "es-ES" }[LANG];
document.documentElement.lang = LANG;
const I18N = (() => {
  const L = LANG === "en" ? 0 : LANG === "es" ? 1 : -1;
  const D = {
    // ── navigation, en-tete
    "Accueil": ["Home", "Inicio"],
    "Artistes": ["Artists", "Artistas"],
    "Artiste": ["Artist", "Artista"],
    "Styles": ["Styles", "Estilos"],
    "Style": ["Style", "Estilo"],
    "Outils": ["Tools", "Herramientas"],
    "Les prods": ["Beats", "Beats"],
    "Studio": ["Studio", "Estudio"],
    "Pour toi": ["For you", "Para ti"],
    "Suivis": ["Following", "Seguidos"],
    "Historique": ["History", "Historial"],
    "Prods likés": ["Liked beats", "Beats con like"],
    "Prods likées": ["Liked beats", "Beats con like"],
    "Mode sombre": ["Dark mode", "Modo oscuro"],
    "Mode clair": ["Light mode", "Modo claro"],
    "Passer en mode sombre": ["Switch to dark mode", "Cambiar a modo oscuro"],
    "Passer en mode clair": ["Switch to light mode", "Cambiar a modo claro"],
    "Langue": ["Language", "Idioma"],
    "Parcourir FINDINGS": ["Browse FINDINGS", "Explorar FINDINGS"],
    "Rechercher": ["Search", "Buscar"],
    "Rechercher une prod": ["Search for a beat", "Buscar un beat"],
    "Un artiste, un mood, un titre : « Werenoi », « Clams Casino », « sombre »…": ["An artist, a mood, a title: “Werenoi”, “Clams Casino”, “dark”…", "Un artista, un mood, un título: «Werenoi», «Clams Casino», «oscuro»…"],
    "Un artiste, un mood, un titre : « Werenoi », « sombre »…": ["An artist, a mood, a title: “Werenoi”, “dark”…", "Un artista, un mood, un título: «Werenoi», «oscuro»…"],
    "Cherche une prod, un artiste, un mood…": ["Search for a beat, an artist, a mood…", "Busca un beat, un artista, un mood…"],
    "Mes abonnements": ["My follows", "Mis seguidos"],
    "Mes prods": ["My beats", "Mis beats"],
    "prods sur FINDINGS": ["beats on FINDINGS", "beats en FINDINGS"],
    "prod sur FINDINGS": ["beat on FINDINGS", "beat en FINDINGS"],
    "Mes abonnements : artistes et beatmakers suivis": ["My follows: artists and beatmakers you follow", "Mis seguidos: artistas y beatmakers que sigues"],
    "Pour toi : prods choisies d'après tes goûts": ["For you: beats picked from your taste", "Para ti: beats elegidos según tus gustos"],
    "Historique d'écoute": ["Listening history", "Historial de escucha"],
    "Studio : pose ta topline sur une prod, ou importe la tienne": ["Studio: record your topline on a beat, or import your own", "Estudio: graba tu topline sobre un beat o importa el tuyo"],
    "Studio en ligne : pose ta topline sur une prod": ["Online studio: record your topline on a beat", "Estudio online: graba tu topline sobre un beat"],
    "Studio en ligne : pose ta topline": ["Online studio: record your topline", "Estudio online: graba tu topline"],
    "FINDINGS : type beats à écouter et studio pour poser ta topline": ["FINDINGS: type beats to listen to, and a studio to record your topline", "FINDINGS: type beats para escuchar y un estudio para grabar tu topline"],
    "FINDINGS ne héberge aucun fichier : chaque prod est une vidéo YouTube publique, lue depuis YouTube, et chaque clic renvoie du trafic au beatmaker.": ["FINDINGS hosts no files: every beat is a public YouTube video, played from YouTube, and every click sends traffic to the beatmaker.", "FINDINGS no aloja ningún archivo: cada beat es un vídeo público de YouTube, reproducido desde YouTube, y cada clic envía tráfico al beatmaker."],
    "FINDINGS est ouvert depuis le disque.": ["FINDINGS is open from your disk.", "FINDINGS está abierto desde el disco."],
    "Le son passe quand même, mais le lecteur complet (enchaînement, file d'attente, barre de progression) a besoin du serveur local : double-clique": ["Sound still works, but the full player (autoplay, queue, progress bar) needs the local server: double-click", "El sonido funciona igual, pero el reproductor completo (encadenado, cola, barra de progreso) necesita el servidor local: haz doble clic en"],
    ", puis ouvre": [", then open", " y abre"],
    // pied de page
    "Titres, beatmakers, durées et écoutes viennent de YouTube, relevés lors des passages automatiques. Le": ["Titles, beatmakers, durations and plays come from YouTube, collected during automatic passes. The", "Títulos, beatmakers, duraciones y reproducciones vienen de YouTube, recogidos en las pasadas automáticas. El"],
    "tempo": ["tempo", "tempo"],
    "tonalité": ["key", "tonalidad"],
    "moods": ["moods", "moods"],
    "sont déduits du texte de la vidéo, à défaut du style : des repères, pas une mesure.": ["are inferred from the video text, or else from the style: pointers, not measurements.", "se deducen del texto del vídeo o, si no, del estilo: referencias, no mediciones."],
    "mise à jour": ["update", "actualización"],
    // ── accueil
    "Dernières sorties": ["Latest releases", "Últimos lanzamientos"],
    "Les dernières sorties": ["The latest releases", "Los últimos lanzamientos"],
    "Tout voir": ["See all", "Ver todo"],
    "Tout voir →": ["See all →", "Ver todo →"],
    "Par artiste": ["By artist", "Por artista"],
    "Par style": ["By style", "Por estilo"],
    "Par mood": ["By mood", "Por mood"],
    "Moods": ["Moods", "Moods"],
    "Mood": ["Mood", "Mood"],
    "La sélection du moment": ["Current picks", "La selección del momento"],
    "Une découverte pour toi": ["A discovery for you", "Un descubrimiento para ti"],
    "Écoute ou like quelques prods : cette sélection s'adaptera à tes goûts.": ["Play or like a few beats: this selection will adapt to your taste.", "Escucha o da like a algunos beats: esta selección se adaptará a tus gustos."],
    "Écouter": ["Listen", "Escuchar"],
    "Voir les prods": ["See the beats", "Ver los beats"],
    "Le plus fourni": ["Most beats", "El más surtido"],
    "La plus fournie": ["Most beats", "La más surtida"],
    "Sortie aujourd'hui": ["Out today", "Salió hoy"],
    "Sortie hier": ["Out yesterday", "Salió ayer"],
    "Nouveau": ["New", "Nuevo"],
    "Une prod te plaît ? Pose ta topline dessus.": ["Like a beat? Record your topline on it.", "¿Te gusta un beat? Graba tu topline encima."],
    "Enregistre ta voix direct sur la prod, coupe, ajoute de la réverb ou de l'écho, puis exporte. Tu peux aussi importer ta propre prod. Gratuit, sans compte.": ["Record your voice right on the beat, cut, add reverb or echo, then export. You can also import your own beat. Free, no account.", "Graba tu voz directamente sobre el beat, corta, añade reverb o eco y exporta. También puedes importar tu propio beat. Gratis, sin cuenta."],
    "Ouvrir le studio": ["Open the studio", "Abrir el estudio"],
    "Replier": ["Collapse", "Plegar"],
    "Tes abonnements": ["Your follows", "Tus seguidos"],
    "Tes toplines": ["Your toplines", "Tus toplines"],
    "Tes prods likées": ["Your liked beats", "Tus beats con like"],
    "Une prod mise de côté.": ["One beat saved.", "Un beat guardado."],
    "Rien pour l'instant.": ["Nothing yet.", "Nada por ahora."],
    "Tu ne suis personne pour l'instant.": ["You're not following anyone yet.", "Todavía no sigues a nadie."],
    "Ouvre un artiste (menu Artiste) ou clique sur le nom d'un beatmaker, puis touche « + Suivre » à côté du titre.": ["Open an artist (Artist menu) or click a beatmaker's name, then tap “+ Follow” next to the title.", "Abre un artista (menú Artista) o haz clic en el nombre de un beatmaker y toca «+ Seguir» junto al título."],
    "Pas encore de topline.": ["No topline yet.", "Todavía no hay topline."],
    "Lance une prod, touche le micro dans le lecteur et pose ta voix dessus : tes prises se rangeront ici.": ["Play a beat, tap the mic in the player and record your voice on it: your takes will be saved here.", "Pon un beat, toca el micro en el reproductor y graba tu voz encima: tus tomas se guardarán aquí."],
    "Lance une prod au hasard parmi celles que tu n'as jamais écoutées": ["Play a random beat you've never heard", "Reproduce un beat al azar entre los que nunca has escuchado"],
    "Nouveau depuis ta visite": ["New since your visit", "Nuevo desde tu visita"],
    // ── liste des prods
    "Toutes les prods": ["All beats", "Todos los beats"],
    "Tout lire": ["Play all", "Reproducir todo"],
    "Surprends-moi": ["Surprise me", "Sorpréndeme"],
    "Une prod au hasard dans cette liste, parmi celles que tu n'as jamais écoutées": ["A random beat from this list, among the ones you've never played", "Un beat al azar de esta lista, entre los que nunca has escuchado"],
    "Pertinence": ["Relevance", "Relevancia"],
    "Nouveautés": ["Newest", "Novedades"],
    "Les prods publiées le plus récemment par leur beatmaker": ["Beats most recently published by their beatmaker", "Los beats publicados más recientemente por su beatmaker"],
    "Tempo": ["Tempo", "Tempo"],
    "Jamais écoutées": ["Never played", "Nunca escuchados"],
    "jamais écoutées": ["never played", "nunca escuchados"],
    "N'afficher que les prods jamais écoutées": ["Only show beats you've never played", "Mostrar solo beats nunca escuchados"],
    "Effacer": ["Clear", "Borrar"],
    "effacer": ["clear", "borrar"],
    "Effacer les filtres": ["Clear filters", "Borrar filtros"],
    "Effacer l'historique": ["Clear history", "Borrar historial"],
    "réinitialiser": ["reset", "restablecer"],
    "Chercher un artiste": ["Search for an artist", "Buscar un artista"],
    "Chercher un style": ["Search for a style", "Buscar un estilo"],
    "Aucun artiste de la liste ne correspond.": ["No artist in the list matches.", "Ningún artista de la lista coincide."],
    "Aucun style ne correspond.": ["No style matches.", "Ningún estilo coincide."],
    "Aucune prod ne correspond.": ["No beat matches.", "Ningún beat coincide."],
    "BPM minimum": ["Minimum BPM", "BPM mínimo"],
    "BPM maximum": ["Maximum BPM", "BPM máximo"],
    "Tempo vérifié uniquement": ["Verified tempo only", "Solo tempo verificado"],
    "tempo vérifié": ["verified tempo", "tempo verificado"],
    "Tempo estimé": ["Estimated tempo", "Tempo estimado"],
    "Tempo estimé d'après le style : le beatmaker ne l'a pas indiqué.": ["Tempo estimated from the style: the beatmaker didn't state it.", "Tempo estimado según el estilo: el beatmaker no lo indicó."],
    "Tonalité estimée": ["Estimated key", "Tonalidad estimada"],
    "Tonalité estimée : non indiquée par le beatmaker.": ["Estimated key: not stated by the beatmaker.", "Tonalidad estimada: no indicada por el beatmaker."],
    "bpm": ["bpm", "bpm"],
    "clé": ["key", "tono"],
    "durée": ["length", "duración"],
    "vues": ["views", "vistas"],
    "âge": ["age", "edad"],
    "nouveau": ["new", "nuevo"],
    "par": ["by", "por"],
    "prods": ["beats", "beats"],
    "beatmakers": ["beatmakers", "beatmakers"],
    "Liker cette prod": ["Like this beat", "Dar like a este beat"],
    "Retirer des prods likées": ["Remove from liked beats", "Quitar de los beats con like"],
    "Prods similaires": ["Similar beats", "Beats similares"],
    "Similaires": ["Similar", "Similares"],
    "Prods dans le même esprit que celle-ci": ["Beats with the same vibe as this one", "Beats con la misma onda que este"],
    "Voir la chaîne": ["View channel", "Ver canal"],
    "Voir la chaîne YouTube du beatmaker": ["View the beatmaker's YouTube channel", "Ver el canal de YouTube del beatmaker"],
    "Ouvrir sur YouTube": ["Open on YouTube", "Abrir en YouTube"],
    "Ajoutée ces derniers jours": ["Added in the last few days", "Añadido estos últimos días"],
    "Ajoutée depuis ta dernière visite": ["Added since your last visit", "Añadido desde tu última visita"],
    "Ajoutée à tes likes": ["Added to your likes", "Añadido a tus likes"],
    "Tes prises sur cette prod": ["Your takes on this beat", "Tus tomas en este beat"],
    "Ranger": ["Organize", "Ordenar"],
    "Ranger dans": ["Save to", "Guardar en"],
    "Ranger dans un dossier": ["Save to a folder", "Guardar en una carpeta"],
    "Nouveau dossier": ["New folder", "Nueva carpeta"],
    "+ Nouveau dossier": ["+ New folder", "+ Nueva carpeta"],
    "Nom du dossier": ["Folder name", "Nombre de la carpeta"],
    "Tous": ["All", "Todos"],
    "Tout": ["All", "Todo"],
    "Renommer": ["Rename", "Renombrar"],
    "Supprimer": ["Delete", "Eliminar"],
    "Confirmer la suppression": ["Confirm deletion", "Confirmar eliminación"],
    "Ne plus suivre": ["Unfollow", "Dejar de seguir"],
    "Voir la page →": ["View page →", "Ver página →"],
    "Élargis le tempo ou enlève un filtre — le catalogue en compte": ["Widen the tempo or remove a filter — the catalog has", "Amplía el tempo o quita un filtro — el catálogo tiene"],
    // profils
    "Beatmaker": ["Beatmaker", "Beatmaker"],
    "Suivre": ["Follow", "Seguir"],
    "+ Suivre": ["+ Follow", "+ Seguir"],
    "Suivi": ["Following", "Siguiendo"],
    "✓ Suivi": ["✓ Following", "✓ Siguiendo"],
    "Abonné": ["Following", "Siguiendo"],
    "Partager": ["Share", "Compartir"],
    "↗ Partager": ["↗ Share", "↗ Compartir"],
    "Partager cette page": ["Share this page", "Compartir esta página"],
    "Lien copié": ["Link copied", "Enlace copiado"],
    "Lien copié !": ["Link copied!", "¡Enlace copiado!"],
    "Chaîne YouTube": ["YouTube channel", "Canal de YouTube"],
    "Chaîne YouTube ↗": ["YouTube channel ↗", "Canal de YouTube ↗"],
    "abonnés YouTube": ["YouTube subscribers", "suscriptores de YouTube"],
    "fans Deezer": ["Deezer fans", "fans en Deezer"],
    "C'est toi ? Mets le lien de cette page dans ta bio : tes auditeurs y trouvent toutes tes prods, et peuvent poser leur topline dessus.": ["Is this you? Put this page's link in your bio: your listeners will find all your beats here, and can record their topline on them.", "¿Eres tú? Pon el enlace de esta página en tu bio: tus oyentes encontrarán todos tus beats y podrán grabar su topline encima."],
    "style, tempo, tonalité et artistes en commun": ["style, tempo, key and artists in common", "estilo, tempo, tonalidad y artistas en común"],
    // ── lecteur et panneau
    "En lecture": ["Now playing", "Reproduciendo"],
    "Panneau En lecture": ["Now playing panel", "Panel de reproducción"],
    "Afficher la prod en cours à droite": ["Show the current beat on the right", "Mostrar el beat actual a la derecha"],
    "Fermer le panneau": ["Close panel", "Cerrar panel"],
    "Lecture / pause": ["Play / pause", "Reproducir / pausa"],
    "Lecture / pause (Espace)": ["Play / pause (Space)", "Reproducir / pausa (Espacio)"],
    "Lecture ou pause": ["Play or pause", "Reproducir o pausar"],
    "Prod précédente": ["Previous beat", "Beat anterior"],
    "Prod suivante": ["Next beat", "Beat siguiente"],
    "Précédent": ["Previous", "Anterior"],
    "Précédent (P)": ["Previous (P)", "Anterior (P)"],
    "Suivant": ["Next", "Siguiente"],
    "Suivant (N)": ["Next (N)", "Siguiente (N)"],
    "Aléatoire": ["Shuffle", "Aleatorio"],
    "Lecture aléatoire": ["Shuffle", "Reproducción aleatoria"],
    "Écoute rapide : démarrer chaque prod après l'intro": ["Quick listen: start each beat after the intro", "Escucha rápida: empezar cada beat tras la intro"],
    "Écoute rapide : saute l'intro": ["Quick listen: skip the intro", "Escucha rápida: salta la intro"],
    "Écoute rapide : saute l'intro (R)": ["Quick listen: skip the intro (R)", "Escucha rápida: salta la intro (R)"],
    "Couper le son": ["Mute", "Silenciar"],
    "Remettre le son": ["Unmute", "Activar sonido"],
    "Couper / remettre le son": ["Mute / unmute", "Silenciar / activar sonido"],
    "Volume": ["Volume", "Volumen"],
    "Position dans la prod": ["Position in the beat", "Posición en el beat"],
    "Agrandir la vidéo": ["Enlarge video", "Ampliar el vídeo"],
    "Réduire la vidéo": ["Shrink video", "Reducir el vídeo"],
    "Studio : enregistrer une topline sur cette prod": ["Studio: record a topline on this beat", "Estudio: graba una topline en este beat"],
    "Studio : pose ta topline": ["Studio: record your topline", "Estudio: graba tu topline"],
    "Studio : poser une topline": ["Studio: record a topline", "Estudio: grabar una topline"],
    "Le beatmaker": ["The beatmaker", "El beatmaker"],
    "Ses prods": ["Their beats", "Sus beats"],
    "À suivre": ["Up next", "A continuación"],
    "Dans le même esprit": ["Same vibe", "En la misma onda"],
    "Type beat de": ["Type beat for", "Type beat de"],
    "Type beat des artistes": ["Type beat for", "Type beat de"],
    "Cette chaîne bloque la lecture hors YouTube — prod suivante.": ["This channel blocks playback outside YouTube — next beat.", "Este canal bloquea la reproducción fuera de YouTube — siguiente beat."],
    // ── moods
    "agressif": ["aggressive", "agresivo"],
    "sombre": ["dark", "oscuro"],
    "mélancolique": ["melancholic", "melancólico"],
    "énergique": ["energetic", "enérgico"],
    "chill": ["chill", "chill"],
    "solaire": ["sunny", "soleado"],
    "sensuel": ["sensual", "sensual"],
    "planant": ["spacey", "etéreo"],
    "nostalgique": ["nostalgic", "nostálgico"],
    "cinématique": ["cinematic", "cinemático"],
    "festif": ["festive", "festivo"],
    // styles dont le nom est francais
    "Piano triste": ["Sad piano", "Piano triste"],
    "Emo rap / guitare": ["Emo rap / guitar", "Emo rap / guitarra"],
    // ── page studio
    "Pose ta topline, direct sur la prod.": ["Record your topline, right on the beat.", "Graba tu topline, directamente sobre el beat."],
    "Choisis une prod du site ou importe la tienne, enregistre ta voix au micro, coupe, déplace, ajoute de la réverb ou de l'écho, puis exporte en WAV. Gratuit, dans le navigateur, et tes projets restent sur ton appareil.": ["Pick a beat from the site or import your own, record your voice on the mic, cut, move, add reverb or echo, then export as WAV. Free, in your browser, and your projects stay on your device.", "Elige un beat del sitio o importa el tuyo, graba tu voz con el micro, corta, mueve, añade reverb o eco y exporta en WAV. Gratis, en el navegador, y tus proyectos se quedan en tu dispositivo."],
    "↥ Importer ma prod": ["↥ Import my beat", "↥ Importar mi beat"],
    "Choisir une prod du site": ["Pick a beat from the site", "Elegir un beat del sitio"],
    "Pistes illimitées": ["Unlimited tracks", "Pistas ilimitadas"],
    "Voix, backs, ad-libs : une piste par idée, muet et solo.": ["Vocals, backs, ad-libs: one track per idea, mute and solo.", "Voces, coros, ad-libs: una pista por idea, mute y solo."],
    "Édition au doigt": ["Hands-on editing", "Edición al dedo"],
    "Couper, rogner, déplacer, fondus, annuler à volonté.": ["Cut, trim, move, fades, unlimited undo.", "Corta, recorta, mueve, fundidos, deshaz sin límite."],
    "Effets par piste": ["Effects per track", "Efectos por pista"],
    "Réverb, écho calé sur le tempo, graves, aigus, compresseur.": ["Reverb, tempo-synced echo, lows, highs, compressor.", "Reverb, eco sincronizado con el tempo, graves, agudos, compresor."],
    "Export WAV": ["WAV export", "Exportación WAV"],
    "Ta voix seule, ou mixée avec ta prod si tu l'as importée.": ["Your voice alone, or mixed with your beat if you imported it.", "Tu voz sola, o mezclada con tu beat si lo importaste."],
    "Tes projets": ["Your projects", "Tus proyectos"],
    "Ouvrir": ["Open", "Abrir"],
    "Ta prod, tes voix": ["Your beat, your vocals", "Tu beat, tus voces"],
    "ta prod, tes voix": ["your beat, your vocals", "tu beat, tus voces"],
    "modifié aujourd'hui": ["edited today", "modificado hoy"],
    "ouvert": ["open", "abierto"],
    "Projet libre": ["Free project", "Proyecto libre"],
    "Ton projet libre : importe ta propre prod": ["Your free project: import your own beat", "Tu proyecto libre: importa tu propio beat"],
    // ── station audio
    "Fermer": ["Close", "Cerrar"],
    "Fermer le studio (Échap)": ["Close studio (Esc)", "Cerrar estudio (Esc)"],
    "Revenir au début": ["Back to start", "Volver al inicio"],
    "Revenir au début (Entrée)": ["Back to start (Enter)", "Volver al inicio (Intro)"],
    "Enregistrer": ["Record", "Grabar"],
    "Enregistrer au curseur (R)": ["Record at cursor (R)", "Grabar en el cursor (R)"],
    "● Enregistrement…": ["● Recording…", "● Grabando…"],
    "Niveau du micro": ["Mic level", "Nivel del micro"],
    "Couper": ["Cut", "Cortar"],
    "Couper au curseur": ["Cut at cursor", "Cortar en el cursor"],
    "Couper au curseur (S)": ["Cut at cursor (S)", "Cortar en el cursor (S)"],
    "Dupliquer": ["Duplicate", "Duplicar"],
    "Dupliquer la région (D)": ["Duplicate region (D)", "Duplicar región (D)"],
    "Supprimer la région (Suppr)": ["Delete region (Del)", "Eliminar región (Supr)"],
    "Annuler (⌘Z)": ["Undo (⌘Z)", "Deshacer (⌘Z)"],
    "Rétablir (⇧⌘Z)": ["Redo (⇧⌘Z)", "Rehacer (⇧⌘Z)"],
    "Aimanter à la grille (Alt pour s'en affranchir)": ["Snap to grid (hold Alt to bypass)", "Ajustar a la cuadrícula (Alt para ignorarla)"],
    "Grille": ["Grid", "Cuadrícula"],
    "Zoom": ["Zoom", "Zoom"],
    "Exporter": ["Export", "Exportar"],
    "Exporter en WAV": ["Export as WAV", "Exportar en WAV"],
    "Contenu de l'export": ["Export content", "Contenido de la exportación"],
    "Voix seule": ["Vocals only", "Solo voz"],
    "Voix + prod": ["Vocals + beat", "Voz + beat"],
    "Le son de la prod reste dans le lecteur YouTube": ["The beat's sound stays in the YouTube player", "El sonido del beat se queda en el reproductor de YouTube"],
    "Mesures": ["Bars", "Compases"],
    "mes.": ["bar", "comp."],
    "Prod": ["Beat", "Beat"],
    "Piste": ["Track", "Pista"],
    "+ Piste": ["+ Track", "+ Pista"],
    "Piste et effets": ["Track & effects", "Pista y efectos"],
    "Effets de la piste": ["Track effects", "Efectos de la pista"],
    "effets": ["effects", "efectos"],
    "Région": ["Region", "Región"],
    "Projet": ["Project", "Proyecto"],
    "Replier le panneau": ["Collapse panel", "Plegar panel"],
    "Les prochaines prises vont sur cette piste": ["Next takes go on this track", "Las próximas tomas van a esta pista"],
    "Muet": ["Mute", "Silencio"],
    "Solo": ["Solo", "Solo"],
    "Nom": ["Name", "Nombre"],
    "Préréglage": ["Preset", "Preset"],
    "Réglages perso": ["Custom settings", "Ajustes personalizados"],
    "Brut (aucun effet)": ["Dry (no effect)", "Seco (sin efectos)"],
    "Voix lead": ["Lead vocal", "Voz principal"],
    "Backs / chœurs": ["Backs / choir", "Coros"],
    "Ad-libs": ["Ad-libs", "Ad-libs"],
    "Téléphone": ["Phone", "Teléfono"],
    "téléphone": ["phone", "teléfono"],
    "Grand espace": ["Big space", "Gran espacio"],
    "Chaud et saturé": ["Warm and saturated", "Cálido y saturado"],
    "Panoramique": ["Pan", "Panorama"],
    "Supprimer la piste": ["Delete track", "Eliminar pista"],
    "Coupe-bas": ["Low cut", "Corte de graves"],
    "Égaliseur": ["Equalizer", "Ecualizador"],
    "Compresseur": ["Compressor", "Compresor"],
    "Saturation": ["Saturation", "Saturación"],
    "Filtre": ["Filter", "Filtro"],
    "Chorus / doubleur": ["Chorus / doubler", "Chorus / doblador"],
    "Réverb": ["Reverb", "Reverb"],
    "Écho": ["Echo", "Eco"],
    "Fréquence": ["Frequency", "Frecuencia"],
    "Graves": ["Lows", "Graves"],
    "Médiums": ["Mids", "Medios"],
    "Aigus": ["Highs", "Agudos"],
    "F. graves": ["Low freq.", "Frec. graves"],
    "F. médiums": ["Mid freq.", "Frec. medios"],
    "F. aigus": ["High freq.", "Frec. agudos"],
    "Seuil": ["Threshold", "Umbral"],
    "Ratio": ["Ratio", "Ratio"],
    "Gain": ["Gain", "Ganancia"],
    "Relâche": ["Release", "Liberación"],
    "Chaleur": ["Warmth", "Calidez"],
    "Mélange": ["Mix", "Mezcla"],
    "Résonance": ["Resonance", "Resonancia"],
    "Passe-bas": ["Low-pass", "Paso bajo"],
    "Passe-haut": ["High-pass", "Paso alto"],
    "Radio": ["Radio", "Radio"],
    "Vitesse": ["Speed", "Velocidad"],
    "Profondeur": ["Depth", "Profundidad"],
    "Largeur": ["Width", "Anchura"],
    "Taille": ["Size", "Tamaño"],
    "Pré-délai": ["Pre-delay", "Pre-delay"],
    "Brillance": ["Brightness", "Brillo"],
    "Niveau": ["Level", "Nivel"],
    "Répétitions": ["Feedback", "Repeticiones"],
    "Ping-pong": ["Ping-pong", "Ping-pong"],
    "Durée de l'écho, calée sur le tempo": ["Echo length, synced to the tempo", "Duración del eco, sincronizada con el tempo"],
    "à plat": ["flat", "plano"],
    "Retire le grave inutile (souffle, pied de micro, plosives). À laisser sur presque toutes les voix.": ["Removes useless low end (breath, mic stand, plosives). Leave it on almost every vocal.", "Quita los graves inútiles (soplidos, pie de micro, plosivas). Déjalo en casi todas las voces."],
    "Creuse ou renforce des zones : moins de « boue » vers 300–500 Hz, plus d'air dans les aigus.": ["Cuts or boosts areas: less “mud” around 300–500 Hz, more air in the highs.", "Recorta o refuerza zonas: menos «barro» hacia 300–500 Hz, más aire en los agudos."],
    "Resserre les écarts de volume pour que la voix reste devant. Seuil bas = plus compressé.": ["Evens out volume so the vocal stays up front. Lower threshold = more compression.", "Reduce las diferencias de volumen para que la voz quede delante. Umbral bajo = más compresión."],
    "Ajoute de la chaleur et du grain, comme un passage dans une console ou une bande.": ["Adds warmth and grit, like running through a console or tape.", "Añade calidez y grano, como pasar por una consola o una cinta."],
    "Coupe une partie du spectre : effet téléphone ou radio pour les ad-libs et les intros.": ["Cuts part of the spectrum: phone or radio effect for ad-libs and intros.", "Corta parte del espectro: efecto teléfono o radio para ad-libs e intros."],
    "Double et élargit la voix en stéréo : idéal pour les backs et les refrains.": ["Doubles and widens the vocal in stereo: ideal for backs and hooks.", "Dobla y ensancha la voz en estéreo: ideal para coros y estribillos."],
    "Place la voix dans une pièce. Taille = longueur de la queue, pré-délai = détache la voix.": ["Places the vocal in a room. Size = tail length, pre-delay = separates the vocal.", "Coloca la voz en una sala. Tamaño = longitud de la cola, pre-delay = separa la voz."],
    "Répète la voix en rythme, calé sur le tempo de la prod. Ping-pong = gauche puis droite.": ["Repeats the vocal in rhythm, synced to the beat's tempo. Ping-pong = left then right.", "Repite la voz en ritmo, sincronizada con el tempo del beat. Ping-pong = izquierda y luego derecha."],
    "Mix": ["Mix", "Mezcla"],
    "Volume général": ["Master volume", "Volumen general"],
    "Volume prod": ["Beat volume", "Volumen del beat"],
    "Volume de la prod": ["Beat volume", "Volumen del beat"],
    "Décalage voix": ["Vocal offset", "Desfase de voz"],
    "Raccourcis": ["Shortcuts", "Atajos"],
    "Espace": ["Space", "Espacio"],
    "Entrée": ["Enter", "Intro"],
    "Suppr": ["Del", "Supr"],
    "lecture ·": ["play ·", "reproducir ·"],
    "enregistrer ·": ["record ·", "grabar ·"],
    "couper ·": ["cut ·", "cortar ·"],
    "dupliquer ·": ["duplicate ·", "duplicar ·"],
    "supprimer ·": ["delete ·", "eliminar ·"],
    "annuler ·": ["undo ·", "deshacer ·"],
    "un temps (Maj : une mesure) ·": ["one beat (Shift: one bar) ·", "un tiempo (Mayús: un compás) ·"],
    "début": ["start", "inicio"],
    "Actions": ["Actions", "Acciones"],
    "Normaliser": ["Normalize", "Normalizar"],
    "Touche une région dans la timeline pour régler son volume et ses fondus. Tire ses bords pour la rogner, les points blancs pour les fondus.": ["Tap a region in the timeline to set its volume and fades. Drag its edges to trim it, and the white dots for fades.", "Toca una región en la línea de tiempo para ajustar su volumen y fundidos. Arrastra sus bordes para recortarla y los puntos blancos para los fundidos."],
    "Aucune prod : importe la tienne (ou dépose le fichier ici)": ["No beat: import yours (or drop the file here)", "Ningún beat: importa el tuyo (o suelta el archivo aquí)"],
    "Aucune prod pour l'instant. Importe le fichier de la prod pour une synchro parfaite et un export avec la prod.": ["No beat yet. Import the beat's file for perfect sync and an export with the beat.", "Todavía no hay beat. Importa el archivo del beat para una sincronización perfecta y una exportación con el beat."],
    "Le son vient du lecteur YouTube. Importe le fichier de la prod pour une synchro parfaite et un export avec la prod.": ["The sound comes from the YouTube player. Import the beat's file for perfect sync and an export with the beat.", "El sonido viene del reproductor de YouTube. Importa el archivo del beat para una sincronización perfecta y una exportación con el beat."],
    "Importer la prod que tu as récupérée (mp3, wav…)": ["Import your copy of the beat (mp3, wav…)", "Importa tu copia del beat (mp3, wav…)"],
    "Revenir à la version YouTube": ["Back to the YouTube version", "Volver a la versión de YouTube"],
    "Retirer le fichier (revenir à YouTube)": ["Remove file (back to YouTube)", "Quitar archivo (volver a YouTube)"],
    "Prod importée :": ["Imported beat:", "Beat importado:"],
    ". Fais glisser sa région pour la caler.": [". Drag its region to line it up.", ". Arrastra su región para ajustarla."],
    "Fais glisser pour caler la prod sur tes voix": ["Drag to line the beat up with your vocals", "Arrastra para ajustar el beat a tus voces"],
    "Renommer le projet": ["Rename project", "Renombrar proyecto"],
    "Nom du projet": ["Project name", "Nombre del proyecto"],
    "Supprimer le projet": ["Delete project", "Eliminar proyecto"],
    "Supprimer le projet ?": ["Delete project?", "¿Eliminar proyecto?"],
    "REC": ["REC", "REC"],
    // messages
    "Annulé": ["Undone", "Deshecho"],
    "Rétabli": ["Redone", "Rehecho"],
    "Projet renommé": ["Project renamed", "Proyecto renombrado"],
    "Projet supprimé": ["Project deleted", "Proyecto eliminado"],
    "Prise gardée": ["Take saved", "Toma guardada"],
    "Fin de la prod : prise gardée": ["End of the beat: take saved", "Fin del beat: toma guardada"],
    "Prise trop courte : elle n'a pas été gardée": ["Take too short: it wasn't saved", "Toma demasiado corta: no se guardó"],
    "La prise n'a pas pu être lue": ["The take couldn't be read", "No se pudo leer la toma"],
    "Ce navigateur ne garde pas les prises : exporte avant de fermer": ["This browser doesn't keep takes: export before closing", "Este navegador no guarda las tomas: exporta antes de cerrar"],
    "Ce navigateur ne permet pas d'enregistrer le micro": ["This browser can't record the mic", "Este navegador no permite grabar el micro"],
    "L'enregistrement n'a pas pu démarrer : vérifie ton micro": ["Recording couldn't start: check your mic", "La grabación no pudo empezar: revisa tu micro"],
    "Lance la prod dans le lecteur pour enregistrer": ["Play the beat in the player to record", "Pon el beat en el reproductor para grabar"],
    "La prod ne démarre pas, réessaie": ["The beat won't start, try again", "El beat no arranca, vuelve a intentarlo"],
    "Place le curseur sur une région pour la couper": ["Put the cursor on a region to cut it", "Pon el cursor sobre una región para cortarla"],
    "Région dupliquée à la suite": ["Region duplicated right after", "Región duplicada a continuación"],
    "Export en cours…": ["Exporting…", "Exportando…"],
    "L'export a échoué": ["Export failed", "La exportación falló"],
    "Import de la prod…": ["Importing the beat…", "Importando el beat…"],
    "Ce fichier n'a pas pu être lu par le navigateur": ["The browser couldn't read this file", "El navegador no pudo leer este archivo"],
    "Choisis un fichier audio (mp3, wav, m4a…)": ["Pick an audio file (mp3, wav, m4a…)", "Elige un archivo de audio (mp3, wav, m4a…)"],
    "Le fichier sera perdu en fermant la page (stockage indisponible)": ["The file will be lost when you close the page (storage unavailable)", "El archivo se perderá al cerrar la página (almacenamiento no disponible)"],
    "Retour à la version YouTube": ["Back to the YouTube version", "Vuelta a la versión de YouTube"],
    "Le studio a besoin du lecteur complet, indisponible ici.": ["The studio needs the full player, which isn't available here.", "El estudio necesita el reproductor completo, que no está disponible aquí."],
    "Retirer ta prod importée et revenir à la version YouTube ?": ["Remove your imported beat and go back to the YouTube version?", "¿Quitar tu beat importado y volver a la versión de YouTube?"],
    "il y a moins d'une heure": ["less than an hour ago", "hace menos de una hora"],
    "aujourd'hui": ["today", "hoy"],
    "hier": ["yesterday", "ayer"],
    "il y a un mois": ["a month ago", "hace un mes"]
  };
  // nombre suivi d'un mot qui s'accorde : n, puis [singulier, pluriel] par langue
  const nb = (n, en, es) => { const v = parseFloat(String(n).replace(/[^\d.]/g, "")) || 0, un = v <= 1; return L === 0 ? `${n} ${un ? en[0] : en[1]}` : `${n} ${un ? es[0] : es[1]}`; };
  const N = "(\\d[\\d\\u202f\\u00a0 ,.]*\\d|\\d)";
  /* Regles : [expression, anglais, espagnol]. Une chaine porte $1, $2… ; une fonction
     recoit les groupes et peut traduire un morceau a son tour (t). */
  const R = [
    [`^${N} prods?$`, m => nb(m[1], ["beat", "beats"], ["beat", "beats"])],
    [`^${N} prods? sur FINDINGS$`, m => nb(m[1], ["beat", "beats"], ["beat", "beats"]) + (L === 0 ? " on FINDINGS" : " en FINDINGS")],
    [`^${N} prods? proches$`, m => nb(m[1], ["similar beat", "similar beats"], ["beat parecido", "beats parecidos"])],
    [`^${N} prods? en tout$`, m => nb(m[1], ["beat", "beats"], ["beat", "beats"]) + (L === 0 ? " in total" : " en total")],
    [`^${N} en tout$`, "$1 in total", "$1 en total"],
    [`^${N} prods? mises? de côté\\.$`, m => nb(m[1], ["beat saved.", "beats saved."], ["beat guardado.", "beats guardados."])],
    [`^${N} prods? pas encore écoutées?$`, m => nb(m[1], ["beat not played yet", "beats not played yet"], ["beat sin escuchar", "beats sin escuchar"])],
    [`^${N} nouvelles? depuis ta visite$`, "$1 new since your visit", "$1 nuevos desde tu visita"],
    [`^${N} artistes?$`, m => nb(m[1], ["artist", "artists"], ["artista", "artistas"])],
    [`^${N} artistes, du plus fourni au plus rare : fais défiler\\.$`, "$1 artists, from most to fewest beats: scroll through.", "$1 artistas, del más al menos surtido: desliza."],
    [`^${N} styles remplis, du plus fourni au plus rare\\.$`, "$1 styles, from most to fewest beats.", "$1 estilos, del más al menos surtido."],
    [`^${N} ambiances, déduites du titre et de la description de chaque prod\\.$`, "$1 moods, inferred from each beat's title and description.", "$1 ambientes, deducidos del título y la descripción de cada beat."],
    [`^${N} styles$`, "$1 styles", "$1 estilos"],
    [`^${N} dans tes likes$`, "$1 in your likes", "$1 en tus likes"],
    [`^(.+) abonnés$`, "$1 subscribers", "$1 suscriptores"],
    [`^(.+) vues$`, "$1 views", "$1 vistas"],
    [`^${N} j$`, "$1d", "$1 d"],
    [`^${N} jours$`, "$1 days", "$1 días"],
    [`^${N} sem\\.$`, "$1w", "$1 sem."],
    [`^${N} mois$`, m => L === 0 ? `${m[1]} mo` : nb(m[1], [], ["mes", "meses"])],
    [`^${N} h$`, "$1 h", "$1 h"],
    [`^[Ii]l y a (.+)$`, m => L === 0 ? `${t(m[1])} ago` : `hace ${t(m[1])}`],
    [`^modifié il y a (.+)$`, m => L === 0 ? `edited ${t(m[1])} ago` : `modificado hace ${t(m[1])}`],
    [`^${N} prises?$`, m => nb(m[1], ["take", "takes"], ["toma", "tomas"])],
    [`^${N} projets?, gardés? sur cet appareil\\.$`, m => nb(m[1], ["project", "projects"], ["proyecto", "proyectos"]) + (L === 0 ? ", saved on this device." : ", guardados en este dispositivo.")],
    [`^Prise ${N}$`, "Take $1", "Toma $1"],
    [`^Sur (.+)$`, "On $1", "Sobre $1"],
    [`^Voix ${N}$`, "Vocal $1", "Voz $1"],
    [`^Volume de (.+)$`, m => L === 0 ? `${t(m[1])} volume` : `Volumen de ${t(m[1])}`],
    [`^file (\\d+)/(\\d+)$`, "queue $1/$2", "cola $1/$2"],
    [`^(\\d+/\\d+) pointée$`, "dotted $1", "$1 con puntillo"],
    [`^(\\d+/\\d+) triolet$`, "$1 triplet", "$1 tresillo"],
    [`^chaleur ${N} %$`, "warmth $1 %", "calidez $1 %"],
    [`^([+\\-−]?[\\d.]+) graves$`, "$1 lows", "$1 graves"],
    [`^([+\\-−]?[\\d.]+) méd\\.$`, "$1 mids", "$1 medios"],
    [`^([+\\-−]?[\\d.]+) aigus$`, "$1 highs", "$1 agudos"],
    [`^\\+${N} à la dernière passe$`, "+$1 in the last pass", "+$1 en la última pasada"],
    [`^mis à jour le (.+)$`, "updated $1", "actualizado el $1"],
    [`^ingestion automatique tous les ${N} jours, rien de plus vieux que ${N} mois \\(jusqu'à ${N} mois pour compléter un artiste à ${N} type beats\\), tout se lit ici sans quitter la page\\.$`,
      "automatic import every $1 days, nothing older than $2 months (up to $3 months to fill an artist up to $4 type beats), everything plays right here without leaving the page.",
      "importación automática cada $1 días, nada de más de $2 meses (hasta $3 meses para completar un artista con $4 type beats), todo se escucha aquí sin salir de la página."],
    [`^ingestion automatique tous les ${N} jours, rien de plus vieux que ${N} mois, tout se lit ici sans quitter la page\\.$`,
      "automatic import every $1 days, nothing older than $2 months, everything plays right here without leaving the page.",
      "importación automática cada $1 días, nada de más de $2 meses, todo se escucha aquí sin salir de la página."],
    [`^\\(${N} % des prods\\) et la$`, "($1 % of beats) and the", "($1 % de los beats) y la"],
    [`^\\(${N} %\\) sont lus dans le titre ou la description quand le beatmaker les indique ; sinon ils sont estimés d'après le style et s'affichent en gris, précédés d'un « ~ »\\. Les$`,
      "($1 %) are read from the title or description when the beatmaker states them; otherwise they're estimated from the style and shown in grey, preceded by a “~”. The",
      "($1 %) se leen en el título o la descripción cuando el beatmaker los indica; si no, se estiman según el estilo y aparecen en gris, precedidos de «~». Los"],
    [`^${N} prods sur ${N} annoncent leur tempo\\. Pour les autres, la valeur affichée est une estimation, signalée par un ~\\.$`,
      "$1 of $2 beats state their tempo. For the others, the value shown is an estimate, marked with a ~.",
      "$1 de $2 beats indican su tempo. Para los demás, el valor mostrado es una estimación, marcada con ~."],
    [`^La plus récente est sortie le (.+)\\.$`, "The latest came out on $1.", "El más reciente salió el $1."],
    [`^Élargis le tempo ou enlève un filtre — le catalogue en compte ${N}\\.$`, "Widen the tempo or remove a filter — the catalog has $1.", "Amplía el tempo o quita un filtro — el catálogo tiene $1."],
    [`^Voir les ${N} autres styles$`, "See $1 more styles", "Ver $1 estilos más"],
    [`^Lire les ${N}$`, "Play all $1", "Reproducir los $1"],
    [`^Lire (.+)$`, "Play $1", "Reproducir $1"],
    [`^Chaîne YouTube de (.+)$`, "$1's YouTube channel", "Canal de YouTube de $1"],
    [`^Voir la chaîne YouTube de (.+)$`, "View $1's YouTube channel", "Ver el canal de YouTube de $1"],
    [`^Toutes les prods de (.+)$`, "All beats by $1", "Todos los beats de $1"],
    [`^Prods similaires à (.+)$`, "Beats similar to $1", "Beats similares a $1"],
    [`^Dans l'esprit de « (.+) »$`, "Similar to “$1”", "En la onda de «$1»"],
    [`^Activer (.+)$`, m => (L === 0 ? "Enable " : "Activar ") + t(m[1])],
    [`^Préréglage « (.+) »$`, m => (L === 0 ? `Preset “${t(m[1])}”` : `Preset «${t(m[1])}»`)],
    [`^Normalisée : volume ${N} %$`, "Normalized: volume $1 %", "Normalizado: volumen $1 %"],
    [`^Prod décalée de (.+) s$`, "Beat shifted by $1 s", "Beat desplazado $1 s"],
    [`^Supprimer la piste « (.+) » et ses régions \\?$`, "Delete track “$1” and its regions?", "¿Eliminar la pista «$1» y sus regiones?"],
    [`^Supprimer le projet « (.+) » \\? Ses prises et la prod importée seront effacées de cet appareil\\.$`, "Delete project “$1”? Its takes and the imported beat will be erased from this device.", "¿Eliminar el proyecto «$1»? Sus tomas y el beat importado se borrarán de este dispositivo."],
    [`^Supprimer le projet « (.+) » \\? Ses ${N} prises? et la prod importée seront effacées de cet appareil\\.$`, "Delete project “$1”? Its $2 take(s) and the imported beat will be erased from this device.", "¿Eliminar el proyecto «$1»? Sus $2 toma(s) y el beat importado se borrarán de este dispositivo."],
    [`^sur « (.+) »$`, "on “$1”", "sobre «$1»"],
    [`^Ouvrir le studio sur la prod en cours : (.+)$`, "Open the studio on the current beat: $1", "Abrir el estudio con el beat actual: $1"],
    [`^Suivre (.+) : ses nouvelles prods remontent dans l'accueil$`, "Follow $1: their new beats show up on the home page", "Seguir a $1: sus nuevos beats aparecen en el inicio"],
    [`^Ne plus suivre (.+)$`, "Unfollow $1", "Dejar de seguir a $1"],
    [`^Parce que tu écoutes beaucoup de (.+)$`, m => (L === 0 ? "Because you listen to a lot of " : "Porque escuchas mucho ") + t(m[1])],
    [`^Parce que tu écoutes (.+)$`, "Because you listen to $1", "Porque escuchas a $1"],
    [`^D'après tes ${N} likes? et ${N} écoutes? : (.+)\\.$`, m => (L === 0 ? `Based on your ${m[1]} like(s) and ${m[2]} play(s): ` : `Según tus ${m[1]} likes y ${m[2]} escuchas: `) + liste(m[3]) + "."],
    [`^Surtout (.+)$`, m => (L === 0 ? "Mostly " : "Sobre todo ") + liste(m[1])],
    [`^Type beats (.+) par$`, "$1 type beats by", "Type beats de $1 por"],
    [`^Type beats (.+)$`, m => L === 0 ? `${liste(m[1])} type beats` : `Type beats ${liste(m[1])}`],
    [`^Type beat (.+)$`, m => L === 0 ? `${t(m[1])} type beat` : `Type beat ${t(m[1])}`],
    [`^Cherche (.+)$`, m => (L === 0 ? "Search " : "Busca ") + m[1].replace(/« ([^»]+) »/g, (_, x) => L === 0 ? `“${t(x)}”` : `«${t(x)}»`)],
    [`^(.+) type beat : ${N} prods? à écouter$`, "$1 type beat: $2 beats to listen to", "$1 type beat: $2 beats para escuchar"],
    [`^(.+) : ${N} type beats? à écouter$`, "$1: $2 type beats to listen to", "$1: $2 type beats para escuchar"],
    [`^« (.+) » : ${N} prods?$`, "“$1”: $2 beats", "«$1»: $2 beats"],
    [`^par (.+)$`, "by $1", "por $1"]
  ].map(([re, en, es]) => [new RegExp(re, "u"), typeof en === "function" ? en : (L === 0 ? en : es)]);
  const appliquer = (r, m) => typeof r === "function" ? r(m) : r.replace(/\$(\d)/g, (_, i) => m[+i] ?? "");
  // une liste « A, B, C » : chaque element se traduit s'il est connu (moods, styles)
  const liste = s => s.split(", ").map(x => t(x)).join(", ");
  const cache = new Map();
  function exact(s){
    if (s in D) return D[s][L];
    // la casse de tete suit l'original : « Sombre » comme « sombre »
    const bas = s[0].toLowerCase() + s.slice(1), haut = s[0].toUpperCase() + s.slice(1);
    if (s !== bas && bas in D) { const v = D[bas][L]; return v[0].toUpperCase() + v.slice(1); }
    if (s !== haut && haut in D) { const v = D[haut][L]; return v[0].toLowerCase() + v.slice(1); }
    return null;
  }
  function segment(s){
    const e = exact(s); if (e != null) return e;
    const bord = s.match(/^(· )(.+)$|^(.+)( ·)$/);
    if (bord) { const c = bord[2] || bord[3], v = segment(c); if (v != null) return bord[1] ? "· " + v : v + " ·"; }
    for (const [re, r] of R) { const m = s.match(re); if (m) return appliquer(r, m); }
    return null;
  }
  // traduit un texte entier ; null quand rien n'est connu (il reste tel quel)
  function t(s){
    if (L < 0 || !s) return s;
    if (cache.has(s)) return cache.get(s);
    let out = segment(s);
    if (out == null && / · | \| /.test(s)) {
      const morceaux = s.split(/( · | \| )/);
      let change = false;
      const tr = morceaux.map(p => { if (p === " · " || p === " | ") return p; const v = segment(p.trim()); if (v == null) return p; change = true; return p.replace(p.trim(), v); });
      out = change ? tr.join("") : null;
    }
    const res = out == null ? s : out;
    if (cache.size < 20000) cache.set(s, res);
    return res;
  }
  /* ── application au document ── */
  const ATTRS = ["title", "aria-label", "placeholder"];
  const faits = new WeakMap();   // noeud -> dernier texte pose par nous, pour ne pas boucler
  const exclu = el => !!(el && el.closest && el.closest('[translate="no"],script,style,textarea'));
  function texte(n){
    if (faits.get(n) === n.nodeValue) return;
    const brut = n.nodeValue, coeur = brut.replace(/\s+/g, " ").trim();
    if (!coeur || !/\p{L}/u.test(coeur) || exclu(n.parentElement)) return;
    const v = t(coeur);
    if (v === coeur) return;
    const nv = brut.replace(/^(\s*)[\s\S]*?(\s*)$/, `$1${v}$2`);
    faits.set(n, nv); n.nodeValue = nv;
  }
  function attrs(el){
    if (exclu(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a); if (!v) continue;
      const k = "_t_" + a; if (el[k] === v) continue;
      const tv = t(v.replace(/\s+/g, " ").trim());
      el[k] = tv; if (tv !== v) el.setAttribute(a, tv);
    }
  }
  function arbre(racine){
    if (L < 0 || !racine) return;
    if (racine.nodeType === 3) { texte(racine); return; }
    if (racine.nodeType !== 1) return;
    if (exclu(racine)) return;
    attrs(racine);
    racine.querySelectorAll("[title],[aria-label],[placeholder]").forEach(attrs);
    const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) texte(n);
  }
  function demarrer(){
    if (L < 0) return;
    arbre(document.body);
    document.title = t(document.title);
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === "characterData") texte(m.target);
        else if (m.type === "attributes") attrs(m.target);
        else m.addedNodes.forEach(arbre);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    const titre = document.querySelector("title");
    if (titre) new MutationObserver(() => { const v = t(document.title); if (v !== document.title) document.title = v; }).observe(titre, { childList: true, characterData: true, subtree: true });
    // boites de dialogue du navigateur
    const c = window.confirm.bind(window), a = window.alert.bind(window);
    window.confirm = m => c(t(String(m)));
    window.alert = m => a(t(String(m)));
  }
  return { t, demarrer, arbre, L };
})();
const T = I18N.t;

I18N.demarrer();

/* ============ données ============ */
/* Le catalogue vit dans catalog.js, régénéré par ingest.mjs. */
const CAT = window.FINDINGS_CATALOG || window.PRODYFIND_CATALOG || window.DIGGR_CATALOG
         || { beats: [], updatedAt: null, lastRun: null };

/* Les styles, leurs noms et leurs couleurs viennent du catalogue : en ajouter un
   dans ingest.mjs suffit, l'interface suit sans qu'on touche au CSS. */
const STYLE_META = (CAT.styles && CAT.styles.length) ? CAT.styles : [
  {key:"trap",label:"Trap",color:"#FF7A3D"},{key:"drill",label:"Drill",color:"#5B7CFF"},
  {key:"boombap",label:"Boom bap",color:"#E3B13C"},{key:"afro",label:"Afro",color:"#2FBF71"},
  {key:"rnb",label:"R&B",color:"#EC5FA6"},{key:"phonk",label:"Phonk",color:"#9B5BE0"},
  {key:"jersey",label:"Jersey club",color:"#2FC6D8"},{key:"reggaeton",label:"Reggaeton",color:"#F1544B"},
  {key:"cloud",label:"Cloud rap",color:"#9FB2FF"},{key:"amapiano",label:"Amapiano",color:"#B9D63F"}
];
STYLE_META.forEach(s => document.documentElement.style.setProperty(`--s-${s.key}`, s.color));
const STYLES = STYLE_META.map(s => [s.key, s.label]);
const STYLE_NAME = Object.fromEntries(STYLES);
const MOODS = ["agressif","sombre","mélancolique","énergique","chill","solaire","sensuel","planant","nostalgique","cinématique","festif"];
/* Une teinte par mood, partagee entre les pastilles du panneau et les cartes de
   l'accueil : le meme mot doit avoir la meme couleur partout. L'ordre des cles sert
   aussi a ordonner le mur de l'accueil, ne pas le remanier a la legere. */
const MOOD_TEINTE = {
  "agressif":"#E63946", "sombre":"#2F3A5C", "mélancolique":"#5B7A9E", "énergique":"#FF9F0A",
  "chill":"#34C759", "solaire":"#FFC531", "sensuel":"#FF6FA5", "planant":"#A46BFF",
  "nostalgique":"#B08968", "cinématique":"#C9A227", "festif":"#2FC6D8"
};

const DAY = 86400000;
const since = d => d ? Math.max(0, (Date.now() - new Date(d + "T12:00:00Z")) / DAY) : 9999;

const BEATS = CAT.beats.map(b => ({
  ...b,
  days: since(b.published),
  isNew: since(b.addedAt) <= 3.5,
  // « est » liste ce qui a été deviné : hors de cette liste, la valeur est écrite
  // quelque part par le beatmaker, dans le titre ou la description
  artists: Array.isArray(b.artists) ? b.artists : [],
  bpmSur: Array.isArray(b.est) && !b.est.includes("bpm"),
  keySur: Array.isArray(b.est) && !b.est.includes("key")
}));

/* ============ jour / nuit ============ */
(function themeJourNuit(){
  const btn = document.getElementById("themeBtn"), racine = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const poser = (t, anime) => {
    if (anime) { racine.classList.add("theme-anim"); setTimeout(() => racine.classList.remove("theme-anim"), 450); }
    racine.setAttribute("data-theme", t);
    meta && meta.setAttribute("content", t === "dark" ? "#0E0E10" : "#F5F5F7");
    const sombre = t === "dark";
    btn.setAttribute("aria-label", sombre ? "Passer en mode clair" : "Passer en mode sombre");
    btn.title = sombre ? "Mode clair" : "Mode sombre";
  };
  poser(racine.getAttribute("data-theme") || "dark", false);
  btn.addEventListener("click", () => {
    const t = racine.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try { localStorage.setItem("findings.theme", t); } catch (e) {}
    poser(t, true);
  });
})();

/* ============ état ============ */
const S = {
  q:"", styles:new Set(), moods:new Set(), artists:new Set(), bpm:[55,200], bpmSur:false,
  sort:"pertinence", crateOnly:false, historyOnly:false, forYou:false, playing:null, paused:false,
  proche:null,      // id de la prod dont on cherche les voisines
  depuis:false,     // seulement les prods arrivees depuis la derniere visite
  prod:null,        // un beatmaker
  dossier:null,     // un dossier de likes (avec crateOnly)
  toplines:false,   // les prods sur lesquelles on a enregistre
  suivis:false,     // les prods des artistes et beatmakers suivis
  qui:null,         // dans les abonnements : « a:hamza » ou « p:Gamma Prod », sinon tous
  neuf:false        // « Jamais écoutées » : un reglage, pas un filtre — il survit aux changements de vue
};
try { S.neuf = localStorage.getItem("findings.neuf") === "1"; } catch (e) {}
let LAST = [];                 // resultats affiches = file d'attente potentielle
const DEAD = new Set();        // videos dont l'integration est refusee par la chaine
let CRATE = new Set();
try{
  const saved = localStorage.getItem("findings.crate") || localStorage.getItem("prodyfind.crate")
             || localStorage.getItem("diggr.crate") || "[]";
  CRATE = new Set(JSON.parse(saved));
}catch(e){}
/* Historique d'ecoute : comme les likes, il vit dans le navigateur du visiteur. Le plus
   recent en tete, sans doublon (reecouter remonte la prod), 200 au plus. */
const HIST_KEY = "findings.historique", HIST_MAX = 200;
let HIST = [];
try { HIST = JSON.parse(localStorage.getItem(HIST_KEY) || "[]").filter(x => x && x.id); } catch (e) {}
let HIST_POS = new Map();
const majHistPos = () => { HIST_POS = new Map(HIST.map((x, i) => [x.id, i])); };
majHistPos();
/* Toutes les prods deja lancees, sans limite utile : l'historique n'en garde que 200,
   « Jamais écoutées » doit se souvenir de tout. 11 caracteres par prod, le catalogue
   entier tient en 70 Ko. */
const VU_KEY = "findings.ecoutees";
let VU = new Set(HIST.map(x => x.id));
try { JSON.parse(localStorage.getItem(VU_KEY) || "[]").forEach(id => VU.add(id)); } catch (e) {}
let versionGout = 0;   // incremente a chaque like ou ecoute : invalide le profil mis en cache
function noterEcoute(id){
  versionGout++;
  HIST = [{ id, t: Date.now() }, ...HIST.filter(x => x.id !== id)].slice(0, HIST_MAX);
  majHistPos();
  try { localStorage.setItem(HIST_KEY, JSON.stringify(HIST)); } catch (e) {}
  VU.delete(id); VU.add(id);
  if (VU.size > 20000) VU = new Set([...VU].slice(-20000));
  try { localStorage.setItem(VU_KEY, JSON.stringify([...VU])); } catch (e) {}
}
/* Dossiers de likes : « Projet été », « À acheter »… Une prod likee peut etre rangee dans
   plusieurs dossiers ; retirer le like la retire de tous. Dans le navigateur, comme les likes. */
const DOS_KEY = "findings.dossiers";
let DOSSIERS = [];
try { DOSSIERS = JSON.parse(localStorage.getItem(DOS_KEY) || "[]").filter(d => d && d.id && d.nom).map(d => ({ id: d.id, nom: d.nom, ids: new Set(d.ids || []) })); } catch (e) {}
const saveDossiers = () => {
  try { localStorage.setItem(DOS_KEY, JSON.stringify(DOSSIERS.map(d => ({ id: d.id, nom: d.nom, ids: [...d.ids] })))); } catch (e) {}
};
const dossier = id => DOSSIERS.find(d => d.id === id);
const saveCrate = () => { versionGout++; try{ localStorage.setItem("findings.crate",JSON.stringify([...CRATE])); }catch(e){} };

/* ============ utilitaires ============ */
const cssVar = s => `var(--s-${s})`;
const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const fmtViews = v =>
  v >= 1e6 ? (v/1e6).toFixed(v>=1e7?0:1).replace(".",",")+" M"
  : v >= 1e3 ? Math.round(v/1e3)+" k" : String(v);
function fmtAge(d){
  if(d<1) return "aujourd'hui";
  if(d<7) return `${Math.round(d)} j`;
  if(d<31) return `${Math.round(d/7)} sem.`;
  // en mois jusqu'a deux ans : « 2 ans » pour une prod de 18 mois serait faux
  if(d<730) return `${Math.round(d/30)} mois`;
  const y=Math.round(d/365); return `${y} an${y>1?"s":""}`;
}
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// les moods en anglais et en espagnol, pour la recherche (« dark », « oscuro »)
const MOODS_AILLEURS = { agressif: "aggressive agresivo", sombre: "dark oscuro", "mélancolique": "melancholic sad melancolico triste", "énergique": "energetic energy energico", chill: "chill relax", solaire: "sunny summer soleado verano", sensuel: "sensual sexy", planant: "spacey dreamy etereo", nostalgique: "nostalgic nostalgico", "cinématique": "cinematic epic cinematico epico", festif: "festive party festivo fiesta" };
function haystack(b){
  // les noms du registre en plus des references : l'etiquette est plus sure que le titre
  const noms = (b.artists || []).map(id => (CAT.artists || []).find(a => a.id === id)?.name || "").join(" ");
  return norm([b.title,b.prod,STYLE_NAME[b.style],b.key,b.moods.join(" "),b.moods.map(m => MOODS_AILLEURS[m] || "").join(" "),b.refs.join(" "),noms,b.fr?"francais fr france":""].join(" "));
}
/* ============ artistes ============
   Le registre vient du catalogue (ingest.mjs le tient). On ne montre que les artistes
   qui ont au moins une prod : un nom sans rien derriere serait une promesse vide. */
const ARTIST_META = Array.isArray(CAT.artists) ? CAT.artists : [];
const ARTIST_NAME = Object.fromEntries(ARTIST_META.map(a => [a.id, a.name]));
const ARTIST_STYLE = Object.fromEntries(ARTIST_META.map(a => [a.id, a.style]));
const ARTIST_N = {};
BEATS.forEach(b => b.artists.forEach(id => { if (ARTIST_NAME[id]) ARTIST_N[id] = (ARTIST_N[id] || 0) + 1; }));
const LIVE_ARTISTS = ARTIST_META.filter(a => ARTIST_N[a.id]).sort((a, b) => ARTIST_N[b.id] - ARTIST_N[a.id]);

BEATS.forEach(b => b._h = haystack(b));

/* ============ « Pour toi » ============
   Un profil de gouts tire de ce que le visiteur a like (poids 3) et ecoute (poids 1,
   qui s'estompe avec l'anciennete), puis un classement des prods qu'il n'a pas encore
   entendues. Tout se calcule ici, dans le navigateur : rien ne part vers un serveur, et
   c'est aussi pourquoi le profil ne suit pas d'un appareil a l'autre. */
const BY_ID = new Map(BEATS.map(b => [b.id, b]));

/* ============ nouveau depuis ta derniere visite ============
   Le catalogue ne date ses ajouts qu'au jour pres : on retient plutot les prods que le
   visiteur a deja eues sous les yeux. Est nouvelle toute prod absente de cette liste —
   exact, quelle que soit l'heure du passage ou celle de l'ajout du matin. La liste des
   nouveautes est figee pour toute la session : recharger ne la vide pas. Premiere visite :
   rien n'est « nouveau », tout l'est. */
const CONNUES_KEY = "findings.connues", VISITE_KEY = "findings.visite", SESSION_KEY = "findings.nouveautes";
let NOUVEAUX = new Set(), VISITE_PREC = 0;
(function suivreVisites(){
  let connues = null, sess = null;
  try { const r = localStorage.getItem(CONNUES_KEY); if (r) connues = new Set(r.split(",")); } catch (e) {}
  try { sess = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (e) {}
  if (sess) { NOUVEAUX = new Set(sess.ids); VISITE_PREC = sess.prec || 0; }
  else {
    try { VISITE_PREC = +localStorage.getItem(VISITE_KEY) || 0; localStorage.setItem(VISITE_KEY, String(Date.now())); } catch (e) {}
  }
  // le catalogue a pu changer en cours de session (ajout du matin) : ce qui arrive s'ajoute
  if (connues) BEATS.forEach(b => { if (!connues.has(b.id)) NOUVEAUX.add(b.id); });
  NOUVEAUX = new Set([...NOUVEAUX].filter(id => BY_ID.has(id)));
  try {
    localStorage.setItem(CONNUES_KEY, BEATS.map(b => b.id).join(","));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ids: [...NOUVEAUX], prec: VISITE_PREC }));
  } catch (e) {}
})();
/* ============ abonnements ============
   On suit un artiste vise (« Hamza type beat ») ou un beatmaker. Comme les likes, la
   liste vit dans le navigateur du visiteur. */
const SUIVIS_KEY = "findings.suivis";
const SUIVIS = { artists: new Set(), prods: new Set() };
try {
  const r = JSON.parse(localStorage.getItem(SUIVIS_KEY) || "{}");
  (r.artists || []).forEach(a => SUIVIS.artists.add(a));
  (r.prods || []).forEach(p => SUIVIS.prods.add(p));
} catch (e) {}
const saveSuivis = () => {
  try { localStorage.setItem(SUIVIS_KEY, JSON.stringify({ artists: [...SUIVIS.artists], prods: [...SUIVIS.prods] })); } catch (e) {}
  try { npEtat(); } catch (e) {}   // le bouton Suivre du panneau « En lecture »
};
const estSuivie = b => SUIVIS.prods.has(b.prod) || b.artists.some(a => SUIVIS.artists.has(a));
const nbSuivis = () => SUIVIS.artists.size + SUIVIS.prods.size;
/* Une seule etiquette « nouveau », qui veut dire « nouveau pour toi » : arrivee depuis ta
   derniere visite. Pour un premier passage, faute de point de comparaison, elle garde son
   ancien sens : ajoutee au catalogue ces trois derniers jours. */
const estNouvelle = b => VISITE_PREC ? NOUVEAUX.has(b.id) : b.isNew;
/* Profils des chaines (photo, nom, abonnes, banniere), recoltes par ingest.mjs. */
const CHANS = CAT.chans || {};
const ARTIST_INFO = CAT.artistInfo || {};   // photo et fans Deezer des artistes
const photoArtiste = id => (ARTIST_INFO[id] && ARTIST_INFO[id].img) || "";
const CHAN_DE = new Map();   // beatmaker -> url de sa chaine (celle de sa prod la plus recente)
BEATS.forEach(b => { if (b.chan && !CHAN_DE.has(b.prod)) CHAN_DE.set(b.prod, b.chan); });
const profilDe = prod => CHANS[CHAN_DE.get(prod)] || null;
const avatarDe = prod => { const c = profilDe(prod); return c && c.a ? c.a : ""; };
const ilYa = t => {
  const h = (Date.now() - t) / 36e5;
  if (h < 1) return "il y a moins d'une heure";
  if (h < 24) return `il y a ${Math.round(h)} h`;
  const j = Math.round(h / 24);
  return j === 1 ? "hier" : j < 30 ? `il y a ${j} jours` : j < 60 ? "il y a un mois" : `il y a ${Math.round(j / 30)} mois`;
};
let profilCache = null, profilVersion = -1;
/* ============ prods similaires ============
   « Montre-m'en d'autres comme celle-la » : meme style, artistes vises en commun, tempo
   voisin (le double ou la moitie comptent, 70 et 140 se jouent pareil), tonalite egale ou
   relative, moods partages. Une tonalite devinee pese moins qu'une tonalite annoncee. */
const NOTE = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const HAUTEURS = new Map();
function hauteur(k){
  if (!HAUTEURS.has(k)) HAUTEURS.set(k, lireHauteur(k));
  return HAUTEURS.get(k);
}
function lireHauteur(k){
  const m = /^([A-G])([#b]*)(m?)$/.exec(k || "");
  if (!m) return null;
  let pc = NOTE[m[1]];
  for (const a of m[2]) pc += a === "#" ? 1 : -1;
  // une tonalite mineure est rapportee a sa relative majeure : Am et C sonnent ensemble
  return { pc: ((pc % 12) + 12) % 12, mineur: !!m[3], rel: (((pc + (m[3] ? 3 : 0)) % 12) + 12) % 12 };
}
function scoreProche(a, b){
  let s = 0;
  if (a.style === b.style) s += 3;
  const art = b.artists.filter(x => a.artists.includes(x)).length;
  s += 2.6 * Math.min(art, 2);
  const d = Math.min(Math.abs(a.bpm - b.bpm), Math.abs(a.bpm * 2 - b.bpm), Math.abs(a.bpm - b.bpm * 2));
  s += 2.2 * Math.max(0, 1 - d / 14);
  const ka = hauteur(a.key), kb = hauteur(b.key);
  if (ka && kb) {
    const sur = a.keySur && b.keySur ? 1 : 0.4;
    if (ka.pc === kb.pc && ka.mineur === kb.mineur) s += 1.6 * sur;
    else if (ka.rel === kb.rel) s += 1.1 * sur;                      // relative
    else if ((ka.rel - kb.rel + 12) % 12 === 7 || (kb.rel - ka.rel + 12) % 12 === 7) s += 0.5 * sur;   // quinte
  }
  s += 0.8 * Math.min(2, b.moods.filter(m => a.moods.includes(m)).length);
  if (a.prod === b.prod) s += 0.7;
  s += 0.15 * Math.log10(Math.max(b.views, 10)) + Math.max(0, 0.4 - b.days / 600);
  return s;
}
/* La prod de depart en tete, puis 60 voisines au plus, 3 par beatmaker au plus :
   sinon un beatmaker prolifique dans le meme style remplit toute la page. */
function classerProches(cands){
  const ref = BY_ID.get(S.proche);
  if (!ref) return cands;
  const notes = cands.filter(b => b.id !== ref.id).map(b => [scoreProche(ref, b), b]).sort((x, y) => y[0] - x[0]);
  const parProd = new Map(), out = [ref];
  for (const [, b] of notes) {
    const n = parProd.get(b.prod) || 0;
    if (n >= 3) continue;
    parProd.set(b.prod, n + 1);
    out.push(b);
    if (out.length > 60) break;
  }
  return out;
}

function profilGout(){
  if (profilCache && profilVersion === versionGout) return profilCache;
  const P = { style:new Map(), artist:new Map(), mood:new Map(), prod:new Map(), pts:[], poids:0, likes:0, ecoutes:0 };
  const ajoute = (b, w) => {
    P.poids += w;
    P.style.set(b.style, (P.style.get(b.style) || 0) + w);
    b.artists.forEach(a => P.artist.set(a, (P.artist.get(a) || 0) + w));
    const ms = b.moods || [];
    ms.forEach(m => P.mood.set(m, (P.mood.get(m) || 0) + w / ms.length));
    P.prod.set(b.prod, (P.prod.get(b.prod) || 0) + w);
    // un tempo estime d'apres le style n'apprend presque rien sur les gouts
    P.pts.push([b.bpm, w * (b.bpmSur ? 1 : 0.4)]);
  };
  CRATE.forEach(id => { const b = BY_ID.get(id); if (b) { ajoute(b, 3); P.likes++; } });
  HIST.forEach((x, r) => { const b = BY_ID.get(x.id); if (b) { ajoute(b, 1 / (1 + r / 60)); P.ecoutes++; } });
  // le plus present vaut 1 ; l'exposant evite qu'un seul favori ecrase tout le reste
  // densite de gout par BPM, calculee une fois : le classement la lit ensuite en O(1) par prod
  // au lieu de reparcourir toutes les ecoutes pour chacune des 4 000 candidates
  P.tempo = new Float32Array(260);
  for (const [bpm, w] of P.pts) {
    const c = Math.round(bpm);
    for (let x = Math.max(0, c - 36); x <= Math.min(259, c + 36); x++) { const d = (x - bpm) / 12; P.tempo[x] += w * Math.exp(-d * d); }
  }
  if (P.poids) for (let x = 0; x < 260; x++) P.tempo[x] /= P.poids;
  [P.style, P.artist, P.mood, P.prod].forEach(m => {
    const mx = Math.max(0, ...m.values());
    if (mx) m.forEach((v, k) => m.set(k, Math.pow(v / mx, 0.7)));
  });
  profilCache = P; profilVersion = versionGout;
  return P;
}
function scoreGout(b, P){
  const sty = P.style.get(b.style) || 0;
  let art = 0; for (const a of b.artists) art = Math.max(art, P.artist.get(a) || 0);
  let mo = 0; const ms = b.moods || [];
  if (ms.length) { for (const m of ms) mo += P.mood.get(m) || 0; mo /= ms.length; }
  const pr = P.prod.get(b.prod) || 0;
  // part du gout qui tombe pres de ce tempo : gere un gout a deux pics (drill 140, boom bap 90)
  const tp = P.tempo[Math.min(259, Math.max(0, Math.round(b.bpm)))] || 0;
  const frais = Math.max(0, 1 - b.days / 274);
  const pop = Math.min(1, Math.log10(Math.max(b.views, 10)) / 6);
  /* Confiance : une seule ecoute ne dit pas grand-chose. Sans cette modulation, un
     premier clic sur du jazz rap remplissait toute la page de jazz rap. Elle atteint 1
     vers trois likes, ou une dizaine d'ecoutes ; avant, le gout pese moins que la fraicheur. */
  const conf = Math.min(1, 0.3 + P.poids / 9);
  // suivre un artiste ou un beatmaker est un signal franc, meme sans ecoute
  return conf * (3*sty + 2.2*art + 1.4*mo + 1.3*pr + 0.8*tp) + 0.5*frais + 0.3*pop + (estSuivie(b) ? 1.2 : 0);
}
/* Classement diversifie : sans correctif, le haut de la liste serait vingt prods du meme
   style ou du meme beatmaker. Chaque prod deja retenue du meme style ou de la meme chaine
   retire des points a la suivante. Seul le haut est trie ainsi ; le reste suit par score. */
function classerPourToi(cands){
  const P = profilGout();
  const sc = new Map(cands.map(b => [b, scoreGout(b, P)]));
  const tri = [...cands].sort((a, b) => sc.get(b) - sc.get(a));
  const tete = tri.slice(0, 300), reste = tri.slice(300), out = [], nS = {}, nP = {};
  while (out.length < 120 && tete.length) {
    let mi = 0, mv = -Infinity;
    for (let i = 0; i < tete.length; i++) {
      const b = tete[i];
      const v = sc.get(b) - 0.3 * Math.min(nS[b.style] || 0, 10) - 0.5 * (nP[b.prod] || 0);
      if (v > mv) { mv = v; mi = i; }
    }
    const [b] = tete.splice(mi, 1);
    out.push(b); nS[b.style] = (nS[b.style] || 0) + 1; nP[b.prod] = (nP[b.prod] || 0) + 1;
  }
  if (!P.poids) return [...out, ...tete, ...reste];
  /* Une prod sur cinq sort du territoire connu. Un profil nourri par dix ecoutes de
     reggaeton ne voyait que du reggaeton : il se refermait sur lui-meme. Les
     decouvertes viennent de styles que le visiteur n'a (presque) pas touches, choisies
     sur le mood et le tempo qu'il aime, au plus une par style pour rester variees. */
  const hors = cands.filter(b => (P.style.get(b.style) || 0) < 0.15);
  const dec = [], vus = new Set();
  hors.map(b => {
    let mo = 0; const ms = b.moods || [];
    if (ms.length) { for (const m of ms) mo += P.mood.get(m) || 0; mo /= ms.length; }
    const tp = P.tempo[Math.min(259, Math.max(0, Math.round(b.bpm)))] || 0;
    return [b, 1.4 * mo + 0.8 * tp + 0.5 * Math.max(0, 1 - b.days / 274) + 0.3 * Math.min(1, Math.log10(Math.max(b.views, 10)) / 6)];
  }).sort((a, b) => b[1] - a[1]).forEach(([b]) => { if (dec.length < 30 && !vus.has(b.style)) { vus.add(b.style); dec.push(b); } });
  const prises = new Set(dec.map(b => b.id)), principal = [...out, ...tete, ...reste].filter(b => !prises.has(b.id));
  const res = []; let i = 0, d = 0;
  while (i < principal.length || d < dec.length) {
    if (res.length % 5 === 4 && d < dec.length) res.push(dec[d++]);
    else if (i < principal.length) res.push(principal[i++]);
    else res.push(dec[d++]);
  }
  return res;
}
/* Ce que le profil a retenu, en clair : sans ca la liste serait une boite noire. */
function resumeGout(){
  const P = profilGout();
  if (!P.poids) return "Écoute ou like quelques prods : cette sélection s'adaptera à tes goûts.";
  const top = (m, n, nom) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => nom(k));
  const noms = [
    ...top(P.style, 2, k => STYLE_NAME[k] || k),
    ...top(P.artist, 1, k => ARTIST_NAME[k] || k),
    ...top(P.mood, 1, k => k)
  ];
  const l = P.likes, e = P.ecoutes;
  const base = [l && `${l} like${l > 1 ? "s" : ""}`, e && `${e} écoute${e > 1 ? "s" : ""}`].filter(Boolean).join(" et ");
  return `D'après ${l && e ? "tes " : ""}${base} : ${[...new Set(noms)].join(", ")}.`;
}


/* ============ adresses ============
   Les pages qui comptent pour Google ont une vraie adresse : /artiste/hamza/, /style/drill/,
   /beatmaker/gamma-prod/, /studio/. Le reste reste en parametres (?mood=sombre…). BASE est
   la racine du site, lue dans <base> : /FINDINGS/ en ligne, / en local ou sur un domaine.
   Les beatmakers n'ont une page que s'ils ont au moins 3 prods (meme regle que build.mjs). */
const BASE = new URL(".", document.baseURI).pathname;
const slugifier = t => norm(String(t)).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
const PROD_SLUG = new Map(), SLUG_PROD = new Map();
(function slugsBeatmakers(){
  const n = {}; BEATS.forEach(b => n[b.prod] = (n[b.prod] || 0) + 1);
  Object.keys(n).filter(p => n[p] >= 3).sort().forEach(p => {
    const s = slugifier(p); let k = s, i = 2;
    while (SLUG_PROD.has(k)) k = `${s}-${i++}`;
    SLUG_PROD.set(k, p); PROD_SLUG.set(p, k);
  });
})();
const lienArtiste = id => `${BASE}artiste/${encodeURIComponent(id)}/`;
const lienStyle = k => `${BASE}style/${encodeURIComponent(k)}/`;
const lienProd = p => PROD_SLUG.has(p) ? `${BASE}beatmaker/${PROD_SLUG.get(p)}/` : `${BASE}?prod=${encodeURIComponent(p)}`;
/* Adresse -> parametres de l'application. */
function lireAdresse(u){
  const url = new URL(u, document.baseURI);
  const p = new URLSearchParams(url.search);
  const rel = url.pathname.startsWith(BASE) ? decodeURIComponent(url.pathname.slice(BASE.length)) : "";
  const m = /^(artiste|style|beatmaker|studio)\/?([^/]*)\/?/.exec(rel);
  if (m) {
    if (m[1] === "artiste" && m[2]) p.set("artist", m[2]);
    if (m[1] === "style" && m[2]) p.set("style", m[2]);
    if (m[1] === "beatmaker" && m[2]) p.set("prod", SLUG_PROD.get(m[2]) || m[2]);
    if (m[1] === "studio") p.set("studio", "1");
  }
  return p;
}
/* Parametres -> adresse : la jolie adresse quand la vue est une page a part entiere. */
function faireAdresse(p){
  const cles = [...p.keys()].filter(k => k !== "vue");
  if (p.get("studio") === "1") return `${BASE}studio/${p.get("beat") ? "?beat=" + encodeURIComponent(p.get("beat")) : ""}`;
  if (cles.length === 1) {
    if (cles[0] === "artist") return lienArtiste(p.get("artist"));
    if (cles[0] === "style") return lienStyle(p.get("style"));
    if (cles[0] === "prod" && PROD_SLUG.has(p.get("prod"))) return lienProd(p.get("prod"));
  }
  const qs = p.toString();
  return BASE + (qs ? "?" + qs : "?vue=prods");
}
/* Titre et description de la page, pour l'onglet et pour Google (qui execute la page). */
function majTitre(){
  const n = typeof LAST !== "undefined" ? LAST.length : 0;
  let t = "FINDINGS : type beats à écouter et studio pour poser ta topline", d = null;
  if (document.body.classList.contains("vue-studio")) t = "Studio en ligne : pose ta topline sur une prod | FINDINGS";
  else if (!document.body.classList.contains("vue-accueil")) {
    const ar = S.artists.size === 1 && !S.styles.size && !S.moods.size && !S.prod ? [...S.artists][0] : null;
    if (S.q.trim()) { t = `« ${S.q.trim()} » : ${n} prods | FINDINGS`; }
    else if (S.prod) { t = `${S.prod} : ${n} type beats à écouter | FINDINGS`; d = `Les ${n} prods de ${S.prod} sur FINDINGS, à écouter direct.`; }
    else if (ar) { t = `${ARTIST_NAME[ar] || ar} type beat : ${n} prods à écouter | FINDINGS`; d = `Les meilleurs type beats ${ARTIST_NAME[ar] || ar} du moment : ${n} prods récentes à écouter direct, par ${new Set(LAST.map(b => b.prod)).size} beatmakers.`; }
    else if (S.styles.size === 1 && !S.moods.size && !S.artists.size) { const st = STYLE_NAME[[...S.styles][0]]; t = `${st} type beat : ${n} prods à écouter | FINDINGS`; d = `${n} type beats ${st} récents à écouter direct sur FINDINGS.`; }
    else t = `${document.getElementById("resTitle")?.textContent || "Les prods"} | FINDINGS`;
  }
  document.title = t;
  if (d) document.querySelector('meta[name="description"]')?.setAttribute("content", d);
}
/* Statistiques : une page vue par changement d'adresse, et quelques gestes qui comptent. */
function mesurer(evenement){
  const gc = window.goatcounter; if (!window.FINDINGS_STATS || !gc || !gc.count) return;
  try {
    if (evenement) gc.count({ path: "evenement/" + evenement, title: evenement, event: true });
    else gc.count({ path: location.pathname.slice(BASE.length - 1) + location.search, title: document.title });
  } catch (e) {}
}
window.addEventListener("load", () => setTimeout(() => mesurer(), 500));

/* ============ filtrage ============ */
function filtered(){
  const q = norm(S.q.trim());
  const terms = q ? q.split(/\s+/) : [];
  let out = BEATS.filter(b => {
    if(S.crateOnly && !CRATE.has(b.id)) return false;
    if(S.toplines && !TOPLINE_N.has(b.id)) return false;
    if(S.crateOnly && S.dossier && !dossier(S.dossier)?.ids.has(b.id)) return false;
    if(S.historyOnly && !HIST_POS.has(b.id)) return false;
    // « Pour toi » ne propose que du neuf : ce qu'on a deja ecoute ou mis de cote est exclu
    if(S.forYou && (HIST_POS.has(b.id) || CRATE.has(b.id))) return false;
    if(S.depuis && !NOUVEAUX.has(b.id)) return false;
    if(S.prod && b.prod !== S.prod) return false;
    if(S.suivis && !estSuivie(b)) return false;
    if(S.suivis && S.qui && !(S.qui[0] === "a" ? b.artists.includes(S.qui.slice(2)) : b.prod === S.qui.slice(2))) return false;
    // sans effet dans l'historique, qui n'est fait que de prods deja ecoutees
    if(S.neuf && !S.historyOnly && !S.crateOnly && VU.has(b.id)) return false;
    if(S.artists.size && !b.artists.some(a => S.artists.has(a))) return false;
    if(S.styles.size && !S.styles.has(b.style)) return false;
    if(S.bpmSur && !S.suivis && !b.bpmSur) return false;
    if(!S.suivis && (b.bpm < S.bpm[0] || b.bpm > S.bpm[1])) return false;
    if(S.moods.size && !b.moods.some(m => S.moods.has(m))) return false;
    if(terms.length && !terms.every(t => b._h.includes(t))) return false;
    return true;
  });
  const score = b => {
    let s = Math.log10(Math.max(b.views,10));
    if(terms.length){
      if(terms.every(t => norm(b.title).includes(t))) s += 6;
      if(terms.every(t => b.refs.some(r => norm(r).includes(t)))) s += 5;
      if(terms.every(t => norm(b.prod).includes(t))) s += 4;
    }
    s += Math.max(0, 2.5 - b.days/120);
    return s;
  };
  const by = {
    pertinence:(a,b) => score(b)-score(a),
    recent:(a,b) => a.days-b.days,
    bpm:(a,b) => a.bpm-b.bpm
  }[S.sort];
  // l'historique se lit dans l'ordre d'ecoute, le plus recent en tete, quel que soit le tri
  if (S.historyOnly) return out.sort((a, b) => HIST_POS.get(a.id) - HIST_POS.get(b.id));
  if (S.forYou) return classerPourToi(out);
  if (S.proche) return classerProches(out);
  if (S.depuis && S.sort === "pertinence") return classerPourToi(out);
  // abonnements : comme un fil, le plus recent en tete, ce qu'on n'a pas encore ecoute d'abord
  if (S.suivis && S.sort === "pertinence") return out.sort((a, b) => (VU.has(a.id) - VU.has(b.id)) || a.days - b.days);   // les nouveautes qui te ressemblent d'abord
  /* Le score est calcule une fois par prod, pas a chaque comparaison : trier 5 500 prods
     appelle le comparateur ~70 000 fois, soit 140 000 calculs de score (14 ms) au lieu de 5 500. */
  if (S.sort === "pertinence") return out.map(b => [score(b), b]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
  return out.sort(by);
}

/* ============ rendu : filtres ============ */
const elStyles = document.getElementById("styles");
const STYLE_N = Object.fromEntries(STYLES.map(([k]) => [k, BEATS.filter(b => b.style===k).length]));
/* un style sans prod n'a rien à faire dans les filtres ; les autres sont triés
   par volume */
const LIVE_STYLES = STYLES.filter(([k]) => STYLE_N[k] > 0).sort((a,b) => STYLE_N[b[0]] - STYLE_N[a[0]]);
/* Portee des menus : dans les likes, les menus ne proposent que ce qui s'y trouve, avec les
   comptes des likes (et du dossier ouvert). Ailleurs, le catalogue entier. */
let PORTEE = null, porteeCle = "";
function calculerPortee(){
  const cle = S.crateOnly ? `${[...CRATE].join(",")}|${S.dossier || ""}|${S.dossier && dossier(S.dossier) ? dossier(S.dossier).ids.size : ""}` : "";
  if (cle === porteeCle) return false;
  porteeCle = cle;
  if (!S.crateOnly) { PORTEE = null; return true; }
  const d = S.dossier && dossier(S.dossier);
  const base = BEATS.filter(b => CRATE.has(b.id) && (!d || d.ids.has(b.id)));
  PORTEE = { style: {}, artist: {}, mood: {} };
  base.forEach(b => {
    PORTEE.style[b.style] = (PORTEE.style[b.style] || 0) + 1;
    b.artists.forEach(a => PORTEE.artist[a] = (PORTEE.artist[a] || 0) + 1);
    b.moods.forEach(m => PORTEE.mood[m] = (PORTEE.mood[m] || 0) + 1);
  });
  return true;
}
const nStyle = k => PORTEE ? (PORTEE.style[k] || 0) : STYLE_N[k];
const nArtiste = id => PORTEE ? (PORTEE.artist[id] || 0) : ARTIST_N[id];
const nMood = m => PORTEE ? (PORTEE.mood[m] || 0) : MOOD_N[m];
// garde ce qui a des prods dans la portee, et ce qui est choisi (pour pouvoir le retirer)
const dansPortee = (n, choisi) => n > 0 || choisi;
const parPortee = (liste, n) => PORTEE ? [...liste].sort((a, b) => n(b) - n(a)) : liste;
/* Appele a chaque rendu : ne repeint les menus que si la portee a change. */
function majPortee(){
  if (!calculerPortee()) return;
  renderStyleChips(); renderMoodChips();
  if (typeof renderArtistChips === "function" && LIVE_ARTISTS.length) renderArtistChips();
}

function chipHTML([k,label]){
  return `<button class="chip" role="button" data-style="${k}" aria-pressed="${S.styles.has(k)}" style="--c:${cssVar(k)}">
    <span class="dot"></span>${esc(label)}<span class="n">${nStyle(k)}</span></button>`;
}
function renderStyleChips(){
  // 51 styles : on cherche plutot qu'on ne defile. Le nom et la cle comptent, pour que
  // « rnb » trouve « R&B » et « coupe » trouve « Ndombolo / Coupé-décalé ».
  const champ = document.getElementById("styleQ");
  const q = champ ? norm(champ.value.trim()) : "";
  const liste = parPortee(LIVE_STYLES, ([k]) => nStyle(k))
    .filter(([k, label]) => dansPortee(nStyle(k), S.styles.has(k)) && (!q || norm(label + " " + k).includes(q)));
  elStyles.innerHTML = liste.map(chipHTML).join("");
  const vide = document.getElementById("styleVide");
  if (vide) vide.hidden = !!liste.length;
}
renderStyleChips();

const elMoods = document.getElementById("moods");
const MOOD_N = Object.fromEntries(MOODS.map(m => [m, BEATS.filter(b => b.moods.includes(m)).length]));
function renderMoodChips(){
  elMoods.innerHTML = MOODS.filter(m => dansPortee(nMood(m), S.moods.has(m))).map(m =>
    `<button class="chip" data-mood="${esc(m)}" aria-pressed="${S.moods.has(m)}" style="--c:${MOOD_TEINTE[m] || "var(--ink)"}"><span class="dot"></span>${esc(m)}<span class="n">${nMood(m)}</span></button>`
  ).join("");
}
renderMoodChips();

/* Les suggestions de recherche sortent des références réellement citées par les
   prods en catalogue : elles changent quand le catalogue change. */
(function hotSearches(){
  const tally = {};
  BEATS.forEach(b => (b.refs || []).forEach(r => {
    const k = r.trim(); if (k.length < 3) return;
    tally[k] = (tally[k] || 0) + 1;
  }));
  const top = Object.entries(tally).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))
    .filter(([,n]) => n > 1).slice(0, 6).map(([r]) => r);
  const refs = top.length >= 4 ? top : ["Werenoi","Clams Casino","Morad","MF DOOM","Joey Bada$$","Rema"];
  document.getElementById("hot").innerHTML =
    refs.map(r => `<button data-hot="${esc(r)}">${esc(r)} type beat</button>`).join("");
})();

/* histogramme BPM */
/* la plage couvre tout ce que le catalogue contient réellement — une prod à
   57 ou à 199 BPM doit rester atteignable */
const BUCKETS = 24, BMIN = 55, BMAX = 200, BW = (BMAX-BMIN)/BUCKETS;
const counts = new Array(BUCKETS).fill(0);
BEATS.forEach(b => { const i = Math.min(BUCKETS-1, Math.floor((b.bpm-BMIN)/BW)); counts[i]++; });
const cmax = Math.max(...counts);
document.getElementById("hist").innerHTML =
  counts.map((c,i) => `<i data-i="${i}" style="height:${Math.max(6,(c/cmax)*100)}%"></i>`).join("");

/* ============ rendu : liste ============ */
const list = document.getElementById("list");
const PAQUET = 60;
let lignesAffichees = 0;
function ajouterLignes(){
  const suite = LAST.slice(lignesAffichees, lignesAffichees + PAQUET);
  list.querySelector(".suite")?.remove();
  if (!suite.length) return;
  list.insertAdjacentHTML("beforeend", suite.map(rowHTML).join(""));
  lignesAffichees += suite.length;
  if (lignesAffichees < LAST.length) {
    list.insertAdjacentHTML("beforeend", '<li class="suite" aria-hidden="true"></li>');
    obsSuite.observe(list.lastElementChild);
  }
}
// on charge bien avant d'atteindre le bas : le paquet suivant est pret quand on y arrive
const obsSuite = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) ajouterLignes(); }, { rootMargin: "1500px 0px" });

/* Lecture, pause, prod bloquee : seules les lignes concernees changent. Reconstruire la
   liste ici la ramenait au premier paquet et faisait sauter la page sous le doigt. */
function repeindreLecture(){
  const ids = new Set([S.playing, ...[...list.querySelectorAll(".row.playing, .row.dead")].map(r => r.dataset.id)]);
  DEAD.forEach(id => ids.add(id));
  ids.forEach(id => {
    if (!id) return;
    const r = list.querySelector(`.row[data-id="${CSS.escape(id)}"]`);
    const b = r && BEATS.find(x => x.id === id);
    if (b) r.outerHTML = rowHTML(b);
  });
  peindreNP();
}


/* ============ panneau « En lecture » ============
   Sur la page des prods, en grand ecran : la prod en cours, son beatmaker, la suivante
   et quatre prods dans le meme esprit, comme la vue de droite de Spotify. On le ferme
   d'un clic, le bouton du lecteur le rouvre, et le choix est retenu. */
const elNP = document.getElementById("np"), npBtn = document.getElementById("npBtn");
let npVoulu = true;
try { npVoulu = localStorage.getItem("findings.np") !== "0"; } catch (e) {}
let npPeint = null, npSims = [];
const NP_LIRE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
const NP_PAUSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
const NP_COEUR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20.4 4.3 12.7a4.6 4.6 0 0 1 6.4-6.6l1.3 1.3 1.3-1.3a4.6 4.6 0 0 1 6.4 6.6z"/></svg>';
const icone = id => document.getElementById(id)?.innerHTML.trim() || "";
/* Une prod par beatmaker : sinon le plus prolifique du style remplit les quatre cases. */
function similairesDe(b, n){
  const notes = [];
  for (const x of BEATS) if (x.id !== b.id && !DEAD.has(x.id)) notes.push([scoreProche(b, x), x]);
  notes.sort((p, q) => q[0] - p[0]);
  const vus = new Set(), out = [];
  for (const [, x] of notes) { if (vus.has(x.prod)) continue; vus.add(x.prod); out.push(x); if (out.length >= n) break; }
  return out;
}
const npSuivante = () => (QUEUE.length > 1 && !SHUFFLE) ? BY_ID.get(QUEUE[(QI + 1) % QUEUE.length]) : null;
function npHTML(b){
  const c = profilDe(b.prod) || {};
  const nom = c.n || b.prod;
  const nb = BEATS.filter(x => x.prod === b.prod).length;
  const suiv = npSuivante();
  npSims = similairesDe(b, 4);
  const ctx = (document.getElementById("resTitle")?.textContent || "").trim();
  const vg = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  return `<div class="np-fond" style="background-image:url('https://i.ytimg.com/vi/${b.id}/hqdefault.jpg')"></div>
    <div class="np-tete">
      <p class="np-de">En lecture${ctx ? ` <span>· ${esc(ctx)}</span>` : ""}</p>
      <button class="np-x" data-np="fermer" aria-label="Fermer le panneau" title="Fermer le panneau"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>
    <button class="np-cover" data-np="lire" aria-label="Lecture / pause">
        <img src="https://i.ytimg.com/vi/${b.id}/maxresdefault.jpg" alt="" onload="if(this.naturalWidth<=120){this.onload=null;this.src=this.src.replace('maxresdefault','hqdefault')}">
        <span class="np-go">${S.paused ? NP_LIRE : NP_PAUSE}</span>
      </button>
      <div class="np-une-in">
        <p class="np-raison">Type beat ${esc(b.artists.length ? b.artists.slice(0, 2).map(id => ARTIST_NAME[id] || id).join(" x ") : STYLE_NAME[b.style])}</p>
        <h3 class="np-t" translate="no" title="${esc(b.title)}">${esc(b.title)}</h3>
        <p class="np-s"><span class="pill">${esc(STYLE_NAME[b.style])}</span><span>par <a href="${lienProd(b.prod)}" data-vue="prods">${esc(b.prod)}</a></span><span${b.bpmSur ? "" : ' title="Tempo estimé"'}>${b.bpmSur ? "" : "~"}${b.bpm} BPM</span>${b.key ? `<span${b.keySur ? "" : ' title="Tonalité estimée"'}>${b.keySur ? "" : "~"}${esc(b.key)}</span>` : ""}</p>
        <div class="np-temps"><span class="np-cur">0:00</span><div class="np-prog" data-np="prog" role="slider" aria-label="Position dans la prod" tabindex="0"><span><i></i></span></div><span class="np-dur">${fmtDur(b.dur)}</span></div>
        <div class="np-ctrl">
          <button class="np-c" data-np="shuffle" aria-label="Lecture aléatoire" title="Aléatoire">${icone("shuffle")}</button>
          <button class="np-c" data-np="prev" aria-label="Prod précédente" title="Précédent (P)">${icone("prev")}</button>
          <button class="np-play" data-np="lire" aria-label="Lecture ou pause" title="Lecture / pause (Espace)">${S.paused ? NP_LIRE : NP_PAUSE}</button>
          <button class="np-c" data-np="next" aria-label="Prod suivante" title="Suivant (N)">${icone("next")}</button>
          <button class="np-c" data-np="rapide" aria-label="Écoute rapide : saute l'intro" title="Écoute rapide : saute l'intro (R)">${icone("rapide")}</button>
        </div>
        <div class="np-outils">
          <button class="np-like" data-np="like">${NP_COEUR}</button>
          <button class="np-c" data-np="mic" aria-label="Studio : poser une topline" title="Studio : pose ta topline">${icone("micBtn")}</button>
          <span class="vol np-vol" data-niv="2"><button class="vol-ico" data-np="muet" aria-label="Couper le son" title="Couper / remettre le son">${icone("volIco")}</button><input type="range" min="0" max="100" value="${VOL}" aria-label="Volume" data-np="vol"></span>
          <button class="np-c" data-np="yt" aria-label="Ouvrir sur YouTube" title="Ouvrir sur YouTube"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>
        </div>
      </div>
    ${b.moods.length ? `<div class="np-tags">${b.moods.map(m => `<span class="np-tag">${esc(m)}</span>`).join("")}</div>` : ""}
    <p class="np-stats">${b.views ? `${fmtViews(b.views)} vues · ` : ""}${fmtDur(b.dur)} · il y a ${esc(fmtAge(b.days))}</p>
    ${suiv ? `<div class="np-bloc">
      <div class="np-h"><h4>À suivre</h4><button data-np="file">${QI + 1}/${QUEUE.length}</button></div>
      <button class="np-suiv" data-np="suivant"><img src="${vg(suiv.id)}" alt="" loading="lazy"><span style="min-width:0"><b translate="no">${esc(suiv.title)}</b><span>${esc(suiv.prod)} · ${esc(STYLE_NAME[suiv.style])}</span></span></button>
    </div>` : ""}
    <div class="np-bloc">
      <div class="np-h"><h4>Le beatmaker</h4></div>
      <div class="np-carte">
        <div class="np-ban">${c.b ? `<img src="${esc(c.b)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</div>
        <div class="np-carte-in">
          <div class="np-av">${c.a ? `<img src="${esc(c.a)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc((nom.replace(/^prod\.?\s*/i, "")[0] || "?").toUpperCase())}</div>
          <p class="np-nom">${esc(nom)}</p>
          <p class="np-nb">${c.s ? `${esc(c.s)} abonnés · ` : ""}${nb} prod${nb > 1 ? "s" : ""} sur FINDINGS</p>
          <div class="np-acts">
            <button class="np-suivre" data-np="suivre" aria-pressed="false">Suivre</button>
            <a class="np-lien" href="${lienProd(b.prod)}" data-vue="prods">Ses prods</a>
            <button class="np-yt" data-np="chan" aria-label="Chaîne YouTube de ${esc(nom)}" title="Chaîne YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>
          </div>
        </div>
      </div>
    </div>
    ${b.artists.length ? `<div class="np-bloc">
      <div class="np-h"><h4>Type beat ${b.artists.length > 1 ? "des artistes" : "de"}</h4></div>
      <div class="np-arts">${b.artists.map(id => { const img = photoArtiste(id).replace("1000x1000", "250x250"), n = ARTIST_NAME[id] || id;
        return `<a class="np-art" href="${lienArtiste(id)}" data-vue="prods" style="--c:var(--s-${ARTIST_STYLE[id]})"><span class="rd">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(n[0].toUpperCase())}</span><span style="min-width:0"><b>${esc(n)}</b><span>Artiste · ${ARTIST_N[id] || 0} type beats</span></span></a>`; }).join("")}</div>
    </div>` : ""}
    ${npSims.length ? `<div class="np-bloc">
      <div class="np-h"><h4>Dans le même esprit</h4><button data-np="proches">Tout voir</button></div>
      <div class="np-sims">${npSims.map((x, i) => `<button class="np-sim" data-np="sim" data-i="${i}" title="${esc(x.title)} · ${esc(x.prod)}"><span class="vg"><img src="${vg(x.id)}" alt="" loading="lazy"><i>${NP_LIRE}</i></span><b translate="no">${esc(x.title)}</b><span>${esc(x.prod)}</span></button>`).join("")}</div>
    </div>` : ""}`;
}
/* Ce qui bouge sans changer de prod : lecture/pause, like, abonnement. */
function npEtat(){
  if (!current || !elNP.firstChild) return;
  const go = elNP.querySelector(".np-go");
  if (go) go.innerHTML = S.paused ? NP_LIRE : NP_PAUSE;
  const play = elNP.querySelector(".np-play");
  if (play) play.innerHTML = S.paused ? NP_LIRE : NP_PAUSE;
  elNP.querySelector('[data-np="shuffle"]')?.classList.toggle("on", SHUFFLE);
  elNP.querySelector('[data-np="rapide"]')?.classList.toggle("on", RAPIDE);
  const vb = elNP.querySelector(".np-vol");
  if (vb) { vb.dataset.niv = VOL <= 0 ? "0" : VOL < 50 ? "1" : "2"; const r = vb.querySelector("input"); if (+r.value !== VOL) r.value = VOL; }
  const like = elNP.querySelector('[data-np="like"]');
  if (like) peindreLike(like, CRATE.has(current.id), false);
  const sv = elNP.querySelector('[data-np="suivre"]');
  if (sv) { const on = SUIVIS.prods.has(current.prod); sv.setAttribute("aria-pressed", String(on)); sv.textContent = on ? "Abonné" : "Suivre"; }
}
function peindreNP(){
  npBtn.hidden = !current;
  npBtn.setAttribute("aria-pressed", String(npVoulu));
  const actif = npVoulu && !!current;
  document.body.classList.toggle("np-on", actif);
  if (!actif) { npPeint = null; rafaleVideo(0); return; }
  const cle = current.id + "|" + QI + "|" + QUEUE.length + "|" + SHUFFLE;
  if (npPeint !== cle) {
    const autre = !npPeint || !npPeint.startsWith(current.id + "|");
    npPeint = cle;
    elNP.style.setProperty("--c", cssVar(current.style));
    elNP.innerHTML = npHTML(current);
    if (autre) elNP.scrollTop = 0;
  }
  npEtat();
  rafaleVideo();
}
function poserNP(v){
  npVoulu = v;
  try { localStorage.setItem("findings.np", v ? "1" : "0"); } catch (e) {}
  peindreNP();
}
npBtn.addEventListener("click", () => poserNP(!npVoulu));
elNP.addEventListener("input", e => { if (e.target.dataset.np === "vol") { poserVol(+e.target.value, true); npEtat(); } });
/* Progression du panneau : le minuteur du lecteur la nourrit (npTemps). Un clic ou un
   glisse cherche dans la prod, comme la barre du bas. */
let npGlisse = false;
function npTemps(t, d){
  const pr = elNP.querySelector(".np-prog");
  if (!pr || npGlisse) return;
  pr.querySelector("i").style.width = (d ? Math.min(100, t / d * 100) : 0) + "%";
  elNP.querySelector(".np-cur").textContent = fmtDur(Math.floor(t));
  if (d) elNP.querySelector(".np-dur").textContent = fmtDur(Math.floor(d));
}
elNP.addEventListener("pointerdown", e => {
  const pr = e.target.closest(".np-prog");
  if (!pr || !player || !player.getDuration) return;
  const piste = pr.querySelector("span");
  const pct = ev => { const r = piste.getBoundingClientRect(); return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
  const montrer = p => { piste.querySelector("i").style.width = p * 100 + "%"; elNP.querySelector(".np-cur").textContent = fmtDur(Math.floor(p * (player.getDuration() || 0))); };
  npGlisse = true; pr.classList.add("glisse"); pr.setPointerCapture(e.pointerId); montrer(pct(e));
  const bouge = ev => montrer(pct(ev));
  const fin = ev => {
    pr.removeEventListener("pointermove", bouge); pr.removeEventListener("pointerup", fin); pr.removeEventListener("pointercancel", fin);
    npGlisse = false; pr.classList.remove("glisse");
    chercher(pct(ev) * (player.getDuration() || 0));
  };
  pr.addEventListener("pointermove", bouge); pr.addEventListener("pointerup", fin); pr.addEventListener("pointercancel", fin);
});

/* La video elle-meme a droite, a la place de la pochette. Une iframe YouTube deplacee
   dans la page se recharge et repart de zero : elle reste donc dans le lecteur et vient
   se poser, en position absolue, exactement sur la pochette du panneau. Elle suit le
   defilement de la page et celui du panneau, et se rogne quand la pochette en sort. */
const vidWrap = document.getElementById("vidWrap"), vidPlace = document.getElementById("vidPlace");
let npCadre = 0, npRafale = 0, npVignette = "";
function placerVideo(){
  const cover = elNP.querySelector(".np-cover");
  const ok = !!(cover && current && document.body.classList.contains("np-on") && elNP.getClientRects().length);
  document.body.classList.toggle("np-video", ok);
  document.body.classList.toggle("np-plain", ok && PLAIN);   // integration simple : YouTube garde ses propres commandes
  vidWrap.classList.toggle("dans-np", ok);
  if (!ok) { if (vidWrap.style.left) vidWrap.removeAttribute("style"); return; }
  const v = `url("https://i.ytimg.com/vi/${current.id}/mqdefault.jpg")`;
  if (npVignette !== v) { npVignette = v; vidPlace.style.backgroundImage = v; }
  const b = bar.getBoundingClientRect(), c = cover.getBoundingClientRect(), p = elNP.getBoundingClientRect();
  const haut = Math.max(0, p.top + 1 - c.top), bas = Math.max(0, c.bottom - (p.bottom - 1));
  vidWrap.style.left = (c.left - b.left - bar.clientLeft) + "px";
  vidWrap.style.top = (c.top - b.top - bar.clientTop) + "px";
  vidWrap.style.width = c.width + "px";
  vidWrap.style.height = c.height + "px";
  vidWrap.style.clipPath = haut || bas ? `inset(${haut}px 0 ${bas}px 0)` : "";
  vidWrap.style.visibility = haut + bas >= c.height - 1 ? "hidden" : "";
}
/* Une image tout de suite, puis quelques-unes le temps des animations (montee du
   lecteur, entree du panneau). */
function rafaleVideo(ms = 650){
  npRafale = Math.max(npRafale, performance.now() + ms);
  if (!npCadre) npCadre = requestAnimationFrame(function boucle(){
    placerVideo();
    npCadre = performance.now() < npRafale ? requestAnimationFrame(boucle) : 0;
  });
}
addEventListener("scroll", () => rafaleVideo(0), { passive: true });
addEventListener("resize", () => rafaleVideo(0));
elNP.addEventListener("scroll", () => rafaleVideo(0), { passive: true });
if (window.ResizeObserver) new ResizeObserver(() => rafaleVideo(0)).observe(elNP);
new MutationObserver(() => rafaleVideo()).observe(document.body, { attributes: true, attributeFilter: ["class"] });
vidWrap.querySelector(".shield").addEventListener("click", () => { if (vidWrap.classList.contains("dans-np")) togglePlay(); });
elNP.addEventListener("click", e => {
  const el = e.target.closest("[data-np]");
  if (!el || !current) return;
  const a = el.dataset.np;
  if (a === "fermer") poserNP(false);
  else if (a === "lire") togglePlay();
  else if (a === "prev") prev();
  else if (a === "shuffle" || a === "rapide") { document.getElementById(a).click(); npEtat(); }
  else if (a === "mic") document.getElementById("micBtn").click();
  else if (a === "muet") { document.getElementById("volIco").click(); npEtat(); }
  else if (a === "yt") window.open(`https://www.youtube.com/watch?v=${current.id}`, "_blank", "noopener");
  else if (a === "like") basculerLike(current, el);
  else if (a === "chan") openChan(current);
  else if (a === "suivant" || a === "next") next();
  else if (a === "proches") voirProches(current.id);
  else if (a === "file") { const r = list.querySelector(".row.playing"); if (r) r.scrollIntoView({ behavior: "smooth", block: "center" }); }
  else if (a === "suivre") {
    const p = current.prod, suit = !SUIVIS.prods.has(p);
    suit ? SUIVIS.prods.add(p) : SUIVIS.prods.delete(p);
    saveSuivis(); versionGout++;
    majEntete(LAST);
    npEtat();
    if (suit) feterSuivi(el, (profilDe(p) || {}).n || p, avatarDe(p));
  }
  else if (a === "sim") {
    // la prod choisie passe juste apres celle en cours : la file de la liste continue ensuite
    const x = npSims[+el.dataset.i];
    if (!x) return;
    const deja = QUEUE.indexOf(x.id);
    if (deja >= 0) { QUEUE.splice(deja, 1); if (deja < QI) QI--; }
    QUEUE.splice(QI + 1, 0, x.id); QI++;
    load(x.id);
  }
});

function rowHTML(b){
  const c = cssVar(b.style);
  const pop = Math.max(6, Math.min(100, ((Math.log10(Math.max(b.views,10)) - 1.8) / 5.5) * 100));
  const saved = CRATE.has(b.id);
  return `<li class="row${S.playing===b.id?" playing":""}${DEAD.has(b.id)?" dead":""}" data-id="${b.id}" style="--c:${c}">
    <button class="play" data-act="play" aria-label="Lire ${esc(b.title)}">
      <img src="https://i.ytimg.com/vi/${b.id}/mqdefault.jpg" alt="" loading="lazy" width="62" height="40">
      <span class="glyph">${(S.playing===b.id && !S.paused)
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>'}</span>
    </button>

    <div class="meta">
      <p class="title" translate="no">${esc(b.title)}</p>
      <div class="sub2">
        <span class="pill">${esc(STYLE_NAME[b.style])}</span>
        ${TOPLINE_N.get(b.id)?`<span class="tl-n" title="Tes prises sur cette prod">🎙 ${TOPLINE_N.get(b.id)}</span>`:""}
        ${estNouvelle(b)?`<span class="new" title="${VISITE_PREC ? "Ajoutée depuis ta dernière visite" : "Ajoutée ces derniers jours"}">nouveau</span>`:""}
        <span class="prod">par <button data-act="prod" title="Toutes les prods de ${esc(b.prod)}"><b>${esc(b.prod)}</b></button></span>
        ${b.refs.length?`<span class="refs">${b.refs.map(r=>`<button data-act="ref" data-ref="${esc(r)}">${esc(r)}</button>`).join("")}</span>`:""}
      </div>
    </div>

    <div class="nums">
      <div class="num"><span class="v${b.bpmSur?"":" flou"}"${b.bpmSur?"":' title="Tempo estimé d\'après le style : le beatmaker ne l\'a pas indiqué."'}>${b.bpmSur?"":"~"}${b.bpm}</span><span class="k">bpm</span></div>
      <div class="num k-key"><span class="v${b.keySur?"":" flou"}"${b.keySur?"":' title="Tonalité estimée : non indiquée par le beatmaker."'}>${b.keySur?"":"~"}${esc(b.key)}</span><span class="k">clé</span></div>
      <div class="num"><span class="v">${fmtDur(b.dur)}</span><span class="k">durée</span></div>
      <div class="num pop"><span class="v">${fmtViews(b.views)}</span><div class="bar"><i style="width:${pop}%"></i></div><span class="k">vues</span></div>
      <div class="num"><span class="v" style="color:var(--dim)">${fmtAge(b.days)}</span><span class="k">âge</span></div>
      <div class="acts">
        <button class="icon${saved?" sav":""}" data-act="save" aria-label="${saved?"Retirer des prods likées":"Liker cette prod"}" title="${saved?"Retirer des prods likées":"Liker cette prod"}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${saved?"currentColor":"none"}" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20.4 4.3 12.7a4.6 4.6 0 0 1 6.4-6.6l1.3 1.3 1.3-1.3a4.6 4.6 0 0 1 6.4 6.6z"/></svg>
        </button>
        ${S.crateOnly && saved ? (dans => `<button class="icon${dans?" dans":""}" data-act="dossier" aria-label="Ranger dans un dossier" title="Ranger dans un dossier">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${dans?"currentColor":"none"}" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        </button>`)(DOSSIERS.some(d => d.ids.has(b.id))) : ""}
        <button class="icon" data-act="proche" aria-label="Prods similaires à ${esc(b.title)}" title="Prods similaires">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5"/><circle cx="15" cy="15" r="5"/></svg>
        </button>
        <button class="icon" data-act="chan" aria-label="Voir la chaîne YouTube de ${esc(b.prod)}" title="Voir la chaîne YouTube de ${esc(b.prod)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>
        </button>
      </div>
    </div>
  </li>`;
}

/* Partie legere de render() : titre, compteurs, bouton de lecture. Elle ne touche
   pas a la liste, donc elle coute une fraction de milliseconde. */
function majEntete(res){
  majBarre();
  const parts = [];
  if(S.crateOnly) parts.push(S.dossier && dossier(S.dossier) ? dossier(S.dossier).nom : "prods likées");
  if(S.historyOnly) parts.push("écoutées récemment");
  if(S.forYou) parts.push("Pour toi");
  if(S.depuis) parts.push("Nouveau depuis ta visite");
  if(S.suivis) parts.push("Tes abonnements");
  if(S.toplines) parts.push("Tes toplines");
  if(S.prod) parts.push(S.prod);
  if(S.proche && BY_ID.has(S.proche)) parts.push(`Dans l'esprit de « ${BY_ID.get(S.proche).title} »`);
  if(S.styles.size) parts.push([...S.styles].map(s=>STYLE_NAME[s]).join(" + "));
  if(S.artists.size) parts.push([...S.artists].map(id => ARTIST_NAME[id] || id).join(" + "));
  if(S.moods.size) parts.push([...S.moods].join(" + "));
  if(S.bpmSur) parts.push("tempo vérifié");
  if(S.neuf && !S.historyOnly && !S.forYou && !S.crateOnly) parts.push("jamais écoutées");
  if(S.bpm[0]>BMIN || S.bpm[1]<BMAX) parts.push(`${S.bpm[0]}–${S.bpm[1]} BPM`);
  if(S.q.trim()) parts.push(`« ${S.q.trim()} »`);

  document.getElementById("resTitle").textContent = parts.length ? parts.join(" · ") : "Toutes les prods";
  const prods = new Set(res.map(b=>b.prod)).size;
  document.getElementById("resSub").textContent = res.length
    ? `${res.length} prod${res.length>1?"s":""} · ${prods} beatmaker${prods>1?"s":""}`
    : "";
  document.getElementById("sorts").hidden = S.historyOnly || S.forYou || !!S.proche || S.suivis;
  document.body.classList.toggle("vue-suivis", S.suivis);   // l'ordre est celui de l'ecoute, ou du gout
  document.getElementById("effHist").hidden = !(S.historyOnly && HIST.length);
  if (S.forYou) document.getElementById("resSub").textContent += (res.length ? " · " : "") + resumeGout();
  majPortee();
  majSuivre();
  majDossiers();
  majProfil(res);
  if (S.depuis && VISITE_PREC) document.getElementById("resSub").textContent += ` · ta dernière visite : ${ilYa(VISITE_PREC)}`;
  if (S.proche && res.length > 1) document.getElementById("resSub").textContent =
    `${res.length - 1} prods proches · style, tempo, tonalité et artistes en commun`;
  const pa = document.getElementById("playall");
  pa.hidden = !res.length;
  document.getElementById("surprise").hidden = res.length < 3;   // un tirage parmi deux prods n'a rien d'une surprise
  document.getElementById("playallN").textContent = res.length > 1 ? `Lire les ${res.length}` : "Tout lire";
}

/* Liste vide a cause de « Jamais écoutées » seul : combien de prods il cache. */
function dejaEcoutees(){
  if (!S.neuf || S.historyOnly || S.forYou || S.crateOnly) return 0;
  S.neuf = false;
  const n = filtered().length;
  S.neuf = true;
  return n;
}
function render(){
  const res = filtered();
  LAST = res;
  majEntete(res);

  /* Etagere vide et « rien ne correspond » ont la meme apparence mais pas la meme
     cause : le dire evite de chercher un filtre fautif qui n'existe pas. */
  /* Les lignes arrivent par paquets : reconstruire 2 000+ lignes a chaque clic coutait
     plus de 80 ms, alors que l'oeil n'en voit qu'une dizaine. Le reste suit au defilement. */
  obsSuite.disconnect();
  lignesAffichees = 0;
  if (res.length) {
    list.innerHTML = "";
    ajouterLignes();
    // un filtre change en bas de page : on repart du haut de la nouvelle liste. En haut de
    // page il n'y a rien a corriger, et la mesure force une mise en page complete (~23 ms).
    if (scrollY > 80) {
      const haut = list.getBoundingClientRect().top;
      const reserve = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh")) || 96) + 60;
      if (haut < reserve) window.scrollTo({ top: Math.max(0, scrollY + haut - reserve), behavior: "instant" });
    }
  } else list.innerHTML = (S.historyOnly && !HIST.length ? `
    <li class="empty">
      <h3>Rien d'écouté pour l'instant.</h3>
      <p>Lance une prod — elle viendra se ranger ici, la plus récente en tête.</p>
    </li>` : dejaEcoutees() ? `
    <li class="empty">
      <h3>Tu as déjà tout écouté ici.</h3>
      <p>Tu as déjà lancé ces ${dejaEcoutees()} prods — désactive « Jamais écoutées » pour les revoir.</p>
    </li>` : S.toplines && !TOPLINE_N.size ? `
    <li class="empty">
      <h3>Pas encore de topline.</h3>
      <p>Lance une prod, touche le micro dans le lecteur et pose ta voix dessus : tes prises se rangeront ici.</p>
    </li>` : S.suivis && !nbSuivis() ? `
    <li class="empty">
      <h3>Tu ne suis personne pour l'instant.</h3>
      <p>Ouvre un artiste (menu Artiste) ou clique sur le nom d'un beatmaker, puis touche « + Suivre » à côté du titre.</p>
    </li>` : S.crateOnly && S.dossier && dossier(S.dossier) && !dossier(S.dossier).ids.size ? `
    <li class="empty">
      <h3>Ce dossier est vide.</h3>
      <p>Dans « Tous », touche l'icône dossier à côté d'une prod pour la ranger ici.</p>
    </li>` : S.crateOnly && !CRATE.size ? `
    <li class="empty">
      <h3>Aucune prod likée pour l'instant.</h3>
      <p>Touche le cœur à côté d'une prod — elle se rangera ici.</p>
    </li>` : `
    <li class="empty">
      <h3>Aucune prod ne correspond.</h3>
      <p>Élargis le tempo ou enlève un filtre — le catalogue en compte ${BEATS.length}.</p>
    </li>`);

  // histogramme : surligner la plage active
  document.querySelectorAll("#hist i").forEach(el => {
    const i = +el.dataset.i, lo = BMIN + i*BW, hi = lo + BW;
    el.classList.toggle("in", hi > S.bpm[0] && lo < S.bpm[1]);
  });

  document.getElementById("clearStyle").hidden = !S.styles.size;
  document.getElementById("clearMood").hidden = !S.moods.size;
  document.getElementById("clearBpm").hidden = !(S.bpm[0]>BMIN || S.bpm[1]<BMAX);
  document.getElementById("crateN").textContent = CRATE.size;
}

/* ============ lecteur ============ */
/* On pilote le lecteur YouTube officiel via son IFrame API : lecture, pause,
   recherche dans la piste, enchaînement. L'utilisateur ne quitte jamais FINDINGS. */

const bar = document.getElementById("bar");
const elNowT = document.getElementById("nowT"), elNowD = document.getElementById("nowD");
const elCur = document.getElementById("tCur"), elDur = document.getElementById("tDur");
const elFill = document.getElementById("progFill"), elKnob = document.getElementById("progKnob");
const elProg = document.getElementById("prog"), tgIcon = document.getElementById("tgIcon");
const elTrack = elProg.querySelector(".rail2");

let player = null, apiReady = false, pendingId = null, tick = null;
/* L'objet lecteur existe des sa creation, mais ses commandes (loadVideoById,
   getPlayerState…) n'arrivent qu'avec onReady, environ une seconde plus tard. Lancer
   une autre prod entre-temps levait une erreur : le titre changeait, pas la video. */
let playerReady = false;
let glisse = false;   // curseur de temps en cours de deplacement
/* Une recherche n'est pas instantanee : le lecteur continue d'annoncer l'ancienne
   position pendant ~400 ms. On retient la position demandee et on garde l'affichage
   dessus tant qu'elle n'est pas atteinte, sinon la barre repasse par l'endroit
   qu'on vient de quitter et le curseur parait mal se poser. */
let cibleSeek = null, cibleSeekTs = 0;
let repriseT = 0, repriseJoue = true;   // position à rejoindre après un changement de page
/* Le lecteur pilotable exige une vraie origine : ouverte depuis le disque
   (file://), la page ne peut pas dialoguer avec YouTube et rien ne sort. On
   bascule alors sur une intégration simple, qui elle joue partout — on perd le
   pilotage fin, pas le son. Même repli si le lecteur ne démarre pas. */
const FILE_MODE = location.protocol === "file:";
let PLAIN = FILE_MODE, started = false, watchdog = null;
/* Un navigateur refuse souvent de lancer un son que personne n'a demandé. Ce
   silence-là est normal : on ne le confond pas avec un lecteur en panne. */
let gestured = false;
addEventListener("pointerdown", () => gestured = true, { once:true, capture:true });
addEventListener("keydown",     () => gestured = true, { once:true, capture:true });
let QUEUE = [], QI = -1, SHUFFLE = false, VOL = 100;
/* Écoute rapide : chaque prod demarre apres l'intro (tag du beatmaker, 8 a 16 mesures
   d'installation), la ou le beat est complet. Pas de reperage du drop dans le son —
   l'iframe ne donne pas acces a l'audio —, donc une estimation : 15 % de la duree,
   entre 15 et 35 s. C'est un choix de l'auditeur, retenu d'une visite a l'autre. */
let RAPIDE = false;
try { RAPIDE = localStorage.getItem("findings.rapide") === "1"; } catch (e) {}
const debut = id => {
  if (!RAPIDE) return 0;
  const b = BY_ID.get(id);
  return b && b.dur > 60 ? Math.round(Math.min(35, Math.max(15, b.dur * 0.15))) : 0;
};
let current = null;

const ICON_PLAY  = '<path d="M8 5.5v13l11-6.5z"/>';
const ICON_PAUSE = '<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>';

/* --- chargement de l'API --- */
(function loadApi(){
  if (PLAIN) return;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  tag.onerror = () => goPlain("l'API YouTube n'a pas pu être chargée");
  document.head.appendChild(tag);
})();
window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  if (pendingId) { const id = pendingId; pendingId = null; mount(id); }
};

function mount(id){
  if (PLAIN) return mountPlain(id);
  playerReady = false;
  player = new YT.Player("ytplayer", {
    width:"100%", height:"100%", videoId:id,
    // controls:0 retire la barre du lecteur, disablekb:1 ses raccourcis clavier,
    // fs:0 son bouton plein écran : il ne reste que l'image
    playerVars:{ autoplay:1, rel:0, modestbranding:1, playsinline:1, iv_load_policy:3,
                 controls:0, disablekb:1, fs:0, start: debut(id) },
    events:{
      onReady: e => {
        playerReady = true;
        e.target.setVolume(VOL);
        // une autre prod a ete demandee pendant l'initialisation : c'est elle qui compte
        if (pendingId) {
          const id = pendingId; pendingId = null; repriseT = 0;
          e.target.loadVideoById({ videoId: id, startSeconds: debut(id) });
          armWatchdog(id); startTick();
          return;
        }
        if (repriseT > 0) e.target.seekTo(repriseT, true);
        // on ne relance pas ce qui était en pause au moment de quitter la page
        if (repriseT > 0 && !repriseJoue) { e.target.pauseVideo(); S.paused = true; tgIcon.innerHTML = ICON_PLAY; }
        else e.target.playVideo();
        repriseT = 0;
        startTick();
      },
      onStateChange: onState,
      onError: onError
    }
  });
  armWatchdog(id);
}

/* Intégration simple : c'est YouTube qui affiche ses propres commandes dans la
   vignette. Suivant et précédent marchent encore — on recharge l'iframe. */
function mountPlain(id){
  const host = document.getElementById("ytplayer");
  host.innerHTML =
    `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1&start=${debut(id)}"
             allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen
             referrerpolicy="origin-when-cross-origin"></iframe>`;
  // sur un grand écran on agrandit pour montrer les commandes de YouTube ;
  // sur un téléphone la vignette resterait plus large que la barre
  if (innerWidth >= 620) document.getElementById("vidWrap").classList.add("big");
  bar.classList.add("plain");
}

/* Bascule définitive vers l'intégration simple, en expliquant pourquoi. */
function goPlain(raison){
  if (PLAIN) return;
  PLAIN = true;
  clearInterval(tick); clearTimeout(watchdog);
  try { player && player.destroy && player.destroy(); } catch(e){}
  player = null;
  const host = document.getElementById("ytplayer");
  if (host) host.innerHTML = "";
  if (current) mountPlain(current.id);
  elNowD.innerHTML =
    `<span>par <b>${esc(current ? current.prod : "")}</b></span>` +
    `<span style="color:var(--accent)">Lecture dans la vignette — ${esc(raison)}.</span>`;
}

/* Si rien n'a démarré au bout de cinq secondes, c'est que le lecteur pilotable
   ne peut pas fonctionner ici : on bascule au lieu de laisser un cadre muet. */
function armWatchdog(id){
  clearTimeout(watchdog);
  started = false;
  if (!gestured) return;
  watchdog = setTimeout(() => {
    if (PLAIN || started || S.playing !== id) return;
    // L'API absente, c'est un blocage : le lecteur pilotable ne peut pas exister.
    // L'API présente mais rien qui démarre, c'est la politique d'autoplay du
    // navigateur — on ne dégrade pas le lecteur pour ça, l'utilisateur a un
    // bouton lecture sous la main.
    if (typeof YT === "undefined" || !player) goPlain("l'API YouTube n'est pas disponible ici");
  }, 9000);
}

function onState(e){
  // le bouton tourne pendant le chargement et le buffering, et seulement la
  if (e.data === YT.PlayerState.BUFFERING) document.body.classList.add("yt-charge");
  else if ([YT.PlayerState.PLAYING, YT.PlayerState.PAUSED, YT.PlayerState.ENDED, YT.PlayerState.CUED].includes(e.data)) document.body.classList.remove("yt-charge");
  if (e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING){ started = true; clearTimeout(watchdog); }
  // le studio garde la main a la fin d'une prise ou d'une reecoute : pas d'enchainement
  if (e.data === YT.PlayerState.ENDED) { if (STUDIO.occupe()) { STUDIO.finProd(); return; } next(); return; }
  if (e.data === YT.PlayerState.PAUSED) STUDIO.pause();
  if (e.data === YT.PlayerState.PLAYING){ S.paused = false; tgIcon.innerHTML = ICON_PAUSE; startTick(); repeindreLecture(); peindreTuiles(); }
  if (e.data === YT.PlayerState.PAUSED){ S.paused = true;  tgIcon.innerHTML = ICON_PLAY;  repeindreLecture(); peindreTuiles(); }
  if (e.data === YT.PlayerState.CUED)  { try { player.playVideo(); } catch(err){} }
}

/* Certaines chaînes interdisent la lecture hors de YouTube : on marque la prod
   et on passe à la suivante plutôt que de laisser un lecteur noir. */
function onError(e){
  document.body.classList.remove("yt-charge");
  const code = e && e.data;
  clearTimeout(watchdog);
  // 101 et 150 : la chaîne refuse l'intégration. 2, 5, 100 : autre chose cloche,
  // et l'intégration simple s'en sort souvent — on tente avant d'abandonner.
  if (code !== 101 && code !== 150 && !PLAIN) { goPlain("le lecteur pilotable a renvoyé une erreur"); return; }
  if (current) DEAD.add(current.id);
  elNowD.innerHTML = '<span style="color:var(--accent)">Cette chaîne bloque la lecture hors YouTube — prod suivante.</span>';
  repeindreLecture();
  setTimeout(next, 1200);
}

function startTick(){
  clearInterval(tick);
  tick = setInterval(() => {
    if (!player || !player.getDuration) return;
    const d = player.getDuration() || 0, t = player.getCurrentTime() || 0;
    if (!d) return;
    npTemps(t, d);
    /* Pendant le glissement, la barre appartient au doigt : sans ca le curseur
       reviendrait a la position reelle toutes les 300 ms et le geste accrocherait. */
    if (glisse) return;
    if (cibleSeek !== null) {
      // 1,2 s de tolerance : le lecteur ne retombe jamais sur la seconde exacte.
      // Le delai de garde evite de figer la barre si la recherche n'aboutit pas.
      if (Math.abs(t - cibleSeek) < 1.2 || Date.now() - cibleSeekTs > 2500) cibleSeek = null;
      else return;
    }
    const pct = Math.min(100, (t/d)*100);
    elFill.style.width = pct + "%";
    elKnob.style.left = pct + "%";
    // le dégradé garde la largeur de la piste quelle que soit l'avancée
    elFill.style.backgroundSize = elTrack.getBoundingClientRect().width + "px 100%";
    elCur.textContent = fmtDur(Math.floor(t));
    elDur.textContent = fmtDur(Math.floor(d));
    elProg.setAttribute("aria-valuenow", Math.round(pct));
  }, 300);
}

/* --- file d'attente --- */
function playFrom(listOfBeats, index){
  QUEUE = listOfBeats.map(x => x.id);
  QI = index;
  load(QUEUE[QI]);
}
function load(id){
  const b = BEATS.find(x => x.id === id);
  if (!b) return;
  mesurer("lecture");
  if (typeof STUDIO !== "undefined") STUDIO.changement(id);
  noterEcoute(id);
  current = b;
  S.playing = id;
  S.paused = false;

  bar.style.setProperty("--c", cssVar(b.style));
  elNowT.textContent = b.title;
  elNowD.innerHTML =
    `<span>par <b style="color:#aab3c6">${esc(b.prod)}</b></span>` +
    `<span class="mono" style="font-size:11px">${esc(STYLE_NAME[b.style])} · ${b.bpmSur?"":"~"}${b.bpm} BPM</span>` +
    (QUEUE.length > 1 ? `<span class="mono" style="font-size:11px;color:var(--dimmer)">file ${QI+1}/${QUEUE.length}</span>` : "");
  elFill.style.width = "0%"; elKnob.style.left = "0%";
  elCur.textContent = "0:00"; elDur.textContent = fmtDur(b.dur);
  tgIcon.innerHTML = ICON_PAUSE;
  document.body.classList.toggle("yt-charge", !PLAIN);   // jusqu'a ce que la prod joue vraiment
  // filet : lecture automatique bloquee par le navigateur, le lecteur reste « non demarre »
  clearTimeout(window.__chargeMinuteur); window.__chargeMinuteur = setTimeout(() => document.body.classList.remove("yt-charge"), 8000);
  syncCoeur();
  peindreTuiles();
  bar.classList.add("up");
  document.body.classList.add("playing");

  if (PLAIN) {
    mountPlain(id);
  } else if (!apiReady || !player) {
    pendingId = id;
    if (apiReady && !player) { pendingId = null; mount(id); }
  } else if (!playerReady) {
    pendingId = id;            // onReady chargera la derniere prod demandee
  } else {
    player.loadVideoById({ videoId: id, startSeconds: debut(id) });
    player.setVolume(VOL);
    armWatchdog(id);
  }
  repeindreLecture();
}

function next(){
  if (!QUEUE.length) return;
  QI = SHUFFLE ? Math.floor(Math.random()*QUEUE.length) : (QI + 1) % QUEUE.length;
  load(QUEUE[QI]);
}
function prev(){
  if (!QUEUE.length) return;
  const t = player && player.getCurrentTime ? player.getCurrentTime() : 0;
  const d = current ? debut(current.id) : 0;   // en écoute rapide, « recommencer » repart apres l'intro
  if (t > d + 3){ player.seekTo(d, true); return; }
  QI = (QI - 1 + QUEUE.length) % QUEUE.length;
  load(QUEUE[QI]);
}
if (FILE_MODE) document.getElementById("hintFile").hidden = false;

function togglePlay(){
  if (PLAIN) { if (!current && LAST.length) playFrom(LAST, 0); return; }
  if (!player) { if (LAST.length) playFrom(LAST, 0); return; }
  if (!playerReady) return;    // il s'initialise : la lecture demarre toute seule
  const st = player.getPlayerState();
  if (st === YT.PlayerState.PLAYING) player.pauseVideo(); else player.playVideo();
}

/* --- commandes --- */
document.getElementById("toggle").addEventListener("click", togglePlay);
document.getElementById("next").addEventListener("click", next);
document.getElementById("prev").addEventListener("click", prev);
const rapideBtn = document.getElementById("rapide");
function poserRapide(v){
  RAPIDE = v;
  rapideBtn.setAttribute("aria-pressed", String(v));
  rapideBtn.classList.toggle("on", v);
  try { localStorage.setItem("findings.rapide", v ? "1" : "0"); } catch (e) {}
}
poserRapide(RAPIDE);
/* Activer en cours d'ecoute ne fait pas sauter la prod en cours, sauf si elle en est
   encore a son intro : on y gagne tout de suite sans couper ce qu'on ecoutait. */
rapideBtn.addEventListener("click", () => {
  poserRapide(!RAPIDE);
  if (RAPIDE && current && playerReady && player.getCurrentTime && player.getCurrentTime() < debut(current.id) - 3)
    chercher(debut(current.id));
});
document.getElementById("shuffle").addEventListener("click", e => {
  SHUFFLE = !SHUFFLE;
  peindreNP();
  const btn = e.currentTarget;
  btn.setAttribute("aria-pressed", SHUFFLE);
  btn.classList.toggle("on", SHUFFLE);
});
const elVol = document.getElementById("vol"), boiteVol = elVol.closest(".vol");
let volAvantMuet = 100, volMinuteur = 0;
function peindreVol(anime){
  boiteVol.dataset.niv = VOL <= 0 ? "0" : VOL < 50 ? "1" : "2";
  document.getElementById("volIco").setAttribute("aria-label", VOL <= 0 ? "Remettre le son" : "Couper le son");
  if (anime) { boiteVol.classList.add("bouge"); clearTimeout(volMinuteur); volMinuteur = setTimeout(() => boiteVol.classList.remove("bouge"), 450); }
}
function poserVol(v, anime){
  VOL = v; elVol.value = v;
  if (player && player.setVolume) player.setVolume(VOL);
  if (player && player.unMute && VOL > 0) try { player.unMute(); } catch (e) {}
  peindreVol(anime);
}
elVol.addEventListener("input", e => poserVol(+e.target.value, true));
document.getElementById("volIco").addEventListener("click", () => {
  if (VOL > 0) { volAvantMuet = VOL; poserVol(0, true); } else poserVol(volAvantMuet || 80, true);
});

/* Le curseur se prend et se deplace, pas seulement se pointe. On suit le pointeur
   jusqu'au relachement et on n'appelle seekTo qu'une fois, a la fin : chercher a
   chaque pixel parcouru saccaderait la lecture pour rien. */
function pctDepuis(e){
  const r = elTrack.getBoundingClientRect();
  return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
}
/* Seul chemin pour chercher : l'affichage se cale d'abord, le lecteur suit. */
function chercher(t){
  if (!player || !player.seekTo) return;
  const d = player.getDuration() || 0;
  const pos = Math.max(0, d ? Math.min(d, t) : t);
  cibleSeek = pos; cibleSeekTs = Date.now();
  if (d) apercu(pos / d);
  player.seekTo(pos, true);
}
function apercu(pct){
  const p = pct * 100;
  elFill.style.width = p + "%";
  elKnob.style.left = p + "%";
  elProg.setAttribute("aria-valuenow", Math.round(p));
  const d = player && player.getDuration ? (player.getDuration() || 0) : 0;
  if (d) elCur.textContent = fmtDur(Math.floor(d * pct));
}
elProg.addEventListener("pointerdown", e => {
  if (!player || !player.getDuration || !player.getDuration()) return;
  glisse = true;
  elProg.classList.add("glisse");
  try { elProg.setPointerCapture(e.pointerId); } catch (err) {}
  apercu(pctDepuis(e));
  e.preventDefault();
});
elProg.addEventListener("pointermove", e => { if (glisse) apercu(pctDepuis(e)); });
function relacherCurseur(e){
  if (!glisse) return;
  glisse = false;
  elProg.classList.remove("glisse");
  try { elProg.releasePointerCapture(e.pointerId); } catch (err) {}
  const pct = pctDepuis(e);
  apercu(pct);
  if (player && player.getDuration) chercher(player.getDuration() * pct);
}
elProg.addEventListener("pointerup", relacherCurseur);
elProg.addEventListener("pointercancel", relacherCurseur);
elProg.addEventListener("keydown", e => {
  if (!player || !player.getCurrentTime) return;
  if (e.key === "ArrowRight"){ chercher(player.getCurrentTime()+5); e.preventDefault(); }
  if (e.key === "ArrowLeft"){ chercher(player.getCurrentTime()-5); e.preventDefault(); }
});

/* agrandir la vidéo */
/* agrandir / réduire la vignette */
(function zoomVideo(){
  const wrap = document.getElementById("vidWrap"), btn = document.getElementById("vidZoom");
  const GRAND = '<path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/>';
  const PETIT = '<path d="M3 9h4a2 2 0 0 0 2-2V3"/><path d="M21 9h-4a2 2 0 0 1-2-2V3"/><path d="M3 15h4a2 2 0 0 1 2 2v4"/><path d="M21 15h-4a2 2 0 0 0-2 2v4"/>';
  function peindre(){
    const on = wrap.classList.contains("big");
    btn.querySelector("svg").innerHTML = on ? PETIT : GRAND;
    btn.setAttribute("aria-pressed", on);
    btn.title = btn.ariaLabel = on ? "Réduire la vidéo" : "Agrandir la vidéo";
  }
  btn.addEventListener("click", e => { e.stopPropagation(); wrap.classList.toggle("big"); peindre(); });
  addEventListener("keydown", e => {
    if (e.key === "Escape" && wrap.classList.contains("big")) { wrap.classList.remove("big"); peindre(); }
  });
  new MutationObserver(peindre).observe(wrap, { attributes:true, attributeFilter:["class"] });
  peindre();
})();

document.getElementById("procheBtn").addEventListener("click", () => {
  if (current) voirProches(current.id);
});
document.getElementById("ytLink").addEventListener("click", () => {
  if (current) window.open(`https://www.youtube.com/watch?v=${current.id}`, "_blank", "noopener");
});

/* ============ studio : poser une topline sur la prod ============
   Le micro s'enregistre pendant que la prod joue. Le son de la prod, lui, reste dans le
   lecteur YouTube : le navigateur interdit d'y toucher, la prise ne contient donc que ce
   que le micro entend (la voix seule au casque). A la reecoute, on relance la prod au
   meme endroit et la voix est rejouee calee dessus, par l'API Web Audio : elle demarre a
   la milliseconde voulue et se recale si la prod bufferise ou si on cherche ailleurs.
   Les prises vivent dans le navigateur (IndexedDB), comme les likes. */
const PRISES_DB = (() => {
  let ouverture = null;
  const ouvrir = () => ouverture || (ouverture = new Promise((ok, ko) => {
    // v2 : une table « projets » (l'arrangement du studio, une par prod) a cote des prises
    // v3 : une table « fichiers » (la prod importee par le visiteur, une par prod)
    const r = indexedDB.open("findings-studio", 3);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("prises")) db.createObjectStore("prises", { keyPath: "id" }).createIndex("prod", "prod");
      if (!db.objectStoreNames.contains("projets")) db.createObjectStore("projets", { keyPath: "prod" });
      if (!db.objectStoreNames.contains("fichiers")) db.createObjectStore("fichiers", { keyPath: "prod" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  }));
  const tx = async (mode, f, table = "prises") => {
    const db = await ouvrir();
    return new Promise((ok, ko) => {
      const t = db.transaction(table, mode), req = f(t.objectStore(table));
      t.oncomplete = () => ok(req && "result" in req ? req.result : undefined);
      t.onerror = () => ko(t.error);
    });
  };
  return {
    ajouter: p => tx("readwrite", s => s.put(p)),
    suppr: id => tx("readwrite", s => s.delete(id)),
    duProd: prod => tx("readonly", s => s.index("prod").getAll(prod)),
    toutes: () => tx("readonly", s => s.getAll()),
    lireProjet: prod => tx("readonly", s => s.get(prod), "projets"),
    ecrireProjet: pr => tx("readwrite", s => s.put(pr), "projets"),
    lireFichier: prod => tx("readonly", s => s.get(prod), "fichiers"),
    ecrireFichier: f => tx("readwrite", s => s.put(f), "fichiers"),
    supprFichier: prod => tx("readwrite", s => s.delete(prod), "fichiers"),
    tousProjets: () => tx("readonly", s => s.getAll(), "projets"),
    // un projet entier : son arrangement, sa prod importee et toutes ses prises
    async supprProjet(prod){
      await tx("readwrite", s => s.delete(prod), "projets");
      await tx("readwrite", s => s.delete(prod), "fichiers");
      const ids = (await tx("readonly", s => s.index("prod").getAllKeys(prod))) || [];
      for (const id of ids) await tx("readwrite", s => s.delete(id));
    }
  };
})();
let TOPLINE_N = new Map();        // prod -> nombre de prises
let PRISES_MEMOIRE = [];          // repli si IndexedDB est indisponible (navigation privee)

/* Le studio lui-meme (station audio) vit dans studio.js, charge apres ce script. */

/* Compte des prises par prod, pour « Tes toplines » et le badge des lignes. */
(async function chargerToplines(){
  try {
    const toutes = await PRISES_DB.toutes();
    TOPLINE_N = new Map();
    toutes.forEach(p => TOPLINE_N.set(p.prod, (TOPLINE_N.get(p.prod) || 0) + 1));
  } catch (e) {}
  if (typeof majToplines === "function") majToplines();
  if (TOPLINE_N.size && (S.toplines || document.querySelector(".row"))) render();
})();

/* raccourcis clavier */
document.addEventListener("keydown", e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === " "){ e.preventDefault(); togglePlay(); }
  else if (e.key.toLowerCase() === "n") next();
  else if (e.key.toLowerCase() === "p") prev();
  else if (e.key.toLowerCase() === "r") rapideBtn.click();
  else if (e.key === "ArrowRight" && player?.getCurrentTime){ chercher(player.getCurrentTime()+5); }
  else if (e.key === "ArrowLeft"  && player?.getCurrentTime){ chercher(player.getCurrentTime()-5); }
});

/* Bascule l'état d'un cœur et, à l'ajout seulement, lance l'éclat. L'élément
   d'animation se retire tout seul une fois la séquence finie. */
/* Le cœur de la barre reflète la prod en cours ; celui de la ligne reflète la
   sienne. Les deux écrivent dans la même liste, il faut donc les tenir d'accord
   sans rejouer l'animation sur celui qu'on n'a pas cliqué. */
function syncCoeur(){
  npEtat();
  const btn = document.getElementById("likeBtn");
  if (!btn) return;
  btn.hidden = !current;
  document.getElementById("micBtn").hidden = !current;
  if (!current) return;
  const like = CRATE.has(current.id);
  btn.classList.toggle("sav", like);
  const texte = like ? "Retirer des prods likées" : "Liker cette prod";
  btn.setAttribute("aria-label", texte);
  btn.title = texte;
  btn.querySelector("svg")?.setAttribute("fill", like ? "currentColor" : "none");
  // ranger la prod en cours : seulement si elle est likee
  const dos = document.getElementById("dosBtn");
  if (dos) {
    dos.hidden = !like;
    const dans = like && DOSSIERS.some(d => d.ids.has(current.id));
    dos.classList.toggle("dans", dans);
    dos.querySelector("svg")?.setAttribute("fill", dans ? "currentColor" : "none");
  }
}

function basculerLike(b, source){
  const like = !CRATE.has(b.id);
  like ? CRATE.add(b.id) : CRATE.delete(b.id);
  saveCrate();
  if (like) mesurer("like");
  if (!like && DOSSIERS.some(d => d.ids.delete(b.id))) saveDossiers();
  if (like) proposerDossier(b);
  document.getElementById("crateN").textContent = CRATE.size;
  if (source) peindreLike(source, like);
  // l'autre représentation se met à jour sans fêter l'événement une deuxième fois
  const ligne = list.querySelector(`.row[data-id="${CSS.escape(b.id)}"] [data-act="save"]`);
  if (ligne && ligne !== source) peindreLike(ligne, like, false);
  if (current && current.id === b.id) syncCoeur();
  majLikes();
  majPourToi();
  if (S.crateOnly) render();
}

function peindreLike(btn, like, anime = true){
  if (!btn) return;
  btn.classList.toggle("sav", like);
  const texte = like ? "Retirer des prods likées" : "Liker cette prod";
  btn.setAttribute("aria-label", texte);
  btn.title = texte;
  const svg = btn.querySelector("svg");
  if (svg) svg.setAttribute("fill", like ? "currentColor" : "none");
  if (!like || !anime) return;

  btn.classList.remove("pop");
  void btn.offsetWidth;            // force le navigateur à rejouer l'animation
  btn.classList.add("pop");

  btn.querySelector(".burst")?.remove();
  const burst = document.createElement("span");
  burst.className = "burst";
  burst.setAttribute("aria-hidden", "true");
  burst.innerHTML = '<i class="ring"></i>' +
    Array.from({ length:6 }, (_, k) => `<i class="spark" style="--a:${k * 60}deg"></i>`).join("");
  btn.appendChild(burst);
  setTimeout(() => burst.remove(), 620);
}

/* ============ chaîne du beatmaker ============ */
/* Le catalogue porte l'adresse exacte de la chaîne quand l'ingestion a pu la
   lire ; sinon on retombe sur une recherche YouTube sur le nom du beatmaker. */
function chanUrl(b){
  return b.chan || `https://www.youtube.com/results?search_query=${encodeURIComponent(b.prod)}`;
}
function openChan(b){
  if (b) window.open(chanUrl(b), "_blank", "noopener");
}

document.getElementById("chanBtn").addEventListener("click", () => openChan(current));
document.getElementById("likeBtn").addEventListener("click", () => { if (current) basculerLike(current, document.getElementById("likeBtn")); });

/* ============ interactions ============ */
list.addEventListener("click", e => {
  const row = e.target.closest(".row"); if(!row) return;
  const b = BEATS.find(x => x.id === row.dataset.id);
  const act = e.target.closest("[data-act]")?.dataset.act;
  if(act === "ref"){
    document.getElementById("q").value = e.target.closest("[data-ref]").dataset.ref;
    S.q = e.target.closest("[data-ref]").dataset.ref; render(); window.scrollTo({top:0,behavior:"smooth"}); return;
  }
  if(act === "save"){
    basculerLike(b, e.target.closest('[data-act="save"]'));
    return;
  }
  if(act === "chan"){ openChan(b); return; }
  if(act === "proche"){ voirProches(b.id); return; }
  if(act === "dossier"){ ouvrirDosMenu(b, e.target.closest('[data-act="dossier"]')); return; }
  if(act === "prod"){
    viderFiltres(); S.prod = b.prod; refletFiltres(); render();
    history.pushState({ vue: "prods" }, "", lienProd(b.prod)); majTitre(); mesurer();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if(S.playing === b.id){ togglePlay(); return; }   // reclic sur la prod en cours = pause/reprise
  playFrom(LAST, LAST.findIndex(x => x.id === b.id));
});

/* Un seul filtre a la fois. Avant, style, mood et likes se cumulaient : demander
   « sombre » en ayant « Trap » actif renvoyait l'intersection des deux, souvent vide,
   sans que rien n'indique lequel des deux etait en cause. Choisir remplace desormais. */
/* Page beatmaker : banniere, photo, nom, chiffres, Lire / Suivre / Chaine YouTube,
   et les artistes qu'il vise le plus. La liste de ses prods suit, avec les filtres. */
const elProfil = document.getElementById("profil");
let profilPeint = null;
/* L'artiste dont la liste est affichee seul (sans style ni mood en plus), sinon null. */
const artisteSeul = () => !S.prod && !S.crateOnly && S.artists.size === 1 && !S.styles.size && !S.moods.size ? [...S.artists][0] : null;
function majProfil(res){
  const art = artisteSeul();
  const actif = !!(S.prod || art);
  document.body.classList.toggle("vue-profil", actif);
  elProfil.hidden = !actif;
  if (!actif) { profilPeint = null; return; }
  const suivi = S.prod ? SUIVIS.prods.has(S.prod) : SUIVIS.artists.has(art);
  const cle = (S.prod || "@" + art) + "|" + suivi + "|" + res.length;
  if (profilPeint === cle) return;
  profilPeint = cle;

  const toutes = BEATS.filter(b => S.prod ? b.prod === S.prod : b.artists.includes(art));
  const compte = (cle) => { const m = {}; toutes.forEach(b => [].concat(cle(b)).forEach(k => m[k] = (m[k] || 0) + 1)); return Object.keys(m).sort((a, b) => m[b] - m[a]); };
  const styles = compte(b => b.style);
  const vues = toutes.reduce((n, b) => n + b.views, 0);
  const nbProds = new Set(toutes.map(b => b.prod)).size;
  let v;   // ce qui differe entre un beatmaker et un artiste
  if (S.prod) {
    const c = profilDe(S.prod) || {};
    v = { type: "Beatmaker", nom: c.n || S.prod, img: c.a, ban: c.b || "",
          chiffre: c.s ? `<span><b>${esc(c.s)}</b> abonnés YouTube</span>` : "",
          compte: `<b>${toutes.length}</b> prod${toutes.length > 1 ? "s" : ""} sur FINDINGS`,
          lien: "Chaîne YouTube ↗", couleur: styles[0] || "trap",
          liste: compte(b => b.artists).slice(0, 6).map(a => `<a href="${lienArtiste(a)}" data-vue="prods">${esc(ARTIST_NAME[a] || a)} type beat</a>`) };
  } else {
    const c = ARTIST_INFO[art] || {};
    v = { type: "Artiste", nom: ARTIST_NAME[art] || art, img: c.img,
          // pas de banniere chez Deezer : la photo elle-meme, agrandie et floutee
          ban: c.img || "", banFlou: true,
          chiffre: c.fans ? `<span><b>${fmtViews(c.fans)}</b> fans Deezer</span>` : "",
          compte: `<b>${toutes.length}</b> type beat${toutes.length > 1 ? "s" : ""} · <b>${nbProds}</b> beatmaker${nbProds > 1 ? "s" : ""}`,
          lien: "", couleur: ARTIST_STYLE[art] || styles[0] || "trap",
          /* Ecouter l'artiste : Spotify (fiche exacte, sinon sa recherche), Apple Music si on
             a sa fiche, Deezer. */
          ecouter: [
            ["spotify", "Spotify", c.sp || `https://open.spotify.com/search/${encodeURIComponent(ARTIST_NAME[art] || art)}/artists`],
            c.am && ["apple", "Apple Music", c.am],
            c.dz && ["deezer", "Deezer", c.dz]
          ].filter(Boolean),
          // les beatmakers qui font le plus de type beats « a la Hamza » — pas ses producteurs reels
          liste: compte(b => b.prod).slice(0, 6).map(p => `<a href="${lienProd(p)}" data-vue="prods">${avatarDe(p) ? `<img src="${esc(avatarDe(p))}" alt="" referrerpolicy="no-referrer">` : ""}${esc(p)}</a>`) };
  }
  const initiale = (v.nom.replace(/^prod\.?\s*/i, "")[0] || "?").toUpperCase();
  elProfil.style.setProperty("--c", cssVar(v.couleur));
  elProfil.innerHTML = `
    ${v.ban ? `<div class="ban"${v.banFlou ? ' style="filter:blur(28px) saturate(1.3);transform:scale(1.25)"' : ""}><img src="${esc(v.ban)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>` : ""}
    <div class="profil-in">
      ${v.img ? `<img class="ava" src="${esc(v.img)}" alt="" referrerpolicy="no-referrer">` : `<div class="ava">${esc(initiale)}</div>`}
      <div class="profil-txt">
        <span class="eyebrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9.5 4.5H6v3.5L3.5 10.5 6 13v3.5h3.5L12 19l2.5-2.5H18V13l2.5-2.5L18 8V4.5h-3.5z" opacity=".9"/></svg>${v.type}</span>
        <h2>${esc(v.nom)}</h2>
        <div class="meta">
          ${v.chiffre}
          <span>${v.compte}</span>
          <span><b>${fmtViews(vues)}</b> vues</span>
          <span>${styles.slice(0, 3).map(st => esc(STYLE_NAME[st] || st)).join(" · ")}</span>
        </div>
        <div class="profil-acts">
          <button class="lire" id="profLire" aria-label="Tout lire" title="Tout lire"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></button>
          <button class="pbtn${suivi ? " on" : ""}" id="profSuivre" aria-pressed="${suivi}">${suivi ? "✓ Suivi" : "+ Suivre"}</button>
          ${v.lien ? `<button class="pbtn" id="profLien">${v.lien}</button>` : ""}
          <button class="pbtn" id="profPartager" title="Partager cette page">↗ Partager</button>
          ${(v.ecouter || []).map(([k, nom, url]) =>
            `<a class="pbtn plat" href="${esc(url)}" target="_blank" rel="noopener" style="--pc:var(--pc-${k})"><i></i>${nom}</a>`).join("")}
        </div>
        ${v.liste.length ? `<div class="cibles">${S.prod ? "" : `<span class="cibles-t">Type beats ${esc(v.nom)} par</span>`}${v.liste.join("")}</div>` : ""}
        ${S.prod ? `<p class="prof-toi">C'est toi ? Mets le lien de cette page dans ta bio : tes auditeurs y trouvent toutes tes prods, et peuvent poser leur topline dessus.</p>` : ""}
      </div>
    </div>`;
  const img = elProfil.querySelector("img.ava");
  if (img) img.onerror = () => img.replaceWith(Object.assign(document.createElement("div"), { className: "ava", textContent: initiale }));
}
/* Partager la page : un beatmaker peut mettre ce lien dans sa bio, un artiste l'envoyer. */
async function partagerPage(){
  const url = location.origin + location.pathname + location.search, titre = document.title;
  mesurer("partage");
  if (navigator.share) { try { await navigator.share({ title: titre, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); } catch (e) {}
  document.querySelector(".suivi-toast")?.remove();
  const t = document.createElement("div");
  t.className = "suivi-toast"; t.setAttribute("role", "status");
  t.innerHTML = `<span>Lien copié<small>${esc(url.replace(/^https?:\/\//, ""))}</small></span>`;
  document.body.appendChild(t); requestAnimationFrame(() => t.classList.add("on"));
  setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 2600);
}

/* La fete d'un abonnement. Rien si l'utilisateur a demande moins d'animations,
   sauf le message, qui dit ce qui vient de se passer. */
const MOINS_ANIM = matchMedia("(prefers-reduced-motion: reduce)").matches;
let toastMinuteur = 0;
function feterSuivi(btn, nom, photo){
  if (!MOINS_ANIM && btn) {
    btn.classList.remove("suivi-pop"); void btn.offsetWidth; btn.classList.add("suivi-pop");
    const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const teintes = ["#FA233B", "#FF9F0A", "#0A84FF", "#30D158", "#BF5AF2", "#FFD60A"];
    for (let i = 0; i < 18; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.style.background = teintes[i % teintes.length];
      c.style.left = cx + "px"; c.style.top = cy + "px";
      document.body.appendChild(c);
      const ang = (i / 18) * Math.PI * 2 + Math.random() * .4, dist = 50 + Math.random() * 60;
      c.animate([
        { transform: "translate(-50%,-50%) rotate(0) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 20}px)) rotate(${Math.random() * 540}deg) scale(.9)`, opacity: 1, offset: .6 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.15}px), calc(-50% + ${Math.sin(ang) * dist + 40}px)) rotate(${Math.random() * 720}deg) scale(.4)`, opacity: 0 }
      ], { duration: 900 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => c.remove();
    }
    const ava = elProfil.querySelector(".ava");
    if (ava && !elProfil.hidden) { ava.classList.remove("halo"); void ava.offsetWidth; ava.classList.add("halo"); }
  }
  document.querySelector(".suivi-toast")?.remove();
  const t = document.createElement("div");
  t.className = "suivi-toast";
  t.setAttribute("role", "status");
  t.innerHTML = (photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="ini">${esc((nom[0] || "?").toUpperCase())}</span>`) +
    `<span>Tu suis ${esc(nom)}<small>Ses nouvelles prods remonteront dans ton accueil</small></span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("on"));
  clearTimeout(toastMinuteur);
  toastMinuteur = setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 2800);
}

elProfil.addEventListener("click", e => {
  if (e.target.closest("#profLire")) { if (LAST.length) playFrom(LAST, 0); return; }
  if (e.target.closest("#profPartager")) { partagerPage(); return; }
  const lien = e.target.closest("#profLien");
  if (lien) {
    openChan(BEATS.find(x => x.prod === S.prod));
    return;
  }
  if (e.target.closest("#profSuivre")) {
    const [set, id] = S.prod ? [SUIVIS.prods, S.prod] : [SUIVIS.artists, artisteSeul()];
    if (!id) return;
    const suit = !set.has(id);
    suit ? set.add(id) : set.delete(id);
    saveSuivis(); versionGout++;
    majEntete(LAST);
    // le profil vient d'etre repeint : on anime les elements neufs
    if (suit) feterSuivi(document.getElementById("profSuivre"),
      S.prod ? ((profilDe(S.prod) || {}).n || S.prod) : (ARTIST_NAME[id] || id),
      S.prod ? avatarDe(S.prod) : photoArtiste(id));
  }
});

/* Le bouton suit la liste affichee : un artiste seul ou un beatmaker. */
function cibleSuivi(){
  if (S.prod) return { type: "prods", id: S.prod, nom: S.prod };
  if (S.artists.size === 1 && !S.styles.size && !S.moods.size) {
    const id = [...S.artists][0];
    return { type: "artists", id, nom: ARTIST_NAME[id] || id };
  }
  return null;
}
function majSuivre(){
  const btn = document.getElementById("suivreBtn"), c = cibleSuivi();
  btn.hidden = !c;
  if (!c) return;
  const on = SUIVIS[c.type].has(c.id);
  btn.classList.toggle("on", on);
  btn.setAttribute("aria-pressed", String(on));
  btn.innerHTML = on
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>Suivi'
    : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Suivre';
  btn.title = on ? `Ne plus suivre ${c.nom}` : `Suivre ${c.nom} : ses nouvelles prods remontent dans l'accueil`;
}
document.getElementById("suivreBtn").addEventListener("click", () => {
  const c = cibleSuivi(); if (!c) return;
  const set = SUIVIS[c.type];
  const suit = !set.has(c.id);
  suit ? set.add(c.id) : set.delete(c.id);
  saveSuivis();
  versionGout++;
  majSuivre();
  if (suit) feterSuivi(document.getElementById("suivreBtn"), c.nom, c.type === "prods" ? avatarDe(c.id) : photoArtiste(c.id));
});

/* ---- dossiers : la rangee de pastilles ---- */
const elDos = document.getElementById("dossiers");
let dosSaisie = null;   // null, "new" ou l'id du dossier qu'on renomme
let dosSuppr = null;    // suppression armee (deux clics)
function majDossiers(){
  elDos.hidden = !(S.crateOnly || (S.suivis && nbSuivis()));
  if (S.suivis) {
    /* Une pastille par personne suivie, qui filtre la page sans la quitter. Celle qui est
       choisie propose sa page et « Ne plus suivre ». */
    const qui = [...SUIVIS.artists].map(id => ({ k: "a:" + id, nom: ARTIST_NAME[id] || id, img: photoArtiste(id),
                  n: BEATS.filter(b => b.artists.includes(id)).length, href: lienArtiste(id) }))
      .concat([...SUIVIS.prods].map(p => ({ k: "p:" + p, nom: p, img: avatarDe(p),
                  n: BEATS.filter(b => b.prod === p).length, href: lienProd(p) })));
    if (S.qui && !qui.some(x => x.k === S.qui)) S.qui = null;
    const total = BEATS.filter(estSuivie).length, choisi = qui.find(x => x.k === S.qui);
    elDos.innerHTML =
      `<button class="dos" data-qui="" aria-pressed="${!S.qui}">Tout <span>${total}</span></button>` +
      qui.map(x => `<button class="dos suivi" data-qui="${esc(x.k)}" aria-pressed="${S.qui === x.k}">` +
        (x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer">` : "<i></i>") +
        `${esc(x.nom)} <span>${x.n}</span></button>`).join("") +
      (choisi ? `<a class="dos-act" href="${choisi.href}" data-vue="prods">Voir la page →</a>` +
        `<button class="dos-act danger" data-unf="${choisi.k[0] === "a" ? "artists" : "prods"}" data-id="${esc(choisi.k.slice(2))}">Ne plus suivre</button>` : "") +
      // le seul reglage utile ici : la barre de filtres est masquee
      `<button class="dos-act dos-neuf" data-neuf aria-pressed="${S.neuf}" title="N'afficher que les prods jamais écoutées">` +
        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20"/></svg>Jamais écoutées</button>`;
    return;
  }
  if (!S.crateOnly) return;
  const n = d => [...d.ids].filter(id => CRATE.has(id)).length;
  const saisie = (val = "") => `<input class="dos-input" id="dosInput" maxlength="40" placeholder="Nom du dossier" value="${esc(val)}" aria-label="Nom du dossier">`;
  elDos.innerHTML =
    `<button class="dos" data-dos="" aria-pressed="${!S.dossier}">Tous <span>${CRATE.size}</span></button>` +
    DOSSIERS.map(d => dosSaisie === d.id ? saisie(d.nom)
      : `<button class="dos" data-dos="${esc(d.id)}" aria-pressed="${S.dossier === d.id}">${esc(d.nom)} <span>${n(d)}</span></button>`).join("") +
    (dosSaisie === "new" ? saisie() : `<button class="dos ajout" id="dosNew">+ Nouveau dossier</button>`) +
    (S.dossier && dossier(S.dossier) && dosSaisie !== S.dossier
      ? `<button class="dos-act" data-dosact="ren">Renommer</button><button class="dos-act danger" data-dosact="del">${dosSuppr === S.dossier ? "Confirmer la suppression" : "Supprimer"}</button>` : "");
  const inp = document.getElementById("dosInput");
  if (inp) { inp.focus(); inp.select(); }
}
function creerDossier(nom){
  const d = { id: "d" + Date.now().toString(36), nom: nom.slice(0, 40), ids: new Set() };
  DOSSIERS.push(d);
  saveDossiers();
  return d;
}
function validerSaisie(){
  const inp = document.getElementById("dosInput");
  const nom = inp ? inp.value.trim() : "";
  const mode = dosSaisie;
  dosSaisie = null;
  if (nom && mode === "new") { const d = creerDossier(nom); S.dossier = d.id; }
  else if (nom && dossier(mode)) { dossier(mode).nom = nom.slice(0, 40); saveDossiers(); }
  render(); majAdresse();
}
elDos.addEventListener("click", e => {
  const unf = e.target.closest("[data-unf]");
  if (unf) { SUIVIS[unf.dataset.unf].delete(unf.dataset.id); saveSuivis(); versionGout++; S.qui = null; render(); majAdresse(); return; }
  if (e.target.closest("[data-neuf]")) { poserNeuf(!S.neuf); render(); return; }
  const q = e.target.closest("[data-qui]");
  if (q) { S.qui = q.dataset.qui || null; render(); majAdresse(); return; }
  const chip = e.target.closest("[data-dos]");
  if (chip) { S.dossier = chip.dataset.dos || null; dosSuppr = null; render(); majAdresse(); return; }
  if (e.target.closest("#dosNew")) { dosSaisie = "new"; majDossiers(); return; }
  const act = e.target.closest("[data-dosact]")?.dataset.dosact;
  if (act === "ren") { dosSaisie = S.dossier; majDossiers(); return; }
  if (act === "del") {
    if (dosSuppr !== S.dossier) {
      dosSuppr = S.dossier; majDossiers();
      setTimeout(() => { if (dosSuppr) { dosSuppr = null; majDossiers(); } }, 3000);
      return;
    }
    DOSSIERS = DOSSIERS.filter(d => d.id !== S.dossier);   // les prods restent likees
    saveDossiers(); dosSuppr = null; S.dossier = null; render(); majAdresse();
  }
});
elDos.addEventListener("keydown", e => {
  if (e.target.id !== "dosInput") return;
  if (e.key === "Enter") { e.preventDefault(); validerSaisie(); }
  if (e.key === "Escape") { dosSaisie = null; majDossiers(); }
});
// cliquer ailleurs valide ce qui a ete tape, comme Entree
elDos.addEventListener("focusout", e => {
  if (e.target.id === "dosInput") setTimeout(() => { if (dosSaisie !== null) validerSaisie(); }, 0);
});

/* ---- dossiers : le menu « ranger dans » d'une prod ---- */
const dosMenu = document.getElementById("dosMenu");
let dosProd = null;
function peindreDosMenu(){
  const b = dosProd;
  dosMenu.innerHTML = `<span class="eyebrow">Ranger dans</span>` +
    DOSSIERS.map(d => `<label><input type="checkbox" data-mdos="${esc(d.id)}"${d.ids.has(b.id) ? " checked" : ""}>${esc(d.nom)}</label>`).join("") +
    `<input class="dos-input" id="dosMenuNew" maxlength="40" placeholder="+ Nouveau dossier" aria-label="Nouveau dossier">`;
}
function ouvrirDosMenu(b, btn){
  if (!dosMenu.hidden && dosProd === b) return fermerDosMenu();
  dosProd = b;
  peindreDosMenu();
  dosMenu.hidden = false;
  const r = btn.getBoundingClientRect(), h = dosMenu.offsetHeight;
  dosMenu.style.left = Math.max(8, Math.min(innerWidth - 248, r.right - 240)) + "px";
  dosMenu.style.top = (r.bottom + 6 + h > innerHeight - 90 ? Math.max(8, r.top - 6 - h) : r.bottom + 6) + "px";
  if (!DOSSIERS.length) document.getElementById("dosMenuNew").focus();
}
/* Apres un like, ou qu'on soit : un message avec « Ranger », pour classer la prod sans
   passer par la page des likes. */
let likeToastMinuteur = 0;
function proposerDossier(b){
  document.querySelector(".like-toast")?.remove();
  const t = document.createElement("div");
  t.className = "suivi-toast like-toast";
  t.setAttribute("role", "status");
  t.innerHTML = `<img src="https://i.ytimg.com/vi/${b.id}/mqdefault.jpg" alt="">` +
    `<span>Ajoutée à tes likes<small translate="no">${esc(b.title)}</small></span>` +
    `<button class="toast-act" data-act="dossier">Ranger</button>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("on"));
  t.querySelector(".toast-act").addEventListener("click", e => {
    clearTimeout(likeToastMinuteur);
    ouvrirDosMenu(b, e.currentTarget);
    likeToastMinuteur = setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 400);
  });
  clearTimeout(likeToastMinuteur);
  likeToastMinuteur = setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 4000);
}
document.getElementById("dosBtn").addEventListener("click", e => { if (current) ouvrirDosMenu(current, e.currentTarget); });

function fermerDosMenu(){
  if (dosMenu.hidden) return;
  dosMenu.hidden = true;
  dosProd = null;
  render();   // compteurs des pastilles, icone de la ligne, contenu du dossier affiche
  syncCoeur();
}
dosMenu.addEventListener("change", e => {
  const d = dossier(e.target.dataset.mdos); if (!d || !dosProd) return;
  e.target.checked ? d.ids.add(dosProd.id) : d.ids.delete(dosProd.id);
  saveDossiers();
});
dosMenu.addEventListener("keydown", e => {
  if (e.target.id !== "dosMenuNew") return;
  if (e.key === "Escape") return fermerDosMenu();
  if (e.key !== "Enter" || !e.target.value.trim()) return;
  const d = creerDossier(e.target.value.trim());
  d.ids.add(dosProd.id);
  saveDossiers();
  peindreDosMenu();
  document.getElementById("dosMenuNew").focus();
});
document.addEventListener("click", e => {
  if (!dosMenu.hidden && !e.target.closest("#dosMenu") && !e.target.closest('[data-act="dossier"]')) fermerDosMenu();
});
addEventListener("keydown", e => { if (e.key === "Escape") fermerDosMenu(); });
addEventListener("scroll", () => { if (!dosMenu.hidden) fermerDosMenu(); }, { passive: true });

function viderFiltres(){
  S.proche = null;
  S.depuis = false;
  S.prod = null;
  S.suivis = false;
  S.qui = null;
  S.dossier = null;
  S.toplines = false;
  S.historyOnly = false;
  S.forYou = false;
  S.styles.clear();
  S.moods.clear();
  S.artists.clear();
  S.crateOnly = false;
}
/* Remet les trois jeux de boutons en accord avec l'etat, y compris ceux qu'on vient
   d'eteindre sans les avoir touches. */
function refletFiltres(){
  renderStyleChips();
  elMoods.querySelectorAll("[data-mood]").forEach(c =>
    c.setAttribute("aria-pressed", String(S.moods.has(c.dataset.mood))));
  crateBtn.setAttribute("aria-pressed", S.crateOnly);
  crateBtn.classList.toggle("on", S.crateOnly);
  toutesBtn.hidden = !(S.crateOnly || S.historyOnly || S.forYou || S.proche || S.depuis || S.prod || S.suivis || S.toplines);
  histBtn.setAttribute("aria-pressed", S.historyOnly);
  const suBtn = document.getElementById("suivisBtn");
  suBtn.setAttribute("aria-pressed", S.suivis);
  suBtn.classList.toggle("on", S.suivis);
  histBtn.classList.toggle("on", S.historyOnly);
  const ptBtn = document.getElementById("ptBtn");
  ptBtn.setAttribute("aria-pressed", S.forYou);
  ptBtn.classList.toggle("on", S.forYou);
  document.querySelectorAll("#artistes [data-artist]").forEach(c =>
    c.setAttribute("aria-pressed", String(S.artists.has(c.dataset.artist))));
}
/* L'adresse suit l'etat reel : un lien copie rouvre ce qu'on a sous les yeux. */
function majAdresse(){
  if (document.body.classList.contains("vue-accueil")) return;
  const p = new URLSearchParams();
  if (S.artists.size) p.set("artist", [...S.artists][0]);
  if (S.styles.size) p.set("style", [...S.styles][0]);
  if (S.moods.size)  p.set("mood",  [...S.moods][0]);
  if (S.crateOnly)   p.set("likes", "1");
  if (S.crateOnly && S.dossier) p.set("dossier", S.dossier);
  if (S.historyOnly) p.set("historique", "1");
  if (S.forYou)      p.set("pourtoi", "1");
  if (S.proche)      p.set("proche", S.proche);
  if (S.depuis)      p.set("nouveau", "1");
  if (S.prod)        p.set("prod", S.prod);
  if (S.suivis)      p.set("suivis", "1");
  if (S.toplines)    p.set("toplines", "1");
  if (S.suivis && S.qui) p.set("qui", S.qui);
  if (S.q)           p.set("q", S.q);
  if (S.sort !== "pertinence") p.set("sort", S.sort);
  const adr = faireAdresse(p);
  if (adr !== location.pathname + location.search) { history.replaceState({ vue: "prods" }, "", adr); mesurer(); }
  majTitre();
}

/* Un second clic sur le filtre actif le retire : c'est la seule facon de tout enlever. */
function choisirFiltre(appliquer, etaitActif){
  /* Dans les likes, un filtre trie tes likes au lieu de t'en faire sortir : on garde la
     vue et le dossier ouvert, seul le style, le mood ou l'artiste change. */
  const likes = S.crateOnly, dos = S.dossier;
  viderFiltres();
  if (likes) { S.crateOnly = true; S.dossier = dos; }
  if (!etaitActif) appliquer();
  refletFiltres();
  render();
  majAdresse();
  fermerMenus();
}

document.getElementById("styleQ").addEventListener("input", renderStyleChips);
elStyles.addEventListener("click", e => {
  const btn = e.target.closest("[data-style]"); if(!btn) return;
  const k = btn.dataset.style;
  document.getElementById("styleQ").value = "";   // le menu rouvre sur la liste complete
  choisirFiltre(() => S.styles.add(k), S.styles.has(k));
});
elMoods.addEventListener("click", e => {
  const btn = e.target.closest("[data-mood]"); if(!btn) return;
  const k = btn.dataset.mood;
  choisirFiltre(() => S.moods.add(k), S.moods.has(k));
});
document.getElementById("hot").addEventListener("click", e => {
  const b = e.target.closest("[data-hot]"); if(!b) return;
  const v = b.dataset.hot;
  document.getElementById("q").value = v; S.q = v; render();
});

document.getElementById("clearStyle").addEventListener("click", () => {
  S.styles.clear(); renderStyleChips(); render(); majAdresse();
});
document.getElementById("clearMood").addEventListener("click", () => {
  S.moods.clear(); elMoods.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed","false")); render(); majAdresse();
});

const bMin = document.getElementById("bpmMin"), bMax = document.getElementById("bpmMax"), fill = document.getElementById("fill");
/* Reconstruire la liste coute une image entiere : mesure faite, 35 images sautees
   sur 82 pendant un glissement, contre 0 sans rendu. Limiter le nombre d'appels ne
   suffisait pas — il faut n'en declencher aucun tant que la poignee bouge. Les
   reperes et les compteurs suivent quand meme, eux ne touchent pas a la liste. */
let bpmAttente = null;
function syncBpm(immediat){
  let lo = +bMin.value, hi = +bMax.value;
  if(lo > hi - 5){ if(document.activeElement === bMin) lo = hi - 5; else hi = lo + 5; bMin.value = lo; bMax.value = hi; }
  S.bpm = [lo,hi];
  const span = BMAX - BMIN;
  fill.style.left = ((lo-BMIN)/span*100)+"%";
  fill.style.width = ((hi-lo)/span*100)+"%";
  document.getElementById("rMin").textContent = lo+" BPM";
  document.getElementById("rMax").textContent = hi+" BPM";
  clearTimeout(bpmAttente);
  if (immediat){ render(); return; }
  majEntete(filtered());
  /* Filet : si « change » n'arrive pas (relachement hors de la poignee), on rend
     quand meme des que la poignee s'immobilise. */
  bpmAttente = setTimeout(render, 200);
}
bMin.addEventListener("input", () => syncBpm()); bMax.addEventListener("input", () => syncBpm());
/* au relachement, on garantit un dernier rendu exact sans attendre la temporisation */
bMin.addEventListener("change", () => syncBpm(true)); bMax.addEventListener("change", () => syncBpm(true));
document.getElementById("clearBpm").addEventListener("click", () => { bMin.value=BMIN; bMax.value=BMAX; syncBpm(true); });

let t;
/* Le bouton qui a lance la lecture garde l'anneau de chargement jusqu'au demarrage. */
let boutonLance = null;
document.addEventListener("click", e => {
  const b = e.target.closest("#playall,#profLire,#surprise,#surpriseAcc,.v-lire");
  if (!b) return;
  boutonLance?.classList.remove("lance"); b.classList.add("lance"); boutonLance = b;
}, true);
new MutationObserver(() => {
  if (boutonLance && !document.body.classList.contains("yt-charge")) { boutonLance.classList.remove("lance"); boutonLance = null; }
}).observe(document.body, { attributes: true, attributeFilter: ["class"] });

/* La recherche de l'en-tete est une nouvelle recherche : au premier caractere tape, les
   filtres de la page (artiste, style, beatmaker, likes, tempo…) partent. Sans ca, chercher
   « Ninho » depuis la page de Hamza ne cherchait que parmi les prods de Hamza. */
let rechercheNeuve = true;
const champQ = document.getElementById("q");
champQ.addEventListener("focus", () => { rechercheNeuve = true; });
champQ.addEventListener("input", e => {
  if (rechercheNeuve && e.target.value.trim()) {
    rechercheNeuve = false;
    viderFiltres();
    S.styles.clear(); S.moods.clear(); S.artists.clear();
    S.bpmSur = false; document.getElementById("bpmSur").checked = false;
    bMin.value = BMIN; bMax.value = BMAX; syncBpm(true);   // remet aussi la jauge du tempo
    refletFiltres();
    if (document.body.classList.contains("vue-accueil") || document.body.classList.contains("vue-studio")) montrerVue("prods", true, "?vue=prods");
  }
  clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; render(); majAdresse(); }, 120);
});

const crateBtn = document.getElementById("crateBtn");
const toutesBtn = document.getElementById("toutesBtn");
toutesBtn.addEventListener("click", () => {
  viderFiltres();
  refletFiltres();
  render();
  majAdresse();
});
const ptBtn = document.getElementById("ptBtn");
ptBtn.addEventListener("click", () => {
  const etaitActif = S.forYou;
  viderFiltres();
  S.forYou = !etaitActif;
  refletFiltres();
  render();
  if (document.body.classList.contains("vue-accueil"))
    montrerVue("prods", true, S.forYou ? "?pourtoi=1" : "?vue=prods");
  else majAdresse();
});
/* Depuis une ligne ou depuis le lecteur, y compris sur l'accueil. La lecture continue :
   on change la liste, pas la prod en cours. */
function voirProches(id){
  viderFiltres();
  S.proche = id;
  refletFiltres();
  render();
  if (document.body.classList.contains("vue-accueil")) montrerVue("prods", true, "?proche=" + encodeURIComponent(id));
  else {
    history.pushState({ vue: "prods" }, "", BASE + "?proche=" + encodeURIComponent(id)); majTitre(); mesurer();
    const haut = list.getBoundingClientRect().top + scrollY - 160;
    if (scrollY > haut) window.scrollTo({ top: Math.max(0, haut), behavior: "smooth" });
  }
}
document.getElementById("suivisBtn").addEventListener("click", () => {
  const etaitActif = S.suivis;
  viderFiltres();
  S.suivis = !etaitActif;
  refletFiltres();
  render();
  if (document.body.classList.contains("vue-accueil"))
    montrerVue("prods", true, S.suivis ? "?suivis=1" : "?vue=prods");
  else majAdresse();
});
const histBtn = document.getElementById("histBtn");
histBtn.addEventListener("click", () => {
  const etaitActif = S.historyOnly;
  viderFiltres();
  S.historyOnly = !etaitActif;
  refletFiltres();
  render();
  if (document.body.classList.contains("vue-accueil"))
    montrerVue("prods", true, S.historyOnly ? "?historique=1" : "?vue=prods");
  else majAdresse();
});
/* Effacer en deux temps : le premier clic demande confirmation, sans fenetre surgissante. */
const effHist = document.getElementById("effHist");
let effArme = null;
effHist.addEventListener("click", () => {
  if (!effArme) {
    effHist.textContent = "Confirmer l'effacement";
    effArme = setTimeout(() => { effArme = null; effHist.textContent = "Effacer l'historique"; }, 3000);
    return;
  }
  clearTimeout(effArme); effArme = null;
  HIST = []; majHistPos();
  VU = new Set();   // effacer l'historique remet aussi « Jamais écoutées » a zero
  try { localStorage.removeItem(HIST_KEY); localStorage.removeItem(VU_KEY); } catch (e) {}
  effHist.textContent = "Effacer l'historique";
  render();
});

crateBtn.addEventListener("click", () => {
  const etaitActif = S.crateOnly;
  viderFiltres();
  S.crateOnly = !etaitActif;
  refletFiltres();
  render();
  /* Sur l'accueil le catalogue est masque : filtrer sans y basculer n'affiche rien.
     On y emmene, avec la meme adresse que le lien « Tout voir » de la section likes. */
  if (document.body.classList.contains("vue-accueil"))
    montrerVue("prods", true, S.crateOnly ? "?likes=1" : "?vue=prods");
  else majAdresse();
});

document.getElementById("bpmSur").addEventListener("change", e => { S.bpmSur = e.target.checked; render(); });
(function noteTempo(){
  const n = BEATS.filter(b => b.bpmSur).length;
  document.getElementById("bpmSurN").textContent =
    `${n} prods sur ${BEATS.length} annoncent leur tempo. Pour les autres, la valeur affichée est une estimation, signalée par un ~.`;
})();

document.getElementById("sorts").addEventListener("click", e => {
  const b = e.target.closest("[data-sort]"); if(!b) return;
  S.sort = b.dataset.sort;
  document.querySelectorAll("#sorts button").forEach(x => x.setAttribute("aria-pressed", x === b));
  render();
  majAdresse();
});

document.getElementById("playall").addEventListener("click", () => {
  if (LAST.length) playFrom(LAST, 0);
});
/* « Surprends-moi » : une prod tiree au hasard, de preference jamais ecoutee, puis une
   file de 40 autres tirees pareil — « suivant » continue la surprise. Dans le catalogue
   il respecte les filtres affiches ; depuis l'accueil il puise dans tout le catalogue. */
function surprendre(source){
  const pool = source.filter(b => !DEAD.has(b.id) && b.id !== current?.id);
  const neufs = pool.filter(b => !VU.has(b.id));
  const base = neufs.length ? neufs : pool;
  if (!base.length) return;
  const tirage = base.slice();
  for (let i = tirage.length - 1; i > 0 && i >= tirage.length - 41; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tirage[i], tirage[j]] = [tirage[j], tirage[i]];
  }
  playFrom(tirage.slice(-41).reverse(), 0);
}
document.getElementById("surprise").addEventListener("click", () => surprendre(LAST));
document.getElementById("surpriseAcc").addEventListener("click", () => surprendre(BEATS));

/* pied de page : état réel du catalogue */
(function footStats(){
  const d = CAT.updatedAt ? new Date(CAT.updatedAt) : null;
  const when = d ? d.toLocaleDateString(LOCALE, { day:"numeric", month:"long", year:"numeric" }) : "—";
  const add = CAT.lastRun ? ` · +${CAT.lastRun.added} à la dernière passe` : "";
  const age = CAT.maxAgeMonths || 9;
  const styles = new Set(BEATS.map(b => b.style)).size;
  document.getElementById("footStats").innerHTML =
    `<b>${BEATS.length} prods</b> · ${styles} styles · mis à jour le ${when}${add}` +
    ` · ingestion automatique tous les 2 jours, rien de plus vieux que ${age} mois` +
    (CAT.artistMaxAgeMonths ? ` (jusqu'à ${CAT.artistMaxAgeMonths} mois pour compléter un artiste à ${CAT.artistMin || 20} type beats)` : "") +
    `, tout se lit ici sans quitter la page.`;

  /* Les parts sont calculees sur le catalogue affiche : figees dans le texte, elles
     seraient fausses des la prochaine ingestion. */
  const part = k => Math.round(BEATS.filter(b => b[k]).length / BEATS.length * 100);
  document.getElementById("footData").innerHTML =
    `Titres, beatmakers, durées et écoutes viennent de YouTube, relevés lors des passages automatiques. ` +
    `Le <b>tempo</b> (${part("bpmSur")}&nbsp;% des prods) et la <b>tonalité</b> (${part("keySur")}&nbsp;%) sont lus dans le titre ou la description ` +
    `quand le beatmaker les indique&nbsp;; sinon ils sont estimés d'après le style et s'affichent en gris, précédés d'un «&nbsp;~&nbsp;». ` +
    `Les <b>moods</b> sont déduits du texte de la vidéo, à défaut du style&nbsp;: des repères, pas une mesure.`;
})();

/* ============ barre de filtres ============
   Chaque famille est un bouton qui ouvre un menu. Le bouton porte la valeur active :
   on voit d'un coup d'oeil ce qui filtre, sans rien ouvrir. */
function poserTrig(id, libelle, couleur, actif){
  const b = document.getElementById(id);
  b.querySelector(".flbl").textContent = libelle;
  b.classList.toggle("on", !!actif);
  if (couleur) b.style.setProperty("--c", couleur); else b.style.removeProperty("--c");
}
function majBarre(){
  const st = [...S.styles][0], mo = [...S.moods][0], ar = [...S.artists][0];
  poserTrig("trigArtiste", ar ? ARTIST_NAME[ar] : "Artiste", ar ? cssVar(ARTIST_STYLE[ar]) : null, ar);
  // l'artiste choisi montre sa photo dans le bouton, a la place du point de couleur
  const tA = document.getElementById("trigArtiste"), ph = tA.querySelector(".fph"), url = ar ? photoArtiste(ar) : "";
  ph.hidden = !url;
  tA.classList.toggle("a-photo", !!url);
  if (url) { const petit = url.replace("1000x1000", "56x56"); if (ph.getAttribute("src") !== petit) ph.src = petit; }
  poserTrig("trigStyle", st ? STYLE_NAME[st] : "Style", st ? cssVar(st) : null, st);
  poserTrig("trigMood",  mo || "Mood", mo ? MOOD_TEINTE[mo] : null, mo);
  const bornes = S.bpm[0] > BMIN || S.bpm[1] < BMAX;
  const lib = bornes ? `${S.bpm[0]}–${S.bpm[1]} BPM${S.bpmSur ? " · vérifié" : ""}`
            : S.bpmSur ? "Tempo vérifié" : "Tempo";
  poserTrig("trigTempo", lib, null, bornes || S.bpmSur);
  const neuf = document.getElementById("trigNeuf");
  neuf.classList.toggle("on", S.neuf);
  neuf.setAttribute("aria-pressed", String(S.neuf));
  // dans l'historique il n'a pas de sens, et « Pour toi » ecarte deja tout ce qu'on a ecoute
  neuf.hidden = S.historyOnly || S.forYou || S.crateOnly;   // une prod likee a forcement ete ecoutee
  document.getElementById("clearAll").hidden =
    !(ar || st || mo || bornes || S.bpmSur || (S.neuf && !neuf.hidden));
}

/* Hauteur reelle de l'en-tete, pour que la barre se colle juste dessous. */
(function suivreEntete(){
  const top = document.querySelector(".top");
  const racine = document.documentElement.style;
  const poser = () => {
    const r = top.getBoundingClientRect();
    racine.setProperty("--hh", Math.round(r.height) + "px");
    racine.setProperty("--cw", Math.round(r.width) + "px");   // l'en-tete occupe toute la zone visible
    testerCollage();
  };
  poser();
  if (window.ResizeObserver) new ResizeObserver(poser).observe(top);
  // le panneau « En lecture » se colle sous la barre de filtres, pas sous l'en-tete
  const fbar = document.getElementById("fbar");
  const poserF = () => {
    const h = fbar.offsetHeight; if (h) racine.setProperty("--fbh", h + "px");
    racine.setProperty("--fbx", Math.round(fbar.getBoundingClientRect().left) + "px");   // bord gauche, pour la bande floue
  };
  poserF();
  if (window.ResizeObserver) new ResizeObserver(poserF).observe(fbar);
  addEventListener("resize", poserF);
  let cadre = 0;
  addEventListener("scroll", () => { if (!cadre) cadre = requestAnimationFrame(() => { cadre = 0; testerCollage(); }); }, { passive: true });
})();

/* La bande floue ne se montre que lorsque la barre est vraiment collee sous l'en-tete.
   Sur l'accueil la barre n'a pas de boite (vue masquee) : elle ne peut pas etre collee. */
function testerCollage(){
  const bar = document.getElementById("fbar"), top = document.querySelector(".top");
  const visible = bar.getClientRects().length > 0;
  bar.classList.toggle("collee",
    visible && scrollY > 0 && bar.getBoundingClientRect().top <= top.getBoundingClientRect().bottom + 0.5);
}

const elArtistes = document.getElementById("artistes"), artQ = document.getElementById("artQ");
function renderArtistChips(){
  const q = norm(artQ.value.trim());
  const liste = parPortee(LIVE_ARTISTS, a => nArtiste(a.id))
    .filter(a => dansPortee(nArtiste(a.id), S.artists.has(a.id)) && (!q || norm(a.name).includes(q)));
  document.getElementById("artN").textContent = PORTEE
    ? `${Object.keys(PORTEE.artist).filter(id => ARTIST_NAME[id]).length} dans tes likes` : `${LIVE_ARTISTS.length} artistes`;
  elArtistes.innerHTML = liste.map(a =>
    `<button class="chip${photoArtiste(a.id) ? " avec-ph" : ""}" data-artist="${esc(a.id)}" aria-pressed="${S.artists.has(a.id)}" style="--c:${cssVar(a.style)}">${photoArtiste(a.id)
      ? `<img class="ph" src="${esc(photoArtiste(a.id).replace("1000x1000", "56x56"))}" alt="" loading="lazy">` : '<span class="dot"></span>'}${esc(a.name)}<span class="n">${nArtiste(a.id)}</span></button>`).join("");
  document.getElementById("artVide").hidden = !!liste.length;
}
if (LIVE_ARTISTS.length) {
  document.getElementById("fitemArtiste").hidden = false;
  document.getElementById("artN").textContent = `${LIVE_ARTISTS.length} artistes`;
  renderArtistChips();
  artQ.addEventListener("input", renderArtistChips);
  // un artiste a la fois, comme style et mood : choisir remplace, recliquer retire
  elArtistes.addEventListener("click", e => {
    const btn = e.target.closest("[data-artist]"); if (!btn) return;
    const k = btn.dataset.artist;
    choisirFiltre(() => S.artists.add(k), S.artists.has(k));
    artQ.value = ""; renderArtistChips();
  });
}

const MENUS = [...document.querySelectorAll(".fitem[data-pop]")];
function fermerMenus(sauf){
  MENUS.forEach(m => {
    if (m === sauf) return;
    m.querySelector(".fmenu").hidden = true;
    m.querySelector(".ftrig").setAttribute("aria-expanded", "false");
  });
}
MENUS.forEach(m => {
  const trig = m.querySelector(".ftrig"), pop = m.querySelector(".fmenu");
  trig.addEventListener("click", () => {
    const ouvrir = pop.hidden;
    fermerMenus(m);
    pop.hidden = !ouvrir;
    trig.setAttribute("aria-expanded", ouvrir);
    // le champ prend la main a l'ouverture, sauf au doigt : le clavier masquerait la liste
    const champ = pop.querySelector(".fsearch");
    if (ouvrir && champ && matchMedia("(hover:hover)").matches) champ.focus();
  });
});
/* Clic ailleurs ou Echap : on referme. Un clic dans un menu ne le referme pas, sauf
   quand il valide un choix — choisirFiltre s'en charge. */
document.addEventListener("click", e => {
  if (!e.target.closest(".fitem") && e.target.isConnected) fermerMenus();
});
addEventListener("keydown", e => { if (e.key === "Escape") fermerMenus(); });

function poserNeuf(v){
  S.neuf = v;
  try { localStorage.setItem("findings.neuf", v ? "1" : "0"); } catch (e) {}
}
document.getElementById("trigNeuf").addEventListener("click", () => {
  poserNeuf(!S.neuf);
  fermerMenus();
  render();
});
document.getElementById("clearAll").addEventListener("click", () => {
  S.styles.clear(); S.moods.clear(); S.artists.clear();
  S.bpmSur = false;
  poserNeuf(false);
  document.getElementById("bpmSur").checked = false;
  bMin.value = BMIN; bMax.value = BMAX;
  refletFiltres();
  syncBpm(true);
  majAdresse();
  fermerMenus();
});

syncBpm(true);


/* ============ reprise entre les pages ============
   Changer de page détruit l'iframe : aucun lecteur ne survit à une navigation
   entre deux documents. On enregistre donc la prod et la seconde exacte avant
   de partir, et on reprend là au chargement suivant. L'interruption dure le
   temps du chargement, pas le temps d'un morceau. */
const REPRISE = "findings.reprise";
function memoriser(){
  if (!current) return;
  let t = 0, joue = false;
  try {
    if (player && player.getCurrentTime) t = player.getCurrentTime() || 0;
    if (player && player.getPlayerState) joue = player.getPlayerState() === 1;
  } catch (e) {}
  try { sessionStorage.setItem(REPRISE, JSON.stringify({ id: current.id, t, joue, ts: Date.now() })); } catch (e) {}
}
addEventListener("pagehide", memoriser);
addEventListener("beforeunload", memoriser);

/* ============ vue accueil : données d'affichage ============ */
const nf = n => n.toLocaleString(LOCALE);

/* ============ chiffres du héros ============ */
(function stats(){
  const prods = new Set(BEATS.map(b => b.prod)).size;
  const styles = new Set(BEATS.map(b => b.style)).size;
  const d = CAT.updatedAt ? new Date(CAT.updatedAt) : null;
  const maj = d ? d.toLocaleDateString(LOCALE, { day:"numeric", month:"short" }) : "—";
  const rows = [
    [nf(BEATS.length), "prods"],
    [styles, "styles"],
    [nf(prods), "beatmakers"],
    [maj, "mise à jour"]
  ];
  document.getElementById("stats").innerHTML =
    rows.map(([v,k]) => `<div class="stat"><span class="v">${esc(v)}</span><span class="k">${esc(k)}</span></div>`).join("");
})();

/* ============ gabarits de l'accueil ============ */
const ICO_LIRE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
const vignette = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
// carte de rangee qui defile
const carteRail = (b, sous) => `
  <a class="tile rcard" data-id="${b.id}" href="?play=${encodeURIComponent(b.id)}" style="--c:var(--s-${b.style})">
    <div class="art"><img src="${vignette(b.id)}" alt="" loading="lazy"><span class="go">${ICO_LIRE}</span></div>
    <p class="t" translate="no">${esc(b.title)}</p>
    <p class="s">${sous || esc(b.prod)}</p>
  </a>`;
// ligne de liste ou de classement
const ligneProd = (b, rang, fin) => `
  <a class="tile lrow" data-id="${b.id}" href="?play=${encodeURIComponent(b.id)}" style="--c:var(--s-${b.style})">
    ${rang ? `<span class="rang">${rang}</span>` : ""}
    <div class="art"><img src="${vignette(b.id)}" alt="" loading="lazy"><span class="go">${ICO_LIRE}</span></div>
    <div class="lr-txt">
      <p class="t" translate="no">${esc(b.title)}</p>
      <div class="s"><b>${esc(b.prod)}</b><span class="pill">${esc(STYLE_NAME[b.style] || b.style)}</span></div>
    </div>
    <span class="fin">${fin || ""}</span>
  </a>`;
// petite carte (grille de Pour toi)
/* Les petites affiches de « Pour toi » : meme DA que la grande, image plein cadre et texte
   pose sur un degrade sombre. */
const carteMiniV = b => `
  <a class="tile vmini" data-id="${b.id}" href="?play=${encodeURIComponent(b.id)}" style="--c:var(--s-${b.style})">
    <div class="art"><img src="https://i.ytimg.com/vi/${b.id}/maxresdefault.jpg" alt="" loading="lazy" onload="if(this.naturalWidth<=120){this.onload=null;this.classList.add('hq');this.src=this.src.replace('maxresdefault','hqdefault')}"><span class="go">${ICO_LIRE}</span></div>
    <div class="v-in"><span class="raison">Type beat ${esc(b.artists.length ? (ARTIST_NAME[b.artists[0]] || b.artists[0]) : (STYLE_NAME[b.style] || b.style))}</span><p class="t" translate="no">${esc(b.title)}</p><div class="s"><span class="pill">${esc(STYLE_NAME[b.style] || b.style)}</span><span>${esc(b.prod)}</span></div></div>
  </a>`;
const carteMini = b => `
  <a class="tile" data-id="${b.id}" href="?play=${encodeURIComponent(b.id)}" style="--c:var(--s-${b.style})">
    <div class="art"><img src="${vignette(b.id)}" alt="" loading="lazy"><span class="go">${ICO_LIRE}</span></div>
    <div class="body"><p class="t" translate="no">${esc(b.title)}</p><div class="s"><span class="pill">${esc(STYLE_NAME[b.style] || b.style)}</span><span>${esc(b.prod)}</span></div></div>
  </a>`;
/* Bandes : une section visible sur deux, recalcule quand une section apparait ou
   disparait (likes, abonnements, toplines n'existent pas pour tout le monde). */
function alternerBandes(){
  // « Pour toi » reste sans cadre : ses affiches se posent directement sur la page
  document.getElementById("vuePourToi")?.classList.remove("bande");
  [...document.querySelectorAll("#vueAccueil main > section.sec")].filter(x => !x.hidden && x.id !== "vuePourToi")
    .forEach((x, i) => x.classList.toggle("bande", i % 2 === 0));
}
(() => {
  const mo = new MutationObserver(alternerBandes);
  document.querySelectorAll("#vueAccueil main > section.sec").forEach(x => mo.observe(x, { attributes: true, attributeFilter: ["hidden"] }));
  alternerBandes();
})();
/* Fleches des rangees (ordinateur) : une page a la fois ; elles s'eteignent aux bouts. */
function brancherRangees(){
  document.querySelectorAll(".rail-wrap").forEach(w => {
    if (w.dataset.branche) return;
    w.dataset.branche = "1";
    const r = w.querySelector(".rail"), g = w.querySelector(".rail-nav.g"), d = w.querySelector(".rail-nav.d");
    const maj = () => { g.disabled = r.scrollLeft < 8; d.disabled = r.scrollLeft + r.clientWidth > r.scrollWidth - 8; };
    // une page exacte (largeur + un ecart) : la rangee retombe sur des cartes entieres
    const page = () => r.clientWidth + (parseFloat(getComputedStyle(r).columnGap) || 0);
    g.addEventListener("click", () => r.scrollBy({ left: -page(), behavior: "smooth" }));
    d.addEventListener("click", () => r.scrollBy({ left: page(), behavior: "smooth" }));
    r.addEventListener("scroll", maj, { passive: true });
    new ResizeObserver(maj).observe(r);
    maj();
  });
}

/* ============ dernières arrivées ============ */
/* les dix sorties les plus récentes, en classement : c'est aussi la file d'attente du lecteur */
const FRESH = BEATS.slice().sort((a,b) =>
  (b.published||"").localeCompare(a.published||"") || (b.addedAt||"").localeCompare(a.addedAt||"")
).slice(0, 10);

(function fresh(){
  const recent = FRESH;
  /* Meme DA que « Pour toi », autre forme : un ruban de grandes cartes numerotees, la
     miniature en plein cadre et un gros numero en contour, facon classement. */
  const quand = b => { const a = fmtAge(b.days); return /^aujourd/.test(a) ? "Sortie aujourd'hui" : a === "1 j" || a === "hier" ? "Sortie hier" : `Il y a ${a}`; };
  document.getElementById("fresh").innerHTML = recent.map((b, n) => `
    <a class="tile sortie" data-id="${b.id}" href="?play=${encodeURIComponent(b.id)}" style="--c:var(--s-${b.style})">
      <div class="art"><img src="https://i.ytimg.com/vi/${b.id}/maxresdefault.jpg" alt="" loading="lazy" onload="if(this.naturalWidth<=120){this.onload=null;this.classList.add('hq');this.src=this.src.replace('maxresdefault','hqdefault')}"></div>
      <span class="rang" aria-hidden="true">${String(n + 1).padStart(2, "0")}</span>
      <div class="v-in">
        <span class="raison">${estNouvelle(b) ? '<i class="neuf">Nouveau</i>' : ""}${esc(quand(b))}</span>
        <span class="t" translate="no">${esc(b.title)}</span>
        <span class="s"><span class="pill">${esc(STYLE_NAME[b.style] || b.style)}</span><span class="pr">${esc(b.prod)}</span><span>${b.bpmSur ? "" : "~"}${b.bpm} BPM</span></span>
      </div>
      <span class="go">${ICO_LIRE}</span>
    </a>`).join("");
  const dates = recent.map(b => b.published).filter(Boolean).sort();
  document.getElementById("freshSub").textContent =
    dates.length ? `La plus récente est sortie le ${new Date(dates[dates.length-1]+"T12:00:00Z").toLocaleDateString(LOCALE,{day:"numeric",month:"long"})}.` : "";
})();

/* ============ suggestions de recherche ============
   Cinq propositions tirées au sort à chaque chargement, et surtout de quatre
   natures différentes : un style, un mood, un beatmaker et deux artistes cités.
   Le but n'est pas de montrer le plus populaire — c'est de donner des pistes
   auxquelles on n'aurait pas pensé. */
(function suggestions(){
  const compter = liste => {
    const t = {};
    liste.forEach(v => { const k = (v || "").trim(); if (k.length > 2) t[k] = (t[k] || 0) + 1; });
    return t;
  };
  // on écarte ce qui n'apparaît qu'une fois : une seule prod derrière une
  // suggestion, c'est une impasse plutôt qu'une piste
  const refs   = Object.entries(compter(BEATS.flatMap(b => b.refs || []))).filter(([,n]) => n > 1).map(([r]) => r);
  const prods  = Object.entries(compter(BEATS.map(b => b.prod))).filter(([,n]) => n > 1).map(([p]) => p);
  const styles = [...new Set(BEATS.map(b => STYLE_NAME[b.style]).filter(Boolean))];
  const moods  = [...new Set(BEATS.flatMap(b => b.moods || []))];

  const piocher = (arr, n) => {
    const c = arr.slice(), out = [];
    while (c.length && out.length < n) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
    return out;
  };

  let choix = [...piocher(refs, 2), ...piocher(styles, 1), ...piocher(moods, 1), ...piocher(prods, 1)].filter(Boolean);
  choix = piocher(choix, choix.length);          // l'ordre aussi est tiré au sort
  if (choix.length < 3) choix = ["Werenoi", "amapiano", "sombre"];

  document.getElementById("hshot").innerHTML =
    choix.map(r => `<a href="?q=${encodeURIComponent(r)}" data-vue="prods">${esc(r)}</a>`).join("");

  /* L'invite se construit sous contrainte de longueur : un tirage peut sortir
     « Ndombolo / Coupé-décalé », et trois exemples de cette taille dépassent la
     largeur du champ — la fin serait coupée. On ajoute donc du plus court au
     plus long, tant que ça tient. */
  const BUDGET = 56;
  const parts = [];
  for (const c of choix.slice().sort((a, b) => a.length - b.length)) {
    const p = `\u00ab\u00a0${c}\u00a0\u00bb`;
    if (`Cherche ${[...parts, p].join(", ")}\u2026`.length > BUDGET) break;
    parts.push(p);
    if (parts.length === 3) break;
  }
  document.getElementById("hq").placeholder = parts.length
    ? `Cherche ${parts.join(", ")}\u2026`
    : "Cherche une prod, un artiste, un mood\u2026";
})();

/* ============ prods likées ============
   Les likes vivent dans le stockage local du navigateur : chaque visiteur ne
   voit que les siens, et rien ne remonte nulle part. La section reste masquée
   tant qu'il n'y en a aucun — une étagère vide n'apprend rien à personne. */
function calcLikes(){
  let ids = [];
  try {
    const brut = localStorage.getItem("findings.crate")
              || localStorage.getItem("prodyfind.crate")
              || localStorage.getItem("diggr.crate") || "[]";
    ids = JSON.parse(brut);
  } catch (e) { ids = []; }
  if (!Array.isArray(ids) || !ids.length) return [];
  const parId = Object.fromEntries(BEATS.map(b => [b.id, b]));
  // le plus récemment liké en premier
  return ids.slice().reverse().map(id => parId[id]).filter(Boolean).slice(0, 20);
}
let LIKED = calcLikes();

function majLikes(){
  LIKED = calcLikes();
  const section = document.getElementById("vueLikes");
  section.hidden = !LIKED.length;
  if (!LIKED.length) return;
  document.getElementById("likewall").innerHTML = LIKED.map(b => carteRail(b)).join("");
  const n = CRATE.size;
  document.getElementById("likesSub").textContent = n === 1 ? "Une prod mise de côté." : `${n} prods mises de côté.`;
  brancherRangees();
}
majLikes();

/* ============ « Pour toi » sur l'accueil ============
   Huit vignettes, mais la file du lecteur en compte quarante : ecoutees a la suite, elles
   restent sur des recommandations au lieu de s'arreter apres la huitieme. La selection ne
   bouge qu'a un like ou au retour sur l'accueil : pas de remaniement sous les yeux. */
let POURTOI = [];
/* Pourquoi cette prod en tete : l'artiste qu'on ecoute le plus parmi ceux qu'elle vise,
   sinon le style qu'on ecoute beaucoup, sinon c'est une decouverte. */
function raisonPourToi(b){
  const P = profilGout();
  if (!P.poids) return "La sélection du moment";
  let art = null, w = 0;
  for (const a of b.artists) { const x = P.artist.get(a) || 0; if (x > w) { w = x; art = a; } }
  if (art && w > .25) return `Parce que tu écoutes ${ARTIST_NAME[art] || art}`;
  if ((P.style.get(b.style) || 0) > .25) return `Parce que tu écoutes beaucoup de ${STYLE_NAME[b.style] || b.style}`;
  return "Une découverte pour toi";
}
function majPourToi(){
  const mur = document.getElementById("pourtoiwall");
  if (!mur) return;
  const candidats = BEATS.filter(b => !HIST_POS.has(b.id) && !CRATE.has(b.id));
  /* Quatre vignettes par style au plus : sur la page « Pour toi » le goût dominant peut
     occuper tout le haut de la liste, mais une vitrine de huit en a quelques-unes —
     un second goût n'y aurait jamais sa place. Les vignettes ouvrent la file, le reste suit. */
  const classees = classerPourToi(candidats).slice(0, 90), nb = {}, vitrine = [], suite = [];
  for (const b of classees) {
    if (vitrine.length < 5 && (nb[b.style] || 0) < 3) { vitrine.push(b); nb[b.style] = (nb[b.style] || 0) + 1; }
    else suite.push(b);
  }
  POURTOI = [...vitrine, ...suite].slice(0, 40);
  const [une, ...autres] = vitrine;
  mur.innerHTML = !une ? "" : `
    <a class="tile vcard" data-id="${une.id}" href="?play=${encodeURIComponent(une.id)}" style="--c:var(--s-${une.style})">
      <div class="art"><img src="https://i.ytimg.com/vi/${une.id}/maxresdefault.jpg" alt="" onload="if(this.naturalWidth<=120){this.onload=null;this.classList.add('hq');this.src=this.src.replace('maxresdefault','hqdefault')}"><span class="go">${ICO_LIRE}</span></div>
      <div class="v-in">
        <span class="raison">${esc(raisonPourToi(une))}</span>
        <p class="t" translate="no">${esc(une.title)}</p>
        <div class="s"><span class="pill">${esc(STYLE_NAME[une.style] || une.style)}</span><span>par ${esc(une.prod)}</span><span>${une.bpmSur ? "" : "~"}${une.bpm} BPM</span></div>
        <span class="v-lire">${ICO_LIRE.replace(/13/g, "15")}Écouter</span>
      </div>
    </a>
    <div class="vgrille">${autres.map(carteMiniV).join("")}</div>`;
  document.getElementById("pourtoiSub").textContent = resumeGout();
  peindreTuiles();
}
majPourToi();

/* Vitrine des abonnements : les dernieres sorties des artistes et beatmakers suivis,
   pas encore ecoutees d'abord. */
let SUIVIES = [];
function majSuivis(){
  const sec = document.getElementById("vueSuivis");
  if (!sec) return;
  sec.hidden = !nbSuivis();
  if (!nbSuivis()) return;
  // les nouveautes annoncees dans le sous-titre d'abord, puis le pas-encore-ecoute, puis le plus recent
  const liste = BEATS.filter(estSuivie).sort((a, b) =>
    (NOUVEAUX.has(b.id) - NOUVEAUX.has(a.id)) || (VU.has(a.id) - VU.has(b.id)) || a.days - b.days);
  SUIVIES = liste.slice(0, 40);
  const neufs = liste.filter(b => NOUVEAUX.has(b.id)).length, pasEcoutees = liste.filter(b => !VU.has(b.id)).length;
  document.getElementById("suivisSub").textContent = !liste.length ? "Rien pour l'instant."
    : neufs ? `${neufs} nouvelle${neufs > 1 ? "s" : ""} depuis ta visite · ${liste.length} prods en tout`
    : `${pasEcoutees} prod${pasEcoutees > 1 ? "s" : ""} pas encore écoutée${pasEcoutees > 1 ? "s" : ""} · ${liste.length} en tout`;
  // un avatar rond par personne suivie : la photo, sinon l'initiale sur la couleur de son style
  const rond = (img, nom, coul) => `<span class="rond" style="--c:${coul}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc((nom.replace(/^prod\.?\s*/i, "")[0] || "?").toUpperCase())}</span>`;
  const avatars = [...SUIVIS.artists].map(id => `<a class="avatar" href="${lienArtiste(id)}" data-vue="prods">${rond(photoArtiste(id).replace("1000x1000", "250x250"), ARTIST_NAME[id] || id, `var(--s-${ARTIST_STYLE[id]})`)}<span class="nm">${esc(ARTIST_NAME[id] || id)}</span></a>`)
    .concat([...SUIVIS.prods].map(p => { const b = BEATS.find(x => x.prod === p); return `<a class="avatar" href="${lienProd(p)}" data-vue="prods">${rond(avatarDe(p), p, b ? `var(--s-${b.style})` : "var(--thumb)")}<span class="nm">${esc(p)}</span></a>`; }));
  document.getElementById("suivisChips").innerHTML = avatars.join("");
  document.getElementById("suiviswall").innerHTML = SUIVIES.slice(0, 6).map(b => ligneProd(b, 0, NOUVEAUX.has(b.id) ? '<span class="new">nouveau</span>' : fmtAge(b.days))).join("");
  brancherRangees();
  peindreTuiles();
}
majSuivis();

/* Les prods sur lesquelles on a pose sa voix. Une vignette rouvre la prod avec le studio. */
let TOPLINES = [];
function majToplines(){
  const sec = document.getElementById("vueToplines");
  if (!sec) return;
  TOPLINES = BEATS.filter(b => TOPLINE_N.has(b.id));
  sec.hidden = !TOPLINES.length;
  if (!TOPLINES.length) return;
  const prises = [...TOPLINE_N.values()].reduce((a, n) => a + n, 0);
  document.getElementById("toplinesSub").textContent = `${prises} prise${prises > 1 ? "s" : ""} sur ${TOPLINES.length} prod${TOPLINES.length > 1 ? "s" : ""}`;
  if (document.body.classList.contains("vue-studio")) majProjets();
  document.getElementById("toplinewall").innerHTML = TOPLINES.slice(0, 20).map(b => carteRail(b, `<span class="tl-n">🎙 ${TOPLINE_N.get(b.id)}</span> ${esc(b.prod)}`)).join("");
  brancherRangees();
  peindreTuiles();
}
document.getElementById("toplinewall").addEventListener("click", e => {
  const t = e.target.closest(".tile"); if (!t) return;
  e.preventDefault();
  const i = TOPLINES.findIndex(b => b.id === t.dataset.id);
  if (i < 0) return;
  playFrom(TOPLINES, i);
  montrerVue("studio", true, `studio/?beat=${encodeURIComponent(TOPLINES[i].id)}`);
});



/* ============ choix de la langue ============
   Le choix est retenu ; la page se recharge pour tout reprendre dans la nouvelle langue. */
(function choixLangue(){
  const btn = document.getElementById("langBtn"), menu = document.getElementById("langMenu");
  if (!btn) return;
  btn.textContent = LANG.toUpperCase();
  menu.innerHTML = Object.entries(LANGUES).map(([k, nom]) => `<button role="menuitemradio" aria-checked="${k === LANG}" data-lang="${k}">${nom}<span>${k.toUpperCase()}</span></button>`).join("");
  const fermer = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", e => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); });
  document.addEventListener("click", e => { if (!e.target.closest("#langBox")) fermer(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") fermer(); });
  menu.addEventListener("click", e => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    if (b.dataset.lang === LANG) { fermer(); return; }
    allerLangue(b.dataset.lang);
  });
  // ?lang= sur une page publiee : on rejoint la meme page dans cette langue
  const q = new URLSearchParams(location.search).get("lang");
  if (PAGE_LANGUE && LANGUES[q] && q !== LANG) { allerLangue(q, true); return; }
  // une fois, si le navigateur parle une autre langue que la page : on le propose, sans rediriger
  let choisi = null; try { choisi = localStorage.getItem("findings.lang"); } catch (e) {}
  const nav = (navigator.languages && navigator.languages[0] || navigator.language || "").slice(0, 2).toLowerCase();
  if (PAGE_LANGUE && !choisi && LANGUES[nav] && nav !== LANG) {
    const TXT = { fr: ["Cette page existe aussi en français.", "Passer en français"], en: ["This page is also available in English.", "Switch to English"], es: ["Esta página también está disponible en español.", "Cambiar a español"] }[nav];
    const bandeau = document.createElement("div");
    bandeau.className = "lang-bandeau"; bandeau.setAttribute("translate", "no"); bandeau.setAttribute("role", "status");
    bandeau.innerHTML = `<span>${TXT[0]}</span><button data-oui>${TXT[1]}</button><button data-non aria-label="✕">✕</button>`;
    document.body.appendChild(bandeau);
    bandeau.addEventListener("click", e => {
      if (e.target.closest("[data-oui]")) allerLangue(nav);
      else if (e.target.closest("[data-non]")) { try { localStorage.setItem("findings.lang", LANG); } catch (e) {} bandeau.remove(); }
    });
  }
})();
/* La meme page dans une autre langue : /artiste/hamza/ ↔ /en/artiste/hamza/. En local
   (page source, sans langue de page), on recharge simplement dans la langue choisie. */
function allerLangue(k, remplacer){
  try { localStorage.setItem("findings.lang", k); } catch (e) {}
  if (!PAGE_LANGUE) { location.reload(); return; }
  const racine = PAGE_LANGUE !== "fr" && BASE.endsWith(`/${PAGE_LANGUE}/`) ? BASE.slice(0, -(PAGE_LANGUE.length + 1)) : BASE;
  const reste = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : "";
  const p = new URLSearchParams(location.search); p.delete("lang");
  const url = racine + (k === "fr" ? "" : k + "/") + reste + (p.toString() ? "?" + p : "");
  remplacer ? location.replace(url) : (location.href = url);
}

/* ============ page Studio : « Tes projets » ============
   Un projet par prod (plus le projet libre) : on le rouvre, on le renomme, on le
   supprime. Tout reste sur l'appareil du visiteur, comme les prises. */
let PROJETS = [];
async function majProjets(){
  const sec = document.getElementById("stProjets");
  if (!sec) return;
  let projets = [], prises = [];
  try { projets = await PRISES_DB.tousProjets(); } catch (e) {}
  try { prises = await PRISES_DB.toutes(); } catch (e) {}
  const n = new Map(), der = new Map();
  prises.forEach(p => { n.set(p.prod, (n.get(p.prod) || 0) + 1); der.set(p.prod, Math.max(der.get(p.prod) || 0, p.cree || 0)); });
  const par = new Map(projets.map(pr => [pr.prod, pr]));
  n.forEach((_, prod) => { if (!par.has(prod)) par.set(prod, { prod }); });   // prises posees hors du studio
  PROJETS = [...par.values()]
    .filter(pr => (n.get(pr.prod) || 0) > 0 || pr.nom)
    .filter(pr => pr.prod === "libre" || BY_ID.has(pr.prod))
    .map(pr => ({ id: pr.prod, nom: pr.nom || "", prises: n.get(pr.prod) || 0, maj: Math.max(pr.maj || 0, der.get(pr.prod) || 0) }))
    .sort((a, b) => b.maj - a.maj);
  sec.hidden = !PROJETS.length;
  if (!PROJETS.length) return;
  document.getElementById("stProjetsSub").textContent = `${PROJETS.length} projet${PROJETS.length > 1 ? "s" : ""}, gardé${PROJETS.length > 1 ? "s" : ""} sur cet appareil.`;
  const ouvertId = typeof STUDIO !== "undefined" && STUDIO.ouvert() ? (lireAdresse(location.href).get("beat") || "libre") : null;
  document.getElementById("stListe").innerHTML = PROJETS.map(pr => {
    const b = BY_ID.get(pr.id), libre = pr.id === "libre";
    const titre = pr.nom || (libre ? "Projet libre" : b.title);
    const jours = pr.maj ? (Date.now() - pr.maj) / 864e5 : null;
    const quand = jours == null ? "" : jours < 1 ? "modifié aujourd'hui" : `modifié il y a ${fmtAge(jours)}`;
    return `<div class="st-proj${pr.id === ouvertId ? " ouvert" : ""}" data-id="${esc(pr.id)}" style="--c:${libre ? "var(--accent)" : `var(--s-${b.style})`}">
      <button class="st-vg" data-pa="ouvrir" aria-label="Ouvrir ${esc(titre)}">${libre ? `<span class="st-libre">${'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>'}</span>` : `<img src="https://i.ytimg.com/vi/${b.id}/mqdefault.jpg" alt="" loading="lazy">`}</button>
      <div class="st-txt">
        <span class="raison">${pr.prises} prise${pr.prises > 1 ? "s" : ""}${quand ? ` · ${quand}` : ""}${pr.id === ouvertId ? ' · <i>ouvert</i>' : ""}</span>
        <span class="t" translate="no" title="${esc(titre)}">${esc(pr.nom ? titre : T(titre))}</span>
        <span class="s">${libre ? "Ta prod, tes voix" : `${pr.nom ? `sur « ${esc(b.title)} » · ` : ""}par ${esc(b.prod)}`}</span>
      </div>
      <div class="st-acts">
        <button class="st-ouvrir" data-pa="ouvrir">Ouvrir</button>
        <button class="st-ic" data-pa="renommer" aria-label="Renommer" title="Renommer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg></button>
        <button class="st-ic danger" data-pa="suppr" aria-label="Supprimer" title="Supprimer le projet"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
      </div>
    </div>`;
  }).join("");
}
window.addEventListener("findings:projets", () => majProjets());
document.getElementById("stListe").addEventListener("click", e => {
  const el = e.target.closest("[data-pa]"); if (!el) return;
  const carte = el.closest(".st-proj"), id = carte.dataset.id, pr = PROJETS.find(x => x.id === id);
  if (!pr) return;
  const b = BY_ID.get(id), titre = pr.nom || (id === "libre" ? "Projet libre" : b.title);
  if (el.dataset.pa === "ouvrir") {
    montrerVue("studio", true, id === "libre" ? "studio/" : `studio/?beat=${encodeURIComponent(id)}`);
    document.getElementById("studioHote").scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (el.dataset.pa === "suppr") {
    if (confirm(`Supprimer le projet « ${titre} » ? Ses ${pr.prises} prise${pr.prises > 1 ? "s" : ""} et la prod importée seront effacées de cet appareil.`)) STUDIO.supprimerProjet(id);
  } else if (el.dataset.pa === "renommer") {
    const t = carte.querySelector(".t");
    const champ = document.createElement("input");
    champ.className = "st-champ"; champ.value = titre; champ.maxLength = 60; champ.setAttribute("aria-label", "Nom du projet");
    t.replaceWith(champ); champ.focus(); champ.select();
    let fini = false;
    const finir = garder => {
      if (fini) return; fini = true;
      const v = champ.value.trim();
      if (garder && v !== titre) STUDIO.renommerProjet(id, v === (id === "libre" ? "Projet libre" : b.title) ? "" : v);
      else majProjets();
    };
    champ.addEventListener("keydown", ev => { if (ev.key === "Enter") finir(true); else if (ev.key === "Escape") finir(false); });
    champ.addEventListener("blur", () => finir(true));
  }
});

/* ============ mur des artistes ============
   Memes cartes que les styles : mosaique des pochettes les plus ecoutees, teinte du
   style de l'artiste. Seuls les plus fournis sont visibles, le reste se deplie. */
(function murArtistes(){
  if (!LIVE_ARTISTS.length) return;
  document.getElementById("vueArtistes").hidden = false;
  document.getElementById("navArtistes").hidden = false;
  const par = {};
  BEATS.forEach(b => b.artists.forEach(id => (par[id] = par[id] || []).push(b)));
  Object.values(par).forEach(l => l.sort((a, b) => b.views - a.views));
  const coul = id => (STYLE_META.find(x => x.key === ARTIST_STYLE[id]) || {}).color || "#888";
  document.getElementById("artcloud").innerHTML = LIVE_ARTISTS.map(a => {
    const lot = par[a.id] || [];
    const photo = photoArtiste(a.id).replace("1000x1000", "500x500");
    // sans photo Deezer : la pochette de son type beat le plus ecoute
    const img = photo || (lot[0] ? `https://i.ytimg.com/vi/${lot[0].id}/hqdefault.jpg` : "");
    const n = {};
    lot.forEach(b => n[b.style] = (n[b.style] || 0) + 1);
    const styles = Object.keys(n).sort((x, y) => n[y] - n[x]).slice(0, 2).map(k => STYLE_NAME[k] || k);
    /* Meme DA, autre forme : des portraits a la verticale, la photo de l'artiste en plein
       cadre, son nom en grand. */
    return `<a class="aport" href="${lienArtiste(a.id)}" data-vue="prods" style="--c:${esc(coul(a.id))}">
      <div class="art">${img ? `<img src="${esc(img)}" alt="" loading="lazy"${photo ? "" : ' class="yt"'}>` : `<span class="ini">${esc(a.name[0])}</span>`}</div>
      <div class="v-in">
        <span class="raison"><i class="pt"></i>${lot.length} type beat${lot.length > 1 ? "s" : ""}</span>
        <span class="t">${esc(a.name)}</span>
        ${styles.length ? `<span class="s">${esc(styles.join(" · "))}</span>` : ""}
      </div>
      <span class="go"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h12"/><path d="m12 5 7 7-7 7"/></svg></span>
    </a>`;
  }).join("");
  document.getElementById("artistesSub").textContent =
    `${LIVE_ARTISTS.length} artistes, du plus fourni au plus rare : fais défiler.`;
  brancherRangees();
})();

/* ============ nuage de styles ============ */
(function cloud(){
  // chaque style est illustré par ses prods les plus écoutées : quatre pochettes
  // en mosaïque, une seule quand le genre n'en a pas encore assez
  const par = {};
  BEATS.forEach(b => (par[b.style] = par[b.style] || []).push(b));
  Object.values(par).forEach(l => l.sort((a,b) => b.views - a.views));

  const live = STYLE_META.filter(s => par[s.key]).sort((a,b) => par[b.key].length - par[a.key].length);
  /* Meme DA que « Pour toi » : une affiche par style, la pochette de sa prod la plus
     ecoutee en plein cadre, texte pose sur un degrade sombre. Le style le plus fourni
     ouvre le mur en grand. */
  const FLECHE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h12"/><path d="m12 5 7 7-7 7"/></svg>';
  const visesPar = lot => {
    const n = {};
    lot.forEach(b => b.artists.forEach(a => { if (ARTIST_NAME[a]) n[a] = (n[a] || 0) + 1; }));
    return Object.keys(n).sort((x, y) => n[y] - n[x]).slice(0, 3).map(a => ARTIST_NAME[a]);
  };
  document.getElementById("cloud").innerHTML = live.map((s, i) => {
    const lot = par[s.key], une = lot[0], vises = visesPar(lot), grand = i === 0;
    const nb = `${lot.length} prod${lot.length > 1 ? "s" : ""}`;
    return `<a class="spost${grand ? " grand" : ""}" href="${lienStyle(s.key)}" data-vue="prods" style="--c:${esc(s.color)}">
      <div class="art"><img src="https://i.ytimg.com/vi/${une.id}/maxresdefault.jpg" alt="" loading="lazy" onload="if(this.naturalWidth<=120){this.onload=null;this.classList.add('hq');this.src=this.src.replace('maxresdefault','hqdefault')}"></div>
      <div class="v-in">
        <span class="raison"><i class="pt"></i>${grand ? `Le plus fourni · ${nb}` : nb}</span>
        <span class="t">${esc(s.label)}</span>
        ${vises.length ? `<span class="s">${grand ? "Type beats " : ""}${esc(vises.join(", "))}</span>` : ""}
        ${grand ? `<span class="v-lire">Voir les prods ${FLECHE}</span>` : ""}
      </div>
      ${grand ? "" : `<span class="go">${FLECHE}</span>`}
    </a>`;
  }).join("");
  document.getElementById("stylesSub").textContent =
    `${live.length} styles remplis, du plus fourni au plus rare.`;

  // au-delà de dix-huit genres le mur devient un couloir : on replie le reste
  const SEUIL = 15, btn = document.getElementById("moreStyles");   // la grande + 14 : trois rangees pleines sur six colonnes
  let ouvert = false;
  function replier(){
    document.querySelectorAll("#cloud .spost").forEach((el, i) => el.classList.toggle("repliee", !ouvert && i >= SEUIL));
    btn.textContent = ouvert ? "Replier" : `Voir les ${live.length - SEUIL} autres styles`;
  }
  if (live.length > SEUIL) {
    btn.hidden = false;
    btn.addEventListener("click", () => { ouvert = !ouvert; replier(); });
    replier();
  }
})();

/* ============ affiches des moods ============
   Sobres, a la maniere des categories d'Apple Music et des lavis de l'accueil : un fond
   profond, deux ou trois taches de lumiere tres floutees dans les teintes du mood, un seul
   symbole au trait fin. Le nom, en grand, est pose par la carte (HTML), pas par l'image. */
const AFFICHES = (() => {
  // [couleur, x, y, rayon] : les taches, de la plus grande a la plus petite
  const P = {
    "agressif":     { fond:"#2A050B", taches:[["#E8263C",70,30,130],["#FF7A3D",270,190,110],["#8E0A20",250,20,90]],
                      glyphe:'<path d="M12 2.8c.6 3.4 4.8 5.4 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.2 1-3.6 2.1-4.6.3 1.7 1.1 2.8 2.2 3.2-.1-3.2-.6-5.8.5-8.6z"/>' },
    "sombre":       { fond:"#090C17", taches:[["#34427A",60,170,140],["#6474B8",250,40,90],["#1C2444",280,190,90]],
                      glyphe:'<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>' },
    "mélancolique": { fond:"#16202E", taches:[["#5B7A9E",240,160,140],["#9DBCE0",50,30,100],["#2E4563",40,190,90]],
                      glyphe:'<path d="M7 15a4 4 0 0 1-.4-8 5.6 5.6 0 0 1 10.6.6A3.7 3.7 0 0 1 17.4 15z"/><path d="M8.5 18.2 7.6 20.6M12.5 18.2l-.9 2.4M16.5 18.2l-.9 2.4"/>' },
    "énergique":    { fond:"#3D1500", taches:[["#FF9F0A",230,60,140],["#FFD60A",60,180,100],["#FF4F1F",40,20,90]],
                      glyphe:'<path d="M13.2 2.6 5.2 13.6h6.1l-1.1 7.8 8-11h-6.1z"/>' },
    "chill":        { fond:"#062A24", taches:[["#2FB873",60,40,130],["#5EE6C9",260,170,110],["#0F6E57",270,20,80]],
                      glyphe:'<path d="M2.8 8.6c2.3 0 2.3-1.8 4.6-1.8S9.7 8.6 12 8.6s2.3-1.8 4.6-1.8 2.3 1.8 4.6 1.8M2.8 13c2.3 0 2.3-1.8 4.6-1.8S9.7 13 12 13s2.3-1.8 4.6-1.8 2.3 1.8 4.6 1.8M2.8 17.4c2.3 0 2.3-1.8 4.6-1.8s2.3 1.8 4.6 1.8 2.3-1.8 4.6-1.8 2.3 1.8 4.6 1.8"/>' },
    "solaire":      { fond:"#3B1D06", taches:[["#FFC531",150,190,150],["#FF8A3D",280,30,100],["#FFE88A",30,40,80]],
                      glyphe:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4 7 7M17 17l1.6 1.6M5.4 18.6 7 17M17 7l1.6-1.6"/>' },
    "sensuel":      { fond:"#2B0618", taches:[["#E0457E",240,50,140],["#FFA3C7",50,180,100],["#8E1446",40,30,90]],
                      glyphe:'<path d="M8 3h8l-.4 5a3.6 3.6 0 0 1-7.2 0z"/><path d="M12 11.6v8.4M8.6 20.4h6.8"/>' },
    "planant":      { fond:"#120828", taches:[["#8A55F5",70,150,140],["#5B8CFF",260,40,100],["#3B1B7C",280,190,90]],
                      glyphe:'<circle cx="12" cy="12" r="4.4"/><ellipse cx="12" cy="12" rx="10" ry="3.4" transform="rotate(-20 12 12)"/>' },
    "nostalgique":  { fond:"#2A1208", taches:[["#C97B52",60,40,130],["#F3C9A2",260,180,100],["#7E3A26",270,30,90]],
                      glyphe:'<rect x="3" y="6" width="18" height="12" rx="2.2"/><circle cx="9" cy="11.4" r="1.8"/><circle cx="15" cy="11.4" r="1.8"/><path d="M10.8 11.4h2.4M7.4 18l1.4-2.8h6.4l1.4 2.8"/>' },
    "cinématique":  { fond:"#071315", taches:[["#D9A43A",250,160,140],["#2B7480",50,40,115],["#F2D58A",40,190,70]],
                      glyphe:'<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M7.2 5v14M16.8 5v14M3 9.6h4.2M3 14.4h4.2M16.8 9.6H21M16.8 14.4H21"/>' },
    "festif":       { fond:"#0A1638", taches:[["#2FC6D8",60,160,130],["#7B5CFF",250,40,110],["#FF5E9C",280,190,70]],
                      glyphe:'<path d="M12 3v3.6M12 17.4V21M3 12h3.6M17.4 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5"/><circle cx="12" cy="12" r="1.6"/>' }
  };
  const out = {};
  for (const [m, p] of Object.entries(P)) out[m] = u =>
    `<svg class="affiche" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
      `<defs><filter id="${u}f" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="40"/></filter></defs>` +
      `<rect width="300" height="200" fill="${p.fond}"/>` +
      `<g filter="url(#${u}f)">${p.taches.map(([c, x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${[.95, .8, .7][i]}"/>`).join("")}</g>` +
      `<g transform="translate(250 18) scale(1.45)" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".9">${p.glyphe}</g>` +
    `</svg>`;
  return out;
})();

/* ============ mur des moods ============ */
(function moods(){
  /* Une couleur par ambiance — choisie pour ce qu'elle évoque, pas reprise des
     styles : le sombre tire vers l'encre, le solaire vers le jaune franc. */
  const TEINTES = MOOD_TEINTE;   // source unique : voir la declaration pres de MOODS
  const par = {};
  BEATS.forEach(b => (b.moods || []).forEach(m => (par[m] = par[m] || []).push(b)));
  const live = Object.keys(TEINTES).filter(m => par[m]);
  live.forEach(m => par[m].sort((a,b) => b.views - a.views));
  live.sort((a,b) => par[b].length - par[a].length);

  /* Meme DA que « Pour toi » et « Par style » : notre affiche en plein cadre, sur-titre
     en capitales, nom en gras, les styles ou on la trouve le plus. L'ambiance la plus
     fournie ouvre le mur en grand, sur deux colonnes. */
  const FLECHE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h12"/><path d="m12 5 7 7-7 7"/></svg>';
  const stylesDe = lot => {
    const n = {};
    lot.forEach(b => n[b.style] = (n[b.style] || 0) + 1);
    return Object.keys(n).sort((x, y) => n[y] - n[x]).slice(0, 3).map(k => STYLE_NAME[k] || k);
  };
  document.getElementById("moodwall").innerHTML = live.map((m, i) => {
    const lot = par[m], cover = lot[0], grand = i === 0, st = stylesDe(lot);
    const nb = `${lot.length} prod${lot.length > 1 ? "s" : ""}`;
    // l'affiche cale son pictogramme en haut a droite, meme sur la grande carte etiree
    const art = AFFICHES[m] ? AFFICHES[m]("af" + i).replace('preserveAspectRatio="xMidYMid slice"', `preserveAspectRatio="${grand ? "xMaxYMin" : "xMidYMid"} slice"`)
      : `<img src="https://i.ytimg.com/vi/${cover.id}/mqdefault.jpg" alt="" loading="lazy">`;
    return `<a class="spost humeur${grand ? " grand" : ""}" href="?mood=${encodeURIComponent(m)}" data-vue="prods" style="--c:${TEINTES[m]}">
      <div class="art">${art}</div>
      <div class="v-in">
        <span class="raison"><i class="pt"></i>${grand ? `La plus fournie · ${nb}` : nb}</span>
        <span class="t">${esc(m[0].toUpperCase() + m.slice(1))}</span>
        ${st.length ? `<span class="s">Surtout ${esc(st.join(", "))}</span>` : ""}
        ${grand ? `<span class="v-lire">Voir les prods ${FLECHE}</span>` : ""}
      </div>
    </a>`;
  }).join("");
  document.getElementById("moodsSub").textContent =
    `${live.length} ambiances, déduites du titre et de la description de chaque prod.`;
})();

/* ============ les deux vues ============
   Un seul document, donc un seul lecteur : passer de l'accueil au catalogue ne
   recharge rien et n'interrompt pas le son. L'adresse suit quand même, pour que
   les liens restent partageables et que le bouton « retour » fonctionne. */
const vAccueil = document.getElementById("vueAccueil");
const vProds = document.querySelector("main.shell");

const vStudio = document.getElementById("vueStudio");
function montrerVue(nom, pousser = true, params = ""){
  const studio = nom === "studio", accueil = !studio && nom !== "prods";
  vAccueil.hidden = !accueil;
  vProds.hidden = accueil || studio;
  vStudio.hidden = !studio;
  document.body.classList.toggle("vue-accueil", accueil);
  document.body.classList.toggle("vue-studio", studio);
  if (pousser) {
    const u = new URL(params || (studio ? "studio/" : "?vue=prods"), document.baseURI);
    const url = accueil ? BASE : u.pathname + u.search;
    if (url !== location.pathname + location.search) history.pushState({ vue: nom }, "", url);
  }
  // la page Studio monte le studio dans la page ; la quitter le referme (le projet est garde)
  if (typeof STUDIO !== "undefined") {
    if (studio) { STUDIO.page(true, lireAdresse(location.href).get("beat")); majProjets(); }
    else if (STUDIO.ouvert()) STUDIO.page(false);
  }
  majTitre(); if (pousser) mesurer();
  if (!accueil) window.scrollTo({ top: 0, behavior: "instant" });
  else if (typeof majPourToi === "function") { majPourToi(); majSuivis(); majToplines(); }   // ce qu'on vient d'ecouter change la selection
  testerCollage();   // un changement de vue ne declenche pas toujours un evenement de defilement
}

/* Les liens internes ne rechargent pas la page : ils changent de vue. */
document.addEventListener("click", e => {
  const a = e.target.closest('a[data-vue]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const href = new URL(a.getAttribute("href"), document.baseURI).href;
  if (a.dataset.vue !== "studio") appliquerParams(lireAdresse(href));
  montrerVue(a.dataset.vue, true, href);
});

/* La recherche du héros bascule sur le catalogue sans quitter la page. */
document.querySelector('form[data-recherche]')?.addEventListener("submit", e => {
  e.preventDefault();
  const v = document.getElementById("hq").value.trim();
  document.getElementById("q").value = v;
  S.q = v;
  render();
  montrerVue("prods", true, v ? "?q=" + encodeURIComponent(v) : "?vue=prods");
});

addEventListener("popstate", () => {
  const p = lireAdresse(location.href);
  if (p.get("studio") === "1") { montrerVue("studio", false); return; }
  appliquerParams(p);
  montrerVue(p.toString() ? "prods" : "accueil", false);
});

/* Les tuiles de l'accueil alimentent la file d'attente du lecteur unique. */
function brancherTuiles(id, liste){
  document.getElementById(id)?.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest(".tile"); if (!a) return;
    e.preventDefault();
    const l = liste();
    const i = l.findIndex(b => b.id === a.dataset.id);
    if (i < 0) return;
    (current && current.id === l[i].id) ? togglePlay() : playFrom(l, i);
  });
}
brancherTuiles("fresh", () => FRESH);
brancherTuiles("likewall", () => LIKED);
brancherTuiles("pourtoiwall", () => POURTOI);
brancherTuiles("suiviswall", () => SUIVIES);

/* L'état de lecture se lit aussi sur les tuiles, pas seulement dans la liste. */
function peindreTuiles(){
  document.querySelectorAll(".tile").forEach(t => {
    const on = !!current && t.dataset.id === current.id;
    t.classList.toggle("playing", on);
    const g = t.querySelector(".go svg");
    if (g) g.innerHTML = (on && !S.paused)
      ? '<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>'
      : '<path d="M8 5.5v13l11-6.5z"/>';
  });
}

/* ============ liens entrants ============
   L'accueil envoie ici avec un style, un tri, une recherche ou une prod précise. */
function appliquerParams(p, reprendreLecture = false){
  const style = p.get("style"), sort = p.get("sort"), q = p.get("q"), play = p.get("play");
  const mood = p.get("mood"), likes = p.get("likes"), artist = p.get("artist");
  /* Changer de vue repart de l'adresse et de rien d'autre : sans ce nettoyage, le style
     choisi avant restait actif et venait se cumuler au filtre de la vue d'arrivee. */
  viderFiltres();
  document.getElementById("q").value = q || "";
  S.q = q || "";
  if (style && STYLE_NAME[style]) S.styles.add(style);
  if (sort && ["pertinence","recent","bpm"].includes(sort)) {
    S.sort = sort;
    document.querySelectorAll("#sorts button").forEach(x => x.setAttribute("aria-pressed", x.dataset.sort === sort));
  }
  if (mood && MOODS.includes(mood)) S.moods.add(mood);
  if (artist && ARTIST_NAME[artist]) S.artists.add(artist);
  S.crateOnly = likes === "1" && CRATE.size > 0;
  S.historyOnly = p.get("historique") === "1" && !S.crateOnly;
  if (S.crateOnly && dossier(p.get("dossier"))) S.dossier = p.get("dossier");
  S.forYou = p.get("pourtoi") === "1" && !S.crateOnly && !S.historyOnly;
  if (BY_ID.has(p.get("proche")) && !S.crateOnly && !S.historyOnly && !S.forYou) S.proche = p.get("proche");
  S.depuis = p.get("nouveau") === "1" && !S.crateOnly && !S.historyOnly && !S.forYou && !S.proche;
  if (p.get("prod") && BEATS.some(b => b.prod === p.get("prod"))) S.prod = p.get("prod");
  S.suivis = p.get("suivis") === "1" && !S.crateOnly && !S.historyOnly && !S.forYou && !S.proche && !S.depuis;
  if (S.suivis && /^[ap]:/.test(p.get("qui") || "")) S.qui = p.get("qui");
  S.toplines = p.get("toplines") === "1" && !S.crateOnly && !S.historyOnly && !S.forYou && !S.suivis;
  refletFiltres();
  render();
  if (play) {
    const i = LAST.findIndex(b => b.id === play);
    if (i >= 0) playFrom(LAST, i);
    else { const b = BEATS.find(x => x.id === play); if (b) playFrom([b], 0); }
    return;
  }

  /* Reprise : uniquement au chargement du document. Depuis la fusion des deux pages,
     changer de vue ne detruit plus l'iframe — la relancer ici repartait de la position
     enregistree au dernier vrai depart de la page, donc en arriere. */
  if (!reprendreLecture) return;
  let d = null;
  try { d = JSON.parse(sessionStorage.getItem(REPRISE) || "null"); } catch (e) {}
  if (!d || !d.id || Date.now() - d.ts > 120000) return;
  const b = BEATS.find(x => x.id === d.id);
  if (!b) return;
  repriseT = d.t || 0; repriseJoue = !!d.joue;
  const i = LAST.findIndex(x => x.id === b.id);
  i >= 0 ? playFrom(LAST, i) : playFrom([b], 0);
}

/* ============ démarrage ============
   L'adresse décide de la vue : nue, c'est l'accueil ; porteuse d'un filtre,
   d'une recherche ou d'une prod, c'est le catalogue. */
(function demarrer(){
  const p = lireAdresse(location.href);
  const versStudio = p.get("studio") === "1";
  const versProds = !versStudio && (p.get("vue") === "prods" || ["style","sort","q","mood","likes","play","artist","historique","pourtoi","proche","nouveau","prod","suivis","toplines"].some(k => p.get(k)));
  document.getElementById("seoPre")?.remove();   // le contenu pre-rendu cede la place a l'application
  appliquerParams(p, true);
  const vue = versStudio ? "studio" : versProds ? "prods" : "accueil";
  history.replaceState({ vue }, "", location.pathname + location.search);
  // le studio (studio.js) se charge apres ce script : on le monte une fois pret
  if (versStudio) { montrerVue("studio", false); }
  else montrerVue(vue, false);
})();
