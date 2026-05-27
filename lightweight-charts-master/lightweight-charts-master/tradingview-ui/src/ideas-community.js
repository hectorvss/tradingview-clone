// src/ideas-community.js
// Pantalla "Ideas de la comunidad" — Figma node 25:169732
// Réplica fiel del diseño de https://es.tradingview.com/ideas/ (variante 1440w por defecto).
// Export: createIdeasCommunity(mountEl, opts) -> { render, destroy }
// Ruta destino: #/ideas/recent

const ASSETS = '/assets/ideas-community';

// ============================================================
// Datos extraídos del Figma (cards Component 12, nodeIds 25:167744 .. 25:169031)
// Conservamos ticker, título, snippet, autor, fecha, sentiment, exchange, likes, comments
// y cuando aplica: editorsPick + duración (video).
// ============================================================
const CARDS = [
  // ---- TOP 3 (hero) ----
  { id:'EfrXaecE', symbol:'BTCUSD', exchange:'BITSTAMP', title:'Nueva prueba de Bitcoin antes de la continuación bajista', snippet:'BTCUSD se está recuperando después de una fuerte caída, pero la estructura en el marco de 2H aún no…', author:'Creed_exer', date:'Actualizado Mayo 25', sentiment:'short', comments:1, likes:3, hero:true },
  { id:'RihQvI0f', symbol:'BTCUSD', exchange:'BINANCE', title:'¿Puede ser esta la mejor oportunidad para unirse a BTC? BTCUSD', snippet:'Ayer recibimos una noticia muy optimista para el mercado: un posible fin de la guerra entre Estados…', author:'Luca_Cardenas_bussines', date:'hace 20 horas', sentiment:'long', comments:1, likes:3, hero:true },
  { id:'hcLJUQoO', symbol:'BTCUSDT', exchange:'BINANCE', title:'BITCOIN SE MUEVE EN FRACTALIDAD, CONOCE EL CONCEPTO', snippet:'​Macro (4H): Identificamos la dirección de la onda principal. ​Contexto (M15): Observamos cómo el precio…', author:'MMtraderoaxaca', date:'hace 16 horas', sentiment:'edu', comments:1, likes:11, hero:true },

  // ---- Grid (resto) ----
  { id:'RTPCVyl2', symbol:'GBPAUD', exchange:'FX', title:'Análisis de Mercado Forex 24/05 | XAUUSD, USDCAD, EURAUD, GBPAUD', snippet:'¡Hola Trader! En este video de Forex Trading, realizamos el seguimiento para los pares de divisas…', author:'yurianag_', date:'Mayo 25', sentiment:'video', editorsPick:true, video:true, duration:'12:18', comments:1, likes:2, isPair:true, pairFlags:['GB','AU'] },
  { id:'YFKtDRKS', symbol:'XAUUSD', exchange:'OANDA', title:'XAUUSD, Zona de gap por rellenar', snippet:'Confirmaciones 1-Gap 2-Estructura bajista en menores TF 3-Nivel de fibonacci 4-OB 5-Liquidez', author:'jhzfx', date:'hace 6 horas', sentiment:'short', likes:2 },
  { id:'xDXB6MV4', symbol:'XAUUSD', exchange:'OANDA', title:'Oro pierde fuerza, pero mantiene sesgo alcista vigente', snippet:'Para esta semana, el score del oro en MacroQuantiva ha mostrado una pérdida de fuerza en comparación con…', author:'MacroQuantiva', date:'hace 18 horas', sentiment:'edu', video:true, duration:'04:26', likes:3 },
  { id:'2OUq8W98', symbol:'XAUUSD', exchange:'OANDA', title:'Análisis del Oro y Estrategia de Trading | 25 de mayo', snippet:'🌐¡Hola, traders! Soy Jack Blackwell, con 15 años de experiencia en análisis y trading en los mercados de oro', author:'GoldTrend_Master', date:'Mayo 24', sentiment:'noSent', editorsPick:true, comments:3, likes:17 },
  { id:'EwmfprM5', symbol:'GBPJPY', exchange:'FX', title:'GBPJPY: Mantiene la estructura alcista, objetivo 215.026', snippet:'El par GBP/JPY cotiza actualmente alrededor de 214.105, tras una buena recuperación desde la zona de…', author:'Elaria_Beautiful', date:'Mayo 25', sentiment:'long', likes:4, isPair:true, pairFlags:['GB','JP'] },
  { id:'2uv5XK60', symbol:'XAUUSD', exchange:'OANDA', title:'Análisis del Oro y Estrategia de Trading | 26 de mayo', snippet:'🌐¡Hola, traders! Soy Jack Blackwell, con 15 años de experiencia en análisis y trading en los mercados de oro', author:'GoldTrend_Master', date:'hace 14 horas', sentiment:'noSent', likes:3 },
  { id:'59qAMLs5', symbol:'BTCUSDT', exchange:'BINANCE', title:'Para mi seguimos subien y es buena idea de LONGS', snippet:'Ok, ya casi empieza el valle rojo en 1h, lo cual es interesante entradas en long con el ADX para abajo, y…', author:'mrcriptonitetv', date:'hace 10 horas', sentiment:'long', likes:3 },
  { id:'H5xrojT0', symbol:'XAUUSD', exchange:'FOREXCOM', title:'oro 25 de mayo 2026', snippet:'oro- tenemos una fuerza alcista fuerte el cual queremos tratar de montarnos en compra pero necesitamos que vuelva a las mejores zonas de compras, por ahora para', author:'carloslperdomo', date:'Actualizado hace 9 horas', sentiment:'edu', video:true, duration:'13:31', likes:3 },
  { id:'OatwpnBY', symbol:'BTCUSD', exchange:'VANTAGE', title:'BTC frente a un bloque de órdenes bajista antes una posible caíd', snippet:'Bitcoin está probando actualmente una importante zona de bloque de órdenes bajista entre 77,300 y 77,800…', author:'fullpriceaction', date:'hace 20 horas', sentiment:'short', likes:4 },
  { id:'kruROG1P', symbol:'XAUUSD', exchange:'OANDA', title:'XAUUSD: La línea de tendencia bajista bajo presión', snippet:'El tercer gráfico muestra que el XAUUSD aún se encuentra por debajo de la principal línea de tendencia', author:'Elaria_Beautiful', date:'hace 23 horas', sentiment:'long', comments:1, likes:3 },
  { id:'HYBQwAYU', symbol:'BTCUSD', exchange:'CRYPTO', title:'BTC está justo en una zona importante.', snippet:'Para mí la clave es que mientras el precio aguante la línea azul, el escenario alcista sigue teniendo sentido y no descartaría ver nuevos máximos, con la zona de 130K', author:'Efe_Efe', date:'Mayo 24', sentiment:'noSent', comments:1, likes:10 },
  { id:'J4BRNCdu', symbol:'XAUUSD', exchange:'FOREXCOM', title:'Mentalidad y habilidades técnicas van de la mano: Perspectivas d', snippet:'Mentalidad y habilidades técnicas van de la mano: Perspectivas del mercado del oro y estrategias de…', author:'Xau_Annika', date:'Actualizado Mayo 24', sentiment:'short', editorsPick:true, comments:3, likes:7 },
  { id:'nwGXbLFI', symbol:'DXY', exchange:'TVC', title:'Ciclo de Distribución en DXY', snippet:'Evidentemente vemos una lateralización donde la apertura de la última semana de Mayo abrió con un fuerte movimiento bajista generando el bajo + bajo en', author:'AriAdrianou', date:'Mayo 25', sentiment:'short', likes:1 },
  // ---- Cards adicionales 17-23 (nodos Figma 25:168705 .. 25:169031, datos extraídos exactos) ----
  { id:'nfLvZze5', symbol:'XAUUSD', exchange:'CAPITALCOM', title:'XAUUSD - Venta', snippet:'VENTA PENDIENTE 4569.09 En este papel podemos observar un rango de consolidación, sin embargo podemos ver mas a detalle. - Rango alcista. - Apertura…', author:'JFx_97', date:'Actualizado hace 8 horas', sentiment:'short', comments:1 },
  { id:'KtIo7zTq', symbol:'XAUUSD', exchange:'OANDA', title:'Los Toros del Oro Siguen Comprando la Trampa XAUUSD 25/05', snippet:'XAUUSD continúa respetando la estructura bajista más amplia en H1 después de no lograr recuperar la región…', author:'Adrian_NovaTrader', date:'Actualizado hace 20 horas', sentiment:'short', comments:2 },
  { id:'doGQtndH', symbol:'DXY', exchange:'TVC', title:'INDICE DOLAR. DXY', snippet:'El DXY lleva meses engañando a la mayoría. Mientras todos gritan "fin del dólar"… el mercado empieza a susurrar otra cosa. La estructura correctiva parece…', author:'YieldBlade-YF', date:'Mayo 25', sentiment:'noSent', comments:3 },
  { id:'5nOTsRHG', symbol:'XAUUSD', exchange:'OANDA', title:'EL GAP DE ALIVIO', snippet:'📊 CONTEXTO DEL MERCADO 📍 Precio actual: 4564 🕊️ Catalizador: posibles acuerdos con Irán 📉 Resultado: 👉 caída del miedo geopolítico 👉 presión bajista…', author:'osegura2475', date:'Actualizado hace 9 horas', sentiment:'noSent', comments:1 },
  { id:'x1ZaqctF', symbol:'GOLD', exchange:'TVC', title:'Apertura Alcista con Tendencia Bajista Dominante', snippet:'El fin de semana se produjo una noticia importante: las tensiones entre Estados Unidos e Irán se han relajado, y…', author:'Sisnxj-', date:'Actualizado hace 13 horas', sentiment:'short', comments:3 },
  { id:'TmoKEjhd', symbol:'EURUSD', exchange:'FX', title:'EURUSD, Zona de demandas para compras', snippet:'Confirmaciones 1-Zona de demandas 2-Estructura alcista 3-FVG 1D 4-Imbalance 5-Pullback', author:'jhzfx', date:'Mayo 25', sentiment:'long', comments:7, isPair:true, pairFlags:['EU','US'] },
  { id:'Eo5XgPqR', symbol:'GOLD', exchange:'TVC', title:'El precio del oro todavía se espera que descienda!', snippet:'El precio del oro todavía se espera que descienda! El oro actualmente se está comerciando alrededor de la…', author:'David_boss494', date:'Actualizado Mayo 24', sentiment:'short', comments:4 }
];

