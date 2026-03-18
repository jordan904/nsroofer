const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const PAGES = [
  'index.html',
  'shingle-roofing.html',
  'metal-roofing.html',
  'siding.html',
  'insulation.html'
];

const SCREENSHOT_DIR = path.join(__dirname, '_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshotPage(page, pageName) {
  const safeName = pageName.replace('.html', '');
  const url = `${BASE_URL}/${pageName}`;

  console.log(`\n=== Processing: ${pageName} ===`);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Dismiss loader
  await page.evaluate(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  });

  await sleep(800);

  // Get total page height
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 800;
  const scrollStep = 700;

  console.log(`  Page height: ${totalHeight}px`);

  const screenshots = [];
  let scrollY = 0;
  let n = 0;

  // Scroll to top first
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  while (scrollY <= totalHeight) {
    const filename = `${safeName}_sym_${n}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    await page.screenshot({ path: filepath, fullPage: false });
    screenshots.push(filepath);
    console.log(`  Screenshot ${n}: scrollY=${scrollY} -> ${filepath}`);

    if (scrollY + viewportHeight >= totalHeight) break;

    scrollY += scrollStep;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await sleep(1200);
    n++;
  }

  return screenshots;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    for (const pageName of PAGES) {
      await screenshotPage(page, pageName);
    }

    console.log('\n=== All screenshots taken ===');
    console.log('Files saved in:', SCREENSHOT_DIR);

    // List all files
    const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
    console.log(`Total screenshots: ${files.length}`);
    files.forEach(f => console.log(' -', f));

  } finally {
    await browser.close();
  }
})();
