// Local storage service for tracking flower learning progress

const STORAGE_KEY = 'floral_quiz_progress';

export const MasteryStage = {
  FLASHCARD: 'flashcard',
  MULTIPLE_CHOICE: 'mc',
  SHORT_ANSWER: 'short',
  SCIENTIFIC_NAME: 'scientific',
  MASTERY: 'mastery'
};

/**
 * Get the progress data for all flowers
 * @returns {Object} Progress data indexed by flower scientific name
 */
export function getProgress() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

/**
 * Initialize progress for a flower if it doesn't exist
 * @param {string} scientificName - The flower's scientific name
 */
function initializeFlower(scientificName) {
  const progress = getProgress();
  if (!progress[scientificName]) {
    progress[scientificName] = {
      stage: MasteryStage.FLASHCARD,
      correctCount: 0,
      incorrectCount: 0,
      stageCorrectCount: 0, // Views/correct answers in current stage
      lastSeen: null,
      flaggedForReview: false,
      easeFactor: 2.5, // Anki default, range 1.3-4.0
      reviewInterval: 1, // Days until next review
      nextReviewDate: null, // Calculated date for next review
      isNew: true // Never been seen before
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }
  // Migrate old data that doesn't have new fields
  else if (!progress[scientificName].hasOwnProperty('easeFactor')) {
    progress[scientificName].easeFactor = 2.5;
    progress[scientificName].reviewInterval = 1;
    progress[scientificName].nextReviewDate = null;
    progress[scientificName].isNew = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }
  return progress[scientificName];
}

/**
 * Get progress for a specific flower
 * @param {string} scientificName - The flower's scientific name
 * @returns {Object} Progress data for the flower
 */
export function getFlowerProgress(scientificName) {
  const progress = getProgress();
  return progress[scientificName] || initializeFlower(scientificName);
}

/**
 * Calculate next review date based on interval
 * @param {number} intervalDays - Number of days until next review
 * @returns {string} ISO date string for next review
 */
function calculateNextReviewDate(intervalDays) {
  const now = new Date();
  now.setDate(now.getDate() + intervalDays);
  return now.toISOString();
}

/**
 * Get base interval for stage
 * @param {string} stage - Current mastery stage
 * @returns {number} Base interval in days
 */
function getBaseIntervalForStage(stage) {
  switch (stage) {
    case MasteryStage.FLASHCARD:
      return 1;
    case MasteryStage.MULTIPLE_CHOICE:
      return 2;
    case MasteryStage.SHORT_ANSWER:
      return 4;
    case MasteryStage.SCIENTIFIC_NAME:
      return 7;
    case MasteryStage.MASTERY:
      return 14;
    default:
      return 1;
  }
}

/**
 * Record a correct answer for a flower
 * @param {string} scientificName - The flower's scientific name
 */
export function recordCorrectAnswer(scientificName) {
  const progress = getProgress();
  const flowerData = progress[scientificName] || initializeFlower(scientificName);

  flowerData.correctCount++;
  flowerData.stageCorrectCount++;
  flowerData.lastSeen = new Date().toISOString();
  flowerData.flaggedForReview = false;
  flowerData.isNew = false;

  // Adjust ease factor (increase for correct answers)
  flowerData.easeFactor = Math.min(4.0, flowerData.easeFactor + 0.1);

  // Calculate new interval based on ease factor
  const baseInterval = getBaseIntervalForStage(flowerData.stage);
  flowerData.reviewInterval = Math.round(baseInterval * flowerData.easeFactor);
  flowerData.nextReviewDate = calculateNextReviewDate(flowerData.reviewInterval);

  // Check for stage progression
  const stage = flowerData.stage;
  const stageCorrect = flowerData.stageCorrectCount;

  if (stage === MasteryStage.FLASHCARD && stageCorrect >= 2) {
    flowerData.stage = MasteryStage.MULTIPLE_CHOICE;
    flowerData.stageCorrectCount = 0;
  } else if (stage === MasteryStage.MULTIPLE_CHOICE && stageCorrect >= 2) {
    flowerData.stage = MasteryStage.SHORT_ANSWER;
    flowerData.stageCorrectCount = 0;
  } else if (stage === MasteryStage.SHORT_ANSWER && stageCorrect >= 2) {
    flowerData.stage = MasteryStage.SCIENTIFIC_NAME;
    flowerData.stageCorrectCount = 0;
  } else if (stage === MasteryStage.SCIENTIFIC_NAME && stageCorrect >= 2) {
    flowerData.stage = MasteryStage.MASTERY;
    flowerData.stageCorrectCount = 0;
  }

  progress[scientificName] = flowerData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));

  return flowerData;
}

/**
 * Record an incorrect answer for a flower
 * @param {string} scientificName - The flower's scientific name
 */
