import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/app/App';
import { ArenaView } from '../src/components/ArenaView';
import { TournamentView } from '../src/components/TournamentView';
import {
  runTournament,
  exportTournamentToJson,
  exportTournamentToCsv,
  TournamentReport,
} from '../src/arena/tournamentRunner';

describe('Experimentation Platform: Navigation & Views', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders exactly three core mode tabs in App, asserts Heuristic Lab is absent, and switches between retained views', () => {
    render(<App />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);

    const humanTab = screen.getByRole('tab', { name: /Human vs AI/i });
    const arenaTab = screen.getByRole('tab', { name: /AI vs AI Arena/i });
    const tournamentTab = screen.getByRole('tab', { name: /Tournaments/i });
    const heuristicTab = screen.queryByRole('tab', { name: /Heuristic/i });

    expect(humanTab).toBeInTheDocument();
    expect(arenaTab).toBeInTheDocument();
    expect(tournamentTab).toBeInTheDocument();
    expect(heuristicTab).not.toBeInTheDocument();

    // Default view is Human vs AI
    expect(screen.getByText('Human (You)')).toBeInTheDocument();

    // Switch to Arena
    fireEvent.click(arenaTab);
    expect(screen.getByText(/Player 1 \(Blue\) Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Player 2 \(Red\) Configuration/i)).toBeInTheDocument();

    // Switch to Tournaments
    fireEvent.click(tournamentTab);
    expect(screen.getByText(/Automated Tournament & Benchmark Runner/i)).toBeInTheDocument();

    // Switch back to Human vs AI
    fireEvent.click(humanTab);
    expect(screen.getByText('Human (You)')).toBeInTheDocument();
  });

  it('ArenaView allows stepping a move, configuring heuristic presets, and records history entry', async () => {
    render(<ArenaView />);

    expect(screen.getByText(/Ply 1/i)).toBeInTheDocument();

    // Verify heuristic selector is present for agent configuration
    const p1HeuristicSelect = screen.getByLabelText(/Heuristic Evaluation/i, { selector: '#p1-heuristic-select' });
    expect(p1HeuristicSelect).toBeInTheDocument();
    fireEvent.change(p1HeuristicSelect, { target: { value: 'H2' } });
    expect((p1HeuristicSelect as HTMLSelectElement).value).toBe('H2');

    const stepBtn = screen.getByRole('button', { name: /Step 1 Ply/i });
    expect(stepBtn).toBeInTheDocument();

    // Step 1 ply
    fireEvent.click(stepBtn);

    await waitFor(() => {
      // Turn should advance to Ply 2
      expect(screen.getByText(/Ply 2/i)).toBeInTheDocument();
      // History should have 1 item
      expect(screen.getByText(/1 Plies/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click Restart
    const restartBtn = screen.getByRole('button', { name: /Restart/i });
    fireEvent.click(restartBtn);

    expect(screen.getByText(/History is empty/i)).toBeInTheDocument();
  });

  it('TournamentView allows selecting presets and configuring custom matches', () => {
    render(<TournamentView />);

    expect(screen.getByText(/Standard Benchmark \(6 Games\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Configuration/i)).toBeInTheDocument();

    // Click Custom Configuration
    const customBtn = screen.getByRole('button', { name: /Custom Configuration/i });
    fireEvent.click(customBtn);

    expect(screen.getByText(/Config A/i)).toBeInTheDocument();
    expect(screen.getByText(/Config B/i)).toBeInTheDocument();
    expect(screen.getByText(/Games per side/i)).toBeInTheDocument();
  });

  it('runTournament executes side rotation honestly and handles early cancellation', async () => {
    const configA = { algorithm: 'greedy' as const, strategy: 'greedy' as const, depth: 1, heuristicId: 'H0' as const };
    const configB = { algorithm: 'greedy' as const, strategy: 'greedy' as const, depth: 1, heuristicId: 'H1' as const };

    const fullReport = await runTournament({
      pairings: [{ label: 'Greedy H0 vs H1', configA, configB, gamesPerSide: 1 }],
      maxPliesPerGame: 30,
      baseSeed: 123,
    });

    expect(fullReport.totalGames).toBe(2);
    expect(fullReport.completedGames).toBe(2);
    expect(fullReport.wasCancelled).toBe(false);
    expect(fullReport.games).toHaveLength(2);
    // Game 1: P1 has configA, P2 has configB
    expect(fullReport.games[0].p1Config.heuristicId).toBe('H0');
    expect(fullReport.games[0].p2Config.heuristicId).toBe('H1');
    // Game 2 (rotated): P1 has configB, P2 has configA
    expect(fullReport.games[1].p1Config.heuristicId).toBe('H1');
    expect(fullReport.games[1].p2Config.heuristicId).toBe('H0');

    // Test honest cancellation
    let gameCount = 0;
    const cancelledReport = await runTournament({
      pairings: [{ label: 'Greedy H0 vs H1', configA, configB, gamesPerSide: 2 }],
      maxPliesPerGame: 30,
      baseSeed: 123,
      onProgress: () => {
        gameCount++;
      },
      isCancelled: () => gameCount >= 1,
    });

    expect(cancelledReport.wasCancelled).toBe(true);
    expect(cancelledReport.totalGames).toBe(4);
    expect(cancelledReport.completedGames).toBe(1);
    expect(cancelledReport.games).toHaveLength(1);
  });

  it('Tournament export functions produce valid, honest JSON and CSV reports', () => {
    const mockReport: TournamentReport = {
      timestamp: '2026-10-18T00:00:00.000Z',
      totalGames: 2,
      completedGames: 2,
      wasCancelled: false,
      matchups: [
        {
          matchupLabel: 'Alpha-Beta vs Minimax',
          configA: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
          configB: { algorithm: 'minimax', strategy: 'minimax', depth: 2, heuristicId: 'H0' },
          totalGames: 2,
          winsA: 2,
          winsB: 0,
          drawsOrCapped: 0,
          aAsP1Wins: 1,
          aAsP2Wins: 1,
          bAsP1Wins: 0,
          bAsP2Wins: 0,
          meanDecisionTimeA: 1.5,
          meanDecisionTimeB: 3.2,
          meanNodesA: 120,
          meanNodesB: 450,
          meanCutoffsA: 40,
          meanCutoffsB: 0,
          meanMctsIterationsA: 0,
          meanMctsIterationsB: 0,
          meanPlies: 24,
        },
      ],
      games: [
        {
          gameIndex: 1,
          seed: 42,
          p1Config: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
          p2Config: { algorithm: 'minimax', strategy: 'minimax', depth: 2, heuristicId: 'H0' },
          winner: 'P1',
          reason: 'normal',
          totalPlies: 22,
          durationMs: 45.2,
          decisions: [],
        },
        {
          gameIndex: 2,
          seed: 43,
          p1Config: { algorithm: 'minimax', strategy: 'minimax', depth: 2, heuristicId: 'H0' },
          p2Config: { algorithm: 'alpha-beta', strategy: 'alpha-beta', depth: 2, heuristicId: 'H0' },
          winner: 'P2',
          reason: 'normal',
          totalPlies: 26,
          durationMs: 51.7,
          decisions: [],
        },
      ],
    };

    // JSON export test
    const jsonStr = exportTournamentToJson(mockReport);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.matchups).toHaveLength(1);
    expect(parsed.matchups[0].winsA).toBe(2);
    expect(parsed.matchups[0].totalGames).toBe(2);
    expect(parsed.games).toHaveLength(2);

    // CSV export test
    const csvStr = exportTournamentToCsv(mockReport);
    expect(csvStr).toContain('Matchup,TotalGames,AgentA_Algo,AgentA_Heuristic');
    expect(csvStr).toContain('"Alpha-Beta vs Minimax",2,alpha-beta,H0,2,100.0%,1,1');
    expect(csvStr).toContain('GameIndex,Seed,P1_Algo,P1_Heuristic,P2_Algo,P2_Heuristic,Winner,OutcomeReason,TotalPlies,DurationMs');
    expect(csvStr).toContain('1,42,alpha-beta,H0,minimax,H0,P1,normal,22,45.2');
  });
});
