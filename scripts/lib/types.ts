/** figh2d capture data types */

export interface FigH2DData {
  documentTitle: string;
  root: H2DNode;
  documentRect: { x: number; y: number; width: number; height: number };
  viewportRect: { x: number; y: number; width: number; height: number };
  devicePixelRatio: number;
  assets: Record<
    string,
    { url: string; blob: { type: string; base64Blob: string } | null; error?: string }
  >;
  fonts: Record<
    string,
    {
      familyName: string;
      faces: any[];
      usages: { fontWeight: string; fontStyle: string; fontStretch: string; fontSize: string }[];
    }
  >;
}

export interface H2DNode {
  nodeType: number; // 1 = element, 3 = text
  id?: string;
  tag?: string;
  attributes?: Record<string, string>;
  styles?: Record<string, string>;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    cssWidth?: number;
    cssHeight?: number;
  };
  childNodes?: H2DNode[];
  content?: string; // SVG outerHTML
  text?: string;
  lineCount?: number;
}
