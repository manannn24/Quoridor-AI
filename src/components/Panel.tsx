import React from 'react';
import { GameState, WallOrientation } from '../game/types';
import { AgentConfig, AIDecisionMetrics, AIStrategy } from '../ai/types';

interface PanelProps {
  gameState: GameState;
  aiConfig: AgentConfig;
  onUpdateAiConfig: (config: AgentConfig) => void;
  wallMode: 'none' | WallOrientation;
  onSetWallMode: (mode: 'none' | WallOrientation) => void;
  isAiThinking: boolean;
  lastAiMetrics: AIDecisionMetrics | null;
  errorMessage: string | null;
  canUndo: boolean;
  onNewGame: () => void;
  onUndo: () => void;
}

export const Panel: React.FC<PanelProps> = ({
  gameState,
  aiConfig,
  onUpdateAiConfig,
  wallMode,
  onSetWallMode,
  isAiThinking,
  lastAiMetrics,
  errorMessage,
  canUndo,
  onNewGame,
  onUndo,
}) => {
  const isHumanTurn = gameState.activePlayer === 'P1' && gameState.winner === null;

  return (
    <aside className="side-panel" aria-label="Game Control Panel">
      {/* Status Banner */}
      <div
        className={`status-banner ${
          gameState.winner
            ? 'status-winner'
            : isAiThinking
            ? 'status-thinking'
            : isHumanTurn
            ? 'status-p1'
            : 'status-p2'
        }`}
        role="status"
        aria-live="polite"
      >
        {gameState.winner ? (
          gameState.winner === 'P1' ? (
            <span>🏆 Victory! You have reached row 0 and won the game!</span>
          ) : (
            <span>🤖 Defeat! The Computer reached row 8 and won the game.</span>
          )
        ) : isAiThinking ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Computer is thinking ({aiConfig.strategy}, depth {aiConfig.depth})...</span>
          </>
        ) : isHumanTurn ? (
          <span>Your turn — click a highlighted square to move, or select a wall to place.</span>
        ) : (
          <span>Computer's turn...</span>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="error-alert" role="alert">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Players Overview & Wall Reserves */}
      <div className="players-overview">
        <div
          className={`player-card ${
            isHumanTurn && !isAiThinking ? 'active-p1' : ''
          }`}
        >
          <div className="player-label">
            <span className="p1-dot" />
            <span>Human (You)</span>
          </div>
          <div className="wall-reserve-count">
            {gameState.p1WallsRemaining}{' '}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              walls left
            </span>
          </div>
          <div className="wall-reserve-bars" title={`${gameState.p1WallsRemaining} / 10 walls`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`p1-wall-${i}`}
                className={`wall-pill ${
                  i < gameState.p1WallsRemaining ? '' : 'spent'
                }`}
              />
            ))}
          </div>
        </div>

        <div
          className={`player-card ${
            gameState.activePlayer === 'P2' && !gameState.winner ? 'active-p2' : ''
          }`}
        >
          <div className="player-label">
            <span className="p2-dot" />
            <span>Computer (AI)</span>
          </div>
          <div className="wall-reserve-count">
            {gameState.p2WallsRemaining}{' '}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              walls left
            </span>
          </div>
          <div className="wall-reserve-bars" title={`${gameState.p2WallsRemaining} / 10 walls`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`p2-wall-${i}`}
                className={`wall-pill ${
                  i < gameState.p2WallsRemaining ? '' : 'spent'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Human Actions & Wall Placement Modes */}
      <div className="card">
        <div className="card-title">Your Action</div>
        <div className="controls-grid">
          <button
            type="button"
            className={`btn ${wallMode === 'none' ? 'btn-active' : ''}`}
            disabled={!isHumanTurn || isAiThinking}
            onClick={() => onSetWallMode('none')}
          >
            Move Pawn
          </button>
          <button
            type="button"
            className={`btn ${wallMode === 'horizontal' ? 'btn-active' : ''}`}
            disabled={!isHumanTurn || isAiThinking || gameState.p1WallsRemaining === 0}
            onClick={() => onSetWallMode('horizontal')}
          >
            Horizontal Wall
          </button>
          <button
            type="button"
            className={`btn ${wallMode === 'vertical' ? 'btn-active' : ''}`}
            disabled={!isHumanTurn || isAiThinking || gameState.p1WallsRemaining === 0}
            onClick={() => onSetWallMode('vertical')}
          >
            Vertical Wall
          </button>
          {wallMode !== 'none' && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onSetWallMode('none')}
            >
              Cancel Placement
            </button>
          )}
        </div>
      </div>

      {/* Game State Actions */}
      <div className="card">
        <div className="card-title">Match Controls</div>
        <div className="controls-grid">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNewGame}
          >
            New Game
          </button>
          <button
            type="button"
            className="btn"
            disabled={!canUndo || isAiThinking}
            onClick={onUndo}
            title="Reverts your last action and the AI response"
          >
            Undo Turn
          </button>
        </div>
      </div>

      {/* AI Strategy & Depth Controls */}
      <div className="card">
        <div className="card-title">AI Settings</div>
        <div className="form-group">
          <label className="form-label" htmlFor="ai-strategy-select">
            AI Strategy
          </label>
          <select
            id="ai-strategy-select"
            className="select-input"
            value={aiConfig.strategy}
            onChange={(e) =>
              onUpdateAiConfig({
                ...aiConfig,
                strategy: e.target.value as AIStrategy,
              })
            }
          >
            <option value="alpha-beta">Minimax + Alpha-Beta (Recommended)</option>
            <option value="minimax">Minimax (Without Pruning)</option>
            <option value="greedy">Greedy Heuristic Baseline</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ai-depth-select">
            Search Depth (Plies)
          </label>
          <select
            id="ai-depth-select"
            className="select-input"
            value={aiConfig.depth}
            disabled={aiConfig.strategy === 'greedy'}
            onChange={(e) =>
              onUpdateAiConfig({
                ...aiConfig,
                depth: parseInt(e.target.value, 10),
              })
            }
          >
            <option value={1}>Depth 1 (Fastest)</option>
            <option value={2}>Depth 2 (Standard Balanced)</option>
            <option value={3}>Depth 3 (Deep Lookahead)</option>
          </select>
          <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px' }}>
            Note: Depth refers to plies (individual turns). Settings apply on the next AI move.
          </small>
        </div>
      </div>

      {/* AI Decision Metrics */}
      <div className="card">
        <div className="card-title">Last AI Decision Metrics</div>
        {lastAiMetrics ? (
          <table className="metrics-table">
            <tbody>
              <tr>
                <td>Strategy</td>
                <td>{lastAiMetrics.strategy}</td>
              </tr>
              <tr>
                <td>Depth</td>
                <td>{lastAiMetrics.completedDepth} ply</td>
              </tr>
              <tr>
                <td>Decision Time</td>
                <td>{lastAiMetrics.elapsedMs.toFixed(1)} ms</td>
              </tr>
              <tr>
                <td>Nodes Visited</td>
                <td>{lastAiMetrics.nodesVisited}</td>
              </tr>
              <tr>
                <td>Leaves Evaluated</td>
                <td>{lastAiMetrics.leavesEvaluated}</td>
              </tr>
              <tr>
                <td>Alpha-Beta Cutoffs</td>
                <td>{lastAiMetrics.cutoffs}</td>
              </tr>
              <tr>
                <td>Heuristic Score</td>
                <td>{lastAiMetrics.score}</td>
              </tr>
              <tr>
                <td>Action Chosen</td>
                <td>
                  {lastAiMetrics.selectedAction
                    ? lastAiMetrics.selectedAction.type === 'move'
                      ? `Move to (${lastAiMetrics.selectedAction.to.row}, ${lastAiMetrics.selectedAction.to.col})`
                      : `${lastAiMetrics.selectedAction.wall.orientation} wall at (${lastAiMetrics.selectedAction.wall.row}, ${lastAiMetrics.selectedAction.wall.col})`
                    : 'None'}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No computer decision made yet. Make your first move to see search statistics!
          </p>
        )}
      </div>
    </aside>
  );
};
