import { openai } from "@workspace/integrations-openai-ai-server";
import { Router, type Request, type Response } from "express";

const router = Router();

interface MarketSummary {
  price: number;
  high24h: number;
  low24h: number;
  momentum: number;
  change24h: number;
}

interface HoldingSummary {
  shares: number;
  avgCost: number;
}

interface GameContext {
  cashUSD: number;
  balanceCrypto: number;
  cryptoPrice: number;
  portfolioValueUSD: number;
  holdings: Record<string, HoldingSummary>;
  market: Record<string, MarketSummary>;
  currentMood?: string;
  lastThreeActions?: string[];
  timeOfDay?: string;
  // Mining
  miningPowerPerSec?: number;
  clickValueBTC?: number;
  prestigeCount?: number;
  prestigeMultiplier?: number;
  totalEarnedUSD?: number;
  upgradesSummary?: string[];
  // Properties
  propertiesOwned?: number;
  propertyIncomePerHour?: number;
  propertyTotalInvested?: number;
  propertyWalletUSD?: number;
}

const STOCK_NAMES: Record<string, string> = {
  AAPL: "Apple",
  GOOGL: "Alphabet/Google",
  TSLA: "Tesla",
  AMZN: "Amazon",
  NVDA: "NVIDIA",
  META: "Meta",
  MSFT: "Microsoft",
  NFLX: "Netflix",
  DIS:  "Disney",
  MCD:  "McDonald's",
  NKE:  "Nike",
  KO:   "Coca-Cola",
  SBUX: "Starbucks",
  V:    "Visa",
  MA:   "Mastercard",
  AMD:  "AMD",
  INTC: "Intel",
  BABA: "Alibaba",
  SONY: "Sony",
  ORCL: "Oracle",
  JPM:  "JPMorgan Chase",
};

function fmt(n: number | undefined | null, dec = 2) {
  const safe = typeof n === "number" && isFinite(n) ? n : 0;
  return safe.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function buildSystemPrompt(ctx: GameContext): string {
  const btcValueUSD = ctx.balanceCrypto * ctx.cryptoPrice;
  const totalNet = ctx.cashUSD + btcValueUSD + ctx.portfolioValueUSD;

  // ── Stock holdings ────────────────────────────────────────────
  const holdingsLines = Object.entries(ctx.holdings)
    .filter(([, h]) => h.shares > 0.00001)
    .map(([sym, h]) => {
      const cur = ctx.market[sym]?.price ?? 0;
      const pnlPct = cur > 0 ? ((cur - h.avgCost) / h.avgCost) * 100 : 0;
      const sign = pnlPct >= 0 ? "+" : "";
      return `  ${sym} (${STOCK_NAMES[sym] ?? sym}): ${fmt(h.shares, 3)} shares @ avg $${fmt(h.avgCost)}, now $${fmt(cur)} (${sign}${fmt(pnlPct, 1)}%)`;
    });

  // ── Market snapshot — only top movers to save tokens ─────────
  const marketLines = Object.entries(ctx.market)
    .sort((a, b) => Math.abs(b[1].change24h) - Math.abs(a[1].change24h))
    .slice(0, 10)
    .map(([sym, m]) => {
      const trend = m.momentum > 0.06 ? "↑ BULL" : m.momentum < -0.06 ? "↓ BEAR" : "→ FLAT";
      const chg = m.change24h >= 0 ? `+${fmt(m.change24h, 1)}` : fmt(m.change24h, 1);
      return `  ${sym}: $${fmt(m.price)} ${chg}% 24h ${trend}`;
    });

  // ── Mining summary ────────────────────────────────────────────
  const miningLines: string[] = [];
  if ((ctx.miningPowerPerSec ?? 0) > 0) {
    miningLines.push(`  Passive: ${fmt(ctx.miningPowerPerSec ?? 0, 4)} BTC/s (~$${fmt((ctx.miningPowerPerSec ?? 0) * ctx.cryptoPrice, 2)}/s)`);
  }
  if ((ctx.clickValueBTC ?? 0) > 0) {
    miningLines.push(`  Click: ${fmt(ctx.clickValueBTC ?? 0, 4)} BTC/tap`);
  }
  if ((ctx.prestigeCount ?? 0) > 0) {
    miningLines.push(`  Prestige: ${ctx.prestigeCount}× (×${fmt(ctx.prestigeMultiplier ?? 1, 1)} multiplier)`);
  }
  if ((ctx.upgradesSummary ?? []).length > 0) {
    miningLines.push(`  Upgrades: ${(ctx.upgradesSummary ?? []).join(", ")}`);
  }

  // ── Property summary ─────────────────────────────────────────
  const propLines: string[] = [];
  if ((ctx.propertiesOwned ?? 0) > 0) {
    propLines.push(`  Owned: ${ctx.propertiesOwned} building(s), total invested $${fmt(ctx.propertyTotalInvested ?? 0, 0)}`);
    propLines.push(`  Rent income: $${fmt(ctx.propertyIncomePerHour ?? 0, 2)}/hr`);
    if ((ctx.propertyWalletUSD ?? 0) > 0.01) {
      propLines.push(`  Uncollected rent: $${fmt(ctx.propertyWalletUSD ?? 0, 2)}`);
    }
  }

  const actions = (ctx.lastThreeActions ?? []).join(", ") || "browsing";

  return `You are CIPHER — a sharp AI companion inside Crypto Empire Tycoon. Think: brilliant street-smart friend who knows everything.

LANGUAGE: Match the user's language exactly. Czech → Czech. English → English. Mixed → match the mix. This overrides everything.

PERSONALITY: Talk about anything — life, science, jokes, philosophy, random thoughts. Don't robotically steer every conversation back to the game. Be a real companion.

PLAYER ACCOUNT (live, accurate — use these exact numbers):
Cash: $${fmt(ctx.cashUSD)} | BTC: ${fmt(ctx.balanceCrypto, 6)} (=$${fmt(btcValueUSD)}) | Stocks: $${fmt(ctx.portfolioValueUSD)} | Net worth: $${fmt(totalNet)}
Total ever earned: $${fmt(ctx.totalEarnedUSD ?? 0)}

STOCK HOLDINGS:
${holdingsLines.length > 0 ? holdingsLines.join("\n") : "None."}

TOP MOVERS:
${marketLines.join("\n")}

MINING:
${miningLines.length > 0 ? miningLines.join("\n") : "No upgrades yet."}

REAL ESTATE:
${propLines.length > 0 ? propLines.join("\n") : "No properties yet."}

RULES:
- Plain text only. No markdown, no asterisks, no bullet dashes, no headers.
- 2-4 sentences max unless asked for more.
- For investment questions: concrete BUY/HOLD/SELL using the real numbers above.
- Never invent numbers. Only use the data shown above.
- No hollow openers. Get straight to the point.`;
}

async function fetchReply(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  log: Request["log"]
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 500,
    messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-20)],
    stream: false,
  });

  const content = completion.choices[0]?.message?.content ?? "";
  if (!content) {
    log?.warn({ finishReason: completion.choices[0]?.finish_reason }, "Model returned empty content");
  }
  return content;
}

