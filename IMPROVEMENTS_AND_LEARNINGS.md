# Spacebone – Improvements & Learnings

## Bug fix: Armor value on non-armor items (done)

**Problem:** Equipment items (wondrous, rings, etc.) were sometimes created with an armor value (often 4), because `buildSystemData()` added `systemData.armor` for *all* equipment, and `getArmorInfo(subType)` returns a default `{ value: 4, ... }` when the subtype (e.g. "wondrous", "ring") is not in the armor map.

**Fix (in `item-factory.js`):**
- Only add `systemData.armor` when `itemData.type === 'armor'`. Wondrous/rings/other equipment no longer get any armor block.
- In `validateItemData()`, strip `system.armor` from any non-armor item as a safety net.

## Comparison with pf1-magic-item-gen

- **pf1-magic-item-gen** is UI-driven: user picks a **base item** from compendium (weapon or armor), then adds quality, material, enhancement, and special abilities. It never builds items from scratch; it always clones a compendium entry. So armor/weapon structure is always correct by construction.
- **Spacebone** builds items from LLM output, including from scratch via `buildCustomItem()` / `buildSystemData()`. That required type-aware logic so only armor items get `system.armor`.
- Takeaway: when building PF1 data from scratch, only set type-specific fields (e.g. `armor`, `enh`, weapon `actions`) for the correct item type.

## Future directions (PCs, NPCs, vehicles, ships)

- **Items:** Current focus; the armor fix keeps equipment correct. Further hardening: validate LLM `type`/`subType` against allowed values before building.
- **PCs/NPCs:** Spacebone already has `createActor()` and PF1/PF2 actor factories. Extending to “prompt → full PC/NPC” will need: LLM schema for stats, class/race, items; and reuse of existing actor factories plus compendium lookups (similar to weapon/armor base items).
- **Vehicles / ship actors:** For **pf1-ship-combat**, ships are likely actors with a specific data shape. Next steps: inspect a ship actor (e.g. from `ship-combat-pf1.ship-combat-pf1-ships`) via MCP or in Foundry, document the schema, then add a “ship” or “vehicle” creation path that uses a base from compendium + LLM-generated name/stats/flavor.
- **MCP:** Spacebone’s `MCPHelper` and Foundry MCP Bridge allow Cursor/Claude to verify created items/actors and query compendiums. Use MCP to pull sample PF1 items/actors/ships and align Spacebone output with those structures.

## MCP-derived PF1 item schema (baked into Spacebone)

Live items were inspected via Foundry MCP (`get-character-entity` on Shackles PCs: Ring of Protection +1, Ring of the Chelish Agent, Besmara's Bicorne, The Operative +2, Spring Forward, Maelstrom, Scroll of Scorching Ray). The following shapes are enforced in code and documented in `scripts/data/pf1-item-schema.js`.

### Changes (conditional modifiers)

- **PF1 shape:** `_id`, `formula`, `target`, `type` (modifier type), `operator: "add"`, `priority`, `value: 0`.
- **Targets seen:** `ac`, `dex`, `ref`, `skill.acr`, `skill.clm`, `skill.ste`, `chaSkills`, `allSavingThrows`, `landSpeed`, `swimSpeed`, `dc.school.evo`, `sdamage`.
- **Modifier types:** `deflection`, `enh`, `competence`, `insight`, `resist`, `circumstance`, `untyped`.
- Spacebone's `buildChangesData()` now outputs this shape; `normalizeChangeTarget()` and `normalizeModifierType()` map LLM/schema names to PF1 values.

### Context notes, Uses, HP/hardness, Aura

- **Context notes:** `{ text, target }`. `buildContextNotes()` already matched.
- **Uses:** `value`, `per`, `autoDeductChargesCost`, `maxFormula`, `rechargeFormula`, `pricePerUse`, `max`, `autoDeductCharges`. `applyLLMDataToBase()` and `buildUsesData()` now use this shape.
- **HP:** `{ base, offset, max, value }`. **Hardness:** `{ base, total }`. **Aura:** `custom`, `school` (abj/trs/evo), `strength` (faint/moderate/strong). `extractAuraSchool()` / `extractAuraStrength()` used when applying LLM aura.

## Carrion Crown (level 12–15 PCs) – additional learnings

MCP was used on the **Carrion Crown** world to inspect level 12–15 PCs (Vex 15, Adivion 14) and level 11 PCs with elaborate items (Kovira, Kate Blackwood, Dinvaya). New or reinforced details:

### Change targets

- **carryStr** – Carrying capacity (e.g. Muleback Cords: `target: "carryStr"`, formula `"8"`, type `enh`). Added to `CHANGE_TARGETS` and `normalizeChangeTarget()` (e.g. "carrying capacity" → carryStr).
- **skill.hea** – Heal skill (e.g. God Complex book: context note target `skill.hea`). Added to schema.

### Context notes

- **spellEffect** – Context note target used for spell-like effects (e.g. Spell Prism: "[[1d20]] spell slot recharged on natural 20", target `spellEffect`). Spacebone’s `buildContextNotes()` accepts any target string; no code change needed.

### Weapons

- **damage.sizeRoll** – PF1 uses `sizeRoll(dice, sides, @size)` (e.g. 1d12 → `sizeRoll(1, 12, @size)`). Echo used `sizeRoll(10, 1, @size)` (sides/dice order varies by source); Blood Shard uses (1, 12). Spacebone’s `applyWeaponDamage()` uses (dice, sides).
- **damage.nonCritParts** – Optional array for non-critical extra damage (e.g. Blood Shard: 1d3 negative on hit).
- **action.notes.effect** – Array of strings (e.g. "Wielder is healed an amount equal to the negative energy damage delivered.").

### Equipment with multiple actions (spell activations)

- **God Complex** – Wondrous item with multiple `actions`: each has `_id`, `name`, `description`, `activation`, `duration`, `target`, `range`, **uses.self** `{ value, maxFormula, per: "single" }`, `actionType: "heal"`, `ammo.cost: 1`. So equipment can have several use-once “scroll” actions with per-action uses.

### Armor

- **aura.school "misc"** – Some special materials (e.g. Wild Mithral Full Plate) use `aura: { custom: true, school: "misc" }`. Added `misc` to `AURA_SCHOOLS`.
- **armor.spellFailure** – Numeric (e.g. 35 for full plate). Already in PF1 armor shape.

### Uses

- Empty charges: both `value: null` (Shackles, Belt of Physical Perfection) and `value: 0` (God Tier Belt, Mithral Shirt) appear. Spacebone tolerates both when merging.
