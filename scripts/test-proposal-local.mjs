/**
 * End-to-end proposal PDF test — uses the compiled API server bundle.
 * Run: node scripts/test-proposal-local.mjs [car|yacht]
 * Output: scripts/scraper/output/test-proposal-car.pdf  (or -yacht.pdf)
 */
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const mode = process.argv[2] ?? "car";

process.env["PUPPETEER_EXECUTABLE_PATH"] =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Build a tiny bundle that exports just the proposal engine function.
const tmpEntry = path.join(ROOT, "scripts/_tmp_proposal_entry.ts");
fs.writeFileSync(
  tmpEntry,
  `export { renderPdf } from "../artifacts/api-server/src/documents/pdf/generatePdf";
export { renderProposalHtml } from "../artifacts/api-server/src/documents/builders/proposal";
`,
);

const outFile = path.join(ROOT, "artifacts/api-server/dist/_tmp_proposal.mjs");

const esbuildCmd =
  path.join(ROOT, "artifacts/api-server/node_modules/.bin/esbuild.CMD");

execSync(
  `"${esbuildCmd}" "${tmpEntry}" ` +
    `--bundle --platform=node --format=esm ` +
    `--outfile="${outFile}" ` +
    `--external:puppeteer-core --external:@sparticuz/chromium --external:pino --external:pino-pretty ` +
    `--tsconfig="${path.join(ROOT, "artifacts/api-server/tsconfig.json")}"`,
  { cwd: ROOT, stdio: "inherit", shell: true },
);
fs.unlinkSync(tmpEntry);

const { renderPdf, renderProposalHtml } = await import(
  pathToFileURL(outFile).href
);
fs.unlinkSync(outFile);

const VEHICLES = {
  car: {
    id: 1,
    name: "Ferrari 488 GTB",
    category: "car",
    description:
      "<p>The Ferrari 488 GTB represents the pinnacle of Italian automotive engineering. " +
      "Every detail has been crafted to deliver an extraordinary driving experience, " +
      "combining breathtaking performance with everyday usability. " +
      "The twin-turbocharged V8 produces explosive power while remaining remarkably refined.</p>",
    image: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=1920",
    images: [
      "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=1920",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920",
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1920",
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920",
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1920",
    ],
    specs: {
      engine: "<p>3.9L V8 Twin-Turbo</p>",
      horsepower: "<p>660 HP</p>",
      torque: "<p>760 Nm</p>",
      transmission: "<p>7-Speed DCT</p>",
      drivetrain: "<p>RWD</p>",
      acceleration: "<p>3.0 s</p>",
      topSpeed: "<p>330 km/h</p>",
      seats: "<p>2</p>",
      fuelType: "<p>Petrol</p>",
      year: "<p>2022</p>",
      pricePerDay: "<p>2500</p>",
      deposit: "<p>10000</p>",
    },
  },
  yacht: {
    id: 2,
    name: "JONGERT 88 — Blue Horizon",
    category: "yacht",
    description:
      "<p>A magnificent sailing yacht with classic lines and modern performance. " +
      "Perfect for extended blue-water cruising with every luxury aboard. " +
      "She accommodates up to 8 guests in 4 elegant staterooms with professional crew of 4.</p>",
    image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1920",
    images: [
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1920",
      "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=1920",
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1920",
    ],
    specs: {
      yearBuilt: "2018",
      builder: "Jongert",
      length: "26.8 m",
      beam: "6.2 m",
      draft: "3.1 m",
      cabins: "4",
      guests: "8",
      crew: "4",
      cruisingSpeed: "10 kn",
      maxSpeed: "14 kn",
      pricePerDay: "€ 8,500",
      pricePerWeek: "€ 55,000",
    },
  },
};

const vehicle = VEHICLES[mode] ?? VEHICLES.car;

const contact = {
  phone: "+41 79 123 45 67",
  whatsapp: "+41 79 123 45 67",
  email: "info@transyachtgroup.com",
  website: "www.transyachtgroup.com",
};

console.log(`Building proposal HTML (${mode})...`);
const html = renderProposalHtml({
  vehicle,
  photos: vehicle.images,
  settings: { language: "english" },
  contact,
});

console.log("Generating PDF via Chrome...");
const buffer = await renderPdf(html);

const outDir = path.join(ROOT, "scripts/scraper/output");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `test-proposal-${mode}.pdf`);
fs.writeFileSync(outPath, buffer);
console.log(`PDF written: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
