import React, { useState, useMemo } from 'react';
import { GameState } from '../game/types';
import { createInitialState } from '../game/state';
import { applyAction } from '../game/actions';
import {
  HeuristicPresetId,
  HeuristicWeights,
} from '../ai/types';
import {
  HEURISTIC_PRESETS,
  resolveHeuristicWeights,
  evaluateStateDetailed,
} from '../ai/heuristics';
import { Board } from './Board';

// Pre-configured test board scenarios
function createScenarios(): Record<string, { label: string; description: string; state: GameState }> {
  const initial = createInitialState();

  // Choke scenario: P2 placed a wall blocking P1
  let chokeState = createInitialState();
  const a1 = applyAction(chokeState, {
    type: 'placeWall',
    wall: { row: 6, col: 4, orientation: 'horizontal' },
  });
  if (a1.success) chokeState = a1.state;
  const a2 = applyAction(chokeState, {
    type: 'placeWall',
    wall: { row: 6, col: 2, orientation: 'horizontal' },
  });
  if (a2.success) chokeState = a2.state;

  // Race scenario: both pawns advanced
  let raceState = createInitialState();
  raceState = {
    ...raceState,
    p1Pos: { row: 2, col: 4 },
    p1WallsRemaining: 5,
    p2Pos: { row: 6, col: 4 },
    p2WallsRemaining: 5,
  };

  // Wall advantage scenario: P1 has 8 walls, P2 has 1 wall
  let wallAdvState = createInitialState();
  wallAdvState = {
    ...wallAdvState,
    p1Pos: { row: 5, col: 4 },
    p1WallsRemaining: 8,
    p2Pos: { row: 3, col: 4 },
    p2WallsRemaining: 1,
  };

  return {
    initial: {
      label: 'Initial Board',
      description: 'Standard starting state (10 walls each, symmetric 8-step distance)',
      state: initial,
    },
    choke: {
      label: 'Wall Choke / Blockade',
      description: 'Horizontal walls placed in front of P1, lengthening P1 path',
      state: chokeState,
    },
    race: {
      label: 'Advancement Sprint',
      description: 'Both pawns deep in opponent territory, testing goal progress',
      state: raceState,
    },
    wallAdvantage: {
      label: 'Asymmetric Wall Advantage',
      description: 'Equal distances, but P1 holds 8 walls vs P2 with 1 wall',
      state: wallAdvState,
    },
  };
}

