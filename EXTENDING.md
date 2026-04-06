# Extending — Adding Your Own Devil Fruits

This guide walks through creating a fully-functional custom Devil Fruit
for your campaign using the module's framework.

---

## Fruit Template

Every Devil Fruit item needs these minimum fields:

```json
{
  "_id": "yourFruitId00001",
  "name": "Devil Fruit: [Name]",
  "type": "equipment",
  "img": "path/to/icon.webp",
  "system": {
    "description": { "value": "<p>...</p>", "gm": "" },
    "slug": "devil-fruit-your-slug",
    "traits": {
      "value": ["sea-bound", "artifact", "cursed", "invested", "magical"],
      "rarity": "unique"
    },
    "level": { "value": 10 },
    "price": { "value": { "gp": 0 } },
    "quantity": 1,
    "bulk": { "value": "L" },
    "equipped": { "carryType": "held", "inSlot": false, "invested": null },
    "usage": { "value": "held-in-one-hand" },
    "rules": [
      { "key": "ActorTraits", "add": ["sea-bound"] }
      /* Add your archetype REs here */
    ],
    "category": "held",
    "group": null,
    "baseItem": null,
    "material": { "type": null, "grade": null }
  },
  "flags": {
    "pf2e-devil-fruit-artifacts": {
      "artifactType": "devil-fruit",
      "archetypeSlug": "your-archetype-slug",
      "fruitType": "paramecia"   // or "zoan" | "logia"
    }
  }
}
```

---

## Rule Element Patterns

### Passive stat bonus (suppressed in water)
```json
{
  "key": "FlatModifier",
  "selector": "saving-throw",
  "type": "untyped",
  "value": 2,
  "label": "Your Fruit Passive",
  "predicate": ["!devil-fruit:suppressed"]
}
```

### Damage immunity (suppressed)
```json
{
  "key": "ImmunityData",
  "type": ["fire"],
  "predicate": ["!devil-fruit:suppressed"]
}
```

### Damage resistance (suppressed)
```json
{
  "key": "Resistance",
  "type": "bludgeoning",
  "value": 10,
  "predicate": ["!devil-fruit:suppressed"]
}
```

### Physical immunity (Logia intangibility)
```json
{
  "key": "ImmunityData",
  "type": ["physical"],
  "exceptions": ["magical"],
  "predicate": ["!devil-fruit:suppressed"],
  "label": "Logia Intangibility"
}
```

### Speed bonus (suppressed)
```json
{
  "key": "BaseSpeed",
  "selector": "land-speed",
  "value": 10,
  "predicate": ["!devil-fruit:suppressed"]
}
```

### Granting archetype feats at purchase
```json
{
  "key": "GrantItem",
  "uuid": "Compendium.your-module.feats.Item.YourDedicationFeatId",
  "flag": "devilFruitDedication",
  "onDeleteActions": { "grantee": "restrict" }
}
```

---

## Fruit Types

### Paramecia
- Body-altering or environmental powers
- Typically: damage bonuses, resistances, movement options
- Suppression shuts off powers but not the body change itself
  (e.g. rubber body still exists, just can't stretch)

### Zoan
- Animal transformation
- At minimum: alternate form with different speed/attack REs, all
  gated on `!devil-fruit:suppressed`
- Full transformation unavailable while Sea-Bound

### Logia
- Elemental body — the most powerful type
- **Must** include physical immunity predicated on `!devil-fruit:suppressed`
- Element weakness (e.g. Mera weakness to water) should NOT be suppressed
  (the weakness exists regardless of Sea-Bound status)
- Recommended level 14–18

---

## Seastone Item Template

Any item that should trigger Sea-Bound on contact needs the `seastone`
trait:

```json
{
  "system": {
    "traits": {
      "value": ["seastone"]
    },
    "material": { "type": "seastone", "grade": "standard" }
  }
}
```

The `SeaBoundManager` will automatically detect it when the item is in
the actor's inventory and not in the `dropped` carry state.

---

## Adding to the Compendium

1. Add your JSON to `src/packs/devil-fruit-artifacts/`
2. Run `npm run build` to compile to LevelDB
3. Or: in Foundry, create the item manually and use the **fvtt-cli**
   `unpack` command to export it back to JSON source

---

## Accessing the API in Macros

```js
// Force Sea-Bound state on a targeted actor
const actor = game.user.targets.first()?.actor;
if (actor) await game.devilFruitArtifacts.SeaBoundManager.forceState(actor, "submerged");

// Apply timed Sea-Bound from a Seastone weapon hit (opens dialog)
await game.devilFruitArtifacts.applySeastoneHit();

// Re-evaluate all tokens on the scene
await game.devilFruitArtifacts.evaluateAll();
```
