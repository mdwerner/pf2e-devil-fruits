# Installation & Setup Guide

## 1. Install the Module

### Option A — Manual (no build step)
1. Extract the zip into your Foundry data folder:
   ```
   <FoundryData>/Data/modules/pf2e-devil-fruit-artifacts/
   ```
2. The `packs/` folder ships with raw JSON files. Foundry v12 can read
   these directly — **no compilation needed** for basic use.
3. Launch Foundry, go to **Add-on Modules**, find **PF2E: Devil Fruit
   Archetype Artifacts & Seastone**, and enable it.

### Option B — Build from source (recommended for contributors)
```bash
cd pf2e-devil-fruit-artifacts
npm install
npm run build        # compiles src/packs/** → packs/** LevelDB
```
Then install the compiled folder as above.

---

## 2. Scene Setup — Seawater Regions

This is the **most important** setup step for automatic Sea-Bound detection.

### Using the Sea-Water Zone Behavior (recommended)
1. Open a scene and switch to the **Regions** layer (toolbar or `R`).
2. Draw a region over the water area.
3. In the region's **Behaviors** tab, click **Add Behavior**.
4. Select **Sea-Water Zone** from the dropdown (added by this module).
5. Set **Water Depth**:
   - `Waist-Deep (Partial)` — Slowed 1 + Clumsy 1 + suppressed
   - `Fully Submerged` — Stunned until removed
6. Repeat for deeper areas (e.g. draw a smaller "Fully Submerged" region
   inside the larger "Waist-Deep" region for a sea floor).

### Using Elevation (alternative)
Enable **"Use Elevation for Submersion Check"** in module settings.
- Token elevation ≥ 0 → not submerged
- Token elevation < 0 → **Submerged (Stunned)**

This is useful for 3D-style maps or when you move tokens below the
waterline manually.

---

## 3. Giving Actors Devil Fruits

1. Open **Compendium Packs** → **Devil Fruit Archetype Artifacts**.
2. Drag a fruit onto the actor's sheet (Equipment tab).
3. The item's Rule Elements automatically add the `sea-bound` trait to
   the actor. No further steps needed.

> **Note:** The placeholder fruits in the compendium are templates.
> Duplicate them and replace the rule elements with your campaign's
> actual archetype feat chains. See [EXTENDING.md](./EXTENDING.md) for
> how to add your own fruits.

---

## 4. Seastone Items

### Giving NPCs Seastone gear
1. Open **Compendium Packs** → **Seastone Material Items**.
2. Drag the desired item onto the NPC/actor sheet.
3. As long as the item is **not dropped** (any carry type other than
   Dropped), it will trigger Sea-Bound on any Sea-Bound actor who
   has it in their inventory.

### Seastone weapon hits
When an NPC attacks a Sea-Bound PC with a Seastone weapon:
1. Import the **Seastone Weapon Hit** macro from the **Devil Fruit
   Macros** compendium.
2. Target the hit actor.
3. Run the macro — a dialog asks for the Fortitude save result.
4. The macro applies a **timed** Sea-Bound (Partial) effect:
   - Failure → 1 round
   - Critical Failure → 1 minute (10 rounds)

---

## 5. GM Monitor Panel

Click the **water icon (🌊)** in the Token Controls toolbar to open
the **Sea-Bound Monitor**. From here you can:

| Button | Action |
|--------|--------|
| Re-Evaluate All | Re-scan all tokens against regions + Seastone |
| Clear All | Remove Sea-Bound effects from every actor |
| ✓ (green) | Force-clear one actor |
| 🌊 (yellow) | Force-apply Partial to one actor |
| 💀 (red) | Force-apply Submerged to one actor |

---

## 6. Module Settings

Navigate to **Game Settings → Module Settings → PF2E Devil Fruit
Artifacts**.

| Setting | Default | Notes |
|---------|---------|-------|
| Auto-Apply Sea-Bound | On | Disable if you want full manual control |
| Use Elevation for Submersion | On | Negative elevation = Stunned |
| Seastone Region Tag | `sea-water` | Only matters for legacy regions |

---

## 7. Macros (Compendium)

Import from **Devil Fruit Macros** compendium:

| Macro | Use |
|-------|-----|
| Seastone Weapon Hit | Apply timed Sea-Bound from a weapon strike |
| Sea-Bound: Evaluate All Tokens | Manual full-scene re-scan |
| Sea-Bound: Open GM Monitor | Opens the panel (same as toolbar button) |

---

## 8. Predicate Reference for Homebrew Fruits

When writing Rule Elements for your own Devil Fruits, gate every
archetype benefit with:

```json
"predicate": ["!devil-fruit:suppressed"]
```

This roll option is set to `true` on the actor by both Sea-Bound
effects whenever the actor is in water or contact with Seastone.

**Example — suppressed damage bonus:**
```json
{
  "key": "FlatModifier",
  "selector": "strike-damage",
  "value": 4,
  "label": "Flame-Human Empowerment",
  "predicate": ["!devil-fruit:suppressed"]
}
```

**Example — suppressed immunity:**
```json
{
  "key": "ImmunityData",
  "type": ["fire"],
  "predicate": ["!devil-fruit:suppressed"]
}
```
