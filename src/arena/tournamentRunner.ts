import { GameState, Player, Action } from '../game/types';
import { createInitialState } from '../game/state';
import { applyAction } from '../game/actions';
import { chooseAIAction } from '../ai/minimax';
import { AgentConfig, AgentDecisionResult, validateAndClampConfig } from '../ai/types';
import { getStateSignature } from '../ai/cycleDetection';

export interface GameDecisionLog {
  ply: number;
  player: Player;
  action: Action;
  algorithm: string;
  heuristicId: string;
  elapsedMs: number;
  score: number;
  nodesVisited?: number;
  cutoffs?: number;
  mctsIterations?: number;
}

export type GameOutcomeReason = 'normal' | 'max_plies_capped' | 'aborted';

export interface TournamentGameResult {
  gameIndex: number;
  seed: number;
  p1Config: AgentConfig;
  p2Config: AgentConfig;
  winner: Player | null; // null if capped/draw
  reason: GameOutcomeReason;
  totalPlies: number;
  durationMs: number;
  decisions: GameDecisionLog[];
}

export interface MatchupAggregation {
  matchupLabel: string;
  configA: AgentConfig;
  configB: AgentConfig;
  totalGames: number;
  winsA: number;
  winsB: number;
  drawsOrCapped: number;
  // Side specific
  aAsP1Wins: number;
  aAsP2Wins: number;
  bAsP1Wins: number;
  bAsP2Wins: number;
  meanPlies: number;
  meanDecisionTimeA: number;
  meanDecisionTimeB: number;
  meanNodesA?: number;
  meanNodesB?: number;
  meanCutoffsA?: number;
  meanCutoffsB?: number;
  meanMctsIterationsA?: number;
  meanMctsIterationsB?: number;
}

export interface TournamentReport {
  timestamp: string;
  totalGames: number;
  completedGames: number;
  wasCancelled: boolean;
  matchups: MatchupAggregation[];
  games: TournamentGameResult[];
}

export interface TournamentOptions {
  pairings: Array<{
    label: string;
    configA: AgentConfig;
    configB: AgentConfig;
    gamesPerSide: number; // e.g. 1 means 1 with A=P1,B=P2 and 1 with B=P1,A=P2 => 2 games
  }>;
  baseSeed?: number;
  maxPliesPerGame?: number; // default 80
  onProgress?: (completed: number, total: number, latestGame?: TournamentGameResult) => void;
  isCancelled?: () => boolean;
}

/**
 * Runs a single autonomous game between two agent configurations to completion or ply cap.
 */
export function runTournamentMatch(
  p1ConfigInput: AgentConfig,
  p2ConfigInput: AgentConfig,
  seed: number,
  maxPlies: number = 80,
  gameIndex: number = 0,
  isCancelled?: () => boolean
): TournamentGameResult {
  const startTime = performance.now();
  let state: GameState = createInitialState();
  const decisions: GameDecisionLog[] = [];
  const signatures: string[] = [];

  const p1Config = validateAndClampConfig({ ...p1ConfigInput, seed: seed * 2 + 1 });
  const p2Config = validateAndClampConfig({ ...p2ConfigInput, seed: seed * 2 + 2 });

  let plies = 0;
  let reason: GameOutcomeReason = 'normal';

  while (state.winner === null && plies < maxPlies) {
    if (isCancelled && isCancelled()) {
      reason = 'aborted';
      break;
    }

    plies++;
    const active = state.activePlayer;
    const currentConfig = active === 'P1' ? p1Config : p2Config;

    const currentSig = getStateSignature(state);
    signatures.push(currentSig);

    const decision: AgentDecisionResult = chooseAIAction(state, currentConfig, {
      recentSignatures: signatures.slice(-10),
      isCancelled,
    });

    if (!decision.selectedAction) {
      reason = 'aborted';
      break;
    }

    decisions.push({
      ply: plies,
      player: active,
      action: decision.selectedAction,
      algorithm: decision.algorithm,
      heuristicId: decision.heuristicId,
      elapsedMs: decision.elapsedMs,
      score: decision.score,
      nodesVisited: decision.nodesVisited,
      cutoffs: decision.cutoffs,
      mctsIterations: decision.mctsIterations,
    });

    const res = applyAction(state, decision.selectedAction);
    if (!res.success) {
      reason = 'aborted';
      break;
    }

    state = res.state;
  }

  if (state.winner === null && reason === 'normal') {
    reason = 'max_plies_capped';
  }

  const durationMs = performance.now() - startTime;

  return {
    gameIndex,
    seed,
    p1Config,
    p2Config,
    winner: state.winner,
    reason,
    totalPlies: plies,
    durationMs,
    decisions,
  };
}

/**
 * Asynchronous tournament runner supporting progress updates, side rotation, and cancellation.
 */
