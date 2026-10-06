// 공개 SGF(JSON) 문제 저장소(sanderland/tsumego)에서 사활 문제를 추출해 public/problems/*.json 생성
// 사용법: node scripts/build-problems.mjs <저장소 경로>
// 출처 저장소의 저자/책 이름은 출력에 포함하지 않는다.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const repo = process.argv[2] || 'scratch/sanderland_tsumego';
const LEVELS = { '1a': 'beginner', '1b': 'intermediate', '1c': 'advanced' };

// git 객체에서 직접 읽음 (윈도우에서 체크아웃 불가한 경로 우회)
const tree = execFileSync('git', ['-C', repo, 'ls-tree', '-r', 'HEAD', 'problems/'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .trim().split('\n').map((line) => {
    const [meta, path] = line.split('\t');
    return { hash: meta.split(' ')[2], path };
  })
  .filter((f) => f.path.endsWith('.json') && LEVELS[f.path.split('/')[1].slice(0, 2)]);

const batch = execFileSync('git', ['-C', repo, 'cat-file', '--batch'], {
  input: tree.map((f) => f.hash).join('\n') + '\n', maxBuffer: 1 << 28,
});

// --batch 출력 파싱: "<hash> blob <size>\n<content>\n"
const out = Object.fromEntries(Object.values(LEVELS).map((l) => [l, []]));
let pos = 0;
const xy = (s) => [s.charCodeAt(0) - 97, s.charCodeAt(1) - 97];
for (const f of tree) {
  const nl = batch.indexOf(10, pos);
  const size = Number(batch.subarray(pos, nl).toString().split(' ')[2]);
  const data = JSON.parse(batch.subarray(nl + 1, nl + 1 + size).toString());
  pos = nl + 1 + size + 1;

  const sol = (data.SOL || []).filter((s) => s[1] && s[1].length === 2);
  if (!sol.length || data.SZ !== '19') continue;
  out[LEVELS[f.path.split('/')[1].slice(0, 2)]].push({
    b: (data.AB || []).map(xy),
    w: (data.AW || []).map(xy),
    p: sol[0][0],              // 둘 차례 ('B' | 'W')
    s: sol.map((s) => xy(s[1])), // 정답 첫 수 후보들
  });
}

mkdirSync('public/problems', { recursive: true });
for (const [level, list] of Object.entries(out)) {
  writeFileSync(`public/problems/${level}.json`, JSON.stringify(list));
  console.log(level, list.length);
}
