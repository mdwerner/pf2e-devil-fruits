/**
 * sea-water-behavior.mjs
 *
 * Registers a custom RegionBehaviorType — "Sea-Water Zone" — that GMs
 * can attach to any scene Region to mark it as seawater.
 *
 * The behavior has one field:
 *   depth: "partial" | "submerged"
 *     partial   = waist-deep (Slowed 1, Clumsy 1, suppressed)
 *     submerged = fully underwater (Stunned)
 *
 * SeaBoundManager reads region behaviors of this type instead of
 * relying on raw flags, making setup point-and-click for GMs.
 */

import { SeaBoundManager } from "./sea-bound-manager.mjs";

const BEHAVIOR_TYPE = "pf2e-devil-fruit-artifacts.seaWaterZone";

export class SeaWaterBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {

  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      depth: new fields.StringField({
        required: true,
        initial: "partial",
        choices: {
          partial:   "Sea-Water Zone: Waist-Deep (Partial)",
          submerged: "Sea-Water Zone: Fully Submerged"
        },
        label:  "Water Depth",
        hint:   "Partial: Slowed 1 + Clumsy 1. Submerged: Stunned until removed."
      })
    };
  }

  // Called by Foundry when a token enters this region
  static async #onTokenEnter(event) {
    const token = event.data?.token?.object;
    if (!token?.actor) return;
    await SeaBoundManager.evaluateToken(token.actor, token);
  }

  // Called by Foundry when a token exits this region
  static async #onTokenExit(event) {
    const token = event.data?.token?.object;
    if (!token?.actor) return;
    // Re-evaluate — the manager will check remaining regions + Seastone
    await SeaBoundManager.evaluateToken(token.actor, token);
  }

  static get events() {
    return {
      [CONST.REGION_EVENTS.TOKEN_ENTER]: this.#onTokenEnter,
      [CONST.REGION_EVENTS.TOKEN_EXIT]:  this.#onTokenExit,
      [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: this.#onTokenEnter,
    };
  }
}

export function registerRegionBehavior() {
  // Guard: RegionBehaviorType API requires Foundry v12+
  if (!foundry.data.regionBehaviors?.RegionBehaviorType) {
    console.warn("pf2e-devil-fruit-artifacts | RegionBehaviorType API unavailable — update to Foundry v12+");
    return;
  }

  CONFIG.RegionBehavior.dataModels[BEHAVIOR_TYPE] = SeaWaterBehaviorType;

  // Register the label in the type selector dropdown
  CONFIG.RegionBehavior.typeLabels ??= {};
  CONFIG.RegionBehavior.typeLabels[BEHAVIOR_TYPE] = "Sea-Water Zone";

  // Register icons for the behavior
  CONFIG.RegionBehavior.typeIcons ??= {};
  CONFIG.RegionBehavior.typeIcons[BEHAVIOR_TYPE] = "fa-water";

  console.log("pf2e-devil-fruit-artifacts | SeaWaterZone region behavior registered");
}

/**
 * Public helper: given a token, return the highest-priority sea water
 * depth from all SeaWaterZone behaviors the token is currently inside.
 *
 * Returns "none" | "partial" | "submerged"
 */
export function getSeaWaterDepthForToken(token) {
  if (!canvas.scene?.regions) return "none";

  let depth = "none";

  for (const region of canvas.scene.regions) {
    // Check if token is inside this region
    if (!region.object?.bounds?.contains(token.document.x, token.document.y)) continue;

    for (const behavior of region.behaviors ?? []) {
      if (behavior.type !== BEHAVIOR_TYPE) continue;
      if (!behavior.system?.depth) continue;

      const d = behavior.system.depth;
      // "submerged" beats "partial"
      if (d === "submerged") return "submerged";
      if (d === "partial")   depth = "partial";
    }
  }

  return depth;
}
