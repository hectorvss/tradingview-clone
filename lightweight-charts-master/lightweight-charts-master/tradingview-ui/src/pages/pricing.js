// pricing.js -- TradingView clone "Suscripcion" / pricing landing page
// Public API: createPricingPage(mount, opts) -> { render, destroy }
//
// Visual reference: Figma file s1DndmJ80jEtjxRWJIS2d0, node 1:17549
// (es.tradingview.com/pricing -- 1440w default, page height ~17286px)
//
// Component extraction notes:
//   1:12440  cycle wrapper (Mensual/Anual radio toggle)
//   1:12493  div.card-Um2BhicT (one of 4 plan cards) -- Essential variant
//   1:12522, 1:12804, 1:13086, 1:13370  card feature lists (Essential/Plus/Premium/Ultimate)
//   1:12528  Component 1 (checkmark icon -- 18x18)
//   1:12532  Component 4 (feature label text)
//   text-content for every card row extracted from get_design_context responses.

// ---------------------------------------------------------------------------
// Design tokens (from Figma color/* and font/* variables)
// ---------------------------------------------------------------------------
const T = {
  bg0:    '#000000',
  bg1:    '#0F0F0F',
  bg2:    '#121212',
  bg3:    '#1F1F1F',
  bd1:    '#2E2E2E',
  bd2:    '#3D3D3D',
  bd3:    '#4A4A4A',
  bdSoft: '#575757',
  txt0:   '#FFFFFF',
  txt1:   '#DBDBDB',
  txt2:   '#B8B8B8',
  txt3:   '#8C8C8C',
  txt4:   '#767676',
  txt5:   '#707070',
  blue:   '#2962FF',
  azure:  '#0075FF',
  green:  '#089981',
  red:    '#F7525F',
  cyan:   '#00BCE6',
  magenta:'#D500F9',
  violet: '#C883FF',
  pinkSt: '#96609F',
};

// ---------------------------------------------------------------------------
// Asset paths (downloaded under public/figma/pricing/)
// ---------------------------------------------------------------------------
const A = {
  check:  '/figma/pricing/checkmark.svg',
  check2: '/figma/pricing/checkmark-alt.svg',
  info:   '/figma/pricing/info.svg',
};

// ---------------------------------------------------------------------------
// Card data -- 4 plan tiers (Essential, Plus, Premium, Ultimate)
// Each card has 7 numeric "value" rows then 23 fixed feature rows.
// Order: [graficos, indicadores, barras, conexiones, alertasP, alertasT, alertasW]
// ---------------------------------------------------------------------------
const PLANS = [
  {
    name:   'Essential',
    price:  '€12.95',
    save:   { amount: '€24', word: 'al año' },
    cta:    'Comprar ahora',
    ctaStyle: 'light',
    nums:   ['2', '5', '10.000', '10', '20', '20', '0'],
  },
  {
    name:   'Plus',
    price:  '€29.95',
    save:   { amount: '€60', word: 'al año' },
    cta:    'Comprar ahora',
    ctaStyle: 'light',
    nums:   ['4', '10', '10.000', '20', '100', '100', '0'],
  },
  {
    name:   'Premium',
    price:  '€59.95',
    save:   { amount: '€120', word: 'al año' },
    cta:    'Comprar ahora',
    ctaStyle: 'light',
    nums:   ['8', '25', '20.000', '50', '400', '400', '2'],
    recommended: true,
  },
  {
    name:   'Ultimate',
    price:  '€199.95',
    save:   { amount: '€480', word: 'al año' },
    cta:    'Comprar ahora',
    ctaStyle: 'light',
    nums:   ['16', '50', '40.000', '200', '1.000', '1.000', '15'],
  },
];

// Static feature labels shared across all 4 cards (numeric rows use plan.nums)
const NUMERIC_LABELS = [
  'gráficos por pestaña',
  'indicadores por gráfico',
  'barras históricas',
  'conexiones a gráficos en paralelo',
  'alertas de precio',
  'alertas técnicas',
  'alertas de lista de seguimiento',
];

const FIXED_FEATURES = [
  'Aplicaciones web, de escritorio y móviles',
  'Sin anuncios',
  'Perfil de volumen',
  'Intervalos de tiempo personalizados',
  'Barras de rango personalizadas',
  'Múltiples listas de seguimiento',
  'Reproducción de barras',
  'Indicadores sobre indicadores',
  'Exportación de datos de los gráficos',
  'Gráficos intradía Renko, Kagi, Ruptura de línea, Punto y figura',
  'Gráficos basados en fórmulas personalizadas',
  'Alertas multicondición',
  'Oportunidad de precios en el tiempo',
  'Huella (footprint) de volumen',
  'Velas de volumen',
  'patrones de gráficos automáticos',
  'Alertas que no vencen',
  'Publicación de scripts solo por invitación',
  'Intervalos basados en segundos',
  'Intervalos basados en ticks',
  'Posibilidad de comprar datos de mercado profesionales',
  'Asistencia prioritaria',
];

// ---------------------------------------------------------------------------
// Comparison table sections -- from text-node section headers in Figma
//   1:14148  Gráficos
//   1:14380  Reproducción de barras
//   1:14957  Análisis técnico y algoritmos
//   1:15082  Listas de seguimiento
//   1:15149  Carteras
//   1:15334  Alertas
//   1:15345  Gráficos fundamentales
//   1:15659  Analizadores
//   1:15943  Datos
//   1:16069  Trading
//   1:16311  Social
//   1:16379  Exento de publicidad
//   1:16505  Aplicaciones móviles
//   1:16602  Desktop App
//   1:16612  Soporte
// ---------------------------------------------------------------------------
const TABLE_COLS = ['Basic', 'Essential', 'Plus', 'Premium', 'Ultimate'];

