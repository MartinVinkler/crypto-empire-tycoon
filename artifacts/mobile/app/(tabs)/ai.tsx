import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAds, BOOST_DEFS, BoostType } from "@/context/AdContext";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { useSFX } from "@/hooks/useSFX";
import { useProperties } from "@/hooks/useProperties";
import { UPGRADES } from "@/data/constants";

// ── Types ──────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  streaming: boolean;
  error?: boolean;
}

type Colors = ReturnType<typeof useColors>;

// ── Helpers ────────────────────────────────────────────────────────────────

function getApiBase(): string {
  if (Platform.OS === "web") return "";
  const host =
    (Constants.expoConfig?.extra?.mapHost as string | undefined) ?? "";
  return host ? `https://${host}` : "";
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return "late night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function getMood(totalNet: number): string {
  if (totalNet >= 1_000_000) return "WHALE MODE — seven figures";
  if (totalNet >= 500_000) return "CRUSHING IT — half a million";
  if (totalNet >= 100_000) return "ON THE RISE — six figures";
  if (totalNet >= 10_000) return "BUILDING — five figures in play";
  if (totalNet >= 1_000) return "GRINDING — early empire";
  return "STARTING — empire begins from zero";
}

function buildDynamicGreeting(
  totalNet: number,
  timeOfDay: string,
  btcBal: number,
  holdingCount: number
): string {
  const timeTag =
    timeOfDay === "morning"
      ? "Morning, Tycoon."
      : timeOfDay === "afternoon"
        ? "Afternoon, boss."
        : timeOfDay === "evening"
          ? "Evening."
          : timeOfDay === "late night"
            ? "Burning the midnight oil?"
            : "Night shift grind.";

  const wealthLine =
    totalNet >= 1_000_000
      ? `You're a millionaire — ${fmtShort(totalNet)} net worth. What's next?`
      : totalNet >= 100_000
        ? `${fmtShort(totalNet)} net worth. Getting serious.`
        : totalNet >= 10_000
          ? `${fmtShort(totalNet)} in the game. Empire's taking shape.`
          : `${fmtShort(totalNet)} net worth. Every empire starts somewhere.`;

  const contextHint =
    btcBal > 0 && holdingCount > 0
      ? "Got your BTC and stock positions loaded."
      : btcBal > 0
        ? "I see you're stacking BTC."
        : holdingCount > 0
          ? `${holdingCount} stock position${holdingCount > 1 ? "s" : ""} in play.`
          : "Cash ready to deploy — no positions yet.";

  const greetings = [
    `${timeTag} CIPHER online. ${wealthLine} ${contextHint} What are we working on?`,
    `CIPHER ready. ${wealthLine} ${contextHint} Ask me anything.`,
    `${timeTag} ${wealthLine} ${contextHint} What's the move?`,
    `CIPHER live. ${contextHint} ${wealthLine} Ready when you are, Legend.`,
  ];

  const idx = Math.floor(Date.now() / 1000) % greetings.length;
  return greetings[idx];
}

function inferLastActions(game: ReturnType<typeof useGame>): string[] {
  const actions: string[] = [];
  const holdingCount = Object.values(game.holdings).filter(
    (h) => h.shares > 0.00001
  ).length;
  if (game.balanceCrypto > 0) actions.push("Mining BTC");
  if (holdingCount > 0)
    actions.push(`Holding ${holdingCount} stock${holdingCount > 1 ? "s" : ""}`);
  if (game.cashUSD < 100) actions.push("Nearly fully deployed");
  else if (game.cashUSD > 5000) actions.push("Sitting on cash");
  return actions.slice(0, 3);
}

// ── Typing indicator — pulsing "CIPHER IS THINKING..." ────────────────────

function CipherThinking({ c }: { c: Colors }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 650, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.thinkingPill,
        {
          borderColor: c.electric + "66",
          backgroundColor: c.electric + "12",
          opacity,
        },
      ]}
    >
      <MaterialCommunityIcons name="cpu-64-bit" size={12} color={c.electric} />
      <Text style={[styles.thinkingTxt, { color: c.electric }]}>
        CIPHER IS THINKING...
      </Text>
    </Animated.View>
  );
}

// ── Chat bubble ─────────────────────────────────────────────────────────────

