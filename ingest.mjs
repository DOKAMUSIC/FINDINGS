#!/usr/bin/env node
/**
 * FINDINGS — ingestion de nouvelles prods.
 *
 *   node ingest.mjs                   # ajoute jusqu'à 3 prods par style
 *   node ingest.mjs --per-style=6     # plus large
 *   node ingest.mjs --dry-run         # montre ce qui serait ajouté, n'écrit rien
 *   node ingest.mjs --prune-only      # nettoie le catalogue sans rien chercher
 *   node ingest.mjs --chans-only      # photos, noms et abonnés des chaînes des beatmakers
 *   node ingest.mjs --styles=trap,afro # limite la récolte à certains styles
 *   node ingest.mjs --recheck=0       # saute le contrôle des prods déjà en place
 *
 * Trois garanties, dans l'ordre d'importance :
 *   1. écoutable sur FINDINGS  — chaque prod est vérifiée « playableInEmbed » avant d'entrer ;
 *   2. fraîche              — date de publication réelle, 9 mois maximum (--max-age) ;
 *   3. variée               — une trentaine de styles balayés à chaque passage.
 *
 * Par défaut le script lit les résultats de recherche publics de YouTube.
 * Si YOUTUBE_API_KEY est définie, il utilise l'API YouTube Data v3 — plus stable.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(DIR, "catalog.js");
const API_KEY = process.env.YOUTUBE_API_KEY || null;

const arg = (n, d) => {
  const f = process.argv.find(a => a.startsWith(`--${n}=`));
  return f ? f.split("=")[1] : d;
};
const PER_STYLE = parseInt(arg("per-style", "3"), 10);
const MAX_AGE_MONTHS = parseFloat(arg("max-age", "9"));
const MAX_AGE_DAYS = Math.round(MAX_AGE_MONTHS * 30.44);
/* Exception a la fraicheur : un artiste sans assez de type beats recents peut etre
   complete avec des prods jusqu'a cet age — seulement jusqu'a l'objectif, et seulement
   tant que l'offre recente manque. Au-dela, les plus fraiches reprennent la place. */
const ARTIST_MAX_AGE_MONTHS = parseFloat(arg("artist-max-age", "18"));
const ARTIST_MAX_AGE_DAYS = Math.round(ARTIST_MAX_AGE_MONTHS * 30.44);
let AGE_RECHERCHE = MAX_AGE_DAYS;   // fenetre de la recherche par API, elargie pour les artistes a completer
const MAX_PER_STYLE = parseInt(arg("cap", "48"), 10);   // plafond par style dans le catalogue
/* Au-delà d'un certain succès, une prod n'a plus rien d'une trouvaille : elle a
   déjà été prise par des centaines de rappeurs. Le plafond garde le catalogue
   du côté du digging. */
const MAX_VIEWS = parseInt(arg("max-views", "800000"), 10);
const ONLY = (arg("styles", "") || "").split(",").filter(Boolean);
/* Recherche par artiste : « hamza type beat » plutot que « trap type beat ».
   per-artist   nouvelles prods par artiste et par passage
   artist-cap   plafond par artiste dans le catalogue, a part du plafond par style :
                sinon une prod Hamza de cinq mois serait evincee par n'importe quel
                trap generique plus recent, et la categorie se viderait toute seule. */
const PER_ARTIST = parseInt(arg("per-artist", "2"), 10);
const MAX_PER_ARTIST = parseInt(arg("artist-cap", "25"), 10);   // au-dessus du plus fourni a l'etiquetage (Asake, 22) : la categorie ne retire rien
/* Objectif par artiste : tant qu'il en a moins, chaque passage va chercher la
   difference, avec plusieurs formulations — une seule page de resultats plafonnait
   vers 6 prods. Au-dela, le passage se contente de per-artist nouveautes. */
const MIN_PER_ARTIST = parseInt(arg("artist-min", "20"), 10);
/* Budget de la passe artistes, en minutes. Remplir 170 artistes a 20 prods prend des
   heures : le passage de nuit s'arrete au budget et reprend la ou il en est au suivant,
   en servant d'abord les artistes les moins fournis. 0 = sans limite. */
const ARTIST_BUDGET_MIN = parseFloat(arg("artist-budget", "25"));
const ARTISTS_ONLY = process.argv.includes("--artists-only");
// --only-artists=jul,naps : ne traite que ces identifiants (completer des nouveaux sans refaire les 170 autres)
const ONLY_ARTISTS = (arg("only-artists", "") || "").split(",").filter(Boolean);
const NO_ARTISTS = process.argv.includes("--no-artists");
const DRY = process.argv.includes("--dry-run");
const PRUNE_ONLY = process.argv.includes("--prune-only");
const CHANS_ONLY = process.argv.includes("--chans-only");
// --achats : rattrapage des liens d'achat sur les prods deja en catalogue (une lecture par prod)
const ACHATS_ONLY = process.argv.includes("--achats");   // seulement les profils des beatmakers

/* ---------- configuration des styles ----------
   key      identifiant stocké dans le catalogue
   label    nom affiché
   color    couleur de la pastille dans l'interface (injectée dans index.html)
   bpm/keys fourchettes de repli quand le titre ne dit rien                        */
