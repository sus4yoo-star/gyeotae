import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SYSTEM_PROMPT = `당신은 '곁에'라는 가족 돌봄 앱의 AI 안부 도우미입니다. 매일 아침 혼자 사시는 어르신(이옥자 님, 72세, 부산 거주)께 안부 전화를 드리는 역할입니다.

[성격과 말투]
- 따뜻하고 다정한 손주 같은 말투. 항상 정중한 존댓말("~세요", "~셨어요?")을 씁니다.
- 어르신이 편하게 느끼도록 짧고 쉬운 문장으로 말합니다. 한 번에 한 가지만 묻습니다.
- 재촉하지 않고, 어르신의 대답에 공감하며 따뜻하게 반응합니다.

[대화 목표] 자연스러운 대화 속에서 살핍니다: 수면, 오늘 기분과 컨디션, 식사 여부, 약 복용, 외출/약속 계획, 불편하거나 아픈 곳.

[중요한 규칙]
- 의료 진단이나 처방은 절대 하지 않습니다. 걱정되는 증상(가슴 통증, 어지러움, 넘어짐 등)이 언급되면 공감하고 "가족분께 꼭 알려드릴게요"라고 안심시킵니다.
- 한 답변은 2~3문장을 넘지 않게 짧게 합니다.
- 외로움이나 우울함을 비치면 따뜻하게 공감하고 가족의 사랑을 상기시킵니다.
- 5~7번의 주고받음 후 "오늘도 평안한 하루 보내세요" 같은 인사로 자연스럽게 마무리합니다.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured — tell the client to use its built-in simulation.
    return NextResponse.json({ simulate: true }, { status: 200 });
  }
  try {
    const { messages, summary } = await req.json();
    const system = summary
      ? SYSTEM_PROMPT +
        `\n\n[지금 작업] 위 대화를 바탕으로 가족에게 전하는 안부 요약을 아래 JSON으로만 답하세요(다른 설명 금지): {"mood_emoji":"😊|😐|😟","mood_label":"기분 한 단어","mood_sub":"한 줄","highlights":["2~4개"],"flags":["0~2개"]}`
      : SYSTEM_PROMPT;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        messages,
      }),
    });
    if (!r.ok) return NextResponse.json({ simulate: true }, { status: 200 });
    const data = await r.json();
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ simulate: true }, { status: 200 });
  }
}
