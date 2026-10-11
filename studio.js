/* ═══════════ FINDINGS — studio ═══════════
   Une petite station audio dans le navigateur, a la maniere de GarageBand ou Studio One : une
   timeline calee sur la prod, des pistes de voix avec vumetres, des regions qu'on deplace,
   rogne, coupe, duplique, normalise, avec fondus ; par piste une chaine d'effets complete
   (coupe-bas, egaliseur, compresseur, saturation, filtre, chorus, reverb, echo) reglee par
   boutons rotatifs et preregalges ; enregistrement au curseur (il remplace ce qui etait la),
   annuler/retablir et export WAV.

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
  /* Le studio a sa propre palette, graphite, dans les deux themes du site : comme Logic Pro
     ou Studio One, une station audio se regarde dans le noir. Les jetons du site sont
     redefinis ici pour que tout ce qui est a l'interieur suive. */
  .daw{
    --bg:#1B1C1F;--surface:#2A2B2F;--surface-2:#303135;--ink:#E6E7EA;--ink-2:#C8CACF;--dim:#8D9097;--dimmer:#5F626A;
    --line:rgba(0,0,0,.6);--line-soft:rgba(255,255,255,.045);--hover:rgba(255,255,255,.07);--thumb:#3A3B40;
    --accent-soft:rgba(250,35,59,.16);--on-ink:#111;
    --barre:linear-gradient(180deg,#3A3B40,#2D2E32);--creux:#17181B;--lcd:#0E0F11;--lcd-ink:#DCE6EF;--lcd-dim:#6C7580;
    --hw:224px;--rh:84px;
    position:fixed;z-index:58;left:12px;right:12px;top:12px;
    bottom:calc(var(--bar-h) + 30px + env(safe-area-inset-bottom,0px));
    display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;
    border-radius:12px;background:var(--bg);border:1px solid #0B0B0D;
    box-shadow:0 0 0 1px rgba(255,255,255,.05) inset,0 24px 70px rgba(0,0,0,.45);
    color:var(--ink);font-size:12px;color-scheme:dark;
    opacity:0;transform:translateY(12px) scale(.985);transition:opacity .2s,transform .24s cubic-bezier(.2,.9,.25,1.1);
  }
  .daw.on{opacity:1;transform:none}
  .daw.inline{position:relative;left:auto;right:auto;top:auto;bottom:auto;z-index:1;border-radius:8px;
    height:max(560px,calc(100vh - var(--hh,64px) - var(--bar-h) - 44px))}
  /* l'inspecteur defile chez lui : il ne prend jamais plus de la moitie, les pistes gardent leur place */
  .daw .dp-corps{max-height:min(48vh,560px);overflow-y:auto}
  .daw .dp-corps.rack{max-height:min(48vh,560px);overflow-y:auto}
  .daw-zone{min-height:150px}
  /* vrai plein ecran (bouton ou touche F) */
  .daw:fullscreen{height:100vh;width:100vw;border-radius:0;border:0}
  .daw:fullscreen .dp-corps,.daw:fullscreen .dp-corps.rack{max-height:50vh}
  .daw.inline #dawFermer{display:none}
  .daw[hidden]{display:none}
  .daw button{color:inherit}
  .daw ::selection{background:rgba(250,35,59,.35)}

  /* ── barre de controle : projet | transport + LCD | outils ── */
  .daw-haut{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:14px;padding:8px 12px;
    background:var(--barre);border-bottom:1px solid #0B0B0D;box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}
  .daw-id{min-width:0;display:grid;gap:0}
  .daw-id .eyebrow{color:var(--accent);display:flex;align-items:center;gap:5px;font-size:9.5px;font-weight:800;letter-spacing:.14em}
  .daw-id b{font-size:14px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-titre{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;padding:1px 6px;margin:0 -6px;border-radius:5px;color:inherit;text-align:left;cursor:text}
  .daw-titre svg{flex:0 0 auto;color:var(--dim);opacity:0;transition:opacity .15s}
  .daw-titre:hover{background:rgba(255,255,255,.07)}
  .daw-titre:hover svg,.daw-titre:focus-visible svg{opacity:1}
  .daw-titre-champ{font:700 14px/1.2 inherit;color:inherit;background:var(--creux);border:1px solid var(--accent);border-radius:5px;padding:2px 6px;margin:-1px -6px;min-width:0;width:100%;outline:none}
  .daw-id span.info{font-size:11px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-console{display:flex;align-items:stretch;gap:8px}
  .daw-transport{display:flex;align-items:center;gap:2px;padding:3px;border-radius:7px;background:var(--creux);box-shadow:inset 0 1px 3px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.06)}
  .daw-b{width:36px;height:30px;border-radius:5px;display:grid;place-items:center;color:#C9CCD2;transition:background .1s,color .1s}
  .daw-b:hover{background:rgba(255,255,255,.08);color:#fff}
  .daw-b:active{background:rgba(255,255,255,.14)}
  .daw-b svg{width:15px;height:15px}
  .daw-b.lire{position:relative;color:#E8EAED}
  .daw.joue .daw-b.lire{color:#3DDC84;background:rgba(61,220,132,.12)}
  body.yt-charge .daw.yt-mode .daw-b.lire svg{opacity:0}
  body.yt-charge .daw.yt-mode .daw-b.lire::after{content:"";position:absolute;inset:0;margin:auto;width:14px;height:14px;border-radius:50%;
    border:2px solid currentColor;border-right-color:transparent;animation:yt-tourne .7s linear infinite}
  .daw-b.rec{color:#FF4D5E}
  .daw-b.rec.on{background:#E5233A;color:#fff;animation:daw-pulse 1.1s ease-in-out infinite}
  @keyframes daw-pulse{50%{box-shadow:0 0 0 4px rgba(250,35,59,.28)}}
  /* l'ecran : des cases separees, comme l'afficheur de Logic */
  .lcd{display:flex;align-items:stretch;border-radius:7px;background:var(--lcd);font-family:var(--mono);color:var(--lcd-ink);
    box-shadow:inset 0 1px 4px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.06);overflow:hidden}
  .lcd-seg{display:grid;align-content:center;justify-items:center;gap:1px;padding:3px 14px;border-left:1px solid rgba(255,255,255,.06);min-width:62px}
  .lcd-seg:first-child{border-left:0}
  .lcd-seg b{font-size:19px;font-weight:600;letter-spacing:-.01em;line-height:1.05;font-variant-numeric:tabular-nums;white-space:nowrap}
  .lcd-seg small{font-family:var(--sans);font-size:8.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--lcd-dim)}
  .lcd-seg.t b{min-width:86px;text-align:center}
  .daw-niv{width:7px;align-self:center;height:30px;border-radius:2px;background:var(--creux);box-shadow:inset 0 1px 2px rgba(0,0,0,.7);overflow:hidden;display:flex;align-items:flex-end}
  .daw-niv i{display:block;width:100%;height:100%;transform-origin:bottom;transform:scaleY(0);background:linear-gradient(0deg,#3DDC84,#E5D84C 72%,#FF453A)}
  .daw-outils{display:flex;align-items:center;justify-content:flex-end;gap:2px;flex-wrap:wrap}
  .daw-o{height:28px;min-width:30px;padding:0 8px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--ink-2);
    background:linear-gradient(180deg,#45464B,#393A3F);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 1px 1px rgba(0,0,0,.5)}
  .daw-o:hover{background:linear-gradient(180deg,#4D4E54,#414247);color:#fff}
  .daw-o:active{background:#2F3034;box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
  .daw-o svg{width:14px;height:14px}
  .daw-o[disabled]{opacity:.35;pointer-events:none}
  .daw-o[aria-pressed="true"]{background:linear-gradient(180deg,#5A2A31,#47222A);color:#FF8A96;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 1px 1px rgba(0,0,0,.5)}
  .daw-o.pri{background:linear-gradient(180deg,#FF3A50,#E01E36);color:#fff;padding:0 12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.5)}
  .daw-o.pri:hover{background:linear-gradient(180deg,#FF5065,#EA2A42)}
  .daw-zoom{display:flex;align-items:center;gap:6px;color:var(--dim);margin:0 6px}
  .daw-zoom input{width:80px}
  .daw-sep{width:1px;height:20px;background:rgba(0,0,0,.55);box-shadow:1px 0 0 rgba(255,255,255,.06);margin:0 5px}
  /* curseurs plats, facon fader de console */
  .daw input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;height:16px;margin:0;cursor:pointer}
  .daw input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:linear-gradient(90deg,var(--pc,var(--accent)) var(--p,50%),#141517 var(--p,50%));box-shadow:inset 0 1px 1px rgba(0,0,0,.6)}
  .daw input[type=range]::-moz-range-track{height:4px;border-radius:2px;background:#141517}
  .daw input[type=range]::-moz-range-progress{height:4px;border-radius:2px;background:var(--pc,var(--accent))}
  .daw input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:16px;margin-top:-6px;border-radius:2px;
    background:linear-gradient(180deg,#F2F3F5,#B9BCC2);box-shadow:0 1px 2px rgba(0,0,0,.6),inset 0 -1px 0 rgba(0,0,0,.2)}
  .daw input[type=range]::-moz-range-thumb{width:11px;height:16px;border:0;border-radius:2px;background:linear-gradient(180deg,#F2F3F5,#B9BCC2);box-shadow:0 1px 2px rgba(0,0,0,.6)}

  /* ── zone des pistes ── */
  .daw-zone{position:relative;overflow:auto;overscroll-behavior:contain;background:var(--bg);scrollbar-color:#45464B var(--bg)}
  .daw-grille{position:relative;min-height:100%}
  .daw-ligne{display:flex;min-height:var(--rh);border-bottom:1px solid #121315}
  .daw-coin,.daw-tete{position:sticky;left:0;z-index:4;width:var(--hw);flex:0 0 var(--hw);background:var(--surface);border-right:1px solid #0B0B0D;box-shadow:1px 0 0 rgba(255,255,255,.04)}
  .daw-ligne.regle{position:sticky;top:0;z-index:6;min-height:26px;height:26px;border-bottom:1px solid #0B0B0D}
  .daw-coin{z-index:7;display:flex;align-items:center;padding:0 12px;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--dimmer);background:var(--barre)}
  .daw-regle{position:relative;height:26px;background:var(--barre);cursor:pointer;flex:0 0 auto;
    background-image:linear-gradient(to right,rgba(255,255,255,.12) 1px,transparent 1px),var(--barre);background-size:var(--temps) 6px,100% 100%;background-repeat:repeat-x,no-repeat;background-position:0 100%,0 0}
  .daw-regle span{position:absolute;top:0;bottom:0;border-left:1px solid rgba(255,255,255,.28);padding:4px 0 0 5px;font-size:10px;font-weight:700;color:#A9ACB3;font-family:var(--mono);pointer-events:none}
  .daw-voie{position:relative;flex:0 0 auto;align-self:stretch;min-height:var(--rh);cursor:text;touch-action:pan-x pan-y;
    background-image:linear-gradient(to right,rgba(255,255,255,.075) 1px,transparent 1px),linear-gradient(to right,rgba(255,255,255,.028) 1px,transparent 1px);
    background-size:var(--mesure) 100%,var(--temps) 100%}
  .daw-ligne.sel-piste .daw-voie{background-color:rgba(255,255,255,.025)}

  /* ── en-tetes de piste ── */
  .daw-tete{display:grid;align-content:center;gap:6px;padding:7px 10px 7px 14px;cursor:pointer;position:sticky}
  .daw-tete::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--pc)}
  .daw-ligne.sel-piste .daw-tete{background:#36373C}
  .daw-tete .t1{display:flex;align-items:center;gap:7px;min-width:0}
  .daw-tete .num{font-family:var(--mono);font-size:10px;font-weight:700;color:var(--dimmer);min-width:12px}
  .daw-tete .nom{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
  .daw-tete .cible{font-style:normal;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;font-size:9px;font-weight:900;color:#fff;
    background:radial-gradient(circle at 50% 35%,#FF5A6C,#C4142B);box-shadow:0 0 8px rgba(250,35,59,.55)}
  .daw-tete .t2{display:flex;align-items:center;gap:4px}
  .daw-ms{width:22px;height:18px;border-radius:3px;font-size:10px;font-weight:800;color:#AEB1B8;
    background:linear-gradient(180deg,#45464B,#38393E);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 1px 1px rgba(0,0,0,.5)}
  .daw-ms:hover{color:#fff}
  .daw-ms.m[aria-pressed="true"]{background:linear-gradient(180deg,#5DA2FF,#2F7CF0);color:#fff}
  .daw-ms.s[aria-pressed="true"]{background:linear-gradient(180deg,#FFD866,#E9B52C);color:#1A1405}
  .daw-fxb{height:18px;padding:0 6px;border-radius:3px;font-size:9.5px;font-weight:800;letter-spacing:.04em;color:#AEB1B8;display:inline-flex;align-items:center;gap:4px;
    background:linear-gradient(180deg,#45464B,#38393E);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 1px 1px rgba(0,0,0,.5)}
  .daw-fxb.actif{color:#fff;background:linear-gradient(180deg,color-mix(in srgb,var(--pc) 70%,#45464B),color-mix(in srgb,var(--pc) 55%,#2a2b2f))}
  .vu{flex:1;height:5px;border-radius:1px;background:#141517;box-shadow:inset 0 1px 1px rgba(0,0,0,.7);overflow:hidden;min-width:20px}
  .vu i{display:block;height:100%;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#3DDC84,#E5D84C 75%,#FF453A);transition:transform .05s linear}
  .daw-tete input[type=range]{width:100%;min-width:0}
  /* la ligne porte la classe « prod », que le site emploie aussi (nom du beatmaker dans la
     liste, avec overflow:hidden) : sans ceci l'en-tete ne restait pas colle a gauche */
  .daw-ligne.prod{overflow:visible;max-width:none;white-space:normal;text-overflow:clip}
  .daw-ligne.prod .daw-tete::before{background:var(--sc)}
  .daw-ligne.prod .daw-tete .nom{flex:0 0 auto;font-size:12px}
  .daw-ligne.prod .daw-tete{--pc:var(--sc)}
  .daw-ligne.prod .daw-voie{cursor:pointer}
  .bloc-prod{position:absolute;top:8px;bottom:8px;left:0;border-radius:4px;overflow:hidden;
    background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--sc) 12%,transparent) 0 6px,transparent 6px 12px),color-mix(in srgb,var(--sc) 14%,#1d1e21);
    border:1px solid color-mix(in srgb,var(--sc) 55%,#000);display:flex;align-items:flex-start;padding:3px 8px;
    font-size:10.5px;font-weight:700;color:color-mix(in srgb,var(--sc) 45%,#fff);white-space:nowrap;box-shadow:inset 0 14px 0 color-mix(in srgb,var(--sc) 38%,#1d1e21)}
  .bloc-fichier{position:absolute;top:6px;bottom:6px;border-radius:4px;overflow:hidden;cursor:grab;touch-action:none;
    background:linear-gradient(180deg,color-mix(in srgb,var(--sc) 85%,#fff) 0 15px,color-mix(in srgb,var(--sc) 32%,#17181b) 15px);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.45)}
  .bloc-fichier:active{cursor:grabbing}
  .bloc-fichier canvas{position:absolute;left:0;top:16px;height:calc(100% - 18px);pointer-events:none}
  .bloc-fichier .clip-nom{left:7px}
  .daw-importer{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:3px;font-size:10.5px;font-weight:700;
    background:linear-gradient(180deg,#45464B,#38393E);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 1px 1px rgba(0,0,0,.5);color:#E6E7EA;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .daw-importer:hover{color:#fff;background:linear-gradient(180deg,#4D4E54,#414247)}
  .daw-importer input{display:none}
  .daw-fichier{display:flex;align-items:center;gap:4px;font-size:10.5px;color:var(--dim);min-width:0}
  .daw-fichier span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-fichier button{width:18px;height:18px;border-radius:3px;flex:0 0 auto;font-size:13px;line-height:1;color:var(--dim)}
  .daw-fichier button:hover{background:var(--hover);color:var(--accent)}
  .daw-mix{display:flex;padding:2px;border-radius:6px;background:var(--creux);box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
  .daw-mix[hidden]{display:none}
  .daw-mix button{height:24px;padding:0 9px;border-radius:4px;font-size:11px;font-weight:650;color:var(--dim)}
  .daw-mix button[aria-pressed="true"]{background:linear-gradient(180deg,#4A4B50,#3C3D42);color:#fff;box-shadow:0 1px 1px rgba(0,0,0,.5)}
  .ajout-piste{display:flex;align-items:center;justify-content:center;min-height:40px}
  .ajout-piste button{font-size:11.5px;font-weight:700;color:var(--ink-2);padding:5px 10px;border-radius:4px;background:linear-gradient(180deg,#45464B,#38393E);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 1px 1px rgba(0,0,0,.5)}
  .ajout-piste button:hover{color:#fff}

  /* ── regions : bandeau de titre a la couleur de la piste, corps sombre ── */
  .clip{position:absolute;top:5px;bottom:5px;border-radius:4px;overflow:hidden;cursor:grab;touch-action:none;
    background:linear-gradient(180deg,color-mix(in srgb,var(--pc) 92%,#fff) 0 15px,color-mix(in srgb,var(--pc) 30%,#16171a) 15px);
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--pc) 55%,#000),0 1px 2px rgba(0,0,0,.4)}
  .clip:active{cursor:grabbing}
  .clip.sel{box-shadow:inset 0 0 0 1px #fff,0 0 0 1px #fff,0 4px 16px rgba(0,0,0,.45);z-index:2}
  .clip canvas{position:absolute;left:0;top:16px;height:calc(100% - 18px);pointer-events:none}
  .clip .clip-nom{position:absolute;left:8px;top:1px;right:18px;font-size:10px;font-weight:800;color:rgba(0,0,0,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;line-height:14px}
  .clip .poignee{position:absolute;top:15px;bottom:0;width:8px;cursor:ew-resize;z-index:2}
  .clip .poignee.g{left:0} .clip .poignee.d{right:0}
  .clip .poignee::after{content:"";position:absolute;top:50%;width:2px;height:18px;margin-top:-9px;border-radius:1px;background:rgba(255,255,255,.7);opacity:0;transition:opacity .12s}
  .clip .poignee.g::after{left:2px} .clip .poignee.d::after{right:2px}
  .clip:hover .poignee::after,.clip.sel .poignee::after{opacity:1}
  .clip .fondu{position:absolute;top:2px;width:10px;height:10px;border-radius:2px;background:#fff;border:1px solid rgba(0,0,0,.5);cursor:ew-resize;z-index:3;opacity:0;transition:opacity .12s}
  .clip:hover .fondu,.clip.sel .fondu{opacity:1}
  .clip.enreg{background:linear-gradient(180deg,#E5233A 0 15px,rgba(229,35,58,.22) 15px);box-shadow:inset 0 0 0 1px #E5233A;cursor:default}
  .clip.enreg .clip-nom{color:#fff}
  /* tete de lecture blanche, comme dans Logic */
  .daw-curseur{position:absolute;top:0;bottom:0;width:1px;background:#F2F3F5;z-index:5;pointer-events:none;box-shadow:0 0 6px rgba(255,255,255,.35)}
  .daw-curseur::before{content:"";position:absolute;top:0;left:-6px;border:6px solid transparent;border-top:8px solid #F2F3F5}
  .daw.enregistre .daw-curseur{background:#FF3A50;box-shadow:0 0 8px rgba(250,35,59,.6)}
  .daw.enregistre .daw-curseur::before{border-top-color:#FF3A50}

  /* ── inspecteur du bas : piste et effets | region | projet ── */
  .daw-pan{border-top:1px solid #0B0B0D;background:#232427;display:grid;grid-template-rows:auto auto;min-height:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
  .dp-onglets{display:flex;align-items:center;gap:4px;padding:5px 10px;background:var(--barre);border-bottom:1px solid #0B0B0D}
  .dp-onglets button{height:24px;padding:0 12px;border-radius:5px;font-size:11.5px;font-weight:650;color:var(--dim);position:relative;display:inline-flex;align-items:center;gap:7px}
  .dp-onglets button:hover{color:var(--ink)}
  .dp-onglets button[aria-selected="true"]{color:#fff;background:#1C1D20;box-shadow:inset 0 1px 2px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.06)}
  .dp-onglets .pastille{width:8px;height:8px;border-radius:2px;background:var(--pc,var(--accent))}
  .dp-onglets .esp{flex:1}
  .dp-onglets .replier{width:26px;height:24px;border-radius:5px;display:grid;place-items:center;color:var(--dim);padding:0}
  .dp-onglets .replier svg{transition:transform .2s}
  .daw-pan.ferme .replier svg{transform:rotate(180deg)}
  .daw-pan.ferme .dp-corps{display:none}
  .dp-corps{display:flex;gap:10px;padding:10px 12px 12px;overflow-x:auto;background:#1F2023;max-height:300px;scrollbar-width:thin}
  .dp-corps::-webkit-scrollbar{height:8px}
  .dp-corps::-webkit-scrollbar-thumb{background:#45464B;border-radius:4px}
  .dp-bloc{flex:0 0 auto;display:grid;align-content:start;gap:9px;padding:10px;border-radius:7px;background:#28292D;border:1px solid #0E0F11;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
  .dp-bloc h4{margin:0;font-size:9.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
  .dp-bloc .champ{display:grid;gap:4px;font-size:10.5px;color:var(--dim);font-weight:650}
  .dp-bloc input[type=text],.dp-bloc select{height:26px;border:1px solid #0E0F11;border-radius:5px;background:#18191C;color:var(--ink);padding:0 8px;font:inherit;font-size:12px;min-width:0;box-shadow:inset 0 1px 2px rgba(0,0,0,.5)}
  .dp-bloc .ligne{display:flex;gap:6px;flex-wrap:wrap}
  .dp-act{height:26px;padding:0 10px;border-radius:5px;font-size:11.5px;font-weight:650;color:var(--ink-2);
    background:linear-gradient(180deg,#45464B,#393A3F);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 1px 1px rgba(0,0,0,.5)}
  .dp-act:hover{color:#fff;background:linear-gradient(180deg,#4D4E54,#414247)}
  .dp-act.danger{color:#FF8A96;background:linear-gradient(180deg,#4A2A2F,#3B2227)}
  .dp-aide{font-size:11.5px;color:var(--dim);line-height:1.45;max-width:340px;margin:0}
  /* onglet effets : tranche de console | slots d'effets | fenetre du plug-in ouvert */
  .dp-corps.rack{display:grid;grid-template-columns:200px minmax(260px,.9fr) minmax(340px,1.4fr);gap:10px;overflow:visible;max-height:none;align-items:start}
  .rk{display:grid;grid-template-columns:1fr;gap:3px;padding:6px;border-radius:7px;background:#18191C;border:1px solid #0E0F11;box-shadow:inset 0 1px 3px rgba(0,0,0,.5)}
  .rk::before{content:"Audio FX";font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--dimmer);padding:2px 4px 4px}
  .rk-case{display:flex;align-items:center;gap:9px;min-width:0;height:30px;padding:0 9px;border-radius:4px;cursor:pointer;text-align:left;
    background:linear-gradient(180deg,#34353A,#2C2D31);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 1px 1px rgba(0,0,0,.45);transition:background .1s}
  .rk-case:hover{background:linear-gradient(180deg,#3B3C41,#323337)}
  .rk-case.ouvert{background:linear-gradient(180deg,color-mix(in srgb,var(--pc,var(--accent)) 30%,#34353A),color-mix(in srgb,var(--pc,var(--accent)) 22%,#2C2D31));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--pc,var(--accent)) 65%,transparent)}
  .rk-case .txt{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0;flex:1}
  .rk-case b{font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rk-case small{font-size:10px;color:var(--dim);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto}
  .rk-case:not(.on) b{color:var(--dim)}
  .rk-case:not(.on) small{opacity:.45}
  /* voyant d'activation (remplace l'interrupteur) */
  .fx-on{width:14px;height:14px;border-radius:50%;position:relative;flex:0 0 auto;background:#141517;box-shadow:inset 0 1px 2px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.07);transition:background .12s,box-shadow .12s}
  .fx-on::after{content:"";position:absolute;inset:4px;border-radius:50%;background:#45474D;transition:background .12s,box-shadow .12s}
  .rk-case.on .fx-on::after,.fxc.on .fx-on::after{background:var(--pc,var(--accent));box-shadow:0 0 6px var(--pc,var(--accent)),0 0 2px #fff inset}
  .fxc.detail{min-height:100%;padding:0;overflow:hidden;border-radius:7px;background:#1A1B1E;border:1px solid #0E0F11;gap:0}
  .fxc.detail header{justify-content:space-between;padding:7px 10px;background:var(--barre);border-bottom:1px solid #0B0B0D;box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}
  .fxc.detail .fx-titre{display:flex;align-items:center;gap:8px}
  .fxc.detail .fx-titre b{font-size:12px}
  .fxc.detail .fx-aide{padding:9px 12px 0}
  .fxc.detail .fx-boutons{flex-wrap:wrap;row-gap:8px;padding:10px 10px 10px;gap:2px}
  .fxc .fx-aide{font-size:11px;color:var(--dim);margin:0;line-height:1.45}
  /* ── facades « materiel » : chaque plug-in a sa face avant, comme un appareil ──
     --vis : couleur de l'ecran ; vis aux quatre coins ; serigraphie gravee. */
  .fxc.detail{--vis:#FFB547;--face:linear-gradient(180deg,#34353A,#26272B);--grav:#D9DBDF;--grav-dim:#8D9097;
    background:radial-gradient(circle at 9px calc(100% - 9px),#D8DADD 0 1.5px,#5D6066 2px 3.6px,transparent 4px),
      radial-gradient(circle at calc(100% - 9px) calc(100% - 9px),#D8DADD 0 1.5px,#5D6066 2px 3.6px,transparent 4px),
      repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px),var(--face);
    border:1px solid #070708;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 6px 18px rgba(0,0,0,.45)}
  .fxc.detail header{background:radial-gradient(circle at 9px 50%,#D8DADD 0 1.5px,#5D6066 2px 3.6px,transparent 4px),
      radial-gradient(circle at calc(100% - 9px) 50%,#D8DADD 0 1.5px,#5D6066 2px 3.6px,transparent 4px),var(--entete,var(--barre));padding:7px 20px}
  .fxc.detail .fx-titre b{color:var(--grav);text-shadow:0 1px 0 rgba(0,0,0,.6);letter-spacing:.02em}
  .fxc.detail .plug-modele{color:var(--vis);opacity:.85}
  .fxc.detail .kn-n,.fxc.detail .fx-case,.fxc.detail .fx-menus label,.fxc.detail .at-legende{color:var(--grav-dim)}
  .fxc.detail .fx-aide{color:var(--grav-dim)}
  .fxc.detail .kn .kn-val{stroke:var(--vis);filter:drop-shadow(0 0 2px color-mix(in srgb,var(--vis) 60%,transparent))}
  .fxc.detail .kn .kn-cap{fill:url(#cap-noir)}
  .fxc.detail .plug-vis{background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--vis) 9%,#0D0B09),#0A0908 70%);box-shadow:inset 0 2px 6px rgba(0,0,0,.95),0 1px 0 rgba(255,255,255,.07)}
  /* compresseur : face noire, bandeau metal brosse, boutons chrome */
  .fxc.detail[data-fx="comp"]{--face:linear-gradient(180deg,#19191A,#0F0F10);--entete:repeating-linear-gradient(90deg,rgba(255,255,255,.25) 0 1px,rgba(0,0,0,.03) 1px 2px),linear-gradient(180deg,#D5D8DC,#9CA0A6);--vis:#FFB547}
  .fxc.detail[data-fx="comp"] .fx-titre b{color:#17181A;text-shadow:0 1px 0 rgba(255,255,255,.55)}
  .fxc.detail[data-fx="comp"] .plug-modele{color:#4A4D52}
  .fxc.detail[data-fx="comp"] .kn .kn-cap{fill:url(#cap-chrome)}
  .fxc.detail[data-fx="comp"] .kn .kn-ind{stroke:#1A1B1D}
  /* saturation : face creme, boutons bakelite, lampe */
  .fxc.detail[data-fx="sat"]{--face:linear-gradient(180deg,#EADFC6,#D6C7A6);--entete:linear-gradient(180deg,#5A3E24,#3E2A17);--grav:#F3E6C8;--grav-dim:#6B573C;--vis:#FF9A3C}
  .fxc.detail[data-fx="sat"] .kn-v{background:#2A1E12;color:#FFD9A0}
  .fxc.detail[data-fx="sat"] .kn .kn-fond{stroke:#B9A57E}
  /* echo a bande : face vert d'atelier, boutons creme */
  .fxc.detail[data-fx="delay"]{--face:linear-gradient(180deg,#3B4A40,#2A362E);--entete:linear-gradient(180deg,#E7DCC0,#CDBF9C);--vis:#FFC46B;--grav-dim:#B9C4BA}
  .fxc.detail[data-fx="delay"] .fx-titre b{color:#2A362E;text-shadow:0 1px 0 rgba(255,255,255,.5)}
  .fxc.detail[data-fx="delay"] .plug-modele{color:#6A5F45}
  .fxc.detail[data-fx="delay"] .kn .kn-cap{fill:url(#cap-creme)}
  .fxc.detail[data-fx="delay"] .kn .kn-ind{stroke:#2A2318}
  /* egaliseur : console, un capuchon de couleur par bande */
  .fxc.detail[data-fx="eq"]{--face:linear-gradient(180deg,#3E4146,#2E3034);--vis:#FFB547}
  .fxc.detail[data-fx="eq"] .kn:nth-child(1) .kn-cap,.fxc.detail[data-fx="eq"] .kn:nth-child(2) .kn-cap{fill:url(#cap-rouge)}
  .fxc.detail[data-fx="eq"] .kn:nth-child(3) .kn-cap,.fxc.detail[data-fx="eq"] .kn:nth-child(4) .kn-cap,.fxc.detail[data-fx="eq"] .kn:nth-child(5) .kn-cap{fill:url(#cap-vert)}
  .fxc.detail[data-fx="eq"] .kn:nth-child(6) .kn-cap,.fxc.detail[data-fx="eq"] .kn:nth-child(7) .kn-cap{fill:url(#cap-bleu)}
  /* reverb : bandeau bronze */
  .fxc.detail[data-fx="reverb"]{--face:linear-gradient(180deg,#2C2824,#1E1B18);--entete:linear-gradient(180deg,#C9A468,#8F6E3D);--vis:#FFC46B}
  .fxc.detail[data-fx="reverb"] .fx-titre b{color:#2A1F10;text-shadow:0 1px 0 rgba(255,255,255,.35)}
  .fxc.detail[data-fx="reverb"] .plug-modele{color:#4A3820}
  .fxc.detail[data-fx="reverb"] .kn .kn-cap{fill:url(#cap-or)}
  .fxc.detail[data-fx="reverb"] .kn .kn-ind{stroke:#2A1F10}
  /* filtre : bakelite brune */
  .fxc.detail[data-fx="filtre"]{--face:linear-gradient(180deg,#4A3326,#2F2018);--vis:#FFB060;--grav-dim:#C4A88E}
  .fxc.detail[data-fx="filtre"] .kn .kn-cap{fill:url(#cap-creme)} .fxc.detail[data-fx="filtre"] .kn .kn-ind{stroke:#3A2618}
  /* doubleur : bleu nuit */
  .fxc.detail[data-fx="chorus"]{--face:linear-gradient(180deg,#252B3A,#1A1F2A);--vis:#8FB8FF}
  /* autotune : moderne, ecran turquoise */
  .fxc.detail[data-fx="autotune"]{--face:linear-gradient(180deg,#2A2D31,#1D1F22);--vis:#5FE3D0}
  .fxc.detail[data-fx="hpf"]{--vis:#FFB547}
  /* facade du plug-in : nom de modele, ecran, clavier */
  .plug-modele{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.08em;color:var(--dimmer);text-transform:uppercase;margin-left:4px}
  .plug-vis{position:relative;margin:10px 12px 0;height:132px;border-radius:5px;background:linear-gradient(180deg,#0C0D0F,#121316);box-shadow:inset 0 1px 4px rgba(0,0,0,.9),0 1px 0 rgba(255,255,255,.05);overflow:hidden}
  .plug-vis canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  .plug-vis[data-vis="eq"] canvas{cursor:crosshair}
  .plug-vis.at{height:150px;display:grid;grid-template-columns:minmax(0,1fr) 128px}
  .plug-vis.at canvas{position:relative;grid-column:1;width:100%;height:150px}
  .at-lecture{grid-column:2;display:grid;align-content:center;justify-items:center;gap:8px;border-left:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.25)}
  .at-lecture b{font-family:var(--mono);font-size:34px;font-weight:700;color:var(--lcd-ink);line-height:1}
  .at-lecture small{font-family:var(--mono);font-size:10px;color:var(--lcd-dim);text-align:center;padding:0 6px}
  .at-cents{position:relative;width:96px;height:10px;border-radius:2px;background:linear-gradient(90deg,#FF453A,#E5D84C 35%,#3DDC84 45% 55%,#E5D84C 65%,#FF453A);opacity:.85}
  .at-cents::after{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:rgba(255,255,255,.7)}
  .at-cents i{position:absolute;top:-5px;left:50%;width:3px;height:20px;margin-left:-1.5px;border-radius:1px;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.8);transition:left .08s linear}
  .at-cents i.juste{background:#3DDC84}
  .at-clavier{position:relative;display:grid;grid-template-columns:repeat(7,1fr);gap:2px;height:62px;margin:10px 12px 0;padding:3px;border-radius:5px;background:#0C0D0F;box-shadow:inset 0 1px 3px rgba(0,0,0,.8)}
  .at-clavier .tb{position:relative;border-radius:0 0 4px 4px;background:linear-gradient(180deg,#E9EAEC,#C9CBD0);box-shadow:inset 0 -3px 0 rgba(0,0,0,.18);display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}
  .at-clavier .tb span{font-size:9px;font-weight:800;color:#3A3B40}
  .at-clavier .tn{position:absolute;top:3px;width:6.8%;height:58%;border-radius:0 0 3px 3px;background:linear-gradient(180deg,#2B2C30,#141517);box-shadow:0 2px 3px rgba(0,0,0,.6);z-index:2}
  .at-clavier .tb.visee{background:linear-gradient(180deg,color-mix(in srgb,var(--vis,var(--accent)) 30%,#F2F3F5),color-mix(in srgb,var(--vis,var(--accent)) 55%,#C9CBD0))}
  .at-clavier .tn.visee{background:linear-gradient(180deg,color-mix(in srgb,var(--vis,var(--accent)) 75%,#2B2C30),color-mix(in srgb,var(--vis,var(--accent)) 50%,#141517))}
  .at-clavier .tb.retiree{background:linear-gradient(180deg,#8E9096,#6E7076)}
  .at-clavier .tb.retiree span{color:#2A2B2F;text-decoration:line-through}
  .at-clavier .tn.retiree{background:linear-gradient(180deg,#4A4B50,#3A3B40)}
  .at-clavier .tb.libre{background:repeating-linear-gradient(135deg,#F5C86A 0 5px,#E8B04A 5px 10px)}
  .at-clavier .tn.libre{background:repeating-linear-gradient(135deg,#B9852A 0 4px,#8E6418 4px 8px)}
  .at-legende{margin:5px 12px 0;font-size:10px;color:var(--dim);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .at-legende i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-left:6px}
  .at-legende i:first-child{margin-left:0}
  .at-legende i.visee{background:var(--vis,var(--accent))} .at-legende i.libre{background:#F5C86A} .at-legende i.retiree{background:#6E7076}
  .fxc.detail .fx-case{padding:0 12px 6px}
  .fxc.detail .fx-aide{padding:4px 12px 12px;opacity:.85}
  .fx-menus{display:flex;gap:10px;flex-wrap:wrap;padding:9px 12px 0}
  .fx-menus label{display:grid;gap:3px;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
  .fx-menus select{height:26px;min-width:120px;border:1px solid #0E0F11;border-radius:4px;background:#18191C;color:var(--lcd-ink);font:600 12px var(--sans);letter-spacing:0;text-transform:none;padding:0 6px;box-shadow:inset 0 1px 2px rgba(0,0,0,.5)}
  @media(max-width:1000px){ .dp-corps.rack{grid-template-columns:1fr 1fr} .dp-corps.rack .dp-bloc{grid-column:1/-1} }
  @media(max-width:640px){ .dp-corps.rack{grid-template-columns:1fr;max-height:300px;overflow-y:auto} }
  /* carte d'effet */
  .fxc{flex:0 0 auto;display:grid;align-content:start;gap:10px;padding:10px 12px 12px;border-radius:7px;background:#28292D;border:1px solid #0E0F11;transition:opacity .15s}
  .fxc header{display:flex;align-items:center;gap:8px;min-width:0}
  .fxc header b{font-size:12px;font-weight:750;white-space:nowrap}
  .fxc header select{height:22px;border:1px solid #0E0F11;border-radius:4px;background:#18191C;color:var(--ink);font:inherit;font-size:11px;padding:0 4px;box-shadow:inset 0 1px 2px rgba(0,0,0,.5)}
  .fxc:not(.on) .fx-boutons{opacity:.4}
  .fx-boutons{display:flex;gap:6px;flex-wrap:nowrap}
  .fx-case{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:650;color:var(--dim);cursor:pointer}
  .fx-case input{accent-color:var(--pc,var(--accent))}
  /* bouton rotatif : chapeau metal, arc de valeur a la couleur de la piste */
  .kn{width:70px;display:grid;justify-items:center;gap:2px;cursor:ns-resize;touch-action:none;user-select:none;outline:none;border-radius:6px;padding:3px 0}
  .kn:focus-visible{box-shadow:0 0 0 1px var(--accent)}
  .kn svg{width:44px;height:44px;overflow:visible}
  .kn .kn-fond{fill:none;stroke:#0F1012;stroke-width:4;stroke-linecap:round}
  .kn .kn-val{fill:none;stroke:var(--pc,var(--accent));stroke-width:4;stroke-linecap:round;filter:drop-shadow(0 0 2px color-mix(in srgb,var(--pc,var(--accent)) 60%,transparent))}
  .kn .kn-cap{fill:url(#daw-cap);stroke:#0D0E10;stroke-width:1}
  .kn .kn-ind{stroke:#F5F6F7;stroke-width:2;stroke-linecap:round}
  .kn .kn-v{font-family:var(--mono);font-size:10px;font-weight:600;color:var(--lcd-ink);white-space:nowrap;background:#121315;border-radius:3px;padding:1px 5px;box-shadow:inset 0 1px 2px rgba(0,0,0,.7)}
  .kn .kn-n{font-size:9.5px;font-weight:650;color:var(--dim);white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:.04em}
  .daw-decompte{position:absolute;inset:0;z-index:20;display:grid;place-items:center;pointer-events:none;
    font-size:120px;font-weight:900;font-family:var(--mono);letter-spacing:-.05em;color:#FF3A50;text-shadow:0 10px 40px rgba(250,35,59,.35)}
  .daw-decompte[hidden]{display:none}
  .daw-msg{position:absolute;left:50%;top:64px;transform:translateX(-50%);z-index:21;padding:7px 13px;border-radius:6px;
    background:#0E0F11;color:#E6E7EA;font-size:12px;font-weight:600;border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 24px rgba(0,0,0,.5);white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
  .daw-msg[hidden]{display:none}
  body.daw-ouvert{overflow:hidden}
  /* sous 1 600 px, les outils ne gardent que leur icone (le nom reste dans l'info-bulle) */
  @media(max-width:1600px){ .daw-outils .daw-o:not(.pri):not(#dawBascule) .lib{display:none} .daw-outils .daw-o:not(.pri){padding:0 7px} }
  @media(max-width:1180px){
    .daw-haut{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"id console" "outils outils"}
    .daw-id{grid-area:id} .daw-console{grid-area:console} .daw-outils{grid-area:outils;justify-content:flex-start}
  }
  @media(max-width:760px){
    .daw{left:6px;right:6px;top:6px;--hw:118px;--rh:72px;border-radius:10px}
    .daw-haut{grid-template-columns:1fr;grid-template-areas:"id" "console" "outils";gap:8px;padding:8px 10px}
    .daw-console{justify-content:space-between}
    .lcd-seg{padding:3px 8px;min-width:0}
    .lcd-seg b{font-size:15px}
    .lcd-seg.t b{min-width:64px}
    .lcd-seg.k{display:none}
    .daw-zoom input{width:60px}
    .daw-tete{padding:6px 6px 6px 10px}
    .daw-tete input[type=range],.daw-tete .vu,.daw-tete .num{display:none}
    .daw-sep{display:none}
    .daw-o .lib{display:none}
    #dawFermer{position:absolute;top:8px;right:8px}
    .daw-id{padding-right:40px}
    .dp-corps{max-height:210px}
  }
  </style>`);

  /* ─────────────────────────── balisage ─────────────────────────── */
  const I = {
    crayon:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
    debut:'<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2.2v14H6zM19 5v14L9 12z"/></svg>',
    lire:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    rec:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6.5"/></svg>',
    couper:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
    suppr:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.8h6V7M6.5 7l1 12.2h9l1-12.2"/></svg>',
    dupliquer:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    annuler:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    refaire:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
    grille:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4v16M10 4v16M16 4v16M22 4v16"/></svg>',
    export:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
    plein:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    fermer:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    micro:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    loupe:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4M8.5 11h5"/></svg>',
    chevron:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  };
  document.body.insertAdjacentHTML("beforeend", `
  <div class="daw" id="daw" hidden role="dialog" aria-label="Studio">
    <div class="daw-haut">
      <div class="daw-id"><span class="eyebrow">${I.micro}Studio</span><button class="daw-titre" id="dawTitreBtn" title="Renommer le projet" aria-label="Renommer le projet"><b id="dawTitre" translate="no"></b>${I.crayon}</button><span class="info" id="dawInfo"></span></div>
      <div class="daw-console">
        <div class="daw-transport">
          <button class="daw-b" id="dawDebut" title="Revenir au début (Entrée)" aria-label="Revenir au début">${I.debut}</button>
          <button class="daw-b lire" id="dawLire" title="Lecture / pause (Espace)" aria-label="Lecture ou pause">${I.lire}</button>
          <button class="daw-b rec" id="dawRec" title="Enregistrer au curseur (R)" aria-label="Enregistrer">${I.rec}</button>
        </div>
        <div class="lcd" aria-live="off">
          <span class="lcd-seg"><b id="dawMesure">1.1</b><small>Mesure</small></span>
          <span class="lcd-seg t"><b id="dawTemps">0:00.0</b><small>Temps</small></span>
          <span class="lcd-seg"><b id="dawBpm">120</b><small>Tempo</small></span>
          <span class="lcd-seg k"><b id="dawCle">—</b><small>4/4</small></span>
        </div>
        <span class="daw-niv" aria-hidden="true" title="Niveau du micro"><i id="dawNiv"></i></span>
      </div>
      <div class="daw-outils">
        <button class="daw-o" id="dawBascule" hidden></button>
        <button class="daw-o" id="dawCouper" title="Couper au curseur (S)">${I.couper}<span class="lib">Couper</span></button>
        <button class="daw-o" id="dawDupliquer" title="Dupliquer la région (D)">${I.dupliquer}</button>
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
        <button class="daw-o" id="dawPlein" title="Plein écran (F)" aria-label="Plein écran">${I.plein}</button>
        <button class="daw-o pri" id="dawExport" title="Exporter en WAV">${I.export}<span class="lib">Exporter</span></button>
        <button class="daw-o" id="dawFermer" title="Fermer le studio (Échap)" aria-label="Fermer">${I.fermer}</button>
      </div>
    </div>
    <div class="daw-zone" id="dawZone"><div class="daw-grille" id="dawGrilleEl"></div></div>
    <div class="daw-pan" id="dawPan">
      <div class="dp-onglets" role="tablist">
        <button role="tab" data-onglet="piste" aria-selected="true"><span class="pastille"></span><span id="dawOngletPiste">Piste et effets</span></button>
        <button role="tab" data-onglet="region" aria-selected="false">Région</button>
        <button role="tab" data-onglet="projet" aria-selected="false">Projet</button>
        <span class="esp"></span>
        <button class="replier" id="dawReplier" title="Replier le panneau" aria-label="Replier le panneau">${I.chevron}</button>
      </div>
      <div class="dp-corps" id="dawCorps"></div>
    </div>
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><radialGradient id="daw-cap" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#5B5D63"/><stop offset=".55" stop-color="#36383D"/><stop offset="1" stop-color="#202125"/></radialGradient>
      <radialGradient id="cap-noir" cx="45%" cy="28%" r="80%"><stop offset="0" stop-color="#4A4644"/><stop offset=".5" stop-color="#1E1C1B"/><stop offset="1" stop-color="#0A0909"/></radialGradient>
      <linearGradient id="cap-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4F5F6"/><stop offset=".35" stop-color="#A9ADB3"/><stop offset=".55" stop-color="#E2E4E7"/><stop offset="1" stop-color="#6D7177"/></linearGradient>
      <radialGradient id="cap-creme" cx="45%" cy="28%" r="80%"><stop offset="0" stop-color="#FFF8E6"/><stop offset=".6" stop-color="#E6D7B5"/><stop offset="1" stop-color="#B9A57E"/></radialGradient>
      <radialGradient id="cap-rouge" cx="45%" cy="28%" r="80%"><stop offset="0" stop-color="#FF7B6B"/><stop offset=".6" stop-color="#C0302A"/><stop offset="1" stop-color="#6E1512"/></radialGradient>
      <radialGradient id="cap-vert" cx="45%" cy="28%" r="80%"><stop offset="0" stop-color="#8FE3A2"/><stop offset=".6" stop-color="#2E8F4E"/><stop offset="1" stop-color="#14502A"/></radialGradient>
      <radialGradient id="cap-bleu" cx="45%" cy="28%" r="80%"><stop offset="0" stop-color="#8CC0FF"/><stop offset=".6" stop-color="#2F68C4"/><stop offset="1" stop-color="#173A73"/></radialGradient>
      <radialGradient id="cap-or" cx="45%" cy="28%" r="80%"><stop offset="0" stop-color="#FFE7A8"/><stop offset=".55" stop-color="#C79A45"/><stop offset="1" stop-color="#6E521F"/></radialGradient></defs></svg>
    <div class="daw-decompte" id="dawDecompte" hidden></div>
    <div class="daw-msg" id="dawMsg" hidden></div>
  </div>`);


  const $ = id => document.getElementById(id);
  const el = $("daw"), zone = $("dawZone"), grilleEl = $("dawGrilleEl");
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

  const audio = () => {
    if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); chargerAT(ctx).then(ok => { if (ok && P) construireNoeuds(); }); }
    return ctx;
  };
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

  /* ─────────────────────────── effets ───────────────────────────
     Chaque piste a sa chaine complete, dans cet ordre : coupe-bas → egaliseur 3 bandes →
     compresseur → saturation → filtre → chorus/doubleur → panoramique → volume, puis deux
     departs paralleles : reverb (pre-delai, taille, brillance) et echo (cale sur le tempo,
     ping-pong). Un effet eteint est laisse a l'etat neutre, la chaine ne se reconstruit pas. */
  /* gammes de l'autotune : intervalles depuis la tonique */
  // noms des notes dans la langue du site (pas par le dictionnaire : « La » ou « Sol » sont aussi des noms d'artistes)
  const NOTES = { en: ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"], es: ["Do", "Do♯", "Re", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"] }[typeof LANG !== "undefined" ? LANG : "fr"]
    || ["Do", "Do♯", "Ré", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"];
  const NOTES_EN = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const GAMMES = {
    majeur:  { nom: "Majeure", int: [0, 2, 4, 5, 7, 9, 11], suffixe: "" },
    mineur:  { nom: "Mineure", int: [0, 2, 3, 5, 7, 8, 10], suffixe: "m" },
    harmo:   { nom: "Mineure harmonique", int: [0, 2, 3, 5, 7, 8, 11], suffixe: "m harm." },
    pentaM:  { nom: "Pentatonique majeure", int: [0, 2, 4, 7, 9], suffixe: " penta" },
    pentam:  { nom: "Pentatonique mineure", int: [0, 3, 5, 7, 10], suffixe: "m penta" }
  };
  // tessitures : la plage ou chercher la note chantee
  const TESSITURES = {
    large:   { nom: "Large (auto)", min: 60, max: 1100 }, basse: { nom: "Basse", min: 60, max: 350 }, baryton: { nom: "Baryton", min: 80, max: 420 },
    tenor:   { nom: "Ténor", min: 105, max: 560 }, alto: { nom: "Alto", min: 140, max: 760 }, mezzo: { nom: "Mezzo", min: 160, max: 900 },
    soprano: { nom: "Soprano", min: 190, max: 1100 }
  };
  const masqueDe = (tonique, gamme) => (GAMMES[gamme] || GAMMES.mineur).int.reduce((s, i) => s | (1 << ((+tonique + i) % 12)), 0);
  // « Gm » -> { tonique: 7, gamme: "mineur" } ; null si illisible
  const lireCle = cle => { const m = /^~?([A-G])([#b]?)(m?)/.exec(cle || ""); if (!m) return null;
    const t = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
    return { tonique: t, gamme: m[3] ? "mineur" : "majeur" }; };
  const FX = [
    { k: "autotune", nom: "Autotune / pitch", modele: "FDG Tune RT", types: [["prod", "Tonalité de la prod"], ["cle", "Choisir la tonalité"], ["chroma", "Chromatique"], ["libre", "Sans correction"]],
      // [cle, libelle, options, mode ou le menu apparait (absent = toujours)]
      menus: [["tonique", "Note", NOTES.map((n, i) => [String(i), n]), "cle"], ["gamme", "Gamme", Object.entries(GAMMES).map(([c, g]) => [c, g.nom]), "cle"],
              ["tessiture", "Range", Object.entries(TESSITURES).map(([c, t]) => [c, t.nom])]],
      p: [["vitesse", "Vitesse", 0, 200, 1, "ms", 15], ["transition", "Transition", 0, 300, 1, "ms", 0], ["humain", "Humanize", 0, 100, 1, "%", 0],
          ["tolerance", "Tolérance", 0, 50, 1, "ct", 0], ["demitons", "Pitch", -12, 12, 1, "dt", 0], ["diapason", "Diapason", 430, 450, .5, "Hz", 440],
          ["mix", "Mélange", 0, 100, 1, "%", 100]],
      cases: [["formant", "Formants préservés"]] },
    { k: "hpf", modele: "HP-80 Low Cut", nom: "Coupe-bas", p: [["freq", "Fréquence", 20, 400, 1, "Hz", 80]] },
    { k: "eq", modele: "Q3 Vocal EQ", nom: "Égaliseur", p: [["bas", "Graves", -15, 15, .5, "dB", 0], ["basF", "F. graves", 60, 500, 1, "Hz", 200],
      ["mid", "Médiums", -15, 15, .5, "dB", 0], ["midF", "F. médiums", 300, 5000, 10, "Hz", 1500], ["midQ", "Largeur", .3, 5, .1, "", 1],
      ["haut", "Aigus", -15, 15, .5, "dB", 0], ["hautF", "F. aigus", 2000, 14000, 50, "Hz", 7000]], cases: [["analog", "Analog"]] },
    { k: "comp", modele: "VC-4 Compressor", nom: "Compresseur", p: [["seuil", "Seuil", -60, 0, 1, "dB", -20], ["ratio", "Ratio", 1, 20, .5, ":1", 4],
      ["attaque", "Attaque", 1, 100, 1, "ms", 6], ["relache", "Relâche", 20, 800, 5, "ms", 150], ["gain", "Gain", 0, 24, .5, "dB", 4]], cases: [["analog", "Analog"]] },
    { k: "sat", modele: "Tube Drive", nom: "Saturation", p: [["drive", "Chaleur", 0, 100, 1, "%", 25], ["mix", "Mélange", 0, 100, 1, "%", 35]] },
    { k: "filtre", modele: "Lo-Fi Filter", nom: "Filtre", types: [["tel", "Téléphone"], ["radio", "Radio"], ["pb", "Passe-bas"], ["ph", "Passe-haut"]],
      p: [["freq", "Fréquence", 100, 12000, 10, "Hz", 1700], ["q", "Résonance", .3, 12, .1, "", 1.2]] },
    { k: "chorus", modele: "Double Tracker", nom: "Doubleur", p: [["vitesse", "Vitesse", .1, 3, .05, "Hz", .4], ["profondeur", "Profondeur", 0, 100, 1, "%", 30], ["mix", "Mélange", 0, 100, 1, "%", 25]] },
    { k: "reverb", modele: "Plate Room", nom: "Réverb", p: [["taille", "Taille", .3, 6, .1, "s", 1.4], ["predelay", "Pré-délai", 0, 200, 1, "ms", 25],
      ["amorti", "Brillance", 1500, 14000, 100, "Hz", 6000], ["mix", "Niveau", 0, 100, 1, "%", 12]] },
    { k: "delay", modele: "Tape Echo", nom: "Écho", divisions: [["1/4", "1/4"], ["1/8p", "1/8 pointée"], ["1/8", "1/8"], ["1/16", "1/16"], ["1/4t", "1/4 triolet"]],
      p: [["retour", "Répétitions", 0, 85, 1, "%", 22], ["filtre", "Brillance", 800, 10000, 100, "Hz", 3200], ["mix", "Niveau", 0, 100, 1, "%", 10]], cases: [["pingpong", "Ping-pong"]] }
  ];
  const AIDE = {
    autotune: "Cale la voix sur les notes de la gamme. Vitesse 0 = effet robot, 30 ms et plus = correction discrète. Humanize adoucit la correction sur les notes tenues. Tolérance : en dessous de cet écart (centièmes de demi-ton), la voix n'est pas touchée. Diapason : le La de référence, si la prod n'est pas accordée à 440 Hz.",
    hpf: "Retire le grave inutile (souffle, pied de micro, plosives). À laisser sur presque toutes les voix.",
    eq: "Creuse ou renforce des zones : moins de « boue » vers 300–500 Hz, plus d'air dans les aigus.",
    comp: "Resserre les écarts de volume pour que la voix reste devant. Seuil bas = plus compressé.",
    sat: "Arrondit les crêtes et ajoute un peu de densité, comme un passage dans une console. À doser léger.",
    filtre: "Coupe une partie du spectre : effet téléphone ou radio pour les ad-libs et les intros.",
    chorus: "Ouvre la voix en stéréo comme une prise doublée, sans effet de vague : refrains et backs.",
    reverb: "Place la voix dans une pièce. Taille = durée de la queue, pré-délai = détache la voix de sa réverb.",
    delay: "Répète la voix en rythme, calé sur le tempo. Chaque répétition s'assombrit, comme sur une bande."
  };
  const resume = (k, v) => ({
    autotune: () => [v.type === "libre" ? "sans correction" : v.type === "cle" ? `${NOTES_EN[+v.tonique || 0]}${(GAMMES[v.gamme] || GAMMES.mineur).suffixe}` : v.type === "chroma" ? "chromatique" : "",
      v.type === "libre" ? "" : `${Math.round(v.vitesse)} ms`, v.demitons ? `${v.demitons > 0 ? "+" : ""}${v.demitons} dt` : ""].filter(Boolean).join(" · "),
    hpf: () => `${Math.round(v.freq)} Hz`,
    eq: () => [v.bas && `${v.bas > 0 ? "+" : ""}${v.bas} graves`, v.mid && `${v.mid > 0 ? "+" : ""}${v.mid} méd.`, v.haut && `${v.haut > 0 ? "+" : ""}${v.haut} aigus`].filter(Boolean).join(" · ") || "à plat",
    comp: () => `${v.seuil} dB · ${v.ratio}:1`,
    sat: () => `chaleur ${Math.round(v.drive)} %`,
    filtre: () => ({ tel: "téléphone", radio: "radio", pb: "passe-bas", ph: "passe-haut" }[v.type] || ""),
    chorus: () => `${Math.round(v.mix)} %`,
    reverb: () => `${(+v.taille).toFixed(1)} s · ${Math.round(v.mix)} %`,
    delay: () => `${(FX.find(f => f.k === "delay").divisions.find(d => d[0] === v.division) || [, ""])[1]} · ${Math.round(v.mix)} %`
  }[k] || (() => ""))();
  const FX_DEF = () => {
    const o = {};
    for (const f of FX) {
      o[f.k] = { on: f.k === "hpf" };
      f.p.forEach(([c, , , , , , d]) => o[f.k][c] = d);
      if (f.types) o[f.k].type = f.types[0][0];
      if (f.divisions) o[f.k].division = "1/4";
      if (f.menus) { o[f.k].tonique = "9"; o[f.k].gamme = "mineur"; o[f.k].tessiture = "large"; o[f.k].clavier = ""; }
      (f.cases || []).forEach(([c]) => o[f.k][c] = true);
    }
    return o;
  };
  /* Des reglages de depart, comme les presets d'un vrai studio. Doses volontairement
     legeres : une voix de rap ou de pop actuelle est seche et proche, la reverb et l'echo
     s'entendent a peine seuls mais tiennent la voix dans la prod. */
  const PRESETS = {
    brut:     { nom: "Brut (aucun effet)", fx: {} },
    naturel:  { nom: "Voix naturelle", fx: {
                hpf: { on: 1, freq: 80 },
                eq: { on: 1, bas: 0, mid: -2, midF: 320, midQ: 1, haut: 2, hautF: 10000 },
                comp: { on: 1, seuil: -18, ratio: 3, attaque: 10, relache: 120, gain: 3 },
                reverb: { on: 1, taille: .9, predelay: 15, amorti: 6500, mix: 9 } } },
    lead:     { nom: "Lead rap / pop", fx: {
                autotune: { on: 1, type: "prod", vitesse: 40, transition: 60, humain: 40, tolerance: 8, demitons: 0, mix: 100, formant: true },
                hpf: { on: 1, freq: 100 },
                eq: { on: 1, bas: 0, mid: -2.5, midF: 350, midQ: 1.1, haut: 3, hautF: 9500 },
                comp: { on: 1, seuil: -22, ratio: 4, attaque: 4, relache: 90, gain: 5 },
                sat: { on: 1, drive: 15, mix: 22 },
                delay: { on: 1, division: "1/4", retour: 15, filtre: 2800, mix: 7, pingpong: false },
                reverb: { on: 1, taille: 1.3, predelay: 30, amorti: 5500, mix: 9 } } },
    refrain:  { nom: "Refrain large", fx: {
                hpf: { on: 1, freq: 110 },
                eq: { on: 1, bas: 0, mid: -2, midF: 400, midQ: 1, haut: 2.5, hautF: 10000 },
                comp: { on: 1, seuil: -22, ratio: 4, attaque: 6, relache: 110, gain: 5 },
                chorus: { on: 1, vitesse: .35, profondeur: 25, mix: 22 },
                delay: { on: 1, division: "1/8p", retour: 14, filtre: 3200, mix: 7, pingpong: true },
                reverb: { on: 1, taille: 1.8, predelay: 25, amorti: 6000, mix: 13 } } },
    melo:     { nom: "Mélo / planant", fx: {
                hpf: { on: 1, freq: 90 },
                eq: { on: 1, bas: 0, mid: -1.5, midF: 300, midQ: 1, haut: 2, hautF: 11000 },
                comp: { on: 1, seuil: -20, ratio: 3, attaque: 12, relache: 160, gain: 4 },
                delay: { on: 1, division: "1/4", retour: 26, filtre: 2400, mix: 10, pingpong: true },
                reverb: { on: 1, taille: 2.6, predelay: 45, amorti: 4200, mix: 17 } } },
    backs:    { nom: "Backs / chœurs", fx: {
                hpf: { on: 1, freq: 180 },
                eq: { on: 1, bas: -3, basF: 250, mid: -2, midF: 2500, midQ: .9, haut: 1.5, hautF: 10000 },
                comp: { on: 1, seuil: -26, ratio: 5, attaque: 8, relache: 140, gain: 4 },
                chorus: { on: 1, vitesse: .3, profondeur: 35, mix: 35 },
                reverb: { on: 1, taille: 2.1, predelay: 10, amorti: 4500, mix: 20 } } },
    autotune: { nom: "Autotune marqué", fx: {
                autotune: { on: 1, type: "prod", vitesse: 0, transition: 0, humain: 0, tolerance: 0, demitons: 0, mix: 100, formant: true },
                hpf: { on: 1, freq: 100 },
                eq: { on: 1, bas: 0, mid: -2, midF: 350, midQ: 1, haut: 3, hautF: 10000 },
                comp: { on: 1, seuil: -22, ratio: 4, attaque: 4, relache: 90, gain: 5 },
                delay: { on: 1, division: "1/4", retour: 18, filtre: 2800, mix: 8, pingpong: true },
                reverb: { on: 1, taille: 1.6, predelay: 30, amorti: 5500, mix: 11 } } },
    adlibs:   { nom: "Ad-libs", fx: {
                hpf: { on: 1, freq: 220 },
                eq: { on: 1, bas: 0, mid: 2, midF: 2000, midQ: .8, haut: 1, hautF: 9000 },
                comp: { on: 1, seuil: -24, ratio: 6, attaque: 3, relache: 80, gain: 5 },
                delay: { on: 1, division: "1/4", retour: 28, filtre: 2600, mix: 15, pingpong: true },
                reverb: { on: 1, taille: 1.5, predelay: 20, amorti: 5000, mix: 11 } } },
    grave:    { nom: "Ad-libs pitchés (grave)", fx: {
                autotune: { on: 1, type: "libre", vitesse: 15, demitons: -12, mix: 100, formant: false },
                hpf: { on: 1, freq: 90 },
                comp: { on: 1, seuil: -22, ratio: 5, attaque: 4, relache: 90, gain: 4 },
                delay: { on: 1, division: "1/4", retour: 20, filtre: 2400, mix: 10, pingpong: true },
                reverb: { on: 1, taille: 1.4, predelay: 20, amorti: 4500, mix: 10 } } },
    intro:    { nom: "Intro filtrée", fx: {
                hpf: { on: 1, freq: 250 },
                filtre: { on: 1, type: "tel", freq: 1600, q: .8 },
                comp: { on: 1, seuil: -20, ratio: 4, attaque: 5, relache: 100, gain: 12 },   // le filtre retire ~10 dB : on les rend
                sat: { on: 1, drive: 20, mix: 30 },
                reverb: { on: 1, taille: .8, predelay: 10, amorti: 4000, mix: 8 } } }
  };
  // preregles retires (Téléphone, Grand espace, Chaud et saturé) : la piste garde ses
  // reglages, affiches comme « Réglages perso »
  const presetValide = cle => cle === "perso" || !!PRESETS[cle];
  const appliquerPreset = (p, cle) => {
    const def = FX_DEF();
    for (const f of FX) def[f.k].on = false;
    for (const [k, v] of Object.entries(PRESETS[cle].fx)) Object.assign(def[k], v, { on: !!v.on });
    p.fx = def; p.preset = cle;
  };
  /* Les projets d'avant (reverb, echo, graves, aigus, compresseur en simple bouton) gardent leur son. */
  function migrer(p){
    if (p.preset && !presetValide(p.preset)) p.preset = "perso";
    const f = p.fx || {};
    if (f.hpf) { const d = FX_DEF(); for (const k of Object.keys(d)) p.fx[k] = Object.assign(d[k], f[k] || {}); return; }
    const d = FX_DEF(); d.hpf.on = false;
    if (f.reverb > 0) Object.assign(d.reverb, { on: true, mix: Math.round(f.reverb * 100) });
    if (f.echo > 0) Object.assign(d.delay, { on: true, mix: Math.round(f.echo * 100), division: "1/8p" });
    if (f.grave || f.aigu) Object.assign(d.eq, { on: true, bas: f.grave || 0, haut: f.aigu || 0, basF: 220, hautF: 4500 });
    if (f.comp) Object.assign(d.comp, { on: true, seuil: -24, ratio: 4, gain: 3 });
    p.fx = d;
  }
  const actifs = p => FX.filter(f => p.fx[f.k] && p.fx[f.k].on).length;

  /* ── Autotune / pitch : un processeur audio dedie (AudioWorklet), charge une fois par
     contexte (celui du studio, et celui de chaque export). Il detecte la note chantee
     (algorithme YIN, sur le signal sous-echantillonne de moitie), choisit la note la plus
     proche dans la gamme, puis decale la hauteur avec deux tetes de lecture croisees sur
     une ligne a retard (fenetre de 28 ms). La vitesse lisse le passage vers la note cible :
     0 = saut instantane, l'effet robot. Eteint, il laisse passer la voix telle quelle. ── */
  const LAT_AT = .040;   // latence fixe du processeur (s), compensee a la lecture et a l'export
  const CODE_AT = `
  class FindingsAutotune extends AudioWorkletProcessor {
    constructor(){
      super();
      this.on = false; this.mode = "gamme"; this.vitesse = 15; this.transition = 0; this.humain = 0; this.tolerance = 0; this.diapason = 440;
      this.demitons = 0; this.mix = 1; this.masque = 4095; this.libres = 0; this.formant = true; this.fmin = 60; this.fmax = 1100; this.telem = false;
      this.port.onmessage = e => Object.assign(this, e.data);
      const sr = sampleRate;
      // detection (YIN, sous-echantillonnee par 2)
      this.R = 4096; this.ds = new Float32Array(this.R); this.dp = 0; this.impair = false; this.acc = 0; this.pas = 0; this.envoi = 0;
      this.W = 512; this.TMAX = Math.floor(sr / 2 / 55);
      this.lin = new Float32Array(this.W + this.TMAX + 2); this.d = new Float32Array(this.TMAX + 2);
      // etat de la correction
      this.corr = 1; this.cible = 1; this.noteG = 0; this.note = null; this.tenue = 0; this.k = 1; this.f0 = 0; this.m = 0;
      // lignes a retard (indices absolus, masque N-1)
      this.N = 65536; this.buf = new Float32Array(this.N); this.t = 0;
      this.L = Math.round(${LAT_AT} * sr);
      this.fen = Math.round(.028 * sr); this.phase = 0;                    // moteur « formants decales »
      this.out = new Float32Array(this.N); this.som = new Float32Array(this.N);
      this.ts = this.L; this.ta = 0; this.T = Math.round(sr * .006);        // moteur PSOLA (formants preserves)
    }
    detecter(){
      const R = this.R, tmin = Math.max(2, Math.floor(sampleRate / 2 / this.fmax)), tmax = Math.min(this.TMAX, Math.ceil(sampleRate / 2 / this.fmin));
      const n = this.W + tmax; let i0 = (this.dp - n + R) % R, e = 0;
      for (let i = 0; i < n; i++) { const v = this.ds[(i0 + i) % R]; this.lin[i] = v; e += v * v; }
      if (e / n < 4e-5) return 0;
      const x = this.lin, W = this.W, d = this.d; let somme = 0, best = -1;
      d[0] = 1;
      for (let t = 1; t <= tmax; t++) {
        let s = 0; for (let j = 0; j < W; j++) { const u = x[j] - x[j + t]; s += u * u; }
        somme += s; d[t] = somme > 0 ? s * t / somme : 1;
      }
      for (let t = tmin; t <= tmax; t++) if (d[t] < .15) { while (t + 1 <= tmax && d[t + 1] < d[t]) t++; best = t; break; }
      if (best < 0) return 0;
      const a = d[best - 1] || d[best], b = d[best], c = d[best + 1] || d[best], den = a - 2 * b + c;
      return sampleRate / 2 / (best + (den ? .5 * (a - c) / den : 0));
    }
    // la note visee parmi les touches autorisees ou libres ; -1 si aucune
    noteCible(m){
      const r = Math.round(m), toutes = this.mode === "chroma" ? 4095 : (this.masque | this.libres);
      if (!toutes) return r;
      let mieux = r, ecart = 99;
      for (let k = r - 6; k <= r + 6; k++) if (toutes & (1 << (((k % 12) + 12) % 12))) { const e = Math.abs(k - m); if (e < ecart) { ecart = e; mieux = k; } }
      return mieux;
    }
    analyser(){
      const sr = sampleRate, pasS = 512 / sr;
      const f0 = this.mode === "libre" ? this.detecterLibre() : this.detecter();
      this.f0 = f0;
      if (f0 > 0) {
        this.T = Math.max(16, Math.min(Math.round(this.L / 2.6), Math.round(sr / f0)));
        const m = 69 + 12 * Math.log2(f0 / this.diapason); this.m = m;
        if (this.mode === "libre") { this.cible = 1; this.noteG = m; this.note = null; }
        else {
          const n = this.noteCible(m), libre = this.mode !== "chroma" && (this.libres & (1 << (((n % 12) + 12) % 12)));
          this.tenue = n === this.note ? this.tenue + pasS : 0;
          // transition : la note visee glisse de l'ancienne a la nouvelle
          if (this.note === null || this.transition <= 0) this.noteG = n;
          else this.noteG += (n - this.noteG) * (1 - Math.exp(-pasS / (this.transition / 1000)));
          this.note = n;
          this.cible = libre || Math.abs(n - m) * 100 < this.tolerance ? 1 : Math.pow(2, (this.noteG - m) / 12);
        }
      } else { this.cible += (1 - this.cible) * .3; this.note = null; this.tenue = 0; this.T = Math.round(sr * .006); this.m = 0; }
      const v = this.vitesse + this.humain * 400 * Math.min(1, this.tenue / .35);
      this.k = v > 0 ? 1 - Math.exp(-1 / (v / 1000 * sr)) : 1;
      if (this.telem && ++this.envoi >= 2) { this.envoi = 0; this.port.postMessage({ f: f0, m: this.m, c: f0 > 0 && this.mode !== "libre" ? this.noteG : 0, r: this.corr }); }
    }
    detecterLibre(){ return this.formant || this.telem ? this.detecter() : 0; }   // sans correction : la periode sert encore au PSOLA
    process(inputs, outputs){
      const ent = inputs[0], sor = outputs[0][0];
      if (!sor) return true;
      if (!ent || !ent.length) { sor.fill(0); return true; }
      const a0 = ent[0], a1 = ent[1];
      if (!this.on) { for (let i = 0; i < sor.length; i++) sor[i] = a1 ? (a0[i] + a1[i]) * .5 : a0[i]; return true; }
      const N1 = this.N - 1, trans = Math.pow(2, this.demitons / 12), L = this.L, fen = this.fen, base = L - fen / 2 - 1;
      for (let i = 0; i < sor.length; i++) {
        const x = a1 ? (a0[i] + a1[i]) * .5 : a0[i], t = this.t;
        this.buf[t & N1] = x;
        this.acc += x; this.impair = !this.impair;
        if (!this.impair) { this.ds[this.dp] = this.acc * .5; this.acc = 0; this.dp = (this.dp + 1) % this.R; if (++this.pas >= 256) { this.pas = 0; this.analyser(); } }
        this.corr += (this.cible - this.corr) * this.k;
        const ratio = this.corr * trans;
        let y = 0;
        if (this.formant) {
          // PSOLA : des grains de deux periodes, pris tous les T dans l'entree, reposes tous les T/ratio
          const T = this.T, voise = this.f0 > 0, r = voise ? ratio : 1;
          while (this.ts - T <= t) {
            const cible = this.ts - L;
            while (this.ta + T / 2 < cible) this.ta += T;
            while (this.ta - T / 2 > cible) this.ta -= T;
            const ca = Math.round(this.ta), cs = Math.round(this.ts);
            for (let j = -T; j < T; j++) { const w = .5 + .5 * Math.cos(Math.PI * j / T); const o = (cs + j) & N1; this.out[o] += this.buf[(ca + j) & N1] * w; this.som[o] += w; }
            this.ts += Math.max(1, T / r);
          }
          const o = t & N1, s = this.som[o];
          y = s > .05 ? this.out[o] / Math.max(1, s) : 0; this.out[o] = 0; this.som[o] = 0;
        } else {
          // formants decales : deux tetes croisees sur la ligne a retard (le timbre suit la hauteur)
          this.phase += (1 - ratio) / fen; this.phase -= Math.floor(this.phase);
          for (let h = 0; h < 2; h++) {
            const ph = (this.phase + h * .5) % 1, pos = t - (base + ph * fen);
            const i0 = Math.floor(pos), fr = pos - i0, s0 = this.buf[i0 & N1], s1 = this.buf[(i0 + 1) & N1];
            y += (s0 + (s1 - s0) * fr) * (.5 - .5 * Math.cos(2 * Math.PI * ph));
          }
        }
        const sec = this.buf[(t - L) & N1];      // la voix d'origine, retardee d'autant pour le melange
        sor[i] = sec * (1 - this.mix) + y * this.mix;
        this.t = t + 1;
      }
      return true;
    }
  }
  registerProcessor("findings-autotune", FindingsAutotune);`;
  const AT_PRET = new WeakSet(), AT_CHARGE = new WeakMap();
  function chargerAT(c){
    if (!c.audioWorklet) return Promise.resolve(false);
    if (!AT_CHARGE.has(c)) {
      const url = URL.createObjectURL(new Blob([CODE_AT], { type: "application/javascript" }));
      AT_CHARGE.set(c, c.audioWorklet.addModule(url).then(() => { AT_PRET.add(c); return true; }).catch(() => false));
    }
    return AT_CHARGE.get(c);
  }
  /* Le clavier de l'autotune : 12 touches, « 1 » visee, « 0 » retiree (renvoyee vers la plus
     proche), « b » libre (chantee telle quelle). Sans clavier edite, il suit la gamme choisie. */
  function clavierDe(a){
    let base = 4095;
    if (a.type === "cle") base = masqueDe(a.tonique || 0, a.gamme);
    else if (a.type === "prod") base = prod && prod.keySur ? masqueGamme(prod.key) : 4095;
    const touches = a.clavier && a.clavier.length === 12 ? a.clavier : [...Array(12)].map((_, i) => base & (1 << i) ? "1" : "0").join("");
    let masque = 0, libres = 0;
    [...touches].forEach((c, i) => { if (c === "1") masque |= 1 << i; else if (c === "b") libres |= 1 << i; });
    return { touches, masque: masque || (libres ? 0 : 4095), libres };
  }
  const avanceAT = p => p.fx && p.fx.autotune && p.fx.autotune.on ? LAT_AT : 0;
  // gamme de la prod (« Am », « F#m », « Eb ») en masque de 12 notes ; chromatique sans tonalite connue
  function masqueGamme(cle){
    const m = /^~?([A-G])([#b]?)(m?)/.exec(cle || "");
    if (!m) return 4095;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    const int = m[3] ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    return int.reduce((s, i) => s | (1 << ((base + i + 12) % 12)), 0);
  }

  /* Reponse de salle : quelques reflexions precoces espacees, puis une queue de bruit qui
     decroit en exponentielle (-60 dB a « taille » secondes) et s'assombrit en vieillissant,
     comme l'air et les murs qui absorbent d'abord les aigus. Les deux canaux sont tires
     separement : la queue est large sans effet de phase. L'ancienne version (bruit blanc
     decroissant, aussi brillant a la fin qu'au debut) sonnait metallique. */
  function impulsion(c, taille = 1.4){
    const sr = c.sampleRate, n = Math.max(1, Math.floor(sr * taille * 1.15)), b = c.createBuffer(2, n, sr);
    const k = Math.log(1000) / (taille * sr);            // -60 dB a « taille »
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0, alea = ch ? 0x9e3779b9 : 0x7f4a7c15;
      const hasard = () => { alea ^= alea << 13; alea ^= alea >>> 17; alea ^= alea << 5; return ((alea >>> 0) / 4294967296) * 2 - 1; };
      const debut = Math.floor(sr * .018);               // la queue se leve sur 18 ms
      for (let i = 0; i < n; i++) {
        const t = i / n;
        // filtre passe-bas d'un pole dont la coupure descend de ~11 kHz a ~2 kHz
        const fc = 11000 * Math.pow(2000 / 11000, Math.min(1, t * 1.4));
        const a1 = Math.exp(-2 * Math.PI * fc / sr);
        lp = (1 - a1) * hasard() + a1 * lp;
        const env = Math.exp(-k * i) * (i < debut ? i / debut : 1);
        d[i] = lp * env;
      }
      // reflexions precoces : 6 echos francs entre 7 et 55 ms, differents a gauche et a droite
      const temps = ch ? [9, 17, 26, 33, 44, 55] : [7, 13, 21, 30, 39, 51];
      temps.forEach((ms, j) => { const i = Math.floor(sr * ms / 1000); if (i < n) d[i] += (j % 2 ? -1 : 1) * .5 * Math.pow(.78, j); });
    }
    return b;
  }
  /* Saturation douce : tangente hyperbolique legerement decentree (harmoniques paires,
     le grain « lampe »), divisee par son gain pour rester a l'unite sur les passages calmes.
     Seules les crêtes s'arrondissent ; l'ancienne courbe faisait une fuzz des 35 %. */
  /* courbe de l'etage Analog : quasi lineaire a niveau normal, les crêtes s'arrondissent et
     gagnent un peu d'harmonique 2 (comme une console ou un transformateur pousses legerement) */
  const COURBE_ANA = (() => { const n = 4096, c = new Float32Array(n), g = 1.6, b = .08, z = Math.tanh(g * b);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (Math.tanh(g * (x + b)) - z) / (g * (1 - z * z)); } return c; })();
  const courbe = drive => {
    const g = 1 + drive / 100 * 7, b = .12, n = 4096, c = new Float32Array(n), z = Math.tanh(g * b);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (Math.tanh(g * (x + b)) - z) / g; }
    return c;
  };
  const DIVISION = { "1/4": 1, "1/8p": .75, "1/8": .5, "1/16": .25, "1/4t": 2 / 3 };
  /* sortie commune : volume general + limiteur (voix + prod saturaient a l'export) */
  function bus(c){
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12;
    lim.connect(c.destination);
    const master = c.createGain(); master.connect(lim);
    master.gain.value = P && P.master != null ? P.master : 1;
    return { master };
  }
  function chaine(c, b){
    const G = () => c.createGain(), F = t => { const f = c.createBiquadFilter(); f.type = t; return f; };
    const n = { c, entree: G() };
    n.at = AT_PRET.has(c) ? new AudioWorkletNode(c, "findings-autotune", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }) : G();
    if (n.at.port) { n.atHist = []; n.at.port.onmessage = e => { n.atHist.push(e.data); if (n.atHist.length > 260) n.atHist.shift(); }; }
    n.hpf = F("highpass"); n.eqB = F("lowshelf"); n.eqM = F("peaking"); n.eqH = F("highshelf");
    n.comp = c.createDynamicsCompressor(); n.compG = G();
    // etage « Analog » : transformateur (galbe du grave, aigu adouci) et un soupcon d'harmoniques paires
    n.anaLo = F("lowshelf"); n.anaLo.frequency.value = 90; n.anaHi = F("highshelf"); n.anaHi.frequency.value = 15000;
    n.ana = c.createWaveShaper(); n.ana.oversample = "4x";
    n.satSec = G(); n.ws = c.createWaveShaper(); n.ws.oversample = "4x"; n.satHum = G(); n.satSom = G();
    n.filtre = F("allpass");
    n.chSec = G(); n.chHum = G(); n.chSom = G();
    n.chD1 = c.createDelay(.1); n.chD2 = c.createDelay(.1); n.chD1.delayTime.value = .014; n.chD2.delayTime.value = .023;
    n.osc = c.createOscillator(); n.oscG1 = G(); n.oscG2 = G(); n.osc.connect(n.oscG1); n.osc.connect(n.oscG2);
    n.oscG1.connect(n.chD1.delayTime); n.oscG2.connect(n.chD2.delayTime); n.osc.start();
    const p1 = c.createStereoPanner ? c.createStereoPanner() : G(), p2 = c.createStereoPanner ? c.createStereoPanner() : G();
    if (p1.pan) { p1.pan.value = -.7; p2.pan.value = .7; }
    n.pan = c.createStereoPanner ? c.createStereoPanner() : null;
    n.fader = G();
    n.mesure = c.createAnalyser ? c.createAnalyser() : null; if (n.mesure) n.mesure.fftSize = 512;
    // reverb : depart → pre-delai → convolution → brillance → retour
    n.revDep = G(); n.revPre = c.createDelay(.5); n.conv = c.createConvolver(); n.revLP = F("lowpass"); n.revHP = F("highpass");
    n.revHP.frequency.value = 220;   // une reverb sans grave : la voix reste nette, la prod ne s'embourbe pas
    // echo : deux lignes croisees pour le ping-pong
    n.dlyDep = G(); n.dA = c.createDelay(2.5); n.dB = c.createDelay(2.5); n.fbA = G(); n.fbB = G();
    n.lpA = F("lowpass"); n.lpB = F("lowpass"); n.hpA = F("highpass"); n.hpB = F("highpass");
    n.hpA.frequency.value = 250; n.hpB.frequency.value = 250;
    n.panA = c.createStereoPanner ? c.createStereoPanner() : G(); n.panB = c.createStereoPanner ? c.createStereoPanner() : G();
    // cablage
    n.entree.connect(n.at); n.at.connect(n.hpf); n.hpf.connect(n.eqB); n.eqB.connect(n.eqM); n.eqM.connect(n.eqH); n.eqH.connect(n.comp); n.comp.connect(n.compG);
    n.compG.connect(n.anaLo); n.anaLo.connect(n.anaHi); n.anaHi.connect(n.ana);
    n.ana.connect(n.satSec); n.ana.connect(n.ws); n.ws.connect(n.satHum); n.satSec.connect(n.satSom); n.satHum.connect(n.satSom);
    n.satSom.connect(n.filtre);
    n.filtre.connect(n.chSec); n.filtre.connect(n.chD1); n.filtre.connect(n.chD2);
    n.chD1.connect(p1); n.chD2.connect(p2); p1.connect(n.chHum); p2.connect(n.chHum);
    n.chSec.connect(n.chSom); n.chHum.connect(n.chSom);
    if (n.pan) { n.chSom.connect(n.pan); n.pan.connect(n.fader); } else n.chSom.connect(n.fader);
    n.fader.connect(b.master); if (n.mesure) n.fader.connect(n.mesure);
    n.fader.connect(n.revDep); n.revDep.connect(n.revPre); n.revPre.connect(n.conv); n.conv.connect(n.revLP); n.revLP.connect(n.revHP); n.revHP.connect(b.master);
    n.fader.connect(n.dlyDep); n.dlyDep.connect(n.dA);
    // les filtres sont dans la boucle : chaque tour repasse dedans et perd encore des aigus et du grave
    n.dA.connect(n.lpA); n.lpA.connect(n.hpA); n.hpA.connect(n.fbA); n.fbA.connect(n.dB);
    n.dB.connect(n.lpB); n.lpB.connect(n.hpB); n.hpB.connect(n.fbB); n.fbB.connect(n.dA);
    n.hpA.connect(n.panA); n.panA.connect(b.master);
    n.hpB.connect(n.panB); n.panB.connect(b.master);
    return n;
  }
  const soloActif = () => P.pistes.some(p => p.solo);
  const offline = c => typeof OfflineAudioContext !== "undefined" && c instanceof OfflineAudioContext;
  const dB = v => Math.pow(10, v / 20);
  function regler(n, p, solo){
    const f = p.fx, c = n.c, on = k => f[k] && f[k].on;
    if (n.at.port && f.autotune) {
      const a = f.autotune;
      // la gamme de la prod seulement si sa tonalite est lue dans le titre : une tonalite
      // estimee (« ~ ») peut etre fausse et tirerait la voix vers les mauvaises notes
      const cl = clavierDe(a), t = TESSITURES[a.tessiture] || TESSITURES.large;
      n.at.port.postMessage({ on: !!a.on, mode: a.type === "libre" ? "libre" : cl.masque === 4095 && !cl.libres ? "chroma" : "gamme",
        vitesse: a.vitesse, transition: a.transition || 0, humain: (a.humain || 0) / 100, tolerance: a.tolerance || 0, diapason: a.diapason || 440,
        demitons: a.demitons, mix: a.mix / 100, masque: cl.masque, libres: cl.libres, formant: a.formant !== false, fmin: t.min, fmax: t.max,
        telem: fxOuvert === "autotune" && pisteCible() === p });
      // la latence du processeur se compense en lisant la piste plus tot : on reprogramme si elle change
      if (n.atOn !== !!a.on) { n.atOn = !!a.on; sale = true; }
    }
    n.hpf.frequency.value = on("hpf") ? f.hpf.freq : 10;
    n.eqB.frequency.value = f.eq.basF; n.eqB.gain.value = on("eq") ? f.eq.bas : 0;
    n.eqM.frequency.value = f.eq.midF; n.eqM.Q.value = f.eq.midQ; n.eqM.gain.value = on("eq") ? f.eq.mid : 0;
    n.eqH.frequency.value = f.eq.hautF; n.eqH.gain.value = on("eq") ? f.eq.haut : 0;
    if (on("comp")) { n.comp.threshold.value = f.comp.seuil; n.comp.ratio.value = f.comp.ratio; n.comp.knee.value = 6;
      n.comp.attack.value = f.comp.attaque / 1000; n.comp.release.value = f.comp.relache / 1000; n.compG.gain.value = dB(f.comp.gain); }
    else { n.comp.threshold.value = 0; n.comp.ratio.value = 1; n.comp.knee.value = 0; n.compG.gain.value = 1; }
    // Analog : actif si l'egaliseur ou le compresseur l'est, avec sa case cochee
    const ana = (on("eq") && f.eq.analog !== false) || (on("comp") && f.comp.analog !== false);
    n.ana.curve = ana ? COURBE_ANA : null; n.anaLo.gain.value = ana ? .7 : 0; n.anaHi.gain.value = ana ? -.8 : 0;
    if (on("sat")) {
      if (n.drive !== f.sat.drive) { n.ws.curve = courbe(f.sat.drive); n.drive = f.sat.drive; }
      const m = f.sat.mix / 100; n.satSec.gain.value = 1 - m; n.satHum.gain.value = m * (1 + f.sat.drive / 100 * .6);
    } else { n.satSec.gain.value = 1; n.satHum.gain.value = 0; }
    if (on("filtre")) {
      const t = f.filtre.type;
      n.filtre.type = t === "pb" ? "lowpass" : t === "ph" ? "highpass" : "bandpass";
      n.filtre.frequency.value = t === "radio" ? Math.min(f.filtre.freq, 2500) : f.filtre.freq;
      n.filtre.Q.value = t === "radio" ? Math.max(.5, f.filtre.q * .6) : f.filtre.q;
    } else n.filtre.type = "allpass";
    if (on("chorus")) {
      n.osc.frequency.value = f.chorus.vitesse;
      // ±2 ms au plus : la voix s'elargit sans onduler (l'ancien ±6 ms faisait chanter faux)
      const d = f.chorus.profondeur / 100 * .002; n.oscG1.gain.value = d; n.oscG2.gain.value = -d;
      const m = f.chorus.mix / 100; n.chSec.gain.value = 1 - m * .3; n.chHum.gain.value = m * .8;
    } else { n.chSec.gain.value = 1; n.chHum.gain.value = 0; n.oscG1.gain.value = 0; n.oscG2.gain.value = 0; }
    if (n.pan) n.pan.pan.value = p.pan;
    n.fader.gain.value = (!p.mute && (!solo || p.solo)) ? p.vol : 0;
    // reverb : la convolution se recalcule quand la taille change (un peu apres, pendant qu'on tourne le bouton)
    n.revDep.gain.value = on("reverb") ? f.reverb.mix / 100 * 1.1 : 0;
    n.revPre.delayTime.value = f.reverb.predelay / 1000; n.revLP.frequency.value = f.reverb.amorti;
    if (n.taille !== f.reverb.taille && (on("reverb") || !n.conv.buffer)) {
      const faire = () => { n.conv.buffer = impulsion(c, f.reverb.taille); n.taille = f.reverb.taille; };
      if (offline(c) || !n.conv.buffer) faire(); else { clearTimeout(n.tImp); n.tImp = setTimeout(() => {
        // une nouvelle convolution plutot que reaffecter le tampon de l'ancienne
        const nc = c.createConvolver(); nc.buffer = impulsion(c, f.reverb.taille);
        try { n.revPre.disconnect(n.conv); n.conv.disconnect(); } catch (e) {}
        n.revPre.connect(nc); nc.connect(n.revLP); n.conv = nc; n.taille = f.reverb.taille; }, 160); }
    }
    // echo cale sur le tempo
    const t = Math.min(2.4, DIVISION[f.delay.division] * 60 / bpm());
    n.dA.delayTime.value = t; n.dB.delayTime.value = t;
    const r = f.delay.retour / 100; n.fbA.gain.value = r; n.fbB.gain.value = r;
    n.lpA.frequency.value = f.delay.filtre; n.lpB.frequency.value = f.delay.filtre;
    if (n.panA.pan) { n.panA.pan.value = f.delay.pingpong ? -.85 : 0; n.panB.pan.value = f.delay.pingpong ? .85 : 0; }
    n.dlyDep.gain.value = on("delay") ? f.delay.mix / 100 * 1.1 : 0;
  }
  function liberer(n){ try { n.osc.stop(); } catch (e) {} try { if (n.at.port) n.at.port.close(); } catch (e) {} try { n.fader.disconnect(); n.hpA.disconnect(); n.hpB.disconnect(); n.revHP.disconnect(); } catch (e) {} }
  function construireNoeuds(){
    const c = audio();
    noeuds.forEach(liberer);
    noeuds = new Map();
    if (!busV) busV = bus(c);
    busV.master.gain.value = P.master != null ? P.master : 1;
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
      const n = noeuds.get(k.piste), buf = BUF.get(k.prise), pi = P.pistes.find(x => x.id === k.piste);
      const st = k.start - (pi ? avanceAT(pi) : 0);   // l'autotune retarde la voix : elle part d'autant plus tot
      if (!n || !buf || st + k.dur <= Bv) continue;
      const dans = Math.max(0, Bv - st), when = T + Math.max(0, st - Bv);
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
  const nouvellePiste = i => { const p = { id: nid(), nom: typeof T === "function" ? T(`Voix ${i + 1}`) : `Voix ${i + 1}`, vol: 1, pan: 0, mute: false, solo: false, fx: FX_DEF(), preset: "brut" }; return p; };
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
    pr.pistes.forEach(migrer);
    P = pr;
    arreterInterne(); fichier = null;
    try {
      const f = await PRISES_DB.lireFichier(b.id);
      if (f && f.blob) { const buf = await audio().decodeAudioData(await f.blob.arrayBuffer()); fichier = { nom: f.nom, buf, pic: pics(buf) }; }
    } catch (e) { fichier = null; }
    construireNoeuds();
    peindreTitre();
    $("dawInfo").textContent = b.id === "libre" ? `${bpm()} BPM · ta prod, tes voix` : `${b.bpmSur ? "" : "~"}${b.bpm} BPM · ${STYLE_NAME[b.style] || b.style} · par ${b.prod}`;
    if (P.beatVol != null) { try { player.setVolume(P.beatVol); } catch (e) {} }
    entete(); dessiner(); inspecteur(); outils();
    if (document.body.classList.contains("vue-studio") && typeof BASE !== "undefined") {
      const adr = BASE + "studio/" + (b.id === "libre" ? "" : "?beat=" + encodeURIComponent(b.id));
      if (adr !== location.pathname + location.search) history.replaceState({ vue: "studio" }, "", adr);
    }
  }
  let saveMinuteur = 0;
  /* Nom du projet : celui que le visiteur a donne, sinon le titre de la prod (ou du fichier
     importe pour le projet libre). Le nom vit dans le projet, avec l'arrangement. */
  const titreParDefaut = () => !prod ? "" : prod.id === "libre" ? (fichier ? fichier.nom.replace(/\.[a-z0-9]+$/i, "") : (typeof T === "function" ? T("Projet libre") : "Projet libre")) : prod.title;
  const titreProjet = () => (P && P.nom) || titreParDefaut();
  function peindreTitre(){ const t = $("dawTitre"); if (t) t.textContent = titreProjet(); }
  const signalerProjets = () => window.dispatchEvent(new Event("findings:projets"));
  // le nom s'ecrit tout de suite : la liste des projets le relit juste apres
  async function sauverNom(){ clearTimeout(saveMinuteur); if (!P) return; P.maj = Date.now(); try { await PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} signalerProjets(); }
  function renommer(){
    if (!P) return;
    const btn = $("dawTitreBtn");
    if (!btn || btn.hidden) return;
    const champ = document.createElement("input");
    champ.className = "daw-titre-champ"; champ.value = titreProjet(); champ.maxLength = 60;
    champ.setAttribute("aria-label", "Nom du projet");
    btn.hidden = true; btn.after(champ); champ.focus(); champ.select();
    let fini = false;
    const finir = garder => {
      if (fini) return; fini = true;
      const v = champ.value.trim();
      if (garder) { if (!v || v === titreParDefaut()) delete P.nom; else P.nom = v; sauverNom(); message("Projet renommé"); }
      champ.remove(); btn.hidden = false; peindreTitre();
    };
    champ.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") finir(true); else if (e.key === "Escape") finir(false); });
    champ.addEventListener("blur", () => finir(true));
  }
  /* Supprimer un projet : l'arrangement, toutes ses prises et la prod importee. Si c'est
     celui qui est ouvert, le studio repart d'un projet vide sur la meme prod. */
  async function supprimerProjet(id){
    let prises = [];
    try { prises = await PRISES_DB.duProd(id); } catch (e) {}
    try { await PRISES_DB.supprProjet(id); } catch (e) {}
    prises.forEach(p => { BUF.delete(p.id); PIC.delete(p.id); });
    if (typeof PRISES_MEMOIRE !== "undefined") for (let i = PRISES_MEMOIRE.length - 1; i >= 0; i--) if (PRISES_MEMOIRE[i].prod === id) PRISES_MEMOIRE.splice(i, 1);
    TOPLINE_N.delete(id);
    if (typeof majToplines === "function") majToplines();
    if (S.toplines || document.querySelector(".row")) render();
    if (P && P.prod === id) { clearTimeout(saveMinuteur); P = null; if (ouvert && prod) { arreterSources(); await charger(prod); } }
    signalerProjets();
  }
  async function renommerProjet(id, nom){
    nom = (nom || "").trim();
    if (P && P.prod === id) { if (!nom || nom === titreParDefaut()) delete P.nom; else P.nom = nom; peindreTitre(); clearTimeout(saveMinuteur); try { await PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} }
    else {
      let pr = null; try { pr = await PRISES_DB.lireProjet(id); } catch (e) {}
      if (!pr) pr = { prod: id, pistes: [nouvellePiste(0)], clips: [], decal: 0, beatVol: null };
      if (nom) pr.nom = nom; else delete pr.nom;
      try { await PRISES_DB.ecrireProjet(pr); } catch (e) {}
    }
    signalerProjets();
  }
  function sauver(){ clearTimeout(saveMinuteur); saveMinuteur = setTimeout(() => { if (!P) return; P.maj = Date.now(); try { PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} }, 350); }
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
    peindreTitre();
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
      <div class="daw-ligne piste${pisteCible().id === p.id ? " sel-piste" : ""}" data-piste="${p.id}" style="--pc:${COULEURS[i % COULEURS.length]}">
        <div class="daw-tete" data-tete="${p.id}">
          <div class="t1"><span class="num">${i + 1}</span><span class="nom">${esc(p.nom)}</span>${pisteCible().id === p.id ? '<em class="cible" title="Les prochaines prises vont sur cette piste">R</em>' : ""}</div>
          <div class="t2">
            <button class="daw-ms m" data-mute="${p.id}" aria-pressed="${p.mute}" title="Muet">M</button>
            <button class="daw-ms s" data-solo="${p.id}" aria-pressed="${p.solo}" title="Solo">S</button>
            <button class="daw-fxb${actifs(p) ? " actif" : ""}" data-fxpiste="${p.id}" title="Effets de la piste">FX${actifs(p) ? ` <span>${actifs(p)}</span>` : ""}</button>
            <span class="vu" title="Niveau"><i data-vu="${p.id}"></i></span>
          </div>
          <input class="vol" type="range" min="0" max="150" value="${Math.round(p.vol * 100)}" data-vol="${p.id}" aria-label="Volume de ${esc(p.nom)}" title="Volume">
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
    remplirCurseurs(el);
  }
  // la part « remplie » d'un curseur, en pourcentage, pour le degrade de sa piste
  function remplirCurseurs(racine){ racine.querySelectorAll('input[type=range]').forEach(r => r.style.setProperty("--p", `${(r.value - (r.min || 0)) / ((r.max || 100) - (r.min || 0)) * 100}%`)); }
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
  // une couleur #rrggbb melangee a du blanc (t = part de blanc)
  const teinte = (hex, t) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return "rgba(255,255,255,.85)";
    const v = parseInt(m[1], 16), c = [v >> 16, (v >> 8) & 255, v & 255].map(x => Math.round(x + (255 - x) * t)); return `rgb(${c.join(",")})`; };
  function ondeRegion(n){
    const k = P.clips.find(x => x.id === n.dataset.clip), pk = k && PIC.get(k.prise); if (!pk) return;
    const cv = n.querySelector("canvas"), w = Math.max(1, Math.round(k.dur * zoom)), W = Math.min(w, 4096);
    const H = Math.max(20, n.clientHeight - 20), dpr = Math.min(2, window.devicePixelRatio || 1), r = w / W;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = w + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.scale(dpr, dpr);
    // forme d'onde teintee de la couleur de la piste (eclaircie), sur le corps sombre de la region
    g.fillStyle = teinte(getComputedStyle(n).getPropertyValue("--pc").trim(), .55);
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
    $("dawTemps").textContent = fmt(t); $("dawMesure").textContent = `${m + 1}.${tp + 1}`;
  }
  function suivreCurseur(){
    cancelAnimationFrame(anim);
    const tour = () => {
      if (!ouvert) return;
      const t = tempsBeat();
      placerCurseur(t);
      if (rec && rec.el) rec.el.style.width = `${Math.max(2, (t - rec.debut) * zoom)}px`;
      vumetres();
      const joue = joueStudio();
      $("dawLire").innerHTML = joue ? I.pause : I.lire;
      el.classList.toggle("joue", joue); el.classList.toggle("enregistre", !!rec);
      el.classList.toggle("yt-mode", !horlogeInterne());
      if (joue) {   // la page suit le curseur
        const hw = grilleEl.querySelector(".daw-tete")?.offsetWidth || 196, x = hw + t * zoom;
        if (x > zone.scrollLeft + zone.clientWidth - 40 || x < zone.scrollLeft + hw) zone.scrollLeft = x - hw - 60;
      }
      anim = requestAnimationFrame(tour);
    };
    anim = requestAnimationFrame(tour);
  }
  /* niveau de chaque piste, en sortie de sa chaine */
  const tamponVu = new Float32Array(512);
  function vumetres(){
    noeuds.forEach((n, id) => {
      const i = grilleEl.querySelector(`[data-vu="${id}"]`); if (!i || !n.mesure) return;
      n.mesure.getFloatTimeDomainData(tamponVu); let m = 0; for (const x of tamponVu) { const a = x < 0 ? -x : x; if (a > m) m = a; }
      const v = clamp((20 * Math.log10(m + 1e-6) + 48) / 48, 0, 1);
      n.vu = Math.max(v, (n.vu || 0) - .04); i.style.transform = `scaleX(${n.vu.toFixed(3)})`;
    });
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
    $("dawDupliquer").disabled = !(sel && sel.type === "clip");
    $("dawExport").disabled = !P || !P.clips.length;
    $("dawGrille").setAttribute("aria-pressed", String(grille));
  }

  /* ─────────────────────────── panneau du bas ───────────────────────────
     Trois onglets : « Piste et effets » (la chaine d'effets de la piste choisie, en cartes),
     « Region » (volume et fondus de la region choisie), « Projet » (reglages generaux).
     Les reglages sont des boutons rotatifs : on les tire vers le haut ou le bas (Maj pour
     affiner), double-clic pour revenir a la valeur d'origine, molette ou fleches au clavier. */
  let onglet = "piste", fxOuvert = "reverb";
  const corps = $("dawCorps"), pan = $("dawPan");
  const ARC = (v01) => { const a0 = -225, a1 = a0 + 270 * v01, r = 17, cx = 21, cy = 21;
    const pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${270 * v01 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const LOG = u => u === "Hz";
  const versPos = (v, min, max, u) => LOG(u) ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
  const versVal = (x, min, max, u) => LOG(u) ? min * Math.pow(max / min, x) : min + x * (max - min);
  const afficher = (v, u) => {
    if (u === "Hz" && v < 1000 && v % 1) return `${(+v).toFixed(1)} Hz`;
    if (u === "Hz") return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} kHz` : `${Math.round(v)} Hz`;
    if (u === "dB") return `${v > 0 ? "+" : ""}${(+v).toFixed(Math.abs(v) < 10 && v % 1 ? 1 : 0)} dB`;
    if (u === "%") return `${Math.round(v)} %`;
    if (u === "ms") return `${Math.round(v)} ms`;
    if (u === "dt") return `${v > 0 ? "+" : ""}${Math.round(v)} dt`;
    if (u === "ct") return `${Math.round(v)} ct`;
    if (u === "s") return `${(+v).toFixed(1)} s`;
    if (u === ":1") return `${(+v).toFixed(v % 1 ? 1 : 0)}:1`;
    if (u === "pan") return Math.abs(v) < .02 ? "C" : (v < 0 ? "G" : "D") + Math.round(Math.abs(v) * 100);
    if (u === "x") return `${Math.round(v * 100)} %`;
    return (+v).toFixed(1);
  };
  const bouton = (cle, nom, min, max, pas, u, val, def) => {
    const x = clamp(versPos(val, min, max, u), 0, 1);
    return `<div class="kn" tabindex="0" role="slider" aria-label="${esc(nom)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${val}"
      data-cle="${cle}" data-min="${min}" data-max="${max}" data-pas="${pas}" data-u="${u}" data-def="${def}" data-val="${val}">
      <svg viewBox="0 0 42 42"><path class="kn-fond" d="${ARC(1)}"/><path class="kn-val" d="${ARC(Math.max(.001, x))}"/>
      <circle class="kn-cap" cx="21" cy="21" r="11"/><line class="kn-ind" x1="21" y1="21" x2="${(21 + 8 * Math.cos((-225 + 270 * x) * Math.PI / 180)).toFixed(2)}" y2="${(21 + 8 * Math.sin((-225 + 270 * x) * Math.PI / 180)).toFixed(2)}"/></svg>
      <span class="kn-v">${afficher(val, u)}</span><span class="kn-n">${esc(nom)}</span></div>`;
  };
  function peindreBouton(kn, val){
    const min = +kn.dataset.min, max = +kn.dataset.max, u = kn.dataset.u, x = clamp(versPos(val, min, max, u), 0, 1);
    kn.dataset.val = val; kn.setAttribute("aria-valuenow", val);
    kn.querySelector(".kn-val").setAttribute("d", ARC(Math.max(.001, x)));
    const a = (-225 + 270 * x) * Math.PI / 180, l = kn.querySelector(".kn-ind");
    l.setAttribute("x2", (21 + 8 * Math.cos(a)).toFixed(2)); l.setAttribute("y2", (21 + 8 * Math.sin(a)).toFixed(2));
    kn.querySelector(".kn-v").textContent = afficher(val, u);
  }
  const regionSel = () => sel && sel.type === "clip" && P.clips.find(x => x.id === sel.id);
  /* une cle de reglage → l'objet et la propriete qu'elle designe */
  function cible(cle){
    const [quoi, a, b] = cle.split(".");
    if (quoi === "fx") { const p = pisteCible(); return [p.fx[a], b, p]; }
    if (quoi === "piste") { const p = pisteCible(); return [p, a, p]; }
    if (quoi === "region") { const k = regionSel(); return [k, a, null]; }
    if (quoi === "projet") return [P, a, null];
  }
  function appliquer(cle, val){
    const [o, prop, p] = cible(cle); if (!o) return;
    o[prop] = val;
    if (cle.startsWith("region.")) {
      const k = o; if (prop === "fadeIn") k.fadeIn = Math.min(val, k.dur - k.fadeOut); if (prop === "fadeOut") k.fadeOut = Math.min(val, k.dur - k.fadeIn);
      const n = grilleEl.querySelector(`.clip[data-clip="${k.id}"]`); if (n) ondeRegion(n);
      sale = true;
    } else if (cle === "projet.master") { if (busV) busV.master.gain.value = val; }
    else if (cle === "projet.beatVol") { if (modeFichier()) { if (gainProd) gainProd.gain.value = val / 100; } else { try { player.setVolume(val); VOL = val; } catch (e) {} } }
    else if (cle === "projet.decal") sale = true;
    else if (p) { p.preset = p.preset && cle.startsWith("fx.") ? "perso" : p.preset; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif());
      if (cle.startsWith("fx.")) { const k = cle.split(".")[1], r = corps.querySelector(`[data-resume="${k}"]`); if (r) r.textContent = resume(k, p.fx[k]); }
      if (cle === "piste.vol") { const r = grilleEl.querySelector(`[data-vol="${p.id}"]`); if (r) r.value = Math.round(val * 100); } }
    sauver();
  }
  function panneauBrut(){
    if (!P) return;
    const p = pisteCible(), k = regionSel(), i = P.pistes.indexOf(p);
    pan.style.setProperty("--pc", COULEURS[i % COULEURS.length]);
    $("dawOngletPiste").textContent = `${p.nom} · effets`;
    pan.querySelectorAll("[data-onglet]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.onglet === onglet)));
    corps.classList.toggle("rack", onglet === "piste");
    if (onglet === "piste") {
      const presets = Object.entries(PRESETS).map(([c, x]) => `<option value="${c}"${p.preset === c ? " selected" : ""}>${esc(x.nom)}</option>`).join("")
        + (p.preset === "perso" ? '<option value="perso" selected>Réglages perso</option>' : "");
      corps.innerHTML = `
        <div class="dp-bloc" style="width:200px">
          <h4>Piste</h4>
          <label class="champ">Nom<input type="text" id="dpNom" value="${esc(p.nom)}" maxlength="24"></label>
          <label class="champ">Préréglage<select id="dpPreset">${presets}</select></label>
          <div class="ligne">${bouton("piste.vol", "Volume", 0, 1.5, .01, "x", p.vol, 1)}${bouton("piste.pan", "Panoramique", -1, 1, .01, "pan", p.pan, 0)}</div>
          ${P.pistes.length > 1 ? '<button class="dp-act danger" id="dpSupprPiste">Supprimer la piste</button>' : ""}
        </div>
        <div class="rk" role="list">${FX.map(f => { const v = p.fx[f.k]; return `
          <div class="rk-case${v.on ? " on" : ""}${fxOuvert === f.k ? " ouvert" : ""}" role="listitem" data-ouvrir="${f.k}">
            <button class="fx-on" data-fxon="${f.k}" aria-pressed="${v.on}" aria-label="Activer ${esc(f.nom)}"></button>
            <span class="txt"><b>${esc(f.nom)}</b><small data-resume="${f.k}">${esc(resume(f.k, v))}</small></span>
          </div>`; }).join("")}</div>
        ${(() => { const f = FX.find(x => x.k === fxOuvert), v = p.fx[f.k]; return `
        <section class="fxc detail${v.on ? " on" : ""}" data-fx="${f.k}">
          <header><span class="fx-titre"><button class="fx-on" data-fxon="${f.k}" aria-pressed="${v.on}" aria-label="Activer ${esc(f.nom)}"></button><b>${esc(f.nom)}</b><span class="plug-modele" translate="no">${esc(f.modele || "")}</span></span>
            ${f.types ? `<select data-fxtype="${f.k}">${f.types.map(([c, n]) => `<option value="${c}"${v.type === c ? " selected" : ""}>${n}</option>`).join("")}</select>` : ""}
            ${f.divisions ? `<select data-fxdiv="${f.k}" title="Durée de l'écho, calée sur le tempo">${f.divisions.map(([c, n]) => `<option value="${c}"${v.division === c ? " selected" : ""}>${n}</option>`).join("")}</select>` : ""}
          </header>
          ${f.menus ? `<div class="fx-menus">${f.menus.filter(([, , , si]) => !si || v.type === si).map(([c, n, opts]) => `<label>${esc(n)}<select data-fxmenu="${f.k}.${c}"${c === "tonique" ? ' translate="no"' : ""}>${opts.map(([o, l]) => `<option value="${o}"${String(v[c]) === o ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`).join("")}</div>` : ""}
          <div class="plug-vis${f.k === "autotune" ? " at" : ""}" data-vis="${f.k}"><canvas></canvas>${f.k === "autotune" ? `<div class="at-lecture"><b data-at-note>—</b><span class="at-cents"><i data-at-aig></i></span><small data-at-ct>Lance la lecture</small></div>` : ""}</div>
          ${f.k === "autotune" ? clavierHTML(v) : ""}
          <div class="fx-boutons">${f.p.map(([c, n, min, max, pas, u, d]) => bouton(`fx.${f.k}.${c}`, n, min, max, pas, u, v[c], d)).join("")}</div>
          ${(f.cases || []).map(([c, n]) => `<label class="fx-case"><input type="checkbox" data-fxcase="${f.k}.${c}"${v[c] !== false ? " checked" : ""}>${n}</label>`).join("")}
          <p class="fx-aide">${AIDE[f.k]}</p>
        </section>`; })()}`;
      $("dpNom").addEventListener("change", e => { memoriser(); p.nom = e.target.value.trim() || p.nom; dessiner(); panneau(); sauver(); });
      $("dpPreset").addEventListener("change", e => { if (e.target.value === "perso") return; memoriser(); appliquerPreset(p, e.target.value); const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); dessiner(); panneau(); sauver(); message(`Préréglage « ${PRESETS[e.target.value].nom} »`); });
      if ($("dpSupprPiste")) $("dpSupprPiste").onclick = () => {
        if (!confirm(`Supprimer la piste « ${p.nom} » et ses régions ?`)) return;
        memoriser(); P.clips = P.clips.filter(x => x.piste !== p.id); P.pistes = P.pistes.filter(x => x !== p); sel = null;
        construireNoeuds(); dessiner(); panneau(); modifie();
      };
    } else if (onglet === "region") {
      corps.innerHTML = k ? `
        <div class="dp-bloc">
          <h4>Région</h4>
          <p class="dp-aide">${fmt(k.start)} → ${fmt(k.start + k.dur)} · ${k.dur.toFixed(2)} s, sur « ${esc((P.pistes.find(x => x.id === k.piste) || {}).nom || "")} »</p>
          <div class="ligne">${bouton("region.gain", "Volume", 0, 2, .01, "x", k.gain, 1)}${bouton("region.fadeIn", "Fondu entrée", 0, 3, .01, "s", k.fadeIn, .01)}${bouton("region.fadeOut", "Fondu sortie", 0, 3, .01, "s", k.fadeOut, .02)}</div>
        </div>
        <div class="dp-bloc">
          <h4>Actions</h4>
          <div class="ligne"><button class="dp-act" data-act="couper">Couper au curseur</button><button class="dp-act" data-act="dupliquer">Dupliquer</button><button class="dp-act" data-act="normaliser">Normaliser</button></div>
          <div class="ligne"><button class="dp-act danger" data-act="supprimer">Supprimer</button></div>
        </div>` : `<div class="dp-bloc"><h4>Région</h4><p class="dp-aide">Touche une région dans la timeline pour régler son volume et ses fondus. Tire ses bords pour la rogner, les points blancs pour les fondus.</p></div>`;
    } else {
      corps.innerHTML = `
        <div class="dp-bloc" style="width:230px">
          <h4>Projet</h4>
          <label class="champ">Nom<input type="text" id="dpNomProjet" value="${esc(titreProjet())}" maxlength="60"></label>
          <button class="dp-act danger" data-act="supprProjet">Supprimer le projet</button>
        </div>
        <div class="dp-bloc">
          <h4>Mix</h4>
          <div class="ligne">${bouton("projet.master", "Volume général", 0, 1.5, .01, "x", P.master != null ? P.master : 1, 1)}${bouton("projet.beatVol", "Volume prod", 0, 100, 1, "%", volBeat(), 100)}${bouton("projet.decal", "Décalage voix", -400, 400, 5, "ms", P.decal || 0, 0)}</div>
        </div>
        <div class="dp-bloc" style="width:250px">
          <h4>Prod</h4>
          ${fichier ? `<p class="dp-aide">Prod importée : <b>${esc(fichier.nom)}</b>. Fais glisser sa région pour la caler.</p><button class="dp-act danger" data-act="retirer">Revenir à la version YouTube</button>`
            : `<p class="dp-aide">${estLibre() ? "Aucune prod pour l'instant." : "Le son vient du lecteur YouTube."} Importe le fichier de la prod pour une synchro parfaite et un export avec la prod.</p><label class="dp-act" style="display:inline-grid;place-items:center;cursor:pointer">↥ Importer ma prod<input type="file" data-act="import" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.aif,.aiff" hidden></label>`}
          ${estLibre() ? `<label class="champ">Tempo<input type="text" id="dpBpm" inputmode="numeric" value="${bpm()}"></label>` : ""}
        </div>
        <div class="dp-bloc" style="width:300px">
          <h4>Raccourcis</h4>
          <p class="dp-aide"><b>Espace</b> lecture · <b>R</b> enregistrer · <b>S</b> couper · <b>D</b> dupliquer · <b>Suppr</b> supprimer · <b>⌘Z</b> annuler · <b>←/→</b> un temps (Maj : une mesure) · <b>Entrée</b> début</p>
        </div>`;
      $("dpNomProjet").addEventListener("change", e => { const v = e.target.value.trim(); if (!v || v === titreParDefaut()) delete P.nom; else P.nom = v; peindreTitre(); sauverNom(); message("Projet renommé"); });
      if ($("dpBpm")) $("dpBpm").addEventListener("change", e => { const v = Math.round(+e.target.value); if (v >= 50 && v <= 220) { P.bpm = v; reglerTout(); sauver(); dessiner(); entete(); } else e.target.value = bpm(); });
    }
  }
  // chaque rendu du panneau remet a jour les curseurs et relance l'ecran du plug-in ouvert
  const panneau = () => { panneauBrut(); remplirCurseurs(pan); setTimeout(visualiser, 0); };
  const inspecteur = panneau;

  /* ─────────── facades des plug-ins : un ecran par effet ─────────── */
  // clavier d'une octave : touches blanches puis noires posees par-dessus
  function clavierHTML(a){
    const cl = clavierDe(a), noires = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }, blanches = [0, 2, 4, 5, 7, 9, 11];
    const etat = c => c === "1" ? "visee" : c === "b" ? "libre" : "retiree";
    return `<div class="at-clavier" translate="no">
      ${blanches.map(i => `<button class="tb ${etat(cl.touches[i])}" data-touche="${i}" title="${NOTES[i]}"><span>${NOTES[i]}</span></button>`).join("")}
      ${Object.entries(noires).map(([i, apres]) => `<button class="tn ${etat(cl.touches[+i])}" data-touche="${i}" style="left:calc(${(+apres + 1) * (100 / 7)}% - 3.4%)" title="${NOTES[+i]}"></button>`).join("")}
    </div><p class="at-legende"><i class="visee"></i>Visée <i class="libre"></i>Libre (non corrigée) <i class="retiree"></i>Retirée · clic pour changer</p>`;
  }
  // reponse en frequence de filtres de la Web Audio API, sur 20 Hz - 20 kHz
  const FREQS = new Float32Array(240).map((_, i) => 20 * Math.pow(1000, i / 239));
  const filtreAffiche = (type, f, q, g) => { const c = audio(), b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = g; return b; };
  function reponse(filtres){
    const db = new Float32Array(FREQS.length), mag = new Float32Array(FREQS.length), ph = new Float32Array(FREQS.length);
    filtres.forEach(b => { b.getFrequencyResponse(FREQS, mag, ph); for (let i = 0; i < db.length; i++) db[i] += 20 * Math.log10(Math.max(1e-6, mag[i])); });
    return db;
  }
  const xFreq = (f, W) => Math.log(f / 20) / Math.log(1000) * W;
  function grilleFreq(g, W, H, dbMax){
    g.strokeStyle = "rgba(255,255,255,.06)"; g.lineWidth = 1; g.fillStyle = "rgba(255,255,255,.32)"; g.font = "9px ui-monospace,Menlo,monospace";
    [50, 100, 200, 500, 1000, 2000, 5000, 10000].forEach(f => { const x = Math.round(xFreq(f, W)) + .5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); g.fillText(f >= 1000 ? f / 1000 + "k" : f, x + 3, H - 4); });
    for (let d = -dbMax; d <= dbMax; d += dbMax / 2) { const y = Math.round(H / 2 - d / dbMax * (H / 2 - 8)) + .5; g.strokeStyle = d ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.16)"; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); if (d) g.fillText((d > 0 ? "+" : "") + d, 3, y - 3); }
  }
  function courbeFreq(g, W, H, db, dbMax, coul){
    const y = d => H / 2 - Math.max(-dbMax * 1.1, Math.min(dbMax * 1.1, d)) / dbMax * (H / 2 - 8);
    g.beginPath(); db.forEach((d, i) => { const x = i / (db.length - 1) * W; i ? g.lineTo(x, y(d)) : g.moveTo(x, y(d)); });
    g.strokeStyle = coul; g.lineWidth = 2; g.stroke();
    g.lineTo(W, H / 2); g.lineTo(0, H / 2); g.closePath(); g.fillStyle = coul.replace("rgb(", "rgba(").replace(")", ",.14)"); g.fill();
  }
  let visuRAF = 0, eqPoints = [], eqDrag = null;
  function visualiser(){
    cancelAnimationFrame(visuRAF);
    const boite = pan.querySelector(".plug-vis"); if (!boite || !ouvert || pan.classList.contains("ferme")) return;
    const cv = boite.querySelector("canvas"), k = boite.dataset.vis, p = pisteCible(), f = p.fx[k], n = noeuds.get(p.id);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const facade = boite.closest(".fxc"), coul = teinte(getComputedStyle(facade).getPropertyValue("--vis").trim() || getComputedStyle(pan).getPropertyValue("--pc").trim(), 0), on = f.on;
    g.globalAlpha = on ? 1 : .45;
    if (k === "eq" || k === "hpf" || k === "filtre") {
      const dbMax = k === "eq" ? 15 : 24; grilleFreq(g, W, H, dbMax);
      let filtres;
      if (k === "eq") filtres = [filtreAffiche("lowshelf", f.basF, 1, f.bas), filtreAffiche("peaking", f.midF, f.midQ, f.mid), filtreAffiche("highshelf", f.hautF, 1, f.haut)];
      else if (k === "hpf") filtres = [filtreAffiche("highpass", f.freq, .707, 0)];
      else { const t = f.type; filtres = [filtreAffiche(t === "pb" ? "lowpass" : t === "ph" ? "highpass" : "bandpass", t === "radio" ? Math.min(f.freq, 2500) : f.freq, t === "radio" ? Math.max(.5, f.q * .6) : f.q, 0)]; }
      const db = reponse(filtres); courbeFreq(g, W, H, db, dbMax, coul);
      if (k === "eq") {   // les trois points a faire glisser
        eqPoints = [["bas", "basF", f.basF], ["mid", "midF", f.midF], ["haut", "hautF", f.hautF]].map(([gk, fk, fr], i) => {
          const x = xFreq(fr, W), d = reponse([filtres[i]])[Math.round(Math.log(fr / 20) / Math.log(1000) * 239)] || 0, y = H / 2 - d / dbMax * (H / 2 - 8);
          g.beginPath(); g.arc(x, y, eqDrag && eqDrag.i === i ? 8 : 6, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2; g.strokeStyle = coul; g.stroke();
          g.fillStyle = "#111"; g.font = "bold 8px system-ui"; g.fillText(i + 1, x - 2.5, y + 3);
          return { i, gk, fk, x, y };
        });
      }
    } else if (k === "comp") {
      const m = 10, Wg = H - 2 * m, x0 = m, y0 = m;
      const sortie = e => { const s = f.seuil, r = f.ratio, kn = 6; let o; if (e < s - kn / 2) o = e; else if (e > s + kn / 2) o = s + (e - s) / r; else { const z = e - s + kn / 2; o = e + (1 / r - 1) * z * z / (2 * kn); } return o + f.gain; };
      g.strokeStyle = "rgba(255,255,255,.07)"; for (let d = -60; d <= 0; d += 12) { const p1 = x0 + (d + 60) / 60 * Wg, p2 = y0 + (1 - (d + 60) / 60) * Wg; g.beginPath(); g.moveTo(p1, y0); g.lineTo(p1, y0 + Wg); g.moveTo(x0, p2); g.lineTo(x0 + Wg, p2); g.stroke(); }
      g.strokeStyle = "rgba(255,255,255,.18)"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x0, y0 + Wg); g.lineTo(x0 + Wg, y0); g.stroke(); g.setLineDash([]);
      g.beginPath(); for (let e = -60; e <= 0; e += .5) { const o = Math.max(-60, Math.min(6, sortie(e))), px = x0 + (e + 60) / 60 * Wg, py = y0 + (1 - (o + 60) / 60) * Wg; e > -60 ? g.lineTo(px, py) : g.moveTo(px, py); } g.strokeStyle = coul; g.lineWidth = 2; g.stroke();
      const sx = x0 + (f.seuil + 60) / 60 * Wg; g.fillStyle = "rgba(255,255,255,.4)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText("seuil " + f.seuil + " dB", Math.min(sx + 4, x0 + Wg - 70), y0 + Wg - 6);
      // VU-metre analogique : la reduction de gain, aiguille avec son inertie
      const gr = n && n.comp ? Math.max(0, -n.comp.reduction) : 0;
      n && (n.vu = (n.vu || 0) + (gr - (n.vu || 0)) * .25);
      const vh = H - 2 * m, vw = Math.min(W - H - 32, vh * 2.1), vx = W - vw - 10, R = vh * .95, cx = vx + vw / 2, cy = m + vh * 1.06;
      const face = g.createLinearGradient(0, m, 0, m + vh); face.addColorStop(0, "#FFF4D6"); face.addColorStop(1, "#E9D8AE");
      g.fillStyle = face; g.beginPath(); g.roundRect ? g.roundRect(vx, m, vw, vh, 4) : g.rect(vx, m, vw, vh); g.fill();
      const lueur = g.createRadialGradient(cx, m + vh * .45, 4, cx, m + vh * .45, vw * .6); lueur.addColorStop(0, "rgba(255,190,90,.35)"); lueur.addColorStop(1, "rgba(255,190,90,0)"); g.fillStyle = lueur; g.fillRect(vx, m, vw, vh);
      // echelle de VU : 20 dB a gauche, 0 a droite, les petites valeurs etalees
      const ang = d => Math.PI * 1.5 - .87 + (1 - Math.log10(1 + Math.min(20, d)) / Math.log10(21)) * 1.74;
      g.strokeStyle = "#2A2017"; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, R, ang(20), ang(0)); g.stroke();
      g.fillStyle = "#2A2017"; g.font = "bold 8px system-ui"; g.textAlign = "center";
      [20, 10, 7, 5, 3, 2, 1, 0].forEach(d => { const a2 = ang(d), x1 = cx + Math.cos(a2) * R, y1 = cy + Math.sin(a2) * R, x2 = cx + Math.cos(a2) * (R - 7), y2 = cy + Math.sin(a2) * (R - 7);
        g.strokeStyle = d <= 3 && d > 0 ? "#B8352A" : "#2A2017"; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.fillText(d, cx + Math.cos(a2) * (R - 15), cy + Math.sin(a2) * (R - 15) + 3); });
      g.font = "bold 7px system-ui"; g.fillText("GAIN REDUCTION", cx, m + vh - 8); g.textAlign = "left";
      const an = ang(n ? n.vu : 0); g.strokeStyle = "#1A1410"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * (R + 2), cy + Math.sin(an) * (R + 2)); g.stroke();
      g.fillStyle = "rgba(255,255,255,.45)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText(`${f.ratio}:1`, m + 4, m + 12);
    } else if (k === "sat") {
      const c = courbe(f.drive), mix = f.mix / 100, gain = 1 + f.drive / 100 * .6, m = 10, L = H - 2 * m;
      g.strokeStyle = "rgba(255,255,255,.07)"; g.strokeRect(m + .5, m + .5, L, L);
      g.strokeStyle = "rgba(255,255,255,.18)"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(m, m + L); g.lineTo(m + L, m); g.stroke(); g.setLineDash([]);
      g.beginPath(); for (let i = 0; i <= 200; i++) { const x = i / 200 * 2 - 1, y = (1 - mix) * x + mix * gain * c[Math.round((x + 1) / 2 * (c.length - 1))]; const px = m + (x + 1) / 2 * L, py = m + (1 - (Math.max(-1.2, Math.min(1.2, y)) + 1) / 2) * L; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.strokeStyle = coul; g.lineWidth = 2; g.stroke();
      // harmoniques generees : une sinusoide passee dans la courbe, son spectre grossier
      const N2 = 256, sig = new Float32Array(N2); for (let i = 0; i < N2; i++) { const x = .8 * Math.sin(2 * Math.PI * 4 * i / N2); sig[i] = (1 - mix) * x + mix * gain * c[Math.round((x + 1) / 2 * (c.length - 1))]; }
      const bx = L + 3 * m, bw = (W - bx - m - 50) / 8;
      for (let h = 1; h <= 8; h++) { let re = 0, im = 0; for (let i = 0; i < N2; i++) { re += sig[i] * Math.cos(2 * Math.PI * 4 * h * i / N2); im += sig[i] * Math.sin(2 * Math.PI * 4 * h * i / N2); }
        const a = Math.sqrt(re * re + im * im) / (N2 / 2), d = Math.max(0, 1 + 20 * Math.log10(Math.max(1e-5, a)) / 60), hh = d * (H - 2 * m - 12);
        g.fillStyle = h === 1 ? "rgba(255,255,255,.35)" : coul; g.fillRect(bx + (h - 1) * bw + 3, H - m - 12 - hh, bw - 6, hh);
        g.fillStyle = "rgba(255,255,255,.4)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText("H" + h, bx + (h - 1) * bw + 4, H - 4); }
      // la lampe : son filament rougeoie avec la chaleur, et vacille a peine
      const tx = W - 34, ty = 14, tw = 24, th = H - 34, ch = (.25 + f.drive / 100 * .75) * (f.on ? 1 : .3) * (.94 + .06 * Math.sin(performance.now() / 90));
      const verre = g.createLinearGradient(tx, 0, tx + tw, 0); verre.addColorStop(0, "rgba(255,255,255,.16)"); verre.addColorStop(.5, "rgba(255,255,255,.03)"); verre.addColorStop(1, "rgba(255,255,255,.12)");
      const halo = g.createRadialGradient(tx + tw / 2, ty + th * .55, 2, tx + tw / 2, ty + th * .55, 34); halo.addColorStop(0, `rgba(255,140,40,${.75 * ch})`); halo.addColorStop(1, "rgba(255,120,30,0)");
      g.fillStyle = halo; g.fillRect(tx - 30, ty - 10, tw + 60, th + 20);
      g.fillStyle = verre; g.beginPath(); g.moveTo(tx, ty + 10); g.quadraticCurveTo(tx, ty, tx + tw / 2, ty); g.quadraticCurveTo(tx + tw, ty, tx + tw, ty + 10); g.lineTo(tx + tw, ty + th); g.lineTo(tx, ty + th); g.closePath(); g.fill();
      g.strokeStyle = `rgba(255,${150 + 60 * ch},80,${.5 + .5 * ch})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tx + 8, ty + th * .75); g.lineTo(tx + 8, ty + th * .35); g.lineTo(tx + 16, ty + th * .35); g.lineTo(tx + 16, ty + th * .75); g.stroke();
      g.fillStyle = "#3A3A3A"; g.fillRect(tx - 2, ty + th, tw + 4, 8);
    } else if (k === "chorus") {
      const t = performance.now() / 1000, cx = W / 2, cy = H - 14, R = H - 30;
      g.strokeStyle = "rgba(255,255,255,.08)"; [1, .66, .33].forEach(r => { g.beginPath(); g.arc(cx, cy, R * r, Math.PI, 2 * Math.PI); g.stroke(); });
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - R); g.stroke();
      g.fillStyle = "rgba(255,255,255,.4)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText("L", cx - R - 10, cy); g.fillText("R", cx + R + 4, cy);
      const larg = .35 + .55 * f.mix / 100, mod = f.profondeur / 100 * .12;
      [[-1, 0], [1, Math.PI / 2]].forEach(([cote, ph]) => { const a = Math.PI / 2 - cote * (larg + mod * Math.sin(2 * Math.PI * f.vitesse * t + ph)) * Math.PI / 2;
        const x = cx + Math.cos(a) * R * .8, y = cy - Math.sin(a) * R * .8; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fillStyle = coul; g.fill(); });
      g.beginPath(); g.arc(cx, cy - R * .8, 9, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill();
      g.fillStyle = "rgba(255,255,255,.4)"; g.fillText("voix", cx - 10, cy - R * .8 - 14);
    } else if (k === "reverb") {
      const total = f.predelay / 1000 + f.taille * 1.1, x = s => 10 + s / total * (W - 20), m = 10, Hh = H - 2 * m - 10;
      g.strokeStyle = "rgba(255,255,255,.06)"; g.fillStyle = "rgba(255,255,255,.35)"; g.font = "9px ui-monospace,Menlo,monospace";
      for (let s = 0; s <= total; s += total > 3 ? 1 : .5) { const px = Math.round(x(s)) + .5; g.beginPath(); g.moveTo(px, m); g.lineTo(px, H - m); g.stroke(); g.fillText(s.toFixed(1) + " s", px + 3, H - 3); }
      g.fillStyle = "#fff"; g.fillRect(x(0) - 1, m, 2, Hh);   // le son direct
      const pd = f.predelay / 1000; [7, 13, 21, 30, 39, 51].forEach((ms, j) => { const hh = Hh * .55 * Math.pow(.78, j); g.fillStyle = coul; g.fillRect(x(pd + ms / 1000) - 1, m + Hh - hh, 2, hh); });
      const grad = g.createLinearGradient(x(pd), 0, x(pd + f.taille), 0); grad.addColorStop(0, coul.replace("rgb(", "rgba(").replace(")", ",.55)")); grad.addColorStop(1, coul.replace("rgb(", "rgba(").replace(")", "," + (.1 + f.amorti / 14000 * .3) + ")"));
      g.beginPath(); g.moveTo(x(pd), m + Hh); for (let s = 0; s <= f.taille * 1.1; s += f.taille / 80) { const db = -60 * s / f.taille, hh = Math.max(0, (1 + db / 60)) * Hh * .7; g.lineTo(x(pd + s), m + Hh - hh); } g.lineTo(x(pd + f.taille * 1.1), m + Hh); g.closePath(); g.fillStyle = grad; g.fill();
      g.fillStyle = "rgba(255,255,255,.5)"; g.fillText(`pré-délai ${f.predelay} ms · RT60 ${(+f.taille).toFixed(1)} s · niveau ${f.mix} %`, 12, 16);
    } else if (k === "delay") {
      const t = Math.min(2.4, DIVISION[f.delay ? f.delay.division : f.division] * 60 / bpm()), nb = 10, total = t * nb, x = s => 12 + s / total * (W - 24), mid = H / 2;
      g.strokeStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.moveTo(0, mid + .5); g.lineTo(W, mid + .5); g.stroke();
      g.fillStyle = "rgba(255,255,255,.35)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText("L", 2, 12); g.fillText("R", 2, H - 4);
      g.fillStyle = "#fff"; g.fillRect(x(0) - 1.5, mid - (H / 2 - 12), 3, (H - 24));
      for (let i = 1; i <= nb; i++) { const a = Math.pow(f.retour / 100, i - 1) * (.35 + f.mix / 100 * .65), hh = a * (H / 2 - 14), haut = !f.pingpong || i % 2 === 1;
        const sombre = Math.pow(f.filtre / 10000, i * .35); g.fillStyle = coul.replace("rgb(", "rgba(").replace(")", "," + (.25 + .75 * sombre) + ")");
        const px = x(i * t) - 2; if (f.pingpong) g.fillRect(px, haut ? mid - hh : mid, 4, hh); else g.fillRect(px, mid - hh, 4, hh * 2); }
      // les deux bobines de la bande, en haut a droite, tournent au tempo
      const rot = performance.now() / 1000 * bpm() / 60 * Math.PI * .5;
      [[W - 70, 26], [W - 28, 26]].forEach(([rx, ry], j) => { g.save(); g.translate(rx, ry); g.rotate(rot * (j ? 1.15 : 1)); g.strokeStyle = "rgba(255,230,190,.55)"; g.lineWidth = 1.5;
        g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.stroke();
        for (let r2 = 0; r2 < 3; r2++) { const a2 = r2 * Math.PI * 2 / 3; g.beginPath(); g.moveTo(Math.cos(a2) * 5, Math.sin(a2) * 5); g.lineTo(Math.cos(a2) * 13, Math.sin(a2) * 13); g.stroke(); } g.restore(); });
      g.strokeStyle = "rgba(255,230,190,.35)"; g.beginPath(); g.moveTo(W - 70, 41); g.lineTo(W - 28, 41); g.stroke();
      g.fillStyle = "rgba(255,255,255,.5)"; g.fillText(`${(t * 1000).toFixed(0)} ms (${(FX.find(z => z.k === "delay").divisions.find(d => d[0] === f.division) || [, ""])[1]} à ${bpm()} BPM)`, 18, 12);
    } else if (k === "autotune") {
      const h = (n && n.atHist) || [], cl = clavierDe(f);
      const vus = h.filter(e => e.m > 0).map(e => e.m), centre = vus.length ? vus.slice(-60).sort((a, b) => a - b)[Math.floor(Math.min(60, vus.length) / 2)] : 57, plage = 7;
      const y = m => H / 2 - (m - centre) / plage * (H / 2 - 6), Wg = W;
      g.font = "9px ui-monospace,Menlo,monospace";
      for (let m = Math.floor(centre - plage); m <= Math.ceil(centre + plage); m++) { const nn = ((m % 12) + 12) % 12, yy = Math.round(y(m)) + .5;
        const vise = cl.touches[nn] === "1", libre = cl.touches[nn] === "b";
        g.strokeStyle = vise ? "rgba(255,255,255,.14)" : libre ? "rgba(245,165,36,.25)" : "rgba(255,255,255,.035)"; g.setLineDash(libre ? [4, 4] : []);
        g.beginPath(); g.moveTo(26, yy); g.lineTo(Wg, yy); g.stroke(); g.setLineDash([]);
        if (vise || libre) { g.fillStyle = vise ? "rgba(255,255,255,.4)" : "rgba(245,165,36,.6)"; g.fillText(NOTES_EN[nn] + (Math.floor(m / 12) - 1), 2, yy + 3); } }
      const pas = (Wg - 26) / 260, trace = (cle, couleur, larg) => { g.beginPath(); let en = false; h.forEach((e, i) => { const v = cle(e); const px = 26 + (260 - h.length + i) * pas; if (v > 0) { en ? g.lineTo(px, y(v)) : g.moveTo(px, y(v)); en = true; } else en = false; }); g.strokeStyle = couleur; g.lineWidth = larg; g.stroke(); };
      trace(e => e.m, "rgba(255,255,255,.75)", 1.5);                                    // ce qui est chante
      trace(e => e.m > 0 ? e.m + 12 * Math.log2(e.r || 1) : 0, coul, 2.2);               // ce qui sort
      const d = h[h.length - 1], note = boite.querySelector("[data-at-note]"), aig = boite.querySelector("[data-at-aig]"), ct = boite.querySelector("[data-at-ct]");
      if (d && d.m > 0 && d.c) { const nn = ((Math.round(d.c) % 12) + 12) % 12, ec = Math.round((d.m - d.c) * 100);
        note.textContent = NOTES_EN[nn] + (Math.floor(Math.round(d.c) / 12) - 1); aig.style.left = `${50 + Math.max(-50, Math.min(50, ec))}%`; aig.classList.toggle("juste", Math.abs(ec) < 10); ct.textContent = `${ec > 0 ? "+" : ""}${ec} ct`; }
      else if (!h.length) { note.textContent = "—"; ct.textContent = joueStudio() ? "en attente de voix" : "Lance la lecture"; }
    }
    g.globalAlpha = 1;
    visuRAF = requestAnimationFrame(() => setTimeout(visualiser, 33));
  }
  // egaliseur : glisser un point regle sa frequence (horizontal) et son gain (vertical)
  pan.addEventListener("pointerdown", e => {
    const cv = e.target.closest('.plug-vis[data-vis="eq"] canvas'); if (!cv) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const pt = eqPoints.find(q => Math.hypot(q.x - x, q.y - y) < 14); if (!pt) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId); memoriser(); eqDrag = { i: pt.i, gk: pt.gk, fk: pt.fk, cv };
  });
  pan.addEventListener("pointermove", e => {
    if (!eqDrag) return;
    const p = pisteCible(), f = p.fx.eq, r = eqDrag.cv.getBoundingClientRect(), W = r.width, H = r.height;
    const x = clamp(e.clientX - r.left, 0, W), y = clamp(e.clientY - r.top, 0, H);
    const lim = { basF: [60, 500], midF: [300, 5000], hautF: [2000, 14000] }[eqDrag.fk];
    f[eqDrag.fk] = Math.round(clamp(20 * Math.pow(1000, x / W), lim[0], lim[1]));
    f[eqDrag.gk] = Math.round(clamp((H / 2 - y) / (H / 2 - 8) * 15, -15, 15) * 2) / 2;
    if (!f.on) f.on = true;
    p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif());
    // les boutons rotatifs suivent
    [eqDrag.fk, eqDrag.gk].forEach(c => { const kn = pan.querySelector(`.kn[data-cle="fx.eq.${c}"]`); if (kn) { peindreBouton(kn, f[c]); kn.querySelector(".kn-v").textContent = afficher(f[c], kn.dataset.u); } });
    const rs = corps.querySelector('[data-resume="eq"]'); if (rs) rs.textContent = resume("eq", f);
  });
  pan.addEventListener("pointerup", () => { if (eqDrag) { eqDrag = null; sauver(); } });
  pan.addEventListener("click", e => {
    const o = e.target.closest("[data-onglet]"); if (o) { onglet = o.dataset.onglet; pan.classList.remove("ferme"); panneau(); return; }
    if (e.target.closest("#dawReplier")) { pan.classList.toggle("ferme"); return; }
    const ouv = e.target.closest("[data-ouvrir]");
    if (ouv && !e.target.closest("[data-fxon]")) { fxOuvert = ouv.dataset.ouvrir; panneau(); reglerTout(); return; }
    const tch = e.target.closest("[data-touche]");
    if (tch) { const p = pisteCible(), a = p.fx.autotune, cl = clavierDe(a), i = +tch.dataset.touche;
      // visee -> libre -> retiree -> visee
      const suiv = { "1": "b", "b": "0", "0": "1" }[cl.touches[i]];
      memoriser(); a.clavier = cl.touches.slice(0, i) + suiv + cl.touches.slice(i + 1); if (a.type === "prod" || a.type === "chroma") a.type = a.type;
      p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver(); panneau(); return; }
    const on = e.target.closest("[data-fxon]");
    if (on) { const p = pisteCible(), f = p.fx[on.dataset.fxon]; memoriser(); f.on = !f.on; p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); panneau(); dessiner(); sauver(); return; }
    const a = e.target.closest("[data-act]")?.dataset.act;
    if (a === "couper") couper(); else if (a === "dupliquer") dupliquer(); else if (a === "supprimer") supprimer();
    else if (a === "normaliser") normaliser();
    else if (a === "supprProjet") { if (confirm(`Supprimer le projet « ${titreProjet()} » ? Ses prises et la prod importée seront effacées de cet appareil.`)) supprimerProjet(P.prod).then(() => message("Projet supprimé")); }
    else if (a === "retirer") { if (confirm("Retirer ta prod importée et revenir à la version YouTube ?")) retirerFichier(); }
  });
  pan.addEventListener("change", e => {
    const p = pisteCible(), t = e.target;
    if (t.dataset.fxtype || t.dataset.fxdiv) {
      memoriser(); const k = t.dataset.fxtype || t.dataset.fxdiv; p.fx[k][t.dataset.fxtype ? "type" : "division"] = t.value;
      // passer en « Choisir la tonalite » part de celle de la prod quand on la connait
      if (k === "autotune" && t.value === "cle" && !p.fx.autotune.cleChoisie) { const c = lireCle(prod && prod.key); if (c) Object.assign(p.fx.autotune, { tonique: String(c.tonique), gamme: c.gamme }); }
      if (FX.find(f => f.k === k).menus) { p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver(); panneau(); return; }
    }
    else if (t.dataset.fxmenu) { const [k, c] = t.dataset.fxmenu.split("."); memoriser(); p.fx[k][c] = t.value;
      if (c === "tonique" || c === "gamme") { p.fx[k].cleChoisie = true; p.fx[k].clavier = ""; p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver(); panneau(); return; } }
    else if (t.dataset.fxcase) { const [k, c] = t.dataset.fxcase.split("."); memoriser(); p.fx[k][c] = t.checked; }
    else if (t.dataset.act === "import") { importer(t.files[0]); return; }
    else return;
    p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver();
    const k = (t.dataset.fxtype || t.dataset.fxdiv || (t.dataset.fxcase || t.dataset.fxmenu || "").split(".")[0]), r = corps.querySelector(`[data-resume="${k}"]`); if (r) r.textContent = resume(k, p.fx[k]);
  });
  /* tourner un bouton */
  let tour = null;
  pan.addEventListener("pointerdown", e => {
    const kn = e.target.closest(".kn"); if (!kn) return;
    e.preventDefault(); kn.focus();
    tour = { kn, y0: e.clientY, x0: versPos(+kn.dataset.val, +kn.dataset.min, +kn.dataset.max, kn.dataset.u), memo: false };
    try { kn.setPointerCapture(e.pointerId); } catch (_) {}
  });
  const fixer = (kn, val) => {
    const pas = +kn.dataset.pas, min = +kn.dataset.min, max = +kn.dataset.max;
    val = clamp(Math.round(val / pas) * pas, min, max); val = +val.toFixed(4);
    if (val === +kn.dataset.val) return;
    peindreBouton(kn, val); appliquer(kn.dataset.cle, val);
  };
  pan.addEventListener("pointermove", e => {
    if (!tour) return;
    const d = (tour.y0 - e.clientY) / (e.shiftKey ? 600 : 160);
    if (!tour.memo && Math.abs(tour.y0 - e.clientY) > 1) { memoriser(); tour.memo = true; }
    const k = tour.kn; fixer(k, versVal(clamp(tour.x0 + d, 0, 1), +k.dataset.min, +k.dataset.max, k.dataset.u));
  });
  pan.addEventListener("pointerup", () => { if (tour && tour.memo && tour.kn.dataset.cle.startsWith("fx.")) dessiner(); tour = null; });
  pan.addEventListener("dblclick", e => { const kn = e.target.closest(".kn"); if (!kn) return; memoriser(); fixer(kn, +kn.dataset.def); });
  pan.addEventListener("wheel", e => {
    const kn = e.target.closest(".kn"); if (!kn) return; e.preventDefault();
    const x = versPos(+kn.dataset.val, +kn.dataset.min, +kn.dataset.max, kn.dataset.u) + (e.deltaY < 0 ? .02 : -.02);
    fixer(kn, versVal(clamp(x, 0, 1), +kn.dataset.min, +kn.dataset.max, kn.dataset.u)); sauver();
  }, { passive: false });
  pan.addEventListener("keydown", e => {
    const kn = e.target.closest(".kn"); if (!kn) return;
    const sens = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]; if (!sens) return;
    e.preventDefault(); e.stopPropagation();
    const x = versPos(+kn.dataset.val, +kn.dataset.min, +kn.dataset.max, kn.dataset.u) + sens * (e.shiftKey ? .005 : .03);
    fixer(kn, versVal(clamp(x, 0, 1), +kn.dataset.min, +kn.dataset.max, kn.dataset.u));
  });
  function entete(){
    $("dawBpm").textContent = `${bpm()}`;
    $("dawCle").textContent = prod && prod.key && !estLibre() ? `${prod.keySur ? "" : "~"}${prod.key}` : "—";
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
  function dupliquer(){
    const k = regionSel(); if (!k) return;
    memoriser();
    const k2 = { ...k, id: nid(), start: k.start + k.dur };
    P.clips.push(k2); sel = { type: "clip", id: k2.id };
    dessiner(); panneau(); modifie(); message("Région dupliquée à la suite");
  }
  /* le pic de la region porte a -1 dB */
  function normaliser(){
    const k = regionSel(), buf = k && BUF.get(k.prise); if (!buf) return;
    let m = 0; const a = Math.floor(k.offset * buf.sampleRate), b = Math.min(buf.length, Math.floor((k.offset + k.dur) * buf.sampleRate));
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = a; i < b; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > m) m = v; } }
    if (!m) return;
    memoriser(); k.gain = +Math.min(2, .891 / m).toFixed(3);
    dessiner(); panneau(); modifie(); message(`Normalisée : volume ${Math.round(k.gain * 100)} %`);
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
    if (tete && !e.target.closest("button,input")) { sel = { type: "piste", id: tete.dataset.tete }; onglet = "piste"; dessiner(); inspecteur(); outils(); return; }
    const bf = e.target.closest("#dawBlocFichier");
    if (bf) { e.preventDefault(); geste = { mode: "prod", n: bf, x0: e.clientX, y0: e.clientY, orig: P.beatStart || 0, avant: instantane(), bouge: false }; bf.setPointerCapture(e.pointerId); return; }
    const n = e.target.closest(".clip[data-clip]");
    if (n) {
      e.preventDefault();
      const k = P.clips.find(x => x.id === n.dataset.clip);
      if (!(sel && sel.id === k.id)) { const autrePiste = pisteCible().id !== k.piste; sel = { type: "clip", id: k.id }; onglet = onglet === "projet" ? "region" : onglet; grilleEl.querySelectorAll(".clip.sel").forEach(x => x.classList.remove("sel")); n.classList.add("sel"); if (autrePiste) dessiner(); inspecteur(); outils(); }
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
    const fxb = e.target.closest("[data-fxpiste]");
    if (fxb) { sel = { type: "piste", id: fxb.dataset.fxpiste }; onglet = "piste"; pan.classList.remove("ferme"); dessiner(); panneau(); outils(); return; }
    if (e.target.closest("#dawAjout")) ajouterPiste();
    if (e.target.closest("#dawRetirer")) { if (confirm("Retirer ta prod importée et revenir à la version YouTube ?")) retirerFichier(); }
  });
  zone.addEventListener("change", e => { if (e.target.id === "dawFichier") importer(e.target.files[0]); });
  // on peut aussi deposer le fichier directement sur le studio
  el.addEventListener("dragover", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault(); });
  el.addEventListener("drop", e => { const f = e.dataTransfer?.files?.[0]; if (f) { e.preventDefault(); importer(f); } });
  // chaque curseur du studio (volumes, zoom) garde sa partie remplie a jour
  el.addEventListener("input", e => { if (e.target.matches('input[type=range]')) remplirCurseurs(e.target.parentElement); }, true);
  zone.addEventListener("input", e => {
    const v = e.target.closest("[data-vol]");
    if (v) { const p = P.pistes.find(x => x.id === v.dataset.vol); p.vol = v.value / 100; reglerTout(); sauver(); const kn = corps.querySelector('[data-cle="piste.vol"]'); if (kn && pisteCible() === p) peindreBouton(kn, p.vol); }
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
    (function niv(){ if (!rec) { $("dawNiv").style.transform = "scaleY(0)"; return; } an.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x;
      $("dawNiv").style.transform = `scaleY(${clamp((20 * Math.log10(Math.sqrt(s / d.length) + 1e-6) + 60) / 60, 0, 1).toFixed(3)})`; requestAnimationFrame(niv); })();
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
    signalerProjets();
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
      if (P.pistes.some(p => p.fx.autotune && p.fx.autotune.on)) await chargerAT(oc);
      b.master.gain.value = P.master != null ? P.master : 1;
      if (avecProd) {
        const gp = oc.createGain(); gp.gain.value = volBeat() / 100; gp.connect(b.master);
        const s = oc.createBufferSource(); s.buffer = fichier.buf; s.connect(gp);
        const debut = P.beatStart || 0; s.start(Math.max(0, debut), Math.max(0, -debut));
      }
      const ns = new Map(P.pistes.map(p => { const n = chaine(oc, b); regler(n, p, solo); return [p.id, n]; }));
      for (const k of P.clips) {
        const n = ns.get(k.piste), buf = BUF.get(k.prise), pi = P.pistes.find(x => x.id === k.piste); if (!n || !buf) continue;
        const debut = k.start - dec - (pi ? avanceAT(pi) : 0), dans = Math.max(0, -debut), when = Math.max(0, debut);
        if (dans >= k.dur) continue;
        const s = oc.createBufferSource(); s.buffer = buf;
        const g = oc.createGain(); s.connect(g); g.connect(n.entree);
        enveloppe(g.gain, k, when, dans);
        s.start(when, k.offset + dans, k.dur - dans);
      }
      const rendu = await oc.startRendering();
      ns.forEach(n => { try { n.osc.stop(); } catch (e) {} });
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
  // plein ecran : le studio seul, sur tout l'ecran (la prod YouTube continue de jouer derriere)
  const pleinEcran = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.().catch(() => message("Plein écran indisponible ici")); };
  $("dawPlein").onclick = pleinEcran;
  document.addEventListener("fullscreenchange", () => { $("dawPlein").setAttribute("aria-pressed", String(document.fullscreenElement === el)); setTimeout(() => { dessiner(); visualiser(); }, 120); });
  $("dawTitreBtn").onclick = renommer;
  $("dawDupliquer").onclick = dupliquer;
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
  if (window.matchMedia && matchMedia("(max-width:760px)").matches) pan.classList.add("ferme");
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
    else if (k === "d") dupliquer();
    else if (k === "r") enregistrer();
    else if (k === "f") pleinEcran();
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
    page, importer, supprimerProjet, renommerProjet,
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
