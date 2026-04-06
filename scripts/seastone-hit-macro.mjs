/**
 * seastone-hit-macro.mjs
 *
 * Utility macro: Apply a timed Sea-Bound (Partial) effect to a targeted
 * token when struck by a Seastone weapon.
 *
 * Usage (from a Macro document or inline roll):
 *   1. Select the attacker token.
 *   2. Target the defender token.
 *   3. Run this macro.
 *
 * The macro prompts for the save result and applies the appropriate duration.
 *
 * This is provided as a world-scope macro; import it from the compendium.
 */

export async function applySeastoneHit({ targetToken, saveResult = null } = {}) {
  // ── Resolve target ───────────────────────────────────────────────────
  const target = targetToken
    ?? [...game.user.targets][0]
    ?? canvas.tokens?.controlled[0];

  if (!target?.actor) {
    ui.notifications.warn("Seastone Hit: No target token selected or targeted.");
    return;
  }

  const actor = target.actor;

  // Only applies to Sea-Bound actors
  const traits = actor.system?.traits?.value ?? [];
  if (!traits.includes("sea-bound")) {
    ui.notifications.info(`${actor.name} does not have the Sea-Bound trait. No effect.`);
    return;
  }

  // ── Prompt for save result if not provided ───────────────────────────
  if (saveResult === null) {
    saveResult = await _promptSaveResult(actor.name);
    if (saveResult === null) return; // cancelled
  }

  // ── Determine duration ───────────────────────────────────────────────
  // Critical Success: no effect
  // Success:         no effect
  // Failure:         1 round
  // Critical Failure: 1 minute (10 rounds)

  if (saveResult === "critSuccess" || saveResult === "success") {
    ChatMessage.create({
      content: `<p><strong>Seastone Hit — ${actor.name}</strong></p><p>Save succeeded. No Sea-Bound effect applied.</p>`,
      speaker: ChatMessage.getSpeaker()
    });
    return;
  }

  const rounds = saveResult === "critFailure" ? 10 : 1;
  const label  = saveResult === "critFailure"
    ? "Sea-Bound (Partial) — 1 minute (Critical Failure)"
    : "Sea-Bound (Partial) — 1 round (Failure)";

  // ── Build a timed effect ─────────────────────────────────────────────
  const pack   = game.packs.get("pf2e-devil-fruit-artifacts.sea-bound-effects");
  const index  = await pack?.getIndex();
  const entry  = index?.find(e => e.name.includes("Partial"));

  if (!entry) {
    ui.notifications.error("Seastone Hit: Could not find Sea-Bound (Partial) effect in compendium.");
    return;
  }

  const baseEffect = await pack.getDocument(entry._id);
  const effectData = baseEffect.toObject();

  // Override duration to be timed
  effectData.name = label;
  effectData.system.duration = {
    value:     rounds,
    unit:      "rounds",
    sustained: false,
    expiry:    "turn-start"
  };
  effectData.system.badge = {
    type:  "counter",
    value: rounds,
    labels: null
  };

  // Remove any existing Sea-Bound effects first to avoid stacking
  const existing = actor.itemTypes.effect.filter(e =>
    e.slug === "sea-bound-partial" || e.slug === "sea-bound-submerged"
  );
  if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing.map(e => e.id));

  await actor.createEmbeddedDocuments("Item", [effectData]);

  ChatMessage.create({
    content: `<p><strong>Seastone Hit — ${actor.name}</strong></p>
              <p>Save failed. Applied: <em>${label}</em>.</p>
              <p>Devil Fruit abilities suppressed for ${rounds} round${rounds > 1 ? "s" : ""}.</p>`,
    speaker: ChatMessage.getSpeaker()
  });
}

async function _promptSaveResult(actorName) {
  return new Promise(resolve => {
    new Dialog({
      title: `Seastone Hit — ${actorName} Fortitude Save`,
      content: `
        <p>What was <strong>${actorName}</strong>'s Fortitude save result vs DC 28?</p>
      `,
      buttons: {
        critSuccess: {
          label: "Critical Success",
          callback: () => resolve("critSuccess")
        },
        success: {
          label: "Success",
          callback: () => resolve("success")
        },
        failure: {
          label: "Failure (1 round)",
          callback: () => resolve("failure")
        },
        critFailure: {
          label: "Critical Failure (1 min)",
          callback: () => resolve("critFailure")
        }
      },
      default: "failure",
      close:   () => resolve(null)
    }).render(true);
  });
}
