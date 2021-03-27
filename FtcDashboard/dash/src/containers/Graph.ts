import { cloneDeep } from 'lodash';
import { fineLineTo, fineMoveTo } from './canvas';

type GraphOptions = {
  windowMs: number;
  delayMs: number; // animation delay to allow for data transmission time

  colors: string[];
  lineWidth: number;

  padding: number;
  legendSpacing: 4;
  legendLineLength: 12;

  gridLineWidth: number; // device pixels
  gridLineColor: string;
  fontSize: number;
  textColor: string;
  maxTicks: number;
};

type Axis = {
  min: number;
  max: number;
  spacing: number;
};

export type Sample = { data: [string, number][]; timestamp: number };

// all dimensions in this file are *CSS* pixels unless otherwise stated
export const DEFAULT_OPTIONS: GraphOptions = {
  windowMs: 5000,
  delayMs: 250,
  colors: ['#2979ff', '#dd2c00', '#4caf50', '#7c4dff', '#ffa000'],
  lineWidth: 2,
  padding: 15,
  legendSpacing: 4,
  legendLineLength: 12,
  gridLineWidth: 1, // device pixels
  gridLineColor: 'rgb(120, 120, 120)',
  fontSize: 14,
  textColor: 'rgb(50, 50, 50)',
  maxTicks: 7,
};

function niceNum(range: number, round: boolean) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction;
  if (round) {
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  } else if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

// interesting algorithm (see http://erison.blogspot.nl/2011/07/algorithm-for-optimal-scaling-on-chart.html)
function getAxisScaling(min: number, max: number, maxTicks: number) {
  const range = niceNum(max - min, false);
  const tickSpacing = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  const niceMax = (Math.floor(max / tickSpacing) + 1) * tickSpacing;
  return {
    min: niceMin,
    max: niceMax,
    spacing: tickSpacing,
  };
}

// shamelessly stolen from https://github.com/chartjs/Chart.js/blob/master/src/core/core.ticks.js
function formatTicks(tickValue: number, ticks: number[]) {
  // If we have lots of ticks, don't use the ones
  let delta = ticks.length > 3 ? ticks[2] - ticks[1] : ticks[1] - ticks[0];

  // If we have a number like 2.5 as the delta, figure out how many decimal places we need
  if (Math.abs(delta) > 1) {
    if (tickValue !== Math.floor(tickValue)) {
      // not an integer
      delta = tickValue - Math.floor(tickValue);
    }
  }

  const logDelta = Math.log10(Math.abs(delta));
  let tickString = '';

  if (tickValue !== 0) {
    let numDecimal = -1 * Math.floor(logDelta);
    numDecimal = Math.max(Math.min(numDecimal, 20), 0); // toFixed has a max of 20 decimal places
    tickString = tickValue.toFixed(numDecimal);
  } else {
    tickString = '0'; // never show decimal places for 0
  }

  return tickString;
}

function getTicks(axis: Axis) {
  // get tick array
  const ticks: number[] = [];
  for (let i = axis.min; i <= axis.max; i += axis.spacing) {
    ticks.push(i);
  }

  // generate strings
  const tickStrings: string[] = [];
  for (let i = 0; i < ticks.length; i++) {
    const s = formatTicks(ticks[i], ticks);
    tickStrings.push(s);
  }

  return tickStrings;
}

function scale(
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number,
) {
  const frac = (toHigh - toLow) / (fromHigh - fromLow);
  return toLow + frac * (value - fromLow);
}

export default class Graph {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  options: GraphOptions;

  keys: string[] = [];
  keyMetadata: { [id: string]: { color: string; count: number } } = {};

  nextColorIndex = 0;

  samples: {
    externalTimestamp: number;
    animTimestamp: number;
    data: Sample['data'];
  }[] = [];

  frozen = false;
  frozenTime = -1;

  constructor(canvas: HTMLCanvasElement, options: Partial<GraphOptions>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.options = cloneDeep(DEFAULT_OPTIONS);
    Object.assign(this.options, options || {});

    this.clear();
  }

