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
  /* poignee entre les pistes et l'inspecteur : on la tire pour partager la hauteur */
  .daw-poignee{height:9px;margin:-5px 0 -4px;position:relative;z-index:8;cursor:ns-resize;display:grid;place-items:center;touch-action:none}
  .daw-poignee i{width:46px;height:4px;border-radius:2px;background:#4A4B50;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 1px rgba(0,0,0,.6);transition:background .12s,width .12s}
  .daw-poignee:hover i,.daw-poignee.tire i{background:#8D9097;width:64px}
  .daw.redim{cursor:ns-resize;user-select:none}
  .daw.redim *{cursor:ns-resize!important}
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
  .daw-o.achat{color:#fff;background:linear-gradient(180deg,#34C77B,#22A15C);text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 1px 2px rgba(0,0,0,.4)}
  .daw-o.achat:hover{background:linear-gradient(180deg,#3DD887,#26AE63);color:#fff}
  .daw-o.achat[hidden]{display:none}
  /* sous 1 600 px, les outils ne gardent que leur icone (le nom reste dans l'info-bulle) */
  @media(max-width:1600px){ .daw-outils .daw-o:not(.pri):not(#dawBascule):not(.achat) .lib{display:none} .daw-outils .daw-o:not(.pri){padding:0 7px} }
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
  
  /* ═══════════ FINDINGS Suite : les plug-ins ═══════════
     Un seul chassis pour toute la gamme (facon FabFilter / iZotope) : graphite sobre, grand
     ecran avec spectre en direct, vumetres entree / sortie, boutons plats, commutateurs en
     pastille. Chaque plug-in n'a qu'une couleur d'accent (--vis). Reste sombre dans les deux
     themes, comme un plug-in. */
  .fxc.detail.plug{--vis:#7AA2FF;--p-fond:#16181C;--p-tete:#1C1F24;--p-ligne:rgba(255,255,255,.07);--p-txt:#E8EAED;--p-dim:#8B9099;--p-ecran:#0D0F12;
    position:relative;display:block;padding:0 0 14px;border-radius:12px;overflow:hidden;color:var(--p-txt);
    background:linear-gradient(180deg,#1A1D22,var(--p-fond));border:1px solid var(--p-ligne);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 14px 34px rgba(0,0,0,.4)}
  .fxc.detail.plug[data-fx="autotune"]{--vis:#3DDCC8} .fxc.detail.plug[data-fx="hpf"]{--vis:#7AA2FF} .fxc.detail.plug[data-fx="eq"]{--vis:#FFB547}
  .fxc.detail.plug[data-fx="comp"]{--vis:#FF8A4C} .fxc.detail.plug[data-fx="deesser"]{--vis:#6FD3FF} .fxc.detail.plug[data-fx="sat"]{--vis:#FF6B5E}
  .fxc.detail.plug[data-fx="filtre"]{--vis:#C792EA} .fxc.detail.plug[data-fx="chorus"]{--vis:#8FB8FF} .fxc.detail.plug[data-fx="reverb"]{--vis:#A78BFA}
  .fxc.detail.plug[data-fx="limit"]{--vis:#FFD25E} .fxc.detail.plug[data-fx="delay"]{--vis:#5EE6A8}
  /* en-tete : interrupteur, marque, nom, fonction, aide */
  .fxc.detail.plug .plug-tete{display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;background:var(--p-tete);border-bottom:1px solid var(--p-ligne);box-shadow:none}
  .fxc.detail.plug .plug-tete::before,.fxc.detail.plug .plug-tete::after{content:none}
  .fxc.detail.plug .plug-pwr{position:relative;width:30px;height:17px;border-radius:999px;flex:0 0 auto;background:#2C3037;box-shadow:inset 0 1px 2px rgba(0,0,0,.5);transition:background .15s}
  .fxc.detail.plug .plug-pwr::after{content:"";position:absolute;inset:auto;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#8B9099;box-shadow:0 1px 2px rgba(0,0,0,.4);transition:transform .15s,background .15s}
  .fxc.detail.plug.on .plug-pwr{background:color-mix(in srgb,var(--vis) 85%,#000)}
  .fxc.detail.plug.on .plug-pwr::after{transform:translateX(13px);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.4)}
  .plug-nom{display:flex;align-items:baseline;gap:8px;line-height:1}
  .plug-marque{font:700 9px/1 var(--sans);letter-spacing:.24em;color:var(--p-dim)}
  .plug-nom b{font:700 15px/1 var(--sans);letter-spacing:-.01em;color:var(--p-txt);text-shadow:none;font-style:normal}
  .plug-marque{color:var(--vis)}
  .fxc.detail.plug .plug-fn{font:500 11px/1 var(--sans);letter-spacing:0;text-transform:none;color:var(--p-dim);padding:0;background:none}
  .plug-esp{flex:1}
  .fxc.detail.plug .plug-i{width:22px;height:22px;border-radius:50%;flex:0 0 auto;font:600 12px/1 var(--sans);font-style:normal;color:var(--p-dim);border:1px solid var(--p-ligne);opacity:1}
  .fxc.detail.plug .plug-i:hover,.fxc.detail.plug.aide-on .plug-i{color:var(--vis);border-color:color-mix(in srgb,var(--vis) 50%,transparent)}
  .plug-aide{display:none;margin:12px 14px 0;padding:10px 12px;border-radius:8px;background:#0F1114;border:1px solid var(--p-ligne);color:#C9CCD2;font-size:11.5px;line-height:1.55}
  .plug.aide-on .plug-aide{display:block}
  /* corps : ecran + vumetres, puis commandes */
  .plug-main{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:12px 14px 0}
  .plug-gauche{display:grid;gap:10px;min-width:0}
  .plug-barre{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;padding:0}
  .plug-seg{display:inline-flex;padding:2px;gap:2px;border-radius:8px;background:#0F1114;border:1px solid var(--p-ligne)}
  .plug-seg button{height:24px;padding:0 10px;border-radius:6px;font:600 11px/1 var(--sans);letter-spacing:0;text-transform:none;color:var(--p-dim)}
  .plug-seg button::before{content:none}
  .plug-seg button:hover{color:var(--p-txt)}
  .plug-seg button[aria-pressed="true"]{color:var(--vis);background:color-mix(in srgb,var(--vis) 16%,#1C1F24);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--vis) 40%,transparent)}
  .plug-menu{display:grid;gap:5px;font:600 9.5px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--p-dim)}
  .plug-menu select{-webkit-appearance:none;appearance:none;height:28px;min-width:124px;padding:0 26px 0 10px;border-radius:7px;border:1px solid var(--p-ligne);
    background:linear-gradient(45deg,transparent 50%,var(--p-dim) 50%) calc(100% - 13px) 12px/4px 4px no-repeat,linear-gradient(135deg,var(--p-dim) 50%,transparent 50%) calc(100% - 9px) 12px/4px 4px no-repeat,#0F1114;
    color:var(--p-txt);font:500 12px var(--sans);letter-spacing:0;text-transform:none;box-shadow:none;cursor:pointer}
  .plug-menu select:hover{border-color:color-mix(in srgb,var(--vis) 45%,transparent)}
  .fxc.detail.plug .plug-vis{margin:0;height:168px;border-radius:8px;border:1px solid var(--p-ligne);background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--vis) 6%,var(--p-ecran)),var(--p-ecran) 70%);box-shadow:inset 0 1px 6px rgba(0,0,0,.6)}
  .fxc.detail.plug .plug-vis::after{content:none}
  /* vumetres entree / sortie */
  .plug-io{display:flex;gap:6px;align-items:stretch;padding:2px 0}
  .plug-io .io{display:grid;grid-template-rows:1fr auto;justify-items:center;gap:5px;width:16px}
  .plug-io .io span{position:relative;width:6px;border-radius:3px;background:#0F1114;border:1px solid var(--p-ligne);overflow:hidden}
  .plug-io .io i{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(0deg,#3DDC84,#E5D84C 75%,#FF5A4E)}
  .plug-io .io b{font:600 8.5px/1 var(--sans);letter-spacing:.06em;color:var(--p-dim)}
  /* boutons rotatifs plats */
  .fxc.detail.plug .plug-boutons{display:flex;justify-content:center;align-items:flex-start;flex-wrap:wrap;gap:6px 18px;padding:16px 14px 4px;opacity:1}
  .fxc.detail.plug .kn{width:72px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:2px 0}
  .fxc.detail.plug .kn svg{width:54px;height:54px;filter:none}
  .fxc.detail.plug .kn .kn-grads,.fxc.detail.plug .kn .kn-jupe,.fxc.detail.plug .kn .kn-reflet{display:none}
  .fxc.detail.plug .kn .kn-fond{stroke:#2A2E35;stroke-width:3.2}
  .fxc.detail.plug .kn .kn-val{stroke:var(--vis);stroke-width:3.2;filter:drop-shadow(0 0 3px color-mix(in srgb,var(--vis) 45%,transparent))}
  .fxc.detail.plug .kn .kn-cap{fill:#23272D;stroke:rgba(255,255,255,.09);stroke-width:1}
  .fxc.detail.plug .kn .kn-ind{stroke:#F2F3F5;stroke-width:2}
  .fxc.detail.plug .kn .kn-v{order:0;min-width:0;padding:0;border-radius:0;background:none;box-shadow:none;color:var(--p-txt);font:600 11.5px var(--sans);font-variant-numeric:tabular-nums;text-shadow:none}
  .fxc.detail.plug .kn .kn-n{order:1;margin:0;font:600 9.5px/1.4 var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--p-dim);text-shadow:none;max-width:84px;overflow:visible}
  .fxc.detail.plug .kn:hover .kn-cap{fill:#2A2F36}
  .fxc.detail.plug .kn:focus-visible{box-shadow:0 0 0 1px var(--vis)}
  /* commutateurs en pastille */
  .plug-tgs{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;padding:10px 14px 0}
  .plug-tg{display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 12px;border-radius:999px;font:600 11px/1 var(--sans);letter-spacing:0;text-transform:none;color:var(--p-dim);
    background:#0F1114;border:1px solid var(--p-ligne);box-shadow:none}
  .plug-tg i{width:6px;height:6px;border-radius:50%;background:#3A3E46;box-shadow:none}
  .plug-tg:hover{color:var(--p-txt)}
  .plug-tg[aria-pressed="true"]{color:var(--vis);border-color:color-mix(in srgb,var(--vis) 45%,transparent);background:color-mix(in srgb,var(--vis) 12%,#0F1114)}
  .plug-tg[aria-pressed="true"] i{background:var(--vis);box-shadow:0 0 6px var(--vis)}
  .fxc.detail.plug:not(.on) .plug-vis,.fxc.detail.plug:not(.on) .plug-boutons{opacity:.45;filter:saturate(.3)}
  /* liste des effets */
  .rk-modele{font-style:normal;font-weight:700;color:var(--ink);margin-right:6px;letter-spacing:-.01em}
  .rk-case:not(.on) .rk-modele{color:var(--dim)}
  .rk-case b{font-weight:500;color:var(--ink-2)}
  /* autotune, vue simple (Auto-Tune Artist) */
  .at-art{display:grid;gap:12px;padding:12px 14px 0}
  .at-menus{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .at-menus .plug-menu select{min-width:140px}
  .at-centre{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
  .at-cote{display:grid;justify-items:center;gap:10px}
  .at-coeur{display:grid;justify-items:center;gap:4px}
  .fxc.detail.plug .plug-vis.at-metre{width:320px;height:140px}
  .fxc.detail.plug .kn.grand{width:130px}
  .fxc.detail.plug .kn.grand svg{width:104px;height:104px}
  .fxc.detail.plug .kn.grand .kn-v{font-size:15px}
  .fxc.detail.plug .kn.grand .kn-n{font-size:10.5px;color:var(--p-txt)}
  .at-pied{display:flex;justify-content:center;align-items:center;gap:22px;padding-bottom:2px}
  @media(max-width:640px){ .at-centre{grid-template-columns:1fr} .fxc.detail.plug .plug-vis.at-metre{width:100%} .plug-main{grid-template-columns:1fr} .plug-io{display:none} }
  /* ═══════════ studio en theme clair ═══════════
     L'interface suit le site ; les plug-ins, eux, gardent leur facade d'appareil. */
  :root:not([data-theme="dark"]) .daw{--bg:#FFFFFF;--surface:#F4F4F6;--surface-2:#ECECEF;--ink:#1D1D1F;--ink-2:#3A3A3C;--dim:#6E6E73;--dimmer:#98989D;
    --line:rgba(0,0,0,.14);--line-soft:rgba(0,0,0,.06);--hover:rgba(0,0,0,.05);--thumb:#E5E5EA;--accent-soft:rgba(250,35,59,.1);
    --barre:linear-gradient(180deg,#FCFCFD,#ECEDF0);--creux:#E2E3E7;--lcd:#E6ECF0;--lcd-ink:#14181C;--lcd-dim:#6A737C;
    color-scheme:light;border-color:#C7C9CE;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7),0 18px 50px rgba(0,0,0,.12)}
  :root:not([data-theme="dark"]) .daw-haut{border-bottom-color:#CFD1D6;box-shadow:inset 0 1px 0 #fff}
  :root:not([data-theme="dark"]) .daw-transport,:root:not([data-theme="dark"]) .daw-mix,:root:not([data-theme="dark"]) .daw-niv,:root:not([data-theme="dark"]) .vu{box-shadow:inset 0 1px 2px rgba(0,0,0,.18),0 1px 0 #fff}
  :root:not([data-theme="dark"]) .daw-b{color:#3A3B40} :root:not([data-theme="dark"]) .daw-b:hover{background:rgba(0,0,0,.06);color:#111}
  :root:not([data-theme="dark"]) .daw.joue .daw-b.lire{color:#1E9E57;background:rgba(30,158,87,.12)}
  :root:not([data-theme="dark"]) .lcd{box-shadow:inset 0 1px 3px rgba(0,0,0,.22),0 1px 0 #fff}
  :root:not([data-theme="dark"]) .lcd-seg{border-left-color:rgba(0,0,0,.08)}
  :root:not([data-theme="dark"]) .daw-o,:root:not([data-theme="dark"]) .daw-ms,:root:not([data-theme="dark"]) .daw-fxb,:root:not([data-theme="dark"]) .daw-importer,:root:not([data-theme="dark"]) .ajout-piste button,:root:not([data-theme="dark"]) .dp-act{color:#3A3B40;background:linear-gradient(180deg,#FFFFFF,#E9EAED);box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(0,0,0,.12),0 1px 1px rgba(0,0,0,.08)}
  :root:not([data-theme="dark"]) .daw-o:hover,:root:not([data-theme="dark"]) .daw-ms:hover,:root:not([data-theme="dark"]) .daw-importer:hover,:root:not([data-theme="dark"]) .ajout-piste button:hover,:root:not([data-theme="dark"]) .dp-act:hover{color:#111;background:linear-gradient(180deg,#FFFFFF,#F1F2F4)}
  :root:not([data-theme="dark"]) .daw-o:active{background:#E2E3E7;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)}
  :root:not([data-theme="dark"]) .daw-o[aria-pressed="true"]{color:#D61F35;background:linear-gradient(180deg,#FFF1F3,#FFE0E5);box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(214,31,53,.3)}
  :root:not([data-theme="dark"]) .daw-o.achat{color:#fff;background:linear-gradient(180deg,#34C77B,#22A15C);box-shadow:0 1px 2px rgba(0,0,0,.15)}
  :root:not([data-theme="dark"]) .daw-o.pri{color:#fff;background:linear-gradient(180deg,#FF3A50,#E01E36);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.2)}
  :root:not([data-theme="dark"]) .daw-sep{background:rgba(0,0,0,.14);box-shadow:1px 0 0 #fff}
  :root:not([data-theme="dark"]) .daw-ms.m[aria-pressed="true"]{background:linear-gradient(180deg,#5DA2FF,#2F7CF0);color:#fff}
  :root:not([data-theme="dark"]) .daw-ms.s[aria-pressed="true"]{background:linear-gradient(180deg,#FFD866,#E9B52C);color:#1A1405}
  :root:not([data-theme="dark"]) .daw-fxb.actif{color:#fff;background:linear-gradient(180deg,color-mix(in srgb,var(--pc) 85%,#fff),var(--pc));box-shadow:0 0 0 1px color-mix(in srgb,var(--pc) 70%,#000),0 1px 1px rgba(0,0,0,.1)}
  :root:not([data-theme="dark"]) .daw input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(90deg,var(--pc,var(--accent)) var(--p,50%),#D3D5DA var(--p,50%));box-shadow:inset 0 1px 1px rgba(0,0,0,.15)}
  :root:not([data-theme="dark"]) .daw input[type=range]::-moz-range-track{background:#D3D5DA}
  :root:not([data-theme="dark"]) .daw input[type=range]::-webkit-slider-thumb{background:linear-gradient(180deg,#FFFFFF,#D9DBDF);box-shadow:0 0 0 1px rgba(0,0,0,.25),0 1px 2px rgba(0,0,0,.25)}
  :root:not([data-theme="dark"]) .daw-zone{scrollbar-color:#C4C6CB var(--bg)}
  :root:not([data-theme="dark"]) .daw-ligne{border-bottom-color:rgba(0,0,0,.08)}
  :root:not([data-theme="dark"]) .daw-ligne.regle{border-bottom-color:#CFD1D6}
  :root:not([data-theme="dark"]) .daw-coin,:root:not([data-theme="dark"]) .daw-tete{border-right-color:#D5D7DB;box-shadow:1px 0 0 #fff}
  :root:not([data-theme="dark"]) .daw-regle{background-image:linear-gradient(to right,rgba(0,0,0,.18) 1px,transparent 1px),var(--barre)}
  :root:not([data-theme="dark"]) .daw-regle span{color:#5E6168;border-left-color:rgba(0,0,0,.28)}
  :root:not([data-theme="dark"]) .daw-voie{background-image:linear-gradient(to right,rgba(0,0,0,.09) 1px,transparent 1px),linear-gradient(to right,rgba(0,0,0,.035) 1px,transparent 1px)}
  :root:not([data-theme="dark"]) .daw-ligne.sel-piste .daw-voie{background-color:rgba(0,0,0,.022)}
  :root:not([data-theme="dark"]) .daw-ligne.sel-piste .daw-tete{background:#E7E8EC}
  :root:not([data-theme="dark"]) .vu{background:#DCDEE2}
  :root:not([data-theme="dark"]) .bloc-prod{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--sc) 14%,transparent) 0 6px,transparent 6px 12px),color-mix(in srgb,var(--sc) 10%,#fff);
    border-color:color-mix(in srgb,var(--sc) 45%,#fff);color:color-mix(in srgb,var(--sc) 70%,#000);box-shadow:inset 0 14px 0 color-mix(in srgb,var(--sc) 24%,#fff)}
  :root:not([data-theme="dark"]) .bloc-fichier{background:linear-gradient(180deg,color-mix(in srgb,var(--sc) 85%,#fff) 0 15px,color-mix(in srgb,var(--sc) 20%,#fff) 15px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--sc) 45%,#fff)}
  :root:not([data-theme="dark"]) .clip{background:linear-gradient(180deg,color-mix(in srgb,var(--pc) 92%,#fff) 0 15px,color-mix(in srgb,var(--pc) 16%,#fff) 15px);
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--pc) 55%,#fff),0 1px 2px rgba(0,0,0,.12)}
  :root:not([data-theme="dark"]) .clip.sel{box-shadow:inset 0 0 0 1px #1D1D1F,0 0 0 1px #1D1D1F,0 4px 14px rgba(0,0,0,.18)}
  :root:not([data-theme="dark"]) .daw-curseur{background:#1D1D1F;box-shadow:none}
  :root:not([data-theme="dark"]) .daw-curseur::before{border-top-color:#1D1D1F}
  :root:not([data-theme="dark"]) .daw-pan{background:#F4F4F6;border-top-color:#CFD1D6;box-shadow:inset 0 1px 0 #fff}
  :root:not([data-theme="dark"]) .dp-onglets{border-bottom-color:#D5D7DB}
  :root:not([data-theme="dark"]) .dp-onglets button[aria-selected="true"]{color:#1D1D1F;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)}
  :root:not([data-theme="dark"]) .dp-corps{background:#EEEFF2}
  :root:not([data-theme="dark"]) .dp-bloc{background:#FFFFFF;border-color:#DDDFE3;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  :root:not([data-theme="dark"]) .dp-bloc input[type=text],:root:not([data-theme="dark"]) .dp-bloc select{background:#fff;border-color:#CFD1D6;color:#1D1D1F;box-shadow:none}
  :root:not([data-theme="dark"]) .dp-act.danger{color:#D61F35;background:linear-gradient(180deg,#FFF5F6,#FFE6EA)}
  :root:not([data-theme="dark"]) .dp-bloc .kn .kn-v{background:#F1F2F4;color:#1D1D1F;box-shadow:inset 0 1px 1px rgba(0,0,0,.12)}
  :root:not([data-theme="dark"]) .dp-bloc .kn .kn-fond{stroke:#D3D5DA}
  :root:not([data-theme="dark"]) .rk{background:#E6E7EA;border-color:#D5D7DB;box-shadow:inset 0 1px 2px rgba(0,0,0,.08)}
  :root:not([data-theme="dark"]) .rk-case{background:linear-gradient(180deg,#FFFFFF,#F2F3F5);box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(0,0,0,.08),0 1px 1px rgba(0,0,0,.05)}
  :root:not([data-theme="dark"]) .rk-case:hover{background:#fff}
  :root:not([data-theme="dark"]) .rk-case.ouvert{background:linear-gradient(180deg,color-mix(in srgb,var(--pc,var(--accent)) 12%,#fff),color-mix(in srgb,var(--pc,var(--accent)) 8%,#F7F7F9));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--pc,var(--accent)) 55%,transparent)}
  :root:not([data-theme="dark"]) .rk-case .fx-on{background:#DCDEE2;box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}
  :root:not([data-theme="dark"]) .rk-case .fx-on::after{background:#B9BCC2}
  :root:not([data-theme="dark"]) .rk-case.on .fx-on::after{background:var(--pc,var(--accent));box-shadow:0 0 6px var(--pc,var(--accent)),0 0 2px #fff inset}
  :root:not([data-theme="dark"]) .daw-poignee i{background:#C4C6CB;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
  :root:not([data-theme="dark"]) .daw-poignee:hover i,:root:not([data-theme="dark"]) .daw-poignee.tire i{background:#8E9198}
  
  /* ── l'inspecteur tient dans sa hauteur : colonnes qui defilent chacune, plug-in qui s'adapte ── */
  .daw .dp-corps.rack{overflow:hidden;align-items:stretch;grid-template-rows:minmax(0,1fr)}
  .daw .dp-corps.rack > .dp-bloc{overflow-y:auto;align-self:start;max-height:100%}
  .daw .dp-corps.rack > .rk{overflow-y:auto;max-height:100%;align-content:start}
  .fxc.detail.plug{display:flex;flex-direction:column;min-height:0;max-height:100%;overflow-y:auto;scrollbar-width:thin}
  .fxc.detail.plug > *{flex:0 0 auto}
  .fxc.detail.plug .plug-main{flex:1 1 auto;min-height:0;grid-template-rows:minmax(0,1fr)}
  .fxc.detail.plug .plug-gauche{display:flex;flex-direction:column;gap:10px;min-height:0}
  .fxc.detail.plug .plug-gauche .plug-vis{flex:1 1 auto;height:auto;min-height:78px}
  .fxc.detail.plug .plug-boutons{padding:12px 14px 2px}
  .fxc.detail.plug .plug-tgs{padding-top:8px}
  .fxc.detail.plug .at-art{flex:1 1 auto}
  
  /* Tune RT en largeur : menus en haut, puis indicateur | gros bouton | petits boutons */
  .fxc.detail.plug .at-art{display:flex;flex-direction:column;gap:10px;padding:12px 14px 0;min-height:0}
  .fxc.detail.plug .at-menus{justify-content:flex-start;align-items:flex-end}
  .fxc.detail.plug .at-menus .plug-tg{margin-left:auto}
  .fxc.detail.plug .at-menus .plug-menu select{min-width:120px}
  .at-ligne{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(170px,1fr) auto auto;gap:12px;align-items:center}
  .fxc.detail.plug .plug-vis.at-metre{width:auto;height:100%;min-height:118px;max-height:190px}
  .fxc.detail.plug .kn.grand{width:116px}
  .fxc.detail.plug .kn.grand svg{width:92px;height:92px}
  .at-grille{display:grid;grid-template-columns:repeat(3,auto);gap:2px 4px}
  .at-grille .kn{width:62px!important}
  .at-grille .kn svg{width:40px!important;height:40px!important}
  .at-grille .kn .kn-n{font-size:8.5px!important}
  @media(max-width:640px){ .at-ligne{grid-template-columns:1fr} }
  
  .dp-auto{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:var(--ink-2);cursor:pointer}
  .dp-auto input{accent-color:var(--accent);margin:0}
  .dp-auto b{margin-left:auto;font:600 11px var(--mono);color:var(--dim)}
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
        <a class="daw-o achat" id="dawAcheter" hidden target="_blank" rel="noopener" title="Acheter la licence de la prod"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.3 11h10.8l2-7.5H7"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg><span class="lib">Acheter la prod</span></a>
        <button class="daw-o" id="dawPlein" title="Plein écran (F)" aria-label="Plein écran">${I.plein}</button>
        <button class="daw-o pri" id="dawExport" title="Exporter en WAV">${I.export}<span class="lib">Exporter</span></button>
        <button class="daw-o" id="dawFermer" title="Fermer le studio (Échap)" aria-label="Fermer">${I.fermer}</button>
      </div>
    </div>
    <div class="daw-zone" id="dawZone"><div class="daw-grille" id="dawGrilleEl"></div></div>
    <div class="daw-pan" id="dawPan">
      <div class="daw-poignee" id="dawPoignee" role="separator" aria-orientation="horizontal" aria-label="Hauteur du panneau des effets" title="Glisser pour agrandir ou réduire le panneau · double-clic pour le replier"><i></i></div>
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
    { k: "autotune", modele: "Tune RT", nom: "Autotune / pitch", types: [["prod", "Tonalité de la prod", "Prod"], ["cle", "Choisir la tonalité", "Choisir"], ["chroma", "Chromatique", "Chroma"], ["libre", "Sans correction", "Libre"]],
      // [cle, libelle, options, mode ou le menu apparait (absent = toujours)]
      menus: [["tonique", "Note", NOTES.map((n, i) => [String(i), n]), "cle"], ["gamme", "Gamme", Object.entries(GAMMES).map(([c, g]) => [c, g.nom]), "cle"],
              ["tessiture", "Range", Object.entries(TESSITURES).map(([c, t]) => [c, t.nom])]],
      p: [["vitesse", "Vitesse", 0, 200, 1, "ms", 15], ["transition", "Transition", 0, 300, 1, "ms", 0], ["humain", "Humanize", 0, 100, 1, "%", 0],
          ["tolerance", "Tolérance", 0, 50, 1, "ct", 0], ["demitons", "Pitch", -12, 12, 1, "dt", 0], ["diapason", "Diapason", 430, 450, .5, "Hz", 440],
          ["mix", "Mélange", 0, 100, 1, "%", 100]],
      cases: [["formant", "Formants préservés"]] },
    { k: "hpf", modele: "LowCut", nom: "Coupe-bas", p: [["freq", "Fréquence", 20, 400, 1, "Hz", 80]] },
    { k: "eq", modele: "VoxEQ", nom: "Égaliseur", p: [["bas", "Graves", -15, 15, .5, "dB", 0], ["basF", "F. graves", 60, 500, 1, "Hz", 200],
      ["mid", "Médiums", -15, 15, .5, "dB", 0], ["midF", "F. médiums", 300, 5000, 10, "Hz", 1500], ["midQ", "Largeur", .3, 5, .1, "", 1],
      ["haut", "Aigus", -15, 15, .5, "dB", 0], ["hautF", "F. aigus", 2000, 14000, 50, "Hz", 7000]], cases: [["analog", "Analog"]] },
    { k: "comp", modele: "Comp-76", nom: "Compresseur", p: [["seuil", "Seuil", -60, 0, 1, "dB", -20], ["ratio", "Ratio", 1, 20, .5, ":1", 4],
      ["attaque", "Attaque", 1, 100, 1, "ms", 6], ["relache", "Relâche", 20, 800, 5, "ms", 150], ["gain", "Gain", 0, 24, .5, "dB", 4]], cases: [["analog", "Analog"]] },
    { k: "deesser", modele: "DeEss", nom: "De-esser", types: [["bande", "Bande (split)", "Bande"], ["large", "Large"]],
      p: [["freq", "Fréquence", 3000, 12000, 50, "Hz", 6500], ["seuil", "Seuil", -50, 0, 1, "dB", -28], ["portee", "Réduction", 0, 20, .5, "dB", 10]],
      cases: [["ecoute", "Écouter les sifflantes", false]] },
    { k: "sat", modele: "Tube", nom: "Saturation", p: [["drive", "Chaleur", 0, 100, 1, "%", 25], ["mix", "Mélange", 0, 100, 1, "%", 35]] },
    { k: "filtre", modele: "LoFi", nom: "Filtre", types: [["tel", "Téléphone"], ["radio", "Radio"], ["pb", "Passe-bas"], ["ph", "Passe-haut"]],
      p: [["freq", "Fréquence", 100, 12000, 10, "Hz", 1700], ["q", "Résonance", .3, 12, .1, "", 1.2]] },
    { k: "chorus", modele: "Double", nom: "Doubleur", p: [["vitesse", "Vitesse", .1, 3, .05, "Hz", .4], ["profondeur", "Profondeur", 0, 100, 1, "%", 30], ["mix", "Mélange", 0, 100, 1, "%", 25]] },
    { k: "reverb", modele: "Plate", nom: "Réverb", p: [["taille", "Taille", .3, 6, .1, "s", 1.4], ["predelay", "Pré-délai", 0, 200, 1, "ms", 25],
      ["amorti", "Brillance", 1500, 14000, 100, "Hz", 6000], ["mix", "Niveau", 0, 100, 1, "%", 12]] },
    { k: "limit", modele: "MaxLimit", nom: "Limiteur", p: [["seuil", "Seuil", -24, 0, .5, "dB", -6], ["plafond", "Plafond", -6, 0, .1, "dB", -1], ["relache", "Relâche", 5, 500, 1, "ms", 60]] },
    { k: "delay", modele: "Tape Echo", nom: "Écho", divisions: [["1/4", "1/4"], ["1/8p", "1/8 pointée", "1/8 p."], ["1/8", "1/8"], ["1/16", "1/16"], ["1/4t", "1/4 triolet", "1/4 t"]],
      p: [["retour", "Répétitions", 0, 85, 1, "%", 22], ["filtre", "Brillance", 800, 10000, 100, "Hz", 3200], ["mix", "Niveau", 0, 100, 1, "%", 10]], cases: [["pingpong", "Ping-pong"]] }
  ];
  const AIDE = {
    autotune: "Cale la voix sur les notes de la gamme. Vitesse 0 = effet robot, 30 ms et plus = correction discrète. Humanize adoucit la correction sur les notes tenues. Tolérance : en dessous de cet écart (centièmes de demi-ton), la voix n'est pas touchée. Diapason : le La de référence, si la prod n'est pas accordée à 440 Hz.",
    hpf: "Retire le grave inutile (souffle, pied de micro, plosives). À laisser sur presque toutes les voix.",
    eq: "Creuse ou renforce des zones : moins de « boue » vers 300–500 Hz, plus d'air dans les aigus.",
    comp: "Resserre les écarts de volume pour que la voix reste devant. Seuil bas = plus compressé.",
    deesser: "Calme les « s » et les « ch » qui sifflent. Seuls les aigus au-dessus de la fréquence sont réduits quand ils dépassent le seuil ; le reste de la voix ne bouge pas. « Écouter les sifflantes » fait entendre ce qui est détecté, pour caler la fréquence.",
    limit: "Monte le niveau sans jamais dépasser le plafond. Seuil bas = voix plus dense et plus forte ; le plafond garde une marge avant 0 dB.",
    sat: "Arrondit les crêtes et ajoute un peu de densité, comme un passage dans une console. À doser léger.",
    filtre: "Coupe une partie du spectre : effet téléphone ou radio pour les ad-libs et les intros.",
    chorus: "Ouvre la voix en stéréo comme une prise doublée, sans effet de vague : refrains et backs.",
    reverb: "Place la voix dans une pièce. Taille = durée de la queue, pré-délai = détache la voix de sa réverb.",
    delay: "Répète la voix en rythme, calé sur le tempo. Chaque répétition s'assombrit, comme sur une bande."
  };
  const resume = (k, v) => ({
    deesser: () => `${v.freq >= 1000 ? (v.freq / 1000).toFixed(1) + " kHz" : v.freq + " Hz"} · ${v.seuil} dB`,
    limit: () => `${v.seuil} dB → ${v.plafond} dB`,
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
      (f.cases || []).forEach(([c, , def]) => o[f.k][c] = def !== false);
    }
    return o;
  };
  /* Des reglages de depart, comme les presets d'un vrai studio. Doses volontairement
     legeres : une voix de rap ou de pop actuelle est seche et proche, la reverb et l'echo
     s'entendent a peine seuls mais tiennent la voix dans la prod. */
  const PRESETS = {
    brut:     { nom: "Brut (aucun effet)", fx: {} },
    // nettoyage transparent : la voix telle qu'elle est, en mieux
    naturel:  { nom: "Voix naturelle", fx: {
                hpf: { on: 1, freq: 80 },
                eq: { on: 1, bas: 0, basF: 200, mid: -2, midF: 300, midQ: 1, haut: 2, hautF: 10000, analog: true },
                comp: { on: 1, seuil: -20, ratio: 2.5, attaque: 15, relache: 120, gain: 4, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -30, portee: 6, ecoute: false },
                reverb: { on: 1, taille: .8, predelay: 15, amorti: 6500, mix: 8 } } },
    // couplet rap : devant, sec, percutant
    lead:     { nom: "Lead rap", fx: {
                hpf: { on: 1, freq: 100 },
                eq: { on: 1, bas: -2, basF: 200, mid: 2, midF: 3000, midQ: .9, haut: 2.5, hautF: 10000, analog: true },
                comp: { on: 1, seuil: -24, ratio: 4, attaque: 5, relache: 80, gain: 6, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -30, portee: 8, ecoute: false },
                sat: { on: 1, drive: 15, mix: 20 },
                limit: { on: 1, seuil: -3, plafond: -1, relache: 60 },
                delay: { on: 1, division: "1/8", retour: 10, filtre: 2800, mix: 5, pingpong: false },
                reverb: { on: 1, taille: 1, predelay: 25, amorti: 5500, mix: 6 } } },
    // voix chantee avec un autotune leger, qui garde le naturel
    melodique:{ nom: "Lead mélodique", fx: {
                autotune: { on: 1, type: "prod", vitesse: 35, transition: 0, humain: 35, tolerance: 10, demitons: 0, diapason: 440, mix: 100, formant: true, tessiture: "large" },
                hpf: { on: 1, freq: 100 },
                eq: { on: 1, bas: -1.5, basF: 200, mid: -2, midF: 400, midQ: 1, haut: 3, hautF: 10000, analog: true },
                comp: { on: 1, seuil: -24, ratio: 3.5, attaque: 8, relache: 120, gain: 8, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -30, portee: 8, ecoute: false },
                delay: { on: 1, division: "1/4", retour: 20, filtre: 2800, mix: 8, pingpong: true },
                reverb: { on: 1, taille: 1.8, predelay: 35, amorti: 5500, mix: 12 } } },
    // l'effet robot assume, facon trap
    autotune: { nom: "Autotune marqué", fx: {
                autotune: { on: 1, type: "prod", vitesse: 0, transition: 0, humain: 0, tolerance: 0, demitons: 0, diapason: 440, mix: 100, formant: true, tessiture: "large" },
                hpf: { on: 1, freq: 110 },
                eq: { on: 1, bas: -2, basF: 220, mid: 1.5, midF: 2500, midQ: .9, haut: 3, hautF: 10000, analog: true },
                comp: { on: 1, seuil: -26, ratio: 4, attaque: 3, relache: 70, gain: 7, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -30, portee: 8, ecoute: false },
                sat: { on: 1, drive: 10, mix: 15 },
                limit: { on: 1, seuil: -2, plafond: -1, relache: 60 },
                delay: { on: 1, division: "1/4", retour: 22, filtre: 2800, mix: 9, pingpong: true },
                reverb: { on: 1, taille: 1.6, predelay: 30, amorti: 5500, mix: 11 } } },
    refrain:  { nom: "Refrain large", fx: {
                hpf: { on: 1, freq: 110 },
                eq: { on: 1, bas: -2, basF: 220, mid: -1.5, midF: 450, midQ: 1, haut: 3, hautF: 10000, analog: true },
                comp: { on: 1, seuil: -24, ratio: 4, attaque: 6, relache: 110, gain: 9, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -30, portee: 8, ecoute: false },
                chorus: { on: 1, vitesse: .35, profondeur: 25, mix: 22 },
                delay: { on: 1, division: "1/8p", retour: 14, filtre: 3200, mix: 7, pingpong: true },
                reverb: { on: 1, taille: 2, predelay: 25, amorti: 6000, mix: 14 } } },
    melo:     { nom: "Mélo / planant", fx: {
                autotune: { on: 1, type: "prod", vitesse: 25, transition: 0, humain: 50, tolerance: 15, demitons: 0, diapason: 440, mix: 100, formant: true, tessiture: "large" },
                hpf: { on: 1, freq: 90 },
                eq: { on: 1, bas: 0, basF: 200, mid: -1.5, midF: 300, midQ: 1, haut: 2, hautF: 11000, analog: true },
                comp: { on: 1, seuil: -22, ratio: 3, attaque: 12, relache: 160, gain: 5, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -30, portee: 8, ecoute: false },
                delay: { on: 1, division: "1/4", retour: 32, filtre: 2200, mix: 12, pingpong: true },
                reverb: { on: 1, taille: 3.2, predelay: 50, amorti: 4200, mix: 20 } } },
    backs:    { nom: "Backs / chœurs", fx: {
                hpf: { on: 1, freq: 200 },
                eq: { on: 1, bas: -4, basF: 250, mid: -2.5, midF: 2500, midQ: .9, haut: 1.5, hautF: 10000, analog: true },
                comp: { on: 1, seuil: -28, ratio: 5, attaque: 8, relache: 140, gain: 6, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -32, portee: 10, ecoute: false },
                chorus: { on: 1, vitesse: .3, profondeur: 40, mix: 40 },
                reverb: { on: 1, taille: 2.2, predelay: 10, amorti: 4500, mix: 22 } } },
    adlibs:   { nom: "Ad-libs", fx: {
                hpf: { on: 1, freq: 220 },
                eq: { on: 1, bas: 0, basF: 200, mid: 2.5, midF: 2000, midQ: .8, haut: 1, hautF: 9000, analog: true },
                comp: { on: 1, seuil: -26, ratio: 6, attaque: 3, relache: 80, gain: 7, analog: true },
                deesser: { on: 1, type: "bande", freq: 6500, seuil: -30, portee: 8, ecoute: false },
                delay: { on: 1, division: "1/4", retour: 30, filtre: 2600, mix: 16, pingpong: true },
                reverb: { on: 1, taille: 1.5, predelay: 20, amorti: 5000, mix: 12 } } },
    grave:    { nom: "Ad-libs pitchés (grave)", fx: {
                autotune: { on: 1, type: "libre", vitesse: 15, transition: 0, humain: 0, tolerance: 0, demitons: -12, diapason: 440, mix: 100, formant: false, tessiture: "large" },
                hpf: { on: 1, freq: 80 },
                eq: { on: 1, bas: 0, basF: 200, mid: 0, midF: 1500, midQ: 1, haut: -2, hautF: 8000, analog: true },
                comp: { on: 1, seuil: -24, ratio: 5, attaque: 4, relache: 90, gain: 5, analog: true },
                delay: { on: 1, division: "1/4", retour: 20, filtre: 2400, mix: 10, pingpong: true },
                reverb: { on: 1, taille: 1.4, predelay: 20, amorti: 4500, mix: 10 } } },
    aigu:     { nom: "Ad-libs pitchés (aigu)", fx: {
                autotune: { on: 1, type: "libre", vitesse: 15, transition: 0, humain: 0, tolerance: 0, demitons: 12, diapason: 440, mix: 100, formant: false, tessiture: "large" },
                hpf: { on: 1, freq: 250 },
                eq: { on: 1, bas: -3, basF: 300, mid: 0, midF: 1500, midQ: 1, haut: 0, hautF: 9000, analog: true },
                comp: { on: 1, seuil: -24, ratio: 5, attaque: 3, relache: 80, gain: 5, analog: true },
                deesser: { on: 1, type: "bande", freq: 7500, seuil: -30, portee: 10, ecoute: false },
                delay: { on: 1, division: "1/8", retour: 25, filtre: 3000, mix: 12, pingpong: true },
                reverb: { on: 1, taille: 1.6, predelay: 20, amorti: 5000, mix: 12 } } },
    intro:    { nom: "Intro filtrée", fx: {
                hpf: { on: 1, freq: 250 },
                filtre: { on: 1, type: "tel", freq: 1600, q: .8 },
                comp: { on: 1, seuil: -20, ratio: 4, attaque: 5, relache: 100, gain: 12, analog: true },   // le filtre retire ~10 dB : on les rend
                sat: { on: 1, drive: 20, mix: 30 },
                limit: { on: 1, seuil: -4, plafond: -1, relache: 80 },
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
  registerProcessor("findings-autotune", FindingsAutotune);
  /* De-esser « egaliseur dynamique » : un passe-haut (biquad) ecoute les sifflantes ; quand leur
     niveau depasse le seuil, un filtre en plateau sur les aigus baisse d'autant (borne par la
     reduction max). A 0 dB ce plateau laisse passer la voix a l'identique : rien n'est colore
     tant que rien ne siffle. Mode large : toute la voix baisse. Sans latence. */
  class FindingsDeesser extends AudioWorkletProcessor {
    constructor(){
      super();
      this.on = false; this.freq = 6500; this.seuil = -28; this.portee = 10; this.mode = "bande"; this.ecoute = false; this.telem = false;
      this.z1 = 0; this.z2 = 0; this.s1 = 0; this.s2 = 0; this.e = 0; this.red = 0; this.max = 0; this.n = 0; this.cpt = 0;
      this.port.onmessage = e => { Object.assign(this, e.data); this.coefs(); };
      this.coefs(); this.plateau(0);
    }
    coefs(){
      const w = 2 * Math.PI * Math.min(this.freq, sampleRate * .45) / sampleRate, c = Math.cos(w), al = Math.sin(w) / (2 * .7071), a0 = 1 + al;
      this.b0 = (1 + c) / 2 / a0; this.b1 = -(1 + c) / a0; this.b2 = (1 + c) / 2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0;
      this.att = Math.exp(-1 / (.0008 * sampleRate)); this.rel = Math.exp(-1 / (.06 * sampleRate)); this.lis = Math.exp(-1 / (.0015 * sampleRate));
    }
    // plateau des aigus (RBJ, pente 1), centre un peu sous la frequence pour couvrir toute la sifflante
    plateau(gdb){
      const A = Math.pow(10, gdb / 40), w = 2 * Math.PI * Math.min(this.freq * .8, sampleRate * .45) / sampleRate, c = Math.cos(w), al = Math.sin(w) / Math.SQRT2, r = 2 * Math.sqrt(A) * al;
      const a0 = (A + 1) - (A - 1) * c + r;
      this.p0 = A * ((A + 1) + (A - 1) * c + r) / a0; this.p1 = -2 * A * ((A - 1) + (A + 1) * c) / a0; this.p2 = A * ((A + 1) + (A - 1) * c - r) / a0;
      this.q1 = 2 * ((A - 1) - (A + 1) * c) / a0; this.q2 = ((A + 1) - (A - 1) * c - r) / a0;
    }
    process(inputs, outputs){
      const ent = inputs[0], sor = outputs[0][0];
      if (!sor) return true;
      if (!ent || !ent.length) { sor.fill(0); return true; }
      const a0 = ent[0], a1 = ent[1];
      if (!this.on) { for (let i = 0; i < sor.length; i++) sor[i] = a1 ? (a0[i] + a1[i]) * .5 : a0[i]; return true; }
      for (let i = 0; i < sor.length; i++) {
        const v = a1 ? (a0[i] + a1[i]) * .5 : a0[i];
        // detection : niveau des aigus
        const h = this.b0 * v + this.z1; this.z1 = this.b1 * v - this.a1 * h + this.z2; this.z2 = this.b2 * v - this.a2 * h;
        const l = Math.abs(h); this.e = l > this.e ? this.att * this.e + (1 - this.att) * l : this.rel * this.e + (1 - this.rel) * l;
        const over = 20 * Math.log10(this.e + 1e-9) - this.seuil;
        const cible = over > 0 ? Math.min(this.portee, over * .9) : 0;        // ratio 10:1
        this.red = this.lis * this.red + (1 - this.lis) * cible;
        if (this.red > this.max) this.max = this.red;
        if (this.ecoute) { sor[i] = h; continue; }
        if (this.mode === "large") { sor[i] = v * Math.pow(10, -this.red / 20); continue; }
        if (++this.cpt >= 16) { this.cpt = 0; this.plateau(-this.red); }    // le plateau suit la reduction
        const y = this.p0 * v + this.s1; this.s1 = this.p1 * v - this.q1 * y + this.s2; this.s2 = this.p2 * v - this.q2 * y;
        sor[i] = y;
      }
      if (this.telem && ++this.n >= 4) { this.n = 0; this.port.postMessage({ gr: this.max }); this.max = 0; }
      return true;
    }
  }
  registerProcessor("findings-deesser", FindingsDeesser);`;
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
    lim.threshold.value = seuilLimiteur(-1.6); lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12;   // plafond -1 dBFS
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
    n.de = AT_PRET.has(c) ? new AudioWorkletNode(c, "findings-deesser", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }) : G();
    if (n.de.port) { n.deHist = []; n.de.port.onmessage = e => { n.deHist.push(e.data.gr); if (n.deHist.length > 240) n.deHist.shift(); }; }
    // limiteur : gain d'entree (le seuil), compresseur rapide calé sous le plafond, puis ecretage net au plafond
    n.limPre = G(); n.lim = c.createDynamicsCompressor(); n.limClip = c.createWaveShaper(); n.limClip.oversample = "4x";
    n.limA = c.createAnalyser(); n.limB = c.createAnalyser(); n.limA.fftSize = n.limB.fftSize = 512;
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
    // pour les ecrans des plug-ins : niveau a l'entree de la piste, spectre a la sortie
    n.entreeA = c.createAnalyser(); n.entreeA.fftSize = 512;
    n.spec = c.createAnalyser(); n.spec.fftSize = 4096; n.spec.smoothingTimeConstant = .82;
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
    n.ana.connect(n.de); n.de.connect(n.satSec); n.de.connect(n.ws); n.ws.connect(n.satHum); n.satSec.connect(n.satSom); n.satHum.connect(n.satSom);
    n.satSom.connect(n.filtre);
    n.filtre.connect(n.chSec); n.filtre.connect(n.chD1); n.filtre.connect(n.chD2);
    n.chD1.connect(p1); n.chD2.connect(p2); p1.connect(n.chHum); p2.connect(n.chHum);
    n.chSec.connect(n.chSom); n.chHum.connect(n.chSom);
    n.chSom.connect(n.limPre); n.limPre.connect(n.lim); n.limPre.connect(n.limA); n.lim.connect(n.limClip); n.limClip.connect(n.limB);
    if (n.pan) { n.limClip.connect(n.pan); n.pan.connect(n.fader); } else n.limClip.connect(n.fader);
    n.fader.connect(b.master); if (n.mesure) n.fader.connect(n.mesure); n.fader.connect(n.spec); n.entree.connect(n.entreeA);
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
  /* Le DynamicsCompressorNode ajoute tout seul un gain de rattrapage (norme Web Audio :
     (1 / gain a 0 dBFS)^0,6). On le retire, pour que « Gain » soit le vrai rattrapage et que les
     plafonds des limiteurs tombent juste. Sortie a 0 dBFS : coude qui commence au seuil. */
  const rattrapageAuto = (seuil, ratio, coude = 0) => { const fin = seuil + coude, s0 = 0 <= seuil ? 0 : 0 >= fin ? (seuil + coude / 2) + (0 - fin) / ratio : 0;
    return Math.max(0, -.6 * s0); };
  // seuil d'un limiteur (ratio 20, sans coude) qui, rattrapage compris, plafonne exactement a « plafond »
  const seuilLimiteur = plafond => plafond / (1 - .6 * (1 - 1 / 20));
  function regler(n, p, solo){
    const f = p.fx, c = n.c, on = k => f[k] && f[k].on;
    n.entree.gain.value = dB(trimAuto(p));
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
      n.comp.attack.value = f.comp.attaque / 1000; n.comp.release.value = f.comp.relache / 1000; n.compG.gain.value = dB(f.comp.gain - rattrapageAuto(f.comp.seuil, f.comp.ratio, 6)); }
    else { n.comp.threshold.value = 0; n.comp.ratio.value = 1; n.comp.knee.value = 0; n.compG.gain.value = 1; }
    // Analog : actif si l'egaliseur ou le compresseur l'est, avec sa case cochee
    const ana = (on("eq") && f.eq.analog !== false) || (on("comp") && f.comp.analog !== false);
    n.ana.curve = ana ? COURBE_ANA : null; n.anaLo.gain.value = ana ? .7 : 0; n.anaHi.gain.value = ana ? -.8 : 0;
    if (n.de.port && f.deesser) { const d = f.deesser;
      n.de.port.postMessage({ on: !!d.on, freq: d.freq, seuil: d.seuil, portee: d.portee, mode: d.type || "bande", ecoute: d.ecoute === true, telem: fxOuvert === "deesser" && pisteCible() === p }); }
    if (f.limit && f.limit.on) {
      const l = f.limit, plaf = dB(l.plafond);
      n.limPre.gain.value = dB(-l.seuil); n.lim.threshold.value = seuilLimiteur(l.plafond - .3); n.lim.knee.value = 0; n.lim.ratio.value = 20;
      n.lim.attack.value = .001; n.lim.release.value = l.relache / 1000;
      if (n.plafond !== l.plafond) { const k = 2048, cc = new Float32Array(k); for (let i = 0; i < k; i++) { const x = i / (k - 1) * 2 - 1; cc[i] = Math.max(-plaf, Math.min(plaf, x)); } n.limClip.curve = cc; n.plafond = l.plafond; }
    } else { n.limPre.gain.value = 1; n.lim.threshold.value = 0; n.lim.ratio.value = 1; n.lim.knee.value = 0; n.limClip.curve = null; n.plafond = null; }
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
  function liberer(n){ try { n.osc.stop(); } catch (e) {} try { if (n.at.port) n.at.port.close(); if (n.de.port) n.de.port.close(); } catch (e) {} try { n.fader.disconnect(); n.hpA.disconnect(); n.hpB.disconnect(); n.revHP.disconnect(); } catch (e) {} }
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
  /* Niveau d'une prise : RMS des passages chantes (au-dessus de -50 dBFS), en dB. */
  const NIV = new Map();
  function niveauPrise(id){
    if (NIV.has(id)) return NIV.get(id);
    const b = BUF.get(id); if (!b) return null;
    const d = b.getChannelData(0), seuil = .00316; let s2 = 0, n2 = 0;
    for (let i = 0; i < d.length; i += 4) { const v = d[i]; if (v > seuil || v < -seuil) { s2 += v * v; n2++; } }
    const db = n2 ? 10 * Math.log10(s2 / n2) : null; NIV.set(id, db); return db;
  }
  /* Gain d'entree d'une piste pour amener ses prises a -20 dBFS RMS, la reference des
     preregles (seuils du compresseur, du de-esser, du limiteur). Borne a -12 / +18 dB. */
  function trimAuto(p){
    if (p.gainAuto === false) return 0;
    const v = P.clips.filter(k => k.piste === p.id).map(k => { const d = niveauPrise(k.prise); return d == null ? null : d + 20 * Math.log10(Math.max(.01, k.gain)); }).filter(x => x != null);
    if (!v.length) return 0;
    return Math.round(clamp(-20 - v.reduce((a, b) => a + b, 0) / v.length, -12, 18) * 2) / 2;
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
  /* ── Projet en fichier .findings : l'arrangement, les prises audio et la prod importee dans
     un seul fichier, pour le garder a l'abri ou le rouvrir sur un autre appareil. ── */
  const versB64 = async blob => { const u = new Uint8Array(await blob.arrayBuffer()); let t = ""; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(t); };
  const deB64 = (txt, type) => { const bin = atob(txt), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: type || "" }); };
  async function sauverFichierProjet(id){
    if (P && P.prod === id) { clearTimeout(saveMinuteur); try { await PRISES_DB.ecrireProjet(JSON.parse(JSON.stringify(P))); } catch (e) {} }
    let pr = null, prises = [], f = null;
    try { pr = await PRISES_DB.lireProjet(id); } catch (e) {}
    try { prises = await PRISES_DB.duProd(id); } catch (e) {}
    try { f = await PRISES_DB.lireFichier(id); } catch (e) {}
    if (!prises.length && !pr) { message("Rien à sauvegarder sur ce projet"); return; }
    message("Préparation du fichier…");
    const b = BY_ID.get(id);
    const doc = { format: "findings-projet", v: 1, enregistre: new Date().toISOString(),
      prod: id === "libre" ? { id: "libre" } : { id, title: b && b.title, prod: b && b.prod, bpm: b && b.bpm, key: b && b.key, style: b && b.style },
      projet: pr, prises: await Promise.all(prises.map(async x => { const { blob, ...reste } = x; return { ...reste, data: await versB64(blob) }; })),
      fichier: f && f.blob ? { nom: f.nom, type: f.type, data: await versB64(f.blob) } : null };
    const nom = ((pr && pr.nom) || (id === "libre" ? "Projet libre" : (b && b.title) || id)).replace(/[\\/:*?"<>|]+/g, "").slice(0, 60).trim() || "Projet";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(doc)], { type: "application/json" }));
    a.download = `${nom}.findings`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    message("Projet sauvegardé : garde le fichier .findings");
  }
  async function ouvrirFichierProjet(fichierChoisi){
    let doc;
    try { doc = JSON.parse(await fichierChoisi.text()); } catch (e) { doc = null; }
    if (!doc || doc.format !== "findings-projet" || !Array.isArray(doc.prises)) { alert("Ce fichier n'est pas un projet FINDINGS (.findings)."); return; }
    let id = (doc.prod && doc.prod.id) || "libre";
    if (id !== "libre" && !BY_ID.has(id)) {
      if (!confirm(`La prod « ${(doc.prod && doc.prod.title) || id} » n'est plus sur FINDINGS. Ouvrir le projet comme projet libre ?`)) return;
      id = "libre";
    }
    let deja = false;
    try { deja = (await PRISES_DB.duProd(id)).length > 0 || !!(await PRISES_DB.lireProjet(id)); } catch (e) {}
    if (deja && !confirm("Tu as déjà un projet sur cette prod, sur cet appareil. Le remplacer par celui du fichier ?")) return;
    if (deja) await supprimerProjet(id);
    for (const x of doc.prises) { const { data, ...reste } = x; BUF.delete(x.id); PIC.delete(x.id); NIV.delete(x.id);
      try { await PRISES_DB.ajouter({ ...reste, prod: id, blob: deB64(data, x.mime) }); } catch (e) {} }
    if (doc.projet) { try { await PRISES_DB.ecrireProjet({ ...doc.projet, prod: id }); } catch (e) {} }
    if (doc.fichier) { try { await PRISES_DB.ecrireFichier({ prod: id, nom: doc.fichier.nom, type: doc.fichier.type, blob: deB64(doc.fichier.data, doc.fichier.type) }); } catch (e) {} }
    if (BY_ID.has(id)) TOPLINE_N.set(id, doc.prises.length);
    if (typeof majToplines === "function") majToplines();
    if (P && P.prod === id) P = null;
    montrerVue("studio", true, id === "libre" ? "studio/" : `studio/?beat=${encodeURIComponent(id)}`);
    setTimeout(async () => { if (ouvert && prod && prod.id === id && !P) await charger(prod); signalerProjets(); message("Projet ouvert"); }, 400);
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
  // une region ajoutee, deplacee ou rognee change le niveau moyen de sa piste : on recale le gain d'entree
  const modifie = () => { sale = true; reglerTout(); sauver(); outils(); };
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
  // une couleur #rrggbb melangee a du noir (t = part de noir)
  const foncer = (hex, t) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return "rgba(0,0,0,.6)";
    const v = parseInt(m[1], 16), c = [v >> 16, (v >> 8) & 255, v & 255].map(x => Math.round(x * (1 - t))); return `rgb(${c.join(",")})`; };
  function ondeRegion(n){
    const k = P.clips.find(x => x.id === n.dataset.clip), pk = k && PIC.get(k.prise); if (!pk) return;
    const cv = n.querySelector("canvas"), w = Math.max(1, Math.round(k.dur * zoom)), W = Math.min(w, 4096);
    const H = Math.max(20, n.clientHeight - 20), dpr = Math.min(2, window.devicePixelRatio || 1), r = w / W;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = w + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.scale(dpr, dpr);
    // forme d'onde teintee de la couleur de la piste (eclaircie), sur le corps sombre de la region
    g.fillStyle = document.documentElement.getAttribute("data-theme") === "dark" ? teinte(getComputedStyle(n).getPropertyValue("--pc").trim(), .55) : foncer(getComputedStyle(n).getPropertyValue("--pc").trim(), .3);
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
  // onze graduations autour des boutons rotatifs, de -225 a +45 degres
  const GRADS = [...Array(11)].map((_, i) => { const a = (-225 + 27 * i) * Math.PI / 180, r1 = 20.2, r2 = i % 5 === 0 ? 23.6 : 22.4;
    return `<line x1="${(21 + r1 * Math.cos(a)).toFixed(2)}" y1="${(21 + r1 * Math.sin(a)).toFixed(2)}" x2="${(21 + r2 * Math.cos(a)).toFixed(2)}" y2="${(21 + r2 * Math.sin(a)).toFixed(2)}"/>`; }).join("");
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
      <svg viewBox="-5 -5 52 52"><g class="kn-grads">${GRADS}</g><path class="kn-fond" d="${ARC(1)}"/><path class="kn-val" d="${ARC(Math.max(.001, x))}"/>
      <circle class="kn-jupe" cx="21" cy="21" r="13.6"/><circle class="kn-cap" cx="21" cy="21" r="11.4"/><ellipse class="kn-reflet" cx="21" cy="16.5" rx="7" ry="4.2"/><line class="kn-ind" x1="21" y1="21" x2="${(21 + 8 * Math.cos((-225 + 270 * x) * Math.PI / 180)).toFixed(2)}" y2="${(21 + 8 * Math.sin((-225 + 270 * x) * Math.PI / 180)).toFixed(2)}"/></svg>
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
          <label class="dp-auto" title="Amène le niveau des prises à la référence des préréglages (-20 dBFS), que tu aies chanté près ou loin du micro"><input type="checkbox" id="dpAuto"${p.gainAuto !== false ? " checked" : ""}>Niveau d'entrée auto<b>${p.gainAuto === false ? "—" : (trimAuto(p) > 0 ? "+" : "") + trimAuto(p) + " dB"}</b></label>
          ${P.pistes.length > 1 ? '<button class="dp-act danger" id="dpSupprPiste">Supprimer la piste</button>' : ""}
        </div>
        <div class="rk" role="list">${FX.map(f => { const v = p.fx[f.k]; return `
          <div class="rk-case${v.on ? " on" : ""}${fxOuvert === f.k ? " ouvert" : ""}" role="listitem" data-ouvrir="${f.k}">
            <button class="fx-on" data-fxon="${f.k}" aria-pressed="${v.on}" aria-label="Activer ${esc(f.nom)}"></button>
            <span class="txt"><b><em class="rk-modele" translate="no">${esc(f.modele || "")}</em>${esc(f.nom)}</b><small data-resume="${f.k}">${esc(resume(f.k, v))}</small></span>
          </div>`; }).join("")}</div>
        ${(() => { const f = FX.find(x => x.k === fxOuvert), v = p.fx[f.k]; return `
        <section class="fxc detail plug${v.on ? " on" : ""}" data-fx="${f.k}">
          <header class="plug-tete">
            <button class="plug-pwr fx-on" data-fxon="${f.k}" aria-pressed="${v.on}" aria-label="Activer ${esc(f.nom)}" title="Activer / couper"></button>
            <div class="plug-nom" translate="no"><span class="plug-marque">FINDINGS</span><b>${esc(f.modele || f.nom)}</b></div>
            <span class="plug-fn">${esc(f.nom)}</span>
            <span class="plug-esp"></span>
            <button class="plug-i" data-aide aria-label="Aide" title="Aide">i</button>
          </header>
          <div class="plug-aide">${AIDE[f.k]}</div>
          ${f.k === "autotune" ? corpsAutotune(f, v) : `
          <div class="plug-main"><div class="plug-gauche">
          ${f.types || f.divisions || f.menus ? `<div class="plug-barre">
            ${f.types ? selecteur("fxtype", f.k, f.types, v.type) : ""}
            ${f.divisions ? selecteur("fxdiv", f.k, f.divisions, v.division) : ""}
            ${f.menus ? f.menus.filter(([, , , si]) => !si || v.type === si).map(([c, n, opts]) => `<label class="plug-menu">${esc(n)}<select data-fxmenu="${f.k}.${c}"${c === "tonique" ? ' translate="no"' : ""}>${opts.map(([o, l]) => `<option value="${o}"${String(v[c]) === o ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`).join("") : ""}
          </div>` : ""}
          <div class="plug-vis" data-vis="${f.k}"><canvas></canvas></div></div>
          <div class="plug-io" aria-hidden="true"><div class="io"><span><i data-io="in"></i></span><b>IN</b></div><div class="io"><span><i data-io="out"></i></span><b>OUT</b></div></div></div>
          <div class="plug-boutons fx-boutons">${f.p.map(([c, n, min, max, pas, u, d]) => bouton(`fx.${f.k}.${c}`, n, min, max, pas, u, v[c], d)).join("")}</div>
          ${(f.cases || []).length ? `<div class="plug-tgs">${f.cases.map(([c, n, def]) => { const coche = v[c] === undefined ? def !== false : !!v[c];
            return `<button class="plug-tg" data-tg aria-pressed="${coche}"><i></i>${esc(n)}<input type="checkbox" hidden data-fxcase="${f.k}.${c}"${coche ? " checked" : ""}></button>`; }).join("")}</div>` : ""}`}
        </section>`; })()}`;
      $("dpAuto").addEventListener("change", e => { memoriser(); p.gainAuto = e.target.checked; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); panneau(); sauver(); });
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
          <div class="ligne"><button class="dp-act" data-act="sauverFichier" title="Un fichier .findings avec l'arrangement, les prises et la prod importée">Sauvegarder (fichier)</button>
          <label class="dp-act" style="display:inline-grid;place-items:center;cursor:pointer">Ouvrir un fichier<input type="file" data-act="ouvrirFichier" accept=".findings,application/json" hidden></label></div>
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
  /* Autotune, vue simple facon Auto-Tune Artist : trois menus, un grand indicateur de
     correction, un gros bouton Vitesse, Humanize et Tolerance de part et d'autre. */
  function corpsAutotune(f, v){
    const par = c => { const d = f.p.find(x => x[0] === c); return bouton(`fx.autotune.${c}`, d[1], d[2], d[3], d[4], d[5], v[c], d[6]); };
    const cleProd = lireCle(prod && prod.key), auto = v.type === "prod";
    const valGamme = v.type === "chroma" ? "chroma" : v.type === "libre" ? "libre" : auto ? (cleProd ? cleProd.gamme : "chroma") : v.gamme;
    const opt = (val, lib, sel) => `<option value="${val}"${sel ? " selected" : ""}>${esc(lib)}</option>`;
    const coche = v.formant !== false;
    return `<div class="at-art">
      <div class="at-menus">
        <label class="plug-menu">Tonalité<select data-atsel="cle" translate="no">
          ${opt("auto", cleProd && prod.keySur ? `Auto · ${NOTES[cleProd.tonique]} ${GAMMES[cleProd.gamme].nom.toLowerCase()}` : "Auto · prod", auto)}
          ${NOTES.map((n, i) => opt(String(i), n, !auto && String(v.tonique) === String(i))).join("")}</select></label>
        <label class="plug-menu">Gamme<select data-atsel="gamme">
          ${Object.entries(GAMMES).map(([c, g]) => opt(c, g.nom, valGamme === c)).join("")}${opt("chroma", "Chromatique", valGamme === "chroma")}${opt("libre", "Aucune (pitch seul)", valGamme === "libre")}</select></label>
        <label class="plug-menu">Tessiture<select data-fxmenu="autotune.tessiture">${Object.entries(TESSITURES).map(([c, t]) => opt(c, t.nom, v.tessiture === c)).join("")}</select></label>
        <button class="plug-tg" data-tg aria-pressed="${coche}"><i></i>Formants préservés<input type="checkbox" hidden data-fxcase="autotune.formant"${coche ? " checked" : ""}></button>
      </div>
      <div class="at-ligne">
        <div class="plug-vis at-metre" data-vis="autotune"><canvas></canvas></div>
        <div class="at-grand">${par("vitesse").replace('class="kn"', 'class="kn grand"')}</div>
        <div class="at-grille">${par("humain")}${par("tolerance")}${par("mix")}${par("demitons")}${par("diapason")}</div>
      </div>
    </div>`;
  }
  const selecteur = (genre, k, opts, val) => `<div class="plug-seg" role="group"><select hidden data-${genre}="${k}">${opts.map(([c, n]) => `<option value="${c}"${val === c ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>${opts.map(([c, n, court]) => `<button data-seg="${c}" aria-pressed="${val === c}" title="${esc(n)}">${esc(court || n)}</button>`).join("")}</div>`;
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
  function courbeFreq(g, W, H, db, dbMax, coul, versBas){
    const y = d => H / 2 - Math.max(-dbMax * 1.1, Math.min(dbMax * 1.1, d)) / dbMax * (H / 2 - 8);
    g.beginPath(); db.forEach((d, i) => { const x = i / (db.length - 1) * W; i ? g.lineTo(x, y(d)) : g.moveTo(x, y(d)); });
    g.strokeStyle = coul; g.lineWidth = 2; g.stroke();
    const base = versBas ? H : H / 2; g.lineTo(W, base); g.lineTo(0, base); g.closePath(); g.fillStyle = coul.replace("rgb(", "rgba(").replace(")", versBas ? ",.10)" : ",.14)"); g.fill();
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
    // vumetres entree / sortie de la facade
    const crete = a => { if (!a) return -90; const b = new Float32Array(a.fftSize); a.getFloatTimeDomainData(b); let m = 0; for (let i = 0; i < b.length; i++) { const v = Math.abs(b[i]); if (v > m) m = v; } return 20 * Math.log10(m + 1e-9); };
    [["in", n && n.entreeA], ["out", n && n.mesure]].forEach(([c, a]) => { const el2 = facade.querySelector(`[data-io="${c}"]`); if (!el2) return;
      const d = crete(a), cle2 = "io" + c; n && (n[cle2] = Math.max(d, (n[cle2] || -90) - 1.5)); el2.style.height = `${Math.max(0, Math.min(100, ((n ? n[cle2] : -90) + 60) / 60 * 100))}%`; });
    // spectre de la voix (sortie de la piste), en fond des ecrans de frequence
    const spectre = (Wb) => { if (!n || !n.spec) return; const a = n.spec, fd = new Float32Array(a.frequencyBinCount); a.getFloatFrequencyData(fd);
      const sr = a.context.sampleRate, hz = sr / a.fftSize; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= Wb; x += 2) { const f0 = 20 * Math.pow(1000, x / Wb), i = Math.min(fd.length - 1, Math.round(f0 / hz)); const d = Math.max(-100, Math.min(-10, fd[i])); g.lineTo(x, H - (d + 100) / 90 * (H - 6)); }
      g.lineTo(Wb, H); g.closePath(); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(255,255,255,.16)"); gr.addColorStop(1, "rgba(255,255,255,.02)"); g.fillStyle = gr; g.fill(); };
    g.globalAlpha = on ? 1 : .45;
    if (k === "eq" || k === "hpf" || k === "filtre") spectre(W);
    if (k === "eq" || k === "hpf" || k === "filtre") {
      const dbMax = k === "eq" ? 15 : 24; grilleFreq(g, W, H, dbMax);
      let filtres;
      if (k === "eq") filtres = [filtreAffiche("lowshelf", f.basF, 1, f.bas), filtreAffiche("peaking", f.midF, f.midQ, f.mid), filtreAffiche("highshelf", f.hautF, 1, f.haut)];
      else if (k === "hpf") filtres = [filtreAffiche("highpass", f.freq, .707, 0)];
      else { const t = f.type; filtres = [filtreAffiche(t === "pb" ? "lowpass" : t === "ph" ? "highpass" : "bandpass", t === "radio" ? Math.min(f.freq, 2500) : f.freq, t === "radio" ? Math.max(.5, f.q * .6) : f.q, 0)]; }
      const db = reponse(filtres); courbeFreq(g, W, H, db, dbMax, coul, k !== "eq");
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
      // historique facon Pro-C : niveau d'entree (gris) et reduction de gain (accent), qui defilent
      const gr = n && n.comp ? Math.max(0, -n.comp.reduction) : 0, lvl = crete(n && n.entreeA);
      if (n) { n.cpH = n.cpH || []; n.cpH.push([lvl, gr]); if (n.cpH.length > 300) n.cpH.shift(); }
      const hx = H + 14, hw = W - hx - 34, hist = (n && n.cpH) || [];
      g.strokeStyle = "rgba(255,255,255,.05)"; g.strokeRect(hx + .5, m + .5, hw, H - 2 * m);
      g.beginPath(); g.moveTo(hx, H - m); hist.forEach(([l], i) => { const px = hx + i / 300 * hw, py = H - m - Math.max(0, (l + 60) / 60) * (H - 2 * m); g.lineTo(px, py); }); g.lineTo(hx + hist.length / 300 * hw, H - m); g.closePath();
      g.fillStyle = "rgba(255,255,255,.12)"; g.fill();
      g.beginPath(); hist.forEach(([, r], i) => { const px = hx + i / 300 * hw, py = m + Math.min(1, r / 20) * (H - 2 * m); i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.strokeStyle = coul; g.lineWidth = 2; g.stroke();
      const sy = H - m - (f.seuil + 60) / 60 * (H - 2 * m); g.strokeStyle = "rgba(255,255,255,.25)"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(hx, sy); g.lineTo(hx + hw, sy); g.stroke(); g.setLineDash([]);
      // jauge de reduction
      const bx = W - 22, bh = H - 2 * m; g.fillStyle = "#0F1114"; g.fillRect(bx, m, 8, bh); g.fillStyle = coul; g.fillRect(bx, m, 8, Math.min(1, gr / 20) * bh);
      g.fillStyle = "rgba(255,255,255,.5)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText("GR " + gr.toFixed(1) + " dB", hx + 6, m + 12);
      g.fillText(`${f.ratio}:1`, m + 4, m + 12);
    } else if (k === "sat") {
      const c = courbe(f.drive), mix = f.mix / 100, gain = 1 + f.drive / 100 * .6, m = 10, L = H - 2 * m;
      g.strokeStyle = "rgba(255,255,255,.07)"; g.strokeRect(m + .5, m + .5, L, L);
      g.strokeStyle = "rgba(255,255,255,.18)"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(m, m + L); g.lineTo(m + L, m); g.stroke(); g.setLineDash([]);
      g.beginPath(); for (let i = 0; i <= 200; i++) { const x = i / 200 * 2 - 1, y = (1 - mix) * x + mix * gain * c[Math.round((x + 1) / 2 * (c.length - 1))]; const px = m + (x + 1) / 2 * L, py = m + (1 - (Math.max(-1.2, Math.min(1.2, y)) + 1) / 2) * L; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.strokeStyle = coul; g.lineWidth = 2; g.stroke();
      // harmoniques generees : une sinusoide passee dans la courbe, son spectre grossier
      const N2 = 256, sig = new Float32Array(N2); for (let i = 0; i < N2; i++) { const x = .8 * Math.sin(2 * Math.PI * 4 * i / N2); sig[i] = (1 - mix) * x + mix * gain * c[Math.round((x + 1) / 2 * (c.length - 1))]; }
      const bx = L + 3 * m, bw = (W - bx - m) / 8;
      for (let h = 1; h <= 8; h++) { let re = 0, im = 0; for (let i = 0; i < N2; i++) { re += sig[i] * Math.cos(2 * Math.PI * 4 * h * i / N2); im += sig[i] * Math.sin(2 * Math.PI * 4 * h * i / N2); }
        const a = Math.sqrt(re * re + im * im) / (N2 / 2), d = Math.max(0, 1 + 20 * Math.log10(Math.max(1e-5, a)) / 60), hh = d * (H - 2 * m - 12);
        g.fillStyle = h === 1 ? "rgba(255,255,255,.35)" : coul; g.fillRect(bx + (h - 1) * bw + 3, H - m - 12 - hh, bw - 6, hh);
        g.fillStyle = "rgba(255,255,255,.4)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText("H" + h, bx + (h - 1) * bw + 4, H - 4); }

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
      g.fillStyle = "rgba(255,255,255,.5)"; g.fillText(`${(t * 1000).toFixed(0)} ms (${(FX.find(z => z.k === "delay").divisions.find(d => d[0] === f.division) || [, ""])[1]} à ${bpm()} BPM)`, 18, 12);
    } else if (k === "deesser") {
      // a gauche la bande traitee, a droite la reduction en direct et son historique
      const Wb = W - 70; spectre(Wb); grilleFreq(g, Wb, H, 24);
      // la bande ecoutee (passe-haut), sur la meme echelle que la grille
      const db = reponse([filtreAffiche("highpass", f.freq, .7071, 0)]);
      g.save(); g.beginPath(); g.rect(0, 0, Wb, H); g.clip(); courbeFreq(g, Wb, H, db, 24, coul, true); g.restore();
      const fx = xFreq(f.freq, Wb); g.strokeStyle = coul; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(fx, 8); g.lineTo(fx, H - 14); g.stroke(); g.setLineDash([]);
      g.fillStyle = coul; g.font = "bold 9px ui-monospace,Menlo,monospace"; g.fillText((f.freq / 1000).toFixed(1) + " kHz", Math.min(fx + 4, Wb - 50), 14);
      const hist = (n && n.deHist) || [], gr = hist.length ? hist[hist.length - 1] : 0;
      n && (n.deVu = (n.deVu || 0) + (gr - (n.deVu || 0)) * .3);
      // historique de la reduction, en bas de l'ecran
      if (hist.some(v => v > .2)) { g.beginPath(); hist.forEach((v, i) => { const px = i / 240 * Wb, py = H - 14 - Math.min(20, v) / 20 * (H * .45); i ? g.lineTo(px, py) : g.moveTo(px, py); });
        g.strokeStyle = "rgba(255,180,80,.75)"; g.lineWidth = 1.4; g.stroke(); }
      const bx = W - 52, bh = H - 28; g.fillStyle = "#0B0C0E"; g.fillRect(bx, 10, 16, bh);
      const hh = Math.min(1, (n ? n.deVu : 0) / Math.max(1, f.portee)) * bh; g.fillStyle = "#F5A524"; g.fillRect(bx, 10, 16, hh);
      g.fillStyle = "rgba(255,255,255,.5)"; g.font = "9px ui-monospace,Menlo,monospace"; g.fillText("GR", bx, H - 6); g.fillText("-" + (n ? n.deVu : 0).toFixed(1), bx + 20, 10 + Math.max(9, hh));
      g.fillText("seuil " + f.seuil + " dB · réduction max " + f.portee + " dB", 30, 14);
    } else if (k === "limit") {
      // trois vumetres facon L2 : entree, attenuation, sortie, et l'attenuation dans le temps
      const lire = a => { if (!a) return -90; const b = new Float32Array(a.fftSize); a.getFloatTimeDomainData(b); let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); return 20 * Math.log10(m + 1e-9); };
      const ent = lire(n && n.limA), sor = lire(n && n.limB), att = n && n.lim ? Math.max(0, -n.lim.reduction) : 0;
      n && (n.limH = n.limH || [], n.limH.push(att), n.limH.length > 220 && n.limH.shift());
      const y = d => 10 + (1 - (Math.max(-30, Math.min(0, d)) + 30) / 30) * (H - 30), barre = (x, d, c2, lib) => {
        g.fillStyle = "#0B0C0E"; g.fillRect(x, 10, 18, H - 30); g.fillStyle = c2; g.fillRect(x, y(d), 18, H - 20 - y(d));
        g.fillStyle = "rgba(255,255,255,.55)"; g.font = "bold 8px system-ui"; g.fillText(lib, x - 1, H - 6); };
      barre(14, ent, "#7FD48A", "IN");
      g.fillStyle = "#0B0C0E"; g.fillRect(44, 10, 18, H - 30); const ha = Math.min(1, att / 12) * (H - 30); g.fillStyle = "#FFB547"; g.fillRect(44, 10, 18, ha);
      g.fillStyle = "rgba(255,255,255,.55)"; g.fillText("ATT", 42, H - 6);
      barre(74, sor, coul, "OUT");
      g.strokeStyle = "#FF5A4E"; g.beginPath(); g.moveTo(72, y(f.plafond) + .5); g.lineTo(96, y(f.plafond) + .5); g.stroke();
      g.fillStyle = "rgba(255,255,255,.4)"; g.font = "9px ui-monospace,Menlo,monospace";
      [0, -6, -12, -18, -24, -30].forEach(d => g.fillText(d, 100, y(d) + 3));
      const hx = 130, hw = W - hx - 10, hist = (n && n.limH) || [];
      g.strokeStyle = "rgba(255,255,255,.07)"; g.strokeRect(hx + .5, 10.5, hw, H - 30);
      g.beginPath(); hist.forEach((v, i) => { const px = hx + i / 220 * hw, py = 10 + Math.min(1, v / 12) * (H - 30); i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.strokeStyle = "#FFB547"; g.lineWidth = 1.4; g.stroke();
      g.fillStyle = "rgba(255,255,255,.5)"; g.fillText(`seuil ${f.seuil} dB · plafond ${f.plafond} dB · att. ${att.toFixed(1)} dB`, hx + 6, H - 6);
    } else if (k === "autotune") {
      // indicateur de correction : de -100 a +100 cents, l'aiguille montre ce que l'autotune corrige
      const h = (n && n.atHist) || [], d = h[h.length - 1], cx = W / 2, cy = H - 16, R = Math.min(W * .42, H - 30);
      const corr = d && d.m > 0 ? 1200 * Math.log2(d.r || 1) : 0;
      n && (n.atAig = (n.atAig || 0) + (corr - (n.atAig || 0)) * .35);
      const ang = c => Math.PI * 1.5 + Math.max(-100, Math.min(100, c)) / 100 * 1.05;
      g.lineWidth = 6; g.lineCap = "round";
      g.strokeStyle = "rgba(255,255,255,.07)"; g.beginPath(); g.arc(cx, cy, R, ang(-100), ang(100)); g.stroke();
      const v0 = ang(0), v1 = ang(n ? n.atAig : 0);
      g.strokeStyle = coul; g.shadowColor = coul; g.shadowBlur = 10; g.beginPath(); g.arc(cx, cy, R, Math.min(v0, v1), Math.max(v0, v1)); g.stroke(); g.shadowBlur = 0;
      g.lineWidth = 1; g.fillStyle = "rgba(255,255,255,.45)"; g.font = "9px ui-monospace,Menlo,monospace"; g.textAlign = "center";
      [-100, -50, 0, 50, 100].forEach(c => { const a2 = ang(c); g.strokeStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.moveTo(cx + Math.cos(a2) * (R + 6), cy + Math.sin(a2) * (R + 6)); g.lineTo(cx + Math.cos(a2) * (R + 11), cy + Math.sin(a2) * (R + 11)); g.stroke();
        g.fillText((c > 0 ? "+" : "") + c, cx + Math.cos(a2) * (R + 20), cy + Math.sin(a2) * (R + 20) + 3); });
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(v1) * (R - 10), cy + Math.sin(v1) * (R - 10)); g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
      // la note visee au centre, et ce qui est chante
      const juste = d && d.m > 0 && d.c;
      g.fillStyle = juste ? "#fff" : "rgba(255,255,255,.35)"; g.font = "700 30px ui-monospace,Menlo,monospace";
      g.fillText(juste ? NOTES_EN[((Math.round(d.c) % 12) + 12) % 12] + (Math.floor(Math.round(d.c) / 12) - 1) : "—", cx, cy - R * .38);
      g.font = "9.5px ui-monospace,Menlo,monospace"; g.fillStyle = "rgba(255,255,255,.5)";
      g.fillText(juste ? `correction ${corr > 0 ? "+" : ""}${Math.round(corr)} ct` : (joueStudio() ? "en attente de voix" : "Lance la lecture"), cx, cy - R * .38 + 16);
      g.textAlign = "left";
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
    if (e.target.closest("#dawReplier")) { pan.classList.toggle("ferme"); setTimeout(() => { dessiner(); visualiser(); }, 50); return; }
    const ouv = e.target.closest("[data-ouvrir]");
    if (ouv && !e.target.closest("[data-fxon]")) { fxOuvert = ouv.dataset.ouvrir; panneau(); reglerTout(); return; }
    const sg = e.target.closest("[data-seg]");
    if (sg) { const sel = sg.parentElement.querySelector("select"); sel.value = sg.dataset.seg;
      sg.parentElement.querySelectorAll("[data-seg]").forEach(b => b.setAttribute("aria-pressed", String(b === sg))); sel.dispatchEvent(new Event("change", { bubbles: true })); return; }
    const tg = e.target.closest("[data-tg]");
    if (tg) { const c = tg.querySelector("input"); c.checked = !c.checked; tg.setAttribute("aria-pressed", String(c.checked)); c.dispatchEvent(new Event("change", { bubbles: true })); return; }
    if (e.target.closest("[data-aide]")) { e.target.closest(".plug").classList.toggle("aide-on"); return; }
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
    else if (a === "sauverFichier") sauverFichierProjet(P.prod);
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
    else if (t.dataset.atsel) {
      const a = p.fx.autotune, val = t.value; memoriser(); a.clavier = "";
      if (t.dataset.atsel === "cle") {
        if (val === "auto") { if (a.type === "cle") a.type = "prod"; }
        else { a.tonique = val; if (a.type === "prod") a.type = "cle"; }
      } else {
        if (val === "chroma" || val === "libre") a.type = val;
        else {
          // une gamme precise : la tonalite devient fixe (celle de la prod si on etait en auto)
          if (a.type === "prod") { const c = lireCle(prod && prod.key); if (c) a.tonique = String(c.tonique); }
          a.gamme = val; a.type = "cle";
        }
      }
      p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver(); panneau(); return;
    }
    else if (t.dataset.fxmenu) { const [k, c] = t.dataset.fxmenu.split("."); memoriser(); p.fx[k][c] = t.value;
      if (c === "tonique" || c === "gamme") { p.fx[k].cleChoisie = true; p.fx[k].clavier = ""; p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver(); panneau(); return; } }
    else if (t.dataset.fxcase) { const [k, c] = t.dataset.fxcase.split("."); memoriser(); p.fx[k][c] = t.checked; }
    else if (t.dataset.act === "import") { importer(t.files[0]); return; }
    else if (t.dataset.act === "ouvrirFichier") { if (t.files[0]) ouvrirFichierProjet(t.files[0]); t.value = ""; return; }
    else return;
    p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver();
    const k = (t.dataset.fxtype || t.dataset.fxdiv || (t.dataset.fxcase || t.dataset.fxmenu || "").split(".")[0]), r = corps.querySelector(`[data-resume="${k}"]`); if (r) r.textContent = resume(k, p.fx[k]);
  });
  /* hauteur du panneau : la poignee se tire, la hauteur est retenue d'une visite a l'autre */
  const poignee = $("dawPoignee");
  let hautPan = (() => { try { return +localStorage.getItem("findings.studio.panneau") || 0; } catch (e) { return 0; } })();
  const appliquerHaut = () => { if (hautPan) { corps.style.height = hautPan + "px"; corps.style.maxHeight = "none"; } else { corps.style.height = ""; corps.style.maxHeight = ""; } };
  const limiteHaut = () => Math.max(120, el.clientHeight - (el.querySelector(".daw-haut")?.offsetHeight || 60) - (el.querySelector(".dp-onglets")?.offsetHeight || 36) - 10 - 150);
  appliquerHaut();
  poignee.addEventListener("pointerdown", e => {
    e.preventDefault(); try { poignee.setPointerCapture(e.pointerId); } catch (er) {}
    const y0 = e.clientY, h0 = pan.classList.contains("ferme") ? 0 : corps.offsetHeight;
    poignee.classList.add("tire"); el.classList.add("redim");
    const bouge = ev => {
      const h = h0 + (y0 - ev.clientY);
      if (h < 60) { pan.classList.add("ferme"); return; }     // tire tout en bas : le panneau se replie
      pan.classList.remove("ferme");
      hautPan = Math.round(clamp(h, 120, limiteHaut())); appliquerHaut();
    };
    const fin = () => {
      poignee.classList.remove("tire"); el.classList.remove("redim");
      poignee.removeEventListener("pointermove", bouge); poignee.removeEventListener("pointerup", fin); poignee.removeEventListener("pointercancel", fin);
      try { localStorage.setItem("findings.studio.panneau", String(hautPan)); } catch (e) {}
      dessiner(); visualiser();
    };
    poignee.addEventListener("pointermove", bouge); poignee.addEventListener("pointerup", fin); poignee.addEventListener("pointercancel", fin);
  });
  /* Hauteur du studio integre a la page : toute la fenetre sous l'en-tete, moins le lecteur du
     bas seulement quand il est affiche. Le panneau des effets reste borne a la place restante
     (les pistes gardent leur minimum) : rien n'est jamais coupe. */
  function ajusterHauteur(){
    if (!ouvert || !el.classList.contains("inline") || document.fullscreenElement === el) return;
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh")) || 96;
    const bar = document.getElementById("bar"), bv = bar && bar.classList.contains("up") ? bar.getBoundingClientRect() : null;
    const bas = bv && bv.height ? Math.max(0, window.innerHeight - bv.top) + 10 : 8;
    const h = Math.max(460, Math.round(window.innerHeight - hh - 8 - bas));
    if (el.style.height !== h + "px") el.style.height = h + "px";
    const lim = limiteHaut();
    if (hautPan > lim) { hautPan = lim; appliquerHaut(); }
    // sans hauteur choisie, le panneau prend la moitie du studio (dans la limite) : une hauteur
    // definie, que l'ecran du plug-in remplit au lieu d'etre coupe
    corps.style.maxHeight = "none";
    corps.style.height = (hautPan || Math.max(120, Math.min(lim, Math.round(el.clientHeight * .5)))) + "px";
  }
  window.addEventListener("resize", ajusterHauteur);
  setInterval(ajusterHauteur, 400);   // le lecteur du bas apparait / disparait avec la lecture
  poignee.addEventListener("dblclick", () => { pan.classList.toggle("ferme"); setTimeout(() => { dessiner(); visualiser(); }, 50); });
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
    const ach = $("dawAcheter"), url = prod && !estLibre() && prod.buy;
    ach.hidden = !url; if (url) ach.href = url;
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
  // changement de theme : les formes d'onde (dessinees une fois) suivent
  new MutationObserver(() => { if (ouvert && P) dessiner(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
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
    page, importer, supprimerProjet, renommerProjet, sauverFichierProjet, ouvrirFichierProjet,
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