// "v" = checkmark, "-" = unavailable, "∞" = infinity icon, otherwise displayed as text.
// All rows below extracted verbatim from Figma file s1DndmJ80jEtjxRWJIS2d0
// (sections 1:13699, 1:14149, 1:14381, 1:14958, 1:15083, 1:15150, 1:15335,
// 1:15361, 1:15660, 1:15944, 1:16070, 1:16312, 1:16380, 1:16506, 1:16603).
const TABLE_SECTIONS = [
  ['Gráficos', [
    ['Gráficos por pestaña',                                                  '1',     '2',      '4',      '8',      '16'],
    ['Número de diseños de gráficos guardados',                               '1',     '5',      '10',     '∞',      '∞'],
    ['Intervalos de tiempo personalizados',                                   '-',     'v',      'v',      'v',      'v'],
    ['Intervalos basados en segundos',                                        '-',     '-',      '-',      'v',      'v'],
    ['Intervalos basados en ticks',                                           '-',     '-',      '-',      '-',      'v'],
    ['Gráficos intradía Renko, Kagi, Ruptura de línea, Punto y figura',       '-',     '-',      'v',      'v',      'v'],
    ['Barras de rango personalizadas',                                        '-',     'v',      'v',      'v',      'v'],
    ['Gráficos intradía basados en fórmulas personalizadas (spreads)',        '-',     '-',      'v',      'v',      'v'],
    ['Descargar datos del gráfico',                                           '-',     '-',      'v',      'v',      'v'],
    ['Tipos de gráficos personalizables',                                     '17',    '17',     '17',     '21',     '21'],
    ['Comparar símbolos',                                                     'v',     'v',      'v',      'v',      'v'],
    ['Gráficos ajustados a los dividendos',                                   'v',     'v',      'v',      'v',      'v'],
    ['Splits, beneficios y dividendos interactivos',                          'v',     'v',      'v',      'v',      'v'],
    ['Datos financieros anuales históricos en los gráficos',                  '7 años','20 años','20 años','20 años','20 años'],
    ['Datos financieros trimestrales históricos en los gráficos',             '8 años','8 años', '8 años', '8 años', '8 años'],
    ['Horario ampliado de trading',                                           'v',     'v',      'v',      'v',      'v'],
    ['Conexiones simultáneas al gráfico',                                     '2',     '10',     '20',     '50',     '200'],
  ]],
  ['Reproducción de barras', [
    ['Datos históricos por día e intervalos de tiempo más amplios',           'Todos', 'Todos',  'Todos',  'Todos',  'Todos'],
    ['Datos históricos por minutos',                                          '-',     '180 días','365 días','Todos', 'Todos'],
    ['Datos históricos por segundo',                                          '-',     '-',      '-',      'Todos',  'Todos'],
    ['Datos históricos por tick',                                             '-',     '-',      '-',      '-',      '7 días'],
    ['Reproducción de indicadores',                                           'v',     'v',      'v',      'v',      'v'],
    ['Trading en Reproducción en barras',                                     'v',     'v',      'v',      'v',      'v'],
  ]],
  ['Análisis técnico y algoritmos', [
    ['+400 indicadores populares prediseñados',                               'v',     'v',      'v',      'v',      'v'],
    ['Más de 100.000 indicadores creados por la comunidad',                   'v',     'v',      'v',      'v',      'v'],
    ['Indicador sobre indicador',                                             '1',     '1',      '9',      '24',     '49'],
    ['Indicadores por gráfico',                                               '2',     '5',      '10',     '25',     '50'],
    ['Datos financieros por gráfico',                                         '1',     '4',      '7',      '10',     '25'],
    ['Plantillas de indicadores personalizados',                              '1',     '∞',      '∞',      '∞',      '∞'],
    ['+110 herramientas de dibujo inteligentes',                              'v',     'v',      'v',      'v',      'v'],
    ['Indicadores del perfil de volumen',                                     '-',     'v',      'v',      'v',      'v'],
    ['Oportunidades de tiempo-precio',                                        '-',     '-',      '-',      'v',      'v'],
    ['Huella (footprint) de volumen',                                         '-',     '-',      '-',      'v',      'v'],
    ['Velas de volumen',                                                      '-',     '-',      '-',      'v',      'v'],
    ['Pine Script®',                                                          'v',     'v',      'v',      'v',      'v'],
    ['Análisis retrospectivo (backtesting) para estrategias',                 'v',     'v',      'v',      'v',      'v'],
    ['Exportar datos de estrategia',                                          '-',     '-',      'v',      'v',      'v'],
    ['Análisis retrospectivo profundo',                                       '-',     '-',      '-',      'v',      'v'],
    ['Reconocimiento de patrones de velas',                                   'v',     'v',      'v',      'v',      'v'],
    ['Retroceso de Fib. automático',                                          'v',     'v',      'v',      'v',      'v'],
    ['Análisis de múltiples intervalos de tiempo',                            'v',     'v',      'v',      'v',      'v'],
    ['Límite de tiempo establecido para realizar cálculos',                   '20s',   '40s',    '40s',    '40s',    '100s'],
    ['Lupa de barras',                                                        '-',     '-',      '-',      'v',      'v'],
    ['Patrones de gráficos automáticos',                                      '-',     '-',      '-',      'v',      'v'],
  ]],
  ['Listas de seguimiento', [
    ['Cantidad de listas de seguimiento',                                     '1',     '∞',      '∞',      '∞',      '∞'],
    ['Símbolos por lista de seguimiento',                                     '30',    '500',    '500',    '500',    '1.000'],
    ['Colores de símbolos marcados',                                          '1',     '7',      '7',      '7',      '7'],
    ['Importar/exportar',                                                     '-',     'v',      'v',      'v',      'v'],
    ['Columnas y clasificación personalizada',                                'v',     'v',      'v',      'v',      'v'],
  ]],
  ['Carteras', [
    ['Cantidad de carteras',                                                  '1',     '3',      '4',      '5',      '7'],
    ['Participaciones por cartera',                                           '20',    '50',     '75',     '100',    '150'],
    ['Operaciones por cartera',                                               '2.000', '5.000',  '5.000',  '5.000',  '5.000'],
  ]],
  ['Alertas', [
    ['Alertas de precio activas',                                             '3',     '20',     '100',    '400',    '1.000'],
    ['Alertas técnicas activas sobre indicadores, estrategias y dibujos',     '-',     '20',     '100',    '400',    '1.000'],
    ['Alertas de listas de seguimiento activas',                              '-',     '-',      '-',      '2',      '15'],
    ['Duración de las alertas',                                               '1 mes', '2 meses','2 meses','∞',      '∞'],
    ['Notificaciones de webhook',                                             '-',     'v',      'v',      'v',      'v'],
    ['Alertas multicondición',                                                '-',     '-',      'v',      'v',      'v'],
    ['Alertas basadas en segundos',                                           '-',     '-',      '-',      'v',      'v'],
  ]],
  ['Gráficos fundamentales', [
    ['Rangos de fechas',                                                      'Hasta 5a','Hasta 5a','Hasta 5a','Todos','Todos'],
  ]],
  ['Analizadores', [
    ['Analizadores de acciones, ETF, DEX y criptomonedas',                    'v',     'v',      'v',      'v',      'v'],
    ['+150 mercados de valores en más de 50 países',                          'v',     'v',      'v',      'v',      'v'],
    ['Más de 500 campos de datos fundamentales y técnicos',                   'v',     'v',      'v',      'v',      'v'],
    ['Múltiples mercados',                                                    'v',     'v',      'v',      'v',      'v'],
    ['Modo de visualización de gráficos',                                     'v',     'v',      'v',      'v',      'v'],
    ['Listas de seguimiento como filtros',                                    'v',     'v',      'v',      'v',      'v'],
    ['Colores de símbolos marcados',                                          '1',     '7',      '7',      '7',      '7'],
    ['Analizadores con actualización automática',                             '1 min.','10 seg. / 1 min.','10 seg. / 1 min.','10 seg. / 1 min.','10 seg. / 1 min.'],
    ['Exportación de datos',                                                  '-',     'v',      'v',      'v',      'v'],
    ['Intervalos de tiempo',                                                  'D S M', 'Todos',  'Todos',  'Todos',  'Todos'],
    ['Analizador de Pine',                                                    '-',     '-',      '-',      'v',      'v'],
  ]],
  ['Datos', [
    ['Flujo de datos más rápido',                                             '-',     'v',      'v',      'v',      'v'],
    ['Máximo de suscripciones permitidas de datos de mercado',                '-',     '2',      '4',      '6',      '∞'],
    ['Barras históricas disponibles',                                         '5K',    '10K',    '10K',    '20K',    '40K'],
    ['Fuente de datos de respaldo dedicada',                                  '-',     'v',      'v',      'v',      'v'],
    ['Información financiera (datos fundamentales de empresa)',               'v',     'v',      'v',      'v',      'v'],
    ['Datos económicos globales',                                             'v',     'v',      'v',      'v',      'v'],
    ['Noticias contextuales en tiempo real',                                  'v',     'v',      'v',      'v',      'v'],
    ['Listas de interés',                                                     'v',     'v',      'v',      'v',      'v'],
    ['Calendarios económicos y de resultados',                                'v',     'v',      'v',      'v',      'v'],
    ['Curvas de rendimiento',                                                 'v',     'v',      'v',      'v',      'v'],
  ]],
  ['Trading', [
    ['Operar a través de brokers seleccionados',                              'v',     'v',      'v',      'v',      'v'],
    ['Trading simulado (en papel)',                                           'v',     'v',      'v',      'v',      'v'],
    ['Trading con gráficos',                                                  'v',     'v',      'v',      'v',      'v'],
    ['Trading con la profundidad de mercado (DOM)',                           'v',     'v',      'v',      'v',      'v'],
  ]],
  ['Social', [
    ['Distintivo exclusivo junto a su nombre',                                '-',     'v',      'v',      'v',      'v'],
    ['Firma y sitios web',                                                    '-',     '-',      '-',      'v',      'v'],
    ['Publicar indicadores que requieren invitación',                         '-',     '-',      '-',      'v',      'v'],
    ['Publicar scripts protegidos',                                           '-',     'v',      'v',      'v',      'v'],
    ['Publicar ideas y scripts públicos',                                     '-',     'v',      'v',      'v',      'v'],
    ['Ideas de vídeo',                                                        '-',     'v',      'v',      'v',      'v'],
    ['Pensamientos',                                                          '-',     'v',      'v',      'v',      'v'],
    ['Comentarios sobre ideas y scripts públicos',                            '-',     'v',      'v',      'v',      'v'],
  ]],
  ['Exento de publicidad', [
    ['Gráficos',                                                              '-',     'v',      'v',      'v',      'v'],
    ['Red social',                                                            '-',     'v',      'v',      'v',      'v'],
  ]],
  ['Aplicaciones móviles', [
    ['Siempre a su alcance',                                                  'v',     'v',      'v',      'v',      'v'],
    ['Totalmente sincronizado: 100%',                                         'v',     'v',      'v',      'v',      'v'],
    ['Notificaciones de alerta push nativas',                                 'v',     'v',      'v',      'v',      'v'],
    ['Widgets de iOS y Android',                                              'v',     'v',      'v',      'v',      'v'],
  ]],
  ['Desktop App', [
    ['Experiencia de Desktop',                                                'v',     'v',      'v',      'v',      'v'],
    ['Soporte nativo para múltiples monitores',                               'v',     'v',      'v',      'v',      'v'],
    ['Vinculación de pestañas por símbolo entre ventanas',                    'v',     'v',      'v',      'v',      'v'],
  ]],
  ['Soporte', [
    ['Atención al cliente',                                                   '-',     'Normal', 'Prioridad','Prioridad','Primera prioridad'],
  ]],
];

