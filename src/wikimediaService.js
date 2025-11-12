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

    // Filter for actual flower images (avoid icons, logos, etc.)
    const imageFiles = pages[pageId].images
      .filter(img => {
        const name = img.title.toLowerCase();
        return (name.endsWith('.jpg') || name.endsWith('.jpeg') ||
                name.endsWith('.png') || name.endsWith('.webp')) &&
               !name.includes('icon') && !name.includes('logo') &&
               !name.includes('symbol') && !name.includes('map');
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
      `iiprop=url&` +
      `iiurlwidth=800&` +
      `origin=*`;

    const imageInfoResponse = await fetch(imageInfoUrl);
    const imageInfoData = await imageInfoResponse.json();

    const imagePages = imageInfoData.query.pages;
    const imagePageId = Object.keys(imagePages)[0];

    if (imagePages[imagePageId].imageinfo && imagePages[imagePageId].imageinfo.length > 0) {
      return imagePages[imagePageId].imageinfo[0].thumburl || imagePages[imagePageId].imageinfo[0].url;
    }

    return null;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

/**
 * Fetches images for multiple flowers with better search terms
 * @param {Object} flower - Flower object with scientific and common names
 * @returns {Promise<string|null>} - URL of the image or null if not found
 */
export async function fetchFlowerImageSmart(flower) {
  // Try different search terms for better results
  const searchTerms = [
    flower.scientific,
    flower.common[0],
    `${flower.scientific} flower`,
    `${flower.common[0]} plant`
  ];

  for (const term of searchTerms) {
    const imageUrl = await fetchFlowerImage(term);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}