  clear() {
    this.keys = [];
    this.keyMetadata = {};
    this.nextColorIndex = 0;
    this.samples = [];
  }

  private _getCurrentAnimTimestamp() {
    if (this.frozen) return this.frozenTime + this.options.delayMs;

    return Date.now() + this.options.delayMs;
  }

  private _addNewSample({ timestamp, data }: Sample) {
    const animTimestamp = (() => {
      // map the external timestamp to animation/client timestamp
      if (this.samples.length > 0) {
        // if we have a previous sample, simply add the diff
        const priorSample = this.samples[0];
        return (
          priorSample.animTimestamp +
          (timestamp - priorSample.externalTimestamp)
        );
      } else {
        // otherwise we assign it the current anim timestamp
        return this._getCurrentAnimTimestamp();
      }
    })();

    for (const [key] of data) {
      if (!this.keys.includes(key)) {
        this.keys.push(key);
      }

      if (!Object.prototype.hasOwnProperty.call(this.keyMetadata, key)) {
        this.keyMetadata[key] = {
          color: this.options.colors[this.nextColorIndex],
          count: 1,
        };

        this.nextColorIndex =
          (this.nextColorIndex + 1) % this.options.colors.length;
      } else {
        this.keyMetadata[key].count++;
      }
    }

    this.samples.push({
      externalTimestamp: timestamp,
      animTimestamp,
      data,
    });
  }

  private _pruneOldSamples() {
    const now = this._getCurrentAnimTimestamp();
    let index = 0;
    while (
      index < this.samples.length &&
      this.samples[index].animTimestamp + this.options.windowMs < now
    ) {
      index++;
    }

    for (const sample of this.samples.splice(0, index)) {
      const { data } = sample;

      for (const [key] of data) {
        if (this.keyMetadata[key].count === 1) {
          delete this.keyMetadata[key];
          this.keys = this.keys.filter((otherKey) => otherKey !== key);
        } else {
          this.keyMetadata[key].count--;
        }
      }
    }
  }

  addSamples(samples: Sample[]) {
    for (const sample of samples) {
      if (sample.data.length === 0) continue;

      this._addNewSample(sample);
    }

    this._pruneOldSamples();
  }

  setFrozen(val: boolean) {
    this.frozen = val;

    if (this.frozen) this.frozenTime = Date.now();
  }

  getAxis() {
    // get y-axis scaling
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    for (const sample of this.samples) {
      const { data } = sample;
      for (const [, value] of data) {
        if (value > max) {
          max = value;
        }
        if (value < min) {
          min = value;
        }
      }
    }

    if (Math.abs(min - max) < 1e-6) {
      return getAxisScaling(min - 1, max + 1, this.options.maxTicks);
    }

    return getAxisScaling(min, max, this.options.maxTicks);
  }

  render() {
    if (!this.ctx) return;

    const o = this.options;

    // eslint-disable-next-line
    this.canvas.width = this.canvas.width; // clears the canvas

    // scale the canvas to facilitate the use of CSS pixels
    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    this.ctx.font = `${o.fontSize}px "Roboto", sans-serif`;
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
    this.ctx.lineWidth = o.lineWidth / devicePixelRatio;

    const width = this.canvas.width / devicePixelRatio;
    const height = this.canvas.height / devicePixelRatio;

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, width, height);

