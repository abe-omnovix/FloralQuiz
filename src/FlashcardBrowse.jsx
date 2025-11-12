import { useState, useEffect } from 'react';
import { flowers } from './flowersData';
import { fetchFlowerImageSmart } from './wikimediaService';
import './FlashcardBrowse.css';

function FlashcardBrowse({ onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shuffled, setShuffled] = useState(false);
  const [flowerList, setFlowerList] = useState([...flowers]);

  useEffect(() => {
    loadImage();
  }, [currentIndex, flowerList]);

  const loadImage = async () => {
    setLoading(true);
    setFlipped(false);
    const flower = flowerList[currentIndex];
    const url = await fetchFlowerImageSmart(flower);
    setImageUrl(url);
    setLoading(false);
  };

  const handleNext = () => {
    if (currentIndex < flowerList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back to start
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(flowerList.length - 1); // Loop to end
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleShuffle = () => {
    const newList = [...flowers].sort(() => Math.random() - 0.5);
    setFlowerList(newList);
    setCurrentIndex(0);
    setShuffled(true);
  };

  const handleReset = () => {
    setFlowerList([...flowers]);
    setCurrentIndex(0);
    setShuffled(false);
  };

  const currentFlower = flowerList[currentIndex];

  return (
    <div className="flashcard-browse-container">
      <div className="browse-header">
        <h1>Browse Flashcards</h1>
        <div className="browse-controls">
          <button onClick={shuffled ? handleReset : handleShuffle} className="btn btn-secondary">
            {shuffled ? 'Reset Order' : 'Shuffle'}
          </button>
          <button onClick={onBack} className="btn btn-primary">Back to Menu</button>
        </div>
      </div>

      <div className="flashcard-counter">
        {currentIndex + 1} / {flowerList.length}
      </div>

      <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={handleFlip}>
        <div className="flashcard-inner">
          <div className="flashcard-front">
            {loading ? (
              <div className="loading-placeholder">Loading image...</div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="Flower" className="flashcard-image" />
            ) : (
              <div className="no-image-placeholder">
                <p>Image not available</p>
                <p className="flower-hint">{currentFlower.scientific}</p>
              </div>
            )}
            <div className="flip-hint">Click to reveal</div>
          </div>
          <div className="flashcard-back">
            <h2>Common Names:</h2>
            <p className="common-names-large">{currentFlower.common.join(', ')}</p>
            <h2>Scientific Name:</h2>
            <p className="scientific-name-large">{currentFlower.scientific}</p>
            <div className="flip-hint">Click to hide</div>
          </div>
        </div>
      </div>

      <div className="navigation-buttons">
        <button onClick={handlePrev} className="btn btn-nav">
          ← Previous
        </button>
        <button onClick={handleNext} className="btn btn-nav">
          Next →
        </button>
      </div>

      <div className="keyboard-hints">
        <p>Tip: Use arrow keys to navigate, spacebar to flip</p>
      </div>
    </div>
  );
}

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    const prevBtn = document.querySelector('.btn-nav:first-of-type');
    if (prevBtn) prevBtn.click();
  } else if (e.key === 'ArrowRight') {
    const nextBtn = document.querySelector('.btn-nav:last-of-type');
    if (nextBtn) nextBtn.click();
  } else if (e.key === ' ') {
    e.preventDefault();
    const flashcard = document.querySelector('.flashcard');
    if (flashcard) flashcard.click();
  }
});

export default FlashcardBrowse;