// Wall of Love card handles + image filenames (slug used in /figma/pricing/tw/<slug>.jpg)
const WALL_CARDS = [
  { handle: '@fx_youngboy',                          slug: 'fx_youngboy',         href: 'https://www.instagram.com/p/CuJzC14tvF0/' },
  { handle: '@jimnakmtl',                            slug: 'jimnakmtl',           href: 'https://www.instagram.com/p/CKpmqHfAcH6/' },
  { handle: '@smart_traderx',                        slug: 'smart_traderx',       href: 'https://www.instagram.com/p/B-iTloWjR6T/' },
  { handle: '@540wvn',                               slug: '540wvn',              href: 'https://www.instagram.com/p/Bj2pgPWh_Yi/' },
  { handle: '@chartfeed',                            slug: 'chartfeed',           href: 'https://www.instagram.com/p/CHxGA1_gQkQ/' },
  { handle: '@cenobar',                              slug: 'cenobar',             href: 'https://twitter.com/cenobar/status/1421379582524018688' },
  { handle: '@bourneforex',                          slug: 'bourneforex',         href: 'https://www.instagram.com/p/CRRGf7wpqLT/' },
  { handle: '@ftmocom',                              slug: 'ftmocom',             href: 'https://www.instagram.com/p/B0F-Jn0Ahsc/' },
  { handle: '@TradingView',                          slug: 'TradingView',         href: 'https://www.instagram.com/p/CIbMQbXApQB/' },
  { handle: '@itspatrickspencer_',                   slug: 'itspatrickspencer',   href: 'https://www.instagram.com/p/CJW8jIHp1dt/' },
  { handle: '@j.kruysbergen',                        slug: 'j_kruysbergen',       href: 'https://www.instagram.com/p/CQi5r_qBonT/' },
  { handle: '@reubenblameyfx',                       slug: 'reubenblameyfx',      href: 'https://www.instagram.com/p/BttRKp7BosB/' },
  { handle: '@zarareca',                             slug: 'zarareca',            href: 'https://www.instagram.com/p/Br3LMninLZ2/' },
  { handle: '@chriskane.fx',                         slug: 'chriskane_fx',        href: 'https://www.instagram.com/p/CAqnYxvg66H/' },
  { handle: '@mytradingsetup',                       slug: 'mytradingsetup',      href: 'https://www.instagram.com/mytradingsetup/p/BtoOEIVn7gc/' },
  { handle: '@mr_sf09',                              slug: 'mr_sf09',             href: 'https://www.instagram.com/p/CId6h5gnWZf/' },
  { handle: '@BunsanXBT',                            slug: 'BunsanXBT',           href: 'https://x.com/BunsanXBT/status/1970085454289756160' },
  { handle: 'Investing with Mike @michael_b_wang',   slug: 'michael_b_wang',      href: 'https://twitter.com/michael_b_wang/status/1349906095431507970' },
];