function Bubble({ msg, c }: { msg: ChatMessage; c: Colors }) {
  const isUser = msg.role === "user";
  const isThinking = msg.streaming && msg.content === "";

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      {!isUser && (
        <View
          style={[
            styles.avatar,
            { backgroundColor: c.electric + "22", borderColor: c.electric + "55" },
          ]}
        >
          <MaterialCommunityIcons name="robot" size={13} color={c.electric} />
        </View>
      )}

      {isThinking ? (
        <CipherThinking c={c} />
      ) : (
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: c.neon + "1a", borderColor: c.neon + "55" }
              : msg.error
                ? { backgroundColor: "#ff4d4d14", borderColor: "#ff4d4d44" }
                : { backgroundColor: c.bgElevated, borderColor: c.border },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              {
                color: isUser
                  ? c.neon
                  : msg.error
                    ? "#ff6b6b"
                    : c.text,
              },
            ]}
          >
            {msg.content}
            {msg.streaming && <Text style={{ color: c.electric }}>▌</Text>}
          </Text>
        </View>
      )}

      {isUser && (
        <View
          style={[
            styles.avatar,
            { backgroundColor: c.neon + "22", borderColor: c.neon + "55" },
          ]}
        >
          <MaterialCommunityIcons name="account" size={13} color={c.neon} />
        </View>
      )}
    </View>
  );
}

// ── Cipher sponsor styles ────────────────────────────────────────────────────

const csStyles = StyleSheet.create({
  sponsorBar: {
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  sponsorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sponsorHeaderText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#FFD700",
  },
  sponsorChipsRow: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: "center",
  },
  sponsorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  sponsorChipLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  sponsorChipSub: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
});

// ── Suggested questions ─────────────────────────────────────────────────────

const SUGGESTED = [
  "Should I buy stocks?",
  "What's my net worth?",
  "Give me a $1M strategy",
  "Best stock right now?",
  "Analyze my portfolio",
  "Is BTC worth holding?",
  "How do I look? 😄",
  "What would you recommend?",
  "How are you?",
];

// ── Main screen ─────────────────────────────────────────────────────────────

