import React, { useState, useEffect, useMemo } from 'react';
import Board from './Board';
import { play, toStones } from './go';
import { playStoneSound, playSuccessSound, playFailSound } from './sound';

const LEVELS = [
  { id: 'beginner', label: '초급' },
  { id: 'intermediate', label: '중급' },
  { id: 'advanced', label: '고급' },
];

// 진행 위치 저장 (레벨별 문제 번호)
const saved = JSON.parse(localStorage.getItem('tsumego-progress') || '{}');

export default function App() {
  const [level, setLevel] = useState(saved.level || 'beginner');
  const [index, setIndex] = useState(saved[saved.level || 'beginner'] || 0);
  const [problems, setProblems] = useState([]);
  const [stones, setStones] = useState({});
  const [lastMove, setLastMove] = useState(null);
  const [status, setStatus] = useState('playing'); // 'playing' | 'success' | 'failed'
  const [showAnswer, setShowAnswer] = useState(false);

  const problem = problems[index];
  const base = useMemo(() => (problem ? toStones(problem) : {}), [problem]);
  const turn = problem?.p || 'B';
  const label = LEVELS.find((l) => l.id === level).label;

  // 레벨 데이터 로드
  useEffect(() => {
    fetch(`/problems/${level}.json`).then((r) => r.json()).then(setProblems);
  }, [level]);

  // 문제 변경 시 초기화 + 진행 저장
  useEffect(() => {
    if (!problem) return;
    reset();
    saved.level = level;
    saved[level] = index;
    localStorage.setItem('tsumego-progress', JSON.stringify(saved));
  }, [problem]);

  function reset() {
    setStones(toStones(problem));
    setLastMove(null);
    setStatus('playing');
    setShowAnswer(false);
  }

  function handleMove(x, y) {
    const next = play(stones, x, y, turn);
    if (!next) return; // 자충수 등 불법 수는 무시
    playStoneSound();
    setStones(next);
    setLastMove([x, y]);
    const ok = problem.s.some(([sx, sy]) => sx === x && sy === y);
    setStatus(ok ? 'success' : 'failed');
    setTimeout(ok ? playSuccessSound : playFailSound, 120);
  }

  function changeLevel(id) {
    setLevel(id);
    setProblems([]);
    setIndex(saved[id] || 0);
  }

  const go = (i) => setIndex(Math.max(0, Math.min(problems.length - 1, i)));

  const message = {
    playing: `${turn === 'B' ? '흑' : '백'} 차례입니다. 급소를 찾아 두세요.`,
    success: '정답입니다! 🎉',
    failed: '오답입니다. [다시 풀기]를 누르거나 [정답 보기]로 확인하세요.',
  }[status];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="level-tabs">
          {LEVELS.map((l) => (
            <button key={l.id} className={`tab ${l.id === level ? 'active' : ''}`} onClick={() => changeLevel(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="title-text">{label} #{index + 1}</div>
      </header>

      <div className="mission-banner">
        <span className="mission-tag">{turn === 'B' ? '흑선' : '백선'}</span>
        <span className="mission-text">{turn === 'B' ? '흑' : '백'} 차례 · 사활 문제</span>
      </div>

      <main className="board-section">
        {problem ? (
          <Board
            stones={stones}
            base={base}
            marks={showAnswer ? problem.s : []}
            lastMove={lastMove}
            turn={turn}
            onPlayMove={handleMove}
            interactive={status === 'playing'}
          />
        ) : (
          <div className="loading">문제를 불러오는 중...</div>
        )}
      </main>

      <div className={`feedback-card feedback-${status}`}>
        <div className="feedback-icon">{{ playing: '🎯', success: '✅', failed: '❌' }[status]}</div>
        <div className="feedback-message">
          {message}
          {showAnswer && <div className="answer-note">초록 원이 정답 첫 수입니다.</div>}
        </div>
      </div>

      <div className="action-toolbar">
        <button className="btn btn-secondary" onClick={reset}>🔄 다시 풀기</button>
        <button className="btn btn-solution" onClick={() => setShowAnswer(!showAnswer)} disabled={!problem}>
          {showAnswer ? '정답 숨기기' : '✨ 정답 보기'}
        </button>
      </div>

      <footer className="nav-footer">
        <button className="btn btn-nav" onClick={() => go(index - 1)} disabled={index === 0}>◀ 이전</button>
        <input
          className="page-input"
          type="number"
          min={1}
          max={problems.length}
          value={index + 1}
          onChange={(e) => go(Number(e.target.value) - 1)}
        />
        <span className="page-indicator">/ {problems.length}</span>
        <button className="btn btn-nav btn-primary" onClick={() => go(index + 1)} disabled={index >= problems.length - 1}>다음 ▶</button>
      </footer>
    </div>
  );
}
