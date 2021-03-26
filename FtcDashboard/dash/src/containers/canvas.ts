// align coordinate to the nearest pixel, offset by a half pixel
// this helps with drawing thin lines; e.g., if a line of width 1px
// is drawn on an integer coordinate, it will be 2px wide
// x is assumed to be in *device* pixels
export function alignCoord(x: number, scaling: number) {
  const roundX = Math.round(x * scaling);
  return (roundX + 0.5 * Math.sign(x - roundX)) / scaling;
}

function getScalingFactors(ctx: CanvasRenderingContext2D) {
  let transform;

  if (typeof ctx.getTransform === 'function') {
    transform = ctx.getTransform();
  } else {
    throw new Error('unable to find canvas transform');
  }

  const { a, b, c, d } = transform;
  const scalingX = Math.sqrt(a * a + c * c);
  const scalingY = Math.sqrt(b * b + d * d);

  return {
    scalingX,
    scalingY,
  };
}

export function fineMoveTo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  const { scalingX, scalingY } = getScalingFactors(ctx);
  ctx.moveTo(alignCoord(x, scalingX), alignCoord(y, scalingY));
}

export function fineLineTo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  const { scalingX, scalingY } = getScalingFactors(ctx);
  ctx.lineTo(alignCoord(x, scalingX), alignCoord(y, scalingY));
}
