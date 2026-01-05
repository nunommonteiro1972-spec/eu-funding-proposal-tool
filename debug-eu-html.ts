// Debug script to see what HTML EU pages actually return
// This will help us find the right selectors
export { };

const testUrl = "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-CL4-2025-04-DATA-03";

console.log("Fetching EU page...");

const response = await fetch(testUrl, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});

const html = await response.text();

console.log("\n=== FIRST 2000 CHARACTERS OF HTML ===");
console.log(html.substring(0, 2000));

console.log("\n\n=== SEARCHING FOR KEY PATTERNS ===");

// Look for title
const titlePatterns = [
    /<title>(.*?)<\/title>/i,
    /<h1[^>]*>(.*?)<\/h1>/i,
    /<h2[^>]*>(.*?)<\/h2>/i,
    /class=".*title.*"[^>]*>(.*?)</i
];

console.log("\nTitle patterns:");
titlePatterns.forEach(pattern => {
    const match = html.match(pattern);
    if (match) {
        console.log(`  ✓ Found: ${match[1].substring(0, 100)}`);
    }
});

// Look for deadline
const deadlineKeywords = ['deadline', 'closing date', 'submission'];
console.log("\nDeadline mentions:");
deadlineKeywords.forEach(keyword => {
    const regex = new RegExp(`.{0,50}${keyword}.{0,100}`, 'gi');
    const matches = html.match(regex);
    if (matches) {
        matches.slice(0, 3).forEach(m => console.log(`  ${m.replace(/\n/g, ' ')}`));
    }
});

// Look for dates
console.log("\nDate patterns found:");
const datePattern = /\d{1,2}[\/\-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)[a-z]*[\/\-\s]\d{4}/gi;
const dates = html.match(datePattern);
if (dates) {
    console.log(dates.slice(0, 5));
}

// Save full HTML for inspection
await Deno.writeTextFile('eu-page-sample.html', html);
console.log("\n✓ Full HTML saved to eu-page-sample.html");
