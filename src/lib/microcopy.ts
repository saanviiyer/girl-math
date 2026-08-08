import { formatMoney } from './mathEngine'

/** Playful "girl math" line for what happened today. */
export function girlMathLine(net: number, currency: string): string {
  const abs = formatMoney(Math.abs(net), currency)
  if (net > 0) {
    const lines = [
      `you didn't spend ${abs} today, so really you MADE ${abs} 💅`,
      `${abs} under budget = ${abs} of free money. that's just science.`,
      `staying in tonight? that's ${abs} in the bank, bestie.`,
      `you saved ${abs}. treat yourself later, you've earned it.`,
    ]
    return pick(lines, net)
  }
  if (net < 0) {
    const lines = [
      `over by ${abs}, but future you will handle that. it's fine.`,
      `spent ${abs} extra — borrowing from your fabulous surplus.`,
      `${abs} over budget. we don't do guilt here, we do vibes.`,
    ]
    return pick(lines, net)
  }
  return `right on budget today. balanced, as all things should be.`
}

/** Headline vibe for the banked surplus number. */
export function surplusVibe(surplus: number): string {
  if (surplus > 0) return `basically free money you already earned by being sensible`
  if (surplus < 0) return `you're spending ahead — reel it in and the surplus bounces back`
  return `fresh start. every dollar you don't spend becomes surplus`
}

/** Encouraging streak copy. */
export function streakLine(streak: number): string {
  if (streak <= 0) return `no streak yet — a calm spending day starts one`
  if (streak === 1) return `1 day under budget. a legend is born.`
  if (streak < 7) return `${streak} days under budget and counting 🔥`
  if (streak < 30) return `${streak}-day streak. genuinely iconic behavior.`
  return `${streak} days?! you are the girl math final boss 👑`
}

export function surplusHeadline(surplus: number, currency: string): string {
  return formatMoney(surplus, currency)
}

function pick<T>(arr: T[], seed: number): T {
  const i = Math.abs(Math.round(seed * 100)) % arr.length
  return arr[i]
}
