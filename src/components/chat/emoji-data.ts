export interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: string[];
}

/** Reações rápidas exibidas ao reagir a uma mensagem. */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Segmenta por grafema para não quebrar emojis compostos (❤️, 😮‍💨, 🖐️...)
const split = (s: string): string[] => {
  const clean = s.replace(/\s+/g, "");
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (t: string) => Iterable<{ segment: string }> };
  }).Segmenter;
  if (!Segmenter) return Array.from(clean);
  return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(clean), (x) => x.segment);
};

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "faces",
    label: "Carinhas",
    icon: "😀",
    emojis: split(`😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😙😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬😮‍💨🤥😌😔😪🤤😴😷🤒🤕🤢🤮🥵🥶🥴😵🤯🤠🥳😎🤓🧐😕😟🙁☹️😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👻👽🤖`),
  },
  {
    id: "gestures",
    label: "Gestos",
    icon: "👍",
    emojis: split(`👍👎👊✊🤛🤜👏🙌👐🤲🤝🙏✍️💅🤳💪🦾👋🤚🖐️✋🖖👌🤌🤏✌️🤞🤟🤘🤙👈👉👆👇☝️👀👁️🧠🫶🫡🫠`),
  },
  {
    id: "hearts",
    label: "Corações",
    icon: "❤️",
    emojis: split(`❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟♥️😻💌`),
  },
  {
    id: "celebration",
    label: "Festa",
    icon: "🎉",
    emojis: split(`🎉🎊🎈🎁🏆🥇🥈🥉🏅🎖️🎯🎓📚📖✏️📝📌📎💡🔔📣📢🚀⭐🌟✨💫🔥💯✅❌⚠️❓❗💬💭🗓️⏰⌛`),
  },
  {
    id: "nature",
    label: "Natureza",
    icon: "🌱",
    emojis: split(`🌱🌿🍀🌳🌴🌵🌷🌹🌻🌼🌸🍁☀️🌤️⛅🌈☔⚡❄️🌙🌍🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦄🐝🦋🐢🐬🐳`),
  },
  {
    id: "food",
    label: "Comida",
    icon: "🍕",
    emojis: split(`🍎🍐🍊🍋🍌🍉🍇🍓🍒🍑🥭🍍🥥🥑🍅🥕🌽🍞🧀🍳🥞🍔🍟🍕🌭🥪🌮🌯🍝🍜🍣🍦🍩🍪🎂🍰🍫🍿☕🍵🥤🍺🍷🥂`),
  },
  {
    id: "objects",
    label: "Objetos",
    icon: "💻",
    emojis: split(`💻🖥️⌨️🖱️📱☎️📷🎥🎧🎤📺🔋🔌💾📁📂📊📈📉🗂️🔍🔒🔑🛠️⚙️🧩📧✉️📦💰💳🏠🚗✈️🚲⚽🏀🎮🎵🎶`),
  },
];

export const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

const RECENT_KEY = "treina:recent-emojis";
const MAX_RECENT = 16;

export function getRecentEmojis(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function rememberEmoji(emoji: string): void {
  try {
    const next = [emoji, ...getRecentEmojis().filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento: ignora */
  }
}
