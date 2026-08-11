export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number = 1.0,
  translateX: number = 0,
  translateY: number = 0
): void {
  const imgWidth = img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width;
  const imgHeight = img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;

  if (!imgWidth || !imgHeight) return;

  // Calculate object-fit: cover aspect ratio scaling
  const imgAspect = imgWidth / imgHeight;
  const canvasAspect = w / h;

  let renderW = w;
  let renderH = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > canvasAspect) {
    // Image is wider than canvas
    renderH = h;
    renderW = h * imgAspect;
    offsetX = (w - renderW) / 2;
  } else {
    // Image is taller or equal aspect
    renderW = w;
    renderH = w / imgAspect;
    offsetY = (h - renderH) / 2;
  }

  ctx.save();

  // Apply center-pivoted transformation (scale + translation)
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  ctx.translate(centerX + translateX, centerY + translateY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);

  ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);

  ctx.restore();
}
