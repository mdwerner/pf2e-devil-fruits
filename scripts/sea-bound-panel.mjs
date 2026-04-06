/**
 * sea-bound-panel.mjs
 *
 * A compact GM-facing Application that lists every actor on the current
 * scene with the Sea-Bound trait and lets the GM:
 *   • See current Sea-Bound state (none / partial / submerged)
 *   • Manually override the state (e.g. when auto-detection isn't used)
 *   • Force-clear all Sea-Bound effects on all actors
 *
 * Open via: game.seaBoundPanel.render(true)
 * A button is also added to the Scene Controls toolbar (GM only).
 */

import { SeaBoundManager } from "./sea-bound-manager.mjs";

export class SeaBoundPanel extends Application {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:        "sea-bound-panel",
      title:     "Sea-Bound Monitor",
      template:  "modules/pf2e-devil-fruit-artifacts/templates/sea-bound-panel.hbs",
      width:     420,
      height:    "auto",
      resizable: true,
      classes:   ["pf2e-devil-fruit", "sea-bound-panel"]
    });
  }

  getData() {
    const actors = this.#getSeaBoundActors();
    return {
      actors,
      hasActors: actors.length > 0,
      isGM: game.user.isGM
    };
  }

  #getSeaBoundActors() {
    const results = [];

    for (const token of canvas.tokens?.placeables ?? []) {
      const actor = token.actor;
      if (!actor) continue;

      const traits = actor.system?.traits?.value ?? [];
      if (!traits.includes("sea-bound")) continue;

      const partialEffect   = actor.itemTypes.effect.find(e => e.slug === "sea-bound-partial");
      const submergedEffect = actor.itemTypes.effect.find(e => e.slug === "sea-bound-submerged");

      let state = "none";
      if (submergedEffect) state = "submerged";
      else if (partialEffect) state = "partial";

      const hasSeastone = actor.items.some(i => {
        const tags = i.system?.traits?.value ?? [];
        return tags.includes("seastone") && i.system?.equipped?.carryType !== "dropped";
      });

      results.push({
        id:          actor.id,
        tokenId:     token.id,
        name:        actor.name,
        img:         actor.img,
        state,
        hasSeastone,
        stateLabel:  this.#stateLabel(state),
        stateClass:  state
      });
    }

    return results;
  }

  #stateLabel(state) {
    return { none: "Clear", partial: "Partial (Slowed/Clumsy)", submerged: "Submerged (Stunned)" }[state] ?? state;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Manual state override buttons
    html.find("[data-action='set-state']").on("click", async (ev) => {
      const actorId = ev.currentTarget.closest("[data-actor-id]").dataset.actorId;
      const state   = ev.currentTarget.dataset.state;
      const actor   = game.actors.get(actorId);
      if (!actor) return;
      await SeaBoundManager.forceState(actor, state);
      this.render();
    });

    // Re-evaluate all button
    html.find("[data-action='evaluate-all']").on("click", async () => {
      for (const token of canvas.tokens?.placeables ?? []) {
        if (!token.actor) continue;
        await SeaBoundManager.evaluateToken(token.actor, token);
      }
      this.render();
    });

    // Clear all button
    html.find("[data-action='clear-all']").on("click", async () => {
      for (const token of canvas.tokens?.placeables ?? []) {
        if (!token.actor) continue;
        await SeaBoundManager.forceState(token.actor, "none");
      }
      this.render();
    });

    // Pan to token on actor name click
    html.find("[data-action='pan-to']").on("click", (ev) => {
      const tokenId = ev.currentTarget.closest("[data-actor-id]").dataset.tokenId;
      const token   = canvas.tokens?.get(tokenId);
      if (token) canvas.animatePan({ x: token.x, y: token.y, scale: 1 });
    });
  }
}

export function registerSeaBoundPanel(moduleId) {
  // Expose globally for macro access
  game.seaBoundPanel = new SeaBoundPanel();

  // Add GM toolbar button to Scene Controls
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;
    const tokenControls = controls.find(c => c.name === "token");
    if (!tokenControls) return;
    tokenControls.tools.push({
      name:    "sea-bound-panel",
      title:   "Sea-Bound Monitor",
      icon:    "fas fa-water",
      button:  true,
      onClick: () => game.seaBoundPanel.render(true)
    });
  });
}
