import fs from 'fs';
import path from 'path';
import { AgentConfig } from '../src/ai/types';
import {
  runTournament,
  exportTournamentToJson,
  exportTournamentToCsv,
  TournamentOptions,
} from '../src/arena/tournamentRunner';

interface CliArgs {
  gamesPerSide: number;
  depth: number;
  seed: number;
  outputPath: string;
  preset: 'standard' | 'experiments' | 'mcts';
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let gamesPerSide = 1;
  let depth = 2;
  let seed = 42;
  let outputPath = path.resolve('reports', 'benchmark_results.json');
  let preset: 'standard' | 'experiments' | 'mcts' = 'standard';

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
    } else if (args[i] === '--preset' && args[i + 1]) {
      const p = args[i + 1].toLowerCase();
      if (p === 'experiments' || p === 'mcts' || p === 'standard') {
        preset = p;
      }
      i++;
    }
  }

  return { gamesPerSide, depth, seed, outputPath, preset };
}

export async function runBenchmark() {
  const cliArgs = parseArgs();
  console.log('=== Quoridor AI Benchmark & Tournament Suite ===');
  console.log(`Preset: ${cliArgs.preset}, Games per side: ${cliArgs.gamesPerSide}, Depth: ${cliArgs.depth}, Seed: ${cliArgs.seed}\n`);

  const greedyConfig: AgentConfig = {
    algorithm: 'greedy',
    strategy: 'greedy',
    depth: 1,
    heuristicId: 'H0',
    candidateWallLimitRoot: 6,
  };

  const minimaxConfig: AgentConfig = {
    algorithm: 'minimax',
    strategy: 'minimax',
    depth: cliArgs.depth,
    heuristicId: 'H0',
    candidateWallLimitRoot: 6,
    candidateWallLimitSub: 4,
  };

  const alphaBetaConfig: AgentConfig = {
    algorithm: 'alpha-beta',
    strategy: 'alpha-beta',
    depth: cliArgs.depth,
    heuristicId: 'H0',
    candidateWallLimitRoot: 6,
    candidateWallLimitSub: 4,
  };

  const alphaBetaH1Config: AgentConfig = {
    algorithm: 'alpha-beta',
    strategy: 'alpha-beta',
    depth: cliArgs.depth,
    heuristicId: 'H1',
    candidateWallLimitRoot: 6,
    candidateWallLimitSub: 4,
  };

  const alphaBetaH2Config: AgentConfig = {
    algorithm: 'alpha-beta',
    strategy: 'alpha-beta',
    depth: cliArgs.depth,
    heuristicId: 'H2',
    candidateWallLimitRoot: 6,
    candidateWallLimitSub: 4,
  };

  const alphaBetaH3Config: AgentConfig = {
    algorithm: 'alpha-beta',
    strategy: 'alpha-beta',
    depth: cliArgs.depth,
    heuristicId: 'H3',
    candidateWallLimitRoot: 6,
    candidateWallLimitSub: 4,
  };

  const mctsSmallConfig: AgentConfig = {
    algorithm: 'mcts',
    strategy: 'mcts',
    heuristicId: 'H0',
    depth: 1,
    mctsIterations: 50,
    mctsRolloutPlyCap: 20,
    candidateWallLimitRoot: 6,
  };

  const mctsStandardConfig: AgentConfig = {
    algorithm: 'mcts',
    strategy: 'mcts',
    heuristicId: 'H0',
    depth: 1,
    mctsIterations: 120,
    mctsRolloutPlyCap: 25,
    candidateWallLimitRoot: 6,
  };

  let pairings: TournamentOptions['pairings'] = [];

  if (cliArgs.preset === 'standard') {
    pairings = [
      {
        label: 'greedy (d1) vs minimax (d2)',
        configA: greedyConfig,
        configB: minimaxConfig,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      {
        label: 'greedy (d1) vs alpha-beta (d2)',
        configA: greedyConfig,
        configB: alphaBetaConfig,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      {
        label: 'minimax (d2) vs alpha-beta (d2)',
        configA: minimaxConfig,
        configB: alphaBetaConfig,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      // Also include MCTS and Heuristic comparison for comprehensive experiment evidence
      {
        label: 'alpha-beta (H0) vs alpha-beta (H2)',
        configA: alphaBetaConfig,
        configB: alphaBetaH2Config,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      {
        label: 'alpha-beta (d2) vs mcts (50 iters)',
        configA: alphaBetaConfig,
        configB: mctsSmallConfig,
        gamesPerSide: cliArgs.gamesPerSide,
      },
    ];
  } else if (cliArgs.preset === 'experiments') {
    pairings = [
      {
        label: 'H0 (Baseline) vs H1 (Distance-Only)',
        configA: alphaBetaConfig,
        configB: alphaBetaH1Config,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      {
        label: 'H0 (Baseline) vs H2 (Wall-Resource)',
        configA: alphaBetaConfig,
        configB: alphaBetaH2Config,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      {
        label: 'H0 (Baseline) vs H3 (Composite)',
        configA: alphaBetaConfig,
        configB: alphaBetaH3Config,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      {
        label: 'Alpha-Beta (d2) vs MCTS (120 iters)',
        configA: alphaBetaConfig,
        configB: mctsStandardConfig,
        gamesPerSide: cliArgs.gamesPerSide,
      },
    ];
  } else if (cliArgs.preset === 'mcts') {
    pairings = [
      {
        label: 'MCTS (50 iters) vs MCTS (120 iters)',
        configA: mctsSmallConfig,
        configB: mctsStandardConfig,
        gamesPerSide: cliArgs.gamesPerSide,
      },
      {
        label: 'Alpha-Beta (d2) vs MCTS (120 iters)',
        configA: alphaBetaConfig,
        configB: mctsStandardConfig,
        gamesPerSide: cliArgs.gamesPerSide,
      },
    ];
  }

  const report = await runTournament({
    pairings,
    baseSeed: cliArgs.seed,
    maxPliesPerGame: 70,
    onProgress: (completed, total, latest) => {
      if (latest) {
        const winnerStr = latest.winner ? `Winner: ${latest.winner}` : `Outcome: ${latest.reason}`;
        console.log(`[${completed}/${total}] Game #${latest.gameIndex} (${latest.p1Config.algorithm} vs ${latest.p2Config.algorithm}) -> ${winnerStr} in ${latest.totalPlies} plies (${(latest.durationMs / 1000).toFixed(2)}s)`);
      }
    },
  });

  console.log('\n=== Tournament Aggregated Summary Table ===');
  console.table(
    report.matchups.map((m) => {
      const rateA = m.totalGames > 0 ? ((m.winsA / m.totalGames) * 100).toFixed(1) + '%' : '0.0%';
      const rateB = m.totalGames > 0 ? ((m.winsB / m.totalGames) * 100).toFixed(1) + '%' : '0.0%';
      return {
        Matchup: m.matchupLabel,
        'A Wins': `${m.winsA} (${rateA})`,
        'B Wins': `${m.winsB} (${rateB})`,
        Draws: m.drawsOrCapped,
        'A Mean Time': `${m.meanDecisionTimeA} ms`,
        'B Mean Time': `${m.meanDecisionTimeB} ms`,
        'A Nodes/Iters': m.meanNodesA ?? m.meanMctsIterationsA ?? 'N/A',
        'B Nodes/Iters': m.meanNodesB ?? m.meanMctsIterationsB ?? 'N/A',
        'Avg Plies': m.meanPlies,
      };
    })
  );

  const reportDir = path.dirname(cliArgs.outputPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Export JSON
  const jsonContent = exportTournamentToJson(report);
  fs.writeFileSync(cliArgs.outputPath, jsonContent, 'utf8');
  console.log(`\nMachine-readable JSON report written to: ${cliArgs.outputPath}`);

  // Export CSV
  const csvPath = path.join(reportDir, 'benchmark_summary.csv');
  const csvContent = exportTournamentToCsv(report);
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`CSV summary report written to: ${csvPath}\n`);
}

runBenchmark();
