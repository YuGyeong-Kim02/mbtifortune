import OpenAI from 'openai';
import { NextResponse } from 'next/server';

type RequestPayload = {
  mbti?: string;
  concern?: string;
};

type FortuneResponse = {
  headline: string;
  fortune: string;
  actionSteps: string[];
  luckyItem: string;
  energyLevel: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FORTUNE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: {
      type: 'string',
      description: '점괘를 요약하는 한 줄 헤드라인',
    },
    fortune: {
      type: 'string',
      description: '오늘의 핵심 운세 설명',
    },
    actionSteps: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'string',
      },
      description: '실천 가능한 행동 루틴 3단계',
    },
    luckyItem: {
      type: 'string',
      description: '오늘의 행운을 끌어올 아이템',
    },
    energyLevel: {
      type: 'string',
      description: '높음/보통/낮음 중 하나',
    },
  },
  required: ['headline', 'fortune', 'actionSteps', 'luckyItem', 'energyLevel'],
} as const;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  let payload: RequestPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: '요청 본문을 읽을 수 없습니다.' },
      { status: 400 },
    );
  }

  const mbti = payload.mbti?.trim().toUpperCase() ?? '';
  const concern = payload.concern?.trim() ?? '';
  const mbtiPattern = /^[IE][NS][TF][JP]$/;

  if (!mbti || !mbtiPattern.test(mbti)) {
    return NextResponse.json(
      { error: '유효한 MBTI 유형을 선택해 주세요.' },
      { status: 400 },
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'fortune_schema',
          schema: FORTUNE_SCHEMA,
          strict: true,
        },
      },
      messages: [
        {
          role: 'system',
          content:
            '너는 감성적인 MBTI 기반 점성술가다. 모든 답변은 자연스러운 한국어로 작성하고, 사용자가 바로 행동으로 옮길 수 있는 조언을 제공한다.',
        },
        {
          role: 'user',
          content: `MBTI: ${mbti}
상황: ${concern || '특별한 고민은 적지 않았어요.'}

필수 규칙:
- 결과는 JSON 형식으로만 작성
- actionSteps는 3개의 짧고 실천적인 문장으로 구성
- energyLevel은 "높음", "보통", "낮음" 중 가장 어울리는 단어 사용`,
        },
      ],
    });

    const choice = completion.choices[0];
    // content can be a string or array of blocks depending on the model; widen to unknown first
    const message = choice?.message?.content as unknown;
    const rawContent =
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? (message as Array<{ text?: string }>)
              .map((block) =>
                block && typeof block === 'object' && 'text' in block && typeof block.text === 'string'
                  ? block.text
                  : '',
              )
              .join('\n')
          : '';

    if (!rawContent) {
      throw new Error('모델 응답이 비어 있습니다.');
    }

    const parsed = JSON.parse(rawContent) as FortuneResponse;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('fortune api error', error);
    return NextResponse.json(
      { error: '점괘 생성 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}