export default function AiScreen() {
  const c = useColors();
  const game = useGame();
  const { playClick } = useSFX();
  const props = useProperties();
  const ads = useAds();

  const greeting = useMemo(() => {
    const btcVal = game.balanceCrypto * game.cryptoPrice;
    const totalNet = game.cashUSD + btcVal + game.portfolioValueUSD;
    const holdingCount = Object.values(game.holdings).filter(
      (h) => h.shares > 0.00001
    ).length;
    return buildDynamicGreeting(
      totalNet,
      getTimeOfDay(),
      game.balanceCrypto,
      holdingCount
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // computed once per tab open

  const INIT_MSG: ChatMessage = useMemo(
    () => ({
      id: "cipher-greeting",
      role: "assistant",
      streaming: false,
      content: greeting,
    }),
    [greeting]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([INIT_MSG]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  const buildGameContext = useCallback(() => {
    const mkt: Record<
      string,
      {
        price: number;
        high24h: number;
        low24h: number;
        momentum: number;
        change24h: number;
      }
    > = {};

    Object.entries(game.market).forEach(([sym, s]) => {
      const dayOpenIdx = Math.max(0, s.history.length - 289);
      const dayOpen = s.history[dayOpenIdx] ?? s.price;
      mkt[sym] = {
        price: s.price,
        high24h: s.high24h,
        low24h: s.low24h,
        momentum: s.momentum,
        change24h: dayOpen > 0 ? ((s.price - dayOpen) / dayOpen) * 100 : 0,
      };
    });

    const btcVal = game.balanceCrypto * game.cryptoPrice;
    const totalNet = game.cashUSD + btcVal + game.portfolioValueUSD;

    // Summarise owned upgrades for the AI
    const upgradesSummary = UPGRADES
      .map((u) => {
        const lvl = game.ownedUpgrades[u.id] ?? 0;
        return lvl > 0 ? `${u.name} Lv${lvl}` : null;
      })
      .filter(Boolean) as string[];

    // Compute avgCost per share (server interface expects avgCost, not totalCostUSD)
    const holdingsSummary: Record<string, { shares: number; avgCost: number }> = {};
    Object.entries(game.holdings).forEach(([sym, h]) => {
      if (h && h.shares > 0.00001) {
        holdingsSummary[sym] = {
          shares: h.shares,
          avgCost: h.totalCostUSD / h.shares,
        };
      }
    });

    return {
      cashUSD: game.cashUSD,
      balanceCrypto: game.balanceCrypto,
      cryptoPrice: game.cryptoPrice,
      portfolioValueUSD: game.portfolioValueUSD,
      holdings: holdingsSummary,
      market: mkt,
      currentMood: getMood(totalNet),
      lastThreeActions: inferLastActions(game),
      timeOfDay: getTimeOfDay(),
      // Mining stats
      miningPowerPerSec: game.miningPower,
      clickValueBTC: game.clickValue,
      prestigeCount: game.prestigeCount,
      prestigeMultiplier: game.prestigeMultiplier,
      totalEarnedUSD: game.totalEarnedUSD,
      upgradesSummary,
      // Property stats
      propertiesOwned: props.properties.length,
      propertyIncomePerHour: props.totalPassiveIncomePerHour,
      propertyTotalInvested: props.totalInvested,
      propertyWalletUSD: props.propertyWallet,
    };
  }, [game, props]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      playClick();

      // ── CHEAT CODE ────────────────────────────────────────────
      if (trimmed === "12345") {
        game.addCash(100_000);
        setInput("");
        setMessages((prev) => [
          ...prev,
          {
            id: `u-${Date.now()}`,
            role: "user" as Role,
            content: trimmed,
            streaming: false,
          },
          {
            id: `a-${Date.now() + 1}`,
            role: "assistant" as Role,
            content:
              "⚡ ACCESS GRANTED. $100,000 injected into your empire ledger. Don't tell anyone.",
            streaming: false,
          },
        ]);
        scrollToBottom();
        return;
      }
      // ──────────────────────────────────────────────────────────

      const uid = `u-${Date.now()}`;
      const aid = `a-${Date.now() + 1}`;

      const userMsg: ChatMessage = {
        id: uid,
        role: "user",
        content: trimmed,
        streaming: false,
      };
      const asstMsg: ChatMessage = {
        id: aid,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, asstMsg]);
      setInput("");
      setStreaming(true);
      scrollToBottom();

      const history = messages
        .filter((m) => m.id !== "cipher-greeting" && !m.streaming)
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const abort = new AbortController();
      abortRef.current = abort;

      const markError = (msg: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aid
              ? { ...m, content: msg, streaming: false, error: true }
              : m
          )
        );
      };

      const finalize = (hasContent: boolean) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aid) return m;
            if (!hasContent || m.content === "") {
              return {
                ...m,
                content:
                  "⚡ No response received. Please try again in a moment.",
                streaming: false,
                error: true,
              };
            }
            return { ...m, streaming: false };
          })
        );
      };

      try {
        const apiBase = getApiBase();
        const response = await fetch(`${apiBase}/api/openai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...history, { role: "user", content: trimmed }],
            gameContext: buildGameContext(),
          }),
          signal: abort.signal,
        });

        if (!response.ok) {
          let errMsg = `⚡ Server error (${response.status}). Try again.`;
          try {
            const body = await response.json() as { error?: string };
            if (body.error) errMsg = `⚡ ${body.error}`;
          } catch { /* ignore parse error */ }
          markError(errMsg);
          return;
        }

        const body = await response.json() as { content?: string; error?: string };

        if (body.error) {
          markError(`⚡ ${body.error}`);
          return;
        }

        if (body.content) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aid ? { ...m, content: body.content!, streaming: false } : m
            )
          );
          scrollToBottom();
        } else {
          markError("⚡ No response received. Please try again in a moment.");
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        markError("⚡ Connection lost. Check your network and try again.");
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, buildGameContext, playClick, scrollToBottom]
  );

  const showSuggested = messages.length <= 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={["top"]}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <LinearGradient
          colors={[c.electric + "1a", "transparent"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: c.electric + "1a", borderColor: c.electric + "44" },
            ]}
          >
            <MaterialCommunityIcons name="robot" size={22} color={c.electric} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: c.text }]}>AI ADVISOR</Text>
            <Text style={[styles.headerSub, { color: c.electric }]}>
              CIPHER · MARKET INTELLIGENCE
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.liveBadge,
            { borderColor: c.neon + "55", backgroundColor: c.neon + "15" },
          ]}
        >
          <View
            style={[styles.liveDot, { backgroundColor: c.neon, shadowColor: c.neon }]}
          />
          <Text style={[styles.liveTxt, { color: c.neon }]}>LIVE</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* ── Messages ──────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} c={c} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={<View style={{ height: 4 }} />}
        />

        {/* ── CIPHER SPONSOR — always visible ─────────────────── */}
        <View style={[csStyles.sponsorBar, { borderTopColor: c.border, backgroundColor: c.bgElevated }]}>
          <View style={csStyles.sponsorHeader}>
            <MaterialCommunityIcons name="television-play" size={10} color="#FFD700" />
            <Text style={csStyles.sponsorHeaderText}>CIPHER SPONSOR</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={csStyles.sponsorChipsRow}
          >
            {ads.currentOffers.map((type) => {
              const def = BOOST_DEFS[type];
              const isActive = ads.hasBoost(type);
              const activeSecs = ads.boostTimeLeft(type);
              const onCooldown = !ads.canClaimBoost(type) && !isActive;
              const cooldownSecs = ads.boostCooldownLeft(type);
              const chipColor = onCooldown ? "#666666" : def.color;
              return (
                <Pressable
                  key={type}
                  onPress={() => {
                    if (!isActive && !onCooldown) ads.watchAdForBoost(type);
                  }}
                  style={[
                    csStyles.sponsorChip,
                    {
                      borderColor: isActive ? def.color : onCooldown ? "#333333" : def.color + "55",
                      backgroundColor: isActive ? def.color + "18" : onCooldown ? "#1a1a1a" : def.color + "0d",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={onCooldown ? "clock-outline" : def.icon}
                    size={13}
                    color={chipColor}
                  />
                  <View>
                    <Text style={[csStyles.sponsorChipLabel, { color: chipColor }]}>
                      {isActive
                        ? `${Math.floor(activeSecs / 60)}:${String(activeSecs % 60).padStart(2, "0")}`
                        : onCooldown
                          ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, "0")}`
                          : def.label}
                    </Text>
                    <Text style={[csStyles.sponsorChipSub, { color: chipColor + "aa" }]}>
                      {isActive ? "ACTIVE" : onCooldown ? "COOLDOWN" : "WATCH AD"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Quick questions — hidden once chat starts ────────── */}
        {showSuggested && (
          <View>
            <View style={[styles.suggestedDivider, { borderTopColor: c.border }]}>
              <Text style={[styles.suggestedLabel, { color: c.textMuted }]}>
                QUICK QUESTIONS
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedRow}
            >
              {SUGGESTED.map((q) => (
                <Pressable
                  key={q}
                  style={[
                    styles.suggestChip,
                    {
                      borderColor: c.electric + "66",
                      backgroundColor: c.electric + "10",
                    },
                  ]}
                  onPress={() => sendMessage(q)}
                >
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={10}
                    color={c.electric}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.suggestTxt, { color: c.electric }]}>{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Input bar ─────────────────────────────────────── */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: c.bgElevated, borderTopColor: c.border },
          ]}
        >
          <TextInput
            style={[
              styles.inputField,
              {
                color: c.text,
                backgroundColor: c.bg,
                borderColor: streaming ? c.electric + "55" : c.border,
              },
            ]}
            placeholder="Ask CIPHER anything…"
            placeholderTextColor={c.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            editable={!streaming}
            multiline={false}
          />
          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor: streaming
                  ? c.border
                  : input.trim()
                    ? c.electric
                    : c.border,
              },
            ]}
            onPress={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
          >
            <MaterialCommunityIcons
              name={streaming ? "dots-horizontal" : "send"}
              size={16}
              color={
                streaming ? c.textMuted : input.trim() ? "#000" : c.textMuted
              }
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  liveTxt: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },

  listContent: { padding: 14, gap: 12 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
  bubbleRowLeft: { alignSelf: "flex-start", maxWidth: "87%" },
  bubbleRowRight: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    maxWidth: "87%",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  bubble: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minWidth: 0,
  },
  bubbleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },

  thinkingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
  },
  thinkingTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
  },

  suggestedDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  suggestedLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  suggestedRow: { paddingHorizontal: 14, paddingBottom: 8, gap: 7 },
  suggestChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  suggestTxt: { fontSize: 11, fontFamily: "Inter_500Medium" },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
  },
  inputField: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
