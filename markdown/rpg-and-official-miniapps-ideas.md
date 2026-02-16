# RPG + Quiz Support Options

## Practical options (from easiest to hardest)

1. **Solo branching RPG (already feasible now)**
   - Use `setState`, `conditional`, `batch`, `navigate` actions.
   - Story nodes are screen/component trees with choices.
   - No backend changes required.

2. **Custom quiz builder (already feasible now)**
   - Questions/options in app state arrays.
   - Score with `compute` actions.
   - Timed rounds with `timer`.

3. **Shared async RPG/quiz (next step)**
   - Shared room state in Supabase (`room_id`, `state`, `version`).
   - Turn-based updates via server endpoints.
   - Realtime subscriptions for score/state updates.

4. **Realtime party games (later)**
   - WebSocket/Realtime channel per room.
   - Conflict/version checks on writes.
   - Presence (who is online), host controls, reconnect logic.

## What to prioritize first

- Build a polished **custom quiz creator** with templates.
- Add **multiplayer room state** for turn-based play.
- Keep action games for later (latency/conflict complexity).

---

# 10 Great Official Mini App Ideas

1. **RPG Character Creator**
   - Create stats, class, traits, inventory and export character sheet.

2. **Dungeon Master Encounter Builder**
   - Build encounters, initiative order, HP tracker, loot table.

3. **Party Quiz Night**
   - Host custom quiz packs (movies, friends trivia, history, etc.).

4. **Would-You-Rather Party**
   - Room voting game with live scoreboard.

5. **Debate Duel Timer**
   - Structured argument rounds, timer, scoring rubric.

6. **Study Sprint Battles**
   - Pomodoro + peer leaderboard for accountability sessions.

7. **Habit Challenge League**
   - Friends challenge board with streaks and weekly winners.

8. **Negotiation Simulator**
   - Scenario cards + response scoring + coaching prompts.

9. **Travel Planning Draft**
   - Group picks destinations/activities and auto-builds itinerary.

10. **Book Club Companion**
   - Shared reading checkpoints, quote board, chapter discussion prompts.
