import trendLine from './trend-line.spec.js';
import ray from './ray.spec.js';
import segment from './segment.spec.js';
import horizontalLine from './horizontal-line.spec.js';
import verticalLine from './vertical-line.spec.js';
import rectangle from './rectangle.spec.js';
import fibRetracement from './fib-retracement.spec.js';
import fibExtension from './fib-extension.spec.js';
import fibChannel from './fib-channel.spec.js';
import fibTime from './fib-time.spec.js';
import fibFan from './fib-fan.spec.js';
import fibCircle from './fib-circle.spec.js';
import fibSpiral from './fib-spiral.spec.js';
import fibArcs from './fib-arcs.spec.js';
import fibWedge from './fib-wedge.spec.js';
import pitchfork from './pitchfork.spec.js';
import insidePitchfork from './inside-pitchfork.spec.js';
import schiffPitchfork from './schiff-pitchfork.spec.js';
import modifiedSchiffPitchfork from './modified-schiff-pitchfork.spec.js';
import longPosition from './long-position.spec.js';
import shortPosition from './short-position.spec.js';
import forecast from './forecast.spec.js';
import ghostFeed from './ghost-feed.spec.js';
import barPattern from './bar-pattern.spec.js';
import measureDistance from './measure-distance.spec.js';
import measureVolume from './measure-volume.spec.js';
import anchoredVwap from './anchored-vwap.spec.js';
import fixedRangeVolumeProfile from './fixed-range-volume-profile.spec.js';
import text from './text.spec.js';

// Líneas avanzadas
import infoLine from './info-line.spec.js';
import extLine from './ext-line.spec.js';
import trendAngle from './trend-angle.spec.js';
import crossLine from './cross-line.spec.js';
import hRay from './h-ray.spec.js';

// Canales
import parallelChannel from './parallel-channel.spec.js';
import regressionTrend from './regression-trend.spec.js';
import priceChannel from './price-channel.spec.js';
import disjointChannel from './disjoint-channel.spec.js';

// Gann
import gannBox from './gann-box.spec.js';
import gannFan from './gann-fan.spec.js';
import gannSquare from './gann-square.spec.js';
import gannSquare144 from './gann-square144.spec.js';
import gannGrid from './gann-grid.spec.js';

// Formas
import circle from './circle.spec.js';
import ellipse from './ellipse.spec.js';
import triangle from './triangle.spec.js';
import arc from './arc.spec.js';
import rotatedRectangle from './rotated-rectangle.spec.js';

// Pinceles
import brush from './brush.spec.js';
import highlighter from './highlighter.spec.js';
import polyline from './polyline.spec.js';

// Curvas
import pathBezier from './path-bezier.spec.js';
import curve from './curve.spec.js';
import doubleCurve from './double-curve.spec.js';

// Elliott Waves
import elliottImpulse from './elliott-impulse.spec.js';
import elliottCorrection from './elliott-correction.spec.js';
import elliottTriangle from './elliott-triangle.spec.js';
import elliottDoubleCombo from './elliott-double-combo.spec.js';
import elliottTripleCombo from './elliott-triple-combo.spec.js';

// Harmonic patterns
import abcd from './abcd.spec.js';
import xabcd from './xabcd.spec.js';
import cypher from './cypher.spec.js';

// Pattern detection
import headAndShoulders from './head-and-shoulders.spec.js';
import trianglePattern from './triangle-pattern.spec.js';
import threeDrives from './three-drives.spec.js';

// Annotations
import callout from './callout.spec.js';
import comment from './comment.spec.js';
import anchoredNote from './anchored-note.spec.js';
import priceLabel from './price-label.spec.js';
import flag from './flag.spec.js';

// Arrows
import arrow from './arrow.spec.js';
import arrowUp from './arrow-up.spec.js';
import arrowDown from './arrow-down.spec.js';
import arrowMark from './arrow-mark.spec.js';

// Cycles
import cyclicLines from './cyclic-lines.spec.js';
import timeCycles from './time-cycles.spec.js';
import sineLine from './sine-line.spec.js';

export const ALL_SPECS = [
  trendLine,
  ray,
  segment,
  horizontalLine,
  verticalLine,
  rectangle,
  fibRetracement,
  fibExtension,
  fibChannel,
  fibTime,
  fibFan,
  fibCircle,
  fibSpiral,
  fibArcs,
  fibWedge,
  pitchfork,
  insidePitchfork,
  schiffPitchfork,
  modifiedSchiffPitchfork,
  longPosition,
  shortPosition,
  // Predict + Measure + Anchored
  forecast,
  ghostFeed,
  barPattern,
  measureDistance,
  measureVolume,
  anchoredVwap,
  fixedRangeVolumeProfile,
  text,
  // Líneas avanzadas
  infoLine,
  extLine,
  trendAngle,
  crossLine,
  hRay,
  // Canales
  parallelChannel,
  regressionTrend,
  priceChannel,
  disjointChannel,
  // Gann
  gannBox,
  gannFan,
  gannSquare,
  gannSquare144,
  gannGrid,
  // Formas
  circle,
  ellipse,
  triangle,
  arc,
  rotatedRectangle,
  // Pinceles
  brush,
  highlighter,
  polyline,
  // Curvas
  pathBezier,
  curve,
  doubleCurve,
  // Elliott Waves
  elliottImpulse,
  elliottCorrection,
  elliottTriangle,
  elliottDoubleCombo,
  elliottTripleCombo,
  // Harmonic patterns
  abcd,
  xabcd,
  cypher,
  // Pattern detection
  headAndShoulders,
  trianglePattern,
  threeDrives,
  // Annotations
  callout,
  comment,
  anchoredNote,
  priceLabel,
  flag,
  // Arrows
  arrow,
  arrowUp,
  arrowDown,
  arrowMark,
  // Cycles
  cyclicLines,
  timeCycles,
  sineLine,
];

export {
  trendLine,
  ray,
  segment,
  horizontalLine,
  verticalLine,
  rectangle,
  fibRetracement,
  fibExtension,
  fibChannel,
  fibTime,
  fibFan,
  fibCircle,
  fibSpiral,
  fibArcs,
  fibWedge,
  pitchfork,
  insidePitchfork,
  schiffPitchfork,
  modifiedSchiffPitchfork,
  longPosition,
  shortPosition,
  forecast,
  ghostFeed,
  barPattern,
  measureDistance,
  measureVolume,
  anchoredVwap,
  fixedRangeVolumeProfile,
  text,
  infoLine,
  extLine,
  trendAngle,
  crossLine,
  hRay,
  parallelChannel,
  regressionTrend,
  priceChannel,
  disjointChannel,
  gannBox,
  gannFan,
  gannSquare,
  gannSquare144,
  gannGrid,
  circle,
  ellipse,
  triangle,
  arc,
  rotatedRectangle,
  brush,
  highlighter,
  polyline,
  pathBezier,
  curve,
  doubleCurve,
  elliottImpulse,
  elliottCorrection,
  elliottTriangle,
  elliottDoubleCombo,
  elliottTripleCombo,
  abcd,
  xabcd,
  cypher,
  headAndShoulders,
  trianglePattern,
  threeDrives,
  callout,
  comment,
  anchoredNote,
  priceLabel,
  flag,
  arrow,
  arrowUp,
  arrowDown,
  arrowMark,
  cyclicLines,
  timeCycles,
  sineLine,
};

export default ALL_SPECS;
