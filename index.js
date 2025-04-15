import puppeteer from 'puppeteer';
import fs from 'fs';
async function searchMichelinGuide() {
  const BASE_URL = 'https://guide.michelin.com/en/fr/ile-de-france/paris/restaurants';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const restaurantUrls = [];

  await page.goto('https://guide.michelin.com/en/fr/ile-de-france/paris/restaurants');

  // Accept cookies
  try {
    await page.click('.didomi-continue-without-agreeing', { timeout: 3000 });
  } catch (e) {
    console.log('Cookie popup not found or already dismissed');
  }

  // Wait for the list to load
  await page.waitForSelector('.restaurant__list-row .card__menu > a');

  const totalPages = 26;

  console.log(`📄 Total pages: ${totalPages}`);

    // Loop through each page and collect restaurant links
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const url = `${BASE_URL}/page/${pageNum}`;
      console.log(`\n🔄 Visiting listing page ${pageNum}: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('.restaurant__list-row .card__menu > a');
  
      const urlsOnPage = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.restaurant__list-row .card__menu > a'))
          .map(a => a.href)
          .filter(href => href.includes('/en/ile-de-france/paris/restaurant/'));
      });
  
      console.log(`🍽️ Found ${urlsOnPage.length} restaurant links on page ${pageNum}`);
      restaurantUrls.push(...urlsOnPage);
    }
  

  // // Extract restaurant names and URLs
  // const restaurants = await page.$$eval('.restaurant__list-row .card__menu > a', elements =>
  //   elements.map(el => ({
  //     name: el.querySelector('.card__menu-content--title')?.innerText.trim(),
  //     url: el.href
  //   }))
  // );

  // console.log(`Found ${restaurants.length} restaurants. Visiting each one...`);

  // Store detailed restaurant data
  const detailedRestaurants = [];

  for (let link = 0; link < restaurantUrls.length; link++) {
    console.log(`Visiting ${link + 1}/${restaurantUrls.length}: ${restaurantUrls[link]}`);
    try {
      await page.goto(restaurantUrls[link], { waitUntil: 'domcontentloaded' });

      // Wait for some content to load
      await page.waitForSelector('.restaurant-details__components .data-sheet__title', { timeout: 5000 });
      
      await page.click('.masthead__gallery-image');
 

      await page.waitForSelector('.modal__gallery-image img[data-srcset]');

      const detail = await page.evaluate(() => {
        const title = document.querySelector('.restaurant-details__components .data-sheet__title')?.innerText.trim();
        const address = document.querySelector('.data-sheet__detail-info .data-sheet__block .data-sheet__block--text:first-child')?.innerText. v;
        const pricingAndType = document.querySelector('.data-sheet__detail-info .data-sheet__block .data-sheet__block--text:nth-child(2)')?.innerText.trim() || null;
        const classification = document.querySelectorAll('.data-sheet__classification-list .data-sheet__classification-item') || [];
        const classificationArray = Array.from(classification).map(item => item.querySelector('.data-sheet__classification-item--content:last-child')?.innerText.trim());
        const description = document.querySelector('.data-sheet__description')?.innerText.trim() || null;
        const images = document.querySelectorAll('.modal__gallery .owl-stage .owl-item') || [];
          
        const imageArray = Array.from(images).map((item) => {
          const label = item.querySelector('.modal__gallery-body-label').innerText.trim() || null;
          const image = item.querySelector('.modal__gallery-image img[data-srcset]').srcset || null;
 
          return image && {
            url: image.split(",")[2].trim().replace(/\s+2x$/, ''),
            meta: {
              author: label,
              alt: null,
              authorUrl: null,
            },
          };
        }); 
        const website = document.querySelector('.data-sheet--action-button [data-event="CTA_website"]')?.href || null;
        const phone = document.querySelector('.data-sheet--action-button [data-event="CTA_tel"]')?.href || null;
        const map = document.querySelector('.google-map__static iframe')?.src || null;
        const workingHoursBoxes = document.querySelectorAll('.section.section-main > .row > .col-lg-6') || [];
        const workingDayTitles = Array.from(workingHoursBoxes).map(item => item.querySelector('.card--title')?.innerText.trim());
        const workingDayHoursInnerRows = Array.from(workingHoursBoxes).map(item => {
          const contents = item.querySelectorAll('.card--content');
          return Array.from(contents)
            .map(el => el.innerText.trim())
            .join(' | '); // or use '\n', ',', etc. depending on how you want them formatted
        });
        const workingDayHours = workingDayTitles.map((title, index) => ({
          title,
          hours: workingDayHoursInnerRows[index]
        }));
 
        return   {
          title,
          images: imageArray.filter(item => item !== null),
          address,
          reviews: null,
          type: [], //"Classic French", "Bistro", "Michelin Star"
          cuisine: pricingAndType.split("·")[1].replace(/\n/g, '').replace(/\s+/g, ' ').trim(), 
          establishedYear: null,
          ambience: null,
          dietaryOptions: null, 
          description,
          price: pricingAndType.split("·")[0].replace(/\n/g, '').replace(/\s+/g, ' ').trim(),
          facilities: null,
          orderOnlineLink: null,
          serviceOptions: [], //"Dine-in", "Takeout", "Delivery"
          rating: null,
          averageCostPerPerson: null,
          classification: classificationArray,
          extensions: {
            popularFor: [], //"Lunch", "Dinner", "Solo dining"
            wheelchairAccessible: false,
            kidsFriendly: false,
            petFriendly: false,
            parking: [], //"Street Parking", "Valet Available"
            timeSpent: null,
            wifi: false,
            socialMedia: {
              instagram: null,
              facebook: null,
              linkedin: null,
              twitter: null,
              youtube: null,
              tiktok: null,
              pinterest: null, 
            },
            featuredVideos: [],
            paymentOptions: [],
          },
          contact: {
            phone,
            website,
          },
          reservation: {
            link: null,
            source: null
          },
          menu: {
            link: null,
            source: null
          },
          workingHours: workingDayHours,
          location: {
            map,
            latitude: map?.split("&q=")[1].split("&language")[0].split(",")[0],
            longitude: map?.split("&q=")[1].split("&language")[0].split(",")[1]
          },
        } 
      });

      detailedRestaurants.push({
        ...detail
      });

    } catch (err) {
      console.error(`Failed to fetch details for ${restaurantUrls[link]}:`, err);
    }
  }

  console.log('Scraping complete!');
  const filePath = 'paris-65d20e299ad38f4276801032.json';
  fs.writeFileSync(filePath, JSON.stringify(detailedRestaurants, null, 2), 'utf-8');
 
  await browser.close();
}

searchMichelinGuide();
