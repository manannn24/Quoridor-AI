import { Action } from '../game/types';

export type AgentAlgorithm = 'greedy' | 'minimax' | 'alpha-beta' | 'mcts';
// Backward compatibility alias:
export type AIStrategy = AgentAlgorithm;

export type HeuristicPresetId = 'H0' | 'H1' | 'H2' | 'H3' | 'custom';

export interface HeuristicWeights {
  pathWeight: number;         // weight for shortest-path difference (oppDist - ownDist)
  wallWeight: number;         // weight for wall reserve difference (ownWalls - oppWalls)
  disruptionWeight?: number;  // weight for disrupting opponent path (H3)
  progressWeight?: number;    // weight for forward pawn goal advancement (H3)
  cyclePenalty?: number;      // penalty for repeating recent state signatures (default 0)
}

export interface FeatureBreakdown {
  ownDist: number;
  oppDist: number;
  pathAdvantage: number;
  weightedPathScore: number;
  ownWalls: number;
  oppWalls: number;
  wallAdvantage: number;
  weightedWallScore: number;
  disruptionBonus?: number;
  progressBonus?: number;
  cyclePenalty?: number;
  totalScore: number;
}

export interface AgentConfig {
  algorithm?: AgentAlgorithm;
  // Backward compatibility alias:
  strategy?: AgentAlgorithm;

  heuristicId?: HeuristicPresetId;
  customWeights?: Partial<HeuristicWeights>;

  // Minimax / Alpha-Beta parameters:
  depth: number;                // 1..4 plies (default 2)
  useIterativeDeepening?: boolean;
  timeBudgetMs?: number;        // computation wall-clock cap in ms (e.g. 50..5000)

  // MCTS parameters:
  mctsIterations?: number;      // e.g. 100, 250, 500, 1000 (default 300)
  mctsExplorationParam?: number;// UCT C constant (default 1.414)
  mctsRolloutPlyCap?: number;   // max plies per rollout (default 30)

  // Branching factor control:
  candidateWallLimitRoot?: number;
  candidateWallLimitSub?: number;

  // Deterministic seed for reproducible randomized behaviour (MCTS, tie-breaks):
  seed?: number;
}

export interface MctsRootActionStat {
  action: Action;
  visits: number;
  winRate: number;
  scoreAvg: number;
}

export interface AgentDecisionResult {
  selectedAction: Action | null;
  algorithm: AgentAlgorithm;
  strategy: AIStrategy; // backward compatibility
  heuristicId: string;
  requestedDepth: number;
  completedDepth: number;
  elapsedMs: number;
  score: number;

  // Tree search metrics:
  nodesVisited: number;
  leavesEvaluated: number;
  cutoffs: number;

  // MCTS metrics:
  mctsIterations?: number;
  mctsRollouts?: number;
  rootActionStats?: MctsRootActionStat[];

  // Diagnostics:
  featureBreakdown?: FeatureBreakdown;
  diagnosticNote?: string;
  timedOut?: boolean;
  error?: string;
}

// Backward compatibility alias:
export type AIDecisionMetrics = AgentDecisionResult;

/**
 * Validates and safely clamps an AgentConfig to guarantee safe execution.
 */
export function validateAndClampConfig(
  input: Partial<AgentConfig> | null | undefined
): AgentConfig {
  const rawAlgorithm = input?.algorithm ?? input?.strategy ?? 'alpha-beta';
  const algorithm: AgentAlgorithm =
    rawAlgorithm === 'greedy' ||
    rawAlgorithm === 'minimax' ||
    rawAlgorithm === 'alpha-beta' ||
    rawAlgorithm === 'mcts'
      ? rawAlgorithm
      : 'alpha-beta';

  const heuristicId: HeuristicPresetId =
    input?.heuristicId === 'H0' ||
    input?.heuristicId === 'H1' ||
    input?.heuristicId === 'H2' ||
    input?.heuristicId === 'H3' ||
    input?.heuristicId === 'custom'
      ? input.heuristicId
      : 'H0';

  // Depth clamped to 1..4
  const rawDepth = Number.isInteger(input?.depth) ? (input?.depth as number) : 2;
  const depth = Math.min(4, Math.max(1, rawDepth));

  // Time budget clamped to 10..10000 ms if provided
  let timeBudgetMs: number | undefined = undefined;
  if (typeof input?.timeBudgetMs === 'number' && Number.isFinite(input.timeBudgetMs)) {
    timeBudgetMs = Math.min(10000, Math.max(10, Math.floor(input.timeBudgetMs)));
  }

  // MCTS iterations clamped to 10..5000
  const rawIterations = input?.mctsIterations ?? 300;
  const mctsIterations = Math.min(5000, Math.max(10, Math.floor(rawIterations)));

  // MCTS exploration constant clamped to 0.1..10
  const rawExploration = input?.mctsExplorationParam ?? 1.414;
  const mctsExplorationParam = Math.min(10, Math.max(0.1, rawExploration));

  // MCTS rollout ply cap clamped to 5..100
  const rawPlyCap = input?.mctsRolloutPlyCap ?? 30;
  const mctsRolloutPlyCap = Math.min(100, Math.max(5, Math.floor(rawPlyCap)));

  // Wall limits
  const candidateWallLimitRoot =
    typeof input?.candidateWallLimitRoot === 'number'
      ? Math.max(0, Math.min(32, Math.floor(input.candidateWallLimitRoot)))
      : 8;

  const candidateWallLimitSub =
    typeof input?.candidateWallLimitSub === 'number'
      ? Math.max(0, Math.min(24, Math.floor(input.candidateWallLimitSub)))
      : 6;

  const seed =
    typeof input?.seed === 'number' && Number.isFinite(input.seed)
      ? Math.floor(input.seed)
      : undefined;

  return {
    algorithm,
    strategy: algorithm,
    heuristicId,
    customWeights: input?.customWeights ? { ...input.customWeights } : undefined,
    depth,
    useIterativeDeepening: input?.useIterativeDeepening ?? false,
    timeBudgetMs,
    mctsIterations,
    mctsExplorationParam,
    mctsRolloutPlyCap,
    candidateWallLimitRoot,
    candidateWallLimitSub,
    seed,
  };
}
