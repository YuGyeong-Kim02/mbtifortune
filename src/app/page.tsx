'use client';

import { FormEvent, useMemo, useState } from 'react';
import styles from './page.module.css';

const MBTI_TYPES = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
] as const;

const PRESET_CONCERNS = [
  '새로운 프로젝트를 시작했는데 방향성을 잡고 싶어요.',
  '친구와의 감정적 갈등을 부드럽게 풀고 싶어요.',
  '오늘 중요한 발표가 있는데 마음을 다잡고 싶어요.',
];

type FortuneResponse = {
  headline: string;
  fortune: string;
  actionSteps: string[];
  luckyItem: string;
  energyLevel: string;
};

export default function Home() {
  const [mbti, setMbti] = useState('');
  const [concern, setConcern] = useState('');
  const [fortune, setFortune] = useState<FortuneResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const energyTone = useMemo(() => {
    if (!fortune) return null;
    const normalized = fortune.energyLevel.trim();
    if (normalized.includes('높')) return 'high';
    if (normalized.includes('낮')) return 'low';
    return 'mid';
  }, [fortune]);
  const energyClass = useMemo(() => {
    if (!energyTone) return '';
    const map: Record<'high' | 'mid' | 'low', 'energyHigh' | 'energyMid' | 'energyLow'> = {
      high: 'energyHigh',
      mid: 'energyMid',
      low: 'energyLow',
    };
    return styles[map[energyTone]];
  }, [energyTone]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mbti) {
      setError('MBTI 유형을 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mbti, concern }),
      });

      const payload = (await response.json().catch(() => null)) as
        | FortuneResponse
        | { error?: string }
        | null;

      if (!response.ok || !payload) {
        throw new Error(
          (payload as { error?: string })?.error ??
            '점괘를 가져오는 중 문제가 발생했어요.',
        );
      }

      setFortune(payload as FortuneResponse);
      setLastUpdated(
        new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : '알 수 없는 오류가 발생했어요.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.badge}>오늘의 기류</p>
          <h1>
            MBTI 기반 포춘텔러와
            <br />
            나만의 점괘 만들기
          </h1>
          <p className={styles.description}>
            성격 유형과 지금의 고민을 들려주면, OpenAI가 맞춤형 메시지를
            전합니다. 오늘의 에너지와 어울리는 행동 루틴도 함께 받아보세요.
          </p>
          <div className={styles.heroStats}>
            <div>
              <strong>16</strong>
              <span>MBTI 유형</span>
            </div>
            <div>
              <strong>3단계</strong>
              <span>행동 루틴</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>한국어 응답</span>
            </div>
          </div>
        </section>

        <section className={styles.content}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="mbti">MBTI 선택</label>
              <div className={styles.selectWrapper}>
                <select
                  id="mbti"
                  value={mbti}
                  onChange={(event) => setMbti(event.target.value)}
                  required
                >
                  <option value="">유형을 골라주세요</option>
                  {MBTI_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="concern">상황이나 고민</label>
              <textarea
                className={styles.textarea}
                id="concern"
                placeholder="지금 떠오르는 감정, 계획, 고민을 짧게 적어 주세요."
                value={concern}
                onChange={(event) => setConcern(event.target.value)}
                rows={5}
              />
            </div>

            <div className={styles.presets}>
              {PRESET_CONCERNS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setConcern(preset)}
                  disabled={isLoading}
                >
                  {preset}
                </button>
              ))}
            </div>

            {error ? <p className={styles.errorMsg}>{error}</p> : null}

            <button
              className={styles.submitButton}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? '점괘 생성 중...' : '오늘의 점괘 듣기'}
            </button>
          </form>

          <aside className={styles.resultCard}>
            {fortune ? (
              <>
                <div className={styles.resultHeader}>
                  <span className={styles.tag}>{mbti}</span>
                  <span className={`${styles.energy} ${energyClass}`}>
                    에너지: {fortune.energyLevel}
                  </span>
                </div>
                <h2>{fortune.headline}</h2>
                <p className={styles.fortuneCopy}>{fortune.fortune}</p>
                <div className={styles.steps}>
                  <p>추천 행동 루틴</p>
                  <ol>
                    {fortune.actionSteps.map((step, index) => (
                      <li key={step + index}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div className={styles.meta}>
                  <span>
                    🎁 럭키 아이템 <strong>{fortune.luckyItem}</strong>
                  </span>
                  {lastUpdated ? (
                    <span>⏱ {lastUpdated} 업데이트</span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className={styles.placeholder}>
                <h2>점괘를 기다리고 있어요</h2>
                <p>
                  MBTI와 지금의 상황을 들려주면, 인공지능 점술사가 오늘의 운세와
                  실전 팁을 건네줄 거예요.
                </p>
                <ul>
                  <li>MBTI만 입력해도 기본 운세 제공</li>
                  <li>고민을 적을수록 더 정교한 메시지</li>
                  <li>모든 응답은 순수 한국어</li>
                </ul>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
