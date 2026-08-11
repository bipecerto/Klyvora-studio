import { CaptionRecord } from './captionGenerator';

/**
 * Formats seconds to ASS timestamp string (H:MM:SS.cs)
 */
function formatAssTime(seconds: number): string {
  const safeSec = Math.max(0, seconds || 0);
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = Math.floor(safeSec % 60);
  const cs = Math.floor((safeSec % 1) * 100);

  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  const csStr = String(cs).padStart(2, '0');

  return `${h}:${mStr}:${sStr}.${csStr}`;
}

/**
 * Escapes special ASS characters
 */
function escapeAssText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

/**
 * Builds an Advanced SubStation Alpha (.ass) subtitle file string for FFmpeg burn-in.
 */
export function buildAssSubtitleContent(
  captions: CaptionRecord[],
  captionStyle: string = 'Hormozi'
): string {
  const styleUpper = (captionStyle || 'Hormozi').toUpperCase();

  let fontName = 'Arial';
  let fontSize = 60;
  let primaryColour = '&H00FFFFFF'; // White
  let secondaryColour = '&H0000FFFF'; // Yellow
  let outlineColour = '&H00000000'; // Black
  let backColour = '&H80000000'; // Translucent black
  let bold = 1;
  let borderStyle = 1; // 1 = Outline + Shadow, 3 = Opaque Box
  let outline = 3;
  let shadow = 1;
  let marginV = 240; // Y safe area (~1300-1450 in 1080x1920)

  if (styleUpper.includes('MINIMAL')) {
    fontSize = 46;
    bold = 0;
    outline = 1;
    outlineColour = '&H80000000';
    shadow = 0;
    marginV = 220;
  } else if (styleUpper.includes('BOLD')) {
    fontSize = 64;
    bold = 1;
    outline = 4;
    outlineColour = '&H00000000';
    shadow = 2;
    marginV = 240;
  } else if (styleUpper.includes('DYNAMIC')) {
    fontSize = 58;
    bold = 1;
    outline = 3;
    outlineColour = '&H00000000';
    shadow = 1;
    marginV = 250;
  } else if (styleUpper.includes('CLASSIC')) {
    fontSize = 50;
    bold = 0;
    borderStyle = 3; // Box background
    backColour = '&HA0000000';
    outline = 0;
    shadow = 0;
    marginV = 230;
  } else {
    // HORMOZI (Default)
    fontSize = 68;
    bold = 1;
    primaryColour = '&H0000FFFF'; // Bright Yellow
    outline = 4;
    outlineColour = '&H00000000';
    shadow = 2;
    marginV = 260;
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColour},${secondaryColour},${outlineColour},${backColour},${bold},0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogueLines = captions.map((cap) => {
    const startAss = formatAssTime(cap.start_time);
    const endAss = formatAssTime(cap.end_time);
    let escapedText = escapeAssText(cap.text);

    // Apply inline style highlights if Dynamic or Hormozi
    if (styleUpper.includes('HORMOZI') || styleUpper.includes('DYNAMIC')) {
      const words = escapedText.split(' ');
      if (words.length > 1) {
        // Highlight last or key word with purple Klyvora accent (\c&H00F65C8B&)
        const mainPart = words.slice(0, -1).join(' ');
        const lastWord = words[words.length - 1];
        escapedText = `${mainPart} {\\c&H00F65C8B&}${lastWord}{\\c}`;
      }
    }

    return `Dialogue: 0,${startAss},${endAss},Default,,0,0,0,,${escapedText}`;
  });

  return header + dialogueLines.join('\n') + '\n';
}