// Pills de categoría (top, ids 25:167616 .. 25:167630)
const PILLS = [
  { label:'Populares', active:true },
  { label:'Selecciones de los editores' },
  { label:'Para usted' },
  { label:'Siguiendo' },
  { label:'Solo vídeos' }
];

// Footer links (extraídos del nodo footer 25:169182)
const FOOTER_GROUPS = [
  { title:'Productos', links:['Supercharts','Pine Script™','Stock Screener','Forex Screener','Crypto Coins Screener','Crypto Pairs Screener','DEX Screener','Calendario económico','Calendario de ganancias','Trading'] },
  { title:'Empresa', links:['Sobre nosotros','Empleo','Manifiesto de marca','Sala de prensa','Testimonios','Atletas','Contáctenos'] },
  { title:'Comunidad', links:['Refiera a un amigo','Reglas y procedimientos','Centro de ayuda','Wiki','Soluciones para sitios web','Soluciones para corredores','Estatus del sitio','Política de seguridad','Privacidad','Términos de uso','Divulgaciones'] },
  { title:'Para empresas', links:['Anuncios','Soluciones para sitios web','Soluciones para corredores','Charting libraries'] }
];

const SOCIALS = ['Twitter','YouTube','Telegram','LinkedIn','Reddit','TikTok','Instagram','Facebook'];

