const puppeteer = require('puppeteer');

/**
 * Web scroll controller
 * Scrolls through a specified number of pages on a website and extracts content
 */
const webScroll = async (req, res) => {
    try {
        const { site, pages } = req.body;

        if (!site) {
            return res.status(400).json({
                success: false,
                message: 'Site URL is required'
            });
        }

        // Default to 1 page if not specified
        const pagesToScroll = pages || 1;

        // Normalize the site URL
        const siteUrl = site.startsWith('http') ? site : `https://${site}`;

        console.log(`Scrolling ${pagesToScroll} pages on ${siteUrl}`);

        // Launch headless browser
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.goto(siteUrl, { waitUntil: 'networkidle2' });

        const pageData = [];

        // Scroll and collect data for each page
        for (let i = 0; i < pagesToScroll; i++) {
            // Get page content
            const content = await page.evaluate(() => {
                return {
                    title: document.title,
                    pageText: document.body.innerText,
                    links: Array.from(document.querySelectorAll('a')).map(link => ({
                        text: link.innerText,
                        href: link.href
                    })),
                    images: Array.from(document.querySelectorAll('img')).map(img => ({
                        alt: img.alt,
                        src: img.src
                    }))
                };
            });

            pageData.push({
                page: i + 1,
                title: content.title,
                textLength: content.pageText.length,
                linksCount: content.links.length,
                imagesCount: content.images.length
            });

            // Try to find and click a "Next" button or similar pagination element
            // This is a simple heuristic - may need customization for specific sites
            const nextPageClicked = await page.evaluate(() => {
                // Common selectors for pagination
                const nextSelectors = [
                    'a[rel="next"]',
                    '.pagination .next',
                    '.next-page',
                    '#next'
                ];

                // Try with standard CSS selectors first
                for (const selector of nextSelectors) {
                    const nextButton = document.querySelector(selector);
                    if (nextButton) {
                        nextButton.click();
                        return true;
                    }
                }

                // Try with text content for "Next" buttons
                const allLinks = Array.from(document.querySelectorAll('a'));
                const nextLink = allLinks.find(link => {
                    const text = link.textContent.trim().toLowerCase();
                    return text === 'next' || text === 'next page' || text.includes('next');
                });

                if (nextLink) {
                    nextLink.click();
                    return true;
                }

                return false;
            });

            if (!nextPageClicked) {
                console.log(`No next page button found after page ${i + 1}`);
                break;
            }

            // Wait for navigation after clicking next
            await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {
                console.log('Navigation timeout or error - continuing');
            });
        }

        await browser.close();

        return res.status(200).json({
            success: true,
            site: siteUrl,
            pagesRequested: pagesToScroll,
            pagesScraped: pageData.length,
            data: pageData
        });

    } catch (error) {
        console.error('Web scroll error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error performing web scroll',
            error: error.message
        });
    }
};

module.exports = {
    webScroll
};