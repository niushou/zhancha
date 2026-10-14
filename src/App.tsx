import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { SectionTitle, Seal } from './components/IllustratedControls';
import { AsyncWheelTray as ThreeWheelTray } from './components/AsyncWheelTray';
import type { WheelFaceSpec, WheelSpec } from './components/ThreeWheelTray';
import wheelSigns from './data/189WheelSigns.json';
import { wheelSignTranslations } from './data/wheelSignTranslations';
import { ritualSteps } from './data/gameContent';
import { sources } from './data/sources';
import { chineseNumeral, drawStrength, drawTenKarma, drawThirdThrow, faceSetsChinese, strengthFaces, tenKarma, wheelGroups, type FirstFaceIndex, type Scope, type StrengthSide } from './data/wheelData';

const HERO = '/wheel-study-mural.svg';

type Page = 'home' | 'game' | 'study';
type Mode = 'complete' | 'first' | 'second' | 'third' | 'example';
type Stage = 'ritual' | 'catalog' | 'first' | 'second' | 'third' | 'result';
type Sign = { number: number; textTraditional: string; textSimplified: string; period: string; modernTranslation: string };
type FirstResult = { id: number; side: '善' | '恶' | '空白'; face: FirstFaceIndex };
type Trial = { faces: Array<{ wheel: number; visible: number | null }>; subtotal: number };
const allSigns = (wheelSigns as Omit<Sign, 'modernTranslation'>[]).map((sign) => ({
  ...sign,
  modernTranslation: wheelSignTranslations[sign.number] ?? '本条现代译文尚待校对。',
}));
const studySectionIds = ['shape', 'rules', 'repentance', 'terms', 'text', 'sources'];
const stageLabels: Array<{ id: Stage; title: string }> = [
  { id: 'ritual', title: '前行' }, { id: 'catalog', title: '识轮' }, { id: 'first', title: '初轮' },
  { id: 'second', title: '二轮' }, { id: 'third', title: '三轮' }, { id: 'result', title: '判读' },
];
const faceSets = Array.from({ length: 6 }, (_, i) => [i * 3 + 1, i * 3 + 2, i * 3 + 3]);
const chineseFaceSets = faceSetsChinese();

function blankFace(): WheelFaceSpec { return { label: '', mark: 'blank', tone: 'neutral' }; }

function firstWheelSpec(item: typeof tenKarma[number], result?: FirstResult): WheelSpec {
  return {
    id: `first-${item.id}`,
    kind: 'first',
    faces: [
      { label: item.good, mark: 'text', tone: 'good' },
      { label: item.bad, mark: 'text', tone: 'bad' },
      blankFace(),
      blankFace(),
    ],
    resultFace: result?.face,
  };
}

const strengthFaceIndex: Record<StrengthSide, 0 | 1 | 2 | 3> = { 善久强: 0, 善近弱: 1, 恶久强: 2, 恶近弱: 3 };

function secondWheelSpec(id: string, scope: Scope, result?: StrengthSide): WheelSpec {
  return {
    id,
    kind: 'second',
    faces: [
      { label: scope, mark: 'long', tone: 'good' },
      { label: scope, mark: 'short', tone: 'good' },
      { label: scope, mark: 'deep', tone: 'bad' },
      { label: scope, mark: 'shallow', tone: 'bad' },
    ],
    resultFace: result === undefined ? undefined : strengthFaceIndex[result],
  };
}

function thirdWheelSpec(index: number, visible?: number | null): WheelSpec {
  const start = index * 3 + 1;
  const faces: WheelFaceSpec[] = [
    { label: chineseNumeral(start), mark: 'digit', tone: 'neutral' },
    { label: chineseNumeral(start + 1), mark: 'digit', tone: 'neutral' },
    { label: chineseNumeral(start + 2), mark: 'digit', tone: 'neutral' },
    blankFace(),
  ];
  const resultFace = visible === undefined ? undefined : visible === null ? 3 : (visible - start) as 0 | 1 | 2;
  return { id: `third-${index + 1}`, kind: 'third', faces: faces as WheelSpec['faces'], resultFace };
}

const exampleFirstResults: FirstResult[] = [
  { id: 1, side: '善', face: 0 }, { id: 2, side: '空白', face: 2 }, { id: 3, side: '恶', face: 1 }, { id: 4, side: '善', face: 0 }, { id: 5, side: '空白', face: 3 },
  { id: 6, side: '恶', face: 1 }, { id: 7, side: '善', face: 0 }, { id: 8, side: '恶', face: 1 }, { id: 9, side: '空白', face: 2 }, { id: 10, side: '善', face: 0 },
];
const exampleStrength: Record<number, StrengthSide> = { 1: '善久强', 3: '恶近弱', 4: '善近弱', 6: '恶久强', 7: '善久强', 8: '恶近弱', 10: '善近弱' };
const exampleTrials: Trial[] = [
  { faces: [1, 4, 7, 10, 13, 16].map((visible, i) => ({ wheel: i + 1, visible })), subtotal: 51 },
  { faces: Array.from({ length: 6 }, (_, i) => ({ wheel: i + 1, visible: null })), subtotal: 0 },
  { faces: [3, 6, 9, 12, 15, 18].map((visible, i) => ({ wheel: i + 1, visible })), subtotal: 63 },
];

function groupText(period: string) {
  if (period === '现世') return '经文将 1–160 归在现世果报差别这一段。';
  if (period === '过去世') return '经文将 161–171 归在过去世因缘这一段。';
  return '经文将 172–189 归在未来世果报这一段。';
}
// 经文用词典故的小注，仅在条目中出现该词时逐条标注；它说明词义，不改写经文原句。
const classicalTermNotes: Array<{ term: string; gloss: string }> = [
  { term: '不退', gloss: '不退转（阿毗跋致），所得果位不再退失' },
  { term: '现当证', gloss: '现在或当来得以证得' },
  { term: '未住信', gloss: '信心尚未安住、未得决定' },
  { term: '舍身已', gloss: '舍此身之后，即命终之后' },
  { term: '所观人', gloss: '所观察的那个人' },
  { term: '随所闻', gloss: '随所听闻的教法或消息' },
  { term: '大不调', gloss: '四大不调，泛指身体的失调病苦' },
  { term: '自当差', gloss: '会自行痊愈（“差”通“瘥”，病愈）' },
  { term: '非对治', gloss: '所服之药或所行之法与病症不对症' },
  { term: '不得力', gloss: '所服之药或所行之法未见效' },
  { term: '寻见佛', gloss: '不久即得见佛（“寻”有不久之义）' },
  { term: '住上乘', gloss: '安住于上乘（大乘）' },
  { term: '住中乘', gloss: '安住于中乘（缘觉乘）' },
  { term: '住下乘', gloss: '安住于下乘（声闻乘）' },
  { term: '得出家', gloss: '得以出家' },
];
function classicalNotesFor(sign: Sign) {
  return classicalTermNotes.filter((note) => sign.textSimplified.includes(note.term));
}

