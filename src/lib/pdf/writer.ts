/**
 * A minimal, dependency-free PDF writer.
 *
 * We only ever render text, rules and filled rectangles using the 14 standard
 * PDF base fonts (Helvetica), which every reader has built in — so nothing has
 * to be embedded and the whole generator stays a few hundred lines with no
 * third-party code in the supply chain. That matters here: invoices are
 * generated on the order path, so a compromised PDF library would sit directly
 * next to customer names, addresses and phone numbers.
 *
 * Coordinates follow the PDF convention (origin bottom-left, points as units).
 */

export type FontName = "Helvetica" | "Helvetica-Bold";

/** A4 in PostScript points. */
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

/**
 * Escapes a string for a PDF literal string object and strips anything outside
 * WinAnsi, which the standard fonts cannot render. Without this, a customer
 * name containing "(" or "\" would corrupt the file.
 */
function pdfString(text: string): string {
  const ascii = text.replace(/[^\x20-\x7E -ÿ]/g, "?");
  return ascii.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Widths (per 1000 units) for Helvetica — enough to measure and wrap text. */
const HELVETICA_WIDTHS: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, "[": 278,
  "\\": 278, "]": 278, "^": 469, _: 556, "`": 333, a: 556, b: 556, c: 500,
  d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222,
  m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556,
  v: 500, w: 722, x: 500, y: 500, z: 500, "{": 334, "|": 260, "}": 334, "~": 584,
};

/** Bold glyphs are wider; these are the deltas that actually matter for layout. */
const BOLD_WIDTHS: Record<string, number> = {
  ...HELVETICA_WIDTHS,
  " ": 278, "'": 238, "(": 333, ")": 333, ",": 278, "-": 333, ".": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556,
  "7": 556, "8": 556, "9": 556, ":": 333, ";": 333,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
  J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278,
  j: 278, k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389,
  s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
};

/** Width of `text` in points at `size`, used for right-alignment and wrapping. */
export function measure(text: string, size: number, font: FontName): number {
  const table = font === "Helvetica-Bold" ? BOLD_WIDTHS : HELVETICA_WIDTHS;
  let total = 0;
  for (const ch of text) total += table[ch] ?? 556;
  return (total / 1000) * size;
}

/** Greedy word-wrap to `maxWidth`, breaking over-long words mid-token. */
export function wrap(
  text: string,
  size: number,
  font: FontName,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size, font) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // A single token longer than the column still has to fit somehow.
    if (measure(word, size, font) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        if (measure(chunk + ch, size, font) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      line = chunk;
    } else line = word;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Builds a single-page-per-`newPage()` PDF by accumulating content-stream
 * operators, then assembles the xref table on `build()`.
 */
export class PdfBuilder {
  private pages: string[] = [];
  private current: string[] = [];

  newPage(): void {
    if (this.current.length) this.pages.push(this.current.join("\n"));
    this.current = [];
  }

  text(
    value: string,
    x: number,
    y: number,
    opts: { size?: number; font?: FontName; color?: Rgb } = {},
  ): void {
    const { size = 10, font = "Helvetica", color = rgb(0, 0, 0) } = opts;
    const res = font === "Helvetica-Bold" ? "/F2" : "/F1";
    this.current.push(
      `BT ${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg ` +
        `${res} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ` +
        `(${pdfString(value)}) Tj ET`,
    );
  }

  /** Draws `value` so that its right edge lands on `xRight`. */
  textRight(
    value: string,
    xRight: number,
    y: number,
    opts: { size?: number; font?: FontName; color?: Rgb } = {},
  ): void {
    const { size = 10, font = "Helvetica" } = opts;
    this.text(value, xRight - measure(value, size, font), y, opts);
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb): void {
    this.current.push(
      `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg ` +
        `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb, width = 0.7): void {
    this.current.push(
      `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} RG ` +
        `${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  /** Serialises every page into a finished PDF document. */
  build(): Buffer {
    if (this.current.length) this.pages.push(this.current.join("\n"));
    if (!this.pages.length) this.pages.push("");

    const objects: string[] = [];
    const pageCount = this.pages.length;
    // 1 = Catalog, 2 = Pages, 3 = F1, 4 = F2, then (page, content) pairs.
    const firstPageObj = 5;
    const kids = this.pages
      .map((_, i) => `${firstPageObj + i * 2} 0 R`)
      .join(" ");

    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);
    objects.push(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    );
    objects.push(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    );

    this.pages.forEach((content, i) => {
      const contentObj = firstPageObj + i * 2 + 1;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`,
      );
      objects.push(
        `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
      );
    });

    const chunks: Buffer[] = [];
    let offset = 0;
    const push = (s: string) => {
      const b = Buffer.from(s, "latin1");
      chunks.push(b);
      offset += b.length;
    };

    push("%PDF-1.4\n");
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(offset);
      push(`${i + 1} 0 obj\n${body}\nendobj\n`);
    });

    const xrefStart = offset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${String(off).padStart(10, "0")} 00000 n \n`;
    }
    push(xref);
    push(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
    );

    return Buffer.concat(chunks);
  }
}
