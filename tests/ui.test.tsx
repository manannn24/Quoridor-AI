import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../src/app/App';
import { Panel } from '../src/components/Panel';
import { createInitialState } from '../src/game/state';

describe('UI Integration & Accessibility', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders title, board with both pawns, and wall reserves', () => {
    render(<App />);

    expect(screen.getByText(/Intelligent Quoridor/i)).toBeInTheDocument();
    expect(screen.getByText('Human (You)')).toBeInTheDocument();
    expect(screen.getAllByText(/Computer \(AI\)/i).length).toBeGreaterThan(0);

    // Verify Board SVG exists with accessible region label
    expect(screen.getByRole('region', { name: /Quoridor Board/i })).toBeInTheDocument();

    // Verify pawns: YOU and AI
    expect(screen.getByText('YOU')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('allows clicking a highlighted square for human pawn move and triggers AI response', async () => {
    render(<App />);

    // From (8, 4), move up to (7, 4)
    // Find the cell button for (7, 4) -> row 8, col 5 in 1-based display
    const moveBtn = screen.getByRole('button', {
      name: /Square row 8, column 5 - Legal move destination/i,
    });
    expect(moveBtn).toBeInTheDocument();

    fireEvent.click(moveBtn);

    // AI should take turn and update decision metrics table
    await waitFor(
      () => {
        expect(screen.getByText(/Last AI Decision Metrics/i)).toBeInTheDocument();
        // Completed depth should be visible
        expect(screen.getByText(/2 ply/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('allows switching to wall placement mode and cancelling it', () => {
    render(<App />);

    const hWallBtn = screen.getByRole('button', { name: /Horizontal Wall/i });
    fireEvent.click(hWallBtn);

    // Cancel button should appear
    const cancelBtn = screen.getByRole('button', { name: /Cancel Placement/i });
    expect(cancelBtn).toBeInTheDocument();

    // Clicking cancel reverts to pawn mode
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole('button', { name: /Cancel Placement/i })).not.toBeInTheDocument();
  });

  it('New Game resets the board, turn, and metrics', async () => {
    render(<App />);

    // Perform a move first
    const moveBtn = screen.getByRole('button', {
      name: /Square row 8, column 5 - Legal move destination/i,
    });
    fireEvent.click(moveBtn);

    // Wait for AI response
    await waitFor(() => {
      expect(screen.queryByText(/No computer decision made yet/i)).not.toBeInTheDocument();
    });

    // Click New Game
    const newGameBtn = screen.getByRole('button', { name: /New Game/i });
    fireEvent.click(newGameBtn);

    // Metrics should be cleared
    expect(screen.getByText(/No computer decision made yet/i)).toBeInTheDocument();
  });

  it('displays winner state when terminal victory is reached', () => {
    const state = createInitialState();
    state.winner = 'P1';

    render(
      <Panel
        gameState={state}
        aiConfig={{ strategy: 'alpha-beta', depth: 2 }}
        onUpdateAiConfig={() => {}}
        wallMode="none"
        onSetWallMode={() => {}}
        isAiThinking={false}
        lastAiMetrics={null}
        errorMessage={null}
        canUndo={false}
        onNewGame={() => {}}
        onUndo={() => {}}
      />
    );

    expect(screen.getByText(/Victory! You have reached row 0/i)).toBeInTheDocument();
  });

  it('displays AI thinking state and blocks action', () => {
    const state = createInitialState();

    render(
      <Panel
        gameState={state}
        aiConfig={{ strategy: 'alpha-beta', depth: 2 }}
        onUpdateAiConfig={() => {}}
        wallMode="none"
        onSetWallMode={() => {}}
        isAiThinking={true}
        lastAiMetrics={null}
        errorMessage={null}
        canUndo={false}
        onNewGame={() => {}}
        onUndo={() => {}}
      />
    );

    expect(screen.getByText(/Computer is thinking/i)).toBeInTheDocument();
    const movePawnBtn = screen.getByRole('button', { name: /Move Pawn/i });
    expect(movePawnBtn).toBeDisabled();
  });
});
