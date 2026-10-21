#!/usr/bin/env node
/* FINDINGS — construit le site publie a partir de index.html et du catalogue.
 *
 *   node build.mjs                        → dist/ (le depot GitHub Pages)
 *   node build.mjs --out=_site            → un dossier de test
 *   node build.mjs --template=chemin.html → une autre page source (celle deja publiee)
 *   node build.mjs --site=https://findings.fr/   → l'adresse publique (pour Google)
 *
 * Ce qu'il fabrique :
 *   - app.css et app.js, sortis de index.html : partages par toutes les pages, telecharges
 *     une seule fois ; catalog.js, app.js et studio.js en « defer » pour que la page
 *     s'affiche avant le gros catalogue ;
 *   - une page par artiste (/artiste/hamza/), par style (/style/drill/), par beatmaker d'au
 *     moins 3 prods (/beatmaker/gamma-prod/) et la page /studio/ : chacune avec son titre,
 *     sa description, ses balises de partage et de donnees structurees, et la liste de ses
 *     prods ecrite dans la page (Google la lit sans executer le JavaScript) ;
 *   - chaque page en trois langues : francais a la racine, anglais sous /en/, espagnol sous
 *     /es/, reliees entre elles (hreflang) ; titre, description, liste et pied traduits ;
 *   - 404.html (toute autre adresse ouvre quand meme l'application), sitemap.xml, robots.txt.
 * Chaque page est la meme application : elle lit son adresse et affiche la bonne vue. */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const arg = (n, d) => { const f = process.argv.find(a => a.startsWith(`--${n}=`)); return f ? f.split("=").slice(1).join("=") : d; };
const OUT = path.resolve(DIR, arg("out", "dist"));
// --source : le dossier ou lire index.html, studio.js et les icones (publie/ pour le passage
// automatique : la version figee a la derniere publication volontaire). Le catalogue, lui,
// vient toujours du dossier du projet.
const SOURCE = path.resolve(DIR, arg("source", "."));
const TEMPLATE = path.resolve(DIR, arg("template", path.join(SOURCE, "index.html")));
const SITE = arg("site", "https://dokamusic.github.io/FINDINGS/").replace(/\/?$/, "/");
const SITE_PATH = new URL(SITE).pathname;          // /FINDINGS/ : pour la page 404, qui peut etre servie a toute profondeur
const MIN_PRODS_BEATMAKER = 3;                     // meme regle que l'application (PROD_SLUG)

/* ─────────── donnees ─────────── */
const src = fs.readFileSync(path.join(DIR, "catalog.js"), "utf8");
const CAT = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
const BEATS = CAT.beats;
const STYLE_NAME = Object.fromEntries((CAT.styles || []).map(s => [s.key, s.label]));
const ARTIST_NAME = Object.fromEntries((CAT.artists || []).map(a => [a.id, a.name]));
const INFO = CAT.artistInfo || {}, CHANS = CAT.chans || {};
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugifier = t => norm(t).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const json = o => JSON.stringify(o).replace(/</g, "\\u003c");

// slugs des beatmakers : exactement l'algorithme de l'application
const nProd = {}; BEATS.forEach(b => nProd[b.prod] = (nProd[b.prod] || 0) + 1);
const PROD_SLUG = new Map(), SLUG_PROD = new Map();
Object.keys(nProd).filter(p => nProd[p] >= MIN_PRODS_BEATMAKER).sort().forEach(p => {
  const s = slugifier(p); let k = s, i = 2;
  while (SLUG_PROD.has(k)) k = `${s}-${i++}`;
  SLUG_PROD.set(k, p); PROD_SLUG.set(p, k);
});
/* FINDINGS Pro (pro.json) : prods sponsorisees et profils Pro des beatmakers. Les entrees
   expirees ou qui ne correspondent a rien dans le catalogue sont ecartees, avec un avertissement. */
