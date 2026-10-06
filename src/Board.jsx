import React, { useRef, useEffect, useState, useMemo } from 'react';

const STAR_POINTS = [3, 9, 15].flatMap((x) => [3, 9, 15].map((y) => [x, y]));
const SIZE = 480;
const PAD = 26;

// stones: { "x,y": 'B'|'W' }, base: 확대 영역 계산용 초기 배치, marks: 정답 표시 좌표
export default function Board({ stones, base, marks = [], lastMove, turn, onPlayMove, interactive }) {
  const canvasRef = useRef(null);
  const [hover, setHover] = useState(null);

  // 초기 배치 기준으로 부분 바둑판 영역 계산 (문제 중에는 고정)
  const view = useMemo(() => {
    const pts = Object.keys(base).map((k) => k.split(',').map(Number));
    let minX = Math.min(...pts.map((p) => p[0])) - 2, maxX = Math.max(...pts.map((p) => p[0])) + 2;
    let minY = Math.min(...pts.map((p) => p[1])) - 2, maxY = Math.max(...pts.map((p) => p[1])) + 2;
    minX = Math.max(0, minX); minY = Math.max(0, minY); maxX = Math.min(18, maxX); maxY = Math.min(18, maxY);
    // 정사각형으로 맞춤 (가장자리 쪽으로 확장)
    const span = Math.max(maxX - minX, maxY - minY, 5);
    const fit = (lo, hi) => {
      while (hi - lo < span) { if (lo > 0 && (hi === 18 || lo > 18 - hi)) lo--; else hi++; }
      return [lo, hi];
    };
    [minX, maxX] = fit(minX, maxX);
    [minY, maxY] = fit(minY, maxY);
    return { minX, maxX, minY, maxY, cell: (SIZE - PAD * 2) / span };
  }, [base]);

  const cx = (x) => PAD + (x - view.minX) * view.cell;
  const cy = (y) => PAD + (y - view.minY) * view.cell;

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const r = view.cell * 0.46;

    const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    bg.addColorStop(0, '#e8be74');
    bg.addColorStop(1, '#d5a85c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // 격자선: 판의 실제 가장자리는 굵게, 잘린 쪽은 바깥으로 살짝 연장
    ctx.strokeStyle = '#3d2508';
    for (let x = view.minX; x <= view.maxX; x++) {
      ctx.lineWidth = x === 0 || x === 18 ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx(x), cy(view.minY) + (view.minY > 0 ? -PAD : 0));
      ctx.lineTo(cx(x), cy(view.maxY) + (view.maxY < 18 ? PAD : 0));
      ctx.stroke();
    }
    for (let y = view.minY; y <= view.maxY; y++) {
      ctx.lineWidth = y === 0 || y === 18 ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx(view.minX) + (view.minX > 0 ? -PAD : 0), cy(y));
      ctx.lineTo(cx(view.maxX) + (view.maxX < 18 ? PAD : 0), cy(y));
      ctx.stroke();
    }

    ctx.fillStyle = '#3d2508';
    STAR_POINTS.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(cx(x), cy(y), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const drawStone = (x, y, color, alpha = 1) => {
      const px = cx(x), py = cy(y);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (alpha === 1) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      const g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
      if (color === 'B') { g.addColorStop(0, '#555'); g.addColorStop(0.7, '#1b1b1b'); g.addColorStop(1, '#050505'); }
      else { g.addColorStop(0, '#fff'); g.addColorStop(0.85, '#e4e4e4'); g.addColorStop(1, '#b5b5b5'); }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    Object.entries(stones).forEach(([k, c]) => {
      const [x, y] = k.split(',').map(Number);
      if (x >= view.minX && x <= view.maxX && y >= view.minY && y <= view.maxY) drawStone(x, y, c);
    });

    // 마지막 수 표시
    if (lastMove && stones[`${lastMove[0]},${lastMove[1]}`]) {
      ctx.fillStyle = '#e03131';
      ctx.beginPath();
      ctx.arc(cx(lastMove[0]), cy(lastMove[1]), r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // 정답 위치 표시 (초록 원)
    marks.forEach(([x, y]) => {
      ctx.strokeStyle = '#2b8a3e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx(x), cy(y), r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (interactive && hover && !stones[`${hover[0]},${hover[1]}`]) drawStone(hover[0], hover[1], turn, 0.5);
  }, [view, stones, marks, lastMove, hover, interactive, turn]);

  // 클릭 좌표 → 바둑판 좌표
  const toGrid = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) * SIZE) / rect.width;
    const py = ((e.clientY - rect.top) * SIZE) / rect.height;
    const x = Math.round((px - PAD) / view.cell) + view.minX;
    const y = Math.round((py - PAD) / view.cell) + view.minY;
    return x >= view.minX && x <= view.maxX && y >= view.minY && y <= view.maxY ? [x, y] : null;
  };

  return (
    <div className="board-wrapper">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="baduk-canvas"
        onMouseMove={(e) => interactive && setHover(toGrid(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const p = interactive && toGrid(e);
          if (p) onPlayMove(p[0], p[1]);
        }}
      />
    </div>
  );
}
