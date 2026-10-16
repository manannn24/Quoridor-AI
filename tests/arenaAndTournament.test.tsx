import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/app/App';
import { ArenaView } from '../src/components/ArenaView';
import { HeuristicLabView } from '../src/components/HeuristicLabView';
import { TournamentView } from '../src/components/TournamentView';

describe('Experimentation Platform: Navigation & Views', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders all four mode tabs in App and switches between them', () => {
    render(<App />);

    const humanTab = screen.getByRole('tab', { name: /Human vs AI/i });
    const arenaTab = screen.getByRole('tab', { name: /AI vs AI Arena/i });
    const tournamentTab = screen.getByRole('tab', { name: /Tournaments & Experiments/i });
    const heuristicTab = screen.getByRole('tab', { name: /Heuristic Lab/i });

    expect(humanTab).toBeInTheDocument();
    expect(arenaTab).toBeInTheDocument();
    expect(tournamentTab).toBeInTheDocument();
    expect(heuristicTab).toBeInTheDocument();

    // Default view is Human vs AI
    expect(screen.getByText('Human (You)')).toBeInTheDocument();

    // Switch to Arena
    fireEvent.click(arenaTab);
    expect(screen.getByText(/Player 1 \(Blue\) Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Player 2 \(Red\) Configuration/i)).toBeInTheDocument();

    // Switch to Tournaments
    fireEvent.click(tournamentTab);
    expect(screen.getByText(/Automated Tournament & Benchmark Runner/i)).toBeInTheDocument();

    // Switch to Heuristic Lab
    fireEvent.click(heuristicTab);
    expect(screen.getByText(/Modular Heuristic Laboratory/i)).toBeInTheDocument();
  });

  it('ArenaView allows stepping a move and records history entry', async () => {
    render(<ArenaView />);

    expect(screen.getByText(/Ply 1/i)).toBeInTheDocument();
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

  it('HeuristicLabView switches presets and updates weights display', () => {
    render(<HeuristicLabView />);

    expect(screen.getByText(/Live Heuristic Decomposition/i)).toBeInTheDocument();
    expect(screen.getByText(/H0 — Baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/H1 — Distance Only/i)).toBeInTheDocument();

    // Click H1 card
    const h1Card = screen.getByText(/H1 — Distance Only/i);
    fireEvent.click(h1Card);

    // Wall weight in H1 is 0
    expect(screen.getByText(/Shortest Path Weight/i)).toBeInTheDocument();
    expect(screen.getByText(/Wall Reserve Weight/i)).toBeInTheDocument();
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
});