export async function runTournament(
  options: TournamentOptions
): Promise<TournamentReport> {
  const baseSeed = options.baseSeed ?? 42;
  const maxPlies = options.maxPliesPerGame ?? 80;

  // Calculate total games across all pairings
  let totalGames = 0;
  for (const pairing of options.pairings) {
    totalGames += pairing.gamesPerSide * 2;
  }

  const games: TournamentGameResult[] = [];
  let globalGameIdx = 0;
  let wasCancelled = false;

  for (const pairing of options.pairings) {
    const configA = pairing.configA;
    const configB = pairing.configB;
    const count = pairing.gamesPerSide;

    // First half: A is P1, B is P2
    for (let i = 0; i < count; i++) {
      if (options.isCancelled && options.isCancelled()) {
        wasCancelled = true;
        break;
      }

      globalGameIdx++;
      const gameSeed = baseSeed + globalGameIdx * 1337;
      const result = runTournamentMatch(
        configA,
        configB,
        gameSeed,
        maxPlies,
        globalGameIdx,
        options.isCancelled
      );
      games.push(result);
      if (options.onProgress) {
        options.onProgress(games.length, totalGames, result);
      }
      // Allow browser event loop tick
      await new Promise((r) => setTimeout(r, 0));
    }

    if (wasCancelled) break;

    // Second half: B is P1, A is P2 (Side rotation)
    for (let i = 0; i < count; i++) {
      if (options.isCancelled && options.isCancelled()) {
        wasCancelled = true;
        break;
      }

      globalGameIdx++;
      const gameSeed = baseSeed + globalGameIdx * 1337;
      const result = runTournamentMatch(
        configB,
        configA,
        gameSeed,
        maxPlies,
        globalGameIdx,
        options.isCancelled
      );
      games.push(result);
      if (options.onProgress) {
        options.onProgress(games.length, totalGames, result);
      }
      // Allow browser event loop tick
      await new Promise((r) => setTimeout(r, 0));
    }

    if (wasCancelled) break;
  }

  // Aggregate results per matchup
  const matchups: MatchupAggregation[] = options.pairings.map((p) => {
    return aggregatePairingResults(p.label, p.configA, p.configB, games);
  });

  return {
    timestamp: new Date().toISOString(),
    totalGames,
    completedGames: games.length,
    wasCancelled,
    matchups,
    games,
  };
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function aggregatePairingResults(
  matchupLabel: string,
  configA: AgentConfig,
  configB: AgentConfig,
  allGames: TournamentGameResult[]
): MatchupAggregation {
  // Filter games involving this pairing
  const relevant = allGames.filter((g) => {
    const isAB =
      g.p1Config.algorithm === configA.algorithm &&
      g.p2Config.algorithm === configB.algorithm &&
      g.p1Config.heuristicId === configA.heuristicId &&
      g.p2Config.heuristicId === configB.heuristicId &&
      g.p1Config.depth === configA.depth &&
      g.p2Config.depth === configB.depth;

    const isBA =
      g.p1Config.algorithm === configB.algorithm &&
      g.p2Config.algorithm === configA.algorithm &&
      g.p1Config.heuristicId === configB.heuristicId &&
      g.p2Config.heuristicId === configA.heuristicId &&
      g.p1Config.depth === configB.depth &&
      g.p2Config.depth === configA.depth;

    return isAB || isBA;
  });

  let winsA = 0;
  let winsB = 0;
  let drawsOrCapped = 0;
  let aAsP1Wins = 0;
  let aAsP2Wins = 0;
  let bAsP1Wins = 0;
  let bAsP2Wins = 0;

  const timesA: number[] = [];
  const timesB: number[] = [];
  const nodesA: number[] = [];
  const nodesB: number[] = [];
  const cutoffsA: number[] = [];
  const cutoffsB: number[] = [];
  const mctsItersA: number[] = [];
  const mctsItersB: number[] = [];
  const pliesList: number[] = [];

  for (const g of relevant) {
    pliesList.push(g.totalPlies);

    const aIsP1 = g.p1Config.algorithm === configA.algorithm && g.p1Config.heuristicId === configA.heuristicId;

    if (g.winner === null || g.reason === 'max_plies_capped') {
      drawsOrCapped++;
    } else if (g.winner === 'P1') {
      if (aIsP1) {
        winsA++;
        aAsP1Wins++;
      } else {
        winsB++;
        bAsP1Wins++;
      }
    } else if (g.winner === 'P2') {
      if (aIsP1) {
        winsB++;
        bAsP2Wins++;
      } else {
        winsA++;
        aAsP2Wins++;
      }
    }

    // Collect decisions
    for (const d of g.decisions) {
      const isDecisionA = (d.player === 'P1' && aIsP1) || (d.player === 'P2' && !aIsP1);
      if (isDecisionA) {
        timesA.push(d.elapsedMs);
        if (d.nodesVisited !== undefined) nodesA.push(d.nodesVisited);
        if (d.cutoffs !== undefined) cutoffsA.push(d.cutoffs);
        if (d.mctsIterations !== undefined) mctsItersA.push(d.mctsIterations);
      } else {
        timesB.push(d.elapsedMs);
        if (d.nodesVisited !== undefined) nodesB.push(d.nodesVisited);
        if (d.cutoffs !== undefined) cutoffsB.push(d.cutoffs);
        if (d.mctsIterations !== undefined) mctsItersB.push(d.mctsIterations);
      }
    }
  }

  return {
    matchupLabel,
    configA,
    configB,
    totalGames: relevant.length,
    winsA,
    winsB,
    drawsOrCapped,
    aAsP1Wins,
    aAsP2Wins,
    bAsP1Wins,
    bAsP2Wins,
    meanPlies: parseFloat(mean(pliesList).toFixed(1)),
    meanDecisionTimeA: parseFloat(mean(timesA).toFixed(2)),
    meanDecisionTimeB: parseFloat(mean(timesB).toFixed(2)),
    meanNodesA: nodesA.length > 0 ? Math.round(mean(nodesA)) : undefined,
    meanNodesB: nodesB.length > 0 ? Math.round(mean(nodesB)) : undefined,
    meanCutoffsA: cutoffsA.length > 0 ? parseFloat(mean(cutoffsA).toFixed(2)) : undefined,
    meanCutoffsB: cutoffsB.length > 0 ? parseFloat(mean(cutoffsB).toFixed(2)) : undefined,
    meanMctsIterationsA: mctsItersA.length > 0 ? Math.round(mean(mctsItersA)) : undefined,
    meanMctsIterationsB: mctsItersB.length > 0 ? Math.round(mean(mctsItersB)) : undefined,
  };
}

/**
 * Serializes tournament report to machine-readable JSON.
 */
export function exportTournamentToJson(report: TournamentReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Serializes tournament report to structured CSV.
 */
export function exportTournamentToCsv(report: TournamentReport): string {
  const summaryHeader = [
    'Matchup',
    'TotalGames',
    'AgentA_Algo',
    'AgentA_Heuristic',
    'AgentA_Wins',
    'AgentA_WinRate',
    'AgentA_P1Wins',
    'AgentA_P2Wins',
    'AgentA_MeanTimeMs',
    'AgentA_MeanNodes',
    'AgentA_MeanCutoffs',
    'AgentA_MeanMctsIters',
    'AgentB_Algo',
    'AgentB_Heuristic',
    'AgentB_Wins',
    'AgentB_WinRate',
    'AgentB_P1Wins',
    'AgentB_P2Wins',
    'AgentB_MeanTimeMs',
    'AgentB_MeanNodes',
    'AgentB_MeanCutoffs',
    'AgentB_MeanMctsIters',
    'DrawsOrCapped',
    'MeanPlies',
  ];

  const rows = [summaryHeader.join(',')];

  for (const m of report.matchups) {
    const rateA = m.totalGames > 0 ? ((m.winsA / m.totalGames) * 100).toFixed(1) + '%' : '0.0%';
    const rateB = m.totalGames > 0 ? ((m.winsB / m.totalGames) * 100).toFixed(1) + '%' : '0.0%';

    const row = [
      `"${m.matchupLabel}"`,
      m.totalGames,
      m.configA.algorithm,
      m.configA.heuristicId ?? 'H0',
      m.winsA,
      rateA,
      m.aAsP1Wins,
      m.aAsP2Wins,
      m.meanDecisionTimeA,
      m.meanNodesA ?? 'N/A',
      m.meanCutoffsA ?? 'N/A',
      m.meanMctsIterationsA ?? 'N/A',
      m.configB.algorithm,
      m.configB.heuristicId ?? 'H0',
      m.winsB,
      rateB,
      m.bAsP1Wins,
      m.bAsP2Wins,
      m.meanDecisionTimeB,
      m.meanNodesB ?? 'N/A',
      m.meanCutoffsB ?? 'N/A',
      m.meanMctsIterationsB ?? 'N/A',
      m.drawsOrCapped,
      m.meanPlies,
    ];
    rows.push(row.join(','));
  }

  // Also include per-game detail section
  rows.push('');
  rows.push('--- Per Game Results ---');
  rows.push('GameIndex,Seed,P1_Algo,P1_Heuristic,P2_Algo,P2_Heuristic,Winner,OutcomeReason,TotalPlies,DurationMs');

  for (const g of report.games) {
    rows.push(
      [
        g.gameIndex,
        g.seed,
        g.p1Config.algorithm,
        g.p1Config.heuristicId ?? 'H0',
        g.p2Config.algorithm,
        g.p2Config.heuristicId ?? 'H0',
        g.winner ?? 'Draw/Capped',
        g.reason,
        g.totalPlies,
        g.durationMs.toFixed(1),
      ].join(',')
    );
  }

  return rows.join('\n');
}
