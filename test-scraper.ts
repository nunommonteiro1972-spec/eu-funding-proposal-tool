// Test script for EU funding page scraper
// Run with: deno run --allow-net test-scraper.ts
export { };

import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

async function scrapeEuFundingPage(url: string) {
    console.log(`[Scraper] Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.error(`[Scraper] HTTP ${response.status} for ${url}`);
            return null;
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        if (!doc) {
            console.error(`[Scraper] Failed to parse HTML for ${url}`);
            return null;
        }

        // Extract title
        const h1 = doc.querySelector('h1');
        const title = h1?.textContent?.trim() || "Unknown Title";

        // Extract call ID from URL
        const callIdMatch = url.match(/topic-details\/([^/?]+)/);
        const callId = callIdMatch ? callIdMatch[1] : "Unknown";

        // Extract deadline - try multiple approaches
        let deadline = null;

        // Look for deadline in the page text
        const bodyText = doc.querySelector('body')?.textContent || '';

        // Match patterns like "02 October 2025", "2025-10-02", "October 02, 2025"
        const datePatterns = [
            /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
            /(\d{4}-\d{2}-\d{2})/,
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i
        ];

        for (const pattern of datePatterns) {
            const match = bodyText.match(pattern);
            if (match) {
                deadline = match[0];
                console.log(`[Scraper] Found deadline: ${deadline}`);
                break;
            }
        }

        // Extract status - look for "Open", "Closed", "Forthcoming"
        let status = "Open"; // Default
        const statusMatch = bodyText.match(/(Open|Closed|Forthcoming)/i);
        if (statusMatch) {
            status = statusMatch[1];
            console.log(`[Scraper] Found status: ${status}`);
        }

        // Extract description (first paragraph or meta description)
        const metaDesc = doc.querySelector('meta[name="description"]');
        const firstP = doc.querySelector('p');
        const description = metaDesc?.getAttribute('content') || firstP?.textContent?.trim() || "No description available";

        console.log(`[Scraper] Successfully scraped: ${title}`);

        return {
            url,
            title,
            call_id: callId,
            status,
            deadline,
            description: description.substring(0, 500),
            last_scraped: new Date().toISOString()
        };

    } catch (error) {
        console.error(`[Scraper] Error scraping ${url}:`, error);
        return null;
    }
}

// Test with a real EU funding URL
const testUrl = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-CL4-2025-04-DATA-03";

console.log("=== Testing EU Funding Scraper ===\n");
console.log(`Testing with URL: ${testUrl}\n`);

const result = await scrapeEuFundingPage(testUrl);

if (result) {
    console.log("\n=== SCRAPING SUCCESSFUL! ===");
    console.log(JSON.stringify(result, null, 2));
} else {
    console.log("\n=== SCRAPING FAILED ===");
}
