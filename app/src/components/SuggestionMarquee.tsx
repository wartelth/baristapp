import React, { useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  type LayoutChangeEvent,
} from "react-native";
import { useAppTheme } from "../context/AppThemeContext";

// ---------------------------------------------------------------------------
// App ideas — creative things phones don't typically ship with
// ---------------------------------------------------------------------------

const APP_IDEAS = [
  // Creative & art
  "Pixel art editor",
  "ASCII art maker",
  "Color palette generator",
  "Font pairing tool",
  "Mood board builder",
  "Pattern designer",
  "Gradient creator",
  "Logo sketch pad",

  // Knowledge & learning
  "Spaced-repetition flashcards",
  "Language phrase book",
  "Mental math trainer",
  "Speed reading pacer",
  "Morse code translator",
  "Chemistry equation balancer",
  "Music interval trainer",
  "Typing speed test",
  "Sign language reference",

  // Productivity & life
  "Eisenhower priority matrix",
  "Habit streak tracker",
  "Decision journal",
  "Weekly review template",
  "Meeting cost calculator",
  "Salary negotiation prep",
  "Subscription audit",
  "Wardrobe outfit planner",
  "Capsule wardrobe builder",
  "Gift tracker for friends",
  "Elevator pitch builder",

  // Finance & math
  "Compound interest simulator",
  "Rent vs buy calculator",
  "Side hustle income tracker",
  "Debt snowball planner",
  "Invoice generator",
  "Freelance rate calculator",
  "50/30/20 budget builder",
  "Stock portfolio rebalancer",

  // Food & drink
  "Cocktail recipe builder",
  "Sourdough feeding schedule",
  "Wine tasting notes",
  "Coffee brew ratio calc",
  "Spice substitution guide",
  "Fermentation tracker",
  "Pantry inventory",
  "Batch cooking planner",

  // Health & body
  "Blood pressure log",
  "Migraine trigger diary",
  "Supplement stack tracker",
  "Stretching routine builder",
  "Running pace calculator",
  "Body measurement log",
  "Fasting window tracker",
  "Allergy food diary",

  // Home & DIY
  "Paint quantity calculator",
  "Room layout planner",
  "Plant care schedule",
  "Moving day checklist",
  "Home maintenance log",
  "Garage sale pricer",
  "Seed starting calendar",
  "Tool lending tracker",

  // Travel & outdoor
  "Packing list generator",
  "Travel budget splitter",
  "Time zone meeting planner",
  "Hiking trail notes",
  "Road trip fuel estimator",
  "Campsite gear checklist",
  "Jet lag recovery plan",
  "Visa requirements checker",

  // Social & games
  "Board game scorer",
  "Book club organizer",
  "Secret Santa matcher",
  "Debate argument tracker",
  "Would you rather generator",
  "Trivia quiz builder",
  "DnD character sheet",
  "Movie night picker",

  // Dev & tech
  "Regex tester",
  "JSON formatter",
  "Base64 encoder/decoder",
  "HTTP status code lookup",
  "Cron expression builder",
  "Markdown previewer",
  "API request builder",

  // Writing & ideas
  "Story prompt generator",
  "Character name generator",
  "Rhyme finder",
  "Brainstorm mind map",
  "Pros & cons matrix",
  "Daily journaling prompts",
  "Screenplay formatter",

  // Niche & hobby
  "Vinyl record catalog",
  "Whiskey tasting journal",
  "Knitting stitch counter",
  "Aquarium water log",
  "Houseplant ID journal",
  "Birdwatching log",
  "Skateboard trick log",
  "Chess opening trainer",
  "Film photography log",
  "Mechanical keyboard planner",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Keep translateX in the loopable range [-2w, 0] */
function wrapOffset(offset: number, w: number): number {
  if (w <= 0) return offset;
  while (offset < -2 * w) offset += w;
  while (offset > 0) offset -= w;
  return offset;
}

// ---------------------------------------------------------------------------
// Single animated + draggable row
// ---------------------------------------------------------------------------

interface RowProps {
  items: string[];
  speed: number; // px per ~16ms frame
  reverse?: boolean;
  onSelect: (text: string) => void;
}

function MarqueeRow({ items, speed, reverse, onSelect }: RowProps) {
  const { colors } = useAppTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const singleWidthRef = useRef(0);
  const touchActiveRef = useRef(false);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  // Triple items for seamless wrapping
  const tripled = useMemo(() => [...items, ...items, ...items], [items]);

  // ----- animation loop -----
  const tick = useCallback(
    (time: number) => {
      if (!touchActiveRef.current && singleWidthRef.current > 0) {
        const dt = lastTimeRef.current
          ? Math.min((time - lastTimeRef.current) / 16, 3)
          : 1;
        lastTimeRef.current = time;

        const delta = speed * dt;
        offsetRef.current += reverse ? delta : -delta;
        offsetRef.current = wrapOffset(offsetRef.current, singleWidthRef.current);
        translateX.setValue(offsetRef.current);
      } else {
        lastTimeRef.current = time;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [speed, reverse, translateX],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // ----- pan responder for swipe-to-scroll -----
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8,
      onPanResponderGrant: () => {
        draggingRef.current = true;
        dragStartOffsetRef.current = offsetRef.current;
      },
      onPanResponderMove: (_, gs) => {
        const next = wrapOffset(
          dragStartOffsetRef.current + gs.dx,
          singleWidthRef.current,
        );
        offsetRef.current = next;
        translateX.setValue(next);
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
        touchActiveRef.current = false;
        lastTimeRef.current = 0;
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
        touchActiveRef.current = false;
        lastTimeRef.current = 0;
      },
    }),
  ).current;

  // ----- pause auto-scroll on any touch (so taps land reliably) -----
  const handleTouchStart = useCallback(() => {
    touchActiveRef.current = true;
  }, []);

  const handleTouchEnd = useCallback(() => {
    // If pan responder took over, it handles the resume
    if (!draggingRef.current) {
      touchActiveRef.current = false;
      lastTimeRef.current = 0;
    }
  }, []);

  // ----- measure one "set" width on layout -----
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0 && singleWidthRef.current === 0) {
        const single = w / 3;
        singleWidthRef.current = single;
        // Start showing the middle third
        offsetRef.current = -single;
        translateX.setValue(-single);
      }
    },
    [translateX],
  );

  return (
    <View
      style={styles.rowClip}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[styles.row, { transform: [{ translateX }] }]}
        onLayout={handleLayout}
        // Disable pointer events on the animated wrapper so touches
        // pass straight to the tile TouchableOpacitys
        pointerEvents="box-none"
      >
        {tripled.map((idea, i) => (
          <TouchableOpacity
            key={`${idea}-${i}`}
            style={[
              styles.tile,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.borderAlt,
              },
            ]}
            onPress={() => onSelect(idea)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tileText, { color: colors.secondaryText }]}
              numberOfLines={1}
            >
              {idea}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main marquee component
// ---------------------------------------------------------------------------

interface Props {
  onSelect: (text: string) => void;
}

const ROW_COUNT = 3;
const BASE_SPEED = 0.15; // very gentle drift

export function SuggestionMarquee({ onSelect }: Props) {
  const { colors } = useAppTheme();

  const rows = useMemo(() => {
    const pool = shuffle(APP_IDEAS);
    const perRow = Math.ceil(pool.length / ROW_COUNT);
    return Array.from({ length: ROW_COUNT }, (_, i) => {
      const start = i * perRow;
      return pool.slice(start, start + perRow);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondaryText }]}>
        Ideas to get you started
      </Text>
      {rows.map((items, i) => (
        <MarqueeRow
          key={i}
          items={items}
          speed={BASE_SPEED + i * 0.05}
          reverse={i % 2 === 1}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    gap: 8,
    marginHorizontal: -20,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  rowClip: {
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  tile: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  tileText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
