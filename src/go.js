// 최소 바둑 규칙: 착수, 따내기, 자충수 금지
// stones: { "x,y": 'B' | 'W' }
const N = 19;
const nbrs = (x, y) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => a >= 0 && a < N && b >= 0 && b < N);

// (x,y)가 속한 그룹과 활로 수
function group(stones, x, y) {
  const color = stones[`${x},${y}`];
  const seen = new Set([`${x},${y}`]);
  const stack = [[x, y]];
  let libs = 0;
  const libSeen = new Set();
  while (stack.length) {
    const [cx, cy] = stack.pop();
    for (const [nx, ny] of nbrs(cx, cy)) {
      const k = `${nx},${ny}`;
      if (!stones[k]) { if (!libSeen.has(k)) { libSeen.add(k); libs++; } }
      else if (stones[k] === color && !seen.has(k)) { seen.add(k); stack.push([nx, ny]); }
    }
  }
  return { keys: [...seen], libs };
}

// 착수 후 새 돌 배치 반환. 불법 수(이미 돌 있음/자충)이면 null
export function play(stones, x, y, color) {
  if (stones[`${x},${y}`]) return null;
  const next = { ...stones, [`${x},${y}`]: color };
  const enemy = color === 'B' ? 'W' : 'B';
  for (const [nx, ny] of nbrs(x, y)) {
    if (next[`${nx},${ny}`] !== enemy) continue;
    const g = group(next, nx, ny);
    if (g.libs === 0) g.keys.forEach((k) => delete next[k]);
  }
  return group(next, x, y).libs === 0 ? null : next;
}

export function toStones(problem) {
  const s = {};
  problem.b.forEach(([x, y]) => { s[`${x},${y}`] = 'B'; });
  problem.w.forEach(([x, y]) => { s[`${x},${y}`] = 'W'; });
  return s;
}