const PRO = (() => {
  const f = path.resolve(DIR, arg("pro", "pro.json")), vide = { contact: "", sponsorises: [], beatmakers: {} };
  if (!fs.existsSync(f)) return vide;
  let o; try { o = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.warn(`pro.json illisible (${e.message}) : ignore`); return vide; }
  const auj = new Date().toISOString().slice(0, 10), date = d => /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d : null;
  const url = u => typeof u === "string" && /^(https:\/\/|mailto:)/.test(u.trim()) ? u.trim() : null;
  const ids = new Set(BEATS.map(b => b.id)), noms = new Set(BEATS.map(b => b.prod));
  const sponsorises = (Array.isArray(o.sponsorises) ? o.sponsorises : []).filter(x => {
    if (!x || !ids.has(x.prod)) { console.warn(`pro.json : prod sponsorisee inconnue (${x && x.prod})`); return false; }
    return !(date(x.au) && date(x.au) < auj);
  }).map(x => ({ id: x.prod, du: date(x.du), au: date(x.au), ou: (Array.isArray(x.ou) && x.ou.length ? x.ou : ["accueil", "liste"]).filter(k => k === "accueil" || k === "liste") }));
  const beatmakers = {};
  for (const [nom, b] of Object.entries(o.beatmakers || {})) {
    if (!noms.has(nom)) { console.warn(`pro.json : beatmaker inconnu (${nom})`); continue; }
    if (!b || (date(b.jusqua) && date(b.jusqua) < auj)) continue;
    const liens = {};
    for (const [k, v] of Object.entries(b.liens || {})) { if (k === "email" && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(v).trim())) liens.email = String(v).trim(); else if (url(v)) liens[k] = url(v); }
    beatmakers[nom] = { verifie: !!b.verifie, bio: String(b.bio || "").trim().slice(0, 400), banniere: url(b.banniere) && url(b.banniere).startsWith("https://") ? url(b.banniere) : "", liens, jusqua: date(b.jusqua) };
  }
  return { contact: url(o.contact) || "", sponsorises, beatmakers };
})();
const CHAN_DE = new Map(); BEATS.forEach(b => { if (b.chan && !CHAN_DE.has(b.prod)) CHAN_DE.set(b.prod, b.chan); });
// les mieux classees d'abord, comme la « pertinence » de l'application (vues, fraicheur)
const jours = d => d ? (Date.now() - new Date(d + "T12:00:00Z")) / 864e5 : 999;
const score = b => Math.log10(Math.max(b.views, 10)) + Math.max(0, 2.5 - jours(b.published) / 120);
const trier = l => l.slice().sort((a, b) => score(b) - score(a));

/* ─────────── la page source, decoupee ─────────── */
let tpl = fs.readFileSync(TEMPLATE, "utf8");
const css = tpl.slice(tpl.indexOf("<style>") + 7, tpl.indexOf("</style>"));
const debutApp = tpl.indexOf('<script src="catalog.js"></script>');
const iApp = tpl.indexOf("<script>", debutApp), fApp = tpl.indexOf("</script>", iApp);
const appJs = tpl.slice(iApp + 8, fApp);
if (debutApp < 0 || iApp < 0 || !css || appJs.length < 50000) throw new Error("index.html : decoupage impossible (balises attendues introuvables)");
const empreinte = t => crypto.createHash("sha1").update(t).digest("hex").slice(0, 10);
const studioJs = fs.readFileSync(path.join(SOURCE, "studio.js"), "utf8");
const V = { css: empreinte(css), app: empreinte(appJs), studio: empreinte(studioJs), cat: empreinte(src) };
tpl = tpl.slice(0, tpl.indexOf("<style>")) + `<link rel="stylesheet" href="app.css?v=${V.css}">` + tpl.slice(tpl.indexOf("</style>") + 8);
tpl = tpl.replace('<script src="catalog.js"></script>', `<script src="catalog.js?v=${V.cat}" defer></script>`);
const i2 = tpl.indexOf("<script>", tpl.indexOf(`catalog.js?v=${V.cat}`)), f2 = tpl.indexOf("</script>", i2);
tpl = tpl.slice(0, i2) + `<script src="app.js?v=${V.app}" defer></script>` + tpl.slice(f2 + 9);
tpl = tpl.replace('<script src="studio.js"></script>', `<script src="studio.js?v=${V.studio}" defer></script>`);
if (!tpl.includes("<!--SEO:HEAD-->") || !tpl.includes("<!--SEO:PRE-->")) throw new Error("index.html : reperes SEO absents");

