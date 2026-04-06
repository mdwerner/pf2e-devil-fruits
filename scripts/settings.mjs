/**
 * Module settings registration
 */
export function registerSettings(moduleId) {
  game.settings.register(moduleId, "seaboundAutoApply", {
    name: "Auto-Apply Sea-Bound",
    hint: "Automatically apply Sea-Bound conditions when a Devil Fruit user is in seawater (requires scene regions tagged with sea-water).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(moduleId, "seaboundCheckElevation", {
    name: "Use Elevation for Submersion Check",
    hint: "If enabled, negative elevation values are treated as fully submerged (Stunned). Otherwise GMs apply full submersion manually.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(moduleId, "seastoneTag", {
    name: "Seastone Region Tag",
    hint: "The scene region behavior tag used to mark seawater areas.",
    scope: "world",
    config: true,
    type: String,
    default: "sea-water"
  });
}
