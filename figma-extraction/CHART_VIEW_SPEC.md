# CHART VIEW (node 1:3022) — pixel-perfect specs from Figma

## Page layout (1440x900)
- Grid: 52px | 4px sep | 1335px | 4px sep | 45px = 1440 cols
- Rows: 38px (top) | 4px sep | 819px (chart) + 39px (bottom toolbar) = 900
- Top-left H button: 52x38
- layout__area--top: 1388x38 starting x=52
- layout__area--left: 52x858 starting y=42
- layout__area--center: 1335x858 starting x=56,y=42 (contains chart 819px + chart-toolbar 39px)
- widgetbar-wrap: 45x858 starting x=1395,y=42

## Color tokens (CSS vars)
--bg-main: #0f0f0f
--bg-secondary: #2e2e2e  
--bg-input: #3d3d3d
--border: #4a4a4a
--text: #dbdbdb
--text-muted: #8c8c8c
--blue: #2962ff
--chart-bg: #131722
--red: #f23645
--green: #089981
--publish-bg: #f2f2f2
Font: Trebuchet MS for UI text, Inter for some
Sizes: 14px default UI text, line-height normal

## H Button (1:2217)
- 52x38 container, centered 30x30 circle border #2e2e2e, inside 28x28 gradient bg(135deg, #7b2ff7→#2962ff), white "H" Inter 19.6px bold
- Badge "11" floats top-right at x=29.5, y=-0.5 (23x20.5), red bg, white text

## TOP TOOLBAR (1:2230) — 1388x38, bg #0f0f0f
Left-to-right groups separated by 1px×22px gray #4a4a4a dividers (padded 4px each side):

### Group 1: Symbol
- Container 136px wide, pill 128x28 rounded-14, bg #3d3d3d, text "NVDA" Trebuchet Bold 14px #dbdbdb pl=12 pr=30
- Inside pill right: 28x28 round button with 24x24 inner circle bg #0f0f0f containing "+" plus icon 18x18 (image asset)
- Right padding 5px → plus button (28x28, dropdown arrow)

### Group 2: Timeframe "D"
- text "D" Trebuchet Regular 14px #dbdbdb, padding px-10 horizontal

### Group 3: Chart style icon (candle icon 28x28)

### Group 4: Indicadores
- Icon 28x28 (fx icon) + text "Indicadores" Trebuchet 14px, paddings pl-5 pr-10
- Component9 dropdown arrow (18x18 chevron)
- Adjacent: study-templates icon-only button

### Group 5: Alerta + Reproducción
- Bell icon 28x28 + text "Alerta"
- Play icon 28x28 + text "Reproducción"

### Group 6: Undo/Redo
- Undo icon 28x28
- Redo icon 28x28 opacity 0.5

### Fill (flex-1)

### Group 7: Layout grid icon + "Sin nombre" + dropdown chevron

### Group 8: Settings (gear) + Fullscreen + Camera + chart-style-toggle

### Operar pill: 28px tall rounded-14, border 1px #4a4a4a, text "Operar" Trebuchet 14px #dbdbdb px-8 with inner px-4 startTextSlot

### Publicar pill: 28x? rounded-16, bg #f2f2f2, text "Publicar" Trebuchet 14px center #000 px-12

## LEFT TOOLBAR (1:2393) — 52x858, bg #0f0f0f
Vertical stack of groups separated by 36px wide 1px #4a4a4a horizontal lines, padding 6px around groups:

Group 1 (8 dropdown tools, each 52x38 with 11px right-side dropdown indicator):
- Tools: crosshair, line, hlines, fibonacci, brush, measure, text, emoji
Group 2 (single icons, 52x44 with pt-6 then 52x38):
- Flag (44px), Eraser (38px)
Group 3:
- Lock (52x38 dropdown), Eye (38px), Edit (38px), Zoom (38px dropdown)
Group 4:
- Trash (52x38 dropdown)
Fill
Bottom 26px (empty area for resize handle)

## RIGHT SIDEBAR (1:2950) — 45x858, bg #0f0f0f, border-left 1px #2e2e2e
Icons (44x44 each, centered horizontally) at exact Y positions:
y=2: Watchlist
y=46: Alertas  
y=92: Árbol de objetos y ventana de datos
y=138: Chats
y=529: (gap, mid-area icon)
y=573: (icon)
y=617: (icon)
y=661: Comunidad
y=707: Notificaciones
y=753: Productos
y=799: separator 33x1
y=812: (last icon)

## BOTTOM TOOLBAR (1:2903) — 1335x39, bg #0f0f0f, border-top 1px #2e2e2e
Left:
- Date range pills "1D" "5D" "1M" "3M" "6M" "YTD" "1A" "5A" "Todos" — each: text Trebuchet 14px #dbdbdb, padding px-6, height 38px (centered)
- Vertical separator 1x22px #4a4a4a (px-4 py-8 wrapper = 9px wide)
- Calendar icon button 28x28 (px-5)

Right (right-aligned):
- Text "HH:MM:SS UTC+2" Trebuchet 14px #dbdbdb px-6
- Vertical separator 1x22 #4a4a4a
- Text "ADJ" Trebuchet 14px #dbdbdb px-6

## CHART CENTER (1:2563) — 1335x858 contains:
- chart-container (1335x819): lightweight-charts canvas with:
  - Legend overlay top-left (4px,4px) showing: NVIDIA logo 18x18 + "NVIDIA Corporation" + "·" + "1D" + "·" + "NASDAQ" + status badge + buttons (star + more)
  - OHLC row below: O 220.90, H 221.01, L 214.80, C, +1.05 (+0.48%)
  - Price axis on right (54px wide) with currency badge
  - Bottom time axis 28px tall
- chart-toolbar (1335x39) at bottom — see above

