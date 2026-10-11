import fs from 'fs';
import path from 'path';
import { createInitialState } from '../src/game/state';
import { applyAction } from '../src/game/actions';
import { chooseAIAction } from '../src/ai/minimax';
import { AgentConfig, AIDecisionMetrics } from '../src/ai/types';
import { GameState, Player } from '../src/game/types';

interface BenchmarkOptions {
  gamesPerSide: number;
  depth: number;
  seed: number;
  outputPath: string;
}

interface MatchupStats {
  matchupName: string;
  totalGames: number;
  agent1: {
    config: AgentConfig;
    wins: number;
    decisionTimes: number[];
    nodesVisited: number[];
    leavesEvaluated: number[];
    cutoffs: number[];
  };
  agent2: {
    config: AgentConfig;
    wins: number;
    decisionTimes: number[];
    nodesVisited: number[];
    leavesEvaluated: number[];
    cutoffs: number[];
  };
  draws: number;
  gameLengths: number[];
}

function parseArgs(): BenchmarkOptions {
  const args = process.argv.slice(2);
  let gamesPerSide = 1; // Default 1 per side -> 2 games per pairing for fast smoke runs
  let depth = 2;
  let seed = 42;
  let outputPath = path.resolve('reports', 'benchmark_results.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--games' && args[i + 1]) {
      gamesPerSide = Math.max(1, parseInt(args[i + 1], 10));
      i++;
    } else if (args[i] === '--depth' && args[i + 1]) {
      depth = Math.max(1, parseInt(args[i + 1], 10));
      i++;
    } else if (args[i] === '--seed' && args[i + 1]) {
      seed = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = path.resolve(args[i + 1]);
      i++;
    }
  }

  return { gamesPerSide, depth, seed, outputPath };
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function playGame(
  agentP1: AgentConfig,
  agentP2: AgentConfig,
  maxPlies = 100
): {
  winner: Player | null;
  plies: number;
  metricsP1: AIDecisionMetrics[];
  metricsP2: AIDecisionMetrics[];
} {
  let state: GameState = createInitialState();
  const metricsP1: AIDecisionMetrics[] = [];
  const metricsP2: AIDecisionMetrics[] = [];

  let plies = 0;
  while (state.winner === null && plies < maxPlies) {
    plies++;
    const active = state.activePlayer;
    const config = active === 'P1' ? agentP1 : agentP2;

    const decision = chooseAIAction(state, config);
    if (active === 'P1') {
      metricsP1.push(decision);
    } else {
      metricsP2.push(decision);
    }

    if (!decision.selectedAction) {
      break;
    }

    const res = applyAction(state, decision.selectedAction);
    if (!res.success) {
      console.error(`Benchmark illegal action attempt by ${active}:`, res.error);
      break;
    }
    state = res.state;
  }

  return {
    winner: state.winner,
    plies,
    metricsP1,
    metricsP2,
  };
}

function runMatchup(
  agent1Config: AgentConfig,
  agent2Config: AgentConfig,
  gamesPerSide: number
): MatchupStats {
  const matchupName = `${agent1Config.strategy} (d${agent1Config.depth}) vs ${agent2Config.strategy} (d${agent2Config.depth})`;
  console.log(`\n--- Running Matchup: ${matchupName} ---`);

  const stats: MatchupStats = {
    matchupName,
    totalGames: gamesPerSide * 2,
    agent1: {
      config: agent1Config,
      wins: 0,
      decisionTimes: [],
      nodesVisited: [],
      leavesEvaluated: [],
      cutoffs: [],
    },
    agent2: {
      config: agent2Config,
      wins: 0,
      decisionTimes: [],
      nodesVisited: [],
      leavesEvaluated: [],
      cutoffs: [],
    },
    draws: 0,
    gameLengths: [],
  };

  // Side rotation 1: Agent 1 is P1, Agent 2 is P2
  for (let g = 0; g < gamesPerSide; g++) {
    process.stdout.write(`  Game ${g + 1}/${gamesPerSide * 2} (${agent1Config.strategy} as P1)... `);
    const start = performance.now();
    const result = playGame(agent1Config, agent2Config);
    const duration = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`Winner: ${result.winner ?? 'Draw'} in ${result.plies} plies (${duration}s)`);

    stats.gameLengths.push(result.plies);
    if (result.winner === 'P1') stats.agent1.wins++;
    else if (result.winner === 'P2') stats.agent2.wins++;
    else stats.draws++;

    for (const m of result.metricsP1) {
      stats.agent1.decisionTimes.push(m.elapsedMs);
      stats.agent1.nodesVisited.push(m.nodesVisited);
      stats.agent1.leavesEvaluated.push(m.leavesEvaluated);
      stats.agent1.cutoffs.push(m.cutoffs);
    }
    for (const m of result.metricsP2) {
      stats.agent2.decisionTimes.push(m.elapsedMs);
      stats.agent2.nodesVisited.push(m.nodesVisited);
      stats.agent2.leavesEvaluated.push(m.leavesEvaluated);
      stats.agent2.cutoffs.push(m.cutoffs);
    }
  }

  // Side rotation 2: Agent 2 is P1, Agent 1 is P2
  for (let g = 0; g < gamesPerSide; g++) {
    const gameNum = gamesPerSide + g + 1;
    process.stdout.write(`  Game ${gameNum}/${gamesPerSide * 2} (${agent2Config.strategy} as P1)... `);
    const start = performance.now();
    const result = playGame(agent2Config, agent1Config);
    const duration = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`Winner: ${result.winner ?? 'Draw'} in ${result.plies} plies (${duration}s)`);

    stats.gameLengths.push(result.plies);
    if (result.winner === 'P1') stats.agent2.wins++;
    else if (result.winner === 'P2') stats.agent1.wins++;
    else stats.draws++;

    for (const m of result.metricsP1) {
      stats.agent2.decisionTimes.push(m.elapsedMs);
      stats.agent2.nodesVisited.push(m.nodesVisited);
      stats.agent2.leavesEvaluated.push(m.leavesEvaluated);
      stats.agent2.cutoffs.push(m.cutoffs);
    }
    for (const m of result.metricsP2) {
      stats.agent1.decisionTimes.push(m.elapsedMs);
      stats.agent1.nodesVisited.push(m.nodesVisited);
      stats.agent1.leavesEvaluated.push(m.leavesEvaluated);
      stats.agent1.cutoffs.push(m.cutoffs);
    }
  }

  return stats;
}