// SVGs inline (icon set mínimo replicado del Figma)
const ICONS = {
  long: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><path d="M3 13 L9 5 L15 11"/><polyline points="11,5 15,5 15,9"/></svg>',
  short: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><path d="M3 5 L9 13 L15 7"/><polyline points="11,13 15,13 15,9"/></svg>',
  edu: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.6"><path d="M1.5 6 L9 2.5 L16.5 6 L9 9.5 Z"/><path d="M4.5 7.5 V12 C4.5 13 6.5 14 9 14 C11.5 14 13.5 13 13.5 12 V7.5"/></svg>',
  noSent: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="#dbdbdb" stroke-width="1.6"><circle cx="9" cy="9" r="6.5"/><path d="M5.5 7 L7 8.5 M5.5 8.5 L7 7 M11 7 L12.5 8.5 M11 8.5 L12.5 7 M5.5 12 Q9 10 12.5 12"/></svg>',
  video: '<svg viewBox="0 0 20 10" width="20" height="10" fill="#fff"><path d="M0 1 Q0 0 1 0 H12 Q13 0 13 1 V9 Q13 10 12 10 H1 Q0 10 0 9 Z M14 2 L20 0 V10 L14 8 Z"/></svg>',
  comment: '<svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="#dbdbdb" stroke-width="1.5"><path d="M5 7 H23 V19 H14 L9 23 V19 H5 Z"/></svg>',
  like: '<svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="#dbdbdb" stroke-width="1.5"><path d="M5 13 H9 L12 6 Q14 5 14 8 V12 H21 Q23 12 22 14 L20 21 Q19 23 17 23 H9 V13 Z"/></svg>',
  tvLogo: '<svg viewBox="0 0 20 10" width="20" height="10" fill="#fff"><path d="M0 0 H20 V3 H13 V10 H10 V3 H0 Z M2 5 L6 9 L9.5 5.5 L9.5 9 Z" fill-rule="evenodd"/></svg>',
  videoTriangle: '<svg viewBox="0 0 28 28" width="28" height="28" fill="#dbdbdb"><polygon points="9,6 22,14 9,22"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#dbdbdb" stroke-width="2"><circle cx="11" cy="11" r="6"/><line x1="16" y1="16" x2="21" y2="21"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#dbdbdb" stroke-width="1.8"><path d="M6 17 V11 Q6 6 12 6 Q18 6 18 11 V17 H20 V19 H4 V17 Z M10 21 Q12 23 14 21"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#dbdbdb" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21 Q4 14 12 14 Q20 14 20 21"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#dbdbdb" stroke-width="2"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
  list: '<svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="#dbdbdb" stroke-width="1.6"><line x1="6" y1="9" x2="22" y2="9"/><line x1="6" y1="14" x2="22" y2="14"/><line x1="6" y1="19" x2="22" y2="19"/></svg>',
  grid: '<svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="#dbdbdb" stroke-width="1.6"><rect x="6" y="6" width="7" height="7"/><rect x="15" y="6" width="7" height="7"/><rect x="6" y="15" width="7" height="7"/><rect x="15" y="15" width="7" height="7"/></svg>',
  chevronDown: '<svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="#dbdbdb" stroke-width="1.8"><polyline points="4,7 9,12 14,7"/></svg>',
  flag: (cc)=>`<div class="tvidea-flag tvidea-flag-${cc}">${cc}</div>`,
  avatar: (author)=>{
    // Deterministic color from author name -> hue circle with initial
    const name = String(author||'?');
    let h = 0; for(let i=0;i<name.length;i++){ h = (h*31 + name.charCodeAt(i)) >>> 0; }
    const hue = h % 360;
    const initial = name.replace(/[^A-Za-z0-9]/g,'').charAt(0).toUpperCase() || '?';
    return `<div class="tvidea-avatar" style="background:hsl(${hue},45%,40%)">${initial}</div>`;
  },
  ticker: (sym)=>{
    // simple monogram circle for the symbol logo
    const letter = sym.charAt(0);
    const color = sym.startsWith('BTC')?'#f7931a': sym.startsWith('ETH')?'#627eea': sym.startsWith('XAU')?'#d69a00': sym.startsWith('DXY')?'#1e88e9': sym.startsWith('NAS')?'#22ab94': sym.startsWith('SPX')?'#5b9cf6': '#4a4a4a';
    return `<div class="tvidea-ticker-mono" style="background:${color}">${letter}</div>`;
  }
};

