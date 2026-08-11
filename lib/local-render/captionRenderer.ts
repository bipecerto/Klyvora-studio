export function renderCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: string = 'Minimal',
  canvasWidth: number = 1080,
  canvasHeight: number = 1920
): void {
  if (!text || !text.trim()) return;

  const upperText = text.trim().toUpperCase();
  const maxLineWidth = canvasWidth * 0.82; // Safe area margin
  const positionY = canvasHeight * 0.78; // Lower 1/3 vertical alignment

  ctx.save();

  // Configure typography styling based on preset
  let fontSize = 54;
  let fontStyle = 'bold';
  let fontFamily = 'Inter, Arial, sans-serif';
  let fillStyle = '#FFFFFF';
  let strokeStyle = '#000000';
  let lineWidth = 8;
  let bgBox = false;
  let accentWordColor = '#F59E0B'; // Klyvora Amber/Gold

  const normalizedStyle = (style || 'Minimal').toLowerCase();

  if (normalizedStyle.includes('hormozi') || normalizedStyle.includes('dynamic')) {
    fontSize = 62;
    fontStyle = '900';
    fontFamily = 'Impact, "Arial Black", sans-serif';
    fillStyle = '#FFFFFF';
    strokeStyle = '#000000';
    lineWidth = 14;
  } else if (normalizedStyle.includes('bold')) {
    fontSize = 58;
    fontStyle = '800';
    fillStyle = '#FFFF00'; // Vibrant Yellow
    strokeStyle = '#000000';
    lineWidth = 10;
  } else if (normalizedStyle.includes('classic')) {
    fontSize = 48;
    fontStyle = 'bold';
    fillStyle = '#FFFFFF';
    bgBox = true;
  } else {
    // Minimal
    fontSize = 50;
    fontStyle = '600';
    fillStyle = '#FFFFFF';
    strokeStyle = 'rgba(0,0,0,0.8)';
    lineWidth = 8;
  }

  ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Helper for text word wrapping
  const words = upperText.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxLineWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const lineHeight = fontSize * 1.25;
  const totalHeight = lines.length * lineHeight;
  const startY = positionY - (totalHeight / 2) + (lineHeight / 2);

  // Optional background box for 'Classic' style
  if (bgBox) {
    let maxMeasuredWidth = 0;
    lines.forEach((l) => {
      const w = ctx.measureText(l).width;
      if (w > maxMeasuredWidth) maxMeasuredWidth = w;
    });

    const boxPaddingX = 24;
    const boxPaddingY = 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(
      canvasWidth / 2 - maxMeasuredWidth / 2 - boxPaddingX,
      startY - lineHeight / 2 - boxPaddingY,
      maxMeasuredWidth + boxPaddingX * 2,
      totalHeight + boxPaddingY * 2,
      16
    );
    ctx.fill();
  }

  // Draw each line with stroke and fill
  lines.forEach((lineStr, lineIdx) => {
    const y = startY + lineIdx * lineHeight;

    if (lineWidth > 0) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(lineStr, canvasWidth / 2, y);
    }

    ctx.fillStyle = fillStyle;
    ctx.fillText(lineStr, canvasWidth / 2, y);
  });

  ctx.restore();
}
