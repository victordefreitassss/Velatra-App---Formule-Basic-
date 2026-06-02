const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                 console.log('BROWSER CONSOLE ERROR:', msg.text());
                 const stack = msg.stackTrace();
                 if (stack && stack.length > 0) {
                     console.log('STACK:', JSON.stringify(stack, null, 2));
                 }
            } else {
                 console.log('BROWSER CONSOLE:', msg.text());
            }
        });
        page.on('pageerror', error => console.log('BROWSER PAGE ERROR:', error.message, error.stack));
        page.on('requestfailed', request => console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText));

        await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 5000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const content = await page.content();
        console.log("HTML length:", content.length);
        console.log("Root element content:", await page.evaluate(() => document.getElementById('root')?.innerHTML.substring(0, 500)));

        // click coach button
        const buttons = await page.$$('button');
        for(let b of buttons) {
          const t = await page.evaluate(el => el.textContent, b);
          if (t && t.includes('Accès Coach')) {
            await b.click();
            await new Promise(r => setTimeout(r, 500));
          }
        }

        const inputs = await page.$$('input');
        if (inputs.length >= 2) {
            await inputs[0].type('victor.defreitas.pro@gmail.com');
            await inputs[1].type('password123');
            let btn = await page.$('button[type="submit"]');
            if(btn) await btn.click();
            await new Promise(r => setTimeout(r, 4000));
            console.log("After login HTML root:", await page.evaluate(() => document.getElementById('root')?.innerHTML.substring(0, 500)));
        }
        
        await browser.close();
    } catch (e) {
        console.error("PUPPETEER ERROR", e);
        process.exit(1);
    }
})();
