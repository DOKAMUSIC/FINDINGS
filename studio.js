/* ═══════════ FINDINGS — studio ═══════════
   Une petite station audio dans le navigateur, a la maniere de GarageBand : une timeline
   calee sur la prod, des pistes de voix, des regions qu'on deplace, rogne, coupe, avec
   fondus, volume, panoramique et effets par piste, enregistrement direct a la position du
   curseur (il remplace ce qui etait la), annuler/retablir et export WAV.

   La contrainte qui decide de tout : le son de la prod reste dans le lecteur YouTube, le
   navigateur interdit d'y toucher. La piste « Prod » n'est donc qu'un repere (on ne voit
   pas son onde, on ne la coupe pas, on ne l'exporte pas). Les voix, elles, sont jouees par
   l'API Web Audio, calees en continu sur la position de la prod : la timeline suit le
   lecteur, et le lecteur suit la timeline.

   Avec sa propre prod importee (le fichier recupere chez le beatmaker), tout change : le
   studio joue la prod lui-meme, avec la meme horloge que les voix. La synchro est alors
   parfaite, la prod a sa forme d'onde, et l'export peut la contenir.

   Ce fichier s'appuie sur la page : player, current, BY_ID, PRISES_DB, TOPLINE_N, chercher,
   togglePlay, esc, chanUrl… (portee globale des scripts classiques). */
const STUDIO = (() => {
  /* ─────────────────────────── styles ─────────────────────────── */
  document.head.insertAdjacentHTML("beforeend", `<style>
  .daw{
    position:fixed;z-index:58;left:12px;right:12px;top:12px;
    bottom:calc(var(--bar-h) + 30px + env(safe-area-inset-bottom,0px));
    display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;
    border-radius:var(--r-xl);background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);
    color:var(--ink);opacity:0;transform:translateY(12px) scale(.985);transition:opacity .2s,transform .24s cubic-bezier(.2,.9,.25,1.1);
    --hw:196px;--rh:74px;
  }
  .daw.on{opacity:1;transform:none}
  /* dans la page Studio : le studio occupe la page, sous l'en-tete et au-dessus du lecteur */
  .daw.inline{position:relative;left:auto;right:auto;top:auto;bottom:auto;z-index:1;
    height:max(520px,calc(100vh - var(--hh,64px) - var(--bar-h) - 64px));box-shadow:var(--sh-2)}
  .daw.inline #dawFermer{display:none}
  .daw[hidden]{display:none}
  .daw button{color:inherit}
  /* barre du haut */
  .daw-haut{display:flex;align-items:center;gap:14px;padding:10px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--surface-2)}
  .daw-id{min-width:0;flex:1 1 180px;display:grid}
  .daw-id .eyebrow{color:var(--accent);display:flex;align-items:center;gap:5px}
  .daw-id b{font-size:15px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-id span.info{font-size:11.5px;color:var(--dim);font-variant-numeric:tabular-nums}
  .daw-transport{display:flex;align-items:center;gap:6px;padding:4px;border-radius:999px;background:var(--hover)}
  .daw-b{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;transition:background .12s,transform .12s}
  .daw-b:hover{background:var(--hover)}
  .daw-b:active{transform:scale(.94)}
  .daw-b.lire{width:42px;height:42px;background:var(--ink);color:var(--on-ink)}
  .daw-b.rec{color:var(--accent)}
  .daw-b.rec.on{background:var(--accent);color:#fff;animation:daw-pulse 1.1s ease-in-out infinite}
  @keyframes daw-pulse{50%{box-shadow:0 0 0 6px rgba(250,35,59,.25)}}
  .daw-temps{font-family:var(--mono);font-size:15px;font-weight:600;min-width:86px;text-align:center;font-variant-numeric:tabular-nums}
  .daw-temps small{display:block;font-size:10px;font-weight:500;color:var(--dim)}
  .daw-outils{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
  .daw-o{height:34px;min-width:34px;padding:0 9px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink-2)}
  .daw-o:hover{background:var(--hover)}
  .daw-o[disabled]{opacity:.35;pointer-events:none}
  .daw-o[aria-pressed="true"]{background:var(--accent-soft);color:var(--accent)}
  .daw-o.pri{background:var(--accent);color:#fff;padding:0 14px}
  .daw-zoom{display:flex;align-items:center;gap:6px;color:var(--dim);margin:0 4px}
  .daw-zoom input{width:90px;accent-color:var(--accent)}
  .daw-sep{width:1px;height:22px;background:var(--line);margin:0 4px}
  /* zone des pistes */
  .daw-zone{position:relative;overflow:auto;overscroll-behavior:contain;background:var(--bg)}
  .daw-grille{position:relative;min-height:100%}
  .daw-ligne{display:flex;min-height:var(--rh);border-bottom:1px solid var(--line-soft)}
  .daw-coin,.daw-tete{position:sticky;left:0;z-index:4;width:var(--hw);flex:0 0 var(--hw);background:var(--surface);border-right:1px solid var(--line)}
  .daw-ligne.regle{position:sticky;top:0;z-index:6;min-height:30px;height:30px}
  .daw-coin{z-index:7;display:flex;align-items:center;padding:0 12px;font-size:10.5px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--dimmer)}
  .daw-regle{position:relative;height:30px;background:var(--surface);cursor:pointer;flex:0 0 auto}
  .daw-regle span{position:absolute;top:0;bottom:0;border-left:1px solid var(--line);padding:7px 0 0 5px;font-size:10.5px;font-weight:600;color:var(--dim);font-variant-numeric:tabular-nums;pointer-events:none}
  .daw-voie{position:relative;flex:0 0 auto;align-self:stretch;min-height:var(--rh);cursor:text;touch-action:pan-x pan-y;
    background-image:linear-gradient(to right,var(--line) 1px,transparent 1px),linear-gradient(to right,var(--line-soft) 1px,transparent 1px);
    background-size:var(--mesure) 100%,var(--temps) 100%}
  .daw-ligne.sel-piste .daw-voie{background-color:color-mix(in srgb,var(--accent) 4%,transparent)}
  /* en-tetes de piste */
  .daw-tete{display:grid;align-content:center;gap:6px;padding:8px 10px 8px 14px;cursor:pointer;position:sticky}
  .daw-tete::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--pc)}
  .daw-ligne.sel-piste .daw-tete{background:color-mix(in srgb,var(--accent) 7%,var(--surface))}
  .daw-tete .nom{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:650;min-width:0}
  .daw-tete .nom span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-tete .cible{font-size:9.5px;font-weight:700;letter-spacing:.06em;color:var(--accent);flex:0 0 auto}
  .daw-tete .ctl{display:flex;align-items:center;gap:6px}
  .daw-ms{width:24px;height:22px;border-radius:6px;font-size:11px;font-weight:800;background:var(--hover);color:var(--dim)}
  .daw-ms.m[aria-pressed="true"]{background:#FF9F0A;color:#111}
  .daw-ms.s[aria-pressed="true"]{background:#FFD60A;color:#111}
  .daw-tete input[type=range]{width:100%;min-width:0;flex:1;accent-color:var(--pc)}
  .daw-ligne.prod .daw-tete::before{background:var(--sc)}
  .daw-ligne.prod .daw-voie{cursor:pointer}
  .bloc-prod{position:absolute;top:10px;bottom:10px;left:0;border-radius:10px;overflow:hidden;
    background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--sc) 30%,transparent) 0 2px,transparent 2px 6px),color-mix(in srgb,var(--sc) 16%,var(--surface));
    border:1px solid color-mix(in srgb,var(--sc) 45%,transparent);display:flex;align-items:center;padding:0 12px;
    font-size:12px;font-weight:600;color:color-mix(in srgb,var(--sc) 55%,var(--ink));white-space:nowrap}
  .bloc-fichier{position:absolute;top:8px;bottom:8px;border-radius:9px;overflow:hidden;cursor:grab;touch-action:none;
    background:color-mix(in srgb,var(--sc) 70%,#000);box-shadow:0 1px 2px rgba(0,0,0,.25)}
  .bloc-fichier:active{cursor:grabbing}
  .bloc-fichier canvas{position:absolute;left:0;top:16px;height:calc(100% - 18px);pointer-events:none}
  .bloc-fichier .clip-nom{left:8px}
  .daw-importer{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:7px;font-size:11px;font-weight:700;
    background:var(--accent-soft);color:var(--accent);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .daw-importer input{display:none}
  .daw-fichier{display:flex;align-items:center;gap:4px;font-size:10.5px;color:var(--dim);min-width:0}
  .daw-fichier span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-fichier button{width:18px;height:18px;border-radius:50%;flex:0 0 auto;font-size:13px;line-height:1;color:var(--dim)}
  .daw-fichier button:hover{background:var(--hover);color:var(--accent)}
  .daw-mix{display:flex;padding:2px;border-radius:9px;background:var(--hover)}
  .daw-mix[hidden]{display:none}
  .daw-mix button{height:30px;padding:0 9px;border-radius:7px;font-size:11.5px;font-weight:650;color:var(--dim)}
  .daw-mix button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--sh-1)}
  .ajout-piste{display:flex;align-items:center;justify-content:center;min-height:46px}
  .ajout-piste button{font-size:12.5px;font-weight:650;color:var(--accent);padding:6px 10px;border-radius:8px}
  .ajout-piste button:hover{background:var(--accent-soft)}
  /* regions */
  .clip{position:absolute;top:7px;bottom:7px;border-radius:9px;overflow:hidden;cursor:grab;touch-action:none;
    background:color-mix(in srgb,var(--pc) 78%,#000);box-shadow:0 1px 2px rgba(0,0,0,.25);outline:0 solid #fff;transition:outline-width .08s}
  .clip:active{cursor:grabbing}
  .clip.sel{outline:2px solid var(--ink);z-index:2}
  .clip canvas{position:absolute;left:0;top:18px;height:calc(100% - 20px);pointer-events:none}
  .clip .clip-nom{position:absolute;left:20px;top:3px;right:20px;font-size:10.5px;font-weight:700;color:rgba(255,255,255,.92);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
  .clip .poignee{position:absolute;top:0;bottom:0;width:9px;cursor:ew-resize;z-index:2}
  .clip .poignee.g{left:0} .clip .poignee.d{right:0}
  .clip .poignee::after{content:"";position:absolute;top:50%;width:3px;height:22px;margin-top:-11px;border-radius:2px;background:rgba(255,255,255,.7);opacity:0;transition:opacity .12s}
  .clip .poignee.g::after{left:3px} .clip .poignee.d::after{right:3px}
  .clip:hover .poignee::after,.clip.sel .poignee::after{opacity:1}
  .clip .fondu{position:absolute;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:ew-resize;z-index:3;opacity:0;transition:opacity .12s}
  .clip:hover .fondu,.clip.sel .fondu{opacity:1}
  .clip.enreg{background:rgba(250,35,59,.35);border:1px dashed var(--accent);cursor:default}
  .clip.enreg .clip-nom{color:var(--accent)}
  /* curseur de lecture */
  .daw-curseur{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--accent);z-index:5;pointer-events:none}
  .daw-curseur::before{content:"";position:absolute;top:0;left:-5px;border:6px solid transparent;border-top:8px solid var(--accent)}
  /* inspecteur */
  .daw-insp{display:flex;align-items:center;gap:18px;padding:10px 16px;border-top:1px solid var(--line);background:var(--surface-2);overflow-x:auto;min-height:58px;font-size:12px;color:var(--dim)}
  .daw-insp .titre{font-size:12.5px;font-weight:700;color:var(--ink);white-space:nowrap}
  .daw-insp label{display:grid;gap:3px;min-width:110px;white-space:nowrap}
  .daw-insp label b{font-weight:600;color:var(--ink-2);display:flex;justify-content:space-between;gap:8px}
  .daw-insp label b i{font-style:normal;font-family:var(--mono);font-weight:500;color:var(--dim)}
  .daw-insp input[type=range]{width:120px;accent-color:var(--accent)}
  .daw-insp input[type=text]{height:30px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);padding:0 9px;width:130px}
  .daw-insp .bascule{height:30px;padding:0 11px;border-radius:8px;background:var(--hover);font-weight:650;color:var(--ink-2)}
  .daw-insp .bascule[aria-pressed="true"]{background:var(--accent);color:#fff}
  .daw-insp .danger{color:var(--accent);font-weight:650;padding:0 8px;height:30px;border-radius:8px}
  .daw-insp .danger:hover{background:var(--accent-soft)}
  .daw-insp p{margin:0;max-width:520px;line-height:1.4}
  .daw-niv{width:70px;height:5px;border-radius:3px;background:var(--hover);overflow:hidden}
  .daw-niv i{display:block;height:100%;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#34C759,#FFD60A 70%,var(--accent))}
  .daw-decompte{position:absolute;inset:0;z-index:20;display:grid;place-items:center;pointer-events:none;
    font-size:120px;font-weight:900;letter-spacing:-.05em;color:var(--accent);text-shadow:0 10px 40px rgba(250,35,59,.35)}
  .daw-decompte[hidden]{display:none}
  .daw-msg{position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:21;padding:8px 14px;border-radius:999px;
    background:var(--ink);color:var(--on-ink);font-size:12.5px;font-weight:600;box-shadow:var(--sh-2);white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
  .daw-msg[hidden]{display:none}
  body.daw-ouvert{overflow:hidden}
  @media(max-width:760px){
    .daw{left:6px;right:6px;top:6px;--hw:104px;--rh:66px;border-radius:18px}
    .daw-haut{gap:8px;padding:8px 10px}
    .daw-id{flex:1 1 100%}
    .daw-zoom input{width:64px}
    .daw-tete{padding:6px 6px 6px 10px}
    .daw-tete .vol{display:none}
    .daw-insp{gap:12px;padding:8px 10px}
    .daw-sep{display:none}
    .daw-o .lib{display:none}
    #dawFermer{position:absolute;top:8px;right:8px}
    .daw-id{padding-right:40px}
  }
  </style>`);

  /* ─────────────────────────── balisage ─────────────────────────── */
  const I = {
    debut:'<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2.2v14H6zM19 5v14L9 12z"/></svg>',
    lire:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    rec:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6.5"/></svg>',
    couper:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
    suppr:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.8h6V7M6.5 7l1 12.2h9l1-12.2"/></svg>',
    annuler:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    refaire:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
    grille:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4v16M10 4v16M16 4v16M22 4v16"/></svg>',
    export:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
    fermer:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    micro:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    loupe:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4M8.5 11h5"/></svg>'
  };
  document.body.insertAdjacentHTML("beforeend", `
  <div class="daw" id="daw" hidden role="dialog" aria-label="Studio">
    <div class="daw-haut">
      <div class="daw-id"><span class="eyebrow">${I.micro}Studio</span><b id="dawTitre"></b><span class="info" id="dawInfo"></span></div>
      <div class="daw-transport">
        <button class="daw-b" id="dawDebut" title="Revenir au début (Entrée)" aria-label="Revenir au début">${I.debut}</button>
        <button class="daw-b lire" id="dawLire" title="Lecture / pause (Espace)" aria-label="Lecture ou pause">${I.lire}</button>
        <button class="daw-b rec" id="dawRec" title="Enregistrer au curseur (R)" aria-label="Enregistrer">${I.rec}</button>
        <span class="daw-temps" id="dawTemps">0:00.0<small>mesure 1</small></span>
        <span class="daw-niv" aria-hidden="true"><i id="dawNiv"></i></span>
      </div>
      <div class="daw-outils">
        <button class="daw-o" id="dawBascule" hidden></button>
        <button class="daw-o" id="dawCouper" title="Couper au curseur (S)">${I.couper}<span class="lib">Couper</span></button>
        <button class="daw-o" id="dawSuppr" title="Supprimer la région (Suppr)">${I.suppr}</button>
        <span class="daw-sep"></span>
        <button class="daw-o" id="dawAnnuler" title="Annuler (⌘Z)">${I.annuler}</button>
        <button class="daw-o" id="dawRefaire" title="Rétablir (⇧⌘Z)">${I.refaire}</button>
        <span class="daw-sep"></span>
        <button class="daw-o" id="dawGrille" aria-pressed="true" title="Aimanter à la grille (Alt pour s'en affranchir)">${I.grille}<span class="lib">Grille</span></button>
        <span class="daw-zoom" title="Zoom">${I.loupe}<input type="range" id="dawZoom" min="0" max="100" value="45" aria-label="Zoom"></span>
        <span class="daw-mix" id="dawMix" hidden role="group" aria-label="Contenu de l'export">
          <button data-mix="voix" aria-pressed="false">Voix seule</button><button data-mix="tout" aria-pressed="true">Voix + prod</button>
        </span>
        <button class="daw-o pri" id="dawExport" title="Exporter en WAV">${I.export}<span class="lib">Exporter</span></button>
        <button class="daw-o" id="dawFermer" title="Fermer le studio (Échap)" aria-label="Fermer">${I.fermer}</button>
      </div>
    </div>
    <div class="daw-zone" id="dawZone"><div class="daw-grille" id="dawGrilleEl"></div></div>
    <div class="daw-insp" id="dawInsp"></div>
    <div class="daw-decompte" id="dawDecompte" hidden></div>
    <div class="daw-msg" id="dawMsg" hidden></div>
  </div>`);

  const $ = id => document.getElementById(id);
  const el = $("daw"), zone = $("dawZone"), grilleEl = $("dawGrilleEl"), insp = $("dawInsp");
  const COULEURS = ["#FA233B", "#0A84FF", "#30D158", "#FF9F0A", "#BF5AF2", "#64D2FF", "#FF6FA5"];
  const RES = 200;                       // points de forme d'onde par seconde
  const nid = () => Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = t => { t = Math.max(0, t); return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}.${Math.floor((t % 1) * 10)}`; };

  /* ─────────────────────────── etat ─────────────────────────── */
  let ouvert = false, prod = null, P = null;
  const BUF = new Map(), PIC = new Map();     // prise -> AudioBuffer, forme d'onde
  let sel = null;                             // { type:"clip"|"piste", id }
  let zoom = 60, grille = true;
  let histo = [], refaire = [];
  let ctx = null, busV = null, noeuds = new Map();
  let sources = [], plan = null, sale = true, ecarts = 0, boucle = 0, anim = 0;
  let rec = null;                             // enregistrement en cours
  let posArret = 0;                           // position quand la prod est a l'arret
  let fichier = null;                         // la prod importee : { nom, buf, pic }
  let interne = { joue: false, T0: 0, B0: 0 };// horloge du studio quand il joue la prod lui-meme
  let mixExport = "tout";
  const modeFichier = () => !!fichier;
  /* Projet libre : ouvert par le bouton « Studio » sans prod du catalogue. Le studio joue
     alors tout lui-meme (la prod importee, ou rien : on peut poser une voix a cappella). */
  const LIBRE = { id: "libre", title: "Projet libre", bpm: 120, bpmSur: true, style: "trap", prod: "toi", dur: 180 };
  const estLibre = () => !!prod && prod.id === "libre";
  const horlogeInterne = () => modeFichier() || estLibre();

  const audio = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };
  const bpm = () => (P && P.bpm) || (prod && prod.bpm) || 120;
  const tps = () => 60 / bpm();              // un temps
  const mes = () => tps() * 4;               // une mesure (4 temps)
  const duree = () => { let d = 0; try { if (current && current.id === prod.id) d = player.getDuration() || 0; } catch (e) {} return d || (prod && prod.dur) || 180; };
  const snap = (t, libre) => (grille && !libre) ? Math.round(t / tps()) * tps() : t;

  /* ─── l'heure de la prod (le lecteur ne la donne que par paliers : on extrapole) ─── */
  let palier = { v: 0, at: 0 }, suivi = 0;
  const lireBeat = () => { try { return player.getCurrentTime() || 0; } catch (e) { return 0; } };
  const enLecture = () => { try { return player.getPlayerState() === YT.PlayerState.PLAYING; } catch (e) { return false; } };
  const memeProd = () => current && prod && current.id === prod.id;
  function suivre(){
    clearInterval(suivi);
    palier = { v: lireBeat(), at: performance.now() };
    suivi = setInterval(() => { const v = lireBeat(); if (v !== palier.v) palier = { v, at: performance.now() }; }, 25);
  }
  /* A l'arret : juste apres un deplacement, le lecteur renvoie encore l'ancienne position
     pendant un instant — on se fie alors a celle qu'on vient de demander. */
  let dernierSaut = 0;
  const tempsBeat = () => {
    if (horlogeInterne()) return interne.joue ? interne.B0 + (audio().currentTime - interne.T0) : posArret;
    if (memeProd() && enLecture()) return palier.v + (performance.now() - palier.at) / 1000;
    if (!memeProd() || performance.now() - dernierSaut < 1500) return posArret;
    return lireBeat();
  };
  function attendreLecture(){
    const avant = lireBeat(), debut = performance.now();
    return new Promise((ok, ko) => {
      const t = setInterval(() => {
        const v = lireBeat();
        if (enLecture() && v !== avant) { clearInterval(t); palier = { v, at: performance.now() }; ok(); }
        else if (performance.now() - debut > 10000) { clearInterval(t); ko(new Error("la prod ne démarre pas")); }
      }, 20);
    });
  }
  const attendre = ms => new Promise(r => setTimeout(r, ms));
  const joueStudio = () => horlogeInterne() ? interne.joue : (memeProd() && enLecture());
  /* Lecture par le studio (prod importee) : la meme horloge pour la prod et les voix. */
  function lancerInterne(depuis, delai = 0){
    try { player.pauseVideo(); } catch (e) {}
    const c = audio(); c.resume();
    interne = { joue: true, T0: c.currentTime + delai, B0: depuis };
    sale = true;
  }
  function arreterInterne(){
    if (!interne.joue) return;
    posArret = Math.max(0, tempsBeat()); interne.joue = false; arreterSources();
  }
  const finProjet = () => Math.max(fichier ? (P.beatStart || 0) + fichier.buf.duration : 0, ...P.clips.map(k => k.start + k.dur), 0);
  let msgMinuteur = 0;
  function message(t){ const m = $("dawMsg"); m.textContent = t; m.hidden = false; clearTimeout(msgMinuteur); msgMinuteur = setTimeout(() => m.hidden = true, 3200); }

  /* ─────────────────────────── chaine audio ─────────────────────────── */
  function impulsion(c){
    const sr = c.sampleRate, n = Math.floor(sr * 2.4), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * (i < sr * .012 ? i / (sr * .012) : 1);
    }
    return b;
  }
  /* bus communs : sortie, reverb (convolution), echo (pointé, cale sur le tempo) */
  function bus(c){
    // limiteur de sortie : voix + prod depassaient le plein niveau et saturaient a l'export
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12;
    lim.connect(c.destination);
    const master = c.createGain(); master.connect(lim);
    const conv = c.createConvolver(); conv.buffer = impulsion(c);
    const reverb = c.createGain(); reverb.connect(conv); conv.connect(master);
    const dl = c.createDelay(2); dl.delayTime.value = Math.min(1.9, tps() * .75);
    const fb = c.createGain(); fb.gain.value = .36;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3800;
    const echo = c.createGain(); echo.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
    return { master, reverb, echo };
  }
  function chaine(c, b){
    const entree = c.createGain();
    const grave = c.createBiquadFilter(); grave.type = "lowshelf"; grave.frequency.value = 220;
    const aigu = c.createBiquadFilter(); aigu.type = "highshelf"; aigu.frequency.value = 4500;
    const comp = c.createDynamicsCompressor();
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    const fader = c.createGain(), envR = c.createGain(), envE = c.createGain();
    entree.connect(grave); grave.connect(aigu); aigu.connect(comp);
    if (pan) { comp.connect(pan); pan.connect(fader); } else comp.connect(fader);
    fader.connect(b.master); fader.connect(envR); envR.connect(b.reverb); fader.connect(envE); envE.connect(b.echo);
    return { entree, grave, aigu, comp, pan, fader, envR, envE };
  }
  const soloActif = () => P.pistes.some(p => p.solo);
  function regler(n, p, solo){
    n.grave.gain.value = p.fx.grave; n.aigu.gain.value = p.fx.aigu;
    if (p.fx.comp) { n.comp.threshold.value = -24; n.comp.ratio.value = 4; n.comp.knee.value = 8; n.comp.attack.value = .004; n.comp.release.value = .16; }
    else { n.comp.threshold.value = 0; n.comp.ratio.value = 1; n.comp.knee.value = 0; }
    if (n.pan) n.pan.pan.value = p.pan;
    n.fader.gain.value = (!p.mute && (!solo || p.solo)) ? p.vol : 0;
    n.envR.gain.value = p.fx.reverb * .9; n.envE.gain.value = p.fx.echo * .7;
  }
  function construireNoeuds(){
    const c = audio();
    noeuds.forEach(n => { try { n.fader.disconnect(); } catch (e) {} });
    noeuds = new Map();
    if (!busV) busV = bus(c);
    const solo = soloActif();
    P.pistes.forEach(p => { const n = chaine(c, busV); regler(n, p, solo); noeuds.set(p.id, n); });
    if (!gainProd) { gainProd = c.createGain(); gainProd.connect(busV.master); }
    gainProd.gain.value = volBeat() / 100;
    sale = true;
  }
  let gainProd = null;
  const reglerTout = () => { const solo = soloActif(); P.pistes.forEach(p => { const n = noeuds.get(p.id); if (n) regler(n, p, solo); }); };
  /* volume d'une region dans le temps : gain et fondus, a partir de « dans » secondes */
  function enveloppe(param, c, when, dans){
    const g = c.gain, fi = c.fadeIn, fo = c.fadeOut, d = c.dur;
    const val = t => g * Math.min(1, fi > 0 ? t / fi : 1, fo > 0 ? (d - t) / fo : 1);
    param.setValueAtTime(Math.max(0, val(dans)), when);
    if (fi > 0 && dans < fi) param.linearRampToValueAtTime(g * Math.min(1, fo > 0 ? (d - fi) / fo : 1), when + (fi - dans));
    if (fo > 0) {
      const dfo = d - fo;
      if (dans < dfo) param.setValueAtTime(g, when + (dfo - dans));
      param.linearRampToValueAtTime(0, when + (d - dans));
    }
  }
  function arreterSources(){ sources.forEach(s => { try { s.stop(); } catch (e) {} }); sources = []; plan = null; }
  /* Programme toutes les regions a partir de la position B de la prod. */
  function programmer(B){
    arreterSources(); sale = false; ecarts = 0;
    const c = audio(), T = c.currentTime + .04, Bv = B + .04 + (P.decal || 0) / 1000;
    plan = { B0: B + .04, T0: T };
    if (fichier && gainProd) {
      const debut = P.beatStart || 0, fin = debut + fichier.buf.duration, Bp = B + .04;
      if (fin > Bp) {
        const dans = Math.max(0, Bp - debut), s = c.createBufferSource();
        s.buffer = fichier.buf; s.connect(gainProd);
        try { s.start(T + Math.max(0, debut - Bp), dans); sources.push(s); } catch (e) {}
      }
    }
    for (const k of P.clips) {
      if (rec && k.piste === rec.piste && k.start + k.dur > rec.debut) continue;   // ce qu'on remplace se tait
      const n = noeuds.get(k.piste), buf = BUF.get(k.prise);
      if (!n || !buf || k.start + k.dur <= Bv) continue;
      const dans = Math.max(0, Bv - k.start), when = T + Math.max(0, k.start - Bv);
      const s = c.createBufferSource(); s.buffer = buf;
      const g = c.createGain(); s.connect(g); g.connect(n.entree);
      enveloppe(g.gain, k, when, dans);
      try { s.start(when, k.offset + dans, Math.max(.001, k.dur - dans)); sources.push(s); } catch (e) {}
    }
  }
  /* Toutes les 60 ms : les voix suivent la prod (lecture, pause, recherche, buffering). */
  function moteur(){
    if (!ouvert || !P) return;
    if (horlogeInterne()) {
      if (enLecture() && (modeFichier() || interne.joue)) { try { player.pauseVideo(); } catch (e) {} }   // pas deux prods en meme temps
      if (!interne.joue) { if (sources.length) arreterSources(); return; }
      if (sale || !plan) programmer(tempsBeat());
      if (!rec && finProjet() > 0 && tempsBeat() > finProjet() + .4) { arreterInterne(); posArret = 0; }
      return;
    }
    if (!(memeProd() && enLecture())) { if (sources.length) arreterSources(); return; }
    const B = tempsBeat();
    if (sale || !plan) { programmer(B); return; }
    const attendu = plan.B0 + (ctx.currentTime - plan.T0);
    if (Math.abs(attendu - B) > .15) { if (++ecarts >= 2) programmer(B); } else ecarts = 0;
  }

  /* ─────────────────────────── projet ─────────────────────────── */
  const nouvellePiste = i => ({ id: nid(), nom: `Voix ${i + 1}`, vol: 1, pan: 0, mute: false, solo: false, fx: { reverb: 0, echo: 0, grave: 0, aigu: 0, comp: false } });
  function pics(buf){
    const n = Math.ceil(buf.duration * RES), out = new Float32Array(n);
    const chs = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)), per = buf.sampleRate / RES;
    let max = 0;
    for (let i = 0; i < n; i++) {
      let m = 0; const a = Math.floor(i * per), b = Math.min(chs[0].length, Math.floor((i + 1) * per));
      for (let s = a; s < b; s += 2) for (const ch of chs) { const v = ch[s] < 0 ? -ch[s] : ch[s]; if (v > m) m = v; }
      out[i] = m; if (m > max) max = m;
    }
    if (max > 0) for (let i = 0; i < n; i++) out[i] /= max;
    return out;
  }
  async function decoder(p){
    if (BUF.has(p.id)) return true;
    try {
      const b = await audio().decodeAudioData(await p.blob.arrayBuffer());
      BUF.set(p.id, b); PIC.set(p.id, pics(b)); return true;
    } catch (e) { return false; }
  }
  async function charger(b){
    prod = b; sel = null; histo = []; refaire = [];
    let pr = null, prises = [];
    try { pr = await PRISES_DB.lireProjet(b.id); } catch (e) {}
    try { prises = await PRISES_DB.duProd(b.id); } catch (e) { prises = (typeof PRISES_MEMOIRE !== "undefined" ? PRISES_MEMOIRE : []).filter(p => p.prod === b.id); }
    prises.sort((x, y) => x.cree - y.cree);
    const ok = new Set();
    for (const p of prises) if (await decoder(p)) ok.add(p.id);
    if (!pr) pr = { prod: b.id, pistes: [nouvellePiste(0)], clips: [], decal: 0, beatVol: null };
    if (!pr.pistes.length) pr.pistes.push(nouvellePiste(0));
    pr.clips = pr.clips.filter(k => ok.has(k.prise) && pr.pistes.some(p => p.id === k.piste));
    // les prises enregistrees hors du studio (ou avant lui) arrivent sur la premiere piste
    const deja = new Set(pr.clips.map(k => k.prise));
    for (const p of prises) if (ok.has(p.id) && !deja.has(p.id)) {
      const buf = BUF.get(p.id);
      pr.clips.push({ id: nid(), piste: pr.pistes[0].id, prise: p.id, start: p.t0 - (p.lat || 0), offset: 0, dur: buf.duration, gain: 1, fadeIn: .01, fadeOut: .02 });
    }
    if (pr.beatStart == null) pr.beatStart = 0;
    P = pr;
    arreterInterne(); fichier = null;
    try {
      const f = await PRISES_DB.lireFichier(b.id);
      if (f && f.blob) { const buf = await audio().decodeAudioData(await f.blob.arrayBuffer()); fichier = { nom: f.nom, buf, pic: pics(buf) }; }
    } catch (e) { fichier = null; }
    construireNoeuds();
    $("dawTitre").textContent = b.id === "libre" ? (fichier ? fichier.nom.replace(/\.[a-z0-9]+$/i, "") : "Projet libre") : b.title;
    $("dawInfo").textContent = b.id === "libre" ? `${bpm()} BPM · ta prod, tes voix` : `${b.bpmSur ? "" : "~"}${b.bpm} BPM · ${STYLE_NAME[b.style] || b.style} · par ${b.prod}`;
    if (P.beatVol != null) { try { player.setVolume(P.beatVol); } catch (e) {} }
    dessiner(); inspecteur(); outils();
    if (document.body.classList.contains("vue-studio") && typeof BASE !== "undefined") {
      const adr = BASE + "studio/" + (b.id === "libre" ? "" : "?beat=" + encodeURIComponent(b.id));
      if (adr !== location.pathname + location.search) history.replaceState({ vue: "studio" }, "", adr);
    }
  }
  let saveMinuteur = 0;
  function sauver(){ clearTimeout(saveMinuteur); saveMinuteur = setTimeout(() => { try { PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} }, 350); }
  const instantane = () => JSON.stringify({ pistes: P.pistes, clips: P.clips, decal: P.decal, beatStart: P.beatStart });
  function memoriser(avant){ histo.push(avant || instantane()); if (histo.length > 60) histo.shift(); refaire = []; outils(); }
  function restaurer(json){
    const o = JSON.parse(json); P.pistes = o.pistes; P.clips = o.clips; P.decal = o.decal; P.beatStart = o.beatStart || 0;
    if (sel && !(sel.type === "clip" ? P.clips : P.pistes).some(x => x.id === sel.id)) sel = null;
    construireNoeuds(); dessiner(); inspecteur(); outils(); sauver();
  }
  function annuler(){ if (!histo.length) return; refaire.push(instantane()); restaurer(histo.pop()); message("Annulé"); }
  function retablir(){ if (!refaire.length) return; histo.push(instantane()); restaurer(refaire.pop()); message("Rétabli"); }
  const modifie = () => { sale = true; sauver(); outils(); };
  /* Importer sa prod : un fichier audio que le visiteur a sur son appareil (mp3, wav…).
     Il reste dans son navigateur, comme ses prises. */
  async function importer(file){
    if (!file || !P) return;
    if (!/^audio\//.test(file.type) && !/\.(mp3|wav|m4a|aac|ogg|flac|aiff?)$/i.test(file.name)) { message("Choisis un fichier audio (mp3, wav, m4a…)"); return; }
    message("Import de la prod…");
    let buf;
    try { buf = await audio().decodeAudioData(await file.arrayBuffer()); }
    catch (e) { message("Ce fichier n'a pas pu être lu par le navigateur"); return; }
    try { await PRISES_DB.ecrireFichier({ prod: P.prod, nom: file.name, type: file.type, blob: file }); }
    catch (e) { message("Le fichier sera perdu en fermant la page (stockage indisponible)"); }
    arreterSources(); try { player.pauseVideo(); } catch (e) {}
    fichier = { nom: file.name, buf, pic: pics(buf) };
    posArret = tempsBeatYT(); interne.joue = false;
    construireNoeuds(); dessiner(); inspecteur(); outils(); sauver();
    if (estLibre()) $("dawTitre").textContent = file.name.replace(/\.[a-z0-9]+$/i, "");
    message(estLibre() ? "Prod importée : touche R pour enregistrer dessus" : "Prod importée : fais glisser sa région pour la caler sur tes voix si besoin");
  }
  const tempsBeatYT = () => { try { return memeProd() ? lireBeat() : posArret; } catch (e) { return 0; } };
  async function retirerFichier(){
    if (!fichier) return;
    arreterInterne();
    try { await PRISES_DB.supprFichier(P.prod); } catch (e) {}
    fichier = null; construireNoeuds(); dessiner(); inspecteur(); outils();
    message("Retour à la version YouTube");
  }

  /* Les prises qui ne servent plus a aucune region partent a la fermeture (pas avant : on
     pourrait encore annuler). */
  async function ranger(){
    if (!P) return;
    const utiles = new Set(P.clips.map(k => k.prise));
    let prises = []; try { prises = await PRISES_DB.duProd(P.prod); } catch (e) {}
    for (const p of prises) if (!utiles.has(p.id)) { try { await PRISES_DB.suppr(p.id); } catch (e) {} BUF.delete(p.id); PIC.delete(p.id); }
    const n = prises.filter(p => utiles.has(p.id)).length;
    if (BY_ID.has(P.prod)) n ? TOPLINE_N.set(P.prod, n) : TOPLINE_N.delete(P.prod);
    if (typeof majToplines === "function") majToplines();
    if (S.toplines || document.querySelector(".row")) render();
  }

  /* ─────────────────────────── dessin ─────────────────────────── */
  const largeur = () => Math.max(fichier ? 0 : (estLibre() ? 60 : duree()), finProjet(), 10) * zoom + 160;
  function dessiner(){
    if (!P) return;
    const W = largeur(), styleVar = `var(--s-${prod.style})`;
    // regle : un repere par mesure, espaces selon le zoom
    const pasM = mes() * zoom < 34 ? (mes() * zoom < 17 ? 4 : 2) : 1;
    let regle = "";
    for (let m = 0, t = 0; t < W / zoom; m += pasM, t = m * mes()) regle += `<span style="left:${t * zoom}px">${m + 1}</span>`;
    const lignePiste = (p, i) => `
      <div class="daw-ligne piste${sel && sel.type === "piste" && sel.id === p.id ? " sel-piste" : ""}" data-piste="${p.id}" style="--pc:${COULEURS[i % COULEURS.length]}">
        <div class="daw-tete" data-tete="${p.id}">
          <div class="nom"><span>${esc(p.nom)}</span>${pisteCible() && pisteCible().id === p.id ? '<em class="cible">● REC</em>' : ""}</div>
          <div class="ctl">
            <button class="daw-ms m" data-mute="${p.id}" aria-pressed="${p.mute}" title="Muet">M</button>
            <button class="daw-ms s" data-solo="${p.id}" aria-pressed="${p.solo}" title="Solo">S</button>
            <input class="vol" type="range" min="0" max="150" value="${Math.round(p.vol * 100)}" data-vol="${p.id}" aria-label="Volume de ${esc(p.nom)}">
          </div>
        </div>
        <div class="daw-voie" data-voie="${p.id}" style="width:${W}px">
          ${P.clips.filter(k => k.piste === p.id).map(k => regionHTML(k)).join("")}
        </div>
      </div>`;
    grilleEl.style.width = `calc(var(--hw) + ${W}px)`;
    grilleEl.style.setProperty("--mesure", `${mes() * zoom}px`);
    grilleEl.style.setProperty("--temps", `${tps() * zoom}px`);
    grilleEl.innerHTML = `
      <div class="daw-ligne regle"><div class="daw-coin">Mesures</div><div class="daw-regle" id="dawRegle" style="width:${W}px">${regle}</div></div>
      <div class="daw-ligne prod" style="--sc:${styleVar}">
        <div class="daw-tete" title="${fichier ? "Ta prod importée" : "Le son de la prod reste dans le lecteur YouTube"}">
          <div class="nom"><span>Prod</span></div>
          ${fichier
            ? `<div class="daw-fichier"><span title="${esc(fichier.nom)}">${esc(fichier.nom)}</span><button id="dawRetirer" title="Retirer le fichier (revenir à YouTube)" aria-label="Retirer le fichier">×</button></div>`
            : `<label class="daw-importer" title="Importer la prod que tu as récupérée (mp3, wav…)">↥ Importer ma prod<input type="file" id="dawFichier" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.aif,.aiff"></label>`}
          <div class="ctl"><input type="range" min="0" max="100" value="${Math.round(volBeat())}" id="dawVolBeat" aria-label="Volume de la prod" style="accent-color:${styleVar}"></div>
        </div>
        <div class="daw-voie" data-voie="prod" style="width:${W}px">${fichier
          ? `<div class="bloc-fichier" id="dawBlocFichier" style="left:${(P.beatStart || 0) * zoom}px;width:${fichier.buf.duration * zoom}px" title="Fais glisser pour caler la prod sur tes voix"><canvas></canvas><span class="clip-nom">${esc(fichier.nom)}</span></div>`
          : estLibre() ? `<div class="bloc-prod" style="width:${Math.min(W, 60 * zoom)}px;opacity:.6">Aucune prod : importe la tienne (ou dépose le fichier ici)</div>`
          : `<div class="bloc-prod" style="width:${duree() * zoom}px">${esc(prod.title)} · YouTube</div>`}</div>
      </div>
      ${P.pistes.map(lignePiste).join("")}
      <div class="daw-ligne"><div class="daw-tete ajout-piste"><button id="dawAjout">+ Piste</button></div><div class="daw-voie" style="width:${W}px;background-image:none"></div></div>
      <div class="daw-curseur" id="dawCurseur"></div>`;
    grilleEl.querySelectorAll(".clip").forEach(n => ondeRegion(n));
    if (fichier) ondeFichier();
    $("dawMix").hidden = !fichier;
    $("dawMix").querySelectorAll("[data-mix]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mix === mixExport)));
    placerCurseur(tempsBeat());
  }
  const pisteCible = () => (sel && sel.type === "piste" && P.pistes.find(p => p.id === sel.id))
    || (sel && sel.type === "clip" && P.pistes.find(p => p.id === (P.clips.find(k => k.id === sel.id) || {}).piste)) || P.pistes[0];
  function regionHTML(k){
    const n = P.clips.filter(x => x.prise === k.prise).indexOf(k), num = [...new Set(P.clips.map(x => x.prise))].indexOf(k.prise) + 1;
    return `<div class="clip${sel && sel.type === "clip" && sel.id === k.id ? " sel" : ""}" data-clip="${k.id}" style="left:${k.start * zoom}px;width:${Math.max(4, k.dur * zoom)}px">
      <canvas></canvas><span class="clip-nom">Prise ${num}${n > 0 ? ` · ${n + 1}` : ""}${k.gain !== 1 ? ` · ${Math.round(k.gain * 100)} %` : ""}</span>
      <i class="poignee g" data-poignee="g"></i><i class="poignee d" data-poignee="d"></i>
      <i class="fondu" data-fondu="fi" style="left:${Math.max(2, k.fadeIn * zoom - 6)}px"></i>
      <i class="fondu" data-fondu="fo" style="right:${Math.max(2, k.fadeOut * zoom - 6)}px"></i>
    </div>`;
  }
  function ondeRegion(n){
    const k = P.clips.find(x => x.id === n.dataset.clip), pk = k && PIC.get(k.prise); if (!pk) return;
    const cv = n.querySelector("canvas"), w = Math.max(1, Math.round(k.dur * zoom)), W = Math.min(w, 4096);
    const H = Math.max(20, n.clientHeight - 20), dpr = Math.min(2, window.devicePixelRatio || 1), r = w / W;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = w + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.scale(dpr, dpr);
    g.fillStyle = "rgba(255,255,255,.88)";
    const mid = H / 2, gain = Math.min(1.6, k.gain);
    for (let x = 0; x < W; x++) {
      const a = Math.floor((k.offset + (x * r) / zoom) * RES), b = Math.ceil((k.offset + ((x + 1) * r) / zoom) * RES);
      let m = 0; for (let i = a; i < b && i < pk.length; i++) if (pk[i] > m) m = pk[i];
      const h = Math.max(.5, Math.min(mid, m * mid * .95 * gain)); g.fillRect(x, mid - h, 1, h * 2);
    }
    g.fillStyle = "rgba(0,0,0,.32)";
    if (k.fadeIn > 0) { const f = k.fadeIn * zoom / r; g.beginPath(); g.moveTo(0, 0); g.lineTo(f, 0); g.lineTo(0, H); g.fill(); }
    if (k.fadeOut > 0) { const f = k.fadeOut * zoom / r; g.beginPath(); g.moveTo(W, 0); g.lineTo(W - f, 0); g.lineTo(W, H); g.fill(); }
  }
  function ondeFichier(){
    const n = $("dawBlocFichier"); if (!n || !fichier) return;
    const cv = n.querySelector("canvas"), w = Math.max(1, Math.round(fichier.buf.duration * zoom)), W = Math.min(w, 8192);
    const H = Math.max(16, n.clientHeight - 18), dpr = Math.min(2, window.devicePixelRatio || 1), r = w / W, pk = fichier.pic;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = w + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.scale(dpr, dpr); g.fillStyle = "rgba(255,255,255,.8)";
    const mid = H / 2;
    for (let x = 0; x < W; x++) {
      const a = Math.floor(((x * r) / zoom) * RES), b = Math.ceil((((x + 1) * r) / zoom) * RES);
      let m = 0; for (let i = a; i < b && i < pk.length; i++) if (pk[i] > m) m = pk[i];
      const h = Math.max(.5, m * mid * .95); g.fillRect(x, mid - h, 1, h * 2);
    }
  }
  function placerCurseur(t){
    const c = $("dawCurseur"); if (!c) return;
    c.style.left = `calc(var(--hw) + ${t * zoom}px)`;
    const m = Math.floor(t / mes()), tp = Math.floor((t % mes()) / tps());
    $("dawTemps").innerHTML = `${fmt(t)}<small>mesure ${m + 1}.${tp + 1}</small>`;
  }
  function suivreCurseur(){
    cancelAnimationFrame(anim);
    const tour = () => {
      if (!ouvert) return;
      const t = tempsBeat();
      placerCurseur(t);
      if (rec && rec.el) rec.el.style.width = `${Math.max(2, (t - rec.debut) * zoom)}px`;
      const joue = joueStudio();
      $("dawLire").innerHTML = joue ? I.pause : I.lire;
      if (joue) {   // la page suit le curseur
        const hw = grilleEl.querySelector(".daw-tete")?.offsetWidth || 196, x = hw + t * zoom;
        if (x > zone.scrollLeft + zone.clientWidth - 40 || x < zone.scrollLeft + hw) zone.scrollLeft = x - hw - 60;
      }
      anim = requestAnimationFrame(tour);
    };
    anim = requestAnimationFrame(tour);
  }
  /* Passer du projet libre a la prod en cours, et inversement. */
  function bascule(){
    const b = $("dawBascule");
    if (estLibre() && current) { b.hidden = false; b.innerHTML = `↺ <span class="lib">Sur ${esc(current.title.slice(0, 18))}</span>`; b.title = `Ouvrir le studio sur la prod en cours : ${current.title}`; }
    else if (!estLibre()) { b.hidden = false; b.innerHTML = `✦ <span class="lib">Projet libre</span>`; b.title = "Ton projet libre : importe ta propre prod"; }
    else b.hidden = true;
  }
  function outils(){
    bascule();
    $("dawAnnuler").disabled = !histo.length;
    $("dawRefaire").disabled = !refaire.length;
    $("dawSuppr").disabled = !(sel && sel.type === "clip");
    $("dawExport").disabled = !P || !P.clips.length;
    $("dawGrille").setAttribute("aria-pressed", String(grille));
  }

  /* ─────────────────────────── inspecteur ─────────────────────────── */
  const curseur = (nom, id, min, max, pas, val, aff) =>
    `<label><b>${nom}<i id="${id}V">${aff(val)}</i></b><input type="range" id="${id}" min="${min}" max="${max}" step="${pas}" value="${val}"></label>`;
  function inspecteur(){
    if (!P) return;
    const k = sel && sel.type === "clip" && P.clips.find(x => x.id === sel.id);
    const p = sel && sel.type === "piste" && P.pistes.find(x => x.id === sel.id);
    if (k) {
      insp.innerHTML = `<span class="titre">Région</span>
        <span>${fmt(k.start)} → ${fmt(k.start + k.dur)} · ${k.dur.toFixed(1)} s</span>
        ${curseur("Volume", "iGain", 0, 200, 1, Math.round(k.gain * 100), v => v + " %")}
        ${curseur("Fondu d'entrée", "iFi", 0, 3, .05, +k.fadeIn.toFixed(2), v => (+v).toFixed(2) + " s")}
        ${curseur("Fondu de sortie", "iFo", 0, 3, .05, +k.fadeOut.toFixed(2), v => (+v).toFixed(2) + " s")}
        <button class="danger" id="iSupprClip">Supprimer</button>`;
      lier("iGain", v => { k.gain = v / 100; }, true);
      lier("iFi", v => { k.fadeIn = Math.min(+v, k.dur - k.fadeOut); }, true);
      lier("iFo", v => { k.fadeOut = Math.min(+v, k.dur - k.fadeIn); }, true);
      $("iSupprClip").onclick = supprimer;
    } else if (p) {
      const db = v => `${v > 0 ? "+" : ""}${v} dB`, pct = v => `${Math.round(v * 100)} %`;
      insp.innerHTML = `<span class="titre">Piste</span>
        <label><b>Nom</b><input type="text" id="iNom" value="${esc(p.nom)}" maxlength="24"></label>
        ${curseur("Volume", "iVol", 0, 1.5, .01, p.vol, pct)}
        ${curseur("Panoramique", "iPan", -1, 1, .05, p.pan, v => +v === 0 ? "centre" : (v < 0 ? "G " : "D ") + Math.round(Math.abs(v) * 100))}
        ${curseur("Réverb", "iRev", 0, 1, .01, p.fx.reverb, pct)}
        ${curseur("Écho", "iEcho", 0, 1, .01, p.fx.echo, pct)}
        ${curseur("Graves", "iGrave", -12, 12, 1, p.fx.grave, db)}
        ${curseur("Aigus", "iAigu", -12, 12, 1, p.fx.aigu, db)}
        <button class="bascule" id="iComp" aria-pressed="${p.fx.comp}">Compresseur</button>
        ${P.pistes.length > 1 ? '<button class="danger" id="iSupprPiste">Supprimer la piste</button>' : ""}`;
      const reg = () => { const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver(); };
      $("iNom").addEventListener("change", e => { memoriser(); p.nom = e.target.value.trim() || p.nom; dessiner(); sauver(); });
      lier("iVol", v => { p.vol = +v; reg(); });
      lier("iPan", v => { p.pan = +v; reg(); });
      lier("iRev", v => { p.fx.reverb = +v; reg(); });
      lier("iEcho", v => { p.fx.echo = +v; reg(); });
      lier("iGrave", v => { p.fx.grave = +v; reg(); });
      lier("iAigu", v => { p.fx.aigu = +v; reg(); });
      $("iComp").onclick = () => { memoriser(); p.fx.comp = !p.fx.comp; reg(); inspecteur(); };
      if ($("iSupprPiste")) $("iSupprPiste").onclick = () => {
        memoriser(); P.clips = P.clips.filter(k => k.piste !== p.id); P.pistes = P.pistes.filter(x => x !== p); sel = null;
        construireNoeuds(); dessiner(); inspecteur(); modifie();
      };
    } else {
      const ms = v => `${v > 0 ? "+" : ""}${v} ms`;
      insp.innerHTML = `<span class="titre">Studio</span>
        <p>Touche <b>R</b> ou le rond rouge pour enregistrer au curseur sur la piste <b>${esc(pisteCible().nom)}</b> : ce qui était là est remplacé. Fais glisser une région pour la déplacer, ses bords pour la rogner, les points blancs pour les fondus. <b>S</b> coupe au curseur. ${fichier ? "" : "Tu as la prod en fichier ? Importe-la (ou dépose-la ici) : synchro parfaite et export avec la prod."}</p>
        ${curseur("Décalage des voix", "iDecal", -400, 400, 10, P.decal || 0, ms)}
        ${estLibre() ? `<label><b>Tempo de ta prod</b><input type="text" id="iBpm" inputmode="numeric" value="${bpm()}" style="width:80px"></label>` : ""}`;
      lier("iDecal", v => { P.decal = +v; sale = true; }, false, true);
      if ($("iBpm")) $("iBpm").addEventListener("change", e => { const v = Math.round(+e.target.value); if (v >= 50 && v <= 220) { P.bpm = v; sauver(); dessiner(); $("dawInfo").textContent = `${v} BPM · ta prod, tes voix`; } else e.target.value = bpm(); });
    }
  }
  /* un curseur de l'inspecteur : une seule entree d'historique par geste */
  function lier(id, f, redessine, sansMemo){
    const i = $(id), v = $(id + "V"); let memo = false;
    i.addEventListener("input", () => {
      if (!memo && !sansMemo) { memoriser(); memo = true; }
      f(i.value);
      if (v) v.textContent = { iGain: x => x + " %", iFi: x => (+x).toFixed(2) + " s", iFo: x => (+x).toFixed(2) + " s",
        iVol: x => Math.round(x * 100) + " %", iRev: x => Math.round(x * 100) + " %", iEcho: x => Math.round(x * 100) + " %",
        iGrave: x => `${x > 0 ? "+" : ""}${x} dB`, iAigu: x => `${x > 0 ? "+" : ""}${x} dB`,
        iPan: x => +x === 0 ? "centre" : (x < 0 ? "G " : "D ") + Math.round(Math.abs(x) * 100), iDecal: x => `${x > 0 ? "+" : ""}${x} ms` }[id](i.value);
      if (redessine) { const n = grilleEl.querySelector(`.clip[data-clip="${sel.id}"]`); if (n) { const k = P.clips.find(x => x.id === sel.id); n.querySelector(".clip-nom").textContent = n.querySelector(".clip-nom").textContent.replace(/ · \d+ %$/, "") + (k.gain !== 1 ? ` · ${Math.round(k.gain * 100)} %` : ""); ondeRegion(n); } }
      sale = true; sauver();
    });
    i.addEventListener("change", () => { memo = false; });
  }

  /* ─────────────────────────── edition ─────────────────────────── */
  function couper(){
    const t = tempsBeat();
    const vises = sel && sel.type === "clip" ? P.clips.filter(k => k.id === sel.id) : P.clips;
    const coupes = vises.filter(k => t > k.start + .02 && t < k.start + k.dur - .02);
    if (!coupes.length) { message("Place le curseur sur une région pour la couper"); return; }
    memoriser();
    let derniere = null;
    for (const k of coupes) {
      const d = t - k.start;
      const k2 = { ...k, id: nid(), start: t, offset: k.offset + d, dur: k.dur - d, fadeIn: .005, fadeOut: k.fadeOut };
      k.dur = d; k.fadeOut = .005; k.fadeIn = Math.min(k.fadeIn, d);
      P.clips.push(k2); derniere = k2;
    }
    sel = { type: "clip", id: derniere.id };
    dessiner(); inspecteur(); modifie();
  }
  function supprimer(){
    if (!(sel && sel.type === "clip")) return;
    memoriser();
    P.clips = P.clips.filter(k => k.id !== sel.id); sel = null;
    dessiner(); inspecteur(); modifie();
  }
  /* Une nouvelle prise remplace ce qu'elle recouvre sur sa piste (punch-in). */
  function remplacer(nk){
    const a = nk.start, b = nk.start + nk.dur, res = [];
    for (const k of P.clips) {
      const ka = k.start, kb = k.start + k.dur;
      if (k.piste !== nk.piste || kb <= a || ka >= b) { res.push(k); continue; }
      if (ka < a && kb > b) {
        res.push({ ...k, dur: a - ka, fadeOut: .005 });
        res.push({ ...k, id: nid(), start: b, offset: k.offset + (b - ka), dur: kb - b, fadeIn: .005 });
      } else if (ka < a) res.push({ ...k, dur: a - ka, fadeOut: Math.min(k.fadeOut, a - ka) });
      else if (kb > b) res.push({ ...k, start: b, offset: k.offset + (b - ka), dur: kb - b, fadeIn: Math.min(k.fadeIn, kb - b) });
    }
    res.push(nk);
    P.clips = res;
  }
  function ajouterPiste(){
    memoriser();
    const p = nouvellePiste(P.pistes.length); P.pistes.push(p); sel = { type: "piste", id: p.id };
    construireNoeuds(); dessiner(); inspecteur(); modifie();
  }
  function positionner(t){
    t = clamp(t, 0, horlogeInterne() ? Math.max(finProjet(), estLibre() ? 600 : 1) : duree());
    if (horlogeInterne()) {
      posArret = t;
      if (interne.joue) { interne.T0 = audio().currentTime; interne.B0 = t; }
      sale = true; placerCurseur(t); return;
    }
    posArret = t; dernierSaut = performance.now();
    if (memeProd()) { try { chercher(t); } catch (e) {} }
    palier = { v: t, at: performance.now() };
    sale = true; placerCurseur(t);
  }

  /* glisser : deplacer, rogner, fondus — un geste = une entree d'historique */
  let geste = null;
  zone.addEventListener("pointerdown", e => {
    if (rec) return;
    const tete = e.target.closest("[data-tete]");
    if (tete && !e.target.closest("button,input")) { sel = { type: "piste", id: tete.dataset.tete }; dessiner(); inspecteur(); outils(); return; }
    const bf = e.target.closest("#dawBlocFichier");
    if (bf) { e.preventDefault(); geste = { mode: "prod", n: bf, x0: e.clientX, y0: e.clientY, orig: P.beatStart || 0, avant: instantane(), bouge: false }; bf.setPointerCapture(e.pointerId); return; }
    const n = e.target.closest(".clip[data-clip]");
    if (n) {
      e.preventDefault();
      const k = P.clips.find(x => x.id === n.dataset.clip);
      if (!(sel && sel.id === k.id)) { sel = { type: "clip", id: k.id }; grilleEl.querySelectorAll(".clip.sel").forEach(x => x.classList.remove("sel")); n.classList.add("sel"); inspecteur(); outils(); }
      const mode = e.target.dataset.poignee ? "trim" + e.target.dataset.poignee : e.target.dataset.fondu || "move";
      geste = { mode, k, n, x0: e.clientX, y0: e.clientY, orig: { ...k }, avant: instantane(), bouge: false };
      n.setPointerCapture(e.pointerId);
      return;
    }
    const voie = e.target.closest(".daw-voie,.daw-regle");
    if (voie) geste = { mode: "curseur", voie, x0: e.clientX, y0: e.clientY };
  });
  zone.addEventListener("pointermove", e => {
    if (!geste || geste.mode === "curseur") return;
    if (geste.mode === "prod") {
      // calage libre (sans grille) : la prod importee commence rarement pile comme la video
      if (!geste.bouge && Math.abs(e.clientX - geste.x0) < 3) return;
      geste.bouge = true;
      P.beatStart = Math.round((geste.orig + (e.clientX - geste.x0) / zoom) * 1000) / 1000;
      geste.n.style.left = P.beatStart * zoom + "px";
      return;
    }
    const dx = (e.clientX - geste.x0) / zoom, libre = e.altKey, { k, orig, n } = geste;
    if (!geste.bouge && Math.abs(e.clientX - geste.x0) < 3 && Math.abs(e.clientY - geste.y0) < 3) return;
    geste.bouge = true;
    const buf = BUF.get(k.prise), max = buf ? buf.duration : orig.offset + orig.dur;
    if (geste.mode === "move") {
      k.start = Math.max(-orig.offset, snap(orig.start + dx, libre));
      const sous = document.elementFromPoint(e.clientX, e.clientY)?.closest(".daw-voie[data-voie]");
      if (sous && sous.dataset.voie !== "prod" && sous.dataset.voie !== k.piste) { k.piste = sous.dataset.voie; sous.appendChild(n); }
    } else if (geste.mode === "trimg") {
      const d = clamp(snap(orig.start + dx, libre) - orig.start, -orig.offset, orig.dur - .05);
      k.start = orig.start + d; k.offset = orig.offset + d; k.dur = orig.dur - d;
      k.fadeIn = Math.min(k.fadeIn, k.dur - k.fadeOut);
    } else if (geste.mode === "trimd") {
      const fin = clamp(snap(orig.start + orig.dur + dx, libre), orig.start + .05, orig.start + (max - orig.offset));
      k.dur = fin - orig.start; k.fadeOut = Math.min(k.fadeOut, k.dur - k.fadeIn);
    } else if (geste.mode === "fi") k.fadeIn = clamp(orig.fadeIn + dx, 0, k.dur - k.fadeOut);
    else if (geste.mode === "fo") k.fadeOut = clamp(orig.fadeOut - dx, 0, k.dur - k.fadeIn);
    n.style.left = k.start * zoom + "px"; n.style.width = Math.max(4, k.dur * zoom) + "px";
    n.querySelector('[data-fondu="fi"]').style.left = Math.max(2, k.fadeIn * zoom - 6) + "px";
    n.querySelector('[data-fondu="fo"]').style.right = Math.max(2, k.fadeOut * zoom - 6) + "px";
    if (geste.mode !== "move") { cancelAnimationFrame(geste.raf); geste.raf = requestAnimationFrame(() => ondeRegion(n)); }
  });
  zone.addEventListener("pointerup", e => {
    if (!geste) return;
    const g = geste; geste = null;
    if (g.mode === "curseur") {
      if (Math.abs(e.clientX - g.x0) < 5 && Math.abs(e.clientY - g.y0) < 5) {
        const r = g.voie.getBoundingClientRect();
        if (g.voie.classList.contains("daw-voie") && sel && sel.type === "clip") { sel = null; dessiner(); inspecteur(); outils(); }
        positionner((e.clientX - r.left) / zoom);
      }
      return;
    }
    if (g.mode === "prod") { if (g.bouge) { memoriser(g.avant); modifie(); message(`Prod décalée de ${P.beatStart > 0 ? "+" : ""}${P.beatStart.toFixed(3)} s`); } return; }
    if (g.bouge) { memoriser(g.avant); dessiner(); inspecteur(); modifie(); }
  });
  zone.addEventListener("pointercancel", () => { geste = null; });
  zone.addEventListener("click", e => {
    const m = e.target.closest("[data-mute]"), s = e.target.closest("[data-solo]");
    if (m || s) {
      const p = P.pistes.find(x => x.id === (m || s).dataset[m ? "mute" : "solo"]); memoriser();
      if (m) p.mute = !p.mute; else p.solo = !p.solo;
      reglerTout(); dessiner(); sauver(); return;
    }
    if (e.target.closest("#dawAjout")) ajouterPiste();
    if (e.target.closest("#dawRetirer")) { if (confirm("Retirer ta prod importée et revenir à la version YouTube ?")) retirerFichier(); }
  });
  zone.addEventListener("change", e => { if (e.target.id === "dawFichier") importer(e.target.files[0]); });
  // on peut aussi deposer le fichier directement sur le studio
  el.addEventListener("dragover", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault(); });
  el.addEventListener("drop", e => { const f = e.dataTransfer?.files?.[0]; if (f) { e.preventDefault(); importer(f); } });
  zone.addEventListener("input", e => {
    const v = e.target.closest("[data-vol]");
    if (v) { const p = P.pistes.find(x => x.id === v.dataset.vol); p.vol = v.value / 100; reglerTout(); sauver(); if (sel && sel.type === "piste" && sel.id === p.id) inspecteur(); }
    if (e.target.id === "dawVolBeat") {
      const x = +e.target.value; P.beatVol = x; sauver();
      if (modeFichier()) { if (gainProd) gainProd.gain.value = x / 100; return; }
      try { player.setVolume(x); } catch (_) {} try { VOL = x; const g = document.getElementById("vol"); if (g) g.value = x; } catch (_) {}
    }
  });
  const volBeat = () => { try { return P.beatVol != null ? P.beatVol : (typeof VOL !== "undefined" ? VOL : 100); } catch (e) { return 100; } };

  /* ─────────────────────────── enregistrement ─────────────────────────── */
  const MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  async function enregistrer(){
    if (rec) return arreterRec("bouton");
    if (!horlogeInterne() && (!memeProd() || PLAIN || !playerReady)) { message("Lance la prod dans le lecteur pour enregistrer"); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { message("Ce navigateur ne permet pas d'enregistrer le micro"); return; }
    let flux;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { message(e && e.name === "NotAllowedError" ? "Micro refusé : autorise-le dans les réglages du navigateur" : "Aucun micro trouvé"); return; }
    const c = audio(); await c.resume();
    const reglage = flux.getAudioTracks()[0].getSettings();
    const piste = pisteCible(), debut = snap(tempsBeat());
    rec = { flux, piste: piste.id, prod: prod.id, debut, lat: (reglage.latency || .02) + (c.outputLatency || c.baseLatency || .02), annule: false };
    $("dawRec").classList.add("on"); document.body.classList.add("studio-rec");
    // niveau du micro
    const an = c.createAnalyser(); an.fftSize = 1024; c.createMediaStreamSource(flux).connect(an);
    const d = new Float32Array(an.fftSize);
    (function niv(){ if (!rec) { $("dawNiv").style.transform = "scaleX(0)"; return; } an.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x;
      $("dawNiv").style.transform = `scaleX(${clamp((20 * Math.log10(Math.sqrt(s / d.length) + 1e-6) + 60) / 60, 0, 1).toFixed(3)})`; requestAnimationFrame(niv); })();
    try { player.pauseVideo(); } catch (e) {}
    arreterInterne();
    positionner(debut);
    const dc = $("dawDecompte"); dc.hidden = false;
    for (const n of [3, 2, 1]) { dc.textContent = n; await attendre(700); if (!rec || rec.annule) { dc.hidden = true; return; } }
    dc.hidden = true;
    sale = true;
    if (horlogeInterne()) lancerInterne(debut, .05);
    else {
      suivre();
      try { player.playVideo(); await attendreLecture(); }
      catch (e) { nettoyerRec(); message("La prod ne démarre pas, réessaie"); return; }
    }
    if (!rec || rec.annule) return;
    const mime = MIMES.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
    try {
      rec.recorder = new MediaRecorder(flux, mime ? { mimeType: mime } : undefined);
      rec.morceaux = [];
      rec.recorder.ondataavailable = e => { if (e.data && e.data.size) rec && rec.morceaux.push(e.data); };
      rec.recorder.start(250);
    } catch (e) { try { player.pauseVideo(); } catch (_) {} nettoyerRec(); message("L'enregistrement n'a pas pu démarrer : vérifie ton micro"); return; }
    rec.t0 = tempsBeat(); rec.debut = rec.t0 - rec.lat; rec.at = performance.now();
    sale = true;
    // region provisoire qui grandit pendant la prise
    const voie = grilleEl.querySelector(`.daw-voie[data-voie="${rec.piste}"]`);
    if (voie) { voie.insertAdjacentHTML("beforeend", `<div class="clip enreg" style="left:${rec.debut * zoom}px;width:2px"><span class="clip-nom">● Enregistrement…</span></div>`); rec.el = voie.lastElementChild; }
  }
  function nettoyerRec(){
    if (!rec) return;
    try { rec.flux.getTracks().forEach(t => t.stop()); } catch (e) {}
    rec.el && rec.el.remove();
    rec = null; sale = true;
    $("dawRec").classList.remove("on"); document.body.classList.remove("studio-rec");
  }
  async function arreterRec(raison){
    if (!rec) return;
    if (!rec.recorder) { rec.annule = true; nettoyerRec(); return; }
    const r = rec;
    await new Promise(ok => { r.recorder.onstop = ok; try { r.recorder.stop(); } catch (e) { ok(); } });
    if (raison !== "changement" && raison !== "pause") { if (horlogeInterne()) arreterInterne(); else { try { player.pauseVideo(); } catch (e) {} } }
    const dur = (performance.now() - r.at) / 1000;
    const blob = new Blob(r.morceaux, { type: r.recorder.mimeType || "audio/webm" });
    nettoyerRec();
    if (dur < 1 || !blob.size) { message("Prise trop courte : elle n'a pas été gardée"); return; }
    const prise = { id: "p" + Date.now().toString(36), prod: r.prod, t0: r.t0, dur, lat: r.lat, cree: Date.now(), mime: blob.type, blob };
    try { await PRISES_DB.ajouter(prise); } catch (e) { if (typeof PRISES_MEMOIRE !== "undefined") PRISES_MEMOIRE.push(prise); message("Ce navigateur ne garde pas les prises : exporte avant de fermer"); }
    if (!(await decoder(prise))) { message("La prise n'a pas pu être lue"); return; }
    if (BY_ID.has(r.prod)) TOPLINE_N.set(r.prod, (TOPLINE_N.get(r.prod) || 0) + 1);
    if (!P || P.prod !== r.prod) { if (typeof majToplines === "function") majToplines(); return; }   // on a change de prod entre-temps
    memoriser();
    const k = { id: nid(), piste: r.piste, prise: prise.id, start: r.debut, offset: 0, dur: BUF.get(prise.id).duration, gain: 1, fadeIn: .01, fadeOut: .02 };
    remplacer(k);
    sel = { type: "clip", id: k.id };
    dessiner(); inspecteur(); modifie();
    message(raison === "fin" ? "Fin de la prod : prise gardée" : "Prise gardée");
    if (typeof majToplines === "function") majToplines();
  }

  /* ─────────────────────────── export WAV ─────────────────────────── */
  function wav(ab){
    const ch = ab.numberOfChannels, sr = ab.sampleRate, n = ab.length, buf = new ArrayBuffer(44 + n * ch * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * ch * 2, true);
    const data = Array.from({ length: ch }, (_, i) => ab.getChannelData(i)); let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Blob([buf], { type: "audio/wav" });
  }
  /* Le fichier commence a 0:00 de la prod : on le pose au debut de la prod dans n'importe
     quel logiciel et tout tombe en place, effets compris. La prod n'y est pas. */
  async function exporter(){
    if (!P || !P.clips.length) return;
    const btn = $("dawExport"); btn.disabled = true; message("Export en cours…");
    try {
      const dec = (P.decal || 0) / 1000, sr = 44100;
      const avecProd = !!fichier && mixExport === "tout";
      const fin = Math.max(...P.clips.map(k => k.start + k.dur - dec), avecProd ? (P.beatStart || 0) + fichier.buf.duration : 0) + 2.6;
      const oc = new OfflineAudioContext(2, Math.ceil(sr * fin), sr), b = bus(oc), solo = soloActif();
      if (avecProd) {
        const gp = oc.createGain(); gp.gain.value = volBeat() / 100; gp.connect(b.master);
        const s = oc.createBufferSource(); s.buffer = fichier.buf; s.connect(gp);
        const debut = P.beatStart || 0; s.start(Math.max(0, debut), Math.max(0, -debut));
      }
      const ns = new Map(P.pistes.map(p => { const n = chaine(oc, b); regler(n, p, solo); return [p.id, n]; }));
      for (const k of P.clips) {
        const n = ns.get(k.piste), buf = BUF.get(k.prise); if (!n || !buf) continue;
        const debut = k.start - dec, dans = Math.max(0, -debut), when = Math.max(0, debut);
        if (dans >= k.dur) continue;
        const s = oc.createBufferSource(); s.buffer = buf;
        const g = oc.createGain(); s.connect(g); g.connect(n.entree);
        enveloppe(g.gain, k, when, dans);
        s.start(when, k.offset + dans, k.dur - dans);
      }
      const rendu = await oc.startRendering();
      const titre = (estLibre() && fichier ? fichier.nom.replace(/\.[a-z0-9]+$/i, "") : prod.title).replace(/[\\/:*?"<>|]+/g, "").slice(0, 60).trim();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(wav(rendu));
      a.download = avecProd ? `Topline - ${titre} (voix + prod).wav` : `Topline - ${titre} (voix calee sur 0m00s de la prod).wav`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 8000);
      message(avecProd ? "Exporté : ta voix mixée avec la prod" : "Exporté : pose le fichier au tout début de la prod");
    } catch (e) { message("L'export a échoué"); }
    btn.disabled = false;
  }

  /* ─────────────────────────── ouvrir / fermer ─────────────────────────── */
  async function ouvrir(arg){
    const cible = arg && arg.id ? arg : (arg === true || !current ? LIBRE : current);
    if (PLAIN && cible !== LIBRE) { alert("Le studio a besoin du lecteur complet, indisponible ici."); return; }
    audio().resume();
    ouvert = true;
    el.hidden = false; requestAnimationFrame(() => el.classList.add("on"));
    if (!el.classList.contains("inline")) document.body.classList.add("daw-ouvert");
    document.getElementById("micBtn")?.classList.add("on");
    suivre();
    if (!P || P.prod !== cible.id) await charger(cible);
    else { dessiner(); inspecteur(); outils(); }
    clearInterval(boucle); boucle = setInterval(moteur, 60);
    suivreCurseur();
    // le curseur visible a l'ouverture
    const hw = grilleEl.querySelector(".daw-tete")?.offsetWidth || 196;
    zone.scrollLeft = Math.max(0, tempsBeat() * zoom - 120);
  }
  async function fermer(){
    if (rec) await arreterRec("fermeture");
    ouvert = false;
    clearInterval(boucle); cancelAnimationFrame(anim); clearInterval(suivi);
    arreterInterne(); arreterSources();
    el.classList.remove("on");
    document.body.classList.remove("daw-ouvert");
    document.getElementById("micBtn")?.classList.remove("on");
    setTimeout(() => { if (!ouvert) el.hidden = true; }, 220);
    clearTimeout(saveMinuteur); if (P) { try { await PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} }
    ranger();
  }

  /* ─────────────────────────── commandes ─────────────────────────── */
  $("dawLire").onclick = () => {
    audio().resume();
    if (horlogeInterne()) { interne.joue ? arreterInterne() : lancerInterne(posArret); return; }
    if (!memeProd()) return; togglePlay();
  };
  $("dawDebut").onclick = () => positionner(0);
  $("dawMix").addEventListener("click", e => { const b = e.target.closest("[data-mix]"); if (!b) return; mixExport = b.dataset.mix; dessiner(); });
  $("dawRec").onclick = enregistrer;
  $("dawCouper").onclick = couper;
  $("dawSuppr").onclick = supprimer;
  $("dawAnnuler").onclick = annuler;
  $("dawRefaire").onclick = retablir;
  $("dawGrille").onclick = () => { grille = !grille; outils(); };
  $("dawExport").onclick = exporter;
  $("dawFermer").onclick = fermer;
  $("dawZoom").addEventListener("input", e => {
    const t = tempsBeat(), avant = t * zoom - zone.scrollLeft;
    zoom = Math.round(12 * Math.pow(25, e.target.value / 100));     // 12 a 300 px par seconde
    dessiner(); zone.scrollLeft = Math.max(0, t * zoom - avant);
  });
  zoom = Math.round(12 * Math.pow(25, .45));
  // le micro du lecteur : la page Studio sur la prod en cours ; le bouton « Studio » de l'en-tete (un lien) : le projet libre
  document.getElementById("micBtn")?.addEventListener("click", () => {
    if (!current) return;
    if (ouvert && prod && prod.id === current.id) return;
    montrerVue("studio", true, `studio/?beat=${encodeURIComponent(current.id)}`);
  });
  // « Importer ma prod » de la page Studio
  document.getElementById("stImport")?.addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (!ouvert) await page(true);
    importer(f);
  });
  $("dawBascule").onclick = async () => {
    if (rec) return;
    arreterInterne(); arreterSources();
    clearTimeout(saveMinuteur); if (P) { try { await PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} }
    await charger(estLibre() && current ? current : LIBRE);
    zone.scrollLeft = 0;
  };
  // le clavier du studio passe avant les raccourcis du site
  window.addEventListener("keydown", e => {
    if (!ouvert) return;
    const tag = document.activeElement?.tagName || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && document.activeElement.type !== "range") return;
    const k = e.key.toLowerCase(), mod = e.metaKey || e.ctrlKey;
    let fait = true;
    if (k === " ") { if (rec) arreterRec("bouton"); else $("dawLire").click(); }
    else if (mod && k === "z" && !e.shiftKey) annuler();
    else if ((mod && k === "z" && e.shiftKey) || (mod && k === "y")) retablir();
    else if (mod) fait = false;
    else if (k === "s") couper();
    else if (k === "r") enregistrer();
    else if (k === "backspace" || k === "delete") supprimer();
    else if (k === "enter" || k === "home") positionner(0);
    else if (k === "escape") { if (rec) arreterRec("bouton"); else if (sel) { sel = null; dessiner(); inspecteur(); outils(); } else if (!el.classList.contains("inline")) fermer(); }
    else if (k === "arrowleft" || k === "arrowright") positionner(tempsBeat() + (k === "arrowleft" ? -1 : 1) * (e.shiftKey ? mes() : tps()));
    else fait = false;
    if (fait) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* La page Studio : le studio s'installe dans la page, sur la prod demandee (?beat=…) ou
     sur le projet libre. Quitter la page le referme ; le projet reste enregistre. */
  async function page(on, beatId){
    if (!on) { if (ouvert) await fermer(); return; }
    const hote = document.getElementById("studioHote");
    if (hote && el.parentElement !== hote) hote.appendChild(el);
    el.classList.add("inline");
    let cible = LIBRE;
    const b = beatId && BY_ID.get(beatId);
    if (b) { cible = b; if (!current || current.id !== b.id) playFrom([b], 0); }
    if (ouvert && prod && prod.id === cible.id) return;
    if (ouvert) { arreterInterne(); arreterSources(); clearTimeout(saveMinuteur); try { await PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} await charger(cible); return; }
    await ouvrir(cible);
  }

  /* ─────────────────────────── branchements avec le lecteur ─────────────────────────── */
  return {
    page, importer,
    ouvert: () => ouvert,
    occupe: () => ouvert || !!rec,
    finProd(){ if (rec && !horlogeInterne()) arreterRec("fin"); },
    pause(){ if (rec && rec.recorder && !horlogeInterne()) arreterRec("pause"); },
    changement(id){
      if (rec && id !== rec.prod) arreterRec("changement");
      if (ouvert && !estLibre() && (!prod || prod.id !== id)) { const b = BY_ID.get(id); if (b) { arreterSources(); setTimeout(() => charger(b), 0); } }
    },
    ouvrir
  };
})();

// arrivee directe sur /studio/ : la page est deja affichee, le studio s'y installe
if (document.body.classList.contains("vue-studio")) STUDIO.page(true, lireAdresse(location.href).get("beat"));
