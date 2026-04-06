/**
 * trait-registration.mjs
 *
 * Registers the custom "sea-bound" and "seastone" traits into every
 * relevant PF2E CONFIG trait dictionary so they appear in item sheets,
 * actor trait lists, and the trait selector UI.
 */

export function registerTraits() {
  // ── Core trait label maps we need to patch ──────────────────────────
  const TRAIT_MAPS = [
    "actionTraits",
    "ancestryItemTraits",
    "armorTraits",
    "consumableTraits",
    "creatureTraits",
    "equipmentTraits",
    "featTraits",
    "itemTraits",           // catch-all
    "npcAttackTraits",
    "otherWeaponTraits",
    "shieldTraits",
    "spellTraits",
    "weaponTraits",
  ];

  const NEW_TRAITS = {
    "sea-bound": "PF2E-DEVIL-FRUIT.Trait.SeaBound",
    "seastone":  "PF2E-DEVIL-FRUIT.Trait.Seastone",
  };

  for (const mapKey of TRAIT_MAPS) {
    const map = CONFIG.PF2E?.[mapKey];
    if (!map) continue;
    for (const [slug, label] of Object.entries(NEW_TRAITS)) {
      if (!(slug in map)) map[slug] = label;
    }
  }

  // ── Also register in the rarity map if missing ───────────────────────
  // (Seastone items are Rare; sea-bound is Common — already covered by PF2E defaults)

  // ── Register the custom item trait descriptions ──────────────────────
  // PF2E looks up trait descriptions from CONFIG.PF2E.traitsDescriptions
  CONFIG.PF2E.traitsDescriptions ??= {};
  CONFIG.PF2E.traitsDescriptions["sea-bound"] = "PF2E-DEVIL-FRUIT.Trait.SeaBoundDesc";
  CONFIG.PF2E.traitsDescriptions["seastone"]  = "PF2E-DEVIL-FRUIT.Trait.SeastoneDesc";

  console.log("pf2e-devil-fruit-artifacts | Custom traits registered");
}