/* ─────────── fabriquer une page ─────────── */
const TITRE_DEFAUT = /<title>[\s\S]*?<\/title>\s*<meta name="description"[^>]*>/;
const LANGUES = ["fr", "en", "es"];
const OG_LOCALE = { fr: "fr_FR", en: "en_US", es: "es_ES" };
const prefixe = lg => lg === "fr" ? "" : lg + "/";
function pageHTML({ chemin, titre, description, image, vue, pre = "", ld = [], indexer = true, base, lg = "fr", pied }){
  // chemin : relatif a la racine de la langue (artiste/hamza/) ; la <base> pointe sur cette racine,
  // pour que l'application construise ses liens dans la meme langue
  const prof = chemin.split("/").filter(Boolean).length;
  const baseHref = base || (prof ? "../".repeat(prof) : "./");
  const url = SITE + prefixe(lg) + chemin;
  const alternatives = indexer ? LANGUES.map(l => `<link rel="alternate" hreflang="${l}" href="${esc(SITE + prefixe(l) + chemin)}">`).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${esc(SITE + chemin)}">` : "";
  const tete = `<base href="${baseHref}">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
${indexer ? `<link rel="canonical" href="${esc(url)}">` : '<meta name="robots" content="noindex">'}
<meta property="og:type" content="website">
<meta property="og:site_name" content="FINDINGS">
<meta property="og:locale" content="${OG_LOCALE[lg]}">
${alternatives}
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image || SITE + "icon-512.png")}">
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
${ld.map(o => `<script type="application/ld+json">${json(o)}</script>`).join("\n")}`;
  let h = tpl.replace(TITRE_DEFAUT, "").replace("<!--SEO:HEAD-->", tete);
  h = h.replace('<html lang="fr">', `<html lang="${lg}" data-langue="${lg}">`);
  // les ressources partagees restent a la racine du site : une page /en/ remonte d'un cran
  if (lg !== "fr") h = h.replace(/(href|src)="(favicon[^"]*|apple-touch-icon\.png|app\.css\?[^"]*|catalog\.js\?[^"]*|app\.js\?[^"]*|studio\.js\?[^"]*)"/g, '$1="../$2"');
  // la <base> doit preceder toute adresse relative : juste apres <meta charset>
  h = h.replace(`<base href="${baseHref}">\n`, "");
  h = h.replace(/(<meta charset="utf-8">)/, `$1\n<base href="${baseHref}">`);
  // la vue affichee avant meme le JavaScript
  if (vue === "prods") {
    h = h.replace('<div id="vueAccueil">', '<div id="vueAccueil" hidden>').replace('<main class="shell" hidden>', '<main class="shell">');
  } else if (vue === "studio") {
    h = h.replace('<div id="vueAccueil">', '<div id="vueAccueil" hidden>').replace('<div id="vueStudio" hidden>', '<div id="vueStudio">');
    h = h.replace("<body>", '<body class="vue-studio">');
  } else if (vue === "offre") {
    h = h.replace('<div id="vueAccueil">', '<div id="vueAccueil" hidden>').replace('<div id="vueOffre" hidden>', '<div id="vueOffre">');
    h = h.replace("<body>", '<body class="vue-offre">');
  }
  return h.replace("<!--SEO:PRE-->", pre).replace("<!--SEO:PIED-->", pied || PIED.fr);
}
const PAR = { fr: "par", en: "by", es: "de" };
const liste = (l, n = 40, lg = "fr") => `<ol>${l.slice(0, n).map(b => `
  <li><img src="https://i.ytimg.com/vi/${b.id}/mqdefault.jpg" alt="" loading="lazy" width="62" height="40"><div><a href="https://www.youtube.com/watch?v=${b.id}" rel="nofollow">${esc(b.title)}</a><br><span>${PAR[lg]} ${PROD_SLUG.has(b.prod) ? `<a href="beatmaker/${PROD_SLUG.get(b.prod)}/">${esc(b.prod)}</a>` : esc(b.prod)} · ${esc(nomStyle(b.style, lg))} · ${b.bpm} BPM${b.key ? " · " + esc(b.key) : ""}</span></div></li>`).join("")}
</ol>`;
const ldListe = (nom, url, l) => ({
  "@context": "https://schema.org", "@type": "CollectionPage", name: nom, url,
  mainEntity: { "@type": "ItemList", numberOfItems: l.length,
    itemListElement: l.slice(0, 30).map((b, i) => ({ "@type": "ListItem", position: i + 1,
      item: { "@type": "MusicRecording", name: b.title, url: `https://www.youtube.com/watch?v=${b.id}`, byArtist: { "@type": "Person", name: b.prod }, ...(b.dur ? { duration: `PT${Math.floor(b.dur / 60)}M${b.dur % 60}S` } : {}) } })) }
});
const fil = (...niveaux) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: [["FINDINGS", SITE], ...niveaux].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: u })) });
const nbBeatmakers = l => new Set(l.map(b => b.prod)).size;
const STYLE_TRAD = { "Piano triste": { en: "Sad piano" }, "Emo rap / guitare": { en: "Emo rap / guitar", es: "Emo rap / guitarra" } };
const nomStyle = (k, lg) => { const n = STYLE_NAME[k] || k; return (STYLE_TRAD[n] && STYLE_TRAD[n][lg]) || n; };

