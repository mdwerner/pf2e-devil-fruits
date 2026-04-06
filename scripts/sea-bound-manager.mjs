/**
 * SeaBoundManager
 *
 * Handles automatic application and removal of Sea-Bound conditions.
 *
 * Sea-Bound triggers when a Devil Fruit archetype user is:
 *   - Waist-deep or touching seawater  → Slowed 1, Clumsy 1, archetype actions/passives suppressed
 *   - Fully submerged                  → Stunned (until removed)
 *   - In contact with Seastone         → same as waist-deep water
 *
 * The actor must have the "sea-bound" trait (added by any Archetype Artifact)
 * for this manager to act on them.
 */

import { getSeaWaterDepthForToken } from "./sea-water-behavior.mjs";

const SEA_BOUND_TRAIT = "sea-bound";       // custom trait slug on the actor
const SEASTONE_TAG   = "seastone";         // item tag on Seastone equipment

// UUIDs for the bundled effects — resolved at runtime via pack lookup
const EFFECT_SLUGS = {
  partial:   "sea-bound-partial",   // Slowed 1 + Clumsy 1
  submerged: "sea-bound-submerged"  // Stunned
};

export class SeaBoundManager {
  static #moduleId = null;

  static init(moduleId) {
    this.#moduleId = moduleId;
    console.log(`${moduleId} | SeaBoundManager ready`);
  }

  // ------------------------------------------------------------------ //
  //  Public API
  // ------------------------------------------------------------------ //

  /** Called when a token moves. */
  static async evaluateToken(actor, token) {
    if (!actor || !this.#hasSeaBoundTrait(actor)) return;
    const state = await this.#determineState(actor, token);
    await this.#applyState(actor, state);
  }

  /** Called when actor's items change (equip/unequip Seastone). */
  static async evaluateActor(actor, token) {
    if (!actor || !this.#hasSeaBoundTrait(actor)) return;
    const state = await this.#determineState(actor, token);
    await this.#applyState(actor, state);
  }

  // ------------------------------------------------------------------ //
  //  Trait detection
  // ------------------------------------------------------------------ //

  static #hasSeaBoundTrait(actor) {
    // The trait is injected by the Archetype Artifact's rule elements.
    // We check the actor's system traits object.
    const traits = actor.system?.traits?.value ?? [];
    return traits.includes(SEA_BOUND_TRAIT);
  }

  // ------------------------------------------------------------------ //
  //  State determination
  // ------------------------------------------------------------------ //

  /**
   * Returns "none" | "partial" | "submerged"
   */
  static async #determineState(actor, token) {
    const hasSeastone = this.#isCarryingSeastone(actor);
    const waterState  = token ? this.#getWaterState(token) : "none";

    // Seastone counts as partial water contact
    if (hasSeastone && waterState === "none") return "partial";

    return waterState; // "none" | "partial" | "submerged"
  }