router.post("/openai/chat", async (req: Request, res: Response) => {
  const { messages, gameContext } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    gameContext: GameContext;
  };

  if (!Array.isArray(messages) || !gameContext) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const systemPrompt = buildSystemPrompt(gameContext);
    let content = await fetchReply(systemPrompt, messages, req.log);

    // If model returned empty, retry once with a simplified fallback prompt
    if (!content) {
      req.log?.warn("First attempt returned empty — retrying with fallback prompt");

      const fallbackPrompt = `You are CIPHER, a friendly AI assistant in a crypto tycoon game. Reply naturally and helpfully. IMPORTANT: Always respond in the same language the user writes in. If they write Czech, reply in Czech. If English, reply in English.

Player data: Cash $${gameContext.cashUSD.toFixed(2)}, BTC: ${gameContext.balanceCrypto} coins, Portfolio: $${gameContext.portfolioValueUSD.toFixed(2)}.`;

      content = await fetchReply(fallbackPrompt, messages, req.log);
    }

    // Final hard fallback
    if (!content) {
      req.log?.error("Both attempts returned empty content from model");
      const lastMsg = messages[messages.length - 1]?.content ?? "";
      const isLikelyCzech =
        /[áéíóúůčďěňřšťž]/i.test(lastMsg) ||
        /\b(jak|mam|koupit|mas|jsem|ahoj|dobry|proc|co|jaky)\b/i.test(lastMsg);
      content = isLikelyCzech
        ? "Omlouvám se, momentálně mám technické potíže. Zkus to znovu za chvilku, Tycoon."
        : "Sorry, I hit a snag. Give me a second and try again, Tycoon.";
    }

    res.json({ content });
  } catch (err) {
    req.log?.error(err, "OpenAI chat error");
    res.status(500).json({ error: "AI service unavailable. Try again in a moment." });
  }
});

export default router;
