import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Action, Player } from '../game/types';
import { createInitialState } from '../game/state';
import { applyAction } from '../game/actions';
import { chooseAIAction } from '../ai/minimax';
import {
  AgentConfig,
  AgentDecisionResult,
  AgentAlgorithm,
  HeuristicPresetId,
  validateAndClampConfig,
} from '../ai/types';
import { getStateSignature, detectCycle, CycleDiagnosticResult } from '../ai/cycleDetection';
import { Board } from './Board';

interface MoveHistoryEntry {
  ply: number;
  player: Player;
  action: Action;
  algorithm: string;
  heuristicId: string;
  elapsedMs: number;
  score: number;
}

const DEFAULT_P1_CONFIG: AgentConfig = {
  strategy: 'alpha-beta',
  algorithm: 'alpha-beta',
  depth: 2,
  heuristicId: 'H0',
  candidateWallLimitRoot: 8,
  candidateWallLimitSub: 6,
  useIterativeDeepening: false,
  timeBudgetMs: 500,
};

const DEFAULT_P2_CONFIG: AgentConfig = {
  strategy: 'mcts',
  algorithm: 'mcts',
  depth: 1,
  mctsIterations: 80,
  mctsRolloutPlyCap: 15,
  mctsExplorationParam: 1.414,
  candidateWallLimitRoot: 8,
  candidateWallLimitSub: 6,
  timeBudgetMs: 500,
  seed: 42,
};

function formatActionNotation(action: Action): string {
  if (action.type === 'move') {
    return `Move (${action.to.row}, ${action.to.col})`;
  }
  return `Wall ${action.wall.orientation === 'horizontal' ? 'H' : 'V'} (${action.wall.row}, ${action.wall.col})`;
}

