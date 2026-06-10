/** CSS style extraction and processing */

/** Visual CSS properties to include in output (layout comes from rects) */
export const VISUAL_PROPS = new Set([
  // Backgrounds
  "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition",
  "backgroundRepeat", "backgroundClip",
  // Typography
  "color", "fontFamily", "fontSize", "fontWeight", "fontStyle",
  "lineHeight", "letterSpacing", "textAlign", "textTransform",
  "textDecoration", "textDecorationLine", "textDecorationColor",
  // Borders
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
  // Effects
  "boxShadow", "opacity", "backdropFilter", "filter",
  // Overflow
  "overflow", "overflowX", "overflowY",
  // Text behavior
  "whiteSpace", "wordBreak", "listStyleType",
  // Content alignment within positioned boxes
  "display", "alignItems", "justifyContent",
  // Stacking
  "zIndex",
]);

/** Build CSS props array from a node's computed styles */
export function buildVisualStyles(
  styles: Record<string, string>,
  bodyFont: string,
  bodyColor: string
): string[] {
  const props: string[] = [];

  for (const [prop, value] of Object.entries(styles)) {
    if (!VISUAL_PROPS.has(prop)) continue;

    // Skip default values that add no visual effect
    if (value === "rgba(0, 0, 0, 0)" && prop === "backgroundColor") continue;
    if (value === "none" && ["backgroundImage", "boxShadow", "filter", "backdropFilter", "textDecorationLine"].includes(prop)) continue;
    if (value === "1" && prop === "opacity") continue;
    if (value === "visible" && ["overflow", "overflowX", "overflowY"].includes(prop)) continue;
    if (value === "0px" && prop.startsWith("border") && prop.endsWith("Width")) continue;
    if (value === "none" && prop.startsWith("border") && prop.endsWith("Style")) continue;
    if (value === "0px" && prop.startsWith("border") && prop.endsWith("Radius")) continue;
    if (value === "start" && prop === "textAlign") continue;
    if (value === "normal" && ["letterSpacing", "lineHeight", "whiteSpace"].includes(prop)) continue;
    if (value === "disc" && prop === "listStyleType") continue;

    // Skip inherited values that match body
    if (prop === "fontFamily" && value === bodyFont) continue;
    if (prop === "color" && value === bodyColor) continue;

    const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
    props.push(`${kebab}: ${value}`);
  }

  return props;
}

/** Handle gradient text: background-clip: text with webkit prefixes */
export function applyGradientText(
  cssProps: string[],
  styles: Record<string, string>
): void {
  if (styles.backgroundClip !== "text") return;

  cssProps.push(`-webkit-background-clip: text`);
  cssProps.push(`-webkit-text-fill-color: transparent`);

  // Inline elements need inline-block for width/height to work with background-clip
  if (styles.display === "inline") {
    const displayIdx = cssProps.findIndex((p) => p.startsWith("display:"));
    if (displayIdx >= 0) cssProps[displayIdx] = "display: inline";
    else cssProps.push("display: inline");
  }
}

/** Fix contrast: set dark text on light backgrounds when inherited color is also light */
export function applyContrastFix(
  cssProps: string[],
  styles: Record<string, string>,
  bodyColor: string
): void {
  if (styles.backgroundClip === "text") return;

  const bg = styles.backgroundColor;
  const hasExplicitColor = styles.color && styles.color !== bodyColor;

  if (bg && !hasExplicitColor) {
    if (isLightColor(bg) && isLightColor(bodyColor)) {
      cssProps.push(`color: rgb(0, 0, 0)`);
    }
  }
}

/** Check if a CSS color value is visually light (high luminance) */
export function isLightColor(color: string): boolean {
  if (!color) return false;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return color === "white" || color === "rgb(255, 255, 255)";
  const r = parseInt(m[1]!);
  const g = parseInt(m[2]!);
  const b = parseInt(m[3]!);
  // If mostly transparent, not "light"
  const aMatch = color.match(/,\s*([\d.]+)\s*\)/);
  if (aMatch && parseFloat(aMatch[1]!) < 0.5) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}
