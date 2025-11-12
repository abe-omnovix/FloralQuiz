// Service to fetch random flower images from Wikimedia Commons

/**
 * Fetches a random image for a given flower from Wikimedia Commons
 * @param {string} searchTerm - The flower name to search for
 * @returns {Promise<string|null>} - URL of the image or null if not found
 */
export async function fetchFlowerImage(searchTerm) {
  try {
    // First, search for pages related to the flower
    const searchUrl = `https://en.wikipedia.org/w/api.php?` +
      `action=query&` +
      `format=json&` +
      `list=search&` +
      `srsearch=${encodeURIComponent(searchTerm + ' flower')}&` +
      `srlimit=3&` +
      `origin=*`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
      return null;
    }

    // Randomly pick one of the top results for variety
    const randomIndex = Math.floor(Math.random() * searchData.query.search.length);
    const pageTitle = searchData.query.search[randomIndex].title;

    // Get images from that page
    const imagesUrl = `https://en.wikipedia.org/w/api.php?` +
      `action=query&` +
      `format=json&` +
      `titles=${encodeURIComponent(pageTitle)}&` +
      `prop=images&` +
      `imlimit=50&` +
      `origin=*`;

    const imagesResponse = await fetch(imagesUrl);
    const imagesData = await imagesResponse.json();

    const pages = imagesData.query.pages;
    const pageId = Object.keys(pages)[0];

    if (!pages[pageId].images || pages[pageId].images.length === 0) {
      return null;
    }

    // Filter for actual flower images (avoid icons, logos, diagrams, maps, etc.)
    const imageFiles = pages[pageId].images
      .filter(img => {
        const name = img.title.toLowerCase();

        // Must be a photo format (exclude SVG diagrams)
        const isPhotoFormat = (name.endsWith('.jpg') || name.endsWith('.jpeg') ||
                               name.endsWith('.png') || name.endsWith('.webp'));
        if (!isPhotoFormat) return false;

        // Exclude common non-flower image patterns
        const excludePatterns = [
          'icon', 'logo', 'symbol', 'map', 'diagram', 'distribution',
          'range', 'taxonomy', 'chart', 'graph', 'illustration',
          'wiki', 'commons', 'drawing', 'sketch', 'svg', 'coat',
          'flag', 'banner', 'stamp', 'herbarium', 'specimen',
          'botanical illustration', 'line art'
        ];

        if (excludePatterns.some(pattern => name.includes(pattern))) {
          return false;
        }

        return true;
      })
      // Prioritize images likely to be flower photos
      .sort((a, b) => {
        const aName = a.title.toLowerCase();
        const bName = b.title.toLowerCase();

        // Prioritize images with flower-related keywords
        const flowerKeywords = ['flower', 'bloom', 'blossom', 'inflorescence'];
        const aHasFlower = flowerKeywords.some(kw => aName.includes(kw));
        const bHasFlower = flowerKeywords.some(kw => bName.includes(kw));

        if (aHasFlower && !bHasFlower) return -1;
        if (!aHasFlower && bHasFlower) return 1;

        return 0;
      });

    if (imageFiles.length === 0) {
      return null;
    }

    // Randomly select one image for variety
    const randomImageIndex = Math.floor(Math.random() * imageFiles.length);
    const imageTitle = imageFiles[randomImageIndex].title;

    // Get the actual image URL
    const imageInfoUrl = `https://en.wikipedia.org/w/api.php?` +
      `action=query&` +
      `format=json&` +
      `titles=${encodeURIComponent(imageTitle)}&` +
      `prop=imageinfo&` +
      `iiprop=url|size&` +
      `iiurlwidth=800&` +
      `origin=*`;

    const imageInfoResponse = await fetch(imageInfoUrl);
    const imageInfoData = await imageInfoResponse.json();

    const imagePages = imageInfoData.query.pages;
    const imagePageId = Object.keys(imagePages)[0];

    if (imagePages[imagePageId].imageinfo && imagePages[imagePageId].imageinfo.length > 0) {
      const imageInfo = imagePages[imagePageId].imageinfo[0];

      // Check dimensions - exclude very small images (likely icons/thumbnails)
      if (imageInfo.width && imageInfo.height) {
        if (imageInfo.width < 200 || imageInfo.height < 200) {
          return null;
        }
      }

      return imageInfo.thumburl || imageInfo.url;
    }

    return null;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

/**
 * Searches Wikimedia Commons directly for flower images
 * @param {string} searchTerm - The flower name to search for
 * @returns {Promise<string|null>} - URL of the image or null if not found
 */
async function fetchFromWikimediaCommons(searchTerm) {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?` +
      `action=query&` +
      `format=json&` +
      `list=search&` +
      `srsearch=${encodeURIComponent(searchTerm + ' flower')}%20filetype:bitmap&` +
      `srnamespace=6&` + // File namespace
      `srlimit=10&` +
      `origin=*`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.query || !data.query.search || data.query.search.length === 0) {
      return null;
    }

    // Filter and prioritize results
    const validImages = data.query.search.filter(result => {
      const title = result.title.toLowerCase();

      // Exclude non-photo files
      if (!title.includes('.jpg') && !title.includes('.jpeg') &&
          !title.includes('.png') && !title.includes('.webp')) {
        return false;
      }

      // Exclude diagrams and non-flower images
      const excludePatterns = [
        'diagram', 'distribution', 'map', 'range', 'taxonomy',
        'illustration', 'drawing', 'sketch', 'herbarium', 'specimen',
        'stamp', 'logo', 'icon', 'chart'
      ];

      return !excludePatterns.some(pattern => title.includes(pattern));
    });

    if (validImages.length === 0) return null;

    // Randomly select from top results
    const randomIndex = Math.floor(Math.random() * Math.min(5, validImages.length));
    const imageTitle = validImages[randomIndex].title;

    // Get the actual image URL
    const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?` +
      `action=query&` +
      `format=json&` +
      `titles=${encodeURIComponent(imageTitle)}&` +
      `prop=imageinfo&` +
      `iiprop=url|size&` +
      `iiurlwidth=800&` +
      `origin=*`;

    const imageResponse = await fetch(imageInfoUrl);
    const imageData = await imageResponse.json();

    const pages = imageData.query.pages;
    const pageId = Object.keys(pages)[0];

    if (pages[pageId].imageinfo && pages[pageId].imageinfo.length > 0) {
      const imageInfo = pages[pageId].imageinfo[0];

      // Check dimensions - exclude very small images (likely icons/thumbnails)
      if (imageInfo.width && imageInfo.height) {
        if (imageInfo.width < 200 || imageInfo.height < 200) {
          return null;
        }
      }

      return imageInfo.thumburl || imageInfo.url;
    }

    return null;
  } catch (error) {
    console.error('Error fetching from Wikimedia Commons:', error);
    return null;
  }
}

/**
 * Fetches images for multiple flowers with better search terms
 * @param {Object} flower - Flower object with scientific and common names
 * @returns {Promise<string|null>} - URL of the image or null if not found
 */
export async function fetchFlowerImageSmart(flower) {
  // Try Wikimedia Commons first (often has better flower photos)
  const commonsTerms = [
    flower.scientific,
    flower.common[0]
  ];

  for (const term of commonsTerms) {
    const imageUrl = await fetchFromWikimediaCommons(term);
    if (imageUrl) {
      return imageUrl;
    }
  }

  // Fallback to Wikipedia article images
  const wikiTerms = [
    flower.scientific,
    flower.common[0],
    `${flower.scientific} flower`,
    `${flower.common[0]} plant`
  ];

  for (const term of wikiTerms) {
    const imageUrl = await fetchFlowerImage(term);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}