const STYLES = [
  /* — rap US / FR — */
  { key:"trap", label:"Trap", color:"#FF7A3D", bpm:[130,150], keys:["Am","Dm","Fm","Gm","Cm","C#m","F#m","Ebm","Bbm"],
    q:["trap type beat 2026","hard trap type beat"], fr:["instru rap trap 2026","type beat rap francais"] },
  { key:"drill", label:"Drill", color:"#5B7CFF", bpm:[138,146], keys:["Fm","Gm","Am","Bm","C#m","Ebm"],
    q:["uk drill type beat 2026","ny drill type beat"], fr:["instru drill fr 2026"] },
  { key:"sexydrill", label:"Sexy drill", color:"#FF9ECF", bpm:[136,146], keys:["Am","Bm","Dm","Fm","Gm"],
    q:["sexy drill type beat 2026","jersey drill type beat"], fr:[] },
  { key:"boombap", label:"Boom bap", color:"#E3B13C", bpm:[82,95], keys:["Am","Dm","Em","Fm","Gm","Cm","Bm","Ebm"],
    q:["boom bap type beat 2026","old school hip hop type beat"], fr:["instru boom bap francais"] },
  { key:"jazzrap", label:"Jazz rap", color:"#C9A227", bpm:[78,94], keys:["Am","Dm","Em","Cm","Fm","Bbm"],
    q:["jazz rap type beat 2026","jazzy hip hop type beat"], fr:[] },
  { key:"lofi", label:"Lo-fi", color:"#8FA37E", bpm:[70,88], keys:["Am","Cm","Dm","Em","Fm","G"],
    q:["lofi type beat 2026","lo-fi hip hop beat 2026"], fr:[] },
  { key:"soul", label:"Soul / sample", color:"#D9825F", bpm:[80,98], keys:["Am","Cm","Dm","Eb","Fm","Bbm"],
    q:["soul sample type beat 2026","sample drill type beat"], fr:[] },
  { key:"westcoast", label:"West coast", color:"#FFD166", bpm:[88,102], keys:["Am","Dm","Gm","Cm","Bbm"],
    q:["west coast type beat 2026","g funk type beat"], fr:[] },
  { key:"detroit", label:"Detroit", color:"#F2A65A", bpm:[100,112], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["detroit type beat 2026","flint type beat"], fr:[] },
  { key:"memphis", label:"Memphis", color:"#7D5BA6", bpm:[130,146], keys:["Am","Cm","Em","Fm","Gm"],
    q:["memphis type beat 2026","horrorcore type beat"], fr:[] },
  { key:"cloud", label:"Cloud rap", color:"#9FB2FF", bpm:[124,146], keys:["Am","Dm","Fm","Gm","Bbm","Ebm","C#m"],
    q:["cloud rap type beat 2026","dreamy trap type beat"], fr:[] },
  { key:"plugg", label:"Plugg / PluggnB", color:"#A0E7E5", bpm:[124,142], keys:["Am","Bm","Dm","Fm","Gm","C#m"],
    q:["plugg type beat 2026","pluggnb type beat"], fr:[] },
  { key:"newjazz", label:"New jazz", color:"#7AE582", bpm:[128,144], keys:["Am","Dm","Fm","Gm","Ebm"],
    q:["new jazz type beat 2026","xan jazz type beat"], fr:[] },
  { key:"rage", label:"Rage", color:"#FF3D71", bpm:[144,164], keys:["Am","Cm","Fm","Gm","C#m"],
    q:["rage type beat 2026","opium type beat"], fr:[] },
  { key:"phonk", label:"Phonk", color:"#9B5BE0", bpm:[130,158], keys:["Am","Cm","Em","Fm","Gm"],
    q:["phonk type beat 2026","brazilian phonk type beat"], fr:[] },
  { key:"emorap", label:"Emo rap / guitare", color:"#C77DFF", bpm:[128,152], keys:["Am","Bm","Em","F#m","C#m"],
    q:["emo rap type beat 2026","guitar type beat 2026"], fr:[] },
  { key:"hyperpop", label:"Hyperpop", color:"#FF7AF5", bpm:[140,165], keys:["Am","C","Eb","F#m","Bm"],
    q:["hyperpop type beat 2026","digicore type beat"], fr:[] },

  /* — R&B / pop — */
  { key:"rnb", label:"R&B", color:"#EC5FA6", bpm:[68,92], keys:["Ab","Db","Eb","C","Fm","Bbm","Gm"],
    q:["rnb type beat 2026","r&b soul type beat"], fr:["instru rnb francais"] },
  { key:"trapsoul", label:"Trap soul", color:"#B65C9B", bpm:[70,86], keys:["Am","Bbm","Cm","Ebm","Fm","G#m"],
    q:["trapsoul type beat 2026","bryson tiller type beat"], fr:[] },
  { key:"pop", label:"Pop", color:"#FFB3C1", bpm:[95,120], keys:["C","D","F","G","Am","Em"],
    q:["pop type beat 2026","pop rnb type beat"], fr:["instru pop urbaine 2026"] },

  /* — Afrique — */
  { key:"afro", label:"Afro", color:"#2FBF71", bpm:[98,110], keys:["Am","Cm","Dm","Fm","Gm","Bm","F#m"],
    q:["afrobeat type beat 2026","afro rnb type beat"], fr:["instru afro fr 2026"] },
  { key:"afrohouse", label:"Afro house", color:"#17A398", bpm:[118,126], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["afro house type beat 2026","3 step type beat"], fr:[] },
  { key:"amapiano", label:"Amapiano", color:"#B9D63F", bpm:[108,116], keys:["Am","Bm","Cm","Dm","Fm","Gm","Ebm"],
    q:["amapiano type beat 2026","private school amapiano beat"], fr:[] },
  { key:"alte", label:"Alté", color:"#5FD6A0", bpm:[96,112], keys:["Am","Cm","Dm","Em","Fm"],
    q:["alte type beat 2026","afro fusion type beat"], fr:[] },

  /* — Caraïbes / latino — */
  { key:"dancehall", label:"Dancehall", color:"#F6C445", bpm:[96,108], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["dancehall type beat 2026","afro dancehall type beat"], fr:[] },
  { key:"shatta", label:"Shatta / Bouyon", color:"#FF6B35", bpm:[100,112], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["shatta type beat 2026","bouyon type beat"], fr:["instru shatta 2026"] },
  { key:"kompa", label:"Kompa / Zouk", color:"#6BCBFF", bpm:[92,108], keys:["Am","Cm","Dm","Fm","Gm","Bbm"],
    q:["kompa gouyad type beat 2026","zouk type beat"], fr:["instru kompa 2026"] },
  { key:"reggaeton", label:"Reggaeton", color:"#F1544B", bpm:[88,100], keys:["Am","Bm","Cm","Dm","Fm","Gm"],
    q:["reggaeton type beat 2026","perreo type beat"], fr:[] },
  { key:"latintrap", label:"Latin trap", color:"#FF4D7E", bpm:[128,142], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["latin trap type beat 2026","trap latino type beat"], fr:[] },
  { key:"corridos", label:"Corridos", color:"#A16B36", bpm:[90,110], keys:["Am","Em","Dm","Gm","Cm","G","C"],
    q:["corridos tumbados type beat 2026","sierreño type beat","corrido bélico type beat"], fr:[] },
  { key:"dembow", label:"Dembow", color:"#E0533D", bpm:[112,124], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["dembow type beat 2026"], fr:[] },
  { key:"bailefunk", label:"Baile funk", color:"#00D084", bpm:[128,136], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["baile funk type beat 2026","funk brasileiro type beat"], fr:[] },

  /* — club UK / Europe — */
  { key:"jersey", label:"Jersey club", color:"#2FC6D8", bpm:[132,142], keys:["Am","Bm","Dm","Eb","Db","Fm","Gm"],
    q:["jersey club type beat 2026","philly club type beat"], fr:[] },
  { key:"grime", label:"Grime", color:"#4CC9F0", bpm:[138,144], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["grime type beat 2026","140 grime instrumental 2026"], fr:[] },
  { key:"ukgarage", label:"UK garage", color:"#48BFE3", bpm:[128,138], keys:["Am","Cm","Dm","Fm","Gm","Bbm"],
    q:["uk garage type beat 2026","2 step type beat"], fr:[] },
  { key:"club", label:"Club / House", color:"#59E0C5", bpm:[122,132], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["club type beat 2026","house type beat 2026"], fr:[] },
/* — ajouts — */
  { key:"driftphonk", label:"Drift phonk", color:"#7B61FF", bpm:[140,160], keys:["Am","Cm","Em","Fm","Gm"],
    q:["drift phonk type beat 2026","brazilian drift phonk type beat"], fr:[] },
  { key:"jerk", label:"Jerk", color:"#FF5CA8", bpm:[130,146], keys:["Am","Bm","Dm","Fm","Gm"],
    q:["jerk type beat 2026","new jerk type beat"], fr:[] },
  { key:"crunk", label:"Crunk", color:"#C2410C", bpm:[135,155], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["crunk type beat 2026","snap type beat"], fr:[] },
  { key:"trapmetal", label:"Trap metal / rock", color:"#8B1E3F", bpm:[140,170], keys:["Am","Em","F#m","C#m","Bm"],
    q:["trap metal type beat 2026","rock type beat 2026"], fr:[] },
  { key:"sadpiano", label:"Piano triste", color:"#8D9EC6", bpm:[70,95], keys:["Am","Cm","Dm","Em","Fm","Bbm"],
    q:["sad piano type beat 2026","emotional piano type beat"], fr:["instru piano triste 2026"] },
  { key:"synthwave", label:"Synthwave", color:"#F72585", bpm:[100,120], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["synthwave type beat 2026","retrowave type beat"], fr:[] },
  { key:"dnb", label:"Drum & bass", color:"#06D6A0", bpm:[165,175], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["drum and bass type beat 2026","jungle type beat 2026"], fr:[] },
  { key:"afroswing", label:"Afroswing", color:"#3DBE7A", bpm:[98,108], keys:["Am","Cm","Dm","Fm","Gm","Bm"],
    q:["afroswing type beat 2026","uk afrobeats type beat"], fr:[] },
  { key:"gqom", label:"Gqom", color:"#4D908E", bpm:[120,128], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["gqom type beat 2026","south african house type beat"], fr:[] },
  { key:"ndombolo", label:"Ndombolo / Coupé-décalé", color:"#F9A03F", bpm:[110,128], keys:["Am","C","Dm","F","G"],
    q:["ndombolo type beat 2026","coupe decale type beat"], fr:["instru coupe decale 2026"] },
  { key:"tarraxo", label:"Tarraxo", color:"#B388EB", bpm:[88,100], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["tarraxo type beat 2026","tarraxinha type beat"], fr:[] },
  { key:"bachata", label:"Bachata / Salsa", color:"#EF476F", bpm:[125,140], keys:["Am","Bm","Dm","Em","Gm"],
    q:["bachata type beat 2026","salsa type beat 2026"], fr:[] },
  { key:"cumbia", label:"Cumbia / Guaracha", color:"#FFC43D", bpm:[95,130], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["cumbia type beat 2026","guaracha type beat"], fr:[] },
  { key:"desi", label:"Desi / Punjabi", color:"#F4A259", bpm:[95,140], keys:["Am","Cm","Dm","Fm","Gm"],
    q:["desi hip hop type beat 2026","punjabi type beat 2026"], fr:[] },
  { key:"kpop", label:"K-pop", color:"#FF8FAB", bpm:[100,130], keys:["C","Am","Dm","F","G","Em"],
    q:["kpop type beat 2026","korean type beat 2026"], fr:[] },
  { key:"gospel", label:"Gospel", color:"#E9C46A", bpm:[70,105], keys:["C","Eb","F","G","Am","Bbm"],
    q:["gospel type beat 2026","worship type beat 2026"], fr:[] }
];
const STYLE_BY_KEY = Object.fromEntries(STYLES.map(s => [s.key, s]));

/* ---------- artistes de reference ----------
   Les noms les plus cites en « type beat » dans chaque style. C'est la seule liste a
   modifier pour ajouter ou retirer un artiste : la page la relit dans le catalogue.
   Chaque artiste n'est rattache qu'a un style, sinon la meme requete tournerait deux
   fois. Forme longue : { n:"Nom", a:["variante"], no:["homonyme a ecarter"] }.     */
const ARTISTS_BY_STYLE = {
  trap:       ["Travis Scott",{ n:"Future", no:["future bass","future funk","future garage"] },"Lil Baby","21 Savage","Gunna","Ninho","Werenoi","Hamza","Booba","PLK"],
  drill:      ["Central Cee","Pop Smoke","Headie One","Fivio Foreign","Kay Flock","SDM","Gazo","Freeze Corleone","Zola"],
  sexydrill:  ["Cash Cobain","Ice Spice","Kyle Richh","Bizzy Banks"],
  boombap:    [{ n:"Joey Bada$$", a:["joey badass"] },"J. Cole",{ n:"Nas", no:["lil nas"] },"Westside Gunn","Alpha Wann","Nekfeu"],
  jazzrap:    ["Nujabes","MF DOOM","Earl Sweatshirt","Kendrick Lamar"],
  lofi:       ["Mac Miller","Joji","J Dilla"],
  soul:       ["Kanye West","Freddie Gibbs","Conway The Machine"],
  westcoast:  ["YG","Nipsey Hussle","Snoop Dogg","Dr. Dre"],
  detroit:    ["Babyface Ray","Veeze","Tee Grizzley","BabyTron"],
  memphis:    ["Three 6 Mafia","Key Glock","Pooh Shiesty","Young Dolph"],
  cloud:      ["Yung Lean","Bladee",{ n:"A$AP Rocky", a:["asap rocky"] },"Josman","SCH","Damso"],
  plugg:      ["Summrs",{ n:"Autumn!", a:["autumn"] },"Kankan",{ n:"Pi'erre Bourne", a:["pierre bourne"] }],
  newjazz:    ["Ken Carson","Destroy Lonely","Homixide Gang"],
  rage:       ["Playboi Carti","Yeat","Trippie Redd","Lancey Foux"],
  phonk:      ["DVRST","Ghostface Playa","Soudiere"],
  emorap:     ["Lil Peep","Juice WRLD",{ n:"XXXTENTACION", a:["xxxtentacion","xxx"] },"The Kid LAROI","iann dior"],
  hyperpop:   ["Glaive","Ericdoa","100 gecs"],
  rnb:        ["SZA","Brent Faiyaz","Daniel Caesar","Summer Walker","The Weeknd"],
  trapsoul:   ["Bryson Tiller","PARTYNEXTDOOR","6LACK","Drake","Tory Lanez"],
  pop:        ["Billie Eilish","Justin Bieber","Dua Lipa","Aya Nakamura"],
  afro:       ["Burna Boy","Wizkid","Rema","Asake","Tiakola","Tayc"],
  afrohouse:  ["Black Coffee"],
  amapiano:   ["Kabza De Small",{ n:"Tyla", no:["tyla yaweh"] },"Uncle Waffles","Focalistic"],
  alte:       ["Omah Lay","Tems","Cruel Santino"],
  dancehall:  ["Vybz Kartel","Popcaan","Skillibeng","Shenseea","Masicka"],
  shatta:     [{ n:"Kalash", no:["kalash criminel"] },"Meryl","Maureen"],
  kompa:      [{ n:"Joé Dwèt Filé", a:["joe dwet file"] }],
  reggaeton:  ["Bad Bunny","Tainy","J Balvin","Feid","Karol G","Rauw Alejandro","Myke Towers"],
  latintrap:  ["Anuel AA",{ n:"Eladio Carrión", a:["eladio carrion"] },"Arcángel","Ozuna"],
  dembow:     ["El Alfa","Rochy RD","Tokischa"],
  bailefunk:  ["Anitta","MC Ryan SP","MC Cabelinho"],
  jersey:     ["Bandmanrill","Lil Uzi Vert"],
  grime:      ["Skepta","Stormzy","JME","Kano"],
  ukgarage:   ["PinkPantheress","Craig David","Sammy Virji"],
  driftphonk: ["Kordhell","PlayaPhonk"],
  jerk:       ["Xaviersobased","Nettspend"],
  crunk:      ["Lil Jon"],
  trapmetal:  ["Ghostemane","Scarlxrd","Bones"],
  synthwave:  ["Kavinsky"],
  dnb:        ["Nia Archives","Chase & Status"],
  afroswing:  ["J Hus","Kojo Funds","NSG"],
  gqom:       ["DJ Lag","Babes Wodumo"],
  ndombolo:   ["Fally Ipupa","Ferre Gola",{ n:"Innoss'B", a:["innossb","innoss b"] }],
  tarraxo:    ["C4 Pedro","Kaysha"],
  bachata:    ["Romeo Santos","Prince Royce","Aventura"],
  // « Divine » ecarte : trop souvent le nom du morceau (« DIVINE Asake x Omah Lay type beat »)
  desi:       ["Sidhu Moose Wala","AP Dhillon","Karan Aujla"],
  kpop:       ["BLACKPINK","BTS","NewJeans","Stray Kids"],
  gospel:     ["Kirk Franklin"]
};
// « A$AP Rocky », « asap rocky », « ÁSAP ROCKY » : une seule forme de comparaison
const normArt = t => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\$/g, "s").replace(/[^a-z0-9]+/g, " ").trim();
const slug = t => normArt(t).replace(/ /g, "-");
/* Francophones et latinos/hispanophones : deux blocs a part, pour les completer sans fouiller
   les 48 styles. Comme au-dessus, un artiste n'est rattache qu'a son style principal.
   Volontairement absents : les noms qui sont aussi des mots courants (Loud, Fave, Mora…
   « Fave type beat » nommerait n'importe quoi), le bruit coute plus que l'oubli.            */
