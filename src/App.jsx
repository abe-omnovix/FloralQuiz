import { useState, useEffect } from 'react';
import { flowers } from './flowersData';
import { fetchFlowerImageSmart } from './wikimediaService';
import {
  getFlowerProgress,
  recordCorrectAnswer,
  recordIncorrectAnswer,
  getSmartQuizFlowers,
  getFlowersNeedingReview,
  MasteryStage
} from './storageService';
import ProgressDashboard from './ProgressDashboard';
import FlashcardBrowse from './FlashcardBrowse';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('start'); // 'start', 'loading', 'quiz', 'results', 'dashboard'
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [scientificAnswer, setScientificAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Generate quiz questions
  const generateQuiz = async (numQuestions = 10, reviewMode = false) => {
    setGameState('loading');
    setLoadingProgress(0);
    setIsReviewMode(reviewMode);

    // Select flowers based on mode
    let selected;
    if (reviewMode) {
      const reviewFlowers = getFlowersNeedingReview(flowers);
      if (reviewFlowers.length === 0) {
        alert('No flowers need review! Great job!');
        setGameState('start');
        return;
      }
      selected = reviewFlowers.slice(0, Math.min(numQuestions, reviewFlowers.length));
    } else {
      // Use smart 4-tier selection algorithm
      selected = getSmartQuizFlowers(flowers, numQuestions);
    }

    const questions = [];

    for (let i = 0; i < selected.length; i++) {
      const flower = selected[i];
      const imageUrl = await fetchFlowerImageSmart(flower);
      const progress = getFlowerProgress(flower.scientific);
      const stage = progress.stage;

      let questionData = {
        flower,
        imageUrl,
        stage,
        stageCorrectCount: progress.stageCorrectCount
      };

      // Generate question based on mastery stage
      if (stage === MasteryStage.FLASHCARD) {
        // Flashcard - just show image and reveal answer
        questionData.type = 'flashcard';
      } else if (stage === MasteryStage.MULTIPLE_CHOICE) {
        // Multiple choice question
        const otherFlowers = flowers
          .filter(f => f.scientific !== flower.scientific)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        // Randomly select from ALL common names for variety
        const getRandomCommonName = (flower) => {
          const names = flower.common;
          return names[Math.floor(Math.random() * names.length)];
        };

        const correctName = getRandomCommonName(flower);

        const options = [
          { text: correctName, isCorrect: true },
          { text: getRandomCommonName(otherFlowers[0]), isCorrect: false },
          { text: getRandomCommonName(otherFlowers[1]), isCorrect: false },
          { text: getRandomCommonName(otherFlowers[2]), isCorrect: false }
        ].sort(() => Math.random() - 0.5);

        questionData.options = options;
        questionData.correctAnswer = correctName;
        questionData.allCorrectAnswers = flower.common; // Store all acceptable answers
      } else if (stage === MasteryStage.SHORT_ANSWER) {
        // Short answer (any common name)
        questionData.correctAnswers = flower.common;
        questionData.type = 'short';
      } else if (stage === MasteryStage.SCIENTIFIC_NAME) {
        // Scientific name required
        questionData.correctAnswer = flower.scientific;
        questionData.type = 'scientific';
      } else if (stage === MasteryStage.MASTERY) {
        // Final mastery - must provide both common name AND scientific name
        questionData.correctAnswers = flower.common;
        questionData.scientificAnswer = flower.scientific;
        questionData.type = 'mastery';
      }

      questions.push(questionData);
      setLoadingProgress(Math.round(((i + 1) / selected.length) * 100));
    }

    setQuizQuestions(questions);
    setCurrentQuestion(0);
    setScore(0);
    setGameState('quiz');
  };

  const handleAnswerSelect = (option) => {
    if (showFeedback) return; // Prevent changing answer after submission
    setSelectedAnswer(option);
  };

  const checkTextAnswer = (userAnswer, currentQ) => {
    const normalized = userAnswer.trim().toLowerCase();

    if (currentQ.type === 'short') {
      // Check against all common names (fuzzy matching)
      return currentQ.correctAnswers.some(name =>
        name.toLowerCase() === normalized ||
        name.toLowerCase().includes(normalized) ||
        normalized.includes(name.toLowerCase())
      );
    } else if (currentQ.type === 'scientific') {
      // Exact match for scientific name (case insensitive)
      return currentQ.correctAnswer.toLowerCase() === normalized;
    } else if (currentQ.type === 'mastery') {
      // Check common name (any accepted)
      return currentQ.correctAnswers.some(name =>
        name.toLowerCase() === normalized ||
        name.toLowerCase().includes(normalized) ||
        normalized.includes(name.toLowerCase())
      );
    }
    return false;
  };

  const checkScientificAnswer = (userAnswer, currentQ) => {
    const normalized = userAnswer.trim().toLowerCase();
    return currentQ.scientificAnswer.toLowerCase() === normalized;
  };

  const handleSubmitAnswer = () => {
    const currentQ = quizQuestions[currentQuestion];
    let isCorrect = false;

    // Flashcard - auto-credit for just viewing
    if (currentQ.type === 'flashcard') {
      if (!flashcardRevealed) return; // Must reveal first
      isCorrect = true; // Always correct for flashcards
      setShowFeedback(true);
      setScore(score + 1);
      recordCorrectAnswer(currentQ.flower.scientific);
      return;
    }

    // Check answer based on question type
    if (currentQ.stage === MasteryStage.MULTIPLE_CHOICE) {
      if (!selectedAnswer) return;
      isCorrect = selectedAnswer.isCorrect;
    } else if (currentQ.type === 'mastery') {
      // Must get BOTH common name and scientific name correct
      if (!textAnswer.trim() || !scientificAnswer.trim()) return;
      const commonCorrect = checkTextAnswer(textAnswer, currentQ);
      const scientificCorrect = checkScientificAnswer(scientificAnswer, currentQ);
      isCorrect = commonCorrect && scientificCorrect;
    } else {
      // Text-based answer (short or scientific)
      if (!textAnswer.trim()) return;
      isCorrect = checkTextAnswer(textAnswer, currentQ);
    }

    setShowFeedback(true);

    // Record progress
    if (isCorrect) {
      setScore(score + 1);
      recordCorrectAnswer(currentQ.flower.scientific);
    } else {
      recordIncorrectAnswer(currentQ.flower.scientific);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion + 1 < quizQuestions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setScientificAnswer('');
      setShowFeedback(false);
      setFlashcardRevealed(false);
    } else {
      setGameState('results');
    }
  };

  const handleRestartQuiz = () => {
    setGameState('start');
    setCurrentQuestion(0);
    setScore(0);
    setQuizQuestions([]);
    setSelectedAnswer(null);
    setTextAnswer('');
    setScientificAnswer('');
    setShowFeedback(false);
    setFlashcardRevealed(false);
  };

  const handleShowDashboard = () => {
    setGameState('dashboard');
  };

  const handleShowFlashcards = () => {
    setGameState('flashcards');
  };

  const getStageBadgeText = (stage) => {
    switch (stage) {
      case MasteryStage.FLASHCARD:
        return '📇 Flashcard';
      case MasteryStage.MULTIPLE_CHOICE:
        return '📝 Multiple Choice';
      case MasteryStage.SHORT_ANSWER:
        return '✍️ Short Answer';
      case MasteryStage.SCIENTIFIC_NAME:
        return '🔬 Scientific Name';
      case MasteryStage.MASTERY:
        return '🏆 Mastery';
      default:
        return '';
    }
  };

  const getQuestionPrompt = (currentQ) => {
    if (currentQ.type === 'flashcard') {
      return 'Study this flower';
    } else if (currentQ.type === 'short') {
      return 'Type the common name of this flower:';
    } else if (currentQ.type === 'scientific') {
      return 'Type the scientific name of this flower:';
    } else if (currentQ.type === 'mastery') {
      return 'Type BOTH the common name AND scientific name:';
    } else {
      return 'What flower is this?';
    }
  };

  const currentQ = quizQuestions[currentQuestion];

  if (gameState === 'dashboard') {
    return <ProgressDashboard onBack={handleRestartQuiz} />;
  }

  if (gameState === 'flashcards') {
    return <FlashcardBrowse onBack={handleRestartQuiz} />;
  }

  return (
    <div className="app">
      {gameState === 'start' && (
        <div className="start-screen">
          <h1>Floral Quiz</h1>
          <p>Test your knowledge of flowers! Identify the flower in each image.</p>
          <p className="flower-count">Quiz contains {flowers.length} different flowers</p>
          <p className="mastery-info">Progress through stages: Flashcard → Multiple Choice → Short Answer → Scientific Name → Mastery</p>
          <div className="button-group">
            <button onClick={() => generateQuiz(10, false)} className="btn btn-primary">
              Start Quiz (10 questions)
            </button>
            <button onClick={() => generateQuiz(20, false)} className="btn btn-secondary">
              Long Quiz (20 questions)
            </button>
            <button onClick={() => generateQuiz(10, true)} className="btn btn-review">
              Review Missed Flowers
            </button>
            <button onClick={handleShowFlashcards} className="btn btn-flashcards">
              Browse Flashcards
            </button>
            <button onClick={handleShowDashboard} className="btn btn-dashboard">
              View Progress Dashboard
            </button>
          </div>
        </div>
      )}

      {gameState === 'loading' && (
        <div className="loading-screen">
          <h2>Loading Quiz...</h2>
          <p>Fetching flower images from Wikipedia</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${loadingProgress}%` }}></div>
          </div>
          <p className="progress-text">{loadingProgress}%</p>
        </div>
      )}

      {gameState === 'quiz' && currentQ && (
        <div className="quiz-screen">
          <div className="quiz-header">
            <div className="question-counter">
              Question {currentQuestion + 1} of {quizQuestions.length}
              {isReviewMode && <span className="review-badge">Review Mode</span>}
            </div>
            <div className="score">Score: {score}</div>
          </div>

          <div className="question-container">
            <div className="question-header">
              <h2>{getQuestionPrompt(currentQ)}</h2>
              <span className="stage-badge">{getStageBadgeText(currentQ.stage)}</span>
            </div>

            {currentQ.imageUrl ? (
              <div className="image-container">
                <img
                  src={currentQ.imageUrl}
                  alt="Flower to identify"
                  className="flower-image"
                />
              </div>
            ) : (
              <div className="no-image">
                <p>Image not available</p>
                <p className="scientific-name">Scientific name: {currentQ.flower.scientific}</p>
              </div>
            )}

            {currentQ.type === 'flashcard' && (
              <div className="flashcard-container">
                {!flashcardRevealed ? (
                  <button onClick={() => setFlashcardRevealed(true)} className="btn btn-primary flashcard-reveal-btn">
                    Reveal Answer
                  </button>
                ) : (
                  <div className="flashcard-answer">
                    <h3>Common Names:</h3>
                    <p className="common-names">{currentQ.flower.common.join(', ')}</p>
                    <h3>Scientific Name:</h3>
                    <p className="scientific-name-reveal">{currentQ.flower.scientific}</p>
                  </div>
                )}
              </div>
            )}

            {currentQ.stage === MasteryStage.MULTIPLE_CHOICE && (
              <div className="options">
                {currentQ.options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-btn ${
                      selectedAnswer === option ? 'selected' : ''
                    } ${
                      showFeedback && option.isCorrect ? 'correct' : ''
                    } ${
                      showFeedback && selectedAnswer === option && !option.isCorrect ? 'incorrect' : ''
                    }`}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showFeedback}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === 'mastery' && (
              <div className="mastery-inputs">
                <div className="text-answer-container">
                  <label>Common Name:</label>
                  <input
                    type="text"
                    className={`text-input ${
                      showFeedback ? (checkTextAnswer(textAnswer, currentQ) ? 'correct' : 'incorrect') : ''
                    }`}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="e.g., rose"
                    disabled={showFeedback}
                    autoFocus
                  />
                </div>
                <div className="text-answer-container">
                  <label>Scientific Name:</label>
                  <input
                    type="text"
                    className={`text-input ${
                      showFeedback ? (checkScientificAnswer(scientificAnswer, currentQ) ? 'correct' : 'incorrect') : ''
                    }`}
                    value={scientificAnswer}
                    onChange={(e) => setScientificAnswer(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !showFeedback) {
                        handleSubmitAnswer();
                      }
                    }}
                    placeholder="e.g., Rosa"
                    disabled={showFeedback}
                  />
                </div>
              </div>
            )}

            {(currentQ.type === 'short' || currentQ.type === 'scientific') && (
              <div className="text-answer-container">
                <input
                  type="text"
                  className={`text-input ${
                    showFeedback ? (checkTextAnswer(textAnswer, currentQ) ? 'correct' : 'incorrect') : ''
                  }`}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !showFeedback) {
                      handleSubmitAnswer();
                    }
                  }}
                  placeholder={currentQ.type === 'scientific' ? 'e.g., Rosa' : 'e.g., rose'}
                  disabled={showFeedback}
                  autoFocus
                />
                {currentQ.type === 'scientific' && (
                  <p className="hint">Hint: Use italics format (Genus species)</p>
                )}
              </div>
            )}

            {showFeedback && (
              <div className={`feedback ${
                currentQ.type === 'flashcard' ? 'correct' :
                currentQ.type === 'mastery' ? (checkTextAnswer(textAnswer, currentQ) && checkScientificAnswer(scientificAnswer, currentQ) ? 'correct' : 'incorrect') :
                (currentQ.stage === MasteryStage.MULTIPLE_CHOICE ? selectedAnswer.isCorrect : checkTextAnswer(textAnswer, currentQ))
                  ? 'correct' : 'incorrect'
              }`}>
                {currentQ.type === 'flashcard' ? (
                  <>
                    <p>Flashcard viewed!</p>
                    <p className="progress-info">
                      Progress: {currentQ.stageCorrectCount + 1}/2 views in this stage
                      {currentQ.stageCorrectCount + 1 >= 2 && (
                        <span className="level-up"> → Advancing to Multiple Choice!</span>
                      )}
                    </p>
                  </>
                ) : currentQ.type === 'mastery' ? (
                  (checkTextAnswer(textAnswer, currentQ) && checkScientificAnswer(scientificAnswer, currentQ)) ? (
                    <>
                      <p>Perfect! You've mastered this flower!</p>
                      <p className="progress-info">
                        Progress: {currentQ.stageCorrectCount + 1}/2 correct in this stage
                        {currentQ.stageCorrectCount + 1 >= 2 && (
                          <span className="level-up"> → Fully Mastered!</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p>Incorrect. You need both correct:</p>
                      <p className="correct-answer">
                        Common: {currentQ.correctAnswers.join(' or ')}<br/>
                        Scientific: {currentQ.scientificAnswer}
                      </p>
                      <p className="flagged-notice">This flower has been flagged for review.</p>
                    </>
                  )
                ) : (currentQ.stage === MasteryStage.MULTIPLE_CHOICE ? selectedAnswer.isCorrect : checkTextAnswer(textAnswer, currentQ)) ? (
                  <>
                    <p>Correct! Well done!</p>
                    <p className="progress-info">
                      Progress: {currentQ.stageCorrectCount + 1}/2 correct in this stage
                      {currentQ.stageCorrectCount + 1 >= 2 && currentQ.stage !== MasteryStage.MASTERY && (
                        <span className="level-up"> → Level Up!</span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p>Incorrect. The correct answer{currentQ.stage === MasteryStage.MULTIPLE_CHOICE && currentQ.allCorrectAnswers?.length > 1 ? 's are' : ' is'}:</p>
                    {currentQ.type === 'short' ? (
                      <p className="correct-answer">{currentQ.correctAnswers.join(' or ')}</p>
                    ) : currentQ.stage === MasteryStage.MULTIPLE_CHOICE && currentQ.allCorrectAnswers ? (
                      <p className="correct-answer">{currentQ.allCorrectAnswers.join(' or ')}</p>
                    ) : (
                      <p className="correct-answer">{currentQ.correctAnswer || currentQ.flower.common[0]}</p>
                    )}
                    <p className="flagged-notice">This flower has been flagged for review.</p>
                  </>
                )}
                <p className="scientific-name">Scientific name: {currentQ.flower.scientific}</p>
              </div>
            )}

            <div className="action-buttons">
              {!showFeedback ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={
                    currentQ.type === 'flashcard' ? !flashcardRevealed :
                    currentQ.type === 'mastery' ? (!textAnswer.trim() || !scientificAnswer.trim()) :
                    currentQ.stage === MasteryStage.MULTIPLE_CHOICE ? !selectedAnswer :
                    !textAnswer.trim()
                  }
                  className="btn btn-primary"
                >
                  {currentQ.type === 'flashcard' ? 'Continue' : 'Submit Answer'}
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="btn btn-primary"
                >
                  {currentQuestion + 1 < quizQuestions.length ? 'Next Question' : 'See Results'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {gameState === 'results' && (
        <div className="results-screen">
          <h1>Quiz Complete!</h1>
          <div className="final-score">
            <p className="score-large">{score} / {quizQuestions.length}</p>
            <p className="percentage">{Math.round((score / quizQuestions.length) * 100)}%</p>
          </div>

          {score === quizQuestions.length && (
            <p className="perfect-score">Perfect score! You know your flowers!</p>
          )}
          {score >= quizQuestions.length * 0.7 && score < quizQuestions.length && (
            <p className="good-score">Great job! You really know your flowers!</p>
          )}
          {score >= quizQuestions.length * 0.5 && score < quizQuestions.length * 0.7 && (
            <p className="okay-score">Good effort! Keep studying!</p>
          )}
          {score < quizQuestions.length * 0.5 && (
            <p className="low-score">Keep practicing! You'll get better!</p>
          )}

          <button onClick={handleRestartQuiz} className="btn btn-primary">
            Take Another Quiz
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