// Footer — 11 columns grouped into 3 rows (from Figma node 1:17171)
const FOOTER_COLUMNS = [
  // Row 1
  ['Más que un producto', ['Supergráficos']],
  ['Analizadores',        ['Acciones', 'ETF', 'Bonos', 'Criptomonedas', 'Pares CEX', 'Pares DEX', 'Pine']],
  ['Mapas de calor',      []],
  ['Calendarios',         ['Económico', 'Beneficios', 'Dividendos']],
  ['Más productos',       ['Curvas de rendimiento', 'Opciones', 'Mapas macro', 'Flujo de noticias', 'Pine Script®']],
  // Row 2
  ['Aplicaciones',        ['Móvil', 'Desktop']],
  ['Herramientas y suscripciones', ['Funcionalidades', 'Precios', 'Datos de mercado', 'Regalar planes']],
  ['Trading',             ['Resumen', 'Principales brokers', 'Comparación de brokers']],
  ['Ofertas especiales',  ['Futuros CME Group', 'Futuros Eurex', 'Paquete de acciones de EE.UU.']],
  ['Acerca de la empresa',['Quiénes somos', 'Misión espacial', 'Blog', 'Ofertas de empleo', 'Kit de medios']],
  ['Tienda',              ['Tienda TradingView', 'Cartas de tarot para traders', 'C63 TradeTime']],
  // Row 3
  ['Políticas y seguridad', ['Condiciones de uso', 'Exención de responsabilidad', 'Política de privacidad', 'Política de cookies', 'Declaración de accesibilidad', 'Consejos de seguridad', 'Programa de recompensas por encontrar errores', 'Página de estado']],
  ['Comunidad',           ['Red social', 'Muro del amor', 'Recomendar a un amigo', 'Normas internas', 'Moderadores']],
  ['Ideas',               ['Trading', 'Formación', 'Selecciones de los editores']],
  ['Pine Script',         ['Indicadores y estrategias', 'Wizards', 'Autónomos', 'Espacios de pago']],
  ['Soluciones para empresas', ['Widgets', 'Bibliotecas de gráficos', 'Lightweight Charts™', 'Gráficos avanzados', 'Plataforma de trading']],
  ['Oportunidades de crecimiento', ['Publicidad', 'Integración de brokers', 'Programa de socios', 'Programa de formación']],
];

