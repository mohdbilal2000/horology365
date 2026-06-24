/* eslint-disable */
// Capture the running site and assemble a client-ready PDF deck.
//
// One-time setup (these are NOT kept in package.json to keep deploys lean):
//   npm i -D puppeteer pdf-lib
// Then, with the production server running:
//   npm run build && npx next start -p 3300 &
//   BASE_URL=http://localhost:3300 node scripts/capture-deck.cjs
// Output: Horology365-Website-Preview.pdf
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const BASE = process.env.BASE_URL || "http://localhost:3300";
const OUT_DIR = "/tmp/shots";
const GOLD = rgb(0.784, 0.647, 0.357);
const INK = rgb(0.043, 0.043, 0.051);
const BONE = rgb(0.969, 0.961, 0.941);

const SEED_CART = JSON.stringify({
  state: {
    items: [
      {
        productId: "pr-casio-g-shock-ga2100",
        slug: "casio-g-shock-ga2100",
        title: "Casio G-Shock GA-2100 'CasiOak'",
        brandName: "Casio",
        price: 9995,
        mrp: 12995,
        imageUrl:
          "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=70",
        imageAlt: "Casio G-Shock GA-2100 — front view",
        quantity: 1,
        isPreorder: false,
      },
      {
        productId: "pr-mk-lexington-gold",
        slug: "mk-lexington-gold",
        title: "Michael Kors Lexington Gold",
        brandName: "Michael Kors",
        price: 21995,
        mrp: 26995,
        imageUrl:
          "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=1200&q=70",
        imageAlt: "Michael Kors Lexington Gold — front view",
        quantity: 1,
        isPreorder: false,
      },
    ],
  },
  version: 0,
});

const PAGES = [
  { path: "/", title: "Home — The Showroom", note: "Video hero card slider, trust strip, brand wall", device: "desktop" },
  { path: "/", title: "Home — Mobile", note: "Fully responsive, 390px viewport", device: "mobile" },
  { path: "/brand/casio", title: "Brand Collection — Casio", note: "One template, all 14 brands", device: "desktop" },
  { path: "/category/mens-watches", title: "Category — Men's Watches", note: "46 watches, consistent product cards", device: "desktop" },
  { path: "/product/casio-g-shock-ga2100", title: "Product Detail", note: "Gallery + zoom, price, stock, add-to-cart, WhatsApp", device: "desktop" },
  { path: "/product/casio-g-shock-ga2100", title: "Product — Mobile", note: "", device: "mobile" },
  { path: "/cart", title: "Shopping Cart", note: "Zustand cart, savings, free-shipping meter", device: "desktop", seed: true },
  { path: "/checkout", title: "Checkout — UPI", note: "UPI ID + live QR + reference; COD coming soon", device: "desktop", seed: true },
  { path: "/about", title: "About Us", note: "Brand story + the pre-order drop model", device: "desktop" },
  { path: "/why-buy", title: "Why Buy From Us", note: "Trust-building reasons", device: "desktop" },
  { path: "/contact", title: "Contact", note: "WhatsApp-first support + form", device: "desktop" },
  { path: "/admin", title: "Admin — Inventory", note: "Brand / Model / Variant stock & pre-order pipeline", device: "desktop" },
  { path: "/admin/products/new", title: "Admin — Add Product", note: "Guided builder with live preview", device: "desktop" },
];

const FORCE_CSS = `
  .reveal{opacity:1 !important;transform:none !important;}
  *,*::before,*::after{animation-duration:0s !important;animation-delay:0s !important;transition:none !important;}
`;

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight + 1000) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 60);
    });
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const shots = [];
  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];
    const page = await browser.newPage();
    const isMobile = p.device === "mobile";
    await page.setViewport({
      width: isMobile ? 390 : 1440,
      height: isMobile ? 844 : 900,
      deviceScaleFactor: isMobile ? 2 : 1.4,
      isMobile,
    });
    if (p.seed) {
      await page.evaluateOnNewDocument((cart) => {
        try { localStorage.setItem("horology365-cart", cart); } catch (e) {}
      }, SEED_CART);
    }
    await page.goto(BASE + p.path, { waitUntil: "networkidle2", timeout: 60000 });
    await page.addStyleTag({ content: FORCE_CSS });
    await autoScroll(page);
    await new Promise((r) => setTimeout(r, p.path === "/checkout" ? 2500 : 1200));
    const file = path.join(OUT_DIR, `shot-${i}.jpg`);
    await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 82 });
    const dims = await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }));
    shots.push({ ...p, file, dims });
    console.log(`captured ${p.title} (${dims.w}x${dims.h})`);
    await page.close();
  }
  await browser.close();

  // ── Assemble PDF ──
  const pdf = await PDFDocument.create();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const PAGE_W = 1280;
  const HEADER = 84;

  // Cover
  {
    const cover = pdf.addPage([PAGE_W, 720]);
    cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 720, color: INK });
    cover.drawRectangle({ x: 0, y: 350, width: PAGE_W, height: 6, color: GOLD });
    cover.drawText("HOROLOGY365", { x: 80, y: 470, size: 74, font: fontBold, color: BONE });
    cover.drawText("The Showroom — e-commerce website", { x: 84, y: 410, size: 26, font, color: GOLD });
    cover.drawText("Authentic watches  |  14 brands  |  79 products  |  UPI checkout", {
      x: 84, y: 300, size: 18, font, color: rgb(0.8, 0.8, 0.8),
    });
    cover.drawText("Phase 1 — Frontend demo (clickable, mock data)", {
      x: 84, y: 270, size: 16, font, color: rgb(0.65, 0.65, 0.65),
    });
    cover.drawText("Prepared for client review · " + new Date().toISOString().slice(0, 10), {
      x: 84, y: 80, size: 14, font, color: rgb(0.55, 0.55, 0.55),
    });
  }

  // Standard fonts use WinAnsi (CP1252); strip glyphs it can't encode.
  const clean = (str) =>
    str
      .replace(/→/g, "/")
      .replace(/[↗←↑↓]/g, "")
      .replace(/[^\x00-ſ]/g, "");

  for (const s of shots) {
    const bytes = fs.readFileSync(s.file);
    const img = await pdf.embedJpg(bytes);
    // scale image to PAGE_W width
    const scale = PAGE_W / img.width;
    const imgH = img.height * scale;
    const pageH = imgH + HEADER;
    const pg = pdf.addPage([PAGE_W, pageH]);
    // image
    pg.drawImage(img, { x: 0, y: 0, width: PAGE_W, height: imgH });
    // header bar
    pg.drawRectangle({ x: 0, y: pageH - HEADER, width: PAGE_W, height: HEADER, color: INK });
    pg.drawRectangle({ x: 0, y: pageH - HEADER, width: 6, height: HEADER, color: GOLD });
    pg.drawText(clean(s.title), { x: 32, y: pageH - 40, size: 24, font: fontBold, color: BONE });
    if (s.note) {
      pg.drawText(clean(s.note), { x: 32, y: pageH - 66, size: 13, font, color: rgb(0.72, 0.72, 0.72) });
    }
  }

  const outName = "Horology365-Website-Preview.pdf";
  fs.writeFileSync(outName, await pdf.save());
  console.log("PDF written:", outName, (fs.statSync(outName).size / 1e6).toFixed(2) + "MB");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
