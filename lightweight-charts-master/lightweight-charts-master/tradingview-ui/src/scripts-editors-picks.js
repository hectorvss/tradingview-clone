// =============================================================================
// Indicadores y estrategias — Selecciones de los editores
// Frame: Figma 2QhXqtb66hdeKvlZAZE4fS · node 25-177804
// Hash route: #/scripts/editors-picks
// Exporta: createScriptsEditorsPicks(mount, opts) → { render(), destroy() }
//
// Iconos: Lucide (UI) + Simple Icons (socials) descargados a
//         /assets/scripts-editors-picks/icons/*.svg e inlined abajo.
// =============================================================================

const NS = 'tvscript';
const STYLE_ID = `${NS}-styles`;
const ASSETS = '/assets/scripts-editors-picks';

// -----------------------------------------------------------------------------
// Iconos inline (Lucide v0.x, viewBox 24)
// -----------------------------------------------------------------------------
const LU = (path, opts = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${opts}>${path}</svg>`;

const ICON = {
  thumbsUp:    LU('<path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path d="M7 10v12"/>'),
  comment:     LU('<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>'),
  flag:        LU('<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>'),
  more:        LU('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'),
  chevronDown: LU('<path d="m6 9 6 6 6-6"/>'),
  search:      LU('<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
  bookmark:    LU('<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>'),
  share:       LU('<path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>'),
  rocket:      LU('<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>'),
  grid:        LU('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>'),
  list:        LU('<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>'),
  check:       LU('<path d="M20 6 9 17l-5-5"/>'),
};

// Iconos sociales (Simple Icons — viewBox 24, fill currentColor)
const SI = (path) => `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
const SOCIAL = {
  x:         SI('<path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>'),
  facebook:  SI('<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>'),
  youtube:   SI('<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>'),
  instagram: SI('<path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.645.07-4.849.07s-3.584-.012-4.849-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311 1.265-.058 1.645-.07 4.848-.07M12 0C8.741 0 8.332.013 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.013 8.332 0 8.741 0 12s.013 3.668.072 4.948c.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.988 8.741 24 12 24s3.668-.013 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.059-1.28.072-1.689.072-4.948s-.013-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>'),
  linkedin:  SI('<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>'),
  tiktok:    SI('<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>'),
  telegram:  SI('<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>'),
  reddit:    SI('<path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>'),
};

// -----------------------------------------------------------------------------
// Datos exactos del Figma (24 tarjetas Component 11, listContainer 25:175898)
// -----------------------------------------------------------------------------
const CARDS = [
  { id:'HtOSLjaj', title:'Signal Forge [LuxAlgo]',                       author:'LuxAlgo',          desc:'The Signal Forge indicator is a modular technical analysis engine that allows users to blend 11 distinct technical filters into a unified signal and backtest the…', date:'hace 22 horas', comments:'4',   likes:'1.2 K' },
  { id:'RjkDXQnZ', title:'Synapse Trail Pro [WillyAlgoTrader]',          author:'WillyAlgoTrader',  desc:'◆ SYNAPSE TRAIL PRO — FREE & OPEN-SOURCE Synapse Trail Pro is an overlay indicator that fuses a ratcheted ATR trail, a 3-factor market regime engine, a 5-factor…', date:'hace 23 horas', comments:'12',  likes:'1.1 K' },
  { id:'xd9w3TqK', title:'ATR System + BlackFlag FTS KNN system',        author:'pioneea',          desc:'Fixed FTS notification errors and resolved KNN synchronization issues.', date:'hace 17 horas', comments:null, likes:'25' },
  { id:'dHMkXOME', title:'Session VWAP + StdDev Bands [ChartPrime]',     author:'ChartPrime',       desc:'🔶 OVERVIEW Session VWAP + StdDev Bands is a professional-grade anchored VWAP system that resets on a user-defined higher timeframe and builds a full…', date:'hace 21 horas', comments:null, likes:'686' },
  { id:'DBgT7UX4', title:'Kinetic Momentum Vectors [BigBeluga]',         author:'BigBeluga',        desc:'Kinetic Momentum Vectors is a high-performance analytical framework that reimagines price action as a physical system. By calculating the "mass" (volume) and…', date:'Mayo 25',      comments:'6',   likes:'446' },
  { id:'191j2Qnn', title:'Anchored Trend Channels [MQLSoftware]',        author:'MQLSoftware',      desc:'Anchored Trend Channels is a structural overlay that maps each phase of price action between confirmed swing points as its own parallel trend channel. Instead…', date:'Mayo 25',      comments:'8',   likes:'477' },
  { id:'roIjP2nR', title:"Entry Signal-(Brother's Academy)",             author:'Brothers_FX_Trading', desc:'Brother’s Academy is a Smart Money / Institutional Trading indicator designed to identify high probability BUY and SELL setups using trend confirmation, liquidity…', date:'Mayo 24',      comments:null, likes:'976' },
  { id:'iLnq4d8Q', title:'RSI LOESS',                                    author:'TobbySimard',      desc:'RSI LOESS - Volatility-Normalized Momentum Indicator with Adaptive Smoothing An advanced momentum oscillator that enhances traditional RSI by combining…', date:'Actualizado hace 18 horas', comments:null, likes:'116' },
  { id:'wi5ygfFH', title:'Twiggs Liquidity & Order Block Engine [MarkitTick]', author:'MarkitTick',  desc:'💡 Hybrid technical indicator designed to synthesize volume-weighted momentum with structural price…', date:'hace 22 horas', comments:null, likes:'111' },
  { id:'1ro4FL1E', title:'AetherEdge - APEX Swing Engine',               author:'AetherEdge',       desc:'🖊️ Overview APEX is a swing-reversal engine that captures market tops (swing highs) and bottoms (swing lows), routing BUY and SELL into a strictly alternating…', date:'Mayo 24',      comments:null, likes:'180' },
  { id:'7GGNEPIb', title:'TASET',                                        author:'OQ71',             desc:'Break of Structure (BOS) Order Blocks (OB) Liquidity Zones Fair Value Gaps (FVG)', date:'Mayo 24',      comments:null, likes:'149' },
  { id:'gEtRbSRQ', title:'CandelaCharts - Distributed Volume Matrix',    author:'CandelaCharts',    desc:'📝 Overview The Distributed Volume Matrix is an advanced volume profiling tool designed to provide a highly visual and granular breakdown of price-volume…', date:'Actualizado hace 23 horas', comments:null, likes:'59' },
  { id:'kQC2Rz10', title:'2GS Trading VWAP',                             author:'ChrisDicks77',     desc:"Anchored VWAP's as used within www.2gs-trading.com", date:'Actualizado hace 28 minutos', comments:null, likes:'72' },
  { id:'3Bngeixo', title:'[ A L P H A X ] VOID',                         author:'AlphaX-Trade',     desc:'AlphaX VOID — Fair Value Gap Confluence System: FVG Detection, 5-Layer Retest Entries, CE Rejection Filter & ATR Trailing Exit Engine AlphaX VOID is a professional-…', date:'Mayo 25',      comments:null, likes:'76' },
  { id:'k6LWvdJg', title:'Wyckoff Bar Evaluation',                       author:'Wyckoff_Avenu',    desc:'═══════════════════════════════════ ════════ WyBE 1.8.5 — Wyckoff Bar Evaluation ═══════════════════════════════════', date:'hace 15 horas', comments:'2', likes:'22' },
  { id:'XsASDEZX', title:'Wave Structure Projection Map',                author:'AlphaSTARTIX',     desc:'Wave Structure Projection Map Wave Structure Projection Map is a pivot-based structure analysis tool designed to organize swing highs, swing lows, ABC…', date:'hace 21 horas', comments:null, likes:'45' },
  { id:'x8zNFspu', title:'Air Pocket Profile [FEELS]',                   author:'FeelsStrategy',    desc:'Most volume tools show you where price has traded. This one also shows you where it has not — the thin zones price tends to move through quickly. Air Pocket…', date:'hace 18 horas', comments:null, likes:'41' },
  { id:'tF22td3U', title:'Mean Reversion Pro',                           author:'mounir438',        desc:'📊 Mean Reversion Pro — Data-Driven Edge on Any Market, Any Timeframe Most mean reversion indicators tell you the price is "too far" from the moving average.', date:'Mayo 24',      comments:null, likes:'92' },
  { id:'wqRZEaEg', title:'Supply Demand Volume Zones',                   author:'AlphaSTARTIX',     desc:'Supply Demand Volume Zones Supply Demand Volume Zones is a chart study designed to identify potential supply and demand areas using pivot-based price…', date:'Actualizado hace 19 horas', comments:null, likes:'39' },
  { id:'rLHG79gI', title:'Live Footprint Center Frame',                  author:'Lokka_Algo',       desc:'📊 Live Footprint Center Frame Live Footprint Center Frame is a footprint-style chart overlay designed to help traders study candle-by-candle volume behavior…', date:'hace 14 horas', comments:null, likes:'41' },
  { id:'LWHC2tNe', title:'Fibonacci Retracement Statistics by VolProfex',author:'VolProfex',        desc:'FIBONACCI RETRACEMENT STATISTICS BY VOLPROFEX ============================================= DESCRIPTION ----------- Fibonacci Retracement Statistics', date:'hace 16 horas', comments:null, likes:'30' },
  { id:'AfUuxK4D', title:'Liquidity Sweep Trap Zones',                   author:'AlphaSTARTIX',     desc:'Liquidity Sweep Trap Zones Liquidity Sweep Trap Zones is a liquidity-based market structure tool designed to detect swing high and swing low sweeps, possible stop-', date:'hace 22 horas', comments:null, likes:'39' },
  { id:'BECdPF4r', title:'Algo Torma ORB strategy',                      author:'AlgoTorma',        desc:'ORB Retest Strategy V5 This strategy uses an Opening Range Breakout (ORB) retest approach based on the first 5 minutes of market activity. The goal is to identify…', date:'hace 12 horas', comments:null, likes:'31' },
  { id:'P3RdNPEs', title:'Z-Score Oscillator',                           author:'B3AR_Trades',      desc:'Z-Score Oscillator is a statistical momentum tool that measures how far the current price is from its rolling mean in standard-deviation units, then optionally…', date:'hace 10 horas', comments:null, likes:'29' },
];

// Tabs del header (25:175845)
const TABS = [
  { label:'Populares',                  href:'#/',                  active:false },
  { label:'Selecciones de los editores',href:'#/',                  active:true  },
  { label:'Siguiendo',                  href:'#/',                  active:false },
];

const SOCIAL_LINKS = [
  { key:'x',         label:'X',         href:'https://twitter.com/tradingview'  },
  { key:'facebook',  label:'Facebook',  href:'https://facebook.com/tradingview' },
  { key:'youtube',   label:'YouTube',   href:'https://youtube.com/tradingview'  },
  { key:'instagram', label:'Instagram', href:'https://instagram.com/tradingview'},
  { key:'linkedin',  label:'LinkedIn',  href:'https://linkedin.com/company/tradingview' },
  { key:'telegram',  label:'Telegram',  href:'https://t.me/tradingview'         },
  { key:'tiktok',    label:'TikTok',    href:'https://tiktok.com/@tradingview'  },
  { key:'reddit',    label:'Reddit',    href:'https://reddit.com/r/tradingview' },
];

const CSS = `
.${NS}-root{background:#0f0f0f;color:#dbdbdb;font-family:'Roboto',Arial,Helvetica,sans-serif;min-height:100vh;overflow-x:hidden}
.${NS}-main{max-width:1395px;margin:0 auto;padding:0 40px}

.${NS}-header{padding:84px 0 0;display:flex;flex-direction:column;align-items:center;gap:24px}
.${NS}-h1{font-family:'Inter','Roboto',sans-serif;font-weight:600;font-size:55.3px;line-height:64px;color:#fff;margin:0;text-align:center}
.${NS}-tabs{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;width:100%}
.${NS}-tab{display:inline-flex;align-items:center;justify-content:center;height:48px;padding:0 23.8px;border-radius:24px;font-weight:500;font-size:15.9px;line-height:24px;color:#dbdbdb;background:#2e2e2e;border:1px solid #2e2e2e;text-decoration:none;cursor:pointer;white-space:nowrap}
.${NS}-tab.is-active{background:#f2f2f2;border-color:#f2f2f2;color:#0f0f0f}
.${NS}-tab:hover:not(.is-active){background:#3a3a3a}

.${NS}-container{padding:56px 0 0}

.${NS}-filters{display:flex;gap:12px;align-items:flex-start;justify-content:flex-end;padding-bottom:24px}
.${NS}-pill{display:inline-flex;align-items:center;height:34px;padding:0 8px 0 12px;border:1px solid #4a4a4a;border-radius:6px;color:#dbdbdb;font-size:15.5px;line-height:24px;background:transparent;cursor:pointer;gap:4px}
.${NS}-pill:hover{border-color:#707070}
.${NS}-pill svg{width:14px;height:14px;color:#b8b8b8;margin-left:4px}
.${NS}-pill-light{border:1px solid #f2f2f2;color:#fff;height:34px;padding:0 12px;display:inline-flex;align-items:center;gap:8px;border-radius:6px;cursor:pointer;background:transparent;font-size:16px;line-height:24px}
.${NS}-pill-light:hover{background:#1f1f1f}
.${NS}-pill-light .${NS}-chk{width:18px;height:18px;border-radius:3px;border:1.5px solid #f2f2f2;display:inline-flex;align-items:center;justify-content:center;color:#fff}
.${NS}-pill-light .${NS}-chk svg{width:12px;height:12px;stroke-width:3}
.${NS}-seg{display:flex;background:#2e2e2e;padding:3px;border-radius:8px;height:34px;gap:3px}
.${NS}-seg-btn{width:28px;height:28px;border:none;background:transparent;color:#b8b8b8;border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.${NS}-seg-btn svg{width:16px;height:16px;stroke-width:1.8}
.${NS}-seg-btn.is-active{background:#4a4a4a;color:#fff;box-shadow:0 0 3px #0f0f0f}

.${NS}-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.${NS}-card{background:transparent;border-radius:16px;display:flex;flex-direction:column;padding:8px;transition:background .15s}
.${NS}-card:hover{background:#171717}
.${NS}-thumb{position:relative;width:100%;aspect-ratio:406.34/228.56;border-radius:8px;overflow:hidden;background:#2e2e2e;border:1px solid rgba(140,140,140,.2)}
.${NS}-thumb img{position:absolute;inset:0;width:100%;height:104.92%;object-fit:cover;top:-2.46%;display:block}
.${NS}-thumb a.${NS}-thumb-link{position:absolute;inset:0;display:block;cursor:pointer;z-index:1}
.${NS}-corner{position:absolute;top:8px;right:8px;width:28px;height:28px;background:rgba(15,15,15,.6);backdrop-filter:blur(8px);border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;z-index:2;cursor:pointer;border:none}
.${NS}-corner svg{width:14px;height:14px;stroke-width:1.8}
.${NS}-corner:hover{background:rgba(15,15,15,.8)}

.${NS}-text{padding:12px 0;display:flex;flex-direction:column;gap:8px;max-height:124px;min-height:124px;overflow:hidden}
.${NS}-title{font-weight:700;font-size:18px;line-height:24px;color:#dbdbdb;text-decoration:none;display:block;max-height:48px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.${NS}-title:hover{color:#fff}
.${NS}-desc{font-size:16px;line-height:24px;color:#dbdbdb;max-height:72px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;text-decoration:none;cursor:pointer}

.${NS}-footer{display:flex;align-items:flex-start;height:40px;gap:8px}
.${NS}-meta{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0}
.${NS}-author{font-size:14px;line-height:18px;color:#dbdbdb;text-decoration:none;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.${NS}-author:hover{color:#fff}
.${NS}-date{font-size:13.8px;line-height:18px;color:#8c8c8c;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.${NS}-btns{display:flex;gap:7.8px;height:40px;align-items:flex-start}
.${NS}-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:40px;padding:0 11.8px;border-radius:8px;border:1px solid transparent;background:transparent;color:#dbdbdb;font-size:16px;line-height:24px;cursor:pointer;text-decoration:none;min-width:40px}
.${NS}-btn-outline{border-color:#4a4a4a;padding:0 15.8px 0 11.8px}
.${NS}-btn:hover{background:#1f1f1f}
.${NS}-btn svg{width:18px;height:18px;flex-shrink:0;stroke-width:1.8}

.${NS}-more{display:flex;justify-content:center;padding:40px 0 24px}
.${NS}-more-btn{height:40px;padding:0 24px;border-radius:8px;border:1px solid #4a4a4a;background:transparent;color:#dbdbdb;font-size:16px;cursor:pointer}
.${NS}-more-btn:hover{background:#1f1f1f}

.${NS}-pagination{display:flex;justify-content:center;align-items:center;gap:4px;padding:0 0 80px}
.${NS}-page{min-width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border:none;background:transparent;color:#dbdbdb;font-size:14px;border-radius:6px;cursor:pointer;text-decoration:none}
.${NS}-page:hover{background:#1f1f1f}
.${NS}-page.is-active{background:#2962ff;color:#fff}
.${NS}-page-dots{color:#8c8c8c;padding:0 4px;user-select:none}

.${NS}-darkpanel{background:#10131c;padding:80px 40px;margin-top:0}
.${NS}-darkpanel-inner{max-width:1315px;margin:0 auto}
.${NS}-logos{display:flex;align-items:center;gap:32px;margin-bottom:24px;flex-wrap:wrap}
.${NS}-logo{font-weight:700;font-size:20px;color:#fff;letter-spacing:.4px}
.${NS}-socials{display:flex;gap:12px;align-items:center}
.${NS}-social{width:32px;height:32px;border-radius:50%;background:#3c3f5e;display:flex;align-items:center;justify-content:center;color:#fff;text-decoration:none}
.${NS}-social svg{width:14px;height:14px;fill:#fff}
.${NS}-social:hover{background:#5b9cf6}
.${NS}-copyright{font-size:12px;line-height:16px;color:#8c8c8c;max-width:900px;margin-bottom:48px}
.${NS}-copyright a{color:#dbdbdb}

.${NS}-footlinks{display:grid;grid-template-columns:repeat(4,1fr);gap:32px}
.${NS}-footcol{display:flex;flex-direction:column;gap:8px;margin-bottom:32px}
.${NS}-foottitle{font-weight:700;font-size:14px;color:#fff;margin:0 0 8px;text-transform:uppercase;letter-spacing:.4px;line-height:18px}
.${NS}-footlink{font-size:14px;color:#b8b8b8;text-decoration:none;line-height:24px;cursor:pointer}
.${NS}-footlink:hover{color:#fff}

@media (max-width: 1100px){
  .${NS}-grid{grid-template-columns:repeat(2,1fr)}
  .${NS}-footlinks{grid-template-columns:repeat(3,1fr)}
}
@media (max-width: 720px){
  .${NS}-grid{grid-template-columns:1fr}
  .${NS}-h1{font-size:36px;line-height:44px}
  .${NS}-main{padding:0 16px}
  .${NS}-footlinks{grid-template-columns:repeat(2,1fr)}
}
`;

const PAGES = ['1','2','3','4','5','…','10','11','12','13','…','1000'];

function cardHtml(c){
  const commentsHtml = c.comments
    ? `<a class="${NS}-btn" href="#/">${ICON.comment}<span>${c.comments}</span></a>`
    : `<a class="${NS}-btn" href="#/" aria-label="Comentarios">${ICON.comment}</a>`;

  return `
    <article class="${NS}-card">
      <div class="${NS}-thumb">
        <img src="${ASSETS}/${c.id}.webp" alt="" loading="lazy">
        <a class="${NS}-thumb-link" href="#/" aria-label="${c.title}"></a>
        <button class="${NS}-corner" type="button" aria-label="Marcar como favorito">${ICON.bookmark}</button>
      </div>
      <div class="${NS}-text">
        <a class="${NS}-title" href="#/">${c.title}</a>
        <a class="${NS}-desc" href="#/">${c.desc}</a>
      </div>
      <div class="${NS}-footer">
        <div class="${NS}-meta">
          <a class="${NS}-author" href="#/">por ${c.author}</a>
          <span class="${NS}-date">${c.date}</span>
        </div>
        <div class="${NS}-btns">
          ${commentsHtml}
          <span class="${NS}-btn ${NS}-btn-outline" title="Boosts">${ICON.thumbsUp}<span>${c.likes}</span></span>
        </div>
      </div>
    </article>
  `;
}

function tabsHtml(){
  return TABS.map(t => `<a class="${NS}-tab${t.active?' is-active':''}" href="${t.href}" target="_blank" rel="noopener">${t.label}</a>`).join('');
}

function paginationHtml(){
  let prev = '<a class="' + NS + '-page" href="#" aria-label="Página anterior">‹</a>';
  let nums = PAGES.map((p) => {
    if(p === '…') return `<span class="${NS}-page-dots">…</span>`;
    return `<a class="${NS}-page${p==='1'?' is-active':''}" href="#" data-page="${p}">${p}</a>`;
  }).join('');
  let next = '<a class="' + NS + '-page" href="#" aria-label="Página siguiente">›</a>';
  return prev + nums + next;
}

function socialsHtml(){
  return SOCIAL_LINKS.map(s => `<a class="${NS}-social" href="${s.href}" target="_blank" rel="noopener" aria-label="${s.label}">${SOCIAL[s.key]}</a>`).join('');
}

function footerLinks(){
  // NOTA: Figma MCP no disponible en esta sesión; copy mantenido de pasada anterior.
  // Estos textos NO están validados 1:1 contra cada Component 7 del frame 25-177804.
  // Estructura: 3 columnas que agrupan sub-secciones, como en el footer público.
  const groups = [
    [
      { title:'Más que un producto', links:['Supercharts','Pine Script™','Stock Screener','Crypto Pairs Screener','Forex Screener','ETF Screener','Bond Screener'] },
      { title:'Analizadores',        links:['Stock Screener','Crypto Pairs Screener','Forex Screener','ETF Screener','Bond Screener','CFD Screener','Heatmap'] },
      { title:'Mapas de calor',      links:['Acciones','Cripto','ETF'] },
      { title:'Calendarios',         links:['Económico','Resultados','Dividendos'] },
      { title:'Más productos',       links:['Supercharts','Screener','Heatmap','Calendar','News'] },
      { title:'Aplicaciones',        links:['Móvil','Escritorio'] },
    ],
    [
      { title:'Herramientas y suscripciones', links:['Funciones','Planes y precios','Programa de afiliados','Tienda'] },
      { title:'Trading',                 links:['Broker integraciones','Centro de ayuda','Términos'] },
      { title:'Ofertas especiales',      links:['CME Group Futures','Eurex','S&P Global Spice'] },
      { title:'Acerca de la empresa',    links:['Acerca de','Carreras','Manifiesto','Política','Sala de prensa'] },
      { title:'Tienda',                  links:['Camisetas','Tazas','Stickers'] },
      { title:'Políticas y seguridad',   links:['Política','Seguridad','Términos','Cookies','Aviso legal','Privacidad','Defensoría','Reportes'] },
    ],
    [
      { title:'Comunidad', links:['Ideas','Scripts','Streams','Cuentas verificadas','Influencers','Moderadores','Wall of Love','Refer-a-friend','Atajos de teclado'] },
    ]
  ];
  return groups.map(group =>
    `<div>${group.map(col =>
      `<div class="${NS}-footcol">
        <div class="${NS}-foottitle">${col.title}</div>
        ${col.links.map(l => `<a class="${NS}-footlink" href="#" target="_blank" rel="noopener">${l}</a>`).join('')}
      </div>`
    ).join('')}</div>`
  ).join('');
}

function viewHtml(){
  return `
    <div class="${NS}-root">
      <main class="${NS}-main">
        <header class="${NS}-header">
          <h1 class="${NS}-h1">Indicadores y estrategias</h1>
          <nav class="${NS}-tabs">${tabsHtml()}</nav>
        </header>

        <div class="${NS}-container">
          <div class="${NS}-filters">
            <button class="${NS}-pill" type="button">Todos los tipos ${ICON.chevronDown}</button>
            <button class="${NS}-pill-light" type="button">
              <span class="${NS}-chk">${ICON.check}</span>
              Sólo código abierto
            </button>
            <div class="${NS}-seg">
              <button class="${NS}-seg-btn is-active" type="button" aria-label="Vista grid">${ICON.grid}</button>
              <button class="${NS}-seg-btn" type="button" aria-label="Vista lista">${ICON.list}</button>
            </div>
          </div>

          <section class="${NS}-grid">
            ${CARDS.map(cardHtml).join('')}
          </section>

          <div class="${NS}-more">
            <button class="${NS}-more-btn" type="button">Cargar más</button>
          </div>

          <nav class="${NS}-pagination">${paginationHtml()}</nav>
        </div>
      </main>

      <section class="${NS}-darkpanel">
        <div class="${NS}-darkpanel-inner">
          <div class="${NS}-logos">
            <span class="${NS}-logo">TradingView</span>
            <div class="${NS}-socials">${socialsHtml()}</div>
          </div>
          <p class="${NS}-copyright">
            Los datos de mercado seleccionados los proporciona <a href="#">ICE Data Services</a>.
            Los documentos presentados ante la SEC y otros, los facilita <a href="#">EDGAR Online</a>,
            una división de Donnelley Financial Solutions.
          </p>
          <div class="${NS}-footlinks">
            ${footerLinks()}
          </div>
        </div>
      </section>
    </div>
  `;
}

function injectStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function createScriptsEditorsPicks(mountEl, opts = {}){
  let root = null;

  function render(){
    injectStyles();
    if(!mountEl) return;
    mountEl.innerHTML = viewHtml();
    root = mountEl.querySelector(`.${NS}-root`);

    // Toggle segmented controls (decorativo)
    mountEl.querySelectorAll(`.${NS}-seg-btn`).forEach(btn => {
      btn.addEventListener('click', () => {
        mountEl.querySelectorAll(`.${NS}-seg-btn`).forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    // Páginas: decorativo
    mountEl.querySelectorAll(`.${NS}-page[data-page]`).forEach(p => {
      p.addEventListener('click', (e) => {
        e.preventDefault();
        mountEl.querySelectorAll(`.${NS}-page`).forEach(x => x.classList.remove('is-active'));
        p.classList.add('is-active');
      });
    });

    // Bookmark corner toggle (decorativo)
    mountEl.querySelectorAll(`.${NS}-corner`).forEach(b => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.classList.toggle('is-saved');
      });
    });
  }

  function destroy(){
    if(mountEl) mountEl.innerHTML = '';
    const s = document.getElementById(STYLE_ID);
    if(s) s.remove();
    root = null;
  }

  return { render, destroy };
}

export default createScriptsEditorsPicks;