// ---------------------------------------------------------------------------
// FAQ items -- from Figma node 1:16935 (Preguntas frecuentes section)
// ---------------------------------------------------------------------------
const FAQ = [
  ['¿Por qué pasarse a un plan de pago?',
   'Los planes de pago desbloquean más gráficos por pestaña, más indicadores, más alertas, intervalos personalizados, exportación de datos, gráficos sin anuncios y soporte prioritario.'],
  ['¿Cómo pago mi suscripción?',
   'Aceptamos las principales tarjetas de crédito y débito, así como PayPal y, en algunos países, transferencia bancaria.'],
  ['¿Puedo cambiar de plan en cualquier momento?',
   'Sí. Puede cambiar a un plan superior o inferior cuando lo desee. El cambio se aplica de forma prorrateada.'],
  ['¿Cuál es la política de reembolso?',
   'Ofrecemos un periodo de reembolso de 30 días en la primera compra de cualquier plan, sin preguntas.'],
  ['¿Cuánta historia tienen los gráficos?',
   'La cantidad de barras históricas disponibles depende del plan: 5.000 en Basic, 10.000 en Essential y Plus, 20.000 en Premium y 40.000 en Ultimate.'],
  ['¿Cómo cancelo mi suscripción?',
   'Puede cancelar su suscripción en cualquier momento desde la sección "Cuenta y facturación" de su perfil.'],
];

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------
let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const css = `
.tv-pri-root {
  position: relative;
  width: 100%;
  background: ${T.bg0};
  color: ${T.txt1};
  font-family: 'Trebuchet MS', -apple-system, BlinkMacSystemFont, Roboto, Ubuntu, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  overflow-x: hidden;
  z-index: 1;
}
body.has-global-header  .tv-pri-root { padding-top: 0; }
body.has-global-rightbar .tv-pri-root { padding-right: 0; }

.tv-pri-root *, .tv-pri-root *::before, .tv-pri-root *::after { box-sizing: border-box; }

.tv-pri-container { max-width: 1320px; margin: 0 auto; padding: 0 60px; }

/* ===== Hero ===== */
.tv-pri-hero {
  position: relative;
  padding: 120px 0 80px;
  text-align: center;
  background: #000 url('/figma/pricing/hero-bg.png') center top / cover no-repeat;
  overflow: hidden;
}
.tv-pri-hero::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.92) 100%);
  pointer-events: none;
}
.tv-pri-hero-inner { position: relative; z-index: 1; }
.tv-pri-h1 {
  font-family: Inter, 'Trebuchet MS', sans-serif;
  font-weight: 600;
  font-size: 72px;
  line-height: 80px;
  letter-spacing: -1.6px;
  color: ${T.txt0};
  margin: 0 auto 40px;
  max-width: 800px;
}

/* ===== Billing cycle toggle ===== */
.tv-pri-cycle {
  display: inline-flex;
  align-items: center;
  gap: 24px;
  padding: 0;
  margin: 0 auto 56px;
}
.tv-pri-cycle-opt {
  display: inline-flex; align-items: center; gap: 8px;
  cursor: pointer;
  font-weight: 700;
  color: ${T.txt1};
  font-size: 16px;
  user-select: none;
}
.tv-pri-cycle-radio {
  display: inline-block;
  width: 18px; height: 18px;
  border: 1px solid ${T.txt1};
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
}
.tv-pri-cycle-opt.is-on .tv-pri-cycle-radio::after {
  content: '';
  position: absolute;
  inset: 3px;
  background: ${T.txt0};
  border-radius: 50%;
}
.tv-pri-cycle-save {
  display: inline-flex; align-items: center; gap: 6px;
  color: ${T.txt2};
  font-size: 14px;
  font-weight: 400;
}
.tv-pri-cycle-save b { color: ${T.txt0}; font-weight: 700; }

/* ===== Plan cards grid ===== */
.tv-pri-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 0 auto 96px;
}
.tv-pri-card {
  background: ${T.bg1};
  border: 1px solid ${T.bd1};
  border-radius: 16px;
  padding: 24px;
  display: flex; flex-direction: column;
  min-height: 1370px;
  position: relative;
}
.tv-pri-card.is-rec {
  border-color: ${T.azure};
  box-shadow: 0 0 0 1px ${T.azure}, 0 18px 60px rgba(0,117,255,0.18);
}
.tv-pri-card.is-rec::before {
  content: 'Recomendado';
  position: absolute;
  top: -10px; left: 24px;
  padding: 2px 10px;
  background: ${T.azure};
  color: ${T.txt0};
  font-size: 12px; font-weight: 700;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.tv-pri-card-title {
  font-weight: 700;
  font-size: 18px;
  line-height: 24px;
  color: ${T.txt1};
  margin: 0 0 16px;
}
.tv-pri-card-price {
  display: flex; align-items: baseline; gap: 4px;
  height: 46px;
  margin: 0 0 2px;
}
.tv-pri-card-price-main {
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 36px;
  line-height: 46px;
  color: ${T.txt0};
}
.tv-pri-card-price-unit {
  color: ${T.txt3};
  font-size: 14px;
  line-height: 18px;
  padding-left: 2px;
}
.tv-pri-card-billed {
  color: ${T.txt3};
  font-size: 14px;
  line-height: 18px;
  margin: 2px 0 0;
}
.tv-pri-card-save {
  display: flex; align-items: center; gap: 4px;
  color: ${T.txt3};
  font-size: 14px;
  line-height: 18px;
  margin: 16px 0 0;
}
.tv-pri-card-save b { color: ${T.txt1}; font-weight: 700; }
.tv-pri-card-save img { width: 14px; height: 14px; opacity: 0.6; }
.tv-pri-card-cta {
  display: block; width: 100%;
  background: ${T.txt0}; color: ${T.bg1};
  border: 1px solid ${T.txt0};
  border-radius: 8px;
  padding: 12px 24px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  margin-top: 24px;
  text-align: center;
  transition: opacity 0.12s ease;
}
.tv-pri-card-cta:hover { opacity: 0.85; }
.tv-pri-card-features { list-style: none; margin: 24px 0 0; padding: 0; }
.tv-pri-card-features li {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 6px 0;
  color: ${T.txt1};
  font-size: 14px;
  line-height: 18px;
}
.tv-pri-card-features li img { width: 18px; height: 18px; flex-shrink: 0; margin-top: 0px; }
.tv-pri-card-features li .tv-pri-feat-text { flex: 1; }
.tv-pri-card-features li.is-num .tv-pri-feat-num {
  border-bottom: 1px dashed ${T.bdSoft};
  padding-bottom: 1px;
}

/* ===== Enterprise / disclaimer band ===== */
.tv-pri-enterprise {
  background: ${T.bg1};
  border: 1px solid ${T.bd1};
  border-radius: 16px;
  padding: 32px 40px;
  margin: 0 auto 80px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px;
}
.tv-pri-enterprise h3 {
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 24px;
  color: ${T.txt0};
  margin: 0 0 8px;
}
.tv-pri-enterprise p { margin: 0; color: ${T.txt2}; font-size: 14px; max-width: 720px; }
.tv-pri-enterprise-btn {
  flex-shrink: 0;
  background: transparent;
  color: ${T.txt0};
  border: 1px solid ${T.bd3};
  border-radius: 8px;
  padding: 12px 24px;
  font: inherit;
  font-size: 16px;
  cursor: pointer;
}
.tv-pri-enterprise-btn:hover { background: rgba(255,255,255,0.05); }

.tv-pri-disclaimer {
  max-width: 960px;
  margin: 0 auto 120px;
  color: ${T.txt5};
  font-size: 12px;
  line-height: 16px;
  text-align: center;
}

/* ===== Big feature section ===== */
.tv-pri-feature {
  padding: 100px 0;
  border-top: 1px solid ${T.bd1};
}
.tv-pri-feature h2 {
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 56px;
  line-height: 64px;
  letter-spacing: -1.6px;
  color: ${T.txt0};
  margin: 0 0 24px;
  max-width: 900px;
}
.tv-pri-feature p {
  font-size: 18px;
  line-height: 28px;
  color: ${T.txt2};
  max-width: 720px;
  margin: 0;
}

/* ===== Comparison table ===== */
.tv-pri-compare {
  padding: 80px 0;
  border-top: 1px solid ${T.bd1};
}
.tv-pri-compare-title {
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 48px;
  letter-spacing: -1.6px;
  color: ${T.txt0};
  margin: 0 0 40px;
}
.tv-pri-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.tv-pri-table thead th {
  position: sticky;
  top: 0;
  background: ${T.bg0};
  z-index: 2;
  padding: 16px 12px;
  text-align: center;
  font-weight: 700;
  color: ${T.txt0};
  font-size: 16px;
  border-bottom: 1px solid ${T.bd2};
}
.tv-pri-table thead th:first-child { text-align: left; width: 35%; }
.tv-pri-table .tv-pri-table-section td {
  background: ${T.bg2};
  color: ${T.txt0};
  font-weight: 700;
  font-size: 16px;
  padding: 14px 12px;
  border-top: 1px solid ${T.bd2};
}
.tv-pri-table tbody td {
  padding: 12px;
  border-bottom: 1px solid ${T.bd1};
  color: ${T.txt1};
  vertical-align: middle;
}
.tv-pri-table tbody td:first-child { color: ${T.txt2}; }
.tv-pri-table tbody td:not(:first-child) { text-align: center; }
.tv-pri-table img.tv-pri-check { width: 18px; height: 18px; vertical-align: middle; }
.tv-pri-table .tv-pri-dash { color: ${T.txt5}; }

/* ===== Testimonial / wall ===== */
.tv-pri-testimonials {
  padding: 100px 0;
  border-top: 1px solid ${T.bd1};
  text-align: center;
}
.tv-pri-testimonials h2 {
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 72px;
  line-height: 80px;
  letter-spacing: -1.6px;
  color: ${T.txt0};
  margin: 0 0 24px;
}
.tv-pri-testimonials .tv-pri-tw {
  display: inline-block;
  color: ${T.txt0};
  font-family: Inter, sans-serif;
}
.tv-pri-testimonials .tv-pri-lead {
  color: ${T.txt1};
  font-size: 24px;
  max-width: 760px;
  margin: 0 auto 48px;
  line-height: 32px;
}
.tv-pri-wall {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin: 32px auto 48px;
  text-align: left;
}
.tv-pri-tweet {
  display: block;
  background: ${T.bg1};
  border: 1px solid ${T.bd3};
  border-radius: 16px;
  padding: 8px;
  text-decoration: none;
  transition: transform 0.18s ease, border-color 0.18s ease;
}
.tv-pri-tweet:hover { transform: translateY(-2px); border-color: ${T.bdSoft}; }
.tv-pri-tweet-img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid ${T.bd3};
}
.tv-pri-tweet-handle {
  display: block;
  color: ${T.txt3};
  font-size: 16px;
  line-height: 24px;
  padding: 8px 4px 4px;
}
.tv-pri-wall-cta {
  display: inline-block;
  margin-top: 16px;
  padding: 24px 32px;
  background: ${T.bg0};
  border: 1px solid ${T.bd3};
  border-radius: 40px;
  color: ${T.txt1};
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 24px;
  text-decoration: none;
}
.tv-pri-wall-cta:hover { background: ${T.bg1}; }
@media (max-width: 1280px) { .tv-pri-wall { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 880px)  { .tv-pri-wall { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px)  { .tv-pri-wall { grid-template-columns: 1fr; } }

/* ===== FAQ ===== */
.tv-pri-faq { padding: 100px 0; border-top: 1px solid ${T.bd1}; }
.tv-pri-faq h2 {
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 56px;
  line-height: 64px;
  letter-spacing: -1.6px;
  color: ${T.txt0};
  margin: 0 0 56px;
}
.tv-pri-faq-list { display: flex; flex-direction: column; gap: 0; }
.tv-pri-faq-item {
  border-top: 1px solid ${T.bd1};
  padding: 24px 0;
}
.tv-pri-faq-item:last-child { border-bottom: 1px solid ${T.bd1}; }
.tv-pri-faq-q {
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer;
  font-size: 20px;
  font-weight: 700;
  color: ${T.txt0};
  list-style: none;
  user-select: none;
}
.tv-pri-faq-q::-webkit-details-marker { display: none; }
.tv-pri-faq-q::after {
  content: '+';
  font-size: 24px;
  font-weight: 400;
  color: ${T.txt2};
  width: 24px; text-align: center;
  transition: transform 0.18s ease;
}
.tv-pri-faq-item[open] .tv-pri-faq-q::after { transform: rotate(45deg); }
.tv-pri-faq-a {
  margin: 16px 0 0;
  color: ${T.txt2};
  font-size: 16px;
  line-height: 24px;
  max-width: 900px;
}

/* ===== Footer ===== */
.tv-pri-footer {
  background: ${T.bg1};
  border-top: 1px solid ${T.bd1};
  padding: 64px 0 32px;
  color: ${T.txt2};
  font-size: 13px;
}
.tv-pri-footer-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 32px 24px;
  margin-bottom: 48px;
}
.tv-pri-footer-col h4 {
  color: ${T.txt0};
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 16px;
}
.tv-pri-footer-col ul { list-style: none; padding: 0; margin: 0; }
.tv-pri-footer-col li { padding: 4px 0; }
.tv-pri-footer-col a { color: ${T.txt2}; text-decoration: none; }
.tv-pri-footer-col a:hover { color: ${T.txt0}; }
.tv-pri-footer-legal {
  border-top: 1px solid ${T.bd1};
  padding-top: 24px;
  color: ${T.txt5};
  font-size: 12px;
  line-height: 18px;
}
.tv-pri-footer-legal p { margin: 6px 0; }

/* ===== Responsive ===== */
@media (max-width: 1280px) {
  .tv-pri-cards { grid-template-columns: repeat(2, 1fr); }
  .tv-pri-card { min-height: auto; }
}
@media (max-width: 720px) {
  .tv-pri-h1 { font-size: 44px; line-height: 52px; }
  .tv-pri-cards { grid-template-columns: 1fr; }
  .tv-pri-feature h2, .tv-pri-compare-title, .tv-pri-testimonials h2, .tv-pri-faq h2 {
    font-size: 36px; line-height: 44px;
  }
  .tv-pri-footer-grid { grid-template-columns: repeat(2, 1fr); }
  .tv-pri-enterprise { flex-direction: column; align-items: flex-start; }
}
`;
  const s = document.createElement('style');
  s.setAttribute('data-tv-pri', '1');
  s.textContent = css;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------