/* pied de page : des liens ecrits dans chaque page vers les styles et les artistes, pour
   que Google decouvre tout le site depuis n'importe quelle page */
const PIED = Object.fromEntries(LANGUES.map(lg => {
  const st = Object.keys(STYLE_NAME).filter(k => BEATS.some(b => b.style === k));
  const ar = Object.keys(ARTIST_NAME).map(a => [a, BEATS.filter(b => (b.artists || []).includes(a)).length]).filter(([, n]) => n).sort((x, y) => y[1] - x[1]).slice(0, 60);
  const T = { fr: ["Parcourir FINDINGS", "Type beats par style", "Type beats par artiste"],
              en: ["Browse FINDINGS", "Type beats by style", "Type beats by artist"],
              es: ["Explorar FINDINGS", "Type beats por estilo", "Type beats por artista"] }[lg];
  return [lg, `<nav class="pied-liens" aria-label="${T[0]}" translate="no">
    <section><b>${T[1]}</b><div>${st.map(k => `<a href="style/${encodeURIComponent(k)}/">${esc(nomStyle(k, lg))}</a>`).join("")}</div></section>
    <section><b>${T[2]}</b><div>${ar.map(([a]) => `<a href="artiste/${encodeURIComponent(a)}/">${esc(ARTIST_NAME[a])}</a>`).join("")}</div></section>
  </nav>`];
}));

/* ─────────── ecrire ─────────── */
fs.mkdirSync(OUT, { recursive: true });
for (const d of ["artiste", "style", "beatmaker", "studio", "pour-les-beatmakers", "en", "es"]) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
const ecrire = (chemin, contenu) => { const f = path.join(OUT, chemin); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu); };
const urls = [];
const ajouter = (chemin, html, prio = .6) => { ecrire(chemin ? chemin + "index.html" : "index.html", html); urls.push([chemin, prio]); };