export const HeuristicLabView: React.FC = () => {
  const scenarios = useMemo(() => createScenarios(), []);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('choke');
  const [activePreset, setActivePreset] = useState<HeuristicPresetId>('H0');
  const [customWeights, setCustomWeights] = useState<HeuristicWeights>({
    ...HEURISTIC_PRESETS.H0.weights,
  });

  const handleSelectPreset = (id: HeuristicPresetId) => {
    setActivePreset(id);
    if (id !== 'custom') {
      setCustomWeights({ ...HEURISTIC_PRESETS[id].weights });
    }
  };

  const handleSliderChange = (key: keyof HeuristicWeights, value: number) => {
    setActivePreset('custom');
    setCustomWeights((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const currentScenario = scenarios[selectedScenarioKey] ?? scenarios.initial;
  const currentWeights = activePreset === 'custom' ? customWeights : resolveHeuristicWeights(activePreset);

  // Evaluate state detailed from P1 perspective
  const evaluation = useMemo(() => {
    return evaluateStateDetailed(currentScenario.state, 'P1', currentWeights);
  }, [currentScenario.state, currentWeights]);

  const bd = evaluation.breakdown;

  // Determine favorability
  const favorability =
    evaluation.score > 20
      ? { label: 'Favors Player 1 (Blue)', color: '#38bdf8' }
      : evaluation.score < -20
      ? { label: 'Favors Player 2 (Red)', color: '#f43f5e' }
      : { label: 'Approximately Balanced', color: '#f59e0b' };

  return (
    <div className="panel-container" style={{ maxWidth: 1050, margin: '0 auto' }}>
      <div className="panel-card">
        <h2>Modular Heuristic Laboratory</h2>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 16 }}>
          Explore and tune the heuristic evaluation function. Compare mathematical feature contributions
          (shortest paths, wall reserves, disruption, goal advancement) across standard presets or customized weight vectors.
        </p>

        {/* Preset Selector Grid */}
        <div className="heuristic-card-grid">
          {(['H0', 'H1', 'H2', 'H3'] as HeuristicPresetId[]).map((pid) => {
            const p = HEURISTIC_PRESETS[pid];
            const isSelected = activePreset === pid;
            return (
              <div
                key={pid}
                className={`heuristic-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectPreset(pid)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{p.name}</strong>
                  {isSelected && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>Active</span>}
                </div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                  {p.description}
                </p>
                <div style={{ fontSize: '0.75rem', marginTop: 6, color: '#94a3b8' }}>
                  W_path: {p.weights.pathWeight} | W_walls: {p.weights.wallWeight}
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Weight Sliders */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div className="card-header-row" style={{ marginBottom: 12 }}>
            <h4>Heuristic Feature Weights {activePreset === 'custom' && '(Custom Mode)'}</h4>
            {activePreset === 'custom' && (
              <button
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                onClick={() => handleSelectPreset('H0')}
              >
                Reset to H0 Baseline
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            {/* Path Weight */}
            <div className="slider-group">
              <div className="slider-row">
                <span>Shortest Path Weight (W_path):</span>
                <strong>{currentWeights.pathWeight}</strong>
              </div>
              <input
                type="range"
                min="-150"
                max="200"
                step="5"
                value={currentWeights.pathWeight}
                onChange={(e) => handleSliderChange('pathWeight', parseInt(e.target.value, 10))}
              />
            </div>

            {/* Wall Reserve Weight */}
            <div className="slider-group">
              <div className="slider-row">
                <span>Wall Reserve Weight (W_walls):</span>
                <strong>{currentWeights.wallWeight}</strong>
              </div>
              <input
                type="range"
                min="-20"
                max="40"
                step="1"
                value={currentWeights.wallWeight}
                onChange={(e) => handleSliderChange('wallWeight', parseInt(e.target.value, 10))}
              />
            </div>

            {/* Disruption Bonus */}
            <div className="slider-group">
              <div className="slider-row">
                <span>Wall Disruption Bonus:</span>
                <strong>{currentWeights.disruptionWeight ?? 0}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={currentWeights.disruptionWeight ?? 0}
                onChange={(e) => handleSliderChange('disruptionWeight', parseInt(e.target.value, 10))}
              />
            </div>

            {/* Goal Progress Weight */}
            <div className="slider-group">
              <div className="slider-row">
                <span>Goal Advancement Weight:</span>
                <strong>{currentWeights.progressWeight ?? 0}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="2"
                value={currentWeights.progressWeight ?? 0}
                onChange={(e) => handleSliderChange('progressWeight', parseInt(e.target.value, 10))}
              />
            </div>

            {/* Cycle Penalty */}
            <div className="slider-group">
              <div className="slider-row">
                <span>Cycle Oscillation Penalty:</span>
                <strong>{currentWeights.cyclePenalty ?? 0}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={currentWeights.cyclePenalty ?? 0}
                onChange={(e) => handleSliderChange('cyclePenalty', parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>

        {/* Board Scenario Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
            Select Test Board Position:
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(scenarios).map(([key, s]) => (
              <button
                key={key}
                className={`btn ${selectedScenarioKey === key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedScenarioKey(key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>
            {currentScenario.description}
          </p>
        </div>

        {/* Live Evaluation Inspector Grid */}
        <div className="game-layout">
          <div>
            <Board
              gameState={currentScenario.state}
              wallMode="none"
              isAiThinking={false}
              onCellClick={() => {}}
              onWallClick={() => {}}
              p1Label="Player 1 (Blue)"
              p2Label="Player 2 (Red)"
            />
          </div>

          <div className="panel-container">
            <div className="panel-card">
              <h3>Live Heuristic Decomposition</h3>

              {/* Total Score Banner */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NET HEURISTIC SCORE (FROM P1 PERSPECTIVE)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: favorability.color }}>
                  {evaluation.score > 0 ? `+${evaluation.score}` : evaluation.score}
                </div>
                <div style={{ fontSize: '0.85rem', color: favorability.color, fontWeight: 600 }}>
                  {favorability.label}
                </div>
              </div>

              {/* Individual Feature Contributions */}
              <div className="feature-contribution-list">
                <div className="contribution-item">
                  <span className="feature-name">Shortest Path P1:</span>
                  <span className="feature-val">{bd.ownDist} steps</span>
                </div>
                <div className="contribution-item">
                  <span className="feature-name">Shortest Path P2:</span>
                  <span className="feature-val">{bd.oppDist} steps</span>
                </div>
                <div className="contribution-item">
                  <span className="feature-name">Path Delta (P2 - P1):</span>
                  <span className="feature-val">
                    {bd.pathAdvantage > 0 ? `+${bd.pathAdvantage}` : bd.pathAdvantage}
                  </span>
                </div>
                <div className="contribution-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                  <span className="feature-name">Path Contribution ({currentWeights.pathWeight} &times; &Delta;path):</span>
                  <span className="feature-val" style={{ color: bd.weightedPathScore >= 0 ? '#38bdf8' : '#f43f5e' }}>
                    {bd.weightedPathScore > 0 ? `+${bd.weightedPathScore}` : bd.weightedPathScore}
                  </span>
                </div>

                <div className="contribution-item">
                  <span className="feature-name">Wall Reserves (P1 vs P2):</span>
                  <span className="feature-val">
                    {bd.ownWalls} vs {bd.oppWalls}
                  </span>
                </div>
                <div className="contribution-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                  <span className="feature-name">Wall Contribution ({currentWeights.wallWeight} &times; &Delta;walls):</span>
                  <span className="feature-val" style={{ color: bd.weightedWallScore >= 0 ? '#38bdf8' : '#f43f5e' }}>
                    {bd.weightedWallScore > 0 ? `+${bd.weightedWallScore}` : bd.weightedWallScore}
                  </span>
                </div>

                {bd.disruptionBonus !== undefined && bd.disruptionBonus !== 0 && (
                  <div className="contribution-item">
                    <span className="feature-name">Disruption Contribution:</span>
                    <span className="feature-val">+{bd.disruptionBonus}</span>
                  </div>
                )}

                {bd.progressBonus !== undefined && bd.progressBonus !== 0 && (
                  <div className="contribution-item">
                    <span className="feature-name">Goal Progress Contribution:</span>
                    <span className="feature-val">+{bd.progressBonus}</span>
                  </div>
                )}

                {bd.cyclePenalty !== undefined && bd.cyclePenalty !== 0 && (
                  <div className="contribution-item">
                    <span className="feature-name">Cycle Oscillation Penalty:</span>
                    <span className="feature-val">-{bd.cyclePenalty}</span>
                  </div>
                )}

                <div
                  className="contribution-item"
                  style={{ paddingTop: 6, fontWeight: 700, fontSize: '0.95rem' }}
                >
                  <span>Calculated Net Score:</span>
                  <span style={{ color: favorability.color }}>{evaluation.score}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