  /** Checks if actor has any equipped Seastone item. */
  static #isCarryingSeastone(actor) {
    return actor.items.some(item => {
      const tags = item.system?.traits?.value ?? [];
      const equipped = item.system?.equipped?.carryType !== "dropped"
                    && item.system?.equipped?.inSlot !== false;
      return tags.includes(SEASTONE_TAG) && equipped;
    });
  }

  /**
   * Determines water depth from:
   *   1. Negative token elevation (if setting enabled) → submerged
   *   2. SeaWaterZone region behaviors (primary method for v12)
   *   3. Legacy: regions tagged via module flags (fallback)
   *
   * Returns "none" | "partial" | "submerged"
   */
  static #getWaterState(token) {
    const moduleId = this.#moduleId;
    const useElev  = game.settings.get(moduleId, "seaboundCheckElevation");

    // 1. Elevation-based submersion override
    if (useElev && token.document.elevation < 0) return "submerged";

    // 2. SeaWaterZone RegionBehavior (v12 preferred path)
    //    getSeaWaterDepthForToken inspects all regions the token is inside
    //    and reads their SeaWaterZone behavior depth field.
    try {
      const regionDepth = getSeaWaterDepthForToken(token);
      if (regionDepth !== "none") return regionDepth;
    } catch {
      // getSeaWaterDepthForToken unavailable (shouldn't happen, but be safe)
    }

    // 3. Legacy tag-based fallback for regions set up before this behavior existed
    const waterTag = game.settings.get(moduleId, "seastoneTag");
    const deepTag  = `${waterTag}-deep`;

    if (canvas.scene?.regions) {
      let inWater = false;
      let inDeep  = false;

      for (const region of canvas.scene.regions) {
        if (!region.object?.bounds?.contains(token.document.x, token.document.y)) continue;

        const behaviors = region.behaviors ?? [];
        if (behaviors.some(b => b.flags?.[moduleId]?.tag === deepTag))  inDeep  = true;
        if (behaviors.some(b => b.flags?.[moduleId]?.tag === waterTag)) inWater = true;
      }

      if (inDeep)  return "submerged";
      if (inWater) return "partial";
    }

    return "none";
  }

  // ------------------------------------------------------------------ //
  //  GM override (used by SeaBoundPanel)
  // ------------------------------------------------------------------ //

  /**
   * Forcibly set Sea-Bound state on an actor, bypassing auto-detection.
   * @param {Actor} actor
   * @param {"none"|"partial"|"submerged"} state
   */
  static async forceState(actor, state) {
    if (!actor) return;
    await this.#applyState(actor, state, true); // force = bypass autoApply gate
  }

  // ------------------------------------------------------------------ //
  //  Condition application
  // ------------------------------------------------------------------ //

  static async #applyState(actor, state, force = false) {
    const autoApply = game.settings.get(this.#moduleId, "seaboundAutoApply");
    if (!autoApply && !force) return;

    // Find existing sea-bound effects on the actor
    const existing = {
      partial:   actor.itemTypes.effect.find(e => e.slug === EFFECT_SLUGS.partial),
      submerged: actor.itemTypes.effect.find(e => e.slug === EFFECT_SLUGS.submerged)
    };

    if (state === "none") {
      // Remove both effects if present
      if (existing.partial)   await existing.partial.delete();
      if (existing.submerged) await existing.submerged.delete();
      return;
    }

    if (state === "partial") {
      if (existing.submerged) await existing.submerged.delete();
      if (!existing.partial)  await this.#addEffect(actor, EFFECT_SLUGS.partial);
      return;
    }

    if (state === "submerged") {
      if (existing.partial)    await existing.partial.delete();
      if (!existing.submerged) await this.#addEffect(actor, EFFECT_SLUGS.submerged);
      return;
    }
  }

  static async #addEffect(actor, slug) {
    const pack = game.packs.get(`${this.#moduleId}.sea-bound-effects`);
    if (!pack) {
      ui.notifications?.warn(`Devil Fruit Artifacts | Sea-Bound effects compendium not found. Re-activate the module.`);
      console.error(`${this.#moduleId} | Could not find sea-bound-effects pack`);
      return;
    }

    const index = await pack.getIndex({ fields: ["system.slug", "name"] });

    // Match on system.slug first, then fall back to name-slug comparison
    const entry = index.find(e =>
      (e.system?.slug ?? "") === slug ||
      e.name.slugify({ strict: true }) === slug
    );

    if (!entry) {
      console.error(`${this.#moduleId} | Effect not found in pack: ${slug}`);
      return;
    }

    const effect     = await pack.getDocument(entry._id);
    const effectData = effect.toObject();

    await actor.createEmbeddedDocuments("Item", [effectData]);

    // Announce the state change in chat (GM-only whisper)
    const isSubmerged = slug === "sea-bound-submerged";
    const stateLabel  = isSubmerged ? "Submerged (Stunned)" : "Partial (Slowed 1, Clumsy 1)";
    const icon        = isSubmerged ? "💀" : "🌊";
    ChatMessage.create({
      content: `<div class="pf2e chat-card">
        <header class="card-header" style="background:linear-gradient(135deg,#1a4a6b,#0d2d45);color:#a8d8f0;padding:6px 10px;border-radius:4px 4px 0 0;">
          <h3>${icon} Sea-Bound — ${actor.name}</h3>
        </header>
        <section class="card-content" style="padding:8px 10px;">
          <p><strong>State:</strong> ${stateLabel}</p>
          ${isSubmerged
            ? `<p>Fully submerged in seawater. <em>Stunned until removed from the water.</em> Devil Fruit abilities suppressed.</p>`
            : `<p>In contact with seawater or Seastone. Devil Fruit abilities suppressed.</p>`
          }
        </section>
      </div>`,
      whisper:  ChatMessage.getWhisperRecipients("GM"),
      speaker:  { alias: "Sea-Bound Monitor" }
    });
  }
}