function renderCard(plan) {
  const features = plan.nums.map((n, i) =>
    `<li class="is-num"><img src="${A.check}" alt=""><span class="tv-pri-feat-text"><span class="tv-pri-feat-num">${n}</span> ${NUMERIC_LABELS[i]}</span></li>`
  ).join('') +
  FIXED_FEATURES.map(f =>
    `<li><img src="${A.check}" alt=""><span class="tv-pri-feat-text">${f}</span></li>`
  ).join('');

  return `
    <div class="tv-pri-card${plan.recommended ? ' is-rec' : ''}">
      <h3 class="tv-pri-card-title">${plan.name}</h3>
      <div class="tv-pri-card-price">
        <span class="tv-pri-card-price-main">${plan.price}</span>
        <span class="tv-pri-card-price-unit">/ mes</span>
      </div>
      <div class="tv-pri-card-billed">facturado anualmente</div>
      <div class="tv-pri-card-save">
        Ahorre <b>${plan.save.amount}</b> ${plan.save.word}
        <img src="${A.info}" alt="">
      </div>
      <button class="tv-pri-card-cta" type="button">${plan.cta}</button>
      <ul class="tv-pri-card-features">${features}</ul>
    </div>`;
}

function renderTableRow(row) {
  const [label, ...cells] = row;
  return `<tr>
    <td>${label}</td>
    ${cells.map(c => {
      if (c === 'v') return `<td><img class="tv-pri-check" src="${A.check}" alt="incluido"></td>`;
      if (c === '-') return `<td><span class="tv-pri-dash">—</span></td>`;
      if (c === '∞') return `<td><span style="font-size:18px;color:${T.txt1}">∞</span></td>`;
      return `<td>${c}</td>`;
    }).join('')}
  </tr>`;
}

