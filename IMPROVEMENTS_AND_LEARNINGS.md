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

## Implementation plan (SPACEBONE_IMPLEMENTATION_PLAN.md) – completed options

Implementation followed `SPACEBONE_IMPLEMENTATION_PLAN.md` (from MCP learnings and pf1-magic-item-gen). The following are now supported:

- **Schema:** Change targets **tac**, **nac**, **init**, **flySpeed**, **skill.per**; **aac** normalized to **ac**; modifier type **alchemical**; context note targets (ref, fort, will, skill.xxx) documented.
- **Clone-then-modify:** Loot/ammo base from compendium (pf1.weapons-and-ammo) for non-siege ammo; HP/hardness from enhancement; **system.size** from item level; **unidentified** block and generic labels (tattoo, augment, badge, card, cannon, cannonball).
- **Slot:** **slotless** used for slotless equipment (not "none"); **subType other** and tattoo handling (wondrous + slotless).
- **Weapons:** Damage type **["ALL"]** for adaptive damage; **conditionals**, **attackName**, **extraAttacks.formula.label** preserved when merging LLM actions with base.
- **Canonical PF1 abilities:** User intent (e.g. "flaming longsword level 15") maps to official ability and tier (e.g. Flaming Burst) via `pf1-weapon-abilities.js` and `matchCanonicalWeaponAbilities()`; applied in factory before fallback regex.
- **Cannons:** **baseTypes: ["Cannon"]**, **weaponSubtype**, **ammo.type: "siege"**, **tags** (e.g. reload:3); cannon/siege in `getWeaponInfo` and `buildWeaponData`.
- **Siege ammo:** **type: loot**, **subType: ammo**, **extraType: siege**, **weight.value** (caliber), **unidentified.name: cannonball**; build-from-scratch in `buildSystemData` when no compendium base.
- **Compendium import:** Changes and contextNotes are **merged** with base (not replaced); base conditionals/flavor preserved when LLM does not supply them.

---

## v1.2.0: Ship Generation, Roll Tables, Actor Cloning, Tabbed UI (2026-03-24)

### New Features

**Ship Generation** (`ship-factory.js`)
- Creates `ship-combat-pf1.ship` actors from text prompts
- Ship class lookup (skiff/sloop/brig/frigate/galleon/man-o-war) with correct HP/AC/speed/gun deck stats
- Faction-specific cannon templates: Chelish (heavy), Andoran Liberty Guns (light/crit), Taldor Hammers, Bronze Fleet, Shackles
- Auto-generates ammunition (round/chain/grape shot), repair materials (faction-appropriate wood + siltstone), and sails
- Only available when `ship-combat-pf1` module is active

**Roll Table Generation** (`table-factory.js`)
- Creates `RollTable` documents from text prompts (e.g., "d20 Fever Sea random encounters")
- Supports any die formula (d6, d20, d100, 2d6)
- Auto-normalizes ranges, deduplicates entries
- Works from RollTable directory sidebar (new Spacebone button)

**Actor Cloning** (`pf1-clone-factory.js`)
- Deep-clones an existing actor and applies LLM-directed mutations
- Preserves ALL items (feats, class, equipment, spells) from the source
- Changes: name, race (with compendium swap), gender, deity, alignment, age, height, weight, personality, appearance
- User-specified names in quotes are forced (overrides LLM)
- Race swap removes old race item + racial feats, adds new ones from compendium

**Tabbed Actor Dialog**
- Actor creator now has tabs: Create NPC | Clone Actor | Create Ship
- Ship tab only shows when ship-combat-pf1 is active
- Tab state persisted on instance (fixes Foundry Dialog re-render losing DOM state)

**House Rules in NPC Prompt**
- Auto-granted feats documented (Power Attack, Piranha Strike, Dodge+Mobility, PBS+Precise Shot, etc.) — implicit, not added to sheet
- Point buy tiers: 25 (PCs/villains), 20 (standard NPCs), 15 (jabronis)
- Max HP per level, high magic campaign, Skull & Shackles setting

**All Providers Updated**
- `generateShip()`, `generateTable()`, `generateClone()` added to all 4 providers (Anthropic, OpenAI, Gemini, Local)
- New template formats: SHIP TEMPLATE, TABLE TEMPLATE, CLONE TEMPLATE
- Parsers in BaseProvider for all new template types

### Bug Fixes
- Fixed Dialog tab state loss: Foundry's Dialog re-renders HTML on button callback, losing DOM state. Now stores `_activeTab` on SpaceboneUI instance.
- Fixed clone factory item IDs: `delete item._id` on all cloned items so Foundry generates fresh embedded document IDs.
- Fixed clone name override: extracts user-specified names from quotes or "named X" patterns.

### Technical Notes
- Clone factory uses `foundry.utils.deepClone(sourceActor.toObject())` for perfect data preservation
- Ship factory has static CANNON_TEMPLATES, AMMO_DEFAULTS, WOOD_TYPES lookup tables matching ship-combat-pf1's ShipConstants
- Debug logging throughout all new factories, controllable via debugMode setting