export function recordIncorrectAnswer(scientificName) {
  const progress = getProgress();
  const flowerData = progress[scientificName] || initializeFlower(scientificName);

  flowerData.incorrectCount++;
  flowerData.lastSeen = new Date().toISOString();
  flowerData.flaggedForReview = true;
  flowerData.isNew = false;

  // Adjust ease factor (decrease for incorrect answers)
  flowerData.easeFactor = Math.max(1.3, flowerData.easeFactor - 0.2);

  // Reset interval to 1 day for failed items (need frequent review)
  flowerData.reviewInterval = 1;
  flowerData.nextReviewDate = calculateNextReviewDate(1);

  progress[scientificName] = flowerData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));

  return flowerData;
}

/**
 * Get flowers that need review (flagged or never seen)
 * @param {Array} allFlowers - Array of all flower objects
 * @returns {Array} Flowers that need review
 */
export function getFlowersNeedingReview(allFlowers) {
  const progress = getProgress();
  return allFlowers.filter(flower => {
    const flowerProgress = progress[flower.scientific];
    return !flowerProgress || flowerProgress.flaggedForReview;
  });
}

/**
 * Smart quiz flower selection using 4-tier priority system
 * @param {Array} allFlowers - Array of all flower objects
 * @param {number} count - Number of flowers to return
 * @returns {Array} Prioritized flowers for quiz
 */