function renderWall() {
  return WALL_CARDS.map(c =>
    `<a class="tv-pri-tweet" href="${c.href}" target="_blank" rel="noopener noreferrer">
       <img class="tv-pri-tweet-img" src="/figma/pricing/tw/${c.slug}.jpg" alt="${c.handle}" loading="lazy">
       <span class="tv-pri-tweet-handle">${c.handle}</span>
     </a>`
  ).join('');
}

function renderTable() {
  const head = `<thead><tr>
    <th>Comparar planes</th>
    ${TABLE_COLS.map(c => `<th>${c}</th>`).join('')}
  </tr></thead>`;
  const body = TABLE_SECTIONS.map(([title, rows]) => {
    return `<tr class="tv-pri-table-section"><td colspan="6">${title}</td></tr>` +
      rows.map(renderTableRow).join('');
  }).join('');
  return `<table class="tv-pri-table">${head}<tbody>${body}</tbody></table>`;
}

function renderFAQ() {
  return FAQ.map(([q, a]) =>
    `<details class="tv-pri-faq-item">
       <summary class="tv-pri-faq-q">${q}</summary>
       <div class="tv-pri-faq-a">${a}</div>
     </details>`
  ).join('');
}

function renderFooter() {
  return `
    <footer class="tv-pri-footer">
      <div class="tv-pri-container">
        <div class="tv-pri-footer-grid">
          ${FOOTER_COLUMNS.map(([h, items]) => `
            <div class="tv-pri-footer-col">
              <h4>${h}</h4>
              <ul>${items.map(i => `<li><a href="#">${i}</a></li>`).join('')}</ul>
            </div>`).join('')}
        </div>
        <div class="tv-pri-footer-legal">
          <p>Los datos de mercado seleccionados los proporciona ICE Data Services.</p>
          <p>Los datos de referencia escogidos los suministra FactSet. Copyright © 2026 FactSet Research Systems Inc.</p>
          <p>Copyright © 2026, American Bankers Association. La base de datos CUSIP proviene de FactSet Research Systems Inc. Todos los derechos reservados.</p>
          <p>Los documentos presentados ante la SEC y otros, los facilita EDGAR Online.</p>
          <p>© 2026 TradingView, Inc.</p>
        </div>
      </div>
    </footer>`;
}