    const legendHeight = this.renderLegend(0, 0, width) ?? 0;
    this.renderGraph(0, legendHeight, width, height - legendHeight);
  }

  renderLegend(x: number, y: number, width: number) {
    if (!this.ctx) return;

    const o = this.options;

    this.ctx.save();

    const numSets = this.keys.length;
    const height = numSets * o.fontSize + (numSets - 1) * o.legendSpacing;
    for (let i = 0; i < numSets; i++) {
      const lineY = y + i * (o.fontSize + o.legendSpacing) + o.fontSize / 2;
      const key = this.keys[i];
      const { color } = this.keyMetadata[key];
      const lineWidth =
        this.ctx.measureText(key).width + o.legendLineLength + o.legendSpacing;
      const lineX = x + (width - lineWidth) / 2;

      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      fineMoveTo(this.ctx, lineX, lineY);
      fineLineTo(this.ctx, lineX + o.legendLineLength, lineY);
      this.ctx.stroke();

      this.ctx.fillStyle = o.textColor;
      this.ctx.fillText(
        key,
        lineX + o.legendLineLength + o.legendSpacing,
        lineY,
      );
    }

    this.ctx.restore();

    return height;
  }

  renderGraph(x: number, y: number, width: number, height: number) {
    const o = this.options;

    const graphHeight = height - 2 * o.padding;

    const axis = this.getAxis();
    const ticks = getTicks(axis);
    const axisWidth =
      this.renderAxisLabels(x + o.padding, y + o.padding, graphHeight, ticks) ??
      0;

    const graphWidth = width - axisWidth - 3 * o.padding;

    this.renderGridLines(
      x + axisWidth + 2 * o.padding,
      y + o.padding,
      graphWidth,
      graphHeight,
      5,
      ticks.length,
    );

    this.renderGraphLines(
      x + axisWidth + 2 * o.padding,
      y + o.padding,
      graphWidth,
      graphHeight,
      axis,
    );
  }

  renderAxisLabels(x: number, y: number, height: number, ticks: string[]) {
    if (!this.ctx) return;

    this.ctx.save();

    let width = 0;
    for (let i = 0; i < ticks.length; i++) {
      const textWidth = this.ctx.measureText(ticks[i]).width;
      if (textWidth > width) {
        width = textWidth;
      }
    }

    // draw axis labels
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = this.options.textColor;

    const vertSpacing = height / (ticks.length - 1);
    x += width;
    for (let i = 0; i < ticks.length; i++) {
      this.ctx.fillText(
        ticks[i].toString(),
        x,
        y + (ticks.length - i - 1) * vertSpacing,
      );
    }

    this.ctx.restore();

    return width;
  }

  renderGridLines(
    x: number,
    y: number,
    width: number,
    height: number,
    numTicksX: number,
    numTicksY: number,
  ) {
    if (!this.ctx) return;

    this.ctx.save();

    this.ctx.strokeStyle = this.options.gridLineColor;
    this.ctx.lineWidth = this.options.gridLineWidth / devicePixelRatio;

    const horSpacing = width / (numTicksX - 1);
    const vertSpacing = height / (numTicksY - 1);

    for (let i = 0; i < numTicksX; i++) {
      const lineX = x + horSpacing * i;
      this.ctx.beginPath();
      fineMoveTo(this.ctx, lineX, y);
      fineLineTo(this.ctx, lineX, y + height);
      this.ctx.stroke();
    }

    for (let i = 0; i < numTicksY; i++) {
      const lineY = y + vertSpacing * i;
      this.ctx.beginPath();
      fineMoveTo(this.ctx, x, lineY);
      fineLineTo(this.ctx, x + width, lineY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderGraphLines(
    x: number,
    y: number,
    width: number,
    height: number,
    axis: Axis,
  ) {
    if (!this.ctx) return;

    const o = this.options;
    const now = this._getCurrentAnimTimestamp();

    this.ctx.lineWidth = o.lineWidth;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rect(0, 0, width, height);
    this.ctx.clip();

    // draw data lines
    // scaling is used instead of transform because non-uniform stretching warps the plot line
    this.ctx.beginPath();
    for (const key of this.keys) {
      const { color } = this.keyMetadata[key];
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      let first = true;
      for (const sample of this.samples) {
        const { animTimestamp, data } = sample;
        for (const [otherKey, value] of data) {
          if (key !== otherKey) continue;

          if (first) {
            fineMoveTo(
              this.ctx,
              scale(animTimestamp, now - o.windowMs, now, 0, width),
              scale(value, axis.min, axis.max, height, 0),
            );
          } else {
            fineLineTo(
              this.ctx,
              scale(animTimestamp, now - o.windowMs, now, 0, width),
              scale(value, axis.min, axis.max, height, 0),
            );
          }
          first = false;
        }
      }
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}
