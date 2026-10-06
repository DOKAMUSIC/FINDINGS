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
  .daw{
    position:fixed;z-index:58;left:12px;right:12px;top:12px;
    bottom:calc(var(--bar-h) + 30px + env(safe-area-inset-bottom,0px));
    display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;
    border-radius:var(--r-xl);background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);
    color:var(--ink);opacity:0;transform:translateY(12px) scale(.985);transition:opacity .2s,transform .24s cubic-bezier(.2,.9,.25,1.1);
    --hw:212px;--rh:82px;--lcd:#0B0C0F;--lcd-ink:#E9F7EE;--lcd-dim:#7E8A85;
  }
  .daw.on{opacity:1;transform:none}
  .daw.inline{position:relative;left:auto;right:auto;top:auto;bottom:auto;z-index:1;
    height:max(680px,calc(100vh - var(--hh,64px) - var(--bar-h) - 48px));box-shadow:var(--sh-2)}
  .daw.inline #dawFermer{display:none}
  .daw[hidden]{display:none}
  .daw button{color:inherit}
  /* ── barre du haut : identite | console de transport | outils ── */
  .daw-haut{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:16px;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surface-2)}
  .daw-id{min-width:0;display:grid;gap:1px}
  .daw-id .eyebrow{color:var(--accent);display:flex;align-items:center;gap:5px}
  .daw-id b{font-size:15px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-titre{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;padding:1px 6px;margin:0 -6px;border-radius:7px;color:inherit;text-align:left;cursor:text}
  .daw-titre svg{flex:0 0 auto;color:var(--dim);opacity:0;transition:opacity .15s}
  .daw-titre:hover{background:rgba(255,255,255,.07)}
  .daw-titre:hover svg,.daw-titre:focus-visible svg{opacity:1}
  .daw-titre-champ{font:700 15px/1.2 inherit;letter-spacing:-.02em;color:inherit;background:rgba(255,255,255,.08);border:1px solid var(--accent);border-radius:7px;padding:2px 6px;margin:-1px -6px;min-width:0;width:100%;outline:none}
  .daw-id span.info{font-size:11.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .daw-console{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:16px;background:var(--lcd);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 1px 2px rgba(0,0,0,.3);color:var(--lcd-ink)}
  .daw-b{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#D7DBE2;transition:background .12s,transform .12s}
  .daw-b:hover{background:rgba(255,255,255,.08)}
  .daw-b:active{transform:scale(.94)}
  .daw-b.lire{width:40px;height:40px;border-radius:12px;background:#F2F4F7;color:#0B0C0F;position:relative}
  /* prod YouTube en cours de chargement : le bouton lecture du studio tourne aussi */
  body.yt-charge .daw.yt-mode .daw-b.lire svg{opacity:0}
  body.yt-charge .daw.yt-mode .daw-b.lire::after{content:"";position:absolute;inset:0;margin:auto;width:18px;height:18px;border-radius:50%;
    border:2.4px solid currentColor;border-right-color:transparent;animation:yt-tourne .7s linear infinite}
  .daw-b.rec{color:#FF4D5E}
  .daw-b.rec.on{background:#FF2D45;color:#fff;animation:daw-pulse 1.1s ease-in-out infinite}
  @keyframes daw-pulse{50%{box-shadow:0 0 0 6px rgba(250,35,59,.25)}}
  .lcd{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:14px;padding:3px 12px;border-left:1px solid rgba(255,255,255,.08);border-right:1px solid rgba(255,255,255,.08);font-family:var(--mono);font-variant-numeric:tabular-nums}
  .lcd-t{grid-row:1/3;font-size:24px;font-weight:600;letter-spacing:-.02em;align-self:center;min-width:104px}
  .lcd-m,.lcd-b{font-size:11px;color:var(--lcd-dim);text-align:right}
  .lcd-m b{color:var(--lcd-ink);font-weight:600}
  .daw-niv{width:8px;height:34px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;display:flex;align-items:flex-end}
  .daw-niv i{display:block;width:100%;height:100%;transform-origin:bottom;transform:scaleY(0);background:linear-gradient(0deg,#34C759,#FFD60A 70%,#FF453A)}
  .daw-outils{display:flex;align-items:center;justify-content:flex-end;gap:3px;flex-wrap:wrap}
  .daw-o{height:34px;min-width:34px;padding:0 9px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink-2)}
  .daw-o:hover{background:var(--hover)}
  .daw-o[disabled]{opacity:.35;pointer-events:none}
  .daw-o[aria-pressed="true"]{background:var(--accent-soft);color:var(--accent)}
  .daw-o.pri{background:var(--accent);color:#fff;padding:0 14px}
  .daw-zoom{display:flex;align-items:center;gap:6px;color:var(--dim);margin:0 4px}
  .daw-zoom input{width:84px;accent-color:var(--accent)}
  .daw-sep{width:1px;height:22px;background:var(--line);margin:0 3px}
  /* ── zone des pistes ── */
  .daw-zone{position:relative;overflow:auto;overscroll-behavior:contain;background:var(--bg)}
  .daw-grille{position:relative;min-height:100%}
  .daw-ligne{display:flex;min-height:var(--rh);border-bottom:1px solid var(--line-soft)}
  .daw-coin,.daw-tete{position:sticky;left:0;z-index:4;width:var(--hw);flex:0 0 var(--hw);background:var(--surface);border-right:1px solid var(--line)}
  .daw-ligne.regle{position:sticky;top:0;z-index:6;min-height:28px;height:28px}
  .daw-coin{z-index:7;display:flex;align-items:center;padding:0 12px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dimmer)}
  .daw-regle{position:relative;height:28px;background:var(--surface);cursor:pointer;flex:0 0 auto;border-bottom:1px solid var(--line)}
  .daw-regle span{position:absolute;top:0;bottom:0;border-left:1px solid var(--line);padding:6px 0 0 5px;font-size:10.5px;font-weight:600;color:var(--dim);font-variant-numeric:tabular-nums;pointer-events:none}
  .daw-voie{position:relative;flex:0 0 auto;align-self:stretch;min-height:var(--rh);cursor:text;touch-action:pan-x pan-y;
    background-image:linear-gradient(to right,var(--line) 1px,transparent 1px),linear-gradient(to right,var(--line-soft) 1px,transparent 1px);
    background-size:var(--mesure) 100%,var(--temps) 100%}
  .daw-ligne.sel-piste .daw-voie{background-color:color-mix(in srgb,var(--pc) 6%,transparent)}
  /* ── en-tetes de piste ── */
  .daw-tete{display:grid;align-content:center;gap:7px;padding:8px 12px 8px 16px;cursor:pointer;position:sticky}
  .daw-tete::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--pc)}
  .daw-ligne.sel-piste .daw-tete{background:color-mix(in srgb,var(--pc) 9%,var(--surface))}
  .daw-tete .t1{display:flex;align-items:center;gap:7px;min-width:0}
  .daw-tete .nom{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .daw-tete .cible{font-size:9px;font-weight:800;letter-spacing:.06em;color:#fff;background:var(--accent);border-radius:4px;padding:1px 5px;flex:0 0 auto}
  .daw-tete .t2{display:flex;align-items:center;gap:5px}
  .daw-ms{width:24px;height:22px;border-radius:6px;font-size:10.5px;font-weight:800;background:var(--hover);color:var(--dim)}
  .daw-ms.m[aria-pressed="true"]{background:#FF9F0A;color:#111}
  .daw-ms.s[aria-pressed="true"]{background:#FFD60A;color:#111}
  .daw-fxb{height:22px;padding:0 7px;border-radius:6px;font-size:10.5px;font-weight:800;background:var(--hover);color:var(--dim);display:inline-flex;align-items:center;gap:4px}
  .daw-fxb.actif{background:color-mix(in srgb,var(--pc) 22%,transparent);color:color-mix(in srgb,var(--pc) 70%,var(--ink))}
  .vu{flex:1;height:6px;border-radius:3px;background:var(--hover);overflow:hidden;min-width:20px}
  .vu i{display:block;height:100%;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#34C759,#FFD60A 75%,#FF453A);transition:transform .05s linear}
  .daw-tete input[type=range]{width:100%;min-width:0;accent-color:var(--pc);height:14px;margin:0}
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
  /* ── regions ── */
  .clip{position:absolute;top:7px;bottom:7px;border-radius:9px;overflow:hidden;cursor:grab;touch-action:none;
    background:linear-gradient(180deg,color-mix(in srgb,var(--pc) 88%,#fff) 0 17px,color-mix(in srgb,var(--pc) 62%,#000) 17px);
    box-shadow:0 1px 2px rgba(0,0,0,.25),inset 0 0 0 1px rgba(0,0,0,.18)}
  .clip:active{cursor:grabbing}
  .clip.sel{box-shadow:0 0 0 2px var(--ink),0 6px 18px rgba(0,0,0,.3);z-index:2}
  .clip canvas{position:absolute;left:0;top:18px;height:calc(100% - 20px);pointer-events:none}
  .clip .clip-nom{position:absolute;left:20px;top:2px;right:20px;font-size:10.5px;font-weight:800;color:rgba(0,0,0,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
  .clip .poignee{position:absolute;top:0;bottom:0;width:9px;cursor:ew-resize;z-index:2}
  .clip .poignee.g{left:0} .clip .poignee.d{right:0}
  .clip .poignee::after{content:"";position:absolute;top:50%;width:3px;height:22px;margin-top:-11px;border-radius:2px;background:rgba(255,255,255,.75);opacity:0;transition:opacity .12s}
  .clip .poignee.g::after{left:3px} .clip .poignee.d::after{right:3px}
  .clip:hover .poignee::after,.clip.sel .poignee::after{opacity:1}
  .clip .fondu{position:absolute;top:3px;width:11px;height:11px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.45);cursor:ew-resize;z-index:3;opacity:0;transition:opacity .12s}
  .clip:hover .fondu,.clip.sel .fondu{opacity:1}
  .clip.enreg{background:rgba(250,35,59,.3);box-shadow:inset 0 0 0 1px var(--accent);cursor:default}
  .clip.enreg .clip-nom{color:var(--accent)}
  .daw-curseur{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--accent);z-index:5;pointer-events:none;box-shadow:0 0 8px rgba(250,35,59,.5)}
  .daw-curseur::before{content:"";position:absolute;top:0;left:-6px;border:7px solid transparent;border-top:9px solid var(--accent)}
  /* ── panneau du bas : piste et effets | region | projet ── */
  .daw-pan{border-top:1px solid var(--line);background:var(--surface-2);display:grid;grid-template-rows:auto auto;min-height:0}
  .dp-onglets{display:flex;align-items:center;gap:2px;padding:6px 10px 0;border-bottom:1px solid var(--line-soft)}
  .dp-onglets button{height:32px;padding:0 13px;border-radius:9px 9px 0 0;font-size:12.5px;font-weight:650;color:var(--dim);position:relative;display:inline-flex;align-items:center;gap:7px}
  .dp-onglets button[aria-selected="true"]{color:var(--ink);background:var(--surface)}
  .dp-onglets button[aria-selected="true"]::after{content:"";position:absolute;left:10px;right:10px;bottom:0;height:2px;border-radius:2px;background:var(--pc,var(--accent))}
  .dp-onglets .pastille{width:9px;height:9px;border-radius:50%;background:var(--pc,var(--accent))}
  .dp-onglets .esp{flex:1}
  .dp-onglets .replier{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--dim);padding:0}
  .dp-onglets .replier svg{transition:transform .2s}
  .daw-pan.ferme .replier svg{transform:rotate(180deg)}
  .daw-pan.ferme .dp-corps{display:none}
  .dp-corps{display:flex;gap:12px;padding:12px 14px 14px;overflow-x:auto;background:var(--surface);max-height:300px;scrollbar-width:thin}
  .dp-corps::-webkit-scrollbar{height:8px}
  .dp-corps::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px}
  .dp-bloc{flex:0 0 auto;display:grid;align-content:start;gap:10px;padding:12px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line-soft)}
  .dp-bloc h4{margin:0;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--dim)}
  .dp-bloc .champ{display:grid;gap:4px;font-size:11.5px;color:var(--dim);font-weight:600}
  .dp-bloc input[type=text],.dp-bloc select{height:30px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);padding:0 9px;font:inherit;font-size:12.5px;min-width:0}
  .dp-bloc .ligne{display:flex;gap:6px;flex-wrap:wrap}
  .dp-act{height:30px;padding:0 11px;border-radius:8px;background:var(--hover);font-size:12px;font-weight:650;color:var(--ink-2)}
  .dp-act:hover{background:var(--line)}
  .dp-act.danger{color:var(--accent);background:var(--accent-soft)}
  .dp-aide{font-size:12px;color:var(--dim);line-height:1.45;max-width:340px;margin:0}
  /* onglet effets : piste | rack de 8 cases | reglages de l'effet ouvert — tout tient sans defiler */
  .dp-corps.rack{display:grid;grid-template-columns:190px minmax(300px,1fr) minmax(320px,1.35fr);gap:12px;overflow:visible;max-height:none;align-items:start}
  .rk{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .rk-case{display:flex;align-items:center;gap:8px;min-width:0;padding:8px 10px;border-radius:11px;background:var(--surface-2);border:1px solid var(--line-soft);cursor:pointer;text-align:left;transition:border-color .12s,background .12s}
  .rk-case:hover{border-color:var(--line)}
  .rk-case.ouvert{border-color:var(--pc,var(--accent));background:color-mix(in srgb,var(--pc,var(--accent)) 8%,var(--surface-2))}
  .rk-case .txt{display:grid;min-width:0;flex:1}
  .rk-case b{font-size:12px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rk-case small{font-size:10.5px;color:var(--dim);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rk-case:not(.on) small{opacity:.55}
  .rk-case.on .fx-on{background:var(--pc,var(--accent))}
  .rk-case.on .fx-on::after{transform:translateX(12px)}
  .fxc.detail{min-height:100%}
  .fxc.detail .fx-boutons{flex-wrap:wrap;row-gap:10px}
  .fxc.detail header{justify-content:space-between}
  .fxc.detail .fx-titre{display:flex;align-items:center;gap:8px}
  .fxc .fx-aide{font-size:11.5px;color:var(--dim);margin:0;line-height:1.4}
  @media(max-width:1000px){ .dp-corps.rack{grid-template-columns:1fr 1fr} .dp-corps.rack .dp-bloc{grid-column:1/-1} }
  @media(max-width:640px){ .dp-corps.rack{grid-template-columns:1fr;max-height:300px;overflow-y:auto} }
  /* carte d'effet */
  .fxc{flex:0 0 auto;display:grid;align-content:start;gap:10px;padding:10px 12px 12px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line-soft);transition:border-color .15s,opacity .15s}
  .fxc header{display:flex;align-items:center;gap:8px;min-width:0}
  .fxc header b{font-size:12.5px;font-weight:750;white-space:nowrap}
  .fxc header select{height:24px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);font:inherit;font-size:11px;padding:0 4px}
  .fx-on{width:30px;height:18px;border-radius:9px;background:var(--line);position:relative;flex:0 0 auto;transition:background .15s}
  .fx-on::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s}
  .fxc.on{border-color:color-mix(in srgb,var(--pc,var(--accent)) 45%,transparent)}
  .fxc.on .fx-on{background:var(--pc,var(--accent))}
  .fxc.on .fx-on::after{transform:translateX(12px)}
  .fxc:not(.on) .fx-boutons{opacity:.45}
  .fx-boutons{display:flex;gap:6px;flex-wrap:nowrap}
  .fx-case{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:650;color:var(--dim);cursor:pointer}
  .fx-case input{accent-color:var(--pc,var(--accent))}
  /* bouton rotatif */
  .kn{width:58px;display:grid;justify-items:center;gap:1px;cursor:ns-resize;touch-action:none;user-select:none;outline:none;border-radius:10px;padding:2px 0}
  .kn:focus-visible{box-shadow:0 0 0 2px var(--accent)}
  .kn svg{width:42px;height:42px;overflow:visible}
  .kn .kn-fond{fill:none;stroke:var(--line);stroke-width:4;stroke-linecap:round}
  .kn .kn-val{fill:none;stroke:var(--pc,var(--accent));stroke-width:4;stroke-linecap:round}
  .kn .kn-cap{fill:var(--surface);stroke:var(--line);stroke-width:1}
  .kn .kn-ind{stroke:var(--ink);stroke-width:2.2;stroke-linecap:round}
  .kn .kn-v{font-family:var(--mono);font-size:10.5px;font-weight:600;color:var(--ink);white-space:nowrap}
  .kn .kn-n{font-size:10px;color:var(--dim);white-space:nowrap;max-width:62px;overflow:hidden;text-overflow:ellipsis}
  .daw-decompte{position:absolute;inset:0;z-index:20;display:grid;place-items:center;pointer-events:none;
    font-size:120px;font-weight:900;letter-spacing:-.05em;color:var(--accent);text-shadow:0 10px 40px rgba(250,35,59,.35)}
  .daw-decompte[hidden]{display:none}
  .daw-msg{position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:21;padding:8px 14px;border-radius:999px;
    background:var(--ink);color:var(--on-ink);font-size:12.5px;font-weight:600;box-shadow:var(--sh-2);white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis}
  .daw-msg[hidden]{display:none}
  body.daw-ouvert{overflow:hidden}
  @media(max-width:1100px){
    .daw-haut{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"id console" "outils outils"}
    .daw-id{grid-area:id} .daw-console{grid-area:console} .daw-outils{grid-area:outils;justify-content:flex-start}
  }
  @media(max-width:760px){
    .daw{left:6px;right:6px;top:6px;--hw:112px;--rh:72px;border-radius:18px}
    .daw-haut{grid-template-columns:1fr;grid-template-areas:"id" "console" "outils";gap:8px;padding:8px 10px}
    .daw-console{justify-content:space-between}
    .lcd-t{font-size:19px;min-width:84px}
    .daw-zoom input{width:60px}
    .daw-tete{padding:6px 6px 6px 10px}
    .daw-tete input[type=range],.daw-tete .vu{display:none}
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
    fermer:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    micro:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    loupe:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4M8.5 11h5"/></svg>',
    chevron:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  };
  document.body.insertAdjacentHTML("beforeend", `
  <div class="daw" id="daw" hidden role="dialog" aria-label="Studio">
    <div class="daw-haut">
      <div class="daw-id"><span class="eyebrow">${I.micro}Studio</span><button class="daw-titre" id="dawTitreBtn" title="Renommer le projet" aria-label="Renommer le projet"><b id="dawTitre"></b>${I.crayon}</button><span class="info" id="dawInfo"></span></div>
      <div class="daw-console">
        <button class="daw-b" id="dawDebut" title="Revenir au début (Entrée)" aria-label="Revenir au début">${I.debut}</button>
        <button class="daw-b lire" id="dawLire" title="Lecture / pause (Espace)" aria-label="Lecture ou pause">${I.lire}</button>
        <button class="daw-b rec" id="dawRec" title="Enregistrer au curseur (R)" aria-label="Enregistrer">${I.rec}</button>
        <div class="lcd" aria-live="off"><span class="lcd-t" id="dawTemps">0:00.0</span><span class="lcd-m">mes. <b id="dawMesure">1.1</b></span><span class="lcd-b" id="dawBpm">120 BPM</span></div>
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

  /* ─────────────────────────── effets ───────────────────────────
     Chaque piste a sa chaine complete, dans cet ordre : coupe-bas → egaliseur 3 bandes →
     compresseur → saturation → filtre → chorus/doubleur → panoramique → volume, puis deux
     departs paralleles : reverb (pre-delai, taille, brillance) et echo (cale sur le tempo,
     ping-pong). Un effet eteint est laisse a l'etat neutre, la chaine ne se reconstruit pas. */
  const FX = [
    { k: "hpf", nom: "Coupe-bas", p: [["freq", "Fréquence", 20, 400, 1, "Hz", 80]] },
    { k: "eq", nom: "Égaliseur", p: [["bas", "Graves", -15, 15, .5, "dB", 0], ["basF", "F. graves", 60, 500, 1, "Hz", 200],
      ["mid", "Médiums", -15, 15, .5, "dB", 0], ["midF", "F. médiums", 300, 5000, 10, "Hz", 1500], ["midQ", "Largeur", .3, 5, .1, "", 1],
      ["haut", "Aigus", -15, 15, .5, "dB", 0], ["hautF", "F. aigus", 2000, 14000, 50, "Hz", 7000]] },
    { k: "comp", nom: "Compresseur", p: [["seuil", "Seuil", -60, 0, 1, "dB", -20], ["ratio", "Ratio", 1, 20, .5, ":1", 4],
      ["attaque", "Attaque", 1, 100, 1, "ms", 6], ["relache", "Relâche", 20, 800, 5, "ms", 150], ["gain", "Gain", 0, 24, .5, "dB", 4]] },
    { k: "sat", nom: "Saturation", p: [["drive", "Chaleur", 0, 100, 1, "%", 35], ["mix", "Mélange", 0, 100, 1, "%", 50]] },
    { k: "filtre", nom: "Filtre", types: [["tel", "Téléphone"], ["radio", "Radio"], ["pb", "Passe-bas"], ["ph", "Passe-haut"]],
      p: [["freq", "Fréquence", 100, 12000, 10, "Hz", 1700], ["q", "Résonance", .3, 12, .1, "", 1.2]] },
    { k: "chorus", nom: "Chorus / doubleur", p: [["vitesse", "Vitesse", .1, 6, .05, "Hz", 1.1], ["profondeur", "Profondeur", 0, 100, 1, "%", 40], ["mix", "Mélange", 0, 100, 1, "%", 35]] },
    { k: "reverb", nom: "Réverb", p: [["taille", "Taille", .3, 8, .1, "s", 2.2], ["predelay", "Pré-délai", 0, 200, 1, "ms", 20],
      ["amorti", "Brillance", 800, 16000, 100, "Hz", 7000], ["mix", "Niveau", 0, 100, 1, "%", 25]] },
    { k: "delay", nom: "Écho", divisions: [["1/4", "1/4"], ["1/8p", "1/8 pointée"], ["1/8", "1/8"], ["1/16", "1/16"], ["1/4t", "1/4 triolet"]],
      p: [["retour", "Répétitions", 0, 90, 1, "%", 35], ["filtre", "Brillance", 500, 12000, 100, "Hz", 4000], ["mix", "Niveau", 0, 100, 1, "%", 20]], cases: [["pingpong", "Ping-pong"]] }
  ];
  const AIDE = {
    hpf: "Retire le grave inutile (souffle, pied de micro, plosives). À laisser sur presque toutes les voix.",
    eq: "Creuse ou renforce des zones : moins de « boue » vers 300–500 Hz, plus d'air dans les aigus.",
    comp: "Resserre les écarts de volume pour que la voix reste devant. Seuil bas = plus compressé.",
    sat: "Ajoute de la chaleur et du grain, comme un passage dans une console ou une bande.",
    filtre: "Coupe une partie du spectre : effet téléphone ou radio pour les ad-libs et les intros.",
    chorus: "Double et élargit la voix en stéréo : idéal pour les backs et les refrains.",
    reverb: "Place la voix dans une pièce. Taille = longueur de la queue, pré-délai = détache la voix.",
    delay: "Répète la voix en rythme, calé sur le tempo de la prod. Ping-pong = gauche puis droite."
  };
  const resume = (k, v) => ({
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
      if (f.divisions) o[f.k].division = "1/8p";
      (f.cases || []).forEach(([c]) => o[f.k][c] = true);
    }
    return o;
  };
  /* Des reglages de depart, comme les presets d'un vrai studio. */
  const PRESETS = {
    brut:    { nom: "Brut (aucun effet)", fx: {} },
    lead:    { nom: "Voix lead", fx: { hpf: { on: 1, freq: 90 }, eq: { on: 1, bas: -1.5, mid: -2, midF: 450, haut: 3 }, comp: { on: 1, seuil: -22, ratio: 4, gain: 5 },
               reverb: { on: 1, taille: 1.8, mix: 18 }, delay: { on: 1, division: "1/8p", retour: 25, mix: 10 } } },
    backs:   { nom: "Backs / chœurs", fx: { hpf: { on: 1, freq: 150 }, eq: { on: 1, bas: -4, haut: 2 }, comp: { on: 1, seuil: -24, ratio: 5, gain: 4 },
               chorus: { on: 1, profondeur: 55, mix: 45 }, reverb: { on: 1, taille: 2.8, mix: 32 } } },
    adlibs:  { nom: "Ad-libs", fx: { hpf: { on: 1, freq: 200 }, comp: { on: 1, seuil: -20, ratio: 6, gain: 5 }, delay: { on: 1, division: "1/8", retour: 45, mix: 28 }, reverb: { on: 1, taille: 2, mix: 22 } } },
    tel:     { nom: "Téléphone", fx: { hpf: { on: 1, freq: 300 }, filtre: { on: 1, type: "tel", freq: 1700, q: 1.4 }, sat: { on: 1, drive: 45, mix: 60 }, comp: { on: 1, seuil: -18, ratio: 6, gain: 6 } } },
    espace:  { nom: "Grand espace", fx: { hpf: { on: 1, freq: 120 }, reverb: { on: 1, taille: 5.5, predelay: 45, amorti: 5000, mix: 45 }, delay: { on: 1, division: "1/4", retour: 40, mix: 22 } } },
    chaud:   { nom: "Chaud et saturé", fx: { hpf: { on: 1, freq: 80 }, eq: { on: 1, bas: 2, haut: -1.5 }, sat: { on: 1, drive: 60, mix: 55 }, comp: { on: 1, seuil: -24, ratio: 3, gain: 4 } } }
  };
  const appliquerPreset = (p, cle) => {
    const def = FX_DEF();
    for (const f of FX) def[f.k].on = false;
    for (const [k, v] of Object.entries(PRESETS[cle].fx)) Object.assign(def[k], v, { on: !!v.on });
    p.fx = def; p.preset = cle;
  };
  /* Les projets d'avant (reverb, echo, graves, aigus, compresseur en simple bouton) gardent leur son. */
  function migrer(p){
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

  function impulsion(c, taille = 2.2){
    const sr = c.sampleRate, n = Math.max(1, Math.floor(sr * taille)), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * (i < sr * .012 ? i / (sr * .012) : 1);
    }
    return b;
  }
  const courbe = drive => {
    const k = drive / 100 * 40, n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
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
    n.hpf = F("highpass"); n.eqB = F("lowshelf"); n.eqM = F("peaking"); n.eqH = F("highshelf");
    n.comp = c.createDynamicsCompressor(); n.compG = G();
    n.satSec = G(); n.ws = c.createWaveShaper(); n.ws.oversample = "2x"; n.satHum = G(); n.satSom = G();
    n.filtre = F("allpass");
    n.chSec = G(); n.chHum = G(); n.chSom = G();
    n.chD1 = c.createDelay(.1); n.chD2 = c.createDelay(.1); n.chD1.delayTime.value = .012; n.chD2.delayTime.value = .017;
    n.osc = c.createOscillator(); n.oscG1 = G(); n.oscG2 = G(); n.osc.connect(n.oscG1); n.osc.connect(n.oscG2);
    n.oscG1.connect(n.chD1.delayTime); n.oscG2.connect(n.chD2.delayTime); n.osc.start();
    const p1 = c.createStereoPanner ? c.createStereoPanner() : G(), p2 = c.createStereoPanner ? c.createStereoPanner() : G();
    if (p1.pan) { p1.pan.value = -.7; p2.pan.value = .7; }
    n.pan = c.createStereoPanner ? c.createStereoPanner() : null;
    n.fader = G();
    n.mesure = c.createAnalyser ? c.createAnalyser() : null; if (n.mesure) n.mesure.fftSize = 512;
    // reverb : depart → pre-delai → convolution → brillance → retour
    n.revDep = G(); n.revPre = c.createDelay(.5); n.conv = c.createConvolver(); n.revLP = F("lowpass");
    // echo : deux lignes croisees pour le ping-pong
    n.dlyDep = G(); n.dA = c.createDelay(2.5); n.dB = c.createDelay(2.5); n.fbA = G(); n.fbB = G();
    n.lpA = F("lowpass"); n.lpB = F("lowpass");
    n.panA = c.createStereoPanner ? c.createStereoPanner() : G(); n.panB = c.createStereoPanner ? c.createStereoPanner() : G();
    // cablage
    n.entree.connect(n.hpf); n.hpf.connect(n.eqB); n.eqB.connect(n.eqM); n.eqM.connect(n.eqH); n.eqH.connect(n.comp); n.comp.connect(n.compG);
    n.compG.connect(n.satSec); n.compG.connect(n.ws); n.ws.connect(n.satHum); n.satSec.connect(n.satSom); n.satHum.connect(n.satSom);
    n.satSom.connect(n.filtre);
    n.filtre.connect(n.chSec); n.filtre.connect(n.chD1); n.filtre.connect(n.chD2);
    n.chD1.connect(p1); n.chD2.connect(p2); p1.connect(n.chHum); p2.connect(n.chHum);
    n.chSec.connect(n.chSom); n.chHum.connect(n.chSom);
    if (n.pan) { n.chSom.connect(n.pan); n.pan.connect(n.fader); } else n.chSom.connect(n.fader);
    n.fader.connect(b.master); if (n.mesure) n.fader.connect(n.mesure);
    n.fader.connect(n.revDep); n.revDep.connect(n.revPre); n.revPre.connect(n.conv); n.conv.connect(n.revLP); n.revLP.connect(b.master);
    n.fader.connect(n.dlyDep); n.dlyDep.connect(n.dA);
    n.dA.connect(n.fbA); n.fbA.connect(n.dB); n.dB.connect(n.fbB); n.fbB.connect(n.dA);
    n.dA.connect(n.lpA); n.lpA.connect(n.panA); n.panA.connect(b.master);
    n.dB.connect(n.lpB); n.lpB.connect(n.panB); n.panB.connect(b.master);
    return n;
  }
  const soloActif = () => P.pistes.some(p => p.solo);
  const offline = c => typeof OfflineAudioContext !== "undefined" && c instanceof OfflineAudioContext;
  const dB = v => Math.pow(10, v / 20);
  function regler(n, p, solo){
    const f = p.fx, c = n.c, on = k => f[k] && f[k].on;
    n.hpf.frequency.value = on("hpf") ? f.hpf.freq : 10;
    n.eqB.frequency.value = f.eq.basF; n.eqB.gain.value = on("eq") ? f.eq.bas : 0;
    n.eqM.frequency.value = f.eq.midF; n.eqM.Q.value = f.eq.midQ; n.eqM.gain.value = on("eq") ? f.eq.mid : 0;
    n.eqH.frequency.value = f.eq.hautF; n.eqH.gain.value = on("eq") ? f.eq.haut : 0;
    if (on("comp")) { n.comp.threshold.value = f.comp.seuil; n.comp.ratio.value = f.comp.ratio; n.comp.knee.value = 6;
      n.comp.attack.value = f.comp.attaque / 1000; n.comp.release.value = f.comp.relache / 1000; n.compG.gain.value = dB(f.comp.gain); }
    else { n.comp.threshold.value = 0; n.comp.ratio.value = 1; n.comp.knee.value = 0; n.compG.gain.value = 1; }
    if (on("sat")) {
      if (n.drive !== f.sat.drive) { n.ws.curve = courbe(f.sat.drive); n.drive = f.sat.drive; }
      const m = f.sat.mix / 100; n.satSec.gain.value = 1 - m; n.satHum.gain.value = m * (1 - f.sat.drive / 250);
    } else { n.satSec.gain.value = 1; n.satHum.gain.value = 0; }
    if (on("filtre")) {
      const t = f.filtre.type;
      n.filtre.type = t === "pb" ? "lowpass" : t === "ph" ? "highpass" : "bandpass";
      n.filtre.frequency.value = t === "radio" ? Math.min(f.filtre.freq, 2500) : f.filtre.freq;
      n.filtre.Q.value = t === "radio" ? Math.max(.5, f.filtre.q * .6) : f.filtre.q;
    } else n.filtre.type = "allpass";
    if (on("chorus")) {
      n.osc.frequency.value = f.chorus.vitesse;
      const d = f.chorus.profondeur / 100 * .006; n.oscG1.gain.value = d; n.oscG2.gain.value = -d;
      const m = f.chorus.mix / 100; n.chSec.gain.value = 1 - m * .5; n.chHum.gain.value = m;
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
  function liberer(n){ try { n.osc.stop(); } catch (e) {} try { n.fader.disconnect(); n.lpA.disconnect(); n.lpB.disconnect(); n.revLP.disconnect(); } catch (e) {} }
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
  const nouvellePiste = i => { const p = { id: nid(), nom: `Voix ${i + 1}`, vol: 1, pan: 0, mute: false, solo: false, fx: FX_DEF(), preset: "brut" }; return p; };
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
  const titreParDefaut = () => !prod ? "" : prod.id === "libre" ? (fichier ? fichier.nom.replace(/\.[a-z0-9]+$/i, "") : "Projet libre") : prod.title;
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
          <div class="t1"><span class="nom">${esc(p.nom)}</span>${pisteCible().id === p.id ? '<em class="cible" title="Les prochaines prises vont sur cette piste">REC</em>' : ""}</div>
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
    if (u === "Hz") return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} kHz` : `${Math.round(v)} Hz`;
    if (u === "dB") return `${v > 0 ? "+" : ""}${(+v).toFixed(Math.abs(v) < 10 && v % 1 ? 1 : 0)} dB`;
    if (u === "%") return `${Math.round(v)} %`;
    if (u === "ms") return `${Math.round(v)} ms`;
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
  function panneau(){
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
          <header><span class="fx-titre"><button class="fx-on" data-fxon="${f.k}" aria-pressed="${v.on}" aria-label="Activer ${esc(f.nom)}"></button><b>${esc(f.nom)}</b></span>
            ${f.types ? `<select data-fxtype="${f.k}">${f.types.map(([c, n]) => `<option value="${c}"${v.type === c ? " selected" : ""}>${n}</option>`).join("")}</select>` : ""}
            ${f.divisions ? `<select data-fxdiv="${f.k}" title="Durée de l'écho, calée sur le tempo">${f.divisions.map(([c, n]) => `<option value="${c}"${v.division === c ? " selected" : ""}>${n}</option>`).join("")}</select>` : ""}
          </header>
          <p class="fx-aide">${AIDE[f.k]}</p>
          <div class="fx-boutons">${f.p.map(([c, n, min, max, pas, u, d]) => bouton(`fx.${f.k}.${c}`, n, min, max, pas, u, v[c], d)).join("")}</div>
          ${(f.cases || []).map(([c, n]) => `<label class="fx-case"><input type="checkbox" data-fxcase="${f.k}.${c}"${v[c] ? " checked" : ""}>${n}</label>`).join("")}
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
  const inspecteur = panneau;
  pan.addEventListener("click", e => {
    const o = e.target.closest("[data-onglet]"); if (o) { onglet = o.dataset.onglet; pan.classList.remove("ferme"); panneau(); return; }
    if (e.target.closest("#dawReplier")) { pan.classList.toggle("ferme"); return; }
    const ouv = e.target.closest("[data-ouvrir]");
    if (ouv && !e.target.closest("[data-fxon]")) { fxOuvert = ouv.dataset.ouvrir; panneau(); return; }
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
    if (t.dataset.fxtype || t.dataset.fxdiv) { memoriser(); p.fx[t.dataset.fxtype || t.dataset.fxdiv][t.dataset.fxtype ? "type" : "division"] = t.value; }
    else if (t.dataset.fxcase) { const [k, c] = t.dataset.fxcase.split("."); memoriser(); p.fx[k][c] = t.checked; }
    else if (t.dataset.act === "import") { importer(t.files[0]); return; }
    else return;
    p.preset = "perso"; const n = noeuds.get(p.id); if (n) regler(n, p, soloActif()); sauver();
    const k = (t.dataset.fxtype || t.dataset.fxdiv || (t.dataset.fxcase || "").split(".")[0]), r = corps.querySelector(`[data-resume="${k}"]`); if (r) r.textContent = resume(k, p.fx[k]);
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
    $("dawBpm").textContent = `${bpm()} BPM`;
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
      b.master.gain.value = P.master != null ? P.master : 1;
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