export const ArenaView: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [p1Config, setP1Config] = useState<AgentConfig>(DEFAULT_P1_CONFIG);
  const [p2Config, setP2Config] = useState<AgentConfig>(DEFAULT_P2_CONFIG);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(300);
  const [maxPlies, setMaxPlies] = useState<number>(120);

  const [historyEntries, setHistoryEntries] = useState<MoveHistoryEntry[]>([]);
  const [stateSignatures, setStateSignatures] = useState<string[]>([
    getStateSignature(createInitialState()),
  ]);
  const [cycleInfo, setCycleInfo] = useState<CycleDiagnosticResult>({
    isRepeated: false,
    repetitionCount: 0,
  });

  const [lastMetrics, setLastMetrics] = useState<AgentDecisionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plyLimitReached, setPlyLimitReached] = useState<boolean>(false);

  // References to keep async loop in sync and prevent race conditions
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const signaturesRef = useRef(stateSignatures);
  signaturesRef.current = stateSignatures;

  const executionTokenRef = useRef(0);

  // Step function to perform exactly one AI move
  const performStep = useCallback(async (): Promise<boolean> => {
    const currentState = stateRef.current;
    if (currentState.winner !== null || plyLimitReached) {
      setIsPlaying(false);
      return false;
    }

    if (historyEntries.length >= maxPlies) {
      setPlyLimitReached(true);
      setIsPlaying(false);
      return false;
    }

    const currentToken = ++executionTokenRef.current;
    setIsComputing(true);
    setErrorMessage(null);

    const active = currentState.activePlayer;
    const config = active === 'P1' ? p1Config : p2Config;
    const clampedConfig = validateAndClampConfig({
      ...config,
      seed: (config.seed ?? 100) + historyEntries.length,
    });

    try {
      // Yield to browser UI thread
      await new Promise((r) => setTimeout(r, 10));

      if (currentToken !== executionTokenRef.current) {
        setIsComputing(false);
        return false;
      }

      const decision = chooseAIAction(currentState, clampedConfig, {
        recentSignatures: signaturesRef.current.slice(-10),
        isCancelled: () => currentToken !== executionTokenRef.current,
      });

      if (currentToken !== executionTokenRef.current) {
        setIsComputing(false);
        return false;
      }

      setLastMetrics(decision);

      if (!decision.selectedAction) {
        setErrorMessage(`AI (${active}) could not find a legal move.`);
        setIsPlaying(false);
        setIsComputing(false);
        return false;
      }

      const applyRes = applyAction(currentState, decision.selectedAction);
      if (!applyRes.success) {
        setErrorMessage(applyRes.error ?? 'AI generated an illegal move.');
        setIsPlaying(false);
        setIsComputing(false);
        return false;
      }

      const nextState = applyRes.state;
      const nextSig = getStateSignature(nextState);
      const nextSigs = [...signaturesRef.current, nextSig];

      stateRef.current = nextState;
      setGameState(nextState);
      setStateSignatures(nextSigs);

      // Check cycle detection
      const cycleCheck = detectCycle(nextSigs);
      setCycleInfo(cycleCheck);

      // Record history entry
      const entry: MoveHistoryEntry = {
        ply: historyEntries.length + 1,
        player: active,
        action: decision.selectedAction,
        algorithm: decision.algorithm ?? config.algorithm ?? config.strategy,
        heuristicId: decision.heuristicId ?? config.heuristicId ?? 'H0',
        elapsedMs: Math.round(decision.elapsedMs),
        score: decision.score,
      };
      setHistoryEntries((prev) => [...prev, entry]);

      if (nextState.winner !== null) {
        setIsPlaying(false);
      } else if (historyEntries.length + 1 >= maxPlies) {
        setPlyLimitReached(true);
        setIsPlaying(false);
      }

      setIsComputing(false);
      return true;
    } catch (err) {
      if (currentToken === executionTokenRef.current) {
        setErrorMessage(err instanceof Error ? err.message : 'Error during AI move execution.');
        setIsPlaying(false);
        setIsComputing(false);
      }
      return false;
    }
  }, [historyEntries.length, maxPlies, p1Config, p2Config, plyLimitReached]);

  // Auto-play timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && !isComputing && gameState.winner === null && !plyLimitReached) {
      timer = setTimeout(async () => {
        if (isPlayingRef.current) {
          await performStep();
        }
      }, speedMs);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, isComputing, gameState.winner, plyLimitReached, speedMs, performStep]);

  const handlePlay = () => {
    if (gameState.winner !== null || plyLimitReached) return;
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    executionTokenRef.current++;
    setIsComputing(false);
  };

  const handleStep = async () => {
    if (isPlaying || isComputing || gameState.winner !== null || plyLimitReached) return;
    await performStep();
  };

  const handleRestart = () => {
    executionTokenRef.current++;
    setIsPlaying(false);
    setIsComputing(false);
    const initial = createInitialState();
    setGameState(initial);
    stateRef.current = initial;
    setHistoryEntries([]);
    const initialSig = getStateSignature(initial);
    setStateSignatures([initialSig]);
    signaturesRef.current = [initialSig];
    setCycleInfo({ isRepeated: false, repetitionCount: 0 });
    setLastMetrics(null);
    setErrorMessage(null);
    setPlyLimitReached(false);
  };

  const p1Label = `P1 (${p1Config.algorithm ?? p1Config.strategy})`;
  const p2Label = `P2 (${p2Config.algorithm ?? p2Config.strategy})`;

  return (
    <div className="arena-container">
      {/* Configuration Cards for P1 and P2 */}
      <div className="arena-configs-grid">
        {/* Player 1 Config */}
        <div className="agent-config-card p1-side">
          <div className="card-header-row">
            <h4>Player 1 (Blue) Configuration</h4>
            <span className="config-badge badge-p1">P1 - First Mover</span>
          </div>

          <div className="config-field">
            <label htmlFor="p1-algorithm-select">Algorithm</label>
            <select
              id="p1-algorithm-select"
              value={p1Config.algorithm ?? p1Config.strategy}
              onChange={(e) =>
                setP1Config({
                  ...p1Config,
                  algorithm: e.target.value as AgentAlgorithm,
                  strategy: e.target.value as AgentAlgorithm,
                })
              }
              disabled={isPlaying || isComputing}
            >
              <option value="alpha-beta">Alpha-Beta Pruning</option>
              <option value="minimax">Plain Minimax</option>
              <option value="greedy">Greedy Baseline</option>
              <option value="mcts">Monte Carlo Tree Search (MCTS)</option>
            </select>
          </div>

          <div className="config-field">
            <label htmlFor="p1-heuristic-select">Heuristic Evaluation</label>
            <select
              id="p1-heuristic-select"
              value={p1Config.heuristicId ?? 'H0'}
              onChange={(e) =>
                setP1Config({
                  ...p1Config,
                  heuristicId: e.target.value as HeuristicPresetId,
                })
              }
              disabled={isPlaying || isComputing}
            >
              <option value="H0">H0: Baseline (Path + Wall Count)</option>
              <option value="H1">H1: Pure Distance</option>
              <option value="H2">H2: Wall Resource Aware</option>
              <option value="H3">H3: Strategic Composite</option>
            </select>
          </div>

          {(p1Config.algorithm === 'alpha-beta' ||
            p1Config.algorithm === 'minimax' ||
            !p1Config.algorithm) && (
            <>
              <div className="config-field">
                <label htmlFor="p1-depth-input">Search Depth: {p1Config.depth ?? 2}</label>
                <input
                  id="p1-depth-input"
                  type="range"
                  min="1"
                  max="4"
                  value={p1Config.depth ?? 2}
                  onChange={(e) =>
                    setP1Config({ ...p1Config, depth: parseInt(e.target.value, 10) })
                  }
                  disabled={isPlaying || isComputing}
                />
              </div>

              <div className="config-row-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={p1Config.useIterativeDeepening ?? false}
                    onChange={(e) =>
                      setP1Config({ ...p1Config, useIterativeDeepening: e.target.checked })
                    }
                    disabled={isPlaying || isComputing}
                  />
                  Iterative Deepening
                </label>
              </div>

              {p1Config.useIterativeDeepening && (
                <div className="config-field">
                  <label htmlFor="p1-time-budget">Time Budget (ms)</label>
                  <input
                    id="p1-time-budget"
                    type="number"
                    min="50"
                    max="3000"
                    step="50"
                    value={p1Config.timeBudgetMs ?? 500}
                    onChange={(e) =>
                      setP1Config({ ...p1Config, timeBudgetMs: parseInt(e.target.value, 10) || 500 })
                    }
                    disabled={isPlaying || isComputing}
                  />
                </div>
              )}
            </>
          )}

          {p1Config.algorithm === 'mcts' && (
            <>
              <div className="config-field">
                <label htmlFor="p1-mcts-iter">MCTS Iterations: {p1Config.mctsIterations ?? 100}</label>
                <input
                  id="p1-mcts-iter"
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={p1Config.mctsIterations ?? 100}
                  onChange={(e) =>
                    setP1Config({ ...p1Config, mctsIterations: parseInt(e.target.value, 10) })
                  }
                  disabled={isPlaying || isComputing}
                />
              </div>
              <div className="config-field">
                <label htmlFor="p1-mcts-depth">Rollout Ply Cap: {p1Config.mctsRolloutPlyCap ?? 15}</label>
                <input
                  id="p1-mcts-depth"
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={p1Config.mctsRolloutPlyCap ?? 15}
                  onChange={(e) =>
                    setP1Config({ ...p1Config, mctsRolloutPlyCap: parseInt(e.target.value, 10) })
                  }
                  disabled={isPlaying || isComputing}
                />
              </div>
            </>
          )}
        </div>

        {/* Player 2 Config */}
        <div className="agent-config-card p2-side">
          <div className="card-header-row">
            <h4>Player 2 (Red) Configuration</h4>
            <span className="config-badge badge-p2">P2 - Second Mover</span>
          </div>

          <div className="config-field">
            <label htmlFor="p2-algorithm-select">Algorithm</label>
            <select
              id="p2-algorithm-select"
              value={p2Config.algorithm ?? p2Config.strategy}
              onChange={(e) =>
                setP2Config({
                  ...p2Config,
                  algorithm: e.target.value as AgentAlgorithm,
                  strategy: e.target.value as AgentAlgorithm,
                })
              }
              disabled={isPlaying || isComputing}
            >
              <option value="alpha-beta">Alpha-Beta Pruning</option>
              <option value="minimax">Plain Minimax</option>
              <option value="greedy">Greedy Baseline</option>
              <option value="mcts">Monte Carlo Tree Search (MCTS)</option>
            </select>
          </div>

          <div className="config-field">
            <label htmlFor="p2-heuristic-select">Heuristic Evaluation</label>
            <select
              id="p2-heuristic-select"
              value={p2Config.heuristicId ?? 'H0'}
              onChange={(e) =>
                setP2Config({
                  ...p2Config,
                  heuristicId: e.target.value as HeuristicPresetId,
                })
              }
              disabled={isPlaying || isComputing}
            >
              <option value="H0">H0: Baseline (Path + Wall Count)</option>
              <option value="H1">H1: Pure Distance</option>
              <option value="H2">H2: Wall Resource Aware</option>
              <option value="H3">H3: Strategic Composite</option>
            </select>
          </div>

          {(p2Config.algorithm === 'alpha-beta' ||
            p2Config.algorithm === 'minimax' ||
            !p2Config.algorithm) && (
            <>
              <div className="config-field">
                <label htmlFor="p2-depth-input">Search Depth: {p2Config.depth ?? 2}</label>
                <input
                  id="p2-depth-input"
                  type="range"
                  min="1"
                  max="4"
                  value={p2Config.depth ?? 2}
                  onChange={(e) =>
                    setP2Config({ ...p2Config, depth: parseInt(e.target.value, 10) })
                  }
                  disabled={isPlaying || isComputing}
                />
              </div>

              <div className="config-row-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={p2Config.useIterativeDeepening ?? false}
                    onChange={(e) =>
                      setP2Config({ ...p2Config, useIterativeDeepening: e.target.checked })
                    }
                    disabled={isPlaying || isComputing}
                  />
                  Iterative Deepening
                </label>
              </div>

              {p2Config.useIterativeDeepening && (
                <div className="config-field">
                  <label htmlFor="p2-time-budget">Time Budget (ms)</label>
                  <input
                    id="p2-time-budget"
                    type="number"
                    min="50"
                    max="3000"
                    step="50"
                    value={p2Config.timeBudgetMs ?? 500}
                    onChange={(e) =>
                      setP2Config({ ...p2Config, timeBudgetMs: parseInt(e.target.value, 10) || 500 })
                    }
                    disabled={isPlaying || isComputing}
                  />
                </div>
              )}
            </>
          )}

          {p2Config.algorithm === 'mcts' && (
            <>
              <div className="config-field">
                <label htmlFor="p2-mcts-iter">MCTS Iterations: {p2Config.mctsIterations ?? 100}</label>
                <input
                  id="p2-mcts-iter"
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={p2Config.mctsIterations ?? 100}
                  onChange={(e) =>
                    setP2Config({ ...p2Config, mctsIterations: parseInt(e.target.value, 10) })
                  }
                  disabled={isPlaying || isComputing}
                />
              </div>
              <div className="config-field">
                <label htmlFor="p2-mcts-depth">Rollout Ply Cap: {p2Config.mctsRolloutPlyCap ?? 15}</label>
                <input
                  id="p2-mcts-depth"
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={p2Config.mctsRolloutPlyCap ?? 15}
                  onChange={(e) =>
                    setP2Config({ ...p2Config, mctsRolloutPlyCap: parseInt(e.target.value, 10) })
                  }
                  disabled={isPlaying || isComputing}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Arena Control Bar */}
      <div className="arena-controls">
        <button
          className="btn btn-primary"
          onClick={handlePlay}
          disabled={isPlaying || gameState.winner !== null || plyLimitReached}
        >
          ▶ Play
        </button>

        <button
          className="btn btn-secondary"
          onClick={handlePause}
          disabled={!isPlaying}
        >
          ⏸ Pause
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleStep}
          disabled={isPlaying || isComputing || gameState.winner !== null || plyLimitReached}
        >
          ⏭ Step 1 Ply
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleRestart}
        >
          🔄 Restart
        </button>

        <div className="speed-control">
          <span>Speed: {speedMs}ms</span>
          <input
            className="speed-slider"
            type="range"
            min="50"
            max="1200"
            step="50"
            value={speedMs}
            onChange={(e) => setSpeedMs(parseInt(e.target.value, 10))}
          />
          <span style={{ marginLeft: 12 }}>Max Plies:</span>
          <input
            type="number"
            min="30"
            max="300"
            step="10"
            style={{
              width: 55,
              padding: '2px 4px',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
            }}
            value={maxPlies}
            onChange={(e) => setMaxPlies(parseInt(e.target.value, 10) || 120)}
            disabled={isPlaying || isComputing}
          />
        </div>
      </div>

      {/* Cycle Warning Banner */}
      {cycleInfo.isRepeated && (
        <div className="cycle-warning" role="alert">
          <span>⚠️</span>
          <div>
            <strong>Cycle Repetition Detected:</strong> A repeated position has recurred{' '}
            {cycleInfo.repetitionCount} times (last seen {cycleInfo.lastSeenPliesAgo} plies ago).
            Agents are oscillating in pawn moves.
          </div>
        </div>
      )}

      {/* Game Outcome Banner */}
      {gameState.winner !== null && (
        <div className="winner-banner" role="status">
          🎉 Game Over — Player {gameState.winner === 'P1' ? '1 (Blue)' : '2 (Red)'} Wins!
        </div>
      )}

      {plyLimitReached && gameState.winner === null && (
        <div className="cycle-warning" role="status">
          🛑 Game Reached Safety Ply Limit ({maxPlies} plies). Result: Draw.
        </div>
      )}

      {errorMessage && (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      )}

      {/* Main Game Arena Layout */}
      <div className="game-layout">
        <Board
          gameState={gameState}
          wallMode="none"
          isAiThinking={isComputing}
          onCellClick={() => {}}
          onWallClick={() => {}}
          p1Label={p1Label}
          p2Label={p2Label}
        />

        {/* Side Panel with Metrics & History */}
        <div className="panel-container">
          <div className="panel-card">
            <h3>Match Status</h3>
            <div className="status-grid">
              <div>
                <span className="text-muted">Turn: </span>
                <strong>Ply {historyEntries.length + 1}</strong>
              </div>
              <div>
                <span className="text-muted">Active: </span>
                <strong style={{ color: gameState.activePlayer === 'P1' ? '#38bdf8' : '#f43f5e' }}>
                  {gameState.activePlayer === 'P1' ? p1Label : p2Label}
                </strong>
                {isComputing && <span className="thinking-spinner" style={{ marginLeft: 8 }} />}
              </div>
              <div>
                <span className="text-muted">P1 Walls Left: </span>
                <strong>{gameState.p1WallsRemaining}</strong>
              </div>
              <div>
                <span className="text-muted">P2 Walls Left: </span>
                <strong>{gameState.p2WallsRemaining}</strong>
              </div>
            </div>
          </div>

          {/* Last Move Diagnostics */}
          <div className="panel-card">
            <h3>Last AI Decision Metrics</h3>
            {lastMetrics ? (
              <div className="metrics-grid">
                <div>
                  <span className="text-muted">Algorithm: </span>
                  <strong>{lastMetrics.algorithm ?? lastMetrics.strategy}</strong>
                </div>
                <div>
                  <span className="text-muted">Time: </span>
                  <strong>{Math.round(lastMetrics.elapsedMs)} ms</strong>
                </div>
                <div>
                  <span className="text-muted">Score / WinRate: </span>
                  <strong>{Math.round(lastMetrics.score)}</strong>
                </div>
                {lastMetrics.nodesVisited !== undefined && (
                  <div>
                    <span className="text-muted">Nodes Visited: </span>
                    <strong>{lastMetrics.nodesVisited.toLocaleString()}</strong>
                  </div>
                )}
                {lastMetrics.cutoffs !== undefined && (
                  <div>
                    <span className="text-muted">Alpha-Beta Cutoffs: </span>
                    <strong>{lastMetrics.cutoffs.toLocaleString()}</strong>
                  </div>
                )}
                {lastMetrics.mctsIterations !== undefined && (
                  <div>
                    <span className="text-muted">MCTS Iterations: </span>
                    <strong>{lastMetrics.mctsIterations}</strong>
                  </div>
                )}
                {lastMetrics.selectedAction && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span className="text-muted">Action: </span>
                    <code>{formatActionNotation(lastMetrics.selectedAction)}</code>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                No moves executed yet. Click &quot;Play&quot; or &quot;Step 1 Ply&quot; to begin.
              </p>
            )}
          </div>

          {/* Move History */}
          <div className="panel-card">
            <div className="card-header-row" style={{ marginBottom: 6 }}>
              <h3>Move History</h3>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                {historyEntries.length} Plies
              </span>
            </div>

            <div className="history-list">
              {historyEntries.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  History is empty
                </div>
              ) : (
                historyEntries.map((h) => (
                  <div key={h.ply} className="history-item">
                    <span>
                      <strong>#{h.ply} [{h.player}]</strong> {formatActionNotation(h.action)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {h.elapsedMs}ms | S: {Math.round(h.score)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
