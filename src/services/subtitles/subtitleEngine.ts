import { ISubtitleEngine } from '../../types/engines';
import { TranslatedSegment } from '../../types/project';

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export class SubtitleEngine implements ISubtitleEngine {
  generateSubtitles(
    segments: TranslatedSegment[],
    totalDuration: number
  ): {
    segments: TranslatedSegment[];
    getActiveSubtitle: (currentTime: number) => string | null;
  } {
    const cues: SubtitleCue[] = [];
    const safeDuration = Math.max(1, totalDuration || 30);

    if (segments.length > 0) {
      segments.forEach((seg, idx) => {
        const start = typeof seg.start === 'number' ? seg.start : (idx * safeDuration) / segments.length;
        const end = typeof seg.end === 'number' ? seg.end : ((idx + 1) * safeDuration) / segments.length;
        cues.push({
          id: seg.id,
          start,
          end: Math.min(safeDuration, end),
          text: seg.translatedText.trim(),
        });
      });
    }

    const getActiveSubtitle = (currentTime: number): string | null => {
      const active = cues.find((c) => currentTime >= c.start && currentTime <= c.end);
      return active ? active.text : null;
    };

    return {
      segments,
      getActiveSubtitle,
    };
  }

  /**
   * Renders subtitle text onto an HTML5 Canvas with mobile-safe padding,
   * high-contrast rounded background box, and crisp typography.
   */
  static renderSubtitleOnCanvas(
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number,
    fontSizeKey: 'sm' | 'md' | 'lg' = 'md'
  ): void {
    if (!text || !text.trim()) return;

    // Scale font size based on video height (portrait/landscape responsive)
    const scaleFactor = height / 1000;
    const baseSizes = { sm: 22, md: 30, lg: 38 };
    const fontSize = Math.max(14, Math.round(baseSizes[fontSizeKey] * scaleFactor));

    ctx.save();
    ctx.font = `600 ${fontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text wrapping
    const maxTextWidth = width * 0.85;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.35;
    const boxHeight = lines.length * lineHeight + fontSize * 0.8;
    const bottomMargin = height * 0.12; // Mobile-safe bottom margin (above video controls)
    const boxY = height - bottomMargin - boxHeight / 2;

    // Compute maximum line width for tight rounded pill background
    let maxLineWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }
    const boxWidth = Math.min(width * 0.92, maxLineWidth + fontSize * 1.5);
    const boxX = (width - boxWidth) / 2;
    const radius = Math.min(12, fontSize * 0.4);

    // Draw frosted dark pill container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY - boxHeight / 2, boxWidth, boxHeight, radius);
    ctx.fill();
    ctx.stroke();

    // Draw text with subtle shadow
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const startTextY = boxY - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startTextY + i * lineHeight);
    });

    ctx.restore();
  }
}