// ---------------------------------------------------------------------------
// Page factory
// ---------------------------------------------------------------------------
export function createPricingPage(mount, opts = {}) {
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'tv-pri-root';

  const state = { cycle: 'annual' };

  function paint() {
    root.innerHTML = `
      <section class="tv-pri-hero">
        <div class="tv-pri-container tv-pri-hero-inner">
          <h1 class="tv-pri-h1">Planes para cualquier nivel de ambición</h1>
          <div class="tv-pri-cycle">
            <label class="tv-pri-cycle-opt${state.cycle === 'monthly' ? ' is-on' : ''}" data-cycle="monthly">
              <span class="tv-pri-cycle-radio"></span>Mensual
            </label>
            <label class="tv-pri-cycle-opt${state.cycle === 'annual' ? ' is-on' : ''}" data-cycle="annual">
              <span class="tv-pri-cycle-radio"></span>Anual
              <span class="tv-pri-cycle-save">Ahorre hasta un <b>17%</b> <span aria-hidden="true">😍</span></span>
            </label>
          </div>
        </div>
      </section>

      <section class="tv-pri-container">
        <div class="tv-pri-cards">
          ${PLANS.map(renderCard).join('')}
        </div>

        <div class="tv-pri-enterprise">
          <div>
            <h3>Planes para empresas</h3>
            <p>¿Necesita más de 100 suscripciones? Póngase en contacto con nosotros y le ayudaremos a encontrar la mejor opción para su negocio.</p>
          </div>
          <button class="tv-pri-enterprise-btn" type="button">Contactar con ventas</button>
        </div>

        <div class="tv-pri-disclaimer">
          A efectos fiscales, TradingView, Inc. está registrada solo en algunos países. Por ello, es posible que su factura final incluya un impuesto sobre las ventas en su lugar de residencia.<br>
          Solo el plan Ultimate está disponible para usuarios profesionales. Obtenga más información sobre quién cumple los requisitos para ser considerado profesional.
        </div>
      </section>

      <section class="tv-pri-feature">
        <div class="tv-pri-container">
          <h2>Los mercados globales al alcance de su mano</h2>
          <p>Le conectamos de forma fiable a cientos de feeds de datos, con acceso directo a 3.539.722 instrumentos de todo el mundo. La información obtenida es de máxima calidad y se actualiza en tiempo real.</p>
        </div>
      </section>

      <section class="tv-pri-compare">
        <div class="tv-pri-container">
          <h2 class="tv-pri-compare-title">Comparar planes</h2>
          ${renderTable()}
        </div>
      </section>

      <section class="tv-pri-testimonials">
        <div class="tv-pri-container">
          <h2>Amor en cada<br><span class="tv-pri-tw">#TradingView</span></h2>
          <p class="tv-pri-lead">100 millones de traders que toman el control de su futuro.</p>
          <div class="tv-pri-wall">${renderWall()}</div>
          <a class="tv-pri-wall-cta" href="https://es.tradingview.com/wall-of-love/" target="_blank" rel="noopener noreferrer">Explore el mundo</a>
        </div>
      </section>

      <section class="tv-pri-feature">
        <div class="tv-pri-container">
          <h2>Para cualquier dispositivo</h2>
          <p>Lo último para operar con facilidad. Gráficos en su máxima expresión — por sus diseños sincronizados, listas de seguimiento, configuración y mucho más — porque nuestra app sigue siendo la mejor.</p>
        </div>
      </section>

      <section class="tv-pri-faq">
        <div class="tv-pri-container">
          <h2>Preguntas frecuentes</h2>
          <div class="tv-pri-faq-list">${renderFAQ()}</div>
        </div>
      </section>

      ${renderFooter()}
    `;
  }

  function render() { paint(); }

  // ---- Interactions ----
  function onClick(e) {
    const opt = e.target.closest('[data-cycle]');
    if (opt) {
      state.cycle = opt.dataset.cycle;
      paint();
      return;
    }
  }
  root.addEventListener('click', onClick);

  function destroy() {
    root.removeEventListener('click', onClick);
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  paint();
  mount.appendChild(root);

  return { render, destroy };
}

export default createPricingPage;
