# Floral Quiz App

A React-based quiz application for studying and identifying flowers. Test your knowledge by identifying flowers from random images fetched from Wikipedia/Wikimedia Commons.

## Features

- **70+ Flowers**: Quiz includes over 70 different flowers with both scientific and common names
- **Dynamic Images**: Images are randomly fetched from Wikipedia/Wikimedia Commons, ensuring variety with each quiz
- **Multiple Quiz Lengths**: Choose between 10 or 20 questions
- **Real-time Scoring**: Track your progress as you answer questions
- **Instant Feedback**: See if your answer is correct immediately after submission
- **Beautiful UI**: Clean, modern interface with responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or navigate to the project directory
2. Install dependencies:
```bash
npm install
```

### Running the App

Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:5173` (or another port if 5173 is busy).

### Building for Production

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## How to Use

1. **Start**: Click either "Start Quiz (10 questions)" or "Long Quiz (20 questions)"
2. **Loading**: Wait while the app fetches random flower images from Wikipedia
3. **Answer**: Look at the flower image and select the correct name from four options
4. **Submit**: Click "Submit Answer" to check if you're correct
5. **Continue**: Click "Next Question" to move to the next flower
6. **Results**: View your final score and percentage at the end

## Flower Data

The quiz includes flowers from `flowerlist.md`, organized into:
- ID List #2: Exotic and tropical flowers (Protea, Heliconia, Orchids, etc.)
- ID List #1: Common cut flowers (Roses, Tulips, Carnations, etc.)

Each flower has:
- Scientific name (e.g., *Tulipa*)
- Common name(s) (e.g., tulip)

## Technology Stack

- **React 18**: Frontend framework
- **Vite**: Build tool and development server
- **Wikimedia Commons API**: Image source
- **Wikipedia API**: Search and image metadata

## API Usage

The app uses the following Wikipedia/Wikimedia APIs:
- Wikipedia Search API: To find relevant articles
- Wikipedia Images API: To get images from articles
- Wikimedia Commons: To fetch actual image URLs

No API key is required as these are public APIs with generous rate limits.

## Features in Detail

### Random Image Selection
Each time you take a quiz, the app:
1. Randomly selects flowers from the database
2. Searches Wikipedia for each flower
3. Randomly picks from multiple search results
4. Randomly selects from available images on the page

This ensures you see different images each time, making studying more effective.

### Quiz Logic
- 4 multiple choice options per question
- 1 correct answer + 3 random wrong answers
- Options are shuffled for each question
- Score tracking throughout the quiz
- Detailed feedback after each answer

## Future Enhancements

Possible improvements:
- Add difficulty levels (by flower rarity/similarity)
- Include scientific name identification
- Add timer for speed challenges
- Save high scores locally
- Add study mode with flashcards
- Filter by flower categories
- Offline mode with cached images

## License

This project is open source and available for educational purposes.

## Credits

- Flower data compiled from botanical study guides
- Images sourced from Wikipedia and Wikimedia Commons
- Built with React and Vite
