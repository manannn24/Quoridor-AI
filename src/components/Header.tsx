import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <h1>
        <span>Intelligent Quoridor</span>
      </h1>
      <p className="subtitle">
        Human vs. Computer board game showcasing BFS & A* pathfinding, heuristic evaluation,
        Minimax lookahead, and Alpha-Beta adversarial search pruning.
      </p>
    </header>
  );
};