/* Textes des pages, par langue. */
const TX = {
  fr: {
    accTitre: "FINDINGS : type beats à écouter et studio pour poser ta topline",
    accDesc: (n, st) => `${n} type beats récents à écouter direct (rap FR, drill, afro, reggaeton… ${st} styles), triés par artiste, style, mood et tempo. Et un studio gratuit pour poser ta topline dessus.`,
    stuTitre: "Studio en ligne gratuit : pose ta topline sur une prod | FINDINGS",
    stuDesc: "Enregistre ta voix sur une prod du site ou sur la tienne, corrige la justesse (Auto-Pitch, Tune Pro), nettoie le bruit, mixe en un clic et exporte en WAV. Gratuit, dans le navigateur, sans compte.",
    offTitre: "Pour les beatmakers : mets tes prods en avant sur FINDINGS", offFil: "Pour les beatmakers",
    offDesc: (n, bm) => `FINDINGS range ${n} type beats de ${bm} beatmakers par artiste, style et mood. Mets ta prod en tête de l'accueil et des recherches, et donne à ta page un profil Pro : bannière, bio, badge vérifié, liens vers ta boutique.`,
    os: "Navigateur web", studio: "Studio",
    artiste: "Artiste", artistes: "Artistes", style: "Style", styles: "Styles", beatmakers: "Beatmakers",
    artP: (nom, n, bm, st) => `Les ${n} meilleurs type beats ${nom} du moment, par ${bm} beatmakers : des prods récentes (${st}) à écouter direct, triées par tempo, mood et tonalité. Pose ta topline dessus dans le studio.`,
    artNav: "Artistes proches",
    artTitre: (nom, n) => `${nom} type beat : ${n} prods à écouter | FINDINGS`,
    artDesc: (nom, n, bm, st) => `Les meilleurs type beats ${nom} du moment : ${n} prods récentes à écouter direct, par ${bm} beatmakers. ${st}.`,
    styP: (nom, n, bm) => `${n} type beats ${nom} récents à écouter direct, par ${bm} beatmakers. Filtre par artiste, mood et tempo, et pose ta topline dessus dans le studio.`,
    styNav: "Artistes de ce style",
    styDesc: (nom, n, bm) => `${n} type beats ${nom} récents à écouter direct sur FINDINGS, par ${bm} beatmakers.`,
    bmP: (nom, n, abo, st, vises) => `${n} prods de ${nom} sur FINDINGS${abo ? ` (${abo} abonnés sur YouTube)` : ""} : ${st}${vises ? `, des type beats ${vises}` : ""}. À écouter direct, et à utiliser pour ta topline dans le studio.`,
    bmNav: "Artistes visés",
    bmTitre: (nom, n) => `${nom} : ${n} type beats à écouter | FINDINGS`,
    bmDesc: (nom, n, st, vises) => `Les ${n} prods de ${nom} sur FINDINGS : ${st}${vises ? `. Type beats ${vises}` : ""}.`
  },
  en: {
    accTitre: "FINDINGS: type beats to listen to, and a free studio to record your topline",
    accDesc: (n, st) => `${n} recent type beats to listen to right away (French rap, drill, afro, reggaeton… ${st} styles), sorted by artist, style, mood and tempo. Plus a free studio to record your topline on them.`,
    stuTitre: "Free online studio: record your topline on a beat | FINDINGS",
    stuDesc: "Record your voice on a beat from the site or on your own, fix the pitch (Auto-Pitch, Tune Pro), clean the noise, mix in one click and export as WAV. Free, in your browser, no account.",
    offTitre: "For beatmakers: put your beats in the spotlight on FINDINGS", offFil: "For beatmakers",
    offDesc: (n, bm) => `FINDINGS sorts ${n} type beats from ${bm} beatmakers by artist, style and mood. Put your beat at the top of the home page and searches, and give your page a Pro profile: banner, bio, verified badge, links to your store.`,
    os: "Web browser", studio: "Studio",
    artiste: "Artist", artistes: "Artists", style: "Style", styles: "Styles", beatmakers: "Beatmakers",
    artP: (nom, n, bm, st) => `The ${n} best ${nom} type beats right now, by ${bm} beatmakers: recent beats (${st}) to listen to right away, sorted by tempo, mood and key. Record your topline on them in the studio.`,
    artNav: "Similar artists",
    artTitre: (nom, n) => `${nom} type beat: ${n} beats to listen to | FINDINGS`,
    artDesc: (nom, n, bm, st) => `The best ${nom} type beats right now: ${n} recent beats to listen to right away, by ${bm} beatmakers. ${st}.`,
    styP: (nom, n, bm) => `${n} recent ${nom} type beats to listen to right away, by ${bm} beatmakers. Filter by artist, mood and tempo, and record your topline on them in the studio.`,
    styNav: "Artists in this style",
    styDesc: (nom, n, bm) => `${n} recent ${nom} type beats to listen to right away on FINDINGS, by ${bm} beatmakers.`,
    bmP: (nom, n, abo, st, vises) => `${n} beats by ${nom} on FINDINGS${abo ? ` (${abo} YouTube subscribers)` : ""}: ${st}${vises ? `, ${vises} type beats` : ""}. Listen right away, and use them for your topline in the studio.`,
    bmNav: "Target artists",
    bmTitre: (nom, n) => `${nom}: ${n} type beats to listen to | FINDINGS`,
    bmDesc: (nom, n, st, vises) => `The ${n} beats by ${nom} on FINDINGS: ${st}${vises ? `. ${vises} type beats` : ""}.`
  },
  es: {
    accTitre: "FINDINGS: type beats para escuchar y un estudio gratis para grabar tu topline",
    accDesc: (n, st) => `${n} type beats recientes para escuchar al instante (rap francés, drill, afro, reggaeton… ${st} estilos), ordenados por artista, estilo, mood y tempo. Y un estudio gratis para grabar tu topline encima.`,
    stuTitre: "Estudio online gratis: graba tu topline sobre un beat | FINDINGS",
    stuDesc: "Graba tu voz sobre un beat del sitio o sobre el tuyo, corrige la afinación (Auto-Pitch, Tune Pro), limpia el ruido, mezcla en un clic y exporta en WAV. Gratis, en el navegador, sin cuenta.",
    offTitre: "Para beatmakers: destaca tus beats en FINDINGS", offFil: "Para beatmakers",
    offDesc: (n, bm) => `FINDINGS ordena ${n} type beats de ${bm} beatmakers por artista, estilo y mood. Pon tu beat arriba del inicio y de las búsquedas, y dale a tu página un perfil Pro: banner, bio, insignia verificada, enlaces a tu tienda.`,
    os: "Navegador web", studio: "Estudio",
    artiste: "Artista", artistes: "Artistas", style: "Estilo", styles: "Estilos", beatmakers: "Beatmakers",
    artP: (nom, n, bm, st) => `Los ${n} mejores type beats de ${nom} del momento, de ${bm} beatmakers: beats recientes (${st}) para escuchar al instante, ordenados por tempo, mood y tonalidad. Graba tu topline encima en el estudio.`,
    artNav: "Artistas parecidos",
    artTitre: (nom, n) => `${nom} type beat: ${n} beats para escuchar | FINDINGS`,
    artDesc: (nom, n, bm, st) => `Los mejores type beats de ${nom} del momento: ${n} beats recientes para escuchar al instante, de ${bm} beatmakers. ${st}.`,
    styP: (nom, n, bm) => `${n} type beats de ${nom} recientes para escuchar al instante, de ${bm} beatmakers. Filtra por artista, mood y tempo, y graba tu topline encima en el estudio.`,
    styNav: "Artistas de este estilo",
    styDesc: (nom, n, bm) => `${n} type beats de ${nom} recientes para escuchar al instante en FINDINGS, de ${bm} beatmakers.`,
    bmP: (nom, n, abo, st, vises) => `${n} beats de ${nom} en FINDINGS${abo ? ` (${abo} suscriptores en YouTube)` : ""}: ${st}${vises ? `, type beats de ${vises}` : ""}. Para escuchar al instante y usar en tu topline en el estudio.`,
    bmNav: "Artistas",
    bmTitre: (nom, n) => `${nom}: ${n} type beats para escuchar | FINDINGS`,
    bmDesc: (nom, n, st, vises) => `Los ${n} beats de ${nom} en FINDINGS: ${st}${vises ? `. Type beats de ${vises}` : ""}.`
  }
};
const nStyles = new Set(BEATS.map(b => b.style)).size;
const parArtiste = {}; BEATS.forEach(b => (b.artists || []).forEach(a => (parArtiste[a] = parArtiste[a] || []).push(b)));
const artistesTries = Object.keys(parArtiste).filter(a => ARTIST_NAME[a]).sort((a, b) => parArtiste[b].length - parArtiste[a].length);
const parStyle = {}; BEATS.forEach(b => (parStyle[b.style] = parStyle[b.style] || []).push(b));
for (const lg of LANGUES) {
  const t = TX[lg], P = prefixe(lg), S = SITE + P, pied = PIED[lg];
  const page = o => pageHTML({ ...o, lg, pied });
  const mettre = (chemin, html, prio) => ajouter(P + chemin, html, prio);

  // accueil
  mettre("", page({ chemin: "", vue: "accueil", titre: t.accTitre, description: t.accDesc(BEATS.length, nStyles),
    ld: [{ "@context": "https://schema.org", "@type": "WebSite", name: "FINDINGS", url: S, inLanguage: lg,
      potentialAction: { "@type": "SearchAction", target: `${S}?q={search_term_string}`, "query-input": "required name=search_term_string" } }] }), 1);

  // studio
  mettre("studio/", page({ chemin: "studio/", vue: "studio", titre: t.stuTitre, description: t.stuDesc,
    ld: [{ "@context": "https://schema.org", "@type": "WebApplication", name: "Studio FINDINGS", url: S + "studio/", inLanguage: lg, applicationCategory: "MultimediaApplication", operatingSystem: t.os, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } }, fil([t.studio, S + "studio/"])] }), .8);

  // l'offre aux beatmakers
  mettre("pour-les-beatmakers/", page({ chemin: "pour-les-beatmakers/", vue: "offre", titre: t.offTitre, description: t.offDesc(BEATS.length, SLUG_PROD.size),
    ld: [fil([t.offFil, S + "pour-les-beatmakers/"])] }), .6);

  // artistes
  for (const id of artistesTries) {
    const nom = ARTIST_NAME[id], l = trier(parArtiste[id]), chemin = `artiste/${encodeURIComponent(id)}/`;
    const styles = [...new Set(l.map(b => nomStyle(b.style, lg)))].slice(0, 3).join(", ");
    const voisins = artistesTries.filter(a => a !== id && parArtiste[a].some(b => b.style === l[0].style)).slice(0, 10);
    const pre = `<section class="seo-pre" id="seoPre">
  <span class="eyebrow">${t.artiste}</span>
  <h1>${esc(nom)} type beat</h1>
  <p>${esc(t.artP(nom, l.length, nbBeatmakers(l), styles))}</p>
  ${liste(l, 40, lg)}
  <nav aria-label="${t.artNav}">${voisins.map(a => `<a href="artiste/${encodeURIComponent(a)}/">${esc(ARTIST_NAME[a])} type beat</a>`).join("")}</nav>
</section>`;
    mettre(chemin, page({ chemin, vue: "prods", pre, image: INFO[id] && INFO[id].img,
      titre: t.artTitre(nom, l.length), description: t.artDesc(nom, l.length, nbBeatmakers(l), styles),
      ld: [ldListe(`${nom} type beat`, S + chemin, l), fil([t.artistes, S], [`${nom} type beat`, S + chemin])] }), .8);
  }

  // styles
  for (const k of Object.keys(parStyle).sort((a, b) => parStyle[b].length - parStyle[a].length)) {
    const nom = nomStyle(k, lg), l = trier(parStyle[k]), chemin = `style/${encodeURIComponent(k)}/`;
    const art = artistesTries.filter(a => parArtiste[a].some(b => b.style === k)).slice(0, 12);
    const pre = `<section class="seo-pre" id="seoPre">
  <span class="eyebrow">${t.style}</span>
  <h1>${esc(nom)} type beat</h1>
  <p>${esc(t.styP(nom, l.length, nbBeatmakers(l)))}</p>
  ${liste(l, 40, lg)}
  <nav aria-label="${t.styNav}">${art.map(a => `<a href="artiste/${encodeURIComponent(a)}/">${esc(ARTIST_NAME[a])} type beat</a>`).join("")}</nav>
</section>`;
    mettre(chemin, page({ chemin, vue: "prods", pre,
      titre: t.artTitre(nom, l.length), description: t.styDesc(nom, l.length, nbBeatmakers(l)),
      ld: [ldListe(`${nom} type beat`, S + chemin, l), fil([t.styles, S], [`${nom} type beat`, S + chemin])] }), .7);
  }

  // beatmakers
  for (const [slug, nomP] of SLUG_PROD) {
    const l = trier(BEATS.filter(b => b.prod === nomP)), chemin = `beatmaker/${slug}/`;
    const c = CHANS[CHAN_DE.get(nomP)] || {}, nom = c.n || nomP;
    const vises = [...new Set(l.flatMap(b => b.artists || []))].filter(a => ARTIST_NAME[a]).slice(0, 6);
    const styles = [...new Set(l.map(b => nomStyle(b.style, lg)))].slice(0, 3).join(", ");
    const vNoms = vises.map(a => ARTIST_NAME[a]).join(", "), pro = PRO.beatmakers[nomP];
    const pre = `<section class="seo-pre" id="seoPre">
  <span class="eyebrow">Beatmaker</span>
  <h1>${esc(nom)}</h1>
  ${pro && pro.bio ? `<p>${esc(pro.bio)}</p>` : ""}
  <p>${esc(t.bmP(nom, l.length, c.s, styles, vNoms))}</p>
  ${liste(l, 40, lg)}
  <nav aria-label="${t.bmNav}">${vises.map(a => `<a href="artiste/${encodeURIComponent(a)}/">${esc(ARTIST_NAME[a])} type beat</a>`).join("")}</nav>
</section>`;
    mettre(chemin, page({ chemin, vue: "prods", pre, image: (pro && pro.banniere) || c.a,
      titre: t.bmTitre(nom, l.length), description: pro && pro.bio ? pro.bio.slice(0, 160) : t.bmDesc(nom, l.length, styles, vNoms),
      ld: [ldListe(nom, S + chemin, l), fil([t.beatmakers, S], [nom, S + chemin])] }), .5);
  }
}

