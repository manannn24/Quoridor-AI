import { Action } from '../game/types';

export type AIStrategy = 'greedy' | 'minimax' | 'alpha-beta';

export interface AIDecisionMetrics {
  strategy: AIStrategy;
  requestedDepth: number;
  completedDepth: number;
  nodesVisited: number;
  leavesEvaluated: number;
  cutoffs: number;
  elapsedMs: number;
  score: number;
  selectedAction: Action | null;
}

export interface AgentConfig {
  strategy: AIStrategy;
  depth: number; // 1..3 plies
  candidateWallLimitRoot?: number;
  candidateWallLimitSub?: number;
}