export function runBenchmark() {
  const options = parseArgs();
  console.log('=== Quoridor AI Benchmark Suite ===');
  console.log(`Config: ${options.gamesPerSide * 2} games per matchup, Depth: ${options.depth}, Seed: ${options.seed}`);

  const greedyConfig: AgentConfig = { strategy: 'greedy', depth: 1 };
  const minimaxConfig: AgentConfig = {
    strategy: 'minimax',
    depth: options.depth,
    candidateWallLimitRoot: 6,
    candidateWallLimitSub: 4,
  };
  const alphaBetaConfig: AgentConfig = {
    strategy: 'alpha-beta',
    depth: options.depth,
    candidateWallLimitRoot: 6,
    candidateWallLimitSub: 4,
  };

  const matchups = [
    runMatchup(greedyConfig, minimaxConfig, options.gamesPerSide),
    runMatchup(greedyConfig, alphaBetaConfig, options.gamesPerSide),
    runMatchup(minimaxConfig, alphaBetaConfig, options.gamesPerSide),
  ];

  const summary = matchups.map((m) => ({
    matchup: m.matchupName,
    totalGames: m.totalGames,
    agent1: {
      strategy: m.agent1.config.strategy,
      depth: m.agent1.config.depth,
      wins: m.agent1.wins,
      winRate: ((m.agent1.wins / m.totalGames) * 100).toFixed(1) + '%',
      meanDecisionTimeMs: parseFloat(mean(m.agent1.decisionTimes).toFixed(2)),
      meanNodesVisited: Math.round(mean(m.agent1.nodesVisited)),
      meanCutoffs: parseFloat(mean(m.agent1.cutoffs).toFixed(2)),
    },
    agent2: {
      strategy: m.agent2.config.strategy,
      depth: m.agent2.config.depth,
      wins: m.agent2.wins,
      winRate: ((m.agent2.wins / m.totalGames) * 100).toFixed(1) + '%',
      meanDecisionTimeMs: parseFloat(mean(m.agent2.decisionTimes).toFixed(2)),
      meanNodesVisited: Math.round(mean(m.agent2.nodesVisited)),
      meanCutoffs: parseFloat(mean(m.agent2.cutoffs).toFixed(2)),
    },
    draws: m.draws,
    meanGameLengthPlies: parseFloat(mean(m.gameLengths).toFixed(1)),
  }));

  console.log('\n=== Benchmark Summary Table ===');
  console.table(
    summary.map((s) => ({
      Matchup: s.matchup,
      'A1 Wins': `${s.agent1.strategy}: ${s.agent1.wins}`,
      'A2 Wins': `${s.agent2.strategy}: ${s.agent2.wins}`,
      'A1 Mean Time (ms)': s.agent1.meanDecisionTimeMs,
      'A2 Mean Time (ms)': s.agent2.meanDecisionTimeMs,
      'A1 Nodes': s.agent1.meanNodesVisited,
      'A2 Nodes': s.agent2.meanNodesVisited,
      'A2 Cutoffs': s.agent2.meanCutoffs,
      'Avg Plies': s.meanGameLengthPlies,
    }))
  );

  const reportDir = path.dirname(options.outputPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const outputData = {
    timestamp: new Date().toISOString(),
    options,
    matchups: summary,
  };

  fs.writeFileSync(options.outputPath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`\nReport written to: ${options.outputPath}`);

  // Also write CSV summary
  const csvPath = path.join(reportDir, 'benchmark_summary.csv');
  const csvRows = [
    'Matchup,Agent1,A1_Wins,A1_WinRate,A1_MeanTimeMs,A1_MeanNodes,Agent2,A2_Wins,A2_WinRate,A2_MeanTimeMs,A2_MeanNodes,A2_MeanCutoffs,AvgPlies',
    ...summary.map(
      (s) =>
        `"${s.matchup}",${s.agent1.strategy},${s.agent1.wins},${s.agent1.winRate},${s.agent1.meanDecisionTimeMs},${s.agent1.meanNodesVisited},${s.agent2.strategy},${s.agent2.wins},${s.agent2.winRate},${s.agent2.meanDecisionTimeMs},${s.agent2.meanNodesVisited},${s.agent2.meanCutoffs},${s.meanGameLengthPlies}`
    ),
  ];
  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');
  console.log(`CSV report written to: ${csvPath}\n`);
}

runBenchmark();