export function getSmartQuizFlowers(allFlowers, count) {
  const progress = getProgress();
  const now = new Date();

  // Categorize flowers into tiers
  const tier1 = []; // Critical review: failed recently or overdue
  const tier2 = []; // Active learning: in progress, weighted by priority
  const tier3 = []; // New introductions: never seen
  const tier4 = []; // Mastery maintenance: mastered flowers

  let earlyStageCount = 0; // Count flowers in flashcard/mc stages

  allFlowers.forEach(flower => {
    const flowerProgress = progress[flower.scientific];

    // New flowers (never seen)
    if (!flowerProgress || flowerProgress.isNew) {
      tier3.push({ flower, score: flower.listPriority * 10 }); // Lower priority number = higher score
      return;
    }

    // Count early stage flowers
    if (flowerProgress.stage === MasteryStage.FLASHCARD ||
        flowerProgress.stage === MasteryStage.MULTIPLE_CHOICE) {
      earlyStageCount++;
    }

    // Check if overdue for review
    const isOverdue = flowerProgress.nextReviewDate &&
                     new Date(flowerProgress.nextReviewDate) < now;

    // Tier 1: Critical review
    if (flowerProgress.flaggedForReview || isOverdue) {
      let score = 1000; // High base priority

      // Recently failed gets highest priority
      if (flowerProgress.flaggedForReview) {
        const hoursSince = (Date.now() - new Date(flowerProgress.lastSeen)) / (1000 * 60 * 60);
        score += (24 - Math.min(hoursSince, 24)) * 10; // More recent = higher score
      }

      // Overdue items
      if (isOverdue) {
        const daysOverdue = (now - new Date(flowerProgress.nextReviewDate)) / (1000 * 60 * 60 * 24);
        score += daysOverdue * 50;
      }

      tier1.push({ flower, score });
    }
    // Tier 4: Mastery (fully learned)
    else if (flowerProgress.stage === MasteryStage.MASTERY) {
      let score = 10;
      // Less recently seen mastered items get slight priority
      if (flowerProgress.lastSeen) {
        const daysSince = (Date.now() - new Date(flowerProgress.lastSeen)) / (1000 * 60 * 60 * 24);
        score += Math.min(daysSince, 14);
      }
      tier4.push({ flower, score });
    }
    // Tier 2: Active learning (in progress)
    else {
      let score = 500; // Medium base priority

      // Weight by list priority (lower number = higher priority)
      score += (4 - flower.listPriority) * 100;

      // Boost based on stage (earlier stages get more practice)
      const stageBoost = {
        flashcard: 80,
        mc: 60,
        short: 40,
        scientific: 20
      };
      score += stageBoost[flowerProgress.stage] || 0;

      // Slight boost for items not seen recently
      if (flowerProgress.lastSeen) {
        const daysSince = (Date.now() - new Date(flowerProgress.lastSeen)) / (1000 * 60 * 60 * 24);
        score += Math.min(daysSince * 5, 30);
      }

      tier2.push({ flower, score });
    }
  });

  // Sort each tier by score
  tier1.sort((a, b) => b.score - a.score);
  tier2.sort((a, b) => b.score - a.score);
  tier3.sort((a, b) => b.score - a.score);
  tier4.sort((a, b) => b.score - a.score);

  // Calculate tier limits
  const maxTier1 = Math.ceil(count * 0.4); // 40% max for critical review
  const maxTier2 = Math.ceil(count * 0.4); // 40% max for active learning
  const maxTier3New = Math.min(5, Math.ceil(count * 0.3)); // Max 5 new per quiz, 30% max

  // Don't introduce new flowers if too many in early stages
  const shouldIntroduceNew = earlyStageCount <= 10;

  // Select flowers from tiers
  const selected = [];

  // Tier 1: Critical review (up to 40%)
  const tier1Count = Math.min(tier1.length, maxTier1);
  selected.push(...tier1.slice(0, tier1Count).map(s => s.flower));

  // Tier 2: Active learning (up to 40%)
  const remaining = count - selected.length;
  const tier2Count = Math.min(tier2.length, Math.min(maxTier2, remaining));
  selected.push(...tier2.slice(0, tier2Count).map(s => s.flower));

  // Tier 3: New introductions (up to 30%, max 5, only if not too many early)
  if (shouldIntroduceNew && selected.length < count) {
    const remainingAfterT2 = count - selected.length;
    const tier3Count = Math.min(tier3.length, Math.min(maxTier3New, remainingAfterT2));
    selected.push(...tier3.slice(0, tier3Count).map(s => s.flower));
  }

  // Tier 4: Fill remaining with mastery maintenance
  if (selected.length < count && tier4.length > 0) {
    const remainingSlots = count - selected.length;
    selected.push(...tier4.slice(0, remainingSlots).map(s => s.flower));
  }

  // If still not enough, fill with any remaining flowers
  if (selected.length < count) {
    const allRemaining = [...tier2, ...tier3, ...tier4]
      .filter(s => !selected.includes(s.flower))
      .sort((a, b) => b.score - a.score);
    const needed = count - selected.length;
    selected.push(...allRemaining.slice(0, needed).map(s => s.flower));
  }

  // Shuffle to avoid predictable patterns
  return shuffleArray(selected);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get flowers prioritized for quiz (recently missed, never seen, least practiced)
 * @param {Array} allFlowers - Array of all flower objects
 * @param {number} count - Number of flowers to return
 * @returns {Array} Prioritized flowers
 */
export function getPrioritizedFlowers(allFlowers, count) {
  const progress = getProgress();

  // Score each flower (lower score = higher priority)
  const scored = allFlowers.map(flower => {
    const flowerProgress = progress[flower.scientific];

    if (!flowerProgress) {
      return { flower, score: 0 }; // Never seen - highest priority
    }

    let score = 100;

    // Flagged for review
    if (flowerProgress.flaggedForReview) {
      score -= 50;
    }

    // Recently seen
    if (flowerProgress.lastSeen) {
      const daysSince = (Date.now() - new Date(flowerProgress.lastSeen)) / (1000 * 60 * 60 * 24);
      score += Math.min(daysSince * 2, 30); // Max 30 points for time
    }

    // Success rate
    const total = flowerProgress.correctCount + flowerProgress.incorrectCount;
    if (total > 0) {
      const successRate = flowerProgress.correctCount / total;
      score += successRate * 20; // 0-20 points based on success
    }

    return { flower, score };
  });

  // Sort by score and add some randomization
  scored.sort((a, b) => {
    // Add slight randomization to avoid always getting same flowers
    const randomFactor = (Math.random() - 0.5) * 10;
    return (a.score + randomFactor) - (b.score + randomFactor);
  });

  return scored.slice(0, count).map(s => s.flower);
}

/**
 * Get statistics for all flowers
 * @param {Array} allFlowers - Array of all flower objects
 * @returns {Array} Flowers with their progress stats
 */
export function getAllFlowerStats(allFlowers) {
  const progress = getProgress();

  return allFlowers.map(flower => {
    const flowerProgress = progress[flower.scientific];

    if (!flowerProgress) {
      return {
        flower,
        stage: MasteryStage.MULTIPLE_CHOICE,
        correctCount: 0,
        incorrectCount: 0,
        stageCorrectCount: 0,
        successRate: 0,
        needsReview: true,
        lastSeen: null
      };
    }

    const total = flowerProgress.correctCount + flowerProgress.incorrectCount;
    const successRate = total > 0 ? (flowerProgress.correctCount / total) * 100 : 0;

    return {
      flower,
      stage: flowerProgress.stage,
      correctCount: flowerProgress.correctCount,
      incorrectCount: flowerProgress.incorrectCount,
      stageCorrectCount: flowerProgress.stageCorrectCount,
      successRate: Math.round(successRate),
      needsReview: flowerProgress.flaggedForReview,
      lastSeen: flowerProgress.lastSeen
    };
  });
}

/**
 * Clear all progress data
 */
export function clearAllProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export progress data as JSON string
 */
export function exportProgress() {
  return localStorage.getItem(STORAGE_KEY) || '{}';
}

/**
 * Import progress data from JSON string
 * @param {string} jsonData - JSON string of progress data
 */
export function importProgress(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to import progress:', error);
    return false;
  }
}
