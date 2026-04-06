/**
 * PF2E Devil Fruit Archetype Artifacts & Seastone
 * Main module entry point
 */

import { SeaBoundManager }        from "./sea-bound-manager.mjs";
import { SeastoneManager }        from "./seastone-manager.mjs";
import { registerSettings }       from "./settings.mjs";
import { registerTraits }         from "./trait-registration.mjs";
import { registerRegionBehavior } from "./sea-water-behavior.mjs";
import { SeaBoundPanel,
         registerSeaBoundPanel }  from "./sea-bound-panel.mjs";
import { applySeastoneHit }       from "./seastone-hit-macro.mjs";

const MODULE_ID = "pf2e-devil-fruit-artifacts";

// ── init ──────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);

  registerSettings(MODULE_ID);
  registerTraits();
  registerRegionBehavior();

  // Handlebars helper used by the panel template
  Handlebars.registerHelper("eq", (a, b) => a === b);

  loadTemplates([
    "modules/pf2e-devil-fruit-artifacts/templates/sea-bound-panel.hbs"
  ]);
});

// ── ready ─────────────────────────────────────────────────────────────
Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);

  SeaBoundManager.init(MODULE_ID);
  SeastoneManager.init(MODULE_ID);

  if (game.user.isGM) {
    registerSeaBoundPanel(MODULE_ID);
  }

  // Public API for macros
  game.devilFruitArtifacts = {
    SeaBoundManager,
    SeastoneManager,
    SeaBoundPanel,
    applySeastoneHit,
    evaluateAll: async () => {
      for (const token of canvas.tokens?.placeables ?? []) {
        if (!token.actor) continue;
        await SeaBoundManager.evaluateToken(token.actor, token);
      }
    }
  };

  console.log(`${MODULE_ID} | API available at game.devilFruitArtifacts`);
});

// ── Token movement ────────────────────────────────────────────────────
Hooks.on("updateToken", async (tokenDoc, changes) => {
  const moved = "x" in changes || "y" in changes || "elevation" in changes;
  if (!moved) return;
  const token = tokenDoc.object;
  if (!token?.actor) return;
  await SeaBoundManager.evaluateToken(token.actor, token);
});

// ── Region events (v12 backup to behavior handlers) ───────────────────
Hooks.on("regionEvent", async (event) => {
  if (!["tokenEnter", "tokenExit", "tokenMoveIn"].includes(event.name)) return;
  const tokenDoc = event.data?.token;
  if (!tokenDoc) return;
  const token = tokenDoc.object ?? canvas.tokens?.get(tokenDoc.id);
  if (!token?.actor) return;
  await SeaBoundManager.evaluateToken(token.actor, token);
});

// ── Item equip/unequip on actors ──────────────────────────────────────
async function _onActorItemChange(item) {
  if (!item.parent?.isOwner) return;
  const actor = item.parent;
  const token = actor.getActiveTokens({ linked: true })[0]
             ?? actor.getActiveTokens()[0];
  await SeaBoundManager.evaluateActor(actor, token ?? null);
}

Hooks.on("updateItem", async (item, changes) => {
  if (!item.parent) return;
  const equippedChanged = "equipped" in (changes?.system ?? {});
  const traitsChanged   = "traits"   in (changes?.system ?? {});
  if (!equippedChanged && !traitsChanged) return;
  await _onActorItemChange(item);
});

Hooks.on("createItem", async (item) => {
  if (!item.parent) return;
  await _onActorItemChange(item);
});

Hooks.on("deleteItem", async (item) => {
  if (!item.parent) return;
  await _onActorItemChange(item);
});

// ── Canvas ready — evaluate all actors on scene load ──────────────────
Hooks.on("canvasReady", async () => {
  if (!game.settings.get(MODULE_ID, "seaboundAutoApply")) return;
  setTimeout(async () => {
    for (const token of canvas.tokens?.placeables ?? []) {
      if (!token.actor) continue;
      await SeaBoundManager.evaluateToken(token.actor, token);
    }
  }, 500);
});

export { MODULE_ID };
