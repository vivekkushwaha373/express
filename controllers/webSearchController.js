
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

/**
 * Web search controller (static page version)
 * Searches for content on a specified website's static HTML
 */
const webSearchStatic = async (req, res) => {
    try {
        const { site, query } = req.body;

        if (!site || !query) {
            return res.status(400).json({
                success: false,
                message: 'Site URL and search query are required'
            });
        }

        // Normalize the site URL
        const siteUrl = site.startsWith('http') ? site : `https://${site}`;

        console.log(`Performing static web search on ${siteUrl} for query: ${query}`);

        // Fetch the website content
        const response = await axios.get(siteUrl);
        const html = response.data;

        // Parse the HTML with cheerio
        const $ = cheerio.load(html);

        // Search for elements containing the query text
        const results = [];

        $('body *').each((i, element) => {
            const text = $(element).text().trim();

            if (text.toLowerCase().includes(query.toLowerCase())) {
                // Get element path for reference
                const tagName = element.name;

                results.push({
                    element: tagName,
                    text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                    fullMatch: text === query
                });
            }
        });

        return res.status(200).json({
            success: true,
            site: siteUrl,
            query,
            totalResults: results.length,
            results
        });

    } catch (error) {
        console.error('Web search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error performing web search',
            error: error.message
        });
    }
};

/**
 * Enhanced web search controller
 * For search engines, actually performs the search and gets results
 */
const webSearch = async (req, res) => {
    try {
        const { site, query } = req.body;

        if (!site || !query) {
            return res.status(400).json({
                success: false,
                message: 'Site URL and search query are required'
            });
        }

        // Normalize the site URL
        const siteUrl = site.startsWith('http') ? site : `https://${site}`;

        // Check if this is a search engine
        const isSearchEngine =
            siteUrl.includes('google.com') ||
            siteUrl.includes('bing.com') ||
            siteUrl.includes('duckduckgo.com') ||
            siteUrl.includes('yahoo.com');

        // Use static search for regular websites
        if (!isSearchEngine) {
            return webSearchStatic(req, res);
        }

        console.log(`Performing search engine query on ${siteUrl} for: ${query}`);

        // Launch puppeteer for search engines to actually perform the search
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Handle different search engines
        let searchUrl;
        if (siteUrl.includes('google.com')) {
            searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        } else if (siteUrl.includes('bing.com')) {
            searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
        } else if (siteUrl.includes('duckduckgo.com')) {
            searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        } else if (siteUrl.includes('yahoo.com')) {
            searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
        }

        console.log(`Navigating to search URL: ${searchUrl}`);

        // Set a reasonable viewport size
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to the search URL
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for search results to appear
        await page.waitForSelector('a', { timeout: 5000 });

        // Take a screenshot for debugging (optional)
        await page.screenshot({ path: 'search-results.png' });

        // Extract search results
        const searchResults = await page.evaluate(() => {
            const results = [];

            // Google search results - using multiple potential selector patterns
            if (window.location.host.includes('google.com')) {
                // Try different selectors as Google's structure changes frequently
                const resultElements = [
                    // Modern Google search results
                    ...Array.from(document.querySelectorAll('div[data-sokoban-container]')),
                    // Alternative selector for search results
                    ...Array.from(document.querySelectorAll('div.g')),
                    // Another common pattern
                    ...Array.from(document.querySelectorAll('.rc')),
                    // Newest pattern as of 2023-2024
                    ...Array.from(document.querySelectorAll('[jscontroller][data-hveid]')),
                    // Very generic fallback
                    ...Array.from(document.querySelectorAll('a h3')).map(h3 => h3.closest('div[style]') || h3.parentElement.parentElement)
                ];

                // Process all potential result elements
                resultElements.forEach(element => {
                    // Skip if null/undefined
                    if (!element) return;

                    // Try different heading/link patterns
                    const titleEl =
                        element.querySelector('h3') ||
                        element.querySelector('[role="heading"]') ||
                        element.querySelector('a > div > div');

                    const linkEl = element.querySelector('a');

                    // Different snippet patterns
                    const snippetEl =
                        element.querySelector('div.VwiC3b') ||
                        element.querySelector('div[data-sncf="1"]') ||
                        element.querySelector('div[style*="webkit-line-clamp"]') ||
                        element.querySelector('div > div:nth-child(2)');

                    if (titleEl && linkEl) {
                        results.push({
                            title: titleEl.innerText.trim(),
                            link: linkEl.href,
                            snippet: snippetEl ? snippetEl.innerText.trim() : 'No snippet available'
                        });
                    }
                });
            }
            // Add similar selectors for other search engines if needed
            else {
                // Generic fallback for other search engines
                document.querySelectorAll('a').forEach(link => {
                    if (link.href &&
                        !link.href.includes(window.location.host) &&
                        link.textContent.trim().length > 15) {
                        results.push({
                            title: link.textContent.trim(),
                            link: link.href,
                            snippet: 'Snippet not extracted'
                        });
                    }
                });
            }

            return results;
        });

        await browser.close();

        return res.status(200).json({
            success: true,
            site: siteUrl,
            searchUrl,
            query,
            totalResults: searchResults.length,
            results: searchResults
        });

    } catch (error) {
        console.error('Web search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error performing web search',
            error: error.message
        });
    }
};

module.exports = {
    webSearch,
    webSearchStatic
};