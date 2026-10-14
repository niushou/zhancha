export type KarmaSide = '善' | '恶' | '空白';
export type Scope = '身' | '口' | '意';
export type FirstFaceIndex = 0 | 1 | 2 | 3;

export interface TenKarma {
  id: number;
  scope: Scope;
  good: string;
  bad: string;
}

export const tenKarma: TenKarma[] = [
  { id: 1, scope: '身', good: '不杀生', bad: '杀生' },
  { id: 2, scope: '身', good: '不偷盗', bad: '偷盗' },
  { id: 3, scope: '身', good: '不邪淫', bad: '邪淫' },
  { id: 4, scope: '口', good: '不妄语', bad: '妄语' },
  { id: 5, scope: '口', good: '不两舌', bad: '两舌' },
  { id: 6, scope: '口', good: '不恶口', bad: '恶口' },
  { id: 7, scope: '口', good: '不绮语', bad: '绮语' },
  { id: 8, scope: '意', good: '不贪欲', bad: '贪欲' },
  { id: 9, scope: '意', good: '不嗔恚', bad: '嗔恚' },
  { id: 10, scope: '意', good: '不邪见', bad: '邪见' },
];

export type StrengthSide = '善久强' | '善近弱' | '恶久强' | '恶近弱';

export const strengthFaces: Record<StrengthSide, { label: string; gloss: string; tone: 'good' | 'bad' }> = {
  善久强: { label: '长画 · 善业', gloss: '长而粗的善业画：经文以此表示积善较久、行业较强。', tone: 'good' },
  善近弱: { label: '短画 · 善业', gloss: '短而细的善业画：经文以此表示积善较近、力量较微。', tone: 'good' },
  恶久强: { label: '深刻 · 恶业', gloss: '粗深的恶业刻：经文以此表示习恶较久、所作增上。', tone: 'bad' },
  恶近弱: { label: '浅刻 · 恶业', gloss: '细浅的恶业刻：经文以此表示习恶较近、尚未增上。', tone: 'bad' },
};

export const wheelGroups = [
  {
    id: 'first', name: '初轮 · 十善恶', count: 10,
    summary: '四个纵向轮面：一面记十善之一，对面记相应十恶，另两面空白。按身三、口四、意三归类。',
  },
  {
    id: 'second', name: '第二轮 · 三业轻重', count: 3,
    summary: '身、口、意各主一轮，四面分别刻画：长画、短画、粗深刻、细浅刻。',
  },
  {
    id: 'third', name: '第三轮 · 三世果报', count: 6,
    summary: '六轮各有三个连续数字面和一个空白面；六轮一起掷三次，将显示数字相加。',
  },
] as const;

/** 取 [0, bound) 内均匀整数；四面轮使用 2 个随机低位，拒绝采样保留通用无偏实现。 */
function drawUniformIndex(bound: number): number {
  if (!Number.isInteger(bound) || bound < 1 || bound > 0x1_0000_0000) {
    throw new RangeError('随机范围必须是 1 到 2^32 之间的整数');
  }

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    try {
      const range = 0x1_0000_0000;
      const limit = Math.floor(range / bound) * bound;
      const sample = new Uint32Array(1);
      do {
        cryptoApi.getRandomValues(sample);
      } while (sample[0] >= limit);
      return sample[0] % bound;
    } catch {
      // Keep the browser flow usable in restricted contexts without Web Crypto.
    }
  }

  return Math.floor(Math.random() * bound);
}

/** 四个纵向轮面各占 1/4：一善、一恶、两空白；同时返回面号供 3D 动画对准。 */
export function drawTenKarma(): { side: KarmaSide; face: FirstFaceIndex } {
  const face = drawUniformIndex(4) as FirstFaceIndex;
  return { side: face === 0 ? '善' : face === 1 ? '恶' : '空白', face };
}

export function drawStrength(): StrengthSide {
  const faces: StrengthSide[] = ['善久强', '善近弱', '恶久强', '恶近弱'];
  return faces[drawUniformIndex(faces.length)];
}

/** 六枚独立均匀抽取四面，每面各 1/4；三掷合数范围 0–189，但合数本身不均匀。 */
export function drawThirdThrow(): Array<{ wheel: number; visible: number | null }> {
  return Array.from({ length: 6 }, (_, index) => {
    const face = drawUniformIndex(4);
    return { wheel: index + 1, visible: face < 3 ? index * 3 + face + 1 : null };
  });
}

const chineseDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function chineseNumeral(number: number): string {
  if (!Number.isInteger(number) || number < 0 || number > 189) return String(number);
  if (number >= 100) {
    const remainder = number - 100;
    if (remainder === 0) return '一百';
    if (remainder < 10) return `一百零${chineseDigits[remainder]}`;
    const ten = Math.floor(remainder / 10);
    const unit = remainder % 10;
    return `一百${chineseDigits[ten]}十${unit ? chineseDigits[unit] : ''}`;
  }
  if (number < 10) return chineseDigits[number];
  if (number < 20) return number === 10 ? '十' : `十${chineseDigits[number - 10]}`;
  const ten = Math.floor(number / 10);
  const unit = number % 10;
  return `${chineseDigits[ten]}十${unit ? chineseDigits[unit] : ''}`;
}

export function faceSetsChinese(): [string, string, string][] {
  return Array.from({ length: 6 }, (_, index) => [
    chineseNumeral(index * 3 + 1),
    chineseNumeral(index * 3 + 2),
    chineseNumeral(index * 3 + 3),
  ]);
}
