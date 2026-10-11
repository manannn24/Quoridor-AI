import React, { useState } from 'react';
import { GameState, Position, Wall, WallOrientation } from '../game/types';
import { isLegalPawnMove } from '../game/movement';
import { isWallPlacementLegal } from '../game/actions';

interface BoardProps {
  gameState: GameState;
  wallMode: 'none' | WallOrientation;
  isAiThinking: boolean;
  onCellClick: (pos: Position) => void;
  onWallClick: (wall: Wall) => void;
}

const CELL_SIZE = 48;
const GROOVE_SIZE = 12;
const STEP = CELL_SIZE + GROOVE_SIZE; // 60
const TOTAL_SIZE = 9 * CELL_SIZE + 8 * GROOVE_SIZE; // 528

export const Board: React.FC<BoardProps> = ({
  gameState,
  wallMode,
  isAiThinking,
  onCellClick,
  onWallClick,
}) => {
  const [hoveredAnchor, setHoveredAnchor] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const isHumanTurn =
    gameState.activePlayer === 'P1' &&
    gameState.winner === null &&
    !isAiThinking;

  // Compute preview legality for hovered anchor
  const hoveredWall: Wall | null =
    hoveredAnchor && wallMode !== 'none'
      ? {
          row: hoveredAnchor.row,
          col: hoveredAnchor.col,
          orientation: wallMode,
        }
      : null;

  const isHoveredWallValid =
    hoveredWall && isHumanTurn
      ? isWallPlacementLegal(gameState, hoveredWall).valid
      : false;

  return (
    <div className="board-container">
      <div className="board-goal-indicator board-goal-p1">
        <span>▲ Human (P1) Goal Line (Row 0)</span>
        <span>Goal: Reach any square here</span>
      </div>

      <svg
        className="board-svg"
        viewBox={`0 0 ${TOTAL_SIZE} ${TOTAL_SIZE}`}
        role="region"
        aria-label="Quoridor Board"
      >
        {/* Board Background */}
        <rect
          x="0"
          y="0"
          width={TOTAL_SIZE}
          height={TOTAL_SIZE}
          fill="var(--board-bg)"
          rx="8"
        />

        {/* 81 Board Cells */}
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const pos: Position = { row: r, col: c };
            const isP1 =
              gameState.p1Pos.row === r && gameState.p1Pos.col === c;
            const isP2 =
              gameState.p2Pos.row === r && gameState.p2Pos.col === c;
            const isLegalMove =
              isHumanTurn &&
              wallMode === 'none' &&
              isLegalPawnMove(gameState, 'P1', pos);

            const x = c * STEP;
            const y = r * STEP;

            return (
              <g
                key={`cell-${r}-${c}`}
                onClick={() => {
                  if (isLegalMove) onCellClick(pos);
                }}
                style={{
                  cursor: isLegalMove ? 'pointer' : 'default',
                }}
                tabIndex={isLegalMove ? 0 : -1}
                role={isLegalMove ? 'button' : undefined}
                aria-label={`Square row ${r + 1}, column ${c + 1}${
                  isLegalMove ? ' - Legal move destination' : ''
                }`}
                onKeyDown={(e) => {
                  if (isLegalMove && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onCellClick(pos);
                  }
                }}
              >
                {/* Cell Base */}
                <rect
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx="6"
                  fill={isLegalMove ? 'var(--cell-highlight)' : 'var(--cell-bg)'}
                  stroke={isLegalMove ? 'var(--p1-color)' : 'var(--cell-border)'}
                  strokeWidth={isLegalMove ? 2 : 1}
                />

                {/* Legal Move Pulsing Dot */}
                {isLegalMove && !isP1 && !isP2 && (
                  <circle
                    cx={x + CELL_SIZE / 2}
                    cy={y + CELL_SIZE / 2}
                    r="6"
                    fill="var(--p1-color)"
                    opacity="0.8"
                  />
                )}

                {/* Pawn P1: Human */}
                {isP1 && (
                  <g>
                    <circle
                      cx={x + CELL_SIZE / 2}
                      cy={y + CELL_SIZE / 2}
                      r="16"
                      fill="var(--p1-color)"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    />
                    <text
                      x={x + CELL_SIZE / 2}
                      y={y + CELL_SIZE / 2 + 4.5}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      YOU
                    </text>
                  </g>
                )}

                {/* Pawn P2: AI */}
                {isP2 && (
                  <g>
                    <circle
                      cx={x + CELL_SIZE / 2}
                      cy={y + CELL_SIZE / 2}
                      r="16"
                      fill="var(--p2-color)"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    />
                    <text
                      x={x + CELL_SIZE / 2}
                      y={y + CELL_SIZE / 2 + 4.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      AI
                    </text>
                  </g>
                )}
              </g>
            );
          })
        )}

        {/* Existing Walls */}
        {gameState.walls.map((wall, idx) => {
          if (wall.orientation === 'horizontal') {
            const wx = wall.col * STEP;
            const wy = wall.row * STEP + CELL_SIZE;
            const wWidth = 2 * CELL_SIZE + GROOVE_SIZE;
            const wHeight = GROOVE_SIZE;
            return (
              <rect
                key={`wall-${idx}`}
                x={wx}
                y={wy}
                width={wWidth}
                height={wHeight}
                rx="4"
                fill="var(--wall-h-color)"
                stroke="#d97706"
                strokeWidth="1"
              />
            );
          } else {
            const wx = wall.col * STEP + CELL_SIZE;
            const wy = wall.row * STEP;
            const wWidth = GROOVE_SIZE;
            const wHeight = 2 * CELL_SIZE + GROOVE_SIZE;
            return (
              <rect
                key={`wall-${idx}`}
                x={wx}
                y={wy}
                width={wWidth}
                height={wHeight}
                rx="4"
                fill="var(--wall-v-color)"
                stroke="#d97706"
                strokeWidth="1"
              />
            );
          }
        })}

        {/* Hovered Wall Preview */}
        {hoveredWall && (
          <rect
            x={
              hoveredWall.orientation === 'horizontal'
                ? hoveredWall.col * STEP
                : hoveredWall.col * STEP + CELL_SIZE
            }
            y={
              hoveredWall.orientation === 'horizontal'
                ? hoveredWall.row * STEP + CELL_SIZE
                : hoveredWall.row * STEP
            }
            width={
              hoveredWall.orientation === 'horizontal'
                ? 2 * CELL_SIZE + GROOVE_SIZE
                : GROOVE_SIZE
            }
            height={
              hoveredWall.orientation === 'horizontal'
                ? GROOVE_SIZE
                : 2 * CELL_SIZE + GROOVE_SIZE
            }
            rx="4"
            fill={
              isHoveredWallValid
                ? 'var(--wall-preview-valid)'
                : 'var(--wall-preview-invalid)'
            }
            pointerEvents="none"
          />
        )}

        {/* Interactive Wall Anchors (8x8) when wall mode is active */}
        {wallMode !== 'none' &&
          isHumanTurn &&
          Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => {
              const ax = c * STEP + CELL_SIZE - 2;
              const ay = r * STEP + CELL_SIZE - 2;
              const aSize = GROOVE_SIZE + 4;

              const candidate: Wall = { row: r, col: c, orientation: wallMode };
              const isValid = isWallPlacementLegal(gameState, candidate).valid;

              return (
                <rect
                  key={`anchor-${r}-${c}`}
                  x={ax}
                  y={ay}
                  width={aSize}
                  height={aSize}
                  rx="4"
                  fill={isValid ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.2)'}
                  style={{
                    cursor: isValid ? 'pointer' : 'not-allowed',
                  }}
                  onMouseEnter={() => setHoveredAnchor({ row: r, col: c })}
                  onMouseLeave={() => setHoveredAnchor(null)}
                  onClick={() => onWallClick(candidate)}
                  tabIndex={isValid ? 0 : -1}
                  role="button"
                  aria-label={`Place ${wallMode} wall at anchor (${r}, ${c})`}
                  onKeyDown={(e) => {
                    if (isValid && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onWallClick(candidate);
                    }
                  }}
                />
              );
            })
          )}
      </svg>

      <div className="board-goal-indicator board-goal-p2">
        <span>▼ Computer (AI) Goal Line (Row 8)</span>
        <span>Goal: Reach any square here</span>
      </div>
    </div>
  );
};