// 404 : l'application, qui lit l'adresse (beatmakers sans page, liens anciens…)
ecrire("404.html", pageHTML({ chemin: "404.html", vue: "accueil", indexer: false, base: SITE_PATH,
  titre: "FINDINGS", description: "Type beats à écouter et studio pour poser ta topline." }));

// ressources partagees
ecrire("app.css", css);
ecrire("app.js", appJs);
/* Catalogue publie, compact : les prods en colonnes (sans repeter les noms de champs), les
   dates en jours, les moods et les « estimes » en bits, les beatmakers et leurs chaines dans
   une table. Le navigateur reconstitue exactement les memes objets (deplierCatalogue dans
   index.html). Les profils des chaines (avatars, bannieres : un tiers du poids) partent dans
   chans.js, charge apres l'affichage. L'ingestion garde le catalogue complet. */
{
  const J0 = Date.UTC(2020, 0, 1), jour = d => d ? Math.round((Date.parse(d + "T00:00:00Z") - J0) / 864e5) : null;
  const MOODS = [...new Set(BEATS.flatMap(b => b.moods || []))], EST = [...new Set(BEATS.flatMap(b => b.est || []))];
  const CLES = [...new Set(BEATS.map(b => b.key || ""))], STY = [...new Set(BEATS.map(b => b.style))];
  const ARTI = (CAT.artists || []).map(a => a.id), iArt = new Map(ARTI.map((id, i) => [id, i]));
  const prods = [], iProd = new Map();
  const YT = "https://www.youtube.com/";
  for (const b of BEATS) { const k = b.prod + "\u0000" + (b.chan || ""); if (!iProd.has(k)) { iProd.set(k, prods.length); prods.push([b.prod, (b.chan || "").startsWith(YT) ? b.chan.slice(YT.length) : (b.chan || "")]); } }
  const bits = (l, ref) => (l || []).reduce((m, x) => m | (1 << ref.indexOf(x)), 0);
  const rows = BEATS.map(b => [b.id, b.title, iProd.get(b.prod + "\u0000" + (b.chan || "")), STY.indexOf(b.style), b.dur, b.views, jour(b.published), b.bpm,
    CLES.indexOf(b.key || ""), bits(b.moods, MOODS), b.refs && b.refs.length ? b.refs : 0, b.fr ? 1 : 0, jour(b.addedAt), (b.artists || []).map(a => iArt.get(a)).filter(x => x != null), bits(b.est, EST), b.buy ? b.buy.replace(/^https:\/\//, "") : 0]);
  // profils des chaines a part, l'hote des images abrege en « ~ »
  const IMG = "https://yt3.googleusercontent.com/", abreger = u => typeof u === "string" && u.startsWith(IMG) ? "~" + u.slice(IMG.length) : u;
  const chans = Object.fromEntries(Object.entries(CAT.chans || {}).map(([u, c]) => [u, Object.fromEntries(Object.entries(c).filter(([k]) => k !== "t").map(([k, v]) => [k, abreger(v)]))]));
  const chansTxt = `window.FINDINGS_CHANS=${json(chans)};\n`;
  fs.writeFileSync(path.join(OUT, "chans.js"), chansTxt);
  const petit = { v: 1, updatedAt: CAT.updatedAt, lastRun: CAT.lastRun, styles: CAT.styles, maxAgeMonths: CAT.maxAgeMonths, artists: CAT.artists,
    artistMaxAgeMonths: CAT.artistMaxAgeMonths, artistMin: CAT.artistMin, artistInfo: CAT.artistInfo, exclus: CAT.exclus,
    chansUrl: `chans.js?v=${empreinte(chansTxt)}`, moodsL: MOODS, estL: EST, cles: CLES, sty: STY, prods, rows, pro: PRO };
  fs.writeFileSync(path.join(OUT, "catalog.js"), `window.FINDINGS_CATALOG_C=${json(petit)};\n`);
}
fs.writeFileSync(path.join(OUT, "studio.js"), studioJs);
for (const f of ["favicon.svg", "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-512.png", "app.html"])
  if (fs.existsSync(path.join(DIR, f))) fs.copyFileSync(path.join(DIR, f), path.join(OUT, f));

// plan du site et consignes aux robots
const jour = (CAT.updatedAt || new Date().toISOString()).slice(0, 10);
ecrire("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(([c, p]) => { const r = c.replace(/^(en|es)\//, "");
  return `  <url><loc>${esc(SITE + c)}</loc><lastmod>${jour}</lastmod><priority>${p.toFixed(1)}</priority>${LANGUES.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(SITE + prefixe(l) + r)}"/>`).join("")}</url>`; }).join("\n")}
</urlset>
`);
ecrire("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
ecrire(".nojekyll", "");   // GitHub Pages sert les fichiers tels quels, sans passer par Jekyll

console.log(`build : ${urls.length} pages en ${LANGUES.length} langues (${artistesTries.length} artistes, ${Object.keys(parStyle).length} styles, ${SLUG_PROD.size} beatmakers, studio, accueil) → ${path.relative(DIR, OUT) || "."}`);
