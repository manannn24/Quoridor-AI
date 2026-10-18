import React, { useState, useEffect, useRef } from 'react';
import { GameState, Position, Wall, WallOrientation } from '../game/types';
import { createInitialState } from '../game/state';
import { applyAction } from '../game/actions';
import { chooseAIAction } from '../ai/minimax';
import { AgentConfig, AIDecisionMetrics } from '../ai/types';
import { Header } from '../components/Header';
import { Board } from '../components/Board';
import { Panel } from '../components/Panel';
import { ArenaView } from '../components/ArenaView';
import { TournamentView } from '../components/TournamentView';

export type AppTab = 'human-vs-ai' | 'arena' | 'tournaments';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('human-vs-ai');
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [history, setHistory] = useState<GameState[]>([]);
  const [wallMode, setWallMode] = useState<'none' | WallOrientation>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [lastAiMetrics, setLastAiMetrics] = useState<AIDecisionMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<(AIDecisionMetrics | null)[]>([]);

  const [aiConfig, setAiConfig] = useState<AgentConfig>({
    strategy: 'alpha-beta',
    depth: 2,
    candidateWallLimitRoot: 8,
    candidateWallLimitSub: 6,
  });

  // Keep a ref to state to prevent stale closures in timeout callbacks
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Trigger Computer (P2) turn
  useEffect(() => {
    if (gameState.activePlayer === 'P2' && gameState.winner === null) {
      setIsAiThinking(true);
      setErrorMessage(null);

      const timer = setTimeout(() => {
        const currentState = stateRef.current;
        if (currentState.activePlayer !== 'P2' || currentState.winner !== null) {
          setIsAiThinking(false);
          return;
        }

        try {
          const metrics = chooseAIAction(currentState, aiConfig);
          setLastAiMetrics(metrics);
          setMetricsHistory((prev) => [...prev, metrics]);

          if (metrics.selectedAction) {
            const res = applyAction(currentState, metrics.selectedAction);
            if (res.success) {
              setGameState(res.state);
            } else {
              setErrorMessage(res.error ?? 'AI generated an invalid move.');
            }
          } else {
            setErrorMessage('AI could not select an action.');
          }
        } catch (err) {
          setErrorMessage(
            err instanceof Error ? err.message : 'An error occurred during AI search.'
          );
        } finally {
          setIsAiThinking(false);
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [gameState.activePlayer, gameState.winner, aiConfig]);

  const handleCellClick = (pos: Position) => {
    if (gameState.activePlayer !== 'P1' || gameState.winner !== null || isAiThinking) {
      return;
    }

    const res = applyAction(gameState, { type: 'move', to: pos });
    if (res.success) {
      setHistory((prev) => [...prev, gameState]);
      setGameState(res.state);
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error ?? 'Invalid pawn move.');
    }
  };

  const handleWallClick = (wall: Wall) => {
    if (gameState.activePlayer !== 'P1' || gameState.winner !== null || isAiThinking) {
      return;
    }

    const res = applyAction(gameState, { type: 'placeWall', wall });
    if (res.success) {
      setHistory((prev) => [...prev, gameState]);
      setGameState(res.state);
      setWallMode('none');
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error ?? 'Invalid wall placement.');
    }
  };

  const handleNewGame = () => {
    setGameState(createInitialState());
    setHistory([]);
    setMetricsHistory([]);
    setWallMode('none');
    setErrorMessage(null);
    setLastAiMetrics(null);
    setIsAiThinking(false);
  };

  const handleUndo = () => {
    if (history.length === 0 || isAiThinking) return;

    // In a human vs computer match, revert back to the human turn before their action
    // If it's human's turn now, history has at least [pre-human-move] or [pre-human, pre-ai]
    const newHistory = [...history];
    const previousState = newHistory.pop();
    if (previousState) {
      setGameState(previousState);
      setHistory(newHistory);
      const newMetrics = [...metricsHistory];
      newMetrics.pop();
      setMetricsHistory(newMetrics);
      setLastAiMetrics(newMetrics[newMetrics.length - 1] ?? null);
      setErrorMessage(null);
      setWallMode('none');
    }
  };

  return (
    <div className="app-container">
      <Header />

      {/* Experimentation Platform Navigation Tabs */}
      <nav className="nav-tabs" role="tablist" aria-label="Game Modes">
        <button
          role="tab"
          aria-selected={activeTab === 'human-vs-ai'}
          className={`nav-tab ${activeTab === 'human-vs-ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('human-vs-ai')}
        >
          🎮 Human vs AI
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'arena'}
          className={`nav-tab ${activeTab === 'arena' ? 'active' : ''}`}
          onClick={() => setActiveTab('arena')}
        >
          ⚔️ AI vs AI Arena
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'tournaments'}
          className={`nav-tab ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          🏆 Tournaments
        </button>
      </nav>

      {/* Tab Views */}
      {activeTab === 'human-vs-ai' && (
        <main className="game-layout">
          <Board
            gameState={gameState}
            wallMode={wallMode}
            isAiThinking={isAiThinking}
            onCellClick={handleCellClick}
            onWallClick={handleWallClick}
          />
          <Panel
            gameState={gameState}
            aiConfig={aiConfig}
            onUpdateAiConfig={setAiConfig}
            wallMode={wallMode}
            onSetWallMode={setWallMode}
            isAiThinking={isAiThinking}
            lastAiMetrics={lastAiMetrics}
            errorMessage={errorMessage}
            canUndo={history.length > 0}
            onNewGame={handleNewGame}
            onUndo={handleUndo}
          />
        </main>
      )}

      {activeTab === 'arena' && <ArenaView />}
      {activeTab === 'tournaments' && <TournamentView />}
    </div>
  );
};