export default function App() {
  const [page, setPage] = useState<Page>(() => typeof window !== 'undefined' && studySectionIds.includes(window.location.hash.slice(1)) ? 'study' : 'home');
  const [mode, setMode] = useState<Mode>('complete');
  const [stage, setStage] = useState<Stage>('ritual');
  const [ritualIndex, setRitualIndex] = useState(0);
  const [firstResults, setFirstResults] = useState<FirstResult[]>([]);
  const [secondResults, setSecondResults] = useState<Record<number, StrengthSide>>({});
  const [skippedSecondIds, setSkippedSecondIds] = useState<number[]>([]);
  const [secondIndex, setSecondIndex] = useState(0);
  const [secondPractice, setSecondPractice] = useState<Partial<Record<Scope, StrengthSide>>>({});
  const [candidate, setCandidate] = useState<StrengthSide | null>(null);
  const [thirdTrials, setThirdTrials] = useState<Trial[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rollingIds, setRollingIds] = useState<string[] | undefined>(undefined);
  const rollTimeout = useRef<number | undefined>(undefined);
  const [chantCount, setChantCount] = useState(0);
  const [filterPeriod, setFilterPeriod] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [pageNum, setPageNum] = useState(0);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupNumber, setLookupNumber] = useState<number | null>(null);
  const pendingStudyTarget = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (page !== 'game') return;
    const frame = window.requestAnimationFrame(() => {
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [page, stage]);

  useEffect(() => {
    if (page !== 'study') return;
    const pendingTarget = pendingStudyTarget.current;
    const hashTarget = window.location.hash.slice(1);
    const targetId = pendingTarget === undefined ? (studySectionIds.includes(hashTarget) ? hashTarget : undefined) : pendingTarget ?? undefined;
    if (pendingTarget === undefined && targetId === undefined) return;
    const frame = window.requestAnimationFrame(() => {
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        if (pendingTarget !== undefined) window.history.replaceState(null, '', `#${targetId}`);
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
      } else {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      pendingStudyTarget.current = undefined;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [page]);

  useEffect(() => () => {
    if (rollTimeout.current !== undefined) window.clearTimeout(rollTimeout.current);
  }, []);

  const activeItems = useMemo(() => firstResults.filter((r) => r.side !== '空白').map((r) => ({ ...r, karma: tenKarma[r.id - 1] })), [firstResults]);
  const currentTask = activeItems[secondIndex];
  const thirdTotal = thirdTrials.reduce((sum, item) => sum + item.subtotal, 0);
  const skippedSecondCount = skippedSecondIds.length;
  const resultSign = allSigns.find((item) => item.number === thirdTotal);
  const lookupSign = lookupNumber === null || lookupNumber === 0 ? undefined : allSigns.find((item) => item.number === lookupNumber);
  const candidateMatches = Boolean(candidate && currentTask && (strengthFaces[candidate].tone === 'good' ? '善' : '恶') === currentTask.side);
  const sortedFilteredSigns = useMemo(() => allSigns.filter((item) => (filterPeriod === '全部' || item.period === filterPeriod) && (!searchText || `${item.number} ${item.textSimplified} ${item.modernTranslation}`.includes(searchText.trim()))), [filterPeriod, searchText]);
  const pageSigns = sortedFilteredSigns.slice(pageNum * 24, pageNum * 24 + 24);
  const currentStageIndex = Math.max(0, stageLabels.findIndex((x) => x.id === stage));
  const firstTrayWheels = tenKarma.map((item) => firstWheelSpec(item, firstResults.find((result) => result.id === item.id)));
  const secondPracticeWheels = (['身', '口', '意'] as Scope[]).map((scope) => secondWheelSpec(`second-${scope}`, scope, secondPractice[scope]));
  const activeSecondWheel = secondWheelSpec('second-active', currentTask?.karma.scope ?? '身', candidate ?? (currentTask ? secondResults[currentTask.id] : undefined));
  const latestThirdTrial = thirdTrials[thirdTrials.length - 1];
  const thirdTrayWheels = faceSets.map((_, index) => thirdWheelSpec(index, latestThirdTrial?.faces.find((face) => face.wheel === index + 1)?.visible));

  function lookupThirdSign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = Number(lookupInput);
    if (!Number.isInteger(number) || number < 0 || number > 189) return;
    setLookupNumber(number);
  }

  function startRun(nextMode: Mode) {
    if (rollTimeout.current !== undefined) window.clearTimeout(rollTimeout.current);
    rollTimeout.current = undefined;
    setRolling(false); setRollingIds(undefined);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setMode(nextMode); setPage('game'); setRitualIndex(0); setChantCount(0); setFirstResults([]); setSecondResults({});
    setSkippedSecondIds([]); setSecondIndex(0); setSecondPractice({}); setCandidate(null); setThirdTrials([]);
    setStage(nextMode === 'complete' ? 'ritual' : nextMode === 'first' ? 'first' : nextMode === 'second' ? 'second' : nextMode === 'third' ? 'third' : 'ritual');
  }
  function home() {
    if (rollTimeout.current !== undefined) window.clearTimeout(rollTimeout.current);
    rollTimeout.current = undefined;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setPage('home'); setRolling(false); setRollingIds(undefined);
  }
  function openStudy(targetId?: string) {
    if (page === 'study') {
      if (targetId) {
        window.history.replaceState(null, '', `#${targetId}`);
        document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      } else {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      return;
    }
    pendingStudyTarget.current = targetId ?? null;
    setPage('study');
  }
  function startExample() {
    if (rollTimeout.current !== undefined) window.clearTimeout(rollTimeout.current);
    rollTimeout.current = undefined;
    setRolling(false); setRollingIds(undefined);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setMode('example'); setPage('game'); setStage('ritual'); setRitualIndex(0); setChantCount(0);
    setFirstResults(exampleFirstResults); setSecondResults({}); setSkippedSecondIds([]); setSecondIndex(0);
    setSecondPractice({}); setCandidate(null); setThirdTrials(exampleTrials);
  }
  function animate(commit: () => void, targetIds?: string[]) {
    if (rolling) return;
    if (rollTimeout.current !== undefined) window.clearTimeout(rollTimeout.current);
    setRollingIds(targetIds);
    setRolling(true);
    commit();
    rollTimeout.current = window.setTimeout(() => {
      rollTimeout.current = undefined;
      setRolling(false); setRollingIds(undefined);
    }, 1100);
  }
  function rollFirst() {
    if (mode === 'example') {
      startExample();
      return;
    }
    animate(() => {
      setFirstResults(tenKarma.map((item) => ({ id: item.id, ...drawTenKarma() })));
      setSecondResults({}); setSkippedSecondIds([]); setSecondIndex(0); setCandidate(null); setThirdTrials([]);
    });
  }
  function rollSecond() {
    if (!currentTask) return;
    animate(() => setCandidate(mode === 'example' ? exampleStrength[currentTask.id] : drawStrength()));
  }
  function recordSecond() {
    if (rolling || !candidate || !currentTask) return;
    setSecondResults((old) => ({ ...old, [currentTask.id]: candidate }));
    setSecondIndex((old) => old + 1); setCandidate(null);
  }
  function skipSecond() {
    if (rolling || !currentTask) return;
    setSkippedSecondIds((old) => old.includes(currentTask.id) ? old : [...old, currentTask.id]);
    setSecondIndex((old) => old + 1); setCandidate(null);
  }
  function restartFirst() {
    if (mode === 'example') {
      startExample();
      return;
    }
    setFirstResults([]); setSecondResults({}); setSkippedSecondIds([]); setSecondIndex(0); setCandidate(null); setThirdTrials([]);
  }
  function rollSecondPractice(scope: Scope) {
    animate(() => setSecondPractice((old) => ({ ...old, [scope]: drawStrength() })), [`second-${scope}`]);
  }
  function rollThird() {
    if (thirdTrials.length >= 3) return;
    animate(() => {
      if (mode === 'example') {
        setThirdTrials((old) => [...old, exampleTrials[old.length]]);
      } else {
        const faces = drawThirdThrow();
        setThirdTrials((old) => [...old, { faces, subtotal: faces.reduce((n, x) => n + (x.visible ?? 0), 0) }]);
      }
    });
  }
  function advanceFromRitual() {
    if (ritualIndex < ritualSteps.length - 1) setRitualIndex((n) => n + 1);
    else setStage('catalog');
  }
  function resetStudyFilter(period: string) { setFilterPeriod(period); setPageNum(0); }
  const eventBoundary = (event: KeyboardEvent<HTMLInputElement>, direction: 'prev' | 'next') => {
    if (event.key !== 'Enter') return;
    if (direction === 'next' && pageNum < Math.ceil(sortedFilteredSigns.length / 24) - 1) setPageNum((n) => n + 1);
    if (direction === 'prev') setPageNum((n) => Math.max(0, n - 1));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={home} type="button" aria-label="返回首页">
          <svg className="brand-mark spindle-mark" viewBox="0 0 60 40" aria-hidden="true"><path d="M4 20 14 11H46L56 20 46 29H14Z" fill="#c99359" stroke="#68442b" strokeWidth="1.6"/><path d="M14 11 18 20 14 29M46 11 42 20 46 29" fill="none" stroke="#68442b" strokeWidth="1.2"/><path d="M18 20H42" stroke="#a33325" strokeWidth="2"/><path d="M3 20h6M51 20h6" stroke="#e5c383" strokeWidth="1"/></svg>
          <span className="brand-name">地藏占察法 <i>·</i> 木轮相法</span>
        </button>
        <nav className="main-nav" aria-label="主导航">
          <button className={page === 'home' ? 'nav-active' : ''} onClick={home}>首页</button>
          <button className={page === 'study' ? 'nav-active' : ''} onClick={() => openStudy()}>规则图鉴</button>
          {page === 'game' && <span className="play-indicator"><span />线上起轮占察</span>}
        </nav>
        {page !== 'game' && <><button className="text-link example-nav" onClick={() => openStudy('rules')}>占察规则</button><button className="nav-cta" onClick={() => startRun('complete')}>开始占察 <span>→</span></button></>}
      </header>

      {page === 'home' && <main className="home-page">
        <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(31,33,28,.78) 0%, rgba(31,33,28,.55) 39%, rgba(31,33,28,.06) 100%), url("${HERO}")` }}>
          <div className="hero-ornament" aria-hidden="true">❋</div>
          <div className="hero-content">
            <span className="hero-kicker">依经典 · 观轮相 · 如法占察</span>
            <h1>认识占察木轮之前，<br /><em>先看见它的来处。</em></h1>
            <p>十九枚小木轮，一套循序渐进的占察方法。沿着《占察善恶业报经》的次第，依次了解并占察各组轮相。</p>
            <div className="hero-actions">
              <button className="btn btn-terracotta" onClick={() => startRun('complete')}>开始占察 <span>↗</span></button>
              <button className="text-link light-link" onClick={() => openStudy()}>先看轮相图鉴 <span>↓</span></button>
            </div>
          </div>
          <div className="hero-caption"><span className="caption-rule" />线上起轮 · 占察诸业轮相</div>
          <div className="hero-index">地藏占察 · 木轮相法<br />第　一　卷　上</div>
        </section>

        <section className="intro-strip">
          <div className="intro-quote"><span className="quote-mark">“</span><p>木轮相法的用意，不在于替你决定人生，<br />而在于让你看清所思所行。</p></div>
          <div className="intro-stat"><strong>19</strong><span>枚木轮</span></div>
          <div className="intro-stat"><strong>3</strong><span>组轮相</span></div>
          <div className="intro-stat"><strong>189</strong><span>条经文轮相</span></div>
        </section>

        <section className="home-paths content-width">
          <div className="home-section-heading"><div><span className="eyebrow">占察方式</span><h2>想从哪一部分开始占察？</h2></div><p>可从礼敬前行开始，也可直接进入所需轮相。三组各有用途，第二轮须依第一轮所现业相分别占察。</p></div>
          <div className="path-card path-featured">
            <div className="path-number">01</div><div className="path-copy"><span className="eyebrow">占察流程 · 约 8 分钟</span><h3>从礼敬前行到轮相判读</h3><p>依次进行礼敬前行、认识十九枚木轮，再按次第占察十善恶、三业轻重，并以第三轮三掷合数查对经文条目。各轮用途不同，不表示每次必须三轮连占。</p><button className="text-link" onClick={() => startRun('complete')}>开始占察 <span>↗</span></button></div>
            <div className="path-art"><span className="orbit orbit-a"/><span className="orbit orbit-b"/><div className="path-art-seal">木<br /><small>轮</small></div></div>
          </div>
          <div className="practice-row">
            <button className="practice-card" onClick={() => startRun('first')}><span className="practice-icon">十</span><span><strong>占察第一轮</strong><small>十善 · 十恶</small></span><span className="arrow">↗</span></button>
            <button className="practice-card" onClick={() => startRun('second')}><span className="practice-icon teal">三</span><span><strong>占察第二轮</strong><small>身 · 口 · 意</small></span><span className="arrow">↗</span></button>
            <button className="practice-card" onClick={() => startRun('third')}><span className="practice-icon gold">六</span><span><strong>占察第三轮</strong><small>数字相 · 一百八十九相</small></span><span className="arrow">↗</span></button>
          </div>
        </section>

        <section className="home-note content-width"><Seal>说明</Seal><p>本网页提供线上占察，程序随机起轮，为暂时没有实体木轮者提供线上操作。经文所述实体木轮操作与线上起轮的形式不同；占察结果也不替代医疗、法律、财务等专业判断。</p><button className="text-link" onClick={() => openStudy()}>了解资料来源与边界 <span>→</span></button></section>
      </main>}

      {page === 'game' && <main className="game-page">
        <div className="game-heading"><div><span className="eyebrow">{mode === 'complete' ? '连续占察流程' : mode === 'example' ? '占察示例' : '单组起轮'}</span><h1>{stageLabels.find((s) => s.id === stage)?.title || '判读'}<span> · 木轮相法</span></h1></div><button className="quiet-button" onClick={home}>退出当前占察流程 <span>×</span></button></div>
        {mode === 'complete' && <div className="stepper" aria-label="占察流程进度">{stageLabels.map((item, index) => <div className={`stepper-item ${index < currentStageIndex ? 'done' : ''} ${index === currentStageIndex ? 'current' : ''}`} key={item.id}><span className="stepper-dot">{index < currentStageIndex ? '✓' : String(index + 1).padStart(2, '0')}</span><span>{item.title}</span></div>)}</div>}
        {mode !== 'complete' && <div className="practice-banner"><span>{mode === 'example' ? '占察示例' : '单组占察'}</span><p>{mode === 'second' ? '当前为第二轮占察，分别起身、口、意轮。请依初轮所现业相选取相应业轮，不可三轮合掷；也可从礼敬前行开始完整流程。' : mode === 'third' ? '当前进行第三轮占察：六枚同时起轮三次，以合数查对经文条目。' : mode === 'example' ? '这是预设轮相的完整占察流程示例，可随时重看。' : '此入口从第一轮开始。第二轮应依初轮所现业相逐项占察；第三轮用于查对所问事项的三世果报。若依单次占察前行操作，请从礼敬前行进入。'}</p><div className="practice-banner-actions">{mode === 'second' && <button className="btn btn-outline" onClick={() => startRun('third')}>占察第三轮 <span>↗</span></button>}{mode === 'example' ? <button className="text-link" onClick={startExample}>重看占察示例 <span>↗</span></button> : <button className="text-link" onClick={() => startRun('complete')}>从礼敬前行重新占察 <span>↗</span></button>}</div></div>}

        <div className="game-workspace">
          <aside className="game-rail">
            <span className="rail-label">占察流程</span>
            {stageLabels.map((item, index) => <div className={`rail-step ${stage === item.id ? 'selected' : ''} ${index < currentStageIndex ? 'passed' : ''}`} key={item.id}><span>{index < currentStageIndex ? '✓' : `0${index + 1}`}</span><div><strong>{item.title}</strong><small>{index < currentStageIndex ? '已完成' : stage === item.id ? '正在进行' : '待继续'}</small></div></div>)}
            <div className="rail-foot"><span className="tiny-lotus">✳</span><p>缘合故有<br />缘尽则灭</p></div>
          </aside>

          <section className="game-board">
            {stage === 'ritual' && <>
              <SectionTitle eyebrow={`前行 · ${ritualIndex + 1} / 4`} title={ritualSteps[ritualIndex].title} detail="依经文卷上次第呈现礼敬、供养、称名、乞请。经文原句与后代简要仪轨分开标注；页面不会代行礼拜；实修者请按所依仪轨礼敬。此处呈现单次占察的前行经文，不是完整《占察忏》科仪。" />
              <div className="ritual-card">
                <div className="ritual-emblem"><div className="ritual-emblem-inner">{ritualSteps[ritualIndex].label}</div></div>
                <div className="ritual-card-copy"><span className="eyebrow">仪轨读本 · {String(ritualIndex + 1).padStart(2, '0')}</span><h3>{ritualSteps[ritualIndex].title}</h3><p>{ritualSteps[ritualIndex].text}</p><blockquote className="ritual-recitation">{ritualSteps[ritualIndex].chant}</blockquote><small className="ritual-source-note">{ritualSteps[ritualIndex].source}</small>{ritualSteps[ritualIndex].additional && <p className="ritual-additional">{ritualSteps[ritualIndex].additional}</p>}</div>
              </div>
              {ritualIndex === 2 && <div className="chant-counter"><div><span className="eyebrow">自愿 · 页面内计数</span><strong>{chantCount} / 1000 声</strong></div><button onClick={() => setChantCount((n) => Math.min(1000, n + 1))}>我已念一声</button><button onClick={() => setChantCount((n) => Math.min(1000, n + 10))}>我已念十声</button><button className="text-link" onClick={() => setChantCount(0)}>清零</button><p>经文说“满足至千”。此计数器不会播放语音、不保存记录；可以默诵、略过或不计数。所问之事仅以占位符说明，不必输入真实信息。</p></div>}
              <div className="soft-notice"><span>先分清单次占察与占察忏</span><p>本流程依序呈现三组轮相，但每次占察应依所问选用相关轮相，不必三组连占；《占察忏》的长期修持另有仪轨，不属于单次占察流程。忏法路线与不同占法的适用情形见<button type="button" className="inline-topic-link" onClick={() => openStudy('repentance')}>占察忏法说明</button>。</p></div>
              <div className="board-footer"><span className="source-ref">根据《占察善恶业报经》卷上 · 线上占察流程</span><button className="btn btn-dark" onClick={advanceFromRitual} disabled={rolling}>{ritualIndex === ritualSteps.length - 1 ? '前行完成，开始第一轮' : '礼敬完成，继续'} <span>→</span></button></div>
            </>}

            {stage === 'catalog' && <>
              <SectionTitle eyebrow="十九枚 · 三组轮相" title="先认一认手边的木轮" detail="三维模型依经文形制与实物图校对：四个纵向平面，中段方平，两端斜收；不同类别刻记各按自己的规则显示。" />
              <div className="mini-group-head"><span>第一组 · 十枚</span><small>一善一恶，对应身口意十业</small></div>
              <ThreeWheelTray wheels={tenKarma.map((item) => firstWheelSpec(item))} label="第一组十枚四面占察木轮" className="tray-ten" />
              <div className="catalog-wheels ten-wheel-grid">{tenKarma.map((item) => <div className="catalog-wheel" key={item.id}><strong>{chineseNumeral(item.id)} · {item.scope}</strong><span className="specimen-face-pair"><b className="good">{item.good}</b><b className="bad">{item.bad}</b></span><small>另两面空白</small></div>)}</div>
              <div className="mini-group-head"><span>第二组 · 三枚</span><small>分别主身、口、意；四种画刻</small></div>
              <ThreeWheelTray wheels={(['身', '口', '意'] as Scope[]).map((scope) => secondWheelSpec(`catalog-${scope}`, scope))} label="第二组三枚身口意四面木轮" className="tray-three" />
              <div className="catalog-wheels three-wheel-grid">{(['身', '口', '意'] as Scope[]).map((scope) => <div className="catalog-wheel wide" key={scope}><strong>{scope}轮</strong><small>长画 · 短画 · 粗深刻 · 细浅刻</small></div>)}</div>
              <div className="mini-group-head"><span>第三组 · 六枚</span><small>一至十八数，每轮各列连续三数</small></div>
              <ThreeWheelTray wheels={faceSets.map((_, index) => thirdWheelSpec(index))} label="第三组六枚中文数字四面木轮" className="tray-six" />
              <div className="catalog-wheels six-wheel-grid">{chineseFaceSets.map((set) => <div className="catalog-wheel" key={set[0]}><strong>{set.join(' / ')}</strong><small>三面数字 · 一面空白</small></div>)}</div>
              <div className="colour-key"><span className="good">善面 · 朱色</span><span className="bad">恶面 · 墨色</span><p>朱、墨配色仅作网页辨识，原经没有规定涂色；第二组的善恶以“画饰／损刻”的形制区别。</p></div>
              <div className="visual-source-row"><a href="https://fo.sina.com.cn/o/2013-10-17/142913531.shtml" target="_blank" rel="noreferrer">查看新浪佛学实物图参照 ↗</a><span>照片用于校形；现代实物款式不等于唯一标准，本页不转载图片。</span></div>
              <div className="soft-notice"><span>使用语境</span><p>传统讲解常见两种用法：观察十善恶与三业轻重时用第一、二组；为疑惑事求决时用第三组。此处串联三组仅为说明轮相次第，不代表每次占察都须连占三组。</p></div>
              <div className="board-footer"><span className="source-ref">《占察善恶业报经》：其轮有十、三、六</span><button className="btn btn-dark" onClick={() => setStage('first')}>已了解轮相，进行初轮占察 <span>→</span></button></div>
            </>}

            {stage === 'first' && <>
              <SectionTitle eyebrow="初轮 · 十枚" title="看看十善与十恶如何现相" detail="十枚木轮依次对应身三、口四、意三。每枚四面：一面善、一面对应的恶、另两面空白；每枚同时起轮并记录实际停面。" />
              <div className="roll-explainer"><Seal>初轮</Seal><p>此处依现代实物图解呈现一善、一恶、两空白共四个纵向轮面；线上程序从四个轮面随机起轮，概率分别为 1/4、1/4、1/2。颜色只帮助辨识，不是经文规定。</p></div>
              <ThreeWheelTray wheels={firstTrayWheels} label="第一轮十枚木轮轮相" rolling={rolling} rollingIds={rollingIds} className="tray-ten" />
              <div className="roll-invitation roll-cta-panel"><h3>{firstResults.length ? '初轮线上起轮完成' : '至心起轮，占察初轮'}</h3><p>经文记载以净物承接木轮、仰手旁掷。线上占察由程序随机起轮；若使用实体木轮，请依所依仪轨操作。每一轮按自己四个面之一显示，空白面也保留在记录中。</p><button className="btn btn-terracotta" onClick={rollFirst} disabled={rolling}>{rolling ? '木轮转动中…' : mode === 'example' ? '重看占察示例' : firstResults.length ? '重新占察初轮' : '起轮占察初轮'} <span>↗</span></button></div>
              {firstResults.length > 0 && <>
                <div className="roll-result-grid">{tenKarma.map((item) => { const result = firstResults.find((r) => r.id === item.id)!; return <div className={`result-tile ${result.side === '善' ? 'is-good' : result.side === '恶' ? 'is-bad' : 'is-empty'}`} key={item.id}><div className="tile-top"><span>{chineseNumeral(item.id)}</span><span>{item.scope}</span></div><strong>{result.side === '善' ? item.good : result.side === '恶' ? item.bad : '未现轮相'}</strong><small>{item.scope}业 · {result.side}</small></div>; })}</div>
                <div className="interpretation-strip"><div><span className="eyebrow">初轮记录</span><strong>{firstResults.filter((r) => r.side === '善').length} 善 · {firstResults.filter((r) => r.side === '恶').length} 恶 · {firstResults.filter((r) => r.side === '空白').length} 空白</strong></div><p>经文建议逐一思惟所现业相，与所观事项相验。请依所问事项观察、思惟所现业相。</p></div>
                <div className="board-footer"><button className="text-link" onClick={restartFirst} disabled={rolling}>{mode === 'example' ? '从礼敬前行重看示例' : '重新占察初轮'}</button><button className="btn btn-dark" onClick={() => { setSecondIndex(0); setCandidate(null); setStage('second'); }} disabled={rolling}>记录初轮结果，继续第二轮 <span>→</span></button></div>
              </>}
            </>}

            {stage === 'second' && <>
              <SectionTitle eyebrow="第二轮 · 三枚" title={mode === 'second' ? '分别看看身、口、意三轮' : '为已现业相察其久近强弱'} detail="长画 / 短画表示善业久近，粗深刻 / 细浅刻表示恶业久近；请按身、口、意类别分别使用对应木轮。" />
              <div className="face-legend">{(Object.entries(strengthFaces) as Array<[StrengthSide, typeof strengthFaces[StrengthSide]]>).map(([key, item]) => <div className={`face-chip ${item.tone}`} key={key}><span className={`mark-sample ${key}`} />{item.label}</div>)}</div>
              {mode === 'second' ? <><ThreeWheelTray wheels={secondPracticeWheels} label="请依第一轮所现业相，分别占察相应的身、口、意轮；不可一掷通占" rolling={rolling} rollingIds={rollingIds} className="tray-three" /><div className="practice-wheel-list">{(['身', '口', '意'] as Scope[]).map((scope) => <div className="practice-wheel-row" key={scope}><div><span className="eyebrow">对应轮</span><h3>{scope}轮</h3><small>主{scope}业 · 四面</small></div><span className="specimen-stamp">{scope}</span><div className="practice-result">{secondPractice[scope] ? <><strong>{strengthFaces[secondPractice[scope]!].label}</strong><p>{strengthFaces[secondPractice[scope]!].gloss}</p></> : <p>尚未起轮</p>}</div><button className="btn btn-outline" onClick={() => rollSecondPractice(scope)} disabled={rolling}>起轮占察 <span>↗</span></button></div>)}</div></> : activeItems.length === 0 ? <div className="empty-state"><div className="empty-seal">空</div><h3>初轮没有显出善恶记号</h3><p>按本次占察结果，第二轮没有待对应的业相。经典对“不现相”另有说明，此处不据空白推断个人状态。</p><button className="btn btn-dark" onClick={() => setStage('third')}>占察第三轮 <span>→</span></button></div> : secondIndex >= activeItems.length ? <div className="empty-state"><div className="empty-seal">记</div><h3>第二轮记录完成</h3><p>共对应 {activeItems.length} 条已现业相。传统仪轨说明身、口、意应分别掷轮，不以一掷通占。</p><ul className="saved-second-list">{activeItems.map((item) => { const saved = secondResults[item.id]; return saved ? <li key={item.id}><span>{item.karma.scope} · {item.side === '善' ? item.karma.good : item.karma.bad}</span><b>{strengthFaces[saved].label}</b></li> : null; })}</ul><button className="btn btn-dark" onClick={() => setStage('third')}>继续第三轮占察 <span>→</span></button></div> : <>
                <div className="current-match"><div className="match-counter"><span className="eyebrow">对应记录</span><strong>{chineseNumeral(secondIndex + 1)}<small> / {activeItems.length}</small></strong></div><div className="match-current"><span className="eyebrow">初轮所现 · {currentTask.karma.scope}业 · {currentTask.side}</span><h3>{currentTask.side === '善' ? currentTask.karma.good : currentTask.karma.bad}</h3><p>取用「{currentTask.karma.scope}轮」，依此项逐一观察。</p></div></div>
                <ThreeWheelTray wheels={[activeSecondWheel]} label={`第二轮 · ${currentTask.karma.scope}业轮相`} rolling={rolling} className="tray-single" />
                {candidate && <div className={`candidate-card ${strengthFaces[candidate].tone}`}><span className="candidate-mark">{candidate.startsWith('善') ? '善' : '恶'}</span><div><strong>{strengthFaces[candidate].label}</strong><p>{strengthFaces[candidate].gloss}</p>{candidateMatches && <small>与初轮善恶相应 · 这条可记入</small>}{!candidateMatches && <small className="mismatch">与初轮善恶不相应 · 经文视为不相应，不强行解释</small>}</div><span className="candidate-line" /></div>}
                <div className="board-footer">
                  <span className="source-ref">{candidate ? (candidateMatches ? '本次线上占得轮相' : '不相应时应回到礼敬前行，按所依仪轨重新占察；线上流程也可略过此项') : '随初轮所现业相逐项占察，不以一掷通占'}</span>
                  {!candidate ? <button className="btn btn-terracotta" onClick={rollSecond} disabled={rolling}>{rolling ? '木轮停驻中…' : `起轮占察${currentTask.karma.scope}轮`} <span>↗</span></button> : candidateMatches ? <button className="btn btn-dark" onClick={recordSecond} disabled={rolling}>{rolling ? '木轮停驻中…' : '记录相应轮相，继续占察 →'}</button> : <div className="inline-actions"><button className="quiet-button" onClick={() => { setCandidate(null); setStage('ritual'); setRitualIndex(0); }} disabled={rolling}>返回礼敬前行，重新开始占察</button><button className="btn btn-outline" onClick={skipSecond} disabled={rolling}>{rolling ? '木轮停驻中…' : '略过此项（不作判读）→'}</button></div>}
                </div>
              </>}
              {mode === 'complete' && secondIndex >= activeItems.length && skippedSecondCount > 0 && <div className="skip-summary" role="status" aria-live="polite"><strong>二轮未相应 · 略过不相应项（{skippedSecondCount} 项）</strong><p>以下项目与初轮善恶不相应，故略过且未作解释；没有把它们记成相应结果。</p><ul>{activeItems.filter((item) => skippedSecondIds.includes(item.id)).map((item) => <li key={item.id}>{item.karma.scope}业 · {item.side === '善' ? item.karma.good : item.karma.bad}</li>)}</ul></div>}
              {mode === 'second' && <div className="practice-footer"><span className="source-ref">单组占察：第二轮应依初轮结果取用相关业轮；如需查第三轮，可继续。</span><div className="inline-actions"><button className="btn btn-outline" onClick={() => startRun('third')}>占察第三轮 <span>→</span></button><button className="text-link" onClick={home}>结束本次占察 <span>→</span></button></div></div>}
            </>}

            {stage === 'third' && <>
              <SectionTitle eyebrow="第三轮 · 六枚 · 三掷" title="六枚齐掷，三次合成一个数" detail="线上程序按四面等概率抽取：每枚轮的三个数字面和一个空白面各占四分之一，空白记零。六枚同掷三次后合数；由于各枚对应的数字段不同，合数本身不是 1–189 均匀分布。" />
              <div className="roll-explainer"><Seal>三轮</Seal><p>六枚的数字依次覆盖 1–18。单次六轮最多显示 63；三次相加范围是 0–189。若三次六枚都没有显出数字，合计便为零。经文所列轮相为一至一百八十九条，未列合数为零的条目。</p></div>
              {mode === 'complete' && skippedSecondCount > 0 && <div className="soft-notice"><span>二轮略过</span><p>本次占察中有 {skippedSecondCount} 项与初轮不相应，已略过且未作解释；接下来的第三轮以三掷合数查对经文。</p></div>}
              <ThreeWheelTray wheels={thirdTrayWheels} label="第三组六枚、每枚三面中文数字和一面空白的木轮" rolling={rolling} className="tray-six" />
              <div className="third-dice-row">{faceSets.map((set, index) => { const latest = latestThirdTrial?.faces.find((x) => x.wheel === index + 1); return <div className="third-die" key={set[0]}><span>第 {chineseNumeral(index + 1)} 轮</span><strong>{latest ? latest.visible === null ? '空白' : chineseNumeral(latest.visible) : chineseFaceSets[index].join(' / ')}</strong></div>; })}</div>
              <div className="trial-stack">{thirdTrials.map((trial, index) => <div className="trial-row" key={`trial-${index}`}><span className="trial-index">第 {chineseNumeral(index + 1)} 掷</span><div className="trial-faces">{trial.faces.map((item) => <span className={item.visible ? 'visible-number' : 'blank-number'} key={item.wheel}>{item.visible === null ? '·' : chineseNumeral(item.visible)}</span>)}</div><strong>小计 <i>{chineseNumeral(trial.subtotal)}</i></strong></div>)}</div>
              <div className="sum-panel"><span>三掷合计</span><strong>{chineseNumeral(thirdTotal)}</strong><small>／ 一百八十九</small></div>
              <div className="board-footer"><button className="text-link" onClick={() => setThirdTrials([])} disabled={rolling}>清空本次三掷记录</button>{thirdTrials.length < 3 ? <button className="btn btn-terracotta" onClick={rollThird} disabled={rolling}>{rolling ? '正在起轮…' : `第 ${thirdTrials.length + 1} / 3 次起轮`} <span>↗</span></button> : <button className="btn btn-dark" onClick={() => setStage('result')} disabled={rolling}>合计并看经文条目 <span>→</span></button>}</div>
            </>}

            {stage === 'result' && <>
              <SectionTitle eyebrow="第三轮 · 对照经文" title={thirdTotal === 0 ? '三掷皆空白' : `合计 ${thirdTotal} · 轮相条目`} detail="下列文字依 CBETA《占察善恶业报经》电子本卷上条目，转为简体；它是历史经典文本，不是对你个人的预言。" />
              {mode === 'complete' && skippedSecondCount > 0 && <div className="soft-notice"><span>二轮记录</span><p>本次占察有 {skippedSecondCount} 项与初轮不相应，已略过且未作解释；本页条目只按第三轮三次合数查得。</p></div>}
              {thirdTotal === 0 || !resultSign ? <div className="no-result-card"><div className="empty-seal large">无</div><h3>三次都没有显数</h3><p>三次六枚都没有显出数字，合计为零。经文所列轮相为 1–189 条，没有合数为零的条目，本页因此不作条目判读，也不据此推断你的修行境界或个人经历。</p></div> : <div className="sign-card"><div className="sign-number"><small>{resultSign.period}条目</small><strong>{String(resultSign.number).padStart(3, '0')}</strong><i>／189</i></div><div className="sign-copy"><span className="eyebrow">《占察善恶业报经》卷上 · 轮相第 {resultSign.number}</span><blockquote>“{resultSign.textSimplified}。”</blockquote><div className="sign-translation"><span>现代译文</span><p>{resultSign.modernTranslation}</p></div>{(() => { const notes = classicalNotesFor(resultSign); return notes.length > 0 ? <div className="sign-translation sign-term-notes"><span>古语词小注</span><p>{notes.map((note) => `${note.term}：${note.gloss}`).join('；')}。词义说明不改写经文原句。</p></div> : null; })()}<div className="sign-scope-note"><b>{resultSign.period}段</b><p>{groupText(resultSign.period)}这里只呈现经文分类，不代表未来必然发生，也不判断用户的现实处境。</p></div></div></div>}
              <div className="calculation-details"><div className="calculation-head"><span className="eyebrow">计算明细</span><strong>六枚同时掷三次，记录合数</strong></div>{thirdTrials.map((trial, index) => <div className="calc-line" key={`calc-${index}`}><span>第 {index + 1} 掷</span>{trial.faces.map((face) => <i key={face.wheel}>{face.visible ?? '空'}</i>)}<b>= {trial.subtotal}</b></div>)}<div className="calc-total"><span>条目编号</span><strong>{thirdTotal}</strong></div></div>
              <div className="full-disclaimer"><Seal>边界</Seal><p>上面的轮相由{mode === 'example' ? '预设占察示例' : '线上程序随机起轮'}生成。线上起轮为暂时没有实体占察轮者提供线上占察；使用实体木轮时，请依实物和所依仪轨操作。本页呈现经文条目，不保证未来应验，也不替代医疗、法律、财务等专业判断。严肃修持请参照原典与正规佛教机构指导。</p></div>
              <div className="board-footer"><button className="text-link" onClick={() => mode === 'example' ? startExample() : (setThirdTrials([]), setStage('third'))}>{mode === 'example' ? '从礼敬前行重看示例' : '重新占察第三轮'}</button><div className="inline-actions"><button className="btn btn-outline" onClick={() => openStudy('text')}>翻阅一百八十九相</button><button className="btn btn-dark" onClick={() => startRun('complete')}>从礼敬前行重新占察 <span>↗</span></button></div></div>
            </>}
          </section>

          <aside className="annotation-rail"><div className="annotation-card"><span className="annotation-kicker">轮相札记</span><span className="annotation-seal">✳</span><h3>{stage === 'ritual' ? '至心，不是仪式表演' : stage === 'catalog' ? '十九枚，分三组' : stage === 'first' ? '十善恶，相对成对' : stage === 'second' ? '善恶相，分别核对' : stage === 'third' ? '总和，不超过一百八十九' : '记录不等于断言'}</h3><p>{stage === 'ritual' ? '本页呈现经文所述诵念与礼敬内容；进行占察前请依所依仪轨实际礼敬。经文原文与后代仪轨说明已分别标注。' : stage === 'catalog' ? '十枚看善恶，三枚看三业久近强弱，六枚查三世报相。不同组用途不同。' : stage === 'first' ? '善、恶与空白的显示要如实记录。不要为了得到想要的结果而反复挑选。' : stage === 'second' ? '第二组要看与初轮的业类、善恶是否相应。不相应时不替它做宿命化解释。' : stage === 'third' ? '每次六枚一起掷；三个小计相加才是条目序号。全部空白记作零。' : '经典原文、现代白话与线上起轮占察在结果页分层呈现。'}</p><div className="annotation-line"/><span className="annotation-foot">资料注记 · {stage === 'ritual' ? '卷上仪轨' : stage === 'third' || stage === 'result' ? '第三轮相' : '十九轮结构'}</span></div>
            <div className="quick-source"><span>依据经典</span><strong>《占察善恶业报经》</strong><small>菩提灯译 · 大正藏 T17 No.839</small><button className="text-link" onClick={() => openStudy('sources')}>查看版本与引用 <span>→</span></button></div>
          </aside>
        </div>
      </main>}

      {page === 'study' && <main className="study-page content-width">
        <section className="study-hero"><span className="eyebrow">占察法要略 · 经典与仪轨</span><h1>把轮相、仪轨与经文<br /><em>慢慢读清楚。</em></h1><p>本页将经文原义、后世法师讲解与线上占察功能分层标注，供了解木轮形制、占察次第与经文出处。</p><div className="study-toc"><a href="#shape">木轮形制</a><a href="#rules">三组规则</a><a href="#repentance">占察忏法</a><a href="#terms">术语释义</a><a href="#text">189条轮相</a><a href="#sources">资料来源</a></div></section>
        <section className="study-section" id="shape"><SectionTitle eyebrow="形制 · 经文原义" title="木轮，不是骰子" detail="经文说木轮“小指许”，长短不足一寸，中部四面方平，向两端斜削，让它易于转动。下方模型按四面长棱轮而非六面骰制作。" /><div className="shape-demo"><div className="shape-wheel"><ThreeWheelTray wheels={[firstWheelSpec(tenKarma[0])]} label="四面长棱形占察木轮三维结构示意" className="tray-single tray-shape" /></div><div className="shape-notes"><div><span>01</span><b>短小</b><p>如小指长，长度减于一寸。</p></div><div><span>02</span><b>中段方平</b><p>四个纵向主面，中段平直，并非圆骰。</p></div><div><span>03</span><b>两头渐斜</b><p>两端收尖，整体呈多面棱形，易于转动。</p></div></div></div><div className="source-quote">“正中令其四面方平，自余向两头斜渐去之，仰手傍掷，令使易转。”<small>—《占察善恶业报经》卷上 · 形制条</small></div><div className="visual-source-row"><a href="https://fo.sina.com.cn/o/2013-10-17/142913531.shtml" target="_blank" rel="noreferrer">打开检索到的新浪佛学实物图 ↗</a><span>以照片作样式参照；轮体由经文和可追溯说明校核，配色仅是网页辅助。</span></div><div className="colour-key"><span className="good">善面 · 朱色</span><span className="bad">恶面 · 墨色</span><p>原经未规定善恶面涂色；这里用朱、墨区分，第二组仍以画饰、刻痕以及长短深浅为原典标记。</p></div></section>
        <section className="study-section" id="rules"><SectionTitle eyebrow="十九枚 · 三种轮相" title="三组轮相，各有其用" detail="经典将其分为十、三、六三类。常见仪轨说明中，初轮与第二轮多用于观察十善恶及三业轻重，第三轮按三次合数对照条目。" /><div className="rule-columns">{wheelGroups.map((group) => <article className="rule-column" key={group.id}><div className="rule-count">{group.count}<small>枚</small></div><span className="eyebrow">{group.name}</span><p>{group.summary}</p>{group.id === 'first' && <div className="rule-pills"><span>身三</span><span>口四</span><span>意三</span></div>}{group.id === 'second' && <ul><li>长画 / 短画：善业</li><li>粗深刻 / 细浅刻：恶业</li></ul>}{group.id === 'third' && <ul><li>1–160：现世</li><li>161–171：过去世</li><li>172–189：未来世</li></ul>}</article>)}</div><div className="soft-notice"><span>关于完整流程</span><p>《占察经》分别说明三类轮相；后世修持说明也有“第一、二组”与“仅第三组”两种日常使用情形。本网页的全程入口为便于连续操作而串接三组，实际占察应依所问选择相关轮相，并按仪轨操作。</p></div></section>
        <section className="study-section repentance-section" id="repentance"><SectionTitle eyebrow="长期修持 · 与单次占察分开" title="占察忏法，有另一段修持次第" detail="以下按《占察善恶业报经》卷上 0903c17–0904b03 梳理经文所述忏悔法；它不是本网页单次占察的前行，也不是完整逐字科仪。要按完整行法实修，应另依《占察善恶业报经行法》原文及正规指导。" /><div className="repentance-flow"><article><span>一</span><div><h3>先观察业相，判断是否需要先修忏</h3><p>经文面向欲修禅定、无相智慧者：先以初轮观察宿世恶业多少轻重；若恶业多厚，劝先修忏悔法，不要直接把网页的随机轮相当作个人罪业诊断。</p></div></article><article><span>二</span><div><h3>备办静处与身心供养</h3><p>住静处，随力庄严一室，安置佛事与经法，悬幡盖、备香华供养；沐浴身体并洗净衣服，避免臭秽。经文要求“随力所能”，不应把器物丰俭当成修持资格。</p></div></article><article><span>三</span><div><h3>昼间三时礼敬、称名</h3><p>在室内每日三时称名；一心敬礼过去七佛、五十三佛；次第观想遍礼十方诸佛所有色身、舍利、形像、佛塔及一切佛事，再总礼十方三世诸佛、十方一切法藏与贤圣，最后另礼地藏菩萨。礼忏全文见行法原文。</p></div></article><article><span>四</span><div><h3>发露忏悔，继而劝请、随喜、回向</h3><p>礼毕说所作罪，仰告诸佛，发愿忏悔不再造；思惟罪性由虚妄颠倒心起，本性空寂；再发劝请、随喜、回向之愿。不可把这几项缩成一次泛泛祈福。</p></div></article><article><span>五</span><div><h3>静室称名与夜间用功，日日不废</h3><p>发愿后到另一静室端坐，一心称诵或默念地藏名号，减少睡眠；昏沉时可在道场旋绕诵念。夜间若能备灯烛，则三时供养、悔过、发愿；若不能，则在另一静室一心诵念。经文要求每日如是修行、不令懈废。</p></div></article><article><span>六</span><div><h3>七日后每日清晨，以第二轮检验三业</h3><p>经文说清净所需时间因业障与根性而异，可从七日、十四日至四十九日，也提到百日、二百日乃至千日；不是人人七日即成。开始修行满七日后，每日清晨用第二轮频三掷，身、口、意皆得纯善相，才称得清净相；不可用单次占察结果代替修行中的三业检验。</p></div></article></div><div className="soft-notice"><span>范围与出处</span><p>本段是经文流程提要，不是可直接照读的《占察忏》完整科仪。经文卷上原文见 CBETA 0903c17–0904b03；完整行法与每日功课请查看下方《占察善恶业报经行法》来源，并以合格佛教机构指导为准。三组连续轮相仍只是网页全程入口串联，不能代替长期修忏。</p></div></section>
        <section className="study-section" id="terms"><SectionTitle eyebrow="小词笺" title="先辨清几枚关键词" /><div className="term-list"><div><b>十善 / 十恶</b><p>身业三项、口业四项、意业三项；本页依经文将它们一一对应显示。</p></div><div><b>身、口、意</b><p>指行为、言语、念虑的分类；第二组按所对应的业类分别使用，不以三轮合掷通占。</p></div><div><b>相应 / 不相应</b><p>经文要求占得之相与所观、所思相合。不相应时称为“虚谬”，不是让读者强行套用结论。</p></div><div><b>空白</b><p>本页以空白面呈现“所掷未现字”的轮面。实际轮器结构与空面安排，需以具体制作及仪轨为准。</p></div><div><b>三世</b><p>传统佛教语境中的现世、过去世、未来世。这里仅按经文分类说明，不作可验证的人生预测。</p></div></div></section>
        <section className="study-section" id="text"><SectionTitle eyebrow="经文轮相 · 1—189" title="一百八十九条，逐条可查" detail="来源为 CBETA 电子版《占察善恶业报经》卷上。每条并列显示简体经文、传统字形和本页依据原文整理的现代白话译文；译文用于解释字面，不代替经文或判定个人处境。" />
          <div className="third-lookup"><div><span className="eyebrow">第三轮占察后的经文索引</span><h3>按三轮合数查条目</h3><p>若你已按所依仪轨完成三掷（线上或实体），可输入合数查阅对应经文及现代译文。此处只查经文编号，不替代占察，也不解释个人处境。</p></div><form onSubmit={lookupThirdSign}><label htmlFor="third-total">合数（0–189）</label><div className="third-lookup-controls"><input id="third-total" aria-describedby="third-lookup-help" type="number" inputMode="numeric" min="0" max="189" step="1" required value={lookupInput} onChange={(event) => setLookupInput(event.target.value)} /><button className="btn btn-dark" type="submit">查经文</button></div><small id="third-lookup-help">三次都没有显出数字时记为 0；经文轮相条目为 1–189。</small></form></div>
          {lookupNumber !== null && <div className="third-lookup-result" aria-live="polite">{lookupNumber === 0 ? <><strong>合数 0 · 三掷均未显数</strong><p>经文所列轮相为 1–189 条，没有合数为零的条目。</p></> : lookupSign ? <><strong>合数 {lookupNumber} · {lookupSign.period}条目</strong><blockquote>“{lookupSign.textSimplified}。”</blockquote><div className="lookup-translation"><b>现代译文</b><p>{lookupSign.modernTranslation}</p></div><p>{groupText(lookupSign.period)}这是经典条目索引，不是对个人现况或未来的判断。</p></> : <p>没有找到对应条文，请核对合数。</p>}</div>}
          <div className="sign-library-controls"><label className="search-field"><span>⌕</span><input value={searchText} onChange={(e) => { setSearchText(e.target.value); setPageNum(0); }} placeholder="搜索轮相原文、译文或序号" onKeyDown={(e) => eventBoundary(e, 'next')} /></label><div className="filter-chips">{['全部', '现世', '过去世', '未来世'].map((period) => <button className={filterPeriod === period ? 'filter-active' : ''} onClick={() => resetStudyFilter(period)} key={period}>{period}</button>)}</div></div><div className="sign-library">{pageSigns.map((sign) => <article className="library-entry" key={sign.number}><span>{String(sign.number).padStart(3, '0')}</span><div><strong>{sign.textSimplified}</strong><small>{sign.period} · {sign.textTraditional}</small><p className="library-translation"><b>现代译文</b>{sign.modernTranslation}</p></div><span className="library-mark">↗</span></article>)}</div><div className="library-pager"><span>显示 {sortedFilteredSigns.length ? pageNum * 24 + 1 : 0}–{Math.min((pageNum + 1) * 24, sortedFilteredSigns.length)} 条 · 共 {sortedFilteredSigns.length} 条</span><div><button onClick={() => setPageNum((n) => Math.max(0, n - 1))} disabled={pageNum === 0}>← 上一页</button><button onClick={() => setPageNum((n) => Math.min(Math.ceil(sortedFilteredSigns.length / 24) - 1, n + 1))} disabled={pageNum >= Math.ceil(sortedFilteredSigns.length / 24) - 1}>下一页 →</button></div></div></section>
        <section className="study-section sources-section" id="sources"><SectionTitle eyebrow="出处与版本" title="每条说明，都能回到出处" detail="三类资料在本页分别标注为经文原典、后代仪轨讲解或佛教机构讲解。" /><div className="source-list">{sources.map((source, index) => <article className="source-row" key={source.href}><div className="source-index">0{index + 1}</div><div className="source-content"><span className="eyebrow">{source.kind}</span><h3>{source.title}</h3><p>{source.note}</p></div><a href={source.href} target="_blank" rel="noreferrer" aria-label={`打开${source.title}`}>↗</a></article>)}</div><div className="full-disclaimer"><Seal>边界</Seal><p>木轮动画、随机结果、以及此网页的轮相词义小注都不是原典文字。经文病业、家庭或未来条目按原典文本呈现，不构成对个人现实的断言；不可代替就医、心理咨询、法律意见或其他现实专业帮助。严肃修持请依原典与正规佛教机构指导。</p></div></section>
      </main>}

      <footer className="site-footer"><div className="footer-left"><span className="footer-mark">✳</span><span>地藏占察法 · 木轮相法</span></div><span>以经为据 · 依仪轨占察 · 不作人生断言</span><button className="text-link" onClick={() => openStudy()}>资料与规则 <span>↗</span></button></footer>
      {page !== 'game' && <div className="mobile-bottom-bar"><button onClick={home}>首页</button><button onClick={() => openStudy()}>轮相图鉴</button><button onClick={() => startRun('complete')}>开始占察</button></div>}
    </div>
  );
}