const SENT_COLOR = { long:'#22ab94', short:'#f7525f', edu:'#2962ff', noSent:'transparent', video:'#2962ff' };
const SENT_LABEL = { long:'Largo', short:'Corto', edu:'Educación', noSent:'Sin sesgo', video:'Vídeo' };

// ============================================================
// CSS
// ============================================================
const CSS = `
.tvidea-root{position:absolute;inset:0;overflow:auto;background:#0f0f0f;color:#dbdbdb;font-family:'Inter','Roboto','Trebuchet MS',sans-serif;-webkit-font-smoothing:antialiased}
.tvidea-root *{box-sizing:border-box}

/* ---- TradingView header ---- */
.tvidea-header{position:sticky;top:0;z-index:50;height:56px;background:#0f0f0f;border-bottom:1px solid #2e2e2e;display:flex;align-items:center;gap:8px;padding:0 16px}
.tvidea-logo{display:flex;align-items:center;gap:8px;color:#fff;font-weight:700;font-size:18px;letter-spacing:.2px;cursor:pointer}
.tvidea-logo-mark{width:28px;height:28px;background:linear-gradient(135deg,#1e88e9 0%,#2962ff 100%);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-weight:800}
.tvidea-search{margin-left:8px;display:flex;align-items:center;gap:8px;background:#1e1e1e;border:1px solid #2e2e2e;border-radius:6px;padding:8px 12px;width:170px;color:#787b86;font-size:14px;cursor:pointer}
.tvidea-search:hover{background:#262626}
.tvidea-search-kbd{margin-left:auto;font-size:11px;background:#2e2e2e;padding:2px 6px;border-radius:3px;color:#a3a6af}
.tvidea-mainnav{display:flex;align-items:center;gap:2px;margin-left:12px}
.tvidea-mainnav-item{position:relative;padding:8px 12px;color:#dbdbdb;font-size:14px;font-weight:500;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:4px}
.tvidea-mainnav-item:hover{background:#1e1e1e;color:#fff}
.tvidea-header-right{margin-left:auto;display:flex;align-items:center;gap:6px}
.tvidea-header-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer}
.tvidea-header-icon:hover{background:#262626}
.tvidea-cta{padding:8px 14px;background:#2962ff;color:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.tvidea-cta:hover{background:#1e53e5}
.tvidea-cta-ghost{padding:8px 14px;background:transparent;color:#dbdbdb;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #4a4a4a}
.tvidea-cta-ghost:hover{background:#262626}

/* ---- Content wrap ---- */
.tvidea-page{max-width:1395px;margin:0 auto;padding:0 40px}
.tvidea-h1{font-family:'Inter',sans-serif;font-weight:600;font-size:56px;line-height:64px;color:#fff;text-align:center;margin:40px 0 24px}
.tvidea-pills{display:flex;justify-content:center;gap:16px;margin:0 0 32px;flex-wrap:wrap}
.tvidea-pill{height:48px;padding:0 24px;border-radius:24px;display:inline-flex;align-items:center;background:#2e2e2e;color:#dbdbdb;font-size:15.9px;font-weight:500;cursor:pointer;border:1px solid #2e2e2e;transition:background .12s}
.tvidea-pill:hover{background:#3d3d3d}
.tvidea-pill.is-active{background:#f0f3fa;color:#0f0f0f;border-color:#f0f3fa}

/* ---- Subtoolbar (filtros / segmented) ---- */
.tvidea-subbar{display:flex;align-items:center;justify-content:space-between;margin:0 0 24px;flex-wrap:wrap;gap:12px}
.tvidea-subbar-left,.tvidea-subbar-right{display:flex;align-items:center;gap:8px}
.tvidea-chip{height:34px;padding:0 12px;border-radius:6px;border:1px solid #4a4a4a;display:inline-flex;align-items:center;gap:6px;color:#dbdbdb;font-size:14px;background:transparent;cursor:pointer}
.tvidea-chip:hover{background:#1e1e1e}
.tvidea-segctrl{height:34px;background:#2e2e2e;border-radius:8px;padding:3px;display:inline-flex;gap:3px}
.tvidea-segctrl-btn{width:34px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:5px;cursor:pointer;background:transparent}
.tvidea-segctrl-btn.is-active{background:#4a4a4a;box-shadow:0 0 3px #0f0f0f}

/* ---- Cards grid ---- */
.tvidea-hero-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:0 0 32px}
.tvidea-hero-grid .tvidea-card-title{font-size:20px;line-height:26px}
.tvidea-section-divider{height:1px;background:#2e2e2e;margin:8px 0 24px}
.tvidea-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:0 0 32px}
.tvidea-card{position:relative;border-radius:16px;background:#131722;border:1px solid rgba(140,140,140,.18);overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .12s,border-color .12s}
.tvidea-card:hover{border-color:#3d3d3d;transform:translateY(-1px)}
.tvidea-card-preview{position:relative;aspect-ratio:406/228;background:#2e2e2e;border-radius:8px;margin:8px 8px 0;overflow:hidden;border:1px solid rgba(140,140,140,.2)}
.tvidea-card-img{position:absolute;inset:0;width:100%;height:104.9%;top:-2.46%;object-fit:cover}
.tvidea-card-corner-bl{position:absolute;left:8px;bottom:8px;display:flex;align-items:flex-end;gap:0;z-index:2}
.tvidea-card-corner-tl{position:absolute;left:8px;top:8px;z-index:2}
.tvidea-card-corner-br{position:absolute;right:8px;bottom:8px;z-index:2}
.tvidea-card-symbol{width:24px;height:24px;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.tvidea-ticker-mono{width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;border-radius:12px}
.tvidea-card-sent{margin-left:8px;width:24px;height:24px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.tvidea-card-editor{width:28px;height:32px;display:flex;align-items:center;justify-content:center;background:#2962ff;color:#fff;border-radius:0 0 8px 0;padding:9px 4px 13px}
.tvidea-card-duration{background:#3d3d3d;color:#dbdbdb;font-size:11px;font-weight:700;letter-spacing:.55px;padding:3px 8px;border-radius:4px;text-transform:uppercase}
.tvidea-card-video-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:24px;background:#2e2e2e;display:flex;align-items:center;justify-content:center;z-index:2}
.tvidea-card-pair{position:relative;width:24px;height:24px}
.tvidea-flag{position:absolute;width:16px;height:16px;border-radius:8px;background:#2e2e2e;color:#dbdbdb;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1.5px solid #2e2e2e}
.tvidea-flag-GB{background:#012169;color:#fff}
.tvidea-flag-JP{background:#fff;color:#bc002d}
.tvidea-flag-AU{background:#012169;color:#fff}
.tvidea-flag-EU{background:#003399;color:#fc0}
.tvidea-flag-US{background:#3c3b6e;color:#fff}
.tvidea-card-pair > .tvidea-flag:nth-child(1){right:0;top:0}
.tvidea-card-pair > .tvidea-flag:nth-child(2){right:8px;top:8px}

.tvidea-card-body{padding:12px 16px 8px;display:flex;flex-direction:column;flex:1;min-height:124px;max-height:124px}
.tvidea-card-title{font-family:'Roboto','Inter',sans-serif;font-weight:700;font-size:18px;line-height:24px;color:#dbdbdb;margin:8px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tvidea-card-snippet{font-family:'Roboto','Inter',sans-serif;font-weight:400;font-size:16px;line-height:24px;color:#dbdbdb;margin:8px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1}
.tvidea-card-footer{display:flex;align-items:center;min-height:48px;padding:0 8px 8px;gap:8px}
.tvidea-avatar{width:32px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;flex-shrink:0;font-family:'Roboto','Inter',sans-serif}
.tvidea-card-meta{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.tvidea-card-author{font-family:'Roboto',sans-serif;font-size:14px;line-height:18px;color:#dbdbdb;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.tvidea-card-author:hover{color:#fff}
.tvidea-card-date{font-family:'Roboto',sans-serif;font-size:13.8px;line-height:18px;color:#8c8c8c;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tvidea-card-actions{display:flex;gap:8px;align-items:flex-start}
.tvidea-card-actbtn{height:40px;padding:0 11px;border-radius:8px;border:1px solid transparent;background:transparent;color:#dbdbdb;display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:16px}
.tvidea-card-actbtn:hover{border-color:#4a4a4a;background:#1e1e1e}
.tvidea-card-actbtn--bordered{border-color:#4a4a4a}

/* ---- More + pagination ---- */
.tvidea-more{display:flex;justify-content:center;margin:8px 0 24px}
.tvidea-more-btn{height:48px;padding:0 24px;border-radius:8px;background:#2962ff;color:#fff;font-weight:600;font-size:14px;border:none;cursor:pointer}
.tvidea-more-btn:hover{background:#1e53e5}
.tvidea-pagination{display:flex;justify-content:center;align-items:center;gap:8px;margin:0 0 48px}
.tvidea-pagination a,.tvidea-pagination span{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;border-radius:6px;color:#dbdbdb;font-size:14px;text-decoration:none;cursor:pointer;padding:0 8px}
.tvidea-pagination a:hover{background:#2e2e2e}
.tvidea-pagination .is-active{background:#2962ff;color:#fff}

/* ---- Footer ---- */
.tvidea-footer{background:#0a0a0a;border-top:1px solid #2e2e2e;padding:48px 0 32px;color:#a3a6af}
.tvidea-footer-inner{max-width:1395px;margin:0 auto;padding:0 40px}
.tvidea-footer-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;gap:32px;flex-wrap:wrap}
.tvidea-footer-socials{display:flex;gap:12px;flex-wrap:wrap}
.tvidea-footer-social{width:36px;height:36px;border-radius:18px;background:#1e1e1e;display:flex;align-items:center;justify-content:center;color:#a3a6af;font-size:11px;cursor:pointer}
.tvidea-footer-social:hover{background:#2962ff;color:#fff}
.tvidea-footer-copy{font-size:13px;color:#787b86}
.tvidea-footer-links{display:grid;grid-template-columns:repeat(4,1fr);gap:32px}
.tvidea-footer-col h4{color:#dbdbdb;font-size:14px;font-weight:600;margin:0 0 12px}
.tvidea-footer-col ul{list-style:none;margin:0;padding:0}
.tvidea-footer-col li{font-size:13px;color:#a3a6af;padding:4px 0;cursor:pointer}
.tvidea-footer-col li:hover{color:#dbdbdb}

/* ---- Bottom dark panel ---- */
.tvidea-bottom{background:#050505;color:#787b86;padding:24px 0;font-size:12px;text-align:center;border-top:1px solid #1e1e1e}

/* ---- Right widget bar ---- */
.tvidea-widgetbar{position:fixed;right:0;top:56px;bottom:0;width:44px;background:#0a0a0a;border-left:1px solid #2e2e2e;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;z-index:40}
.tvidea-widgetbar-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:4px;cursor:pointer;color:#a3a6af}
.tvidea-widgetbar-btn:hover{background:#1e1e1e;color:#dbdbdb}

/* Page padding for widgetbar */
.tvidea-page{padding-right:60px}

@media (max-width:1100px){
  .tvidea-grid,.tvidea-hero-grid{grid-template-columns:repeat(2,1fr)}
  .tvidea-footer-links{grid-template-columns:repeat(2,1fr)}
}
@media (max-width:680px){
  .tvidea-grid,.tvidea-hero-grid{grid-template-columns:1fr}
  .tvidea-h1{font-size:34px;line-height:40px}
  .tvidea-page{padding:0 16px 0 16px}
  .tvidea-widgetbar{display:none}
}
`;