const ARTISTS_FR = {
  trap:      ["Jul","Naps","Leto","Niska","Lacrim","Dinos","Vald","Koba LaD",{ n:"Heuss l'Enfoiré", a:["heuss"] },"Kaaris","Maes","Jok'Air","Alonzo","Mister You","Imen Es","Sadek","Lefa","Gradur","Soso Maness","TIF","Danyl","Ino Casablanca","Zamdane"],
  drill:     ["Ziak","4Keus"],
  cloud:     ["PNL","Laylow",{ n:"Roméo Elvis", no:["romeo santos"] }],
  boombap:   ["Orelsan","Rohff","Rim'K","Isha",{ n:"Caballero & JeanJass", a:["caballero jeanjass"] }],
  jazzrap:   ["Oxmo Puccino"],
  pop:       ["Lomepal",{ n:"GIMS", a:["maitre gims"] },{ n:"Videoclub", a:["video club"] }],
  afro:      ["Soolking","Dadju","Franglish","Naza","Vegedream",{ n:"Theodora", a:["théodora"] }],
  trapsoul:  ["Bramsito","ZKR"],
  rnb:       ["Ronisia"],
  plugg:     ["55ASKY"]
};
const ARTISTS_LATINO = {
  reggaeton: ["Daddy Yankee","Don Omar",{ n:"Wisin & Yandel", a:["wisin yandel"] },"Nicky Jam","Maluma","Sech","Jhay Cortez","Lunay","Quevedo","Ryan Castro","Blessd","Kapo","Manuel Turizo","Chencho Corleone",{ n:"Zion & Lennox", a:["zion lennox"] },"De La Ghetto","Dalex","Justin Quiles","Becky G","Natti Natasha","Young Miko","Ovy on the Drums","María Becerra","Gonzy"],
  latintrap: ["Duki","Bizarrap","Khea","Trueno","Neo Pistea","Wos","Paulo Londra","Nicki Nicole","Cazzu","Ysy A","Tiago PZK","Lit Killah","Milo J","Pailita","Pablo Chill-E","Brray","Bryant Myers",{ n:"Álvaro Díaz", a:["alvaro diaz"] },{ n:"Ñengo Flow", a:["nengo flow"] },"Morad",{ n:"Beny Jr", a:["benyjr","beny junior"] },"Rels B","Bejo","Kaydy Cain","Gera MX"],
  corridos:  ["Peso Pluma","Junior H","Natanael Cano","Fuerza Regida","Eslabon Armado","Gabito Ballesteros","Tito Double P","Luis R Conriquez","Chino Pacas","Iván Cornejo","Netón Vega","Óscar Maydon","Grupo Frontera","Yahritza y Su Esencia"],
  pop:       ["Rosalía","C. Tangana","Shakira","Camilo","Emilia"],
  dembow:    ["Yailin La Más Viral","Chimbala","Lápiz Conciente","Mozart La Para","Ceky Viciny"],
  bachata:   ["Grupo Extra","Luis Vargas","Raulin Rodriguez","Anthony Santos"],
  cumbia:    ["Los Ángeles Azules","Kumbia Kings"]
};
for (const extra of [ARTISTS_FR, ARTISTS_LATINO])
  for (const [style, liste] of Object.entries(extra)) (ARTISTS_BY_STYLE[style] = ARTISTS_BY_STYLE[style] || []).push(...liste);

const ARTISTS = Object.entries(ARTISTS_BY_STYLE).flatMap(([style, liste]) =>
  liste.map(x => {
    const o = typeof x === "string" ? { n:x } : x;
    return { id: slug(o.n), name: o.n, style,
             forms: [...new Set([o.n, ...(o.a || [])].map(normArt))],
             not: (o.no || []).map(normArt) };
  }));
const ARTIST_BY_ID = Object.fromEntries(ARTISTS.map(a => [a.id, a]));
{ // garde-fou : un style inconnu ou un doublon casserait la categorie en silence
  const inconnus = ARTISTS.filter(a => !STYLE_BY_KEY[a.style]).map(a => a.style);
  const doublons = ARTISTS.map(a => a.id).filter((id, i, t) => t.indexOf(id) !== i);
  if (inconnus.length || doublons.length) throw new Error(`artistes : style(s) inconnu(s) ${inconnus} · doublon(s) ${doublons}`);
}
/* Artistes nommes dans un texte. On ne cherche que dans ce qui precede « type beat » :
   c'est la place des noms, et ca evite « future bass » ou une mention en description. */
function matchArtists(seg) {
  const t = " " + normArt(seg) + " ";
  return ARTISTS.filter(a =>
    a.forms.some(f => t.includes(" " + f + " ")) &&
    !a.not.some(f => t.includes(" " + f + " "))).map(a => a.id);
}
/* En francais comme en espagnol on ecrit aussi « Type Beat Hamza », « Instru drill type
   beat SDM ». Le nom est alors juste apres. On le lit, mais prudemment : ce qui suit un
   « type beat » est aussi le credit du producteur (« | Prod. by Future Beats »), qui n'a
   rien a voir avec l'artiste imite. On ecarte donc tout segment qui commence comme un credit
   ou un libelle, et on s'arrete au premier separateur. */
const DEBUT_NON_ARTISTE = /^(prod|produced|by|beats?|instru|instrumental|free|hard|dark|sad|2\d{3}|\d)/i;
function detectArtists(raw) {
  const t = raw || "";
  const avant = /([^|\[\]•—–]{2,90}?)\s*type\s*beat/i.exec(t);
  const ids = new Set(avant ? matchArtists(avant[1]) : []);
  const apres = /type\s*beat\s*[:\-–—|]*\s*([^|\[\](){}"“”•—–\-]{2,60})/i.exec(t);
  if (apres && !DEBUT_NON_ARTISTE.test(apres[1].trim())) matchArtists(apres[1]).forEach(id => ids.add(id));
  return [...ids];
}

/* ---------- filtres qualité ---------- */
const MIN_DUR = 45, MAX_DUR = 480;      // on écarte les mixes et les boucles de 20 s
const REJECT = /\b(mix|mixtape|playlist|compilation|megamix|full album|1 ?hour|one hour|best of|radio|mashup|tutorial|tuto|how to|reaction|fl studio|making|stems? pack|drum kit|sample pack|loop kit)\b/i;
const ACCEPT = /\b(type beat|instru|instrumental|beat|prod)\b/i;
/* Des morceaux chantes se deguisent en « type beat » : un clip officiel, des paroles, un
   « feat. » sont des chansons, pas des prods (ex. « La Calle Vibra (offical video) »). */
const CHANSON = /\b(off?ici[ae]l+ (music )?video|offical video|clip officiel|video officielle|official audio|audio officiel|lyrics?|paroles|lyric video|visuali[sz]er|feat\.?|ft\.)\b/i;

/* ---------- moods déduits du titre ---------- */
const MOOD_HINTS = [
  [/\b(dark|sombre|evil|sinister|night|nuit|noir|shadow|ombre|grave|menac|creepy|haunted|occult|demon|abyss|tenebr)\w*/i, "sombre"],
  [/\b(hard|aggressive|agressif|rage|violent|war|guerre|savage|brutal|killer|riot|beast|monster|destruction|hostile|gunz?|mafia|sicario)\w*/i, "agressif"],
  [/\b(sad|triste|melanchol|m[ée]lancol|lonely|seul|pain|douleur|cry|pleure|hurt|broken|bris[ée]|emotional|[ée]motion|tears|larmes|regret|adieu)\w*/i, "mélancolique"],
  [/\b(hype|energetic|[ée]nergi|bounce|banger|turn ?up|fast|rapide|wild|explos|punch|adrenalin|boost|power|puissan)\w*/i, "énergique"],
  [/\b(chill|jazzy?|lofi|lo-fi|relax|smooth|calm|calme|mellow|cozy|douce|doux|posé|laid ?back|easy)\w*/i, "chill"],
  [/\b(summer|[ée]t[ée]|sun|soleil|solaire|sunny|vibes?|happy|joie|tropical|beach|plage|holiday|island|palm|caraib|caribbean)\w*/i, "solaire"],
  [/\b(love|amour|sensual|sensuel|sexy|romantic|romanti|slow|baby|b[ée]b[ée]|desire|d[ée]sir|passion|intim|caress|seduc|s[ée]duc)\w*/i, "sensuel"],
  [/\b(dream|r[êe]v|ambient|ethereal|cloud|nuage|space|espace|float|planant|angel|ange|celestial|cosmic|astral|infinit|nebul)\w*/i, "planant"],
  /* — ajouts — */
  [/\b(nostalg|memor|m[ée]moire|souvenir|old ?days|childhood|enfance|retro|r[ée]tro|vintage|throwback|90s|2000s|yesterday|autrefois)\w*/i, "nostalgique"],
  [/\b(epic|[ée]pique|cinematic|cin[ée]mat|orchestr|trailer|legend|l[ée]gend|empire|king|roi|throne|tr[ôo]ne|glory|gloire|triumph|victo|hero|h[ée]ros|titan)\w*/i, "cinématique"],
  [/\b(party|f[êe]te|festi|celebrat|dance|danse|club|fiesta|carnaval|carnival|ambiance|turnt|weekend|night ?out)\w*/i, "festif"]
];
const STYLE_DEFAULT_MOODS = {
  trap:["agressif"], drill:["sombre"], sexydrill:["sensuel"], boombap:["chill"], jazzrap:["chill"],
  lofi:["chill"], soul:["mélancolique"], westcoast:["solaire"], detroit:["énergique"], memphis:["sombre"],
  cloud:["planant"], plugg:["planant"], newjazz:["planant"], rage:["agressif"], phonk:["agressif"],
  emorap:["mélancolique"], hyperpop:["énergique"], rnb:["sensuel"], trapsoul:["sensuel"], pop:["solaire"],
  afro:["solaire"], afrohouse:["énergique"], amapiano:["chill"], alte:["planant"], dancehall:["solaire"],
  shatta:["énergique"], kompa:["sensuel"], reggaeton:["solaire"], latintrap:["agressif"], corridos:["mélancolique"], dembow:["énergique"],
  bailefunk:["énergique"], jersey:["énergique"], grime:["agressif"], ukgarage:["énergique"], club:["énergique"],
  driftphonk:["agressif"], jerk:["énergique"], crunk:["agressif"],
  trapmetal:["agressif"], sadpiano:["mélancolique"], synthwave:["planant"], dnb:["énergique"],
  afroswing:["solaire"], gqom:["sombre"], ndombolo:["solaire"], tarraxo:["sensuel"],
  bachata:["sensuel"], cumbia:["solaire"], desi:["énergique"], kpop:["solaire"], gospel:["chill"] };

/* ---------- petits utilitaires ---------- */
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); };
const pick = (arr, seed) => arr[hash(seed) % arr.length];
const inRange = ([lo, hi], seed) => lo + (hash(seed) % (hi - lo + 1));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const YT_HEADERS = { "accept-language":"fr-FR,fr;q=0.9,en;q=0.8", "user-agent":UA, "cookie":"CONSENT=YES+1" };

