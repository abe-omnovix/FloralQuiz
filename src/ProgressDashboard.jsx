import { useState, useEffect } from 'react';
import { getAllFlowerStats, MasteryStage, clearAllProgress } from './storageService';
import { flowers } from './flowersData';
import './ProgressDashboard.css';

function ProgressDashboard({ onBack }) {
  const [flowerStats, setFlowerStats] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'needsReview', 'flashcard', 'mc', 'short', 'scientific', 'mastery'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'stage', 'successRate', 'lastSeen'

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const stats = getAllFlowerStats(flowers);
    setFlowerStats(stats);
  };

  const handleClearProgress = () => {
    if (confirm('Are you sure you want to clear all progress? This cannot be undone.')) {
      clearAllProgress();
      loadStats();
    }
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case MasteryStage.FLASHCARD:
        return <span className="badge badge-flashcard">Flashcard</span>;
      case MasteryStage.MULTIPLE_CHOICE:
        return <span className="badge badge-mc">Multiple Choice</span>;
      case MasteryStage.SHORT_ANSWER:
        return <span className="badge badge-short">Short Answer</span>;
      case MasteryStage.SCIENTIFIC_NAME:
        return <span className="badge badge-scientific">Scientific Name</span>;
      case MasteryStage.MASTERY:
        return <span className="badge badge-mastery">Mastery</span>;
      default:
        return <span className="badge badge-flashcard">Not Started</span>;
    }
  };

  const getProgressToNextStage = (stat) => {
    const { stage, stageCorrectCount } = stat;
    if (stage === MasteryStage.MASTERY) {
      return 'Fully Mastered!';
    }
    const needed = 2;
    return `${stageCorrectCount}/${needed} to next stage`;
  };

  // Filter stats
  let filteredStats = [...flowerStats];
  if (filter === 'needsReview') {
    filteredStats = filteredStats.filter(s => s.needsReview);
  } else if (filter === 'flashcard') {
    filteredStats = filteredStats.filter(s => s.stage === MasteryStage.FLASHCARD);
  } else if (filter === 'mc') {
    filteredStats = filteredStats.filter(s => s.stage === MasteryStage.MULTIPLE_CHOICE);
  } else if (filter === 'short') {
    filteredStats = filteredStats.filter(s => s.stage === MasteryStage.SHORT_ANSWER);
  } else if (filter === 'scientific') {
    filteredStats = filteredStats.filter(s => s.stage === MasteryStage.SCIENTIFIC_NAME);
  } else if (filter === 'mastery') {
    filteredStats = filteredStats.filter(s => s.stage === MasteryStage.MASTERY);
  }

  // Sort stats
  filteredStats.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.flower.common[0].localeCompare(b.flower.common[0]);
      case 'stage':
        const stageOrder = { flashcard: 0, mc: 1, short: 2, scientific: 3, mastery: 4 };
        return stageOrder[a.stage] - stageOrder[b.stage];
      case 'successRate':
        return b.successRate - a.successRate;
      case 'lastSeen':
        if (!a.lastSeen && !b.lastSeen) return 0;
        if (!a.lastSeen) return 1;
        if (!b.lastSeen) return -1;
        return new Date(b.lastSeen) - new Date(a.lastSeen);
      default:
        return 0;
    }
  });

  // Calculate overall stats
  const totalFlowers = flowerStats.length;
  const attemptedFlowers = flowerStats.filter(s => s.correctCount + s.incorrectCount > 0).length;
  const needsReview = flowerStats.filter(s => s.needsReview).length;
  const masteryBreakdown = {
    flashcard: flowerStats.filter(s => s.stage === MasteryStage.FLASHCARD).length,
    mc: flowerStats.filter(s => s.stage === MasteryStage.MULTIPLE_CHOICE).length,
    short: flowerStats.filter(s => s.stage === MasteryStage.SHORT_ANSWER).length,
    scientific: flowerStats.filter(s => s.stage === MasteryStage.SCIENTIFIC_NAME).length,
    mastery: flowerStats.filter(s => s.stage === MasteryStage.MASTERY).length
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Progress Dashboard</h1>
        <button onClick={onBack} className="btn btn-secondary">Back to Quiz</button>
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-value">{attemptedFlowers}/{totalFlowers}</div>
          <div className="stat-label">Flowers Attempted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{needsReview}</div>
          <div className="stat-label">Need Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{masteryBreakdown.flashcard}</div>
          <div className="stat-label">Flashcard</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{masteryBreakdown.mc}</div>
          <div className="stat-label">Multiple Choice</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{masteryBreakdown.short}</div>
          <div className="stat-label">Short Answer</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{masteryBreakdown.scientific}</div>
          <div className="stat-label">Scientific Name</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{masteryBreakdown.mastery}</div>
          <div className="stat-label">Mastery</div>
        </div>
      </div>

      <div className="controls">
        <div className="filter-group">
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Flowers</option>
            <option value="needsReview">Needs Review</option>
            <option value="flashcard">Flashcard Stage</option>
            <option value="mc">Multiple Choice Stage</option>
            <option value="short">Short Answer Stage</option>
            <option value="scientific">Scientific Name Stage</option>
            <option value="mastery">Mastery Stage</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="stage">Mastery Stage</option>
            <option value="successRate">Success Rate</option>
            <option value="lastSeen">Last Seen</option>
          </select>
        </div>

        <button onClick={handleClearProgress} className="btn btn-danger">
          Clear All Progress
        </button>
      </div>

      <div className="flowers-table">
        <table>
          <thead>
            <tr>
              <th>Flower</th>
              <th>Scientific Name</th>
              <th>Stage</th>
              <th>Progress</th>
              <th>Correct</th>
              <th>Incorrect</th>
              <th>Success Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStats.map((stat, index) => (
              <tr key={index} className={stat.needsReview ? 'needs-review' : ''}>
                <td className="flower-name">{stat.flower.common[0]}</td>
                <td className="scientific-name">{stat.flower.scientific}</td>
                <td>{getStageBadge(stat.stage)}</td>
                <td className="progress-cell">{getProgressToNextStage(stat)}</td>
                <td>{stat.correctCount}</td>
                <td>{stat.incorrectCount}</td>
                <td>
                  {stat.correctCount + stat.incorrectCount > 0 ? (
                    <span className={`success-rate ${stat.successRate >= 70 ? 'good' : stat.successRate >= 50 ? 'okay' : 'poor'}`}>
                      {stat.successRate}%
                    </span>
                  ) : (
                    <span className="not-attempted">-</span>
                  )}
                </td>
                <td>
                  {stat.needsReview ? (
                    <span className="status-flag">Needs Review</span>
                  ) : stat.correctCount + stat.incorrectCount === 0 ? (
                    <span className="status-new">Not Started</span>
                  ) : (
                    <span className="status-good">Good</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStats.length === 0 && (
        <div className="no-results">
          <p>No flowers match the current filter.</p>
        </div>
      )}
    </div>
  );
}

export default ProgressDashboard;
