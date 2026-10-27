const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** WCAG relative luminance of a #RRGGBB color, 0 (black) to 1 (white). */
export const relativeLuminance = (hex: string): number => {
  if (!HEX_COLOR_RE.test(hex)) return 0;
  const channel = (offset: number) => {
    const s = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};

/** WCAG contrast ratio between two #RRGGBB colors, 1 to 21. */
export const contrastRatio = (a: string, b: string): number => {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
};