function hmsToSec(t) {
  if (!t) return 0;
  const p = String(t).split(":").map(Number);
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p.length === 2 ? p[0]*60 + p[1] : p[0] || 0;
}
function isoDurToSec(d) {
  const m = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || "");
  if (!m) return 0;
  return (+m[1]||0)*86400 + (+m[2]||0)*3600 + (+m[3]||0)*60 + (+m[4]||0);
}
function relToDays(txt) {
  const m = /(\d+)\s*(minute|heure|hour|jour|day|semaine|week|mois|month|an|year)/i.exec(txt || "");
  if (!m) return 0;
  const n = +m[1], u = m[2].toLowerCase();
  if (/minute/.test(u)) return n/1440;
  if (/heure|hour/.test(u)) return n/24;
  if (/jour|day/.test(u)) return n;
  if (/semaine|week/.test(u)) return n*7;
  if (/mois|month/.test(u)) return n*30;
  return n*365;
}
const daysSince = iso => (Date.now() - new Date(iso + "T12:00:00Z")) / 86400000;

/* ---------- extraction du titre propre ---------- */
const NOISE = /\b(free for profit|free|sold|new|hard|official|prod\.?\s*by[^|]*|20\d\d)\b/gi;

function scrub(t, styleLabel) {
  return (t || "")
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/\btype beat\b|\binstrumental\b|\binstru\b/gi, " ")
    .replace(NOISE, " ")
    .replace(new RegExp(`\\b${styleLabel.replace(/[&/]/g, "\\$&")}\\b`, "gi"), " ")
    .replace(/["“”«»'‘’]/g, " ")
    .replace(/[|•]/g, " ")
    .replace(/^[\s\-–—_|,.:x×✘~*+!?@#•·★☆♦►▶]+|[\s\-–—_|,.:~*+@#•·★☆♦]+$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
// un pseudo collé au titre (« @crushcrushcrush ») n'est pas le nom de la prod
const tidy = t => (t || "").replace(/@\S+/g, " ").replace(/\s{2,}/g, " ").trim();
const badTitle = t =>
  !t || t.length < 2 || t.length > 44 ||
  /^20\d\d$/.test(t) ||
  /type beat/i.test(t) || /@/.test(t) ||
  t.split(/\s+/).some(w => w.length > 22) ||   // syllabes collées, pas un titre
  !/[a-zA-ZÀ-ɏ]{2}/.test(t);   // il faut au moins deux lettres

function cleanTitle(raw, styleLabel) {
  // 1. le nom entre guillemets — c'est la convention sur 80 % des type beats
  for (const re of [/''\s*([^'|]{2,40}?)\s*''/g, /["“”«»]\s*([^"“”«»|]{2,40}?)\s*["“”«»]/g]) {
    for (const m of raw.matchAll(re)) {
      const t = tidy(m[1]);
      if (!badTitle(t)) return t;
    }
  }
  const base = raw.replace(/\[[^\]]*\]|\([^)]*\)/g, " ");
  // 2. ce qui suit le dernier « type beat »
  const i = base.toLowerCase().lastIndexOf("type beat");
  if (i >= 0) {
    const t = tidy(scrub(base.slice(i + 9).split(/[|•—–]/)[0], styleLabel));
    if (!badTitle(t)) return t;
  }
  // 3. premier segment
  const t3 = tidy(scrub(base.split(/[|•—–]/)[0], styleLabel));
  if (!badTitle(t3)) return t3;
  // 4. dernier recours : le titre brut, dégrossi — sinon on renonce à la prod
  const t4 = tidy(scrub(base, styleLabel)).slice(0, 44).trim();
  return badTitle(t4) ? null : t4;
}

/* Une référence utile nomme un artiste — « Werenoi », « Central Cee ». « Jersey
   Club » ou « Afrobeat » nomme un genre : le filtre de style s'en charge déjà, et
   en faire une suggestion de recherche ne mène nulle part. D'où ce vocabulaire :
   si tous les mots d'une référence en font partie, ce n'est pas un artiste. */
const REF_VOCAB = new Set(`free sold new old school hard soft melodic dark sad emo evil chill smooth
type beat beats instru instrumental prod rap music vibe vibes freestyle guitar piano sample samples
uk ny us fr usa english french brazilian latino african x and the
trap drill boom bap boombap jazz jazzy lofi lo-fi soul west coast detroit memphis flint cloud plugg
pluggnb rage opium phonk hyperpop digicore rnb r&b trapsoul pop afro afrobeat afrobeats house
amapiano alte alté dancehall shatta bouyon kompa gouyad zouk reggaeton perreo latin dembow baile
funk jersey philly club grime garage step oriental arabic rai raï drift sped up
afroswing driftphonk jerk crunk tarraxo bachata salsa cumbia guaracha gqom ndombolo kizomba
desi punjabi kpop korean gospel worship country synthwave retrowave hyperpop digicore
dnb jungle trapsoul newjazz sexydrill metal rock piano melody loop kit hoodtrap swing
le la les un une des du de au aux et ou pour avec sans dans sur mon ma mes ton ta tes se me te ce
the a an and or for with my me you your his her its our this that not no yes on off in out up down
el los las mi tu su por con para que como esto eso sin mas más ti nos`.split(/\s+/).filter(Boolean));
const REF_STOP = /^(prod|20\d\d|x)$/i;
const isGenreRef = r => {
  // on ne découpe pas sur « & » : sinon « r&b » devient « r » + « b » et passe
  // à travers le vocabulaire des genres
  const words = r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[\s\-]+/).filter(Boolean);
  return !words.length || words.every(w => REF_VOCAB.has(w));
};
/* « Wizkid Afrobeat » nomme un artiste ET un genre. On rogne le genre aux
   extrémités : il reste « Wizkid », qui est la piste utile. */
const trimGenre = r => {
  const nu = x => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let w = r.split(/\s+/).filter(Boolean);
  while (w.length > 1 && REF_VOCAB.has(nu(w[0]))) w.shift();
  while (w.length > 1 && REF_VOCAB.has(nu(w[w.length - 1]))) w.pop();
  return w.join(" ");
};
const okRef = r => {
  const words = r.split(/\s+/).filter(Boolean);
  return r.length >= 2 && r.length <= 28 && words.length <= 3 &&
    words.every(w => w.replace(/[^\w$]/g, "").length >= 2) &&   // « y Drill » : reste de titre, pas un artiste
    !/[+/]/.test(r) && !REF_STOP.test(r) && !/^\W+$/.test(r) && !isGenreRef(r);
};

function extractRefs(raw) {
  const m = /([^|\[\]•—–]{3,80}?)\s*type beat/i.exec(raw);
  if (!m) return [];
  return m[1]
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .split(/\s*[x×✘✕]\s*/i)
    .map(s => trimGenre(s.replace(/["“”«»]/g, "").replace(NOISE, " ").replace(/\s{2,}/g, " ").trim()))
    .filter(okRef)
    .slice(0, 3);
}

// chaînes auto-générées par YouTube : ce ne sont pas des beatmakers
const isTopicChannel = p => /\s-\sTopic$/i.test(p || "");
const cleanProd = p => (p || "").replace(/\s+(et|and)\s+\d+\s+autres?\b.*$/i, "").replace(/\s+(et|and)\s+\d+\s+others?\b.*$/i, "").trim();

/* Les moods lus dans le texte, ou null s'il n'y a rien à lire. Séparer les deux
   cas permet de ne remplacer une valeur par défaut que par une vraie trouvaille. */
/* Lien d'achat de la prod, lu dans la description : une boutique de beats (BeatStars, Airbit,
   Traktrain…), de preference sur une ligne qui parle d'achat ; a defaut, un lien raccourci
   juste apres « buy / purchase / acheter ». "" si rien : la prod est marquee comme lue. */
const BOUTIQUES = /(^|\.)(beatstars\.com|bsta\.rs|airbit\.com|traktrain\.com|payhip\.com|gumroad\.com|soundee\.com|sellfy\.com|beatbrokerz\.com|bandcamp\.com|soundclick\.com|beatstore\.com|haulix\.com|myflashstore\.com|infinity\.beatstars\.com)$/i;
const COURTS = /(^|\.)(bit\.ly|linktr\.ee|tinyurl\.com|rebrand\.ly|shorturl\.at|cutt\.ly|t\.ly|lnk\.to|smarturl\.it|beacons\.ai|solo\.to)$/i;
const MOTS_ACHAT = /\b(buy|purchase|lease|licen[cs]e|instant\s*(download|delivery)|achat|acheter|achète|compra|comprar|kaufen)\b|💰|🛒|💸/i;
function readAchat(desc) {
  const lignes = String(desc || "").split(/\n+/), bon = [], court = [], autre = [];
  for (const l of lignes) {
    const achat = MOTS_ACHAT.test(l);
    for (const m of l.matchAll(/https?:\/\/[^\s<>()"'\]]+/gi)) {
      const url = m[0].replace(/[.,;:!?]+$/, "");
      let h = ""; try { h = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
      if (BOUTIQUES.test(h)) (achat ? bon : autre).push(url);
      else if (COURTS.test(h) && achat) court.push(url);
    }
  }
  return bon[0] || autre[0] || court[0] || "";
}
function readMoods(raw) {
  const found = MOOD_HINTS.filter(([re]) => re.test(raw || "")).map(([, m]) => m);
  return found.length ? [...new Set(found)].slice(0, 2) : null;
}
function deriveMoods(raw, style) {
  return readMoods(raw) || STYLE_DEFAULT_MOODS[style] || ["énergique"];
}
/* Les beatmakers écrivent le tempo de dix façons : « 140 BPM », « bpm: 140 »,
   « Tempo 140 », parfois seulement dans la description. On essaie chacune. */
const BPM_PATTERNS = [
  /(\d{2,3})\s*bpm\b/i,
  /\bbpm\s*[:=\-–]?\s*(\d{2,3})\b/i,
  /\btempo\s*[:=\-–]?\s*(\d{2,3})\b/i
];
function readBpm(raw) {
  for (const re of BPM_PATTERNS) {
    const m = re.exec(raw || "");
    if (m && +m[1] >= 55 && +m[1] <= 200) return +m[1];
  }
  return null;
}
const KEY_PATTERNS = [
  /\b(?:key|tonalit[ée]|ton)\s*[:=\-–]?\s*([A-G][#b]?)\s*(min|minor|maj|major|m)?\b/i,
  /\b([A-G][#b]?)\s?(min|minor|maj|major|m)\b/
];
/* Une même tonalité s'écrit de plusieurs façons — A#m et Bbm désignent la même
   chose — et la lecture automatique produit parfois des casses bancales. On
   ramène tout à un jeu unique : douze mineures, douze majeures. */
const KEY_CANON = {
  "a#m":"Bbm", "d#m":"Ebm", "abm":"G#m", "gbm":"F#m", "dbm":"C#m", "cbm":"Bm",
  "bm":"Bm", "bbm":"Bbm", "a#":"Bb", "d#":"Eb", "g#":"Ab", "c#":"Db", "f#":"Gb"
};
function canonKey(k) {
  if (!k) return k;
  const m = /^\s*([a-g])\s*([#b]?)\s*(m?)\s*$/i.exec(String(k));
  if (!m) return String(k).trim();
  const propre = m[1].toUpperCase() + (m[2] === "#" ? "#" : m[2] ? "b" : "") + (m[3] ? "m" : "");
  return KEY_CANON[propre.toLowerCase()] || propre;
}

function readKey(raw) {
  for (const re of KEY_PATTERNS) {
    const m = re.exec(raw || "");
    if (m) return canonKey(m[1] + (/maj|major/i.test(m[2] || "") ? "" : "m"));
  }
  return null;
}
function deriveBpm(raw, cfg, id) {
  const v = readBpm(raw);
  return v ? { bpm:v, exact:true } : { bpm: inRange(cfg.bpm, id), exact:false };
}
function deriveKey(raw, cfg, id) {
  const v = readKey(raw);
  return v ? { key:v, exact:true } : { key: canonKey(pick(cfg.keys, id + "k")), exact:false };
}
const FR_HINT = /\b(instru|rap fran[cç]ais|rap fr|francais|français|freestyle fr)\b/i;

/* ---------- source A : résultats de recherche publics ---------- */
async function scrape(query, sortByDate) {
  const sp = sortByDate ? "CAISAhAB" : "EgIQAQ%3D%3D";
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${sp}`;
  const res = await fetch(url, { headers: YT_HEADERS, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new Error("ytInitialData introuvable");
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== "object") return;
    if (o.videoRenderer) {
      const v = o.videoRenderer;
      out.push({
        id: v.videoId,
        raw: v.title?.runs?.[0]?.text || "",
        prod: v.ownerText?.runs?.[0]?.text?.trim() || "",
        dur: hmsToSec(v.lengthText?.simpleText),
        views: parseInt((v.viewCountText?.simpleText || "0").replace(/\D/g, ""), 10) || 0,
        days: relToDays(v.publishedTimeText?.simpleText)
      });
    }
    for (const k in o) walk(o[k]);
  })(JSON.parse(m[1]));
  return out;
}

/* ---------- source B : API YouTube Data v3 ---------- */
async function viaApi(query, sortByDate) {
  const after = new Date(Date.now() - AGE_RECHERCHE * 86400000).toISOString();
  const s = new URL("https://www.googleapis.com/youtube/v3/search");
  s.search = new URLSearchParams({
    key: API_KEY, part: "snippet", q: query, type: "video", videoEmbeddable: "true",
    publishedAfter: after, maxResults: "25", order: sortByDate ? "date" : "relevance"
  });
  const sr = await fetch(s, { signal: AbortSignal.timeout(20000) }); if (!sr.ok) throw new Error(`search HTTP ${sr.status}`);
  const items = (await sr.json()).items || [];
  if (!items.length) return [];

  const v = new URL("https://www.googleapis.com/youtube/v3/videos");
  v.search = new URLSearchParams({
    key: API_KEY, part: "contentDetails,statistics,snippet,status",
    id: items.map(i => i.id.videoId).join(",")
  });
  const vr = await fetch(v, { signal: AbortSignal.timeout(20000) }); if (!vr.ok) throw new Error(`videos HTTP ${vr.status}`);
  return (await vr.json()).items.map(it => ({
    id: it.id,
    raw: it.snippet.title,
    prod: it.snippet.channelTitle,
    dur: isoDurToSec(it.contentDetails.duration),
    views: parseInt(it.statistics.viewCount || "0", 10),
    days: (Date.now() - new Date(it.snippet.publishedAt)) / 86400000,
    verified: it.status?.embeddable === true ? {
      embeddable: true,
      published: it.snippet.publishedAt.slice(0, 10),
      dur: isoDurToSec(it.contentDetails.duration),
      views: parseInt(it.statistics.viewCount || "0", 10),
      desc: it.snippet.description || ""
    } : { embeddable: false }
  }));
}

const search = (q, byDate) => (API_KEY ? viaApi(q, byDate) : scrape(q, byDate));

/* ---------- vérification : lisible sur FINDINGS, et vraie date ----------
   On interroge le lecteur interne de YouTube (le même endpoint que la page
   /watch appelle). Il rend, pour un identifiant :
     microformat.embed        présent uniquement si la chaîne autorise l'embed
     publishDate              la vraie date, pas « il y a 8 mois »
     availableCountries       pour écarter ce qui est bloqué en France
     shortDescription         où les beatmakers écrivent BPM et tonalité
   Une prod qui ne passe pas ces quatre tests n'entre pas dans le catalogue :
   FINDINGS ne montre que ce qui se lit sur FINDINGS. */
const ITUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";   // clé publique du lecteur web
const ITUBE_CTX = { client:{ clientName:"WEB", clientVersion:"2.20240101.00.00", hl:"fr", gl:"FR" } };

let BLOCAGES = 0;   // reponses vides qui ne disent pas « video indisponible » : YouTube nous bloque
async function verify(id, country = "FR") {
  const r = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${ITUBE_KEY}`, {
    method:"POST",
    headers:{ ...YT_HEADERS, "content-type":"application/json" },
    body: JSON.stringify({ videoId:id, context:ITUBE_CTX }),
    // sans delai, une reponse qui ne vient jamais bloquait tout le passage
    signal: AbortSignal.timeout(20000)
  });
  if (r.status === 429) throw new Error("429");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const mf = j?.microformat?.playerMicroformatRenderer;
  const vd = j?.videoDetails;
  if (!mf && !vd) {
    /* Seule une vraie « video indisponible » (status ERROR) veut dire que la prod a disparu.
       Le reste (LOGIN_REQUIRED « confirme que tu n'es pas un robot », refus de lecture…) est un
       blocage de YouTube : on ne conclut rien. Le 13 octobre 2026, un passage lance depuis les
       serveurs de GitHub a ainsi retire 40 prods valides et marque 1 070 prods « sans lien ». */
    const st = j?.playabilityStatus?.status || "", raison = j?.playabilityStatus?.reason || "";
    if (st === "ERROR") return { embeddable:false, gone:true };
    if (!/robot|\bbot\b|unusual traffic|automated|trafic inhabituel/i.test(raison)) return { embeddable:false, gone:false };
    if (++BLOCAGES >= 10) {
      console.error(`\nYouTube bloque ce poste (${st || "reponse vide"} : ${j?.playabilityStatus?.reason || ""}). Passage arrete, rien n'a ete ecrit.`);
      process.exit(3);
    }
    throw new Error("BLOQUE");
  }
  const countries = mf?.availableCountries || [];
  return {
    embeddable: !!mf?.embed && mf?.isFamilySafe !== false && mf?.isUnlisted !== true
                && vd?.isPrivate !== true && vd?.isLiveContent !== true
                && (!countries.length || countries.includes(country)),
    published: (mf?.publishDate || mf?.uploadDate || "").slice(0, 10) || null,
    dur: parseInt(vd?.lengthSeconds || mf?.lengthSeconds || "0", 10),
    views: parseInt(vd?.viewCount || mf?.viewCount || "0", 10),
    author: vd?.author || mf?.ownerChannelName || "",
    title: vd?.title || "",
    chan: mf?.ownerProfileUrl
      ? mf.ownerProfileUrl.replace(/^http:/, "https:")
      : (vd?.channelId ? `https://www.youtube.com/channel/${vd.channelId}` : ""),
    desc: (vd?.shortDescription || "").slice(0, 1500),
    gone: false
  };
}

/* Repasse sur les prods déjà en catalogue : une chaîne peut supprimer une vidéo
   ou couper l'embed après coup. On en revoit un paquet à chaque exécution, les
   moins récemment contrôlées d'abord. */
async function recheck(cat, howMany) {
  const queue = cat.beats
    .slice()
    .sort((a, b) => (a.checked || "").localeCompare(b.checked || ""))
    .slice(0, howMany);
  const today = new Date().toISOString().slice(0, 10);
  const drop = new Set();
  const confirmes = { bpm:0, key:0, chan:0, moods:0 };
  let ok = 0;
  for (const b of queue) {
    try {
      const v = await verify(b.id);
      if (!v.embeddable || v.gone) { drop.add(b.id); continue; }
      b.checked = today;
      if (v.published) b.published = v.published;
      if (v.views) b.views = v.views;

      if (v.chan && !b.chan) { b.chan = v.chan; confirmes.chan++; }
      { const a = readAchat(v.desc); if (a || b.buy === undefined) b.buy = a; }

      // une valeur devinée qu'on peut remplacer par une valeur écrite le sera
      const meta = `${v.title || ""}\n${v.desc || ""}`;
      b.est = Array.isArray(b.est) ? b.est : ["bpm", "key"];
      if (b.est.includes("bpm")) {
        const n = readBpm(meta);
        if (n) { b.bpm = n; b.est = b.est.filter(x => x !== "bpm"); confirmes.bpm++; }
      }
      const mds = readMoods(meta);
      if (mds && JSON.stringify(mds) !== JSON.stringify(b.moods)) { b.moods = mds; confirmes.moods++; }
      if (b.est.includes("key")) {
        const k = readKey(meta);
        if (k) { b.key = k; b.est = b.est.filter(x => x !== "key"); confirmes.key++; }
      }
      ok++;
    } catch { /* réseau capricieux : on retentera dans deux jours */ }
    await sleep(180);
  }
  if (drop.size) cat.beats = cat.beats.filter(b => !drop.has(b.id));
  return { checked: ok, dropped: drop.size, confirmes };
}

/* Liens d'achat des prods deja en catalogue, lus par paquets : chaque passage y consacre un
   budget (5 min par defaut, environ 900 prods), le catalogue entier est couvert en deux semaines. */
async function rattraperAchats(cat, budgetMin) {
  const a_faire = cat.beats.filter(b => b.buy === undefined), budget = budgetMin * 60e3, t0 = Date.now();
  if (!a_faire.length) return;
  let lues = 0, trouves = 0, pause = 150;
  for (const b of a_faire) {
    if (budget && Date.now() - t0 > budget) break;
    try { const v = await verify(b.id); b.buy = readAchat(v.desc); if (b.buy) trouves++; lues++; pause = 150; }
    catch (e) { if (String(e.message) === "429") pause = Math.min(8000, pause * 2); }
    await sleep(pause);
  }
  console.log(`Achats : ${lues} prod(s) lue(s), ${trouves} lien(s) d'achat · reste ${a_faire.length - lues}`);
}

/* ---------- catalogue ---------- */
function loadCatalog() {
  if (!fs.existsSync(CATALOG)) return { updatedAt:null, lastRun:null, beats:[] };
  const src = fs.readFileSync(CATALOG, "utf8");
  return JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
}
function writeCatalog(cat) {
  // les profils de chaines qui ne servent plus a aucune prod s'en vont avec elles
  if (cat.chans) {
    const utiles = new Set(cat.beats.map(b => b.chan));
    for (const u of Object.keys(cat.chans)) if (!utiles.has(u)) delete cat.chans[u];
  }
  cat.styles = STYLES.map(({ key, label, color }) => ({ key, label, color }));
  cat.artists = ARTISTS.map(({ id, name, style }) => ({ id, name, style }));
  cat.maxAgeMonths = MAX_AGE_MONTHS;
  cat.artistMaxAgeMonths = ARTIST_MAX_AGE_MONTHS;
  cat.artistMin = MIN_PER_ARTIST;
  fs.writeFileSync(CATALOG,
    "/* Catalogue FINDINGS — généré par ingest.mjs. Ne pas éditer à la main. */\n" +
    "window.FINDINGS_CATALOG = " + JSON.stringify(cat) + ";\n");
}

/* Retire ce qui a vieilli, ce qui n'a plus de style connu, et rabote les styles
   trop gros en gardant les prods les plus récentes. */
/* Un artiste qui change de style dans le registre laisse ses anciennes prods dans l'ancien :
   le style est pose a l'ingestion, il ne suit pas. Chaque migration dit d'ou, vers ou, et pour
   quels artistes. Idempotente : sans prod a deplacer, elle ne fait rien. */
const MIGRATIONS = [
  { de:"latintrap", vers:"corridos",
    artistes:["peso-pluma","junior-h","natanael-cano","fuerza-regida","eslabon-armado","gabito-ballesteros"] }
];
function migrerStyles(cat) {
  let n = 0;
  cat.beats.forEach(b => {
    for (const m of MIGRATIONS) {
      if (b.style === m.de && (b.artists || []).some(id => m.artistes.includes(id))) { b.style = m.vers; n++; }
    }
  });
  return n;
}

function prune(cat) {
  const before = cat.beats.length;
  const reasons = { age:0, style:0, cap:0, vues:0 };
  // les etiquettes suivent la liste (un artiste retire disparait, un nouveau est reconnu dans
  // les references deja collectees), avant la migration et avant le tri par age : ils en dependent
  cat.beats.forEach(b => {
    const deRefs = matchArtists((b.refs || []).join(" | "));
    b.artists = [...new Set([...(b.artists || []), ...deRefs])].filter(id => ARTIST_BY_ID[id]);
    if (!b.artists.length) delete b.artists;
  });
  const deplacees = migrerStyles(cat);
  if (deplacees) console.log(`Migration : ${deplacees} prod(s) déplacée(s) vers un nouveau style`);
  let kept = cat.beats.filter(b => {
    if (!STYLE_BY_KEY[b.style]) { reasons.style++; return false; }
    const age = daysSince(b.published);
    const limite = b.artists ? ARTIST_MAX_AGE_DAYS : MAX_AGE_DAYS;   // tri fin plus bas
    if (!Number.isFinite(age) || age > limite) { reasons.age++; return false; }
    // les vues montent avec le temps : une prod qui franchit le plafond sort,
    // même si elle était une trouvaille le jour où elle est entrée
    if ((b.views || 0) > MAX_VIEWS) { reasons.vues++; return false; }
    return true;
  });
  const perStyle = {}, perArtist = {};
  kept = kept
    .sort((a, b) => (b.published || "").localeCompare(a.published || ""))
    .filter(b => {
      if (b.artists) {
        // hors du plafond du style : on garde tant qu'un de ses artistes a de la place.
        // Une prod de plus de 9 mois ne sert qu'a combler un manque : les plus recentes
        // passent avant (tri par date), elle reste seulement si l'artiste est encore sous l'objectif.
        const vieille = daysSince(b.published) > MAX_AGE_DAYS;
        const seuil = vieille ? MIN_PER_ARTIST : MAX_PER_ARTIST;
        if (!b.artists.some(id => (perArtist[id] || 0) < seuil)) { reasons[vieille ? "age" : "cap"]++; return false; }
        b.artists.forEach(id => perArtist[id] = (perArtist[id] || 0) + 1);
        return true;
      }
      perStyle[b.style] = (perStyle[b.style] || 0) + 1;
      if (perStyle[b.style] > MAX_PER_STYLE) { reasons.cap++; return false; }
      return true;
    });
  kept.forEach(b => {
    delete b.dl;                 // les liens boutique ne sont plus collectés
    b.key = canonKey(b.key);
    b.refs = (b.refs || []).map(trimGenre).filter(okRef);
    const t = tidy(b.title);
    if (t && t.length >= 2) b.title = t;
  });
  cat.beats = kept;
  return { before, after: kept.length, reasons };
}

/* ---------- programme principal ---------- */
/* ============ profils des beatmakers ============
   Pour la page beatmaker : photo, nom affiche, abonnes et banniere de la chaine YouTube.
   La page de chaine les porte (og:image, og:title, en-tete de ytInitialData) ; on la lit
   compressee (~100 Ko), 4 a la fois. Un profil se rafraichit tous les 45 jours, un echec
   se retente au bout de 7. */
async function lireChaine(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9", "Cookie": "CONSENT=YES+1; SOCS=CAI" },
    signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const h = await r.text();
  const meta = p => (new RegExp(`<meta property="og:${p}" content="([^"]*)"`).exec(h) || [])[1] || "";
  const dec = t => t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const a = meta("image").replace(/=s\d+-/, "=s240-");
  if (!a) throw new Error("pas de photo");
  const s = (/"content":"([^"]{1,20}?)[\s\u00a0\u202f]abonnés?"/.exec(h) || [])[1] || "";
  const b = (/"banner":\{"imageBannerViewModel":\{"image":\{"sources":\[\{"url":"([^"]+)"/.exec(h) || [])[1] || "";
  return { a, n: dec(meta("title")), s: s.replace(/\u202f|\u00a0/g, " "), b: b.replace(/=w\d+-/, "=w1280-") };
}
async function enrichirChaines(cat, budgetMin) {
  cat.chans = cat.chans || {};
  const jour = 864e5, now = Date.now();
  const urls = [...new Set(cat.beats.map(b => b.chan).filter(Boolean))].filter(u => {
    const c = cat.chans[u];
    if (!c) return true;
    return now - Date.parse(c.t) > (c.e ? 7 : 45) * jour;
  }).sort((x, y) => (cat.chans[x] ? 1 : 0) - (cat.chans[y] ? 1 : 0));   // les inconnues d'abord
  if (!urls.length) { console.log("Profils : tous à jour"); return; }
  const fin = now + budgetMin * 60e3;
  let ok = 0, ko = 0, i = 0;
  async function ouvrier() {
    while (i < urls.length && Date.now() < fin) {
      const u = urls[i++];
      try { cat.chans[u] = { ...(await lireChaine(u)), t: new Date().toISOString().slice(0, 10) }; ok++; }
      catch (e) { cat.chans[u] = { ...(cat.chans[u] || {}), e: 1, t: new Date().toISOString().slice(0, 10) }; ko++; }
      if ((ok + ko) % 200 === 0) { console.log(`  profils : ${ok + ko}/${urls.length}`); if (!DRY) writeCatalog(cat); }
      await sleep(250);
    }
  }
  await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
  console.log(`Profils : ${ok} lu(s), ${ko} en échec${i < urls.length ? `, ${urls.length - i} reporté(s) (budget atteint)` : ""}`);
}

/* ============ profils des artistes ============
   Photo officielle et nombre de fans, lus sur l'API publique de Deezer (sans cle). Les
   homonymes sont nombreux (trois « Hamza ») : on ne garde qu'un nom identique a une forme
   connue de l'artiste, et parmi eux celui qui a le plus de fans, 1 000 au moins. */
async function enrichirArtistes(cat) {
  cat.artistInfo = cat.artistInfo || {};
  const jour = 864e5, now = Date.now();
  const a_faire = ARTISTS.filter(a => {
    const c = cat.artistInfo[a.id];
    return !c || now - Date.parse(c.t) > (c.e ? 7 : 30) * jour;
  });
  if (!a_faire.length) { console.log("Artistes : profils à jour"); return; }
  let ok = 0, ko = 0; const manquants = [];
  for (const a of a_faire) {
    const t = new Date().toISOString().slice(0, 10);
    try {
      const r = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(a.name)}&limit=25`, { signal: AbortSignal.timeout(15000) });
      const d = (await r.json()).data || [];
      const bons = d.filter(x => a.forms.includes(normArt(x.name)) && x.nb_fan >= 1000 && !/\/\/\d+x\d+/.test(x.picture_xl || "//0x0"));
      bons.sort((x, y) => y.nb_fan - x.nb_fan);
      if (!bons.length) throw new Error("introuvable");
      // les liens Spotify / Apple Music deja trouves restent, tant que la fiche Deezer est la meme
      const old = cat.artistInfo[a.id] || {}, garde = old.dz === bons[0].link ? { sp: old.sp, am: old.am, lt: old.lt } : {};
      cat.artistInfo[a.id] = { ...garde, img: bons[0].picture_xl, fans: bons[0].nb_fan, dz: bons[0].link, t };
      ok++;
    } catch (e) { cat.artistInfo[a.id] = { e: 1, t }; ko++; manquants.push(a.name); }
    await sleep(180);   // l'API tolere 50 requetes par 5 s
  }
  for (const id of Object.keys(cat.artistInfo)) if (!ARTIST_BY_ID[id]) delete cat.artistInfo[id];
  console.log(`Artistes : ${ok} profil(s) lu(s)${ko ? `, ${ko} introuvable(s) sur Deezer : ${manquants.join(", ")}` : ""}`);
}

/* ============ liens Spotify et Apple Music des artistes ============
   MusicBrainz relie les fiches d'un meme artiste sur les plateformes. On part du lien Deezer
   deja verifie : pas d'homonyme possible. Sans fiche MusicBrainz, Apple Music se cherche sur
   l'API iTunes (nom identique, et genre coherent avec le style quand il y a plusieurs
   homonymes) ; Spotify restera un lien de recherche, cote page. 1 requete/s : la regle de
   MusicBrainz. Rafraichi tous les 60 jours. */
const MB_UA = "FINDINGS/1.0 (https://dokamusic.github.io/FINDINGS/)";
const GENRE_ATTENDU = st =>
  /reggaeton|latintrap|dembow|corridos|bachata|cumbia|salsa/.test(st) ? /latin|reggaeton|urbano|regional/i
  : /afro|amapiano|ndombolo|kompa|bouyon|zouk/.test(st) ? /afro|monde|world|african|pop/i
  : /pop/.test(st) ? /pop/i
  : /rnb|soul/.test(st) ? /r&b|soul/i
  : /rap|hip/i;
async function mbJson(url) {
  await sleep(1100);
  const r = await fetch(url, { headers: { "User-Agent": MB_UA }, signal: AbortSignal.timeout(20000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("MusicBrainz HTTP " + r.status);
  return r.json();
}
async function enrichirLiens(cat) {
  const jour = 864e5, now = Date.now();
  const a_faire = ARTISTS.filter(a => {
    const c = cat.artistInfo && cat.artistInfo[a.id];
    return c && c.dz && (!c.lt || now - Date.parse(c.lt) > 60 * jour);
  });
  if (!a_faire.length) { console.log("Liens : à jour"); return; }
  let sp = 0, am = 0, faits = 0;
  // MusicBrainz repond en 0,5 a 4 s : ~45 min pour 300 artistes. On sauvegarde en route,
  // pour qu'une interruption ne perde pas tout, et on s'arrete au budget (reprise au passage suivant).
  const fin = now + parseInt(arg("liens-budget", "10"), 10) * 60e3;
  for (const a of a_faire) {
    if (Date.now() > fin) { console.log(`  liens : budget atteint, ${a_faire.length - faits} reporté(s)`); break; }
    if (++faits % 20 === 0) { console.log(`  liens : ${faits}/${a_faire.length}`); if (!DRY) writeCatalog(cat); }
    const c = cat.artistInfo[a.id];
    try {
      const u = await mbJson(`https://musicbrainz.org/ws/2/url?resource=${encodeURIComponent(c.dz)}&inc=artist-rels&fmt=json`);
      const mbid = u && (u.relations || []).map(r => r.artist && r.artist.id).find(Boolean);
      if (mbid) {
        const d = await mbJson(`https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`);
        const urls = ((d && d.relations) || []).map(r => r.url && r.url.resource).filter(Boolean);
        const spu = urls.find(x => /open\.spotify\.com\/artist\//.test(x));
        const amu = urls.find(x => /music\.apple\.com\/.+\/artist\//.test(x)) || urls.find(x => /itunes\.apple\.com\/.+\/artist\//.test(x));
        if (spu) c.sp = spu.split("?")[0];
        if (amu) c.am = amu.replace("itunes.apple.com", "music.apple.com").split("?")[0];
      }
      if (!c.am) {
        const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(a.name)}&entity=musicArtist&country=fr&limit=10`, { signal: AbortSignal.timeout(15000) });
        const res = ((await r.json()).results || []).filter(x => a.forms.includes(normArt(x.artistName)));
        const g = GENRE_ATTENDU(a.style);
        const bon = res.length === 1 ? res[0] : res.find(x => g.test(x.primaryGenreName || ""));
        if (bon && bon.artistLinkUrl) c.am = bon.artistLinkUrl.split("?")[0];
      }
    } catch (e) { /* on retentera au prochain passage */ continue; }
    c.lt = new Date().toISOString().slice(0, 10);
    if (c.sp) sp++;
    if (c.am) am++;
  }
  console.log(`Liens : ${faits} artiste(s) traité(s) · ${sp} Spotify, ${am} Apple Music`);
}

async function main() {
  const cat = loadCatalog();
  if (ACHATS_ONLY) {
    await rattraperAchats(cat, parseFloat(arg("achats-budget", "0")));
    if (!DRY) writeCatalog(cat);
    return;
  }
  if (CHANS_ONLY) {
    await enrichirArtistes(cat);
    await enrichirLiens(cat);
    await enrichirChaines(cat, parseInt(arg("chans-budget", "60"), 10));
    if (!DRY) writeCatalog(cat);
    return;
  }
  const today = new Date().toISOString().slice(0, 10);

  console.log(`FINDINGS — ingestion ${today}`);
  console.log(`Source  : ${API_KEY ? "API YouTube Data v3" : "résultats de recherche publics"}`);
  const seuil = MAX_VIEWS >= 1e6 ? (MAX_VIEWS/1e6) + " M" : Math.round(MAX_VIEWS/1000) + " k";
  console.log(`Règles  : ≤ ${MAX_AGE_MONTHS} mois (≤ ${ARTIST_MAX_AGE_MONTHS} pour compléter un artiste à ${MIN_PER_ARTIST}) · ≤ ${seuil} vues · lecture intégrée obligatoire · ${STYLES.length} styles`);
  console.log(`Départ  : ${cat.beats.length} prods`);

  const p = prune(cat);
  if (p.before !== p.after) {
    console.log(`Nettoyage : −${p.before - p.after} (${p.reasons.age} trop vieilles, ${p.reasons.vues} trop vues, ${p.reasons.style} style retiré, ${p.reasons.cap} au-delà du plafond) → ${p.after}\n`);
  } else {
    console.log("Nettoyage : rien à retirer\n");
  }

  const RECHECK = parseInt(arg("recheck", "40"), 10);
  if (RECHECK > 0 && cat.beats.length) {
    const rc = await recheck(cat, RECHECK);
    console.log(`Contrôle : ${rc.checked} prod(s) revérifiée(s)${rc.dropped ? `, ${rc.dropped} retirée(s) (supprimée ou embed coupé)` : ", toutes toujours lisibles"}`);
    if (rc.confirmes.bpm || rc.confirmes.key || rc.confirmes.chan || rc.confirmes.moods)
      console.log(`Confirmé : ${rc.confirmes.bpm} tempo(s), ${rc.confirmes.key} tonalité(s), ${rc.confirmes.chan} chaîne(s) et ${rc.confirmes.moods} mood(s) lus à la source.`);
    console.log("");
  }
  // liens d'achat des prods deja la : un paquet a chaque passage complet
  if (!ARTISTS_ONLY && !ONLY_ARTISTS.length && !PRUNE_ONLY) await rattraperAchats(cat, parseFloat(arg("achats-budget", "5")));

  if (PRUNE_ONLY) {
    cat.updatedAt = new Date().toISOString();
    if (!DRY) writeCatalog(cat);
    console.log(DRY ? "--dry-run : rien n'a été écrit." : "catalog.js mis à jour.");
    return;
  }

  // ce qui a ete retire a la main (cat.exclus) ne doit jamais revenir
  cat.exclus = cat.exclus || [];
  const seen = new Set([...cat.beats.map(b => b.id), ...cat.exclus]);
  const dupes = new Set(cat.beats.map(b => `${b.style}|${b.title.toLowerCase()}|${b.prod.toLowerCase()}`));
  // deux prods d'un même beatmaker par style suffisent : sinon une seule chaîne
  // prolifique mange tout un genre et le catalogue perd son intérêt
  const MAX_PER_PROD = parseInt(arg("per-prod", "2"), 10);
  const byProd = {};
  cat.beats.forEach(b => {
    const k = `${b.style}|${b.prod.toLowerCase()}`; byProd[k] = (byProd[k] || 0) + 1;
    // la regle des deux prods par beatmaker vaut aussi par artiste, catalogue existant compris
    (b.artists || []).forEach(id => { const ka = `@${id}|${b.prod.toLowerCase()}`; byProd[ka] = (byProd[ka] || 0) + 1; });
  });
  const added = [], problems = [], rejected = { titre:0, age:0, embed:0, format:0, vues:0, artiste:0 };
  const targets = ONLY.length ? STYLES.filter(s => ONLY.includes(s.key)) : STYLES;

  /* Une candidate, trouvee par style ou par artiste, passe exactement les memes
     controles : format, age, vues, lecture integree, deux prods par beatmaker. */
  async function essayer(r, cfg, artiste = null, ageMax = MAX_AGE_DAYS) {
    if (!r.id || seen.has(r.id)) return null;
    // YouTube repond large : sous « hamza type beat » on trouve aussi du Ninho. On ne
    // garde que ce qui nomme vraiment l'artiste, avant de payer une verification.
    const nommes = detectArtists(r.raw);
    if (artiste && !nommes.includes(artiste.id)) { rejected.artiste++; return null; }
    if (r.dur && (r.dur < MIN_DUR || r.dur > MAX_DUR)) { rejected.format++; return null; }
    if (REJECT.test(r.raw) || !ACCEPT.test(r.raw) || CHANSON.test(r.raw)) { rejected.format++; return null; }
    if (isTopicChannel(r.prod)) { rejected.format++; return null; }
    if (r.days > ageMax * 1.15) { rejected.age++; return null; }   // pré-filtre sur la date relative
    if (r.views > MAX_VIEWS * 1.05) { rejected.vues++; return null; }    // trop vue : ce n'est plus une trouvaille

    const prod = cleanProd(r.prod);
    const title = cleanTitle(r.raw, cfg.label);
    if (!title) { rejected.titre++; return null; }
    const dupKey = `${cfg.key}|${title.toLowerCase()}|${prod.toLowerCase()}`;
    if (!prod || dupes.has(dupKey)) return null;
    const prodKey = artiste ? `@${artiste.id}|${prod.toLowerCase()}` : `${cfg.key}|${prod.toLowerCase()}`;
    if ((byProd[prodKey] || 0) >= MAX_PER_PROD) return null;

    // vérification unitaire : sans elle, on ne sait pas si la prod est écoutable ici
    let v = r.verified;
    if (!v) {
      try {
        v = await verify(r.id);
      } catch (e) {
        if (e.message === "429") { await sleep(4000); try { v = await verify(r.id); } catch { } }
        if (!v) { problems.push(`vérif ${r.id} : ${e.message}`); return null; }
      }
      await sleep(180);
    }
    seen.add(r.id);
    if (!v.embeddable) { rejected.embed++; return null; }
    if (!v.published || daysSince(v.published) > ageMax) { rejected.age++; return null; }
    if ((v.views || r.views) > MAX_VIEWS) { rejected.vues++; return null; }
    if (v.dur && (v.dur < MIN_DUR || v.dur > MAX_DUR)) { rejected.format++; return null; }

    dupes.add(dupKey);
    byProd[prodKey] = (byProd[prodKey] || 0) + 1;
    const meta = `${r.raw}\n${v.desc || ""}`;
    const { bpm, exact: bpmExact } = deriveBpm(meta, cfg, r.id);
    const { key, exact: keyExact } = deriveKey(meta, cfg, r.id);
    const beat = {
      id: r.id,
      title,
      prod,
      style: cfg.key,
      dur: v.dur || r.dur,
      views: v.views || r.views,
      published: v.published,
      bpm, key,
      moods: deriveMoods(meta, cfg.key),
      refs: extractRefs(r.raw),
      ...(nommes.length ? { artists: nommes } : {}),
      fr: r.fromFr || FR_HINT.test(r.raw) || FR_HINT.test(r.prod),
      addedAt: today,
      src: API_KEY ? "api" : "search",
      chan: v.chan || "",
      buy: readAchat(v.desc),
      checked: today,
      est: [!bpmExact && "bpm", !keyExact && "key"].filter(Boolean)
    };
    cat.beats.push(beat);
    added.push(beat);
    return beat;
  }

  if (!ARTISTS_ONLY) for (const cfg of targets) {
    const queries = [...cfg.q.map(q => [q, true]), ...cfg.fr.map(q => [q, true]), [cfg.q[0], false]];
    const pool = [];
    for (const [q, byDate] of queries) {
      if (pool.length >= PER_STYLE * 8) break;
      try {
        const rows = await search(q, byDate);
        rows.forEach(r => pool.push({ ...r, fromFr: cfg.fr.includes(q) }));
      } catch (e) {
        problems.push(`${cfg.label} · « ${q} » : ${e.message}`);
      }
      await sleep(API_KEY ? 120 : 1500);
    }

    let n = 0;
    for (const r of pool) {
      if (n >= PER_STYLE) break;
      if (await essayer(r, cfg)) n++;
    }
    console.log(`  ${cfg.label.padEnd(18)} +${n}`);
  }

  // --per-artist=0 : on ne fait que completer les artistes sous l'objectif
  if (!NO_ARTISTS && (PER_ARTIST > 0 || MIN_PER_ARTIST > 0)) {
    const cibles = ONLY_ARTISTS.length ? ARTISTS.filter(a => ONLY_ARTISTS.includes(a.id))
                 : ONLY.length ? ARTISTS.filter(a => ONLY.includes(a.style)) : ARTISTS;
    const compte = {};
    cat.beats.forEach(b => (b.artists || []).forEach(id => compte[id] = (compte[id] || 0) + 1));
    /* Rotation : d'abord ceux qu'on n'a pas tentes depuis le plus longtemps, puis les moins
       fournis. Trier seulement par manque ferait buter chaque nuit le budget sur les memes
       artistes sans offre recente (Kaysha, Aventura…), et ceux a 19 n'y arriveraient jamais. */
    cat.artistTried = cat.artistTried || {};
    cibles.sort((x, y) =>
      (cat.artistTried[x.id] || "").localeCompare(cat.artistTried[y.id] || "") ||
      (compte[x.id] || 0) - (compte[y.id] || 0));
    console.log(`\nArtistes : ${cibles.length} · objectif ${MIN_PER_ARTIST} prods chacun, plafond ${MAX_PER_ARTIST}` +
                (ARTIST_BUDGET_MIN > 0 ? ` · budget ${ARTIST_BUDGET_MIN} min` : ""));
    const bilan = [], debut = Date.now();
    let faits = 0, reportes = 0;
    for (const a of cibles) {
      if (ARTIST_BUDGET_MIN > 0 && Date.now() - debut > ARTIST_BUDGET_MIN * 60000) { reportes++; continue; }
      faits++;
      // sauvegarde tous les 10 artistes : une coupure (veille, reseau) ne perd plus tout
      if (!DRY && faits % 10 === 0) writeCatalog(cat);
      const avant = compte[a.id] || 0;
      const besoin = Math.min(MAX_PER_ARTIST - avant, Math.max(PER_ARTIST, MIN_PER_ARTIST - avant));
      if (besoin <= 0) { bilan.push(`${a.name} ${avant}`); continue; }
      // par date d'abord (le plus frais), puis par pertinence, puis des variantes courantes
      const variantes = [
        [`${a.name} type beat`, true], [`${a.name} type beat`, false],
        [`free ${a.name} type beat`, true], [`${a.name} type beat 2026`, true],
        [`${a.name} type beat 2026`, false], [`hard ${a.name} type beat`, true],
        // n'interviennent que si les premieres n'ont pas suffi
        [`dark ${a.name} type beat`, true], [`melodic ${a.name} type beat`, true],
        [`sad ${a.name} type beat`, true], [`${a.name} type beat sample`, true],
        [`${a.name} type beat instrumental`, false]
      ];
      /* Un artiste deja a l'objectif ne cherche que ses sorties fraiches : les deux recherches
         par date suffisent. Sans cette limite, il epuisait les 11 formulations a chaque fois
         (~6 min) pour 0 a 2 prods, et un passage ne traitait que 4 artistes sur 296. */
      const formulations = avant >= MIN_PER_ARTIST ? [variantes[0], variantes[2]] : variantes;
      let n = 0;
      for (const [q, parDate] of formulations) {
        if (n >= besoin) break;
        let rows = [];
        const ageMax = () => (avant + n < MIN_PER_ARTIST ? ARTIST_MAX_AGE_DAYS : MAX_AGE_DAYS);
        AGE_RECHERCHE = ageMax();
        try { rows = await search(q, parDate); }
        catch (e) { problems.push(`artiste ${a.name} « ${q} » : ${e.message}`); }
        await sleep(API_KEY ? 120 : 1500);
        for (const r of rows) {
          if (n >= besoin) break;
          if (await essayer(r, STYLE_BY_KEY[a.style], a, ageMax())) n++;
        }
        AGE_RECHERCHE = MAX_AGE_DAYS;
      }
      compte[a.id] = avant + n;
      cat.artistTried[a.id] = new Date().toISOString().slice(0, 16);
      bilan.push(`${a.name} ${avant}→${avant + n}`);
    }
    for (let i = 0; i < bilan.length; i += 6) console.log("  " + bilan.slice(i, i + 6).join(" · "));
    if (reportes) console.log(`  … budget atteint : ${reportes} artiste(s) reporte(s) au prochain passage`);
  }

  prune(cat);   // le plafond par style s'applique aussi aux arrivantes
  cat.beats.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
  cat.updatedAt = new Date().toISOString();
  cat.lastRun = { date: today, added: added.length, total: cat.beats.length };

  const stylesCouverts = new Set(cat.beats.map(b => b.style)).size;
  console.log(`\n${added.length} nouvelle(s) prod(s) · catalogue : ${cat.beats.length} · ${stylesCouverts}/${STYLES.length} styles remplis`);
  for (const b of added) console.log(`  · ${b.title} — ${b.prod} (${b.style}, ${b.bpm} BPM, ${b.published}${b.fr ? ", FR" : ""})`);
  console.log(`\nÉcartées : ${rejected.age} trop vieilles · ${rejected.vues} trop vues · ${rejected.embed} non lisibles hors YouTube · ${rejected.titre} sans titre exploitable · ${rejected.format} hors format · ${rejected.artiste} ne nommant pas l'artiste cherché`);
  if (problems.length) {
    console.log(`\n${problems.length} requête(s) en échec :`);
    problems.slice(0, 20).forEach(x => console.log("  ! " + x));
  }

  await enrichirArtistes(cat);
  await enrichirLiens(cat);
  await enrichirChaines(cat, parseInt(arg("chans-budget", "8"), 10));

  if (DRY) { console.log("\n--dry-run : rien n'a été écrit."); return; }
  writeCatalog(cat);
  console.log(`\ncatalog.js mis à jour.`);
}

main().catch(e => { console.error("Échec :", e); process.exit(1); });
