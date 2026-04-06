/**
 * SeastoneManager
 *
 * Registers Seastone as a material in the PF2E system and provides
 * helpers for Seastone-crafted items.
 *
 * Seastone properties:
 *  - Items crafted from or containing Seastone gain the "seastone" item trait.
 *  - When carried/equipped by a Sea-Bound creature, triggers the Sea-Bound effect
 *    (handled by SeaBoundManager, which checks for the "seastone" trait on items).
 *  - Seastone is a rare, dense sea-grey mineral; weapons made from it deal normal
 *    damage type but suppress Devil Fruit abilities on contact.
 *  - HP/BT and hardness values below follow PF2E material conventions.
 */

export class SeastoneManager {
  static #moduleId = null;

  // Material grade definitions (mirrors PF2E material structure)
  static GRADES = {
    low: {
      label:    "Seastone (Low-Grade)",
      hardness: 9,
      hp:       36,
      bt:       18,
      level:    5,
      price:    "140 gp per Bulk"
    },
    standard: {
      label:    "Seastone (Standard-Grade)",
      hardness: 13,
      hp:       52,
      bt:       26,
      level:    11,
      price:    "1,400 gp per Bulk"
    },
    high: {
      label:    "Seastone (High-Grade)",
      hardness: 18,
      hp:       72,
      bt:       36,
      level:    18,
      price:    "14,000 gp per Bulk"
    }
  };

  static init(moduleId) {
    this.#moduleId = moduleId;

    // Register material with PF2E system if the API is available
    if (typeof CONFIG?.PF2E?.materialTypes !== "undefined") {
      this.#registerMaterial();
    } else {
      // Defer until system is fully initialized
      Hooks.once("pf2e.systemReady", () => this.#registerMaterial());
    }

    console.log(`${moduleId} | SeastoneManager ready`);
  }

  static #registerMaterial() {
    // PF2E stores material definitions in CONFIG.PF2E.materialTypes
    // Format mirrors existing entries like "darkwood", "mithral", etc.
    CONFIG.PF2E = CONFIG.PF2E ?? {};
    CONFIG.PF2E.materialTypes = CONFIG.PF2E.materialTypes ?? {};

    CONFIG.PF2E.materialTypes["seastone"] = {
      label:  "PF2E-DEVIL-FRUIT.Material.Seastone",
      grades: {
        low:      { ...SeastoneManager.GRADES.low },
        standard: { ...SeastoneManager.GRADES.standard },
        high:     { ...SeastoneManager.GRADES.high }
      },
      // Custom property: all Seastone items gain the seastone item trait
      traits: ["seastone"]
    };

    console.log(`${this.#moduleId} | Seastone material registered`);
  }

  /**
   * Utility: check if an item is made of Seastone.
   * Works for both system material field and trait-tagged items.
   */
  static isSeastone(item) {
    const material = item.system?.material?.type;
    if (material === "seastone") return true;
    const traits = item.system?.traits?.value ?? [];
    return traits.includes("seastone");
  }
}
