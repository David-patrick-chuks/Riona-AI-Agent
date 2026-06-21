import puppeteer, { Browser } from 'puppeteer';
import DOMPurify, { type WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';
import { saveScrapedData } from '../../utils';

// Function to clean the HTML content
function cleanHTML(inputHtml: string): string {
  const window = new JSDOM('').window;
  const purify = DOMPurify(window as unknown as WindowLike);
  return purify.sanitize(inputHtml, {
    ALLOWED_TAGS: [], // Remove all tags
  });
}

// Function to scrape and clean content from a given URL using Puppeteer
async function scrapeAndCleanContent(url: string): Promise<string | null> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setDefaultNavigationTimeout(30000);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const htmlContent = await page.evaluate(() => document.body.innerHTML);
    return cleanHTML(htmlContent);
  } catch (error) {
    console.error(`Error scraping and cleaning content from ${url}:`, error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

async function getAllLinks(url: string): Promise<string[]> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setDefaultNavigationTimeout(30000);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a'))
        .map((anchor) => anchor.href)
        .filter((href) => href && !href.includes('mailto:') && !href.includes('tel:')),
    );

    return links;
  } catch (error) {
    console.error(`Error getting links from ${url}:`, error);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

const MAX_CRAWL_PAGES = Number(process.env.TRAIN_MAX_CRAWL_PAGES || 50);

async function scrapeAllRoutes(baseUrl: string): Promise<void> {
  const visitedLinks = new Set<string>();
  const linksToVisit = [baseUrl];
  let processedCount = 0;

  while (linksToVisit.length > 0 && processedCount < MAX_CRAWL_PAGES) {
    const currentLink = linksToVisit.pop();
    if (currentLink && !visitedLinks.has(currentLink)) {
      visitedLinks.add(currentLink);
      processedCount++;

      console.log(`Processing ${processedCount}: ${currentLink}`);

      const cleanedContent = await scrapeAndCleanContent(currentLink);
      if (cleanedContent) {
        console.log(`Successfully scraped content from ${currentLink}`);
        await saveScrapedData(currentLink, cleanedContent);
      } else {
        console.log(`Failed to scrape content from ${currentLink}`);
      }

      const newLinks = await getAllLinks(currentLink);
      for (const link of newLinks) {
        if (link.startsWith(baseUrl) && !visitedLinks.has(link)) {
          linksToVisit.push(link);
        }
      }
    }
  }
}

// List of medical websites to scrape
const medicalWebsites = [
  'https://www.docteur-guiga.com/fr/accueil/',
  'https://www.dranasgherissi.com/fr/',
  'https://medical-travel.fr/tarifs/',
];

// Scrape all medical websites
async function scrapeAllMedicalWebsites() {
  for (const website of medicalWebsites) {
    console.log(`Starting to scrape: ${website}`);
    try {
      await scrapeAllRoutes(website);
      console.log(`Completed scraping: ${website}`);
    } catch (error) {
      console.error(`Error scraping ${website}:`, error);
    }
  }
}

// Execute the scraping
scrapeAllMedicalWebsites()
  .then(() => {
    console.log('All medical websites scraping completed.');
  })
  .catch((error) => {
    console.error('Error in main scraping process:', error);
  });
