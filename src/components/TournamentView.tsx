import React, { useState, useRef } from 'react';
import {
  TournamentOptions,
  TournamentReport,
  TournamentGameResult,
  runTournament,
  exportTournamentToJson,
  exportTournamentToCsv,
} from '../arena/tournamentRunner';
import { AgentConfig, AgentAlgorithm, HeuristicPresetId } from '../ai/types';

type PresetType =
  | 'standard'
  | 'heuristic-ablation'
  | 'mcts-vs-alphabeta'
  | 'mcts-budget'
  | 'custom';

export const TournamentView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('standard');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [statusText, setStatusText] = useState<string>('Ready to run experiment');
  const [report, setReport] = useState<TournamentReport | null>(null);

  // Custom configuration state
  const [customConfigA, setCustomConfigA] = useState<AgentConfig>({
    algorithm: 'alpha-beta',
    strategy: 'alpha-beta',
    depth: 2,
    heuristicId: 'H0',
    candidateWallLimitRoot: 8,
    candidateWallLimitSub: 6,
  });

  const [customConfigB, setCustomConfigB] = useState<AgentConfig>({
    algorithm: 'mcts',
    strategy: 'mcts',
    depth: 1,
    mctsIterations: 80,
    mctsRolloutPlyCap: 15,
    candidateWallLimitRoot: 8,
    candidateWallLimitSub: 6,
  });

  const [customGamesPerSide, setCustomGamesPerSide] = useState<number>(1);
  const [customMaxPlies, setCustomMaxPlies] = useState<number>(80);
  const [customSeed, setCustomSeed] = useState<number>(42);

  const cancelFlagRef = useRef<boolean>(false);

  // Helper to build options based on selected preset
  const buildTournamentOptions = (): TournamentOptions => {
    cancelFlagRef.current = false;

    if (selectedPreset === 'standard') {
      return {
        baseSeed: 12345,
        maxPliesPerGame: 80,
        pairings: [
          {
            label: 'Alpha-Beta (d=2) vs Minimax (d=2)',
            configA: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
            configB: { algorithm: 'minimax', strategy: 'minimax', depth: 2, heuristicId: 'H0' },
            gamesPerSide: 1, // 2 games
          },
          {
            label: 'Alpha-Beta (d=2) vs Greedy (H0)',
            configA: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
            configB: { algorithm: 'greedy', strategy: 'greedy', depth: 1, heuristicId: 'H0' },
            gamesPerSide: 1, // 2 games
          },
          {
            label: 'Minimax (d=2) vs Greedy (H0)',
            configA: { algorithm: 'minimax', strategy: 'minimax', depth: 2, heuristicId: 'H0' },
            configB: { algorithm: 'greedy', strategy: 'greedy', depth: 1, heuristicId: 'H0' },
            gamesPerSide: 1, // 2 games
          },
        ],
      };
    }

    if (selectedPreset === 'heuristic-ablation') {
      return {
        baseSeed: 9876,
        maxPliesPerGame: 70,
        pairings: [
          {
            label: 'H0 (Baseline) vs H1 (Pure Distance)',
            configA: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
            configB: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H1' },
            gamesPerSide: 1,
          },
          {
            label: 'H0 (Baseline) vs H2 (Wall Aware)',
            configA: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
            configB: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H2' },
            gamesPerSide: 1,
          },
          {
            label: 'H0 (Baseline) vs H3 (Strategic Composite)',
            configA: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
            configB: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H3' },
            gamesPerSide: 1,
          },
        ],
      };
    }

    if (selectedPreset === 'mcts-vs-alphabeta') {
      return {
        baseSeed: 54321,
        maxPliesPerGame: 75,
        pairings: [
          {
            label: 'MCTS (100 iters) vs Alpha-Beta (d=2, H0)',
            configA: {
              algorithm: 'mcts',
              strategy: 'mcts',
              depth: 1,
              mctsIterations: 100,
              mctsRolloutPlyCap: 15,
            },
            configB: {
              algorithm: 'alpha-beta',
              strategy: 'alpha-beta',
              depth: 2,
              heuristicId: 'H0',
            },
            gamesPerSide: 2, // 4 games with side rotation
          },
        ],
      };
    }

    if (selectedPreset === 'mcts-budget') {
      return {
        baseSeed: 11223,
        maxPliesPerGame: 75,
        pairings: [
          {
            label: 'MCTS (50 iters) vs MCTS (150 iters)',
            configA: {
              algorithm: 'mcts',
              strategy: 'mcts',
              depth: 1,
              mctsIterations: 50,
              mctsRolloutPlyCap: 12,
            },
            configB: {
              algorithm: 'mcts',
              strategy: 'mcts',
              depth: 1,
              mctsIterations: 150,
              mctsRolloutPlyCap: 15,
            },
            gamesPerSide: 2, // 4 games with side rotation
          },
        ],
      };
    }

    // Custom
    return {
      baseSeed: customSeed,
      maxPliesPerGame: customMaxPlies,
      pairings: [
        {
          label: `${customConfigA.algorithm ?? customConfigA.strategy} vs ${customConfigB.algorithm ?? customConfigB.strategy}`,
          configA: customConfigA,
          configB: customConfigB,
          gamesPerSide: customGamesPerSide,
        },
      ],
    };
  };

  const handleStartTournament = async () => {
    setIsRunning(true);
    cancelFlagRef.current = false;
    const opts = buildTournamentOptions();

    // Count total planned games
    let expectedTotal = 0;
    for (const p of opts.pairings) {
      expectedTotal += p.gamesPerSide * 2;
    }

    setProgress({ completed: 0, total: expectedTotal });
    setStatusText(`Starting tournament (${expectedTotal} games scheduled)...`);

    try {
      const finalReport = await runTournament({
        ...opts,
        isCancelled: () => cancelFlagRef.current,
        onProgress: (completed, total, latestGame?: TournamentGameResult) => {
          setProgress({ completed, total });
          if (latestGame) {
            const winnerText =
              latestGame.winner === null
                ? 'Draw'
                : latestGame.winner === 'P1'
                ? `P1 (${latestGame.p1Config.algorithm ?? latestGame.p1Config.strategy})`
                : `P2 (${latestGame.p2Config.algorithm ?? latestGame.p2Config.strategy})`;
            setStatusText(
              `Completed game ${completed}/${total} — Winner: ${winnerText} in ${latestGame.totalPlies} plies`
            );
          }
        },
      });

      setReport(finalReport);
      setStatusText(
        finalReport.wasCancelled
          ? `Tournament cancelled after ${finalReport.completedGames} games.`
          : `Tournament completed successfully! (${finalReport.completedGames}/${finalReport.totalGames} games)`
      );
    } catch (err) {
      setStatusText(
        `Tournament error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopTournament = () => {
    cancelFlagRef.current = true;
    setStatusText('Stopping tournament... finishing current move.');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const jsonStr = exportTournamentToJson(report);
    downloadFile(jsonStr, `quoridor_tournament_${Date.now()}.json`, 'application/json');
  };

  const handleDownloadCsv = () => {
    if (!report) return;
    const csvStr = exportTournamentToCsv(report);
    downloadFile(csvStr, `quoridor_tournament_${Date.now()}.csv`, 'text/csv');
  };

  // Compute aggregate stats across all completed games
  let totalP1Wins = 0;
  let totalP2Wins = 0;
  let totalDraws = 0;
  let totalPliesSum = 0;

  if (report) {
    for (const g of report.games) {
      if (g.winner === 'P1') totalP1Wins++;
      else if (g.winner === 'P2') totalP2Wins++;
      else totalDraws++;
      totalPliesSum += g.totalPlies;
    }
  }

  const completedGamesCount = report ? report.completedGames : 0;
  const p1WinRate = completedGamesCount > 0 ? ((totalP1Wins / completedGamesCount) * 100).toFixed(1) : '0';
  const p2WinRate = completedGamesCount > 0 ? ((totalP2Wins / completedGamesCount) * 100).toFixed(1) : '0';
  const avgPlies = completedGamesCount > 0 ? (totalPliesSum / completedGamesCount).toFixed(1) : '0';

  const percentProgress =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="panel-container" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="panel-card">
        <h2>Automated Tournament & Benchmark Runner</h2>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 16 }}>
          Run reproducible round-robin or head-to-head matches between AI agents with side rotation,
          deterministic PRNG seeds, and full decision telemetry.
        </p>

        {/* Preset Selector */}
        <div className="tournament-setup">
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
              Select Experiment Preset:
            </label>
            <div className="tournament-presets">
              <button
                className={`btn ${selectedPreset === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPreset('standard')}
                disabled={isRunning}
              >
                Standard Benchmark (6 Games)
              </button>
              <button
                className={`btn ${selectedPreset === 'heuristic-ablation' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPreset('heuristic-ablation')}
                disabled={isRunning}
              >
                Heuristic Ablation (6 Games)
              </button>
              <button
                className={`btn ${selectedPreset === 'mcts-vs-alphabeta' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPreset('mcts-vs-alphabeta')}
                disabled={isRunning}
              >
                MCTS vs Alpha-Beta (4 Games)
              </button>
              <button
                className={`btn ${selectedPreset === 'mcts-budget' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPreset('mcts-budget')}
                disabled={isRunning}
              >
                MCTS Budget Comparison (4 Games)
              </button>
              <button
                className={`btn ${selectedPreset === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPreset('custom')}
                disabled={isRunning}
              >
                Custom Configuration
              </button>
            </div>
          </div>

          {/* Custom Configuration Panel */}
          {selectedPreset === 'custom' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                padding: 14,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <h4>Config A</h4>
                <div className="config-field">
                  <label>Algorithm</label>
                  <select
                    value={customConfigA.algorithm ?? customConfigA.strategy}
                    onChange={(e) =>
                      setCustomConfigA({
                        ...customConfigA,
                        algorithm: e.target.value as AgentAlgorithm,
                        strategy: e.target.value as AgentAlgorithm,
                      })
                    }
                    disabled={isRunning}
                  >
                    <option value="alpha-beta">Alpha-Beta</option>
                    <option value="minimax">Minimax</option>
                    <option value="greedy">Greedy</option>
                    <option value="mcts">MCTS</option>
                  </select>
                </div>
                <div className="config-field">
                  <label>Heuristic</label>
                  <select
                    value={customConfigA.heuristicId ?? 'H0'}
                    onChange={(e) =>
                      setCustomConfigA({
                        ...customConfigA,
                        heuristicId: e.target.value as HeuristicPresetId,
                      })
                    }
                    disabled={isRunning}
                  >
                    <option value="H0">H0: Baseline</option>
                    <option value="H1">H1: Distance</option>
                    <option value="H2">H2: Wall Aware</option>
                    <option value="H3">H3: Composite</option>
                  </select>
                </div>
                {customConfigA.algorithm === 'mcts' ? (
                  <div className="config-field">
                    <label>MCTS Iterations: {customConfigA.mctsIterations ?? 80}</label>
                    <input
                      type="range"
                      min="20"
                      max="250"
                      step="10"
                      value={customConfigA.mctsIterations ?? 80}
                      onChange={(e) =>
                        setCustomConfigA({
                          ...customConfigA,
                          mctsIterations: parseInt(e.target.value, 10),
                        })
                      }
                      disabled={isRunning}
                    />
                  </div>
                ) : (
                  <div className="config-field">
                    <label>Depth: {customConfigA.depth ?? 2}</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={customConfigA.depth ?? 2}
                      onChange={(e) =>
                        setCustomConfigA({
                          ...customConfigA,
                          depth: parseInt(e.target.value, 10),
                        })
                      }
                      disabled={isRunning}
                    />
                  </div>
                )}
              </div>

              <div>
                <h4>Config B</h4>
                <div className="config-field">
                  <label>Algorithm</label>
                  <select
                    value={customConfigB.algorithm ?? customConfigB.strategy}
                    onChange={(e) =>
                      setCustomConfigB({
                        ...customConfigB,
                        algorithm: e.target.value as AgentAlgorithm,
                        strategy: e.target.value as AgentAlgorithm,
                      })
                    }
                    disabled={isRunning}
                  >
                    <option value="alpha-beta">Alpha-Beta</option>
                    <option value="minimax">Minimax</option>
                    <option value="greedy">Greedy</option>
                    <option value="mcts">MCTS</option>
                  </select>
                </div>
                <div className="config-field">
                  <label>Heuristic</label>
                  <select
                    value={customConfigB.heuristicId ?? 'H0'}
                    onChange={(e) =>
                      setCustomConfigB({
                        ...customConfigB,
                        heuristicId: e.target.value as HeuristicPresetId,
                      })
                    }
                    disabled={isRunning}
                  >
                    <option value="H0">H0: Baseline</option>
                    <option value="H1">H1: Distance</option>
                    <option value="H2">H2: Wall Aware</option>
                    <option value="H3">H3: Composite</option>
                  </select>
                </div>
                {customConfigB.algorithm === 'mcts' ? (
                  <div className="config-field">
                    <label>MCTS Iterations: {customConfigB.mctsIterations ?? 80}</label>
                    <input
                      type="range"
                      min="20"
                      max="250"
                      step="10"
                      value={customConfigB.mctsIterations ?? 80}
                      onChange={(e) =>
                        setCustomConfigB({
                          ...customConfigB,
                          mctsIterations: parseInt(e.target.value, 10),
                        })
                      }
                      disabled={isRunning}
                    />
                  </div>
                ) : (
                  <div className="config-field">
                    <label>Depth: {customConfigB.depth ?? 2}</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      value={customConfigB.depth ?? 2}
                      onChange={(e) =>
                        setCustomConfigB({
                          ...customConfigB,
                          depth: parseInt(e.target.value, 10),
                        })
                      }
                      disabled={isRunning}
                    />
                  </div>
                )}
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 16 }}>
                <div className="config-field" style={{ flex: 1 }}>
                  <label>Games per side (x2 for rotation): {customGamesPerSide}</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={customGamesPerSide}
                    onChange={(e) => setCustomGamesPerSide(parseInt(e.target.value, 10) || 1)}
                    disabled={isRunning}
                  />
                </div>
                <div className="config-field" style={{ flex: 1 }}>
                  <label>Max Plies / Game: {customMaxPlies}</label>
                  <input
                    type="number"
                    min="30"
                    max="120"
                    value={customMaxPlies}
                    onChange={(e) => setCustomMaxPlies(parseInt(e.target.value, 10) || 80)}
                    disabled={isRunning}
                  />
                </div>
                <div className="config-field" style={{ flex: 1 }}>
                  <label>PRNG Seed: {customSeed}</label>
                  <input
                    type="number"
                    value={customSeed}
                    onChange={(e) => setCustomSeed(parseInt(e.target.value, 10) || 42)}
                    disabled={isRunning}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tournament Action Buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleStartTournament}
              disabled={isRunning}
            >
              {isRunning ? 'Running Tournament...' : '▶ Start Tournament'}
            </button>

            {isRunning && (
              <button className="btn btn-secondary" onClick={handleStopTournament}>
                🛑 Stop / Cancel
              </button>
            )}

            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
              {statusText}
            </span>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>Progress: {progress.completed} of {progress.total} games</span>
                <span>{percentProgress}%</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${percentProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Aggregate Results Summary Cards */}
      {report && (
        <div className="panel-card" style={{ marginTop: 20 }}>
          <div className="card-header-row">
            <h3>Tournament Summary & Analytics</h3>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
              {report.completedGames} / {report.totalGames} Games Executed
            </span>
          </div>

          <div className="tournament-summary-cards">
            <div className="summary-stat-card">
              <span className="stat-label">Total Games</span>
              <span className="stat-val">{report.completedGames}</span>
            </div>
            <div className="summary-stat-card">
              <span className="stat-label">P1 (First) Wins</span>
              <span className="stat-val" style={{ color: '#38bdf8' }}>
                {totalP1Wins} ({p1WinRate}%)
              </span>
            </div>
            <div className="summary-stat-card">
              <span className="stat-label">P2 (Second) Wins</span>
              <span className="stat-val" style={{ color: '#f43f5e' }}>
                {totalP2Wins} ({p2WinRate}%)
              </span>
            </div>
            <div className="summary-stat-card">
              <span className="stat-label">Draws / Capped</span>
              <span className="stat-val" style={{ color: '#f59e0b' }}>
                {totalDraws}
              </span>
            </div>
            <div className="summary-stat-card">
              <span className="stat-label">Avg Plies / Game</span>
              <span className="stat-val" style={{ color: '#10b981' }}>
                {avgPlies}
              </span>
            </div>
          </div>

          {/* Matchups Breakdown */}
          <h4 style={{ marginTop: 16, marginBottom: 8 }}>Matchup Summary</h4>
          <div className="tournament-table-wrapper">
            <table className="tournament-table">
              <thead>
                <tr>
                  <th>Matchup Pairing</th>
                  <th>Total Games</th>
                  <th>Config A Wins</th>
                  <th>Config B Wins</th>
                  <th>Draws</th>
                  <th>A as P1 / P2</th>
                  <th>B as P1 / P2</th>
                  <th>Avg Plies</th>
                  <th>Mean Time A / B</th>
                </tr>
              </thead>
              <tbody>
                {report.matchups.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{m.matchupLabel}</strong>
                    </td>
                    <td>{m.totalGames}</td>
                    <td style={{ color: '#38bdf8', fontWeight: 600 }}>{m.winsA}</td>
                    <td style={{ color: '#f43f5e', fontWeight: 600 }}>{m.winsB}</td>
                    <td>{m.drawsOrCapped}</td>
                    <td>
                      {m.aAsP1Wins}W / {m.aAsP2Wins}W
                    </td>
                    <td>
                      {m.bAsP1Wins}W / {m.bAsP2Wins}W
                    </td>
                    <td>{m.meanPlies}</td>
                    <td>
                      {m.meanDecisionTimeA}ms / {m.meanDecisionTimeB}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Individual Games Table */}
          <h4 style={{ marginTop: 20, marginBottom: 8 }}>Game Results Log</h4>
          <div className="tournament-table-wrapper" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table className="tournament-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>P1 Agent</th>
                  <th>P2 Agent</th>
                  <th>Winner</th>
                  <th>Reason</th>
                  <th>Plies</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {report.games.map((g) => (
                  <tr key={g.gameIndex}>
                    <td>{g.gameIndex + 1}</td>
                    <td>{g.p1Config.algorithm ?? g.p1Config.strategy} ({g.p1Config.heuristicId ?? 'H0'})</td>
                    <td>{g.p2Config.algorithm ?? g.p2Config.strategy} ({g.p2Config.heuristicId ?? 'H0'})</td>
                    <td
                      style={{
                        color:
                          g.winner === 'P1'
                            ? '#38bdf8'
                            : g.winner === 'P2'
                            ? '#f43f5e'
                            : '#f59e0b',
                        fontWeight: 600,
                      }}
                    >
                      {g.winner ?? 'Draw'}
                    </td>
                    <td>{g.reason}</td>
                    <td>{g.totalPlies}</td>
                    <td>{Math.round(g.durationMs)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Download Buttons */}
          <div className="download-actions">
            <button className="btn btn-secondary" onClick={handleDownloadJson}>
              📥 Download Tournament JSON Report
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadCsv}>
              📊 Download Tournament CSV Table
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