// ============================================================
// Helpers
// ============================================================
function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }

function renderSentChip(sent){
  if(sent==='noSent') return '';
  const bg = SENT_COLOR[sent] || '#4a4a4a';
  const ico = ICONS[sent] || '';
  return `<div class="tvidea-card-sent" style="background:${bg}" title="${SENT_LABEL[sent]||''}">${ico}</div>`;
}

function renderSymbolMark(card){
  if(card.isPair){
    const [a,b] = card.pairFlags;
    return `<a class="tvidea-card-pair" href="#" title="${card.exchange}:${card.symbol}">${ICONS.flag(a)}${ICONS.flag(b)}</a>`;
  }
  return `<a class="tvidea-card-symbol" href="#" title="${card.exchange}:${card.symbol}">${ICONS.ticker(card.symbol)}</a>`;
}

function renderCard(card){
  const imgSrc = `${ASSETS}/${card.id}.webp`;
  const editorTag = card.editorsPick ? `<div class="tvidea-card-corner-tl"><div class="tvidea-card-editor" title="Selección de los editores">${ICONS.tvLogo}</div></div>` : '';
  const videoPlay = card.video ? `<div class="tvidea-card-video-play">${ICONS.videoTriangle}</div>` : '';
  const duration = card.duration ? `<div class="tvidea-card-corner-br"><div class="tvidea-card-duration">${card.duration}</div></div>` : '';
  const sentChip = renderSentChip(card.sentiment);

  const comments = (typeof card.comments === 'number')
    ? `<button class="tvidea-card-actbtn" title="Comentarios">${ICONS.comment}<span style="margin-left:4px">${card.comments}</span></button>`
    : `<button class="tvidea-card-actbtn" title="Comentar">${ICONS.comment}</button>`;
  const likes = `<button class="tvidea-card-actbtn tvidea-card-actbtn--bordered" title="Me gusta">${ICONS.like}<span style="margin-left:4px">${card.likes ?? 0}</span></button>`;

  return `
    <article class="tvidea-card" data-card-id="${card.id}">
      <div class="tvidea-card-preview">
        <img class="tvidea-card-img" loading="lazy" src="${imgSrc}" alt="${card.symbol}"/>
        ${editorTag}
        ${videoPlay}
        ${duration}
        <div class="tvidea-card-corner-bl">
          ${renderSymbolMark(card)}
          ${sentChip}
        </div>
      </div>
      <div class="tvidea-card-body">
        <a class="tvidea-card-title" href="#">${escapeHtml(card.title)}</a>
        <p class="tvidea-card-snippet">${escapeHtml(card.snippet)}</p>
      </div>
      <div class="tvidea-card-footer">
        <a class="tvidea-avatar-link" href="#" title="${escapeHtml(card.author)}">${ICONS.avatar(card.author)}</a>
        <div class="tvidea-card-meta">
          <a class="tvidea-card-author" href="#">por ${escapeHtml(card.author)}</a>
          <div class="tvidea-card-date">${escapeHtml(card.date)}</div>
        </div>
        <div class="tvidea-card-actions">${comments}${likes}</div>
      </div>
    </article>`;
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ============================================================
// Page
// ============================================================
function buildHTML(){
  const pillsHtml = PILLS.map(p=>`<a class="tvidea-pill${p.active?' is-active':''}" href="#">${p.label}</a>`).join('');
  const heroCards = CARDS.filter(c=>c.hero);
  const gridCards = CARDS.filter(c=>!c.hero);
  const heroHtml = heroCards.map(renderCard).join('');
  const cardsHtml = gridCards.map(renderCard).join('');
  const footerCols = FOOTER_GROUPS.map(g=>`
    <div class="tvidea-footer-col">
      <h4>${g.title}</h4>
      <ul>${g.links.map(l=>`<li>${l}</li>`).join('')}</ul>
    </div>`).join('');
  const socialsHtml = SOCIALS.map(s=>`<a class="tvidea-footer-social" title="TradingView en ${s}" href="#">${s.slice(0,2).toUpperCase()}</a>`).join('');

  return `
  <div class="tvidea-root">
    <header class="tvidea-header">
      <div class="tvidea-logo"><div class="tvidea-logo-mark">TV</div><span>TradingView</span></div>
      <div class="tvidea-search">${ICONS.search}<span>Buscar</span><span class="tvidea-search-kbd">Ctrl K</span></div>
      <nav class="tvidea-mainnav">
        <div class="tvidea-mainnav-item">Productos ${ICONS.chevronDown}</div>
        <div class="tvidea-mainnav-item">Comunidad ${ICONS.chevronDown}</div>
        <div class="tvidea-mainnav-item">Mercados ${ICONS.chevronDown}</div>
        <div class="tvidea-mainnav-item">Brokers ${ICONS.chevronDown}</div>
        <div class="tvidea-mainnav-item">Más ${ICONS.chevronDown}</div>
      </nav>
      <div class="tvidea-header-right">
        <button class="tvidea-cta-ghost">Comience gratis</button>
        <div class="tvidea-header-icon">${ICONS.search}</div>
        <div class="tvidea-header-icon">${ICONS.bell}</div>
        <div class="tvidea-header-icon">${ICONS.menu}</div>
        <div class="tvidea-header-icon">${ICONS.user}</div>
      </div>
    </header>

    <main class="tvidea-page">
      <h1 class="tvidea-h1">Ideas de la comunidad</h1>
      <div class="tvidea-pills">${pillsHtml}</div>

      <div class="tvidea-subbar">
        <div class="tvidea-subbar-left">
          <button class="tvidea-chip">${ICONS.video}<span>Solo vídeos</span></button>
          <button class="tvidea-chip">Todas las publicaciones ${ICONS.chevronDown}</button>
          <button class="tvidea-chip">Todo el mundo ${ICONS.chevronDown}</button>
          <button class="tvidea-chip">Todos los símbolos ${ICONS.chevronDown}</button>
        </div>
        <div class="tvidea-subbar-right">
          <button class="tvidea-chip">Más recientes ${ICONS.chevronDown}</button>
          <div class="tvidea-segctrl">
            <div class="tvidea-segctrl-btn">${ICONS.list}</div>
            <div class="tvidea-segctrl-btn is-active">${ICONS.grid}</div>
          </div>
        </div>
      </div>

      <section class="tvidea-hero-grid">${heroHtml}</section>
      <div class="tvidea-section-divider"></div>
      <section class="tvidea-grid">${cardsHtml}</section>

      <div class="tvidea-more">
        <button class="tvidea-more-btn">Cargar más</button>
      </div>
      <div class="tvidea-pagination">
        <a>‹</a>
        <a class="is-active">1</a>
        <a>2</a><a>3</a><a>4</a><a>5</a><a>6</a><a>7</a><a>8</a><a>9</a><a>›</a>
      </div>
    </main>

    <footer class="tvidea-footer">
      <div class="tvidea-footer-inner">
        <div class="tvidea-footer-top">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div class="tvidea-logo-mark">TV</div>
              <strong style="color:#dbdbdb">TradingView</strong>
            </div>
            <div class="tvidea-footer-copy">Mira los mercados en tu propia manera. Únete a millones que ya lo hacen.</div>
          </div>
          <div class="tvidea-footer-socials">${socialsHtml}</div>
        </div>
        <div class="tvidea-footer-links">${footerCols}</div>
      </div>
    </footer>

    <div class="tvidea-bottom">© 2026 TradingView. Seleccione el idioma del mercado · Política de privacidad · Términos de uso</div>

    <aside class="tvidea-widgetbar" aria-label="Barra de widgets">
      <div class="tvidea-widgetbar-btn" title="Lista de seguimiento">${ICONS.list}</div>
      <div class="tvidea-widgetbar-btn" title="Alertas">${ICONS.bell}</div>
      <div class="tvidea-widgetbar-btn" title="Chats">${ICONS.comment}</div>
      <div class="tvidea-widgetbar-btn" title="Calendarios">📅</div>
      <div class="tvidea-widgetbar-btn" title="Notificaciones">${ICONS.bell}</div>
      <div class="tvidea-widgetbar-btn" title="Comunidad">👥</div>
      <div class="tvidea-widgetbar-btn" title="Ideas">💡</div>
      <div class="tvidea-widgetbar-btn" title="Productos">${ICONS.grid}</div>
    </aside>
  </div>`;
}

// ============================================================
// Public API
// ============================================================
export function createIdeasCommunity(mountEl, opts = {}){
  if(!mountEl) throw new Error('createIdeasCommunity: mountEl requerido');

  let styleEl = null;
  const handlers = [];

  function render(){
    destroy(); // idempotent

    styleEl = document.createElement('style');
    styleEl.setAttribute('data-tvidea','1');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    mountEl.innerHTML = buildHTML();

    // Pill interactivity
    const pills = mountEl.querySelectorAll('.tvidea-pill');
    const pillHandler = (e)=>{
      e.preventDefault();
      pills.forEach(p=>p.classList.remove('is-active'));
      e.currentTarget.classList.add('is-active');
    };
    pills.forEach(p=>{ p.addEventListener('click', pillHandler); handlers.push([p,'click',pillHandler]); });

    // Segmented control
    const segs = mountEl.querySelectorAll('.tvidea-segctrl-btn');
    const segHandler = (e)=>{
      segs.forEach(s=>s.classList.remove('is-active'));
      e.currentTarget.classList.add('is-active');
    };
    segs.forEach(s=>{ s.addEventListener('click', segHandler); handlers.push([s,'click',segHandler]); });

    // Card click -> stub (no-op, prevents anchors leaving the SPA)
    const cards = mountEl.querySelectorAll('.tvidea-card a, .tvidea-pagination a, .tvidea-mainnav-item, .tvidea-chip');
    const stopHandler = (e)=>{ if(e.currentTarget.tagName==='A') e.preventDefault(); };
    cards.forEach(c=>{ c.addEventListener('click', stopHandler); handlers.push([c,'click',stopHandler]); });

    return { destroy };
  }

  function destroy(){
    while(handlers.length){
      const [target,ev,fn] = handlers.pop();
      try{ target.removeEventListener(ev, fn); }catch(e){}
    }
    if(styleEl && styleEl.parentNode){ styleEl.parentNode.removeChild(styleEl); styleEl=null; }
    if(mountEl) mountEl.innerHTML = '';
  }

  return { render, destroy };
}

export default createIdeasCommunity;
