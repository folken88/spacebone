# Spacebone – Implementation Plan (from MCP Learnings)

**Purpose:** Plan to implement the options documented in `C:\Users\Tobias Merriman\Documents\foundry-vtt-mcp\SPACEBONE_IMPLEMENTATION_CHECKLIST.md` (and the Justice Gorls, Shackles, Iron Gods learnings) in the **folken-games-spacebone** module so that schema, item factory, and compendium-import logic support tattoos, change targets (tac, nac, allSavingThrows, skill.per, etc.), conditionals, damage type ALL, slotless equipment, cannons, siege ammo, and non-destructive compendium import.

**References:**
- `SPACEBONE_IMPLEMENTATION_CHECKLIST.md` (root checklist)
- `JUSTICE_GORLS_SCAN_LEARNINGS.md` (tattoos, change targets, context notes, consumables)
- `SHACKLES_SHIP_CANNONS_LEARNINGS.md` (cannons, siege ammo)
- `IRON_GODS_WORLD_LEARNINGS.md` (tech, cybertech, PC unique items, ALL damage, conditionals)
- **pf1-magic-item-gen** (`F:\foundryvttstorage\foundryvtt-worlds\f1-world\Data\modules\pf1-magic-item-gen`) – UI-driven clone-then-modify patterns

---

## Learnings from pf1-magic-item-gen (added for Spacebone benefit)

The **pf1-magic-item-gen** module always starts from a compendium base (weapon, armor, or **loot** for ammunition) and never builds from scratch. It uses `pf1.weapons-and-ammo` for weapons and **loot** (ammo), and `pf1.armors-and-shields` for armor/shields. The following patterns can benefit Spacebone:

| Learning | Benefit for Spacebone |
|----------|------------------------|
| **Ammo base from compendium** | For `type: "loot"` and subType ammo, try to get a base from `pf1.weapons-and-ammo` (filter `type === "loot"`) by name or a generic entry (e.g. "Arrow", "Bolt"). Then apply LLM data. Only build siege ammo from scratch when extraType is "siege" or no base matches. |
| **HP/hardness from enhancement** | When applying enhancement to a cloned weapon or armor, update **system.hp** and **system.hardness** by the same rule: e.g. `hp += 10 * enhancement`, `hardness += 2 * enhancement` (pf1-magic-item-gen uses this so magic items are sturdier). |
| **Size on base** | Set **system.size** from itemData.size (sm, med, lg, etc.) when applying to a compendium base, so generated items respect size. |
| **unidentified block** | Ensure **system.unidentified** has name, price (and optionally description.unidentified) so unidentified state is consistent. For tattoos/augments/badges/cards use generic label per learnings; for normal items the full name is fine. |
| **Material by category** | pf1-magic-item-gen filters materials by item category (weapon/armor/loot) and subType (e.g. light/1h/2h for weapons). Spacebone already detects material from text; optionally validate that the chosen material is applicable to the item type (e.g. no adamantine on a bow) to avoid invalid combinations. |

These are added as **Phase 0** tasks below so we pull from compendium for ammo when possible and align clone-then-modify behavior with pf1-magic-item-gen where useful.

---

## Current state (brief)

- **Schema (`scripts/data/pf1-item-schema.js`):** Has `CHANGE_TARGETS`, `CHANGE_MODIFIER_TYPES`, `normalizeChangeTarget`, `normalizeModifierType`. Missing: **tac**, **nac**, **init**, **flySpeed** in documented allowlist; **aac → ac** normalization; **alchemical** in modifier types; **skill.per** (and pattern skill.xxx) is already passed through via `t.startsWith('skill.')`).
- **Factory (`scripts/factories/item-factory.js`):** Clone-then-modify from compendium for weapon/armor/equipment/consumable; fallback `buildCustomItem`. **Slot:** uses `'none'` for slotless in `buildSystemData`; learnings use **"slotless"**. **Actions:** Replaces `sys.actions` entirely when `itemData.actions.length > 0`; conditionals/attackName/extraAttacks from base can be lost. **Damage:** `applyWeaponDamage` only sets a single damage type (no **["ALL"]**). **Loot/Cannons:** No handling for `type: "loot"` (ammo/siege) or cannon weapons (baseTypes: ["Cannon"], subType: siege, tags).
- **Compendium import:** No explicit “preserve base fields unless LLM provides” policy; overwriting can strip conditionals, ALL, etc.

---

## Implementation plan (ordered)

### Phase 0 – Learnings from pf1-magic-item-gen (compendium and clone-then-modify)

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 0.1 | **Loot/ammo base from compendium** | `item-factory.js` | In `getBaseItemFromCompendium`, when `itemData.type === "loot"` and subType is ammo (and extraType is not "siege"), try pack `pf1.weapons-and-ammo`: get documents, filter `o.type === "loot"`, match by name or use first generic ammo (e.g. "Arrow"). Apply LLM via applyLLMDataToBase. For siege ammo (extraType "siege") do not require a compendium base; build per Phase 6. |
| 0.2 | **HP/hardness from enhancement** | `item-factory.js` | When applying enhancement to a compendium base (weapon or armor), update base's **system.hp** (e.g. add 10 × enhancement to base or value) and **system.hardness** (e.g. add 2 × enhancement) so magic items are sturdier, matching pf1-magic-item-gen. |
| 0.3 | **Size on base** | `item-factory.js` | In `applyLLMDataToBase`, set **system.size** from itemData.size (e.g. sm, med, lg) when present, so generated items respect size. |
| 0.4 | **unidentified block** | `item-factory.js` | Ensure when building or applying to base we set **system.unidentified.name** (and optionally price); for normal items use final item name. For tattoos/augments/badges/cards/cannon/siege use generic labels per Phase 2.3/4.2. |
| 0.5 | **Material applicability** (optional) | `item-factory.js` or `materials.js` | Optionally validate that detected material is valid for item type (e.g. no adamantine on bows; loot ammo can have material). Low priority; can be a TODO. |

### Phase 1 – Schema and normalization

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1.1 | **Change targets** | `pf1-item-schema.js` | Add to `CHANGE_TARGETS` (or document in JSDoc): **tac**, **nac**, **init**, **flySpeed**. Ensure **skill.per** and other **skill.xxx** are accepted (already via `normalizeChangeTarget` for `t.startsWith('skill.')`). |
| 1.2 | **Normalize aac → ac** | `pf1-item-schema.js` | In `normalizeChangeTarget()`, add: if `t === 'aac'` return `'ac'`. |
| 1.3 | **Modifier types** | `pf1-item-schema.js` | Add **alchemical** to `CHANGE_MODIFIER_TYPES` (and handle in `normalizeModifierType` if needed). |
| 1.4 | **Context note targets** | `pf1-item-schema.js` (optional) | Add a short comment or constant that ref, fort, will, skill.ste, skill.per (and skill.xxx) are valid context note targets; `buildContextNotes` already keeps any target. |

### Phase 2 – Factory: changes and context notes

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 2.1 | **Multiple changes/contextNotes** | `item-factory.js` | Confirm `buildChangesData` and `buildContextNotes` are used for **arrays** and never reduced to a single entry; no “last write wins.” Already the case; add a brief comment. |
| 2.2 | **Slot "slotless"** | `item-factory.js` | Where slotless equipment is set (e.g. `getEquipmentSlot`, `buildSystemData`, `applyLLMDataToBase`), use **"slotless"** for PF1 slotless items instead of **"none"** (align with learnings). Check PF1 sheet expectation: if sheet expects `slot: "slotless"`, use that; else keep "none" and document. |
| 2.3 | **unidentified.name** | `item-factory.js` | When applying LLM data or building custom items, set **system.unidentified.name** for tattoos ("tattoo"), augments ("augment"), badges ("badge"), cards ("card"), cannons ("cannon"), and siege ammo ("cannonball" / "siege ammo") per learnings. |

### Phase 3 – Weapon actions: damage types, conditionals, flavor

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 3.1 | **Damage type ALL** | `item-factory.js` | In `applyWeaponDamage()` (and any path that sets `damage.parts[].types`), allow **types: ["ALL"]** when LLM/itemData requests adaptive/universal damage (e.g. "ALL" or "all"). Do not replace with a single physical type. |
| 3.2 | **Conditionals** | `item-factory.js` | When applying LLM to a **compendium base**: if base has `actions[].conditionals` and LLM does not provide replacement actions (or only provides partial actions), **merge** or preserve base `conditionals` instead of overwriting. When building from LLM-provided `itemData.actions`, ensure **conditionals** array is copied through (already spread with `...a`; ensure no later code strips it). |
| 3.3 | **attackName and extraAttacks.formula.label** | `item-factory.js` | Same as conditionals: preserve from base when not provided by LLM; when building from LLM actions, keep **attackName** and **extraAttacks.formula.label** if present (already preserved via spread). |

### Phase 3A – Canonical PF1 magic item ability matching (user intent → official modifiers)

**Goal:** When the user’s prompt is similar enough to a known Pathfinder magic item modifier (weapon or armor), Spacebone should use that **official** ability and choose the **tier-appropriate** variant (e.g. “flaming longsword level 15” → Flaming **Burst**, not just Flaming). So: (1) know all PF1 weapon/armor special abilities, (2) match free-text (e.g. `mechanical.effects` or prompt) to those abilities, (3) use item level (or enhancement) to pick the right tier when there are variants (Flaming vs Flaming Burst, Frost vs Icy Burst, etc.), (4) apply the canonical ability’s formulas and description instead of inventing new ones.

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 3A.1 | **Canonical weapon ability registry** | New: `scripts/data/pf1-weapon-abilities.js` (or similar) | Define a registry of PF1 weapon special abilities: **id**, **output name**, **bonus** equivalent (1–5), **caster level**, **keywords/aliases** (e.g. "flaming", "fire", "burns" for Flaming), **damage** (normal formula + type, optional crit formula). Include base and “burst” (or higher-tier) variants: Flaming / Flaming Burst, Frost / Icy Burst, Shock / Shocking Burst, Corrosive / Corrosive Burst, plus other core/UE abilities. Source of truth can be derived from pf1-magic-item-gen’s `genWeaponAbilities.js` (melee + ranged) so data stays consistent. |
| 3A.2 | **Canonical armor ability registry** (optional, same phase or later) | New: `scripts/data/pf1-armor-abilities.js` | Same idea for armor/shield abilities (e.g. Shadow, Slick, Energy Resistance) with bonus, keywords, and any mechanical effects. Lower priority than weapons; can follow same pattern. |
| 3A.3 | **Match text + level to canonical ability** | `item-factory.js` or new `scripts/utils/ability-matcher.js` | Given `mechanical.effects` (string) and `itemData.level` (and/or `itemData.enhancement`), normalize to one or more **canonical ability IDs**. Rules: (a) Match by keywords/aliases (e.g. “flaming” or “fire damage” → Flaming family). (b) **Tier selection:** If user intent matches a family with tiers (e.g. Flaming vs Flaming Burst), use item level or total enhancement to choose: e.g. level ≥ 10 or enhancement ≥ 2 → prefer Flaming Burst; otherwise Flaming. Same for Frost/Icy Burst, Shock/Shocking Burst, Corrosive/Corrosive Burst. (c) Return the chosen ability id(s) so the factory can apply them. |
| 3A.4 | **Apply canonical ability in factory** | `item-factory.js` | When applying magical effects to a weapon (and later armor): (1) Run the matcher to get canonical ability IDs. (2) If any IDs are returned, apply those abilities from the registry (exact damage parts, critParts, and optionally append the ability’s **desc** to the item description) instead of (or before) the current free-text `addSpecialWeaponAbilities` regex logic. (3) If no canonical match, fall back to current behavior (regex on mechanical.effects). Ensure `addSpecialWeaponAbilities` receives **itemData** (or at least level/enhancement) so it can call the matcher; or do matching in `applyLLMDataToBase` and pass resolved ability IDs into the add function. |
| 3A.5 | **LLM hint (optional)** | `base-provider.js` / prompt | Optionally in the item prompt, tell the LLM that known PF1 abilities (Flaming, Flaming Burst, Frost, etc.) should be named explicitly in MECHANICAL_EFFECTS when applicable, so the matcher can rely on exact or near-exact names. Keeps fuzzy matching as fallback. |

**Example:** User prompts “a flaming longsword named Bob that is level 15”. LLM returns e.g. `LEVEL: 15`, `MECHANICAL_EFFECTS: Flaming (or "adds fire damage")`. Matcher maps “flaming”/“fire” to Flaming family; level 15 ≥ 10 → choose **Flaming Burst**. Factory applies Flaming Burst from registry: 1d6 fire (normal) + 1d10 fire (crit), appends official Flaming Burst description. Result: “+1 Flaming Burst longsword” (or +2 if enhancement set accordingly), named Bob.

### Phase 4 – Equipment: slotless, subType other, tattoos

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 4.1 | **slotless + subType other** | `item-factory.js` | Support **slot: "slotless"** and **subType: "other"** for badges, cards, implants, tattoos (per checklist §7). Ensure `getEquipmentSlot` returns "slotless" for these and `buildSystemData` / `applyLLMDataToBase` set slot and subType accordingly. |
| 4.2 | **Tattoos** | `item-factory.js` | When item is identified as tattoo (e.g. subType wondrous + slotless + tag/name hint, or explicit `itemData.subType === 'tattoo'`), set: **type**: equipment, **subType**: wondrous, **slot**: slotless, **unidentified.name**: "tattoo". Same **changes** / **contextNotes** as other wondrous. |

### Phase 5 – Cannons (ship-combat)

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 5.1 | **Cannon weapons** | `item-factory.js` | For weapons that are cannons (e.g. subType **siege** or name/tag hint): set **system.baseTypes: ["Cannon"]**, **system.tags** (e.g. **reload:N**), **system.weaponSubtype** (direct/assault), **system.ammo.type: "siege"**, **unidentified.name: "cannon"**. Add cannon/siege branch in `buildWeaponData` / `getWeaponInfo` (or equivalent) so compendium-base clone or custom build produces correct structure. |
| 5.2 | **Base from compendium** | `item-factory.js` | If compendium has siege/cannon bases, use them in `_getBaseWeaponOrArmor`; otherwise build cannon from scratch with the structure above. |

### Phase 6 – Siege ammunition (loot)

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 6.1 | **Loot item path** | `item-factory.js` | Add handling for **type: "loot"** in `createPF1Item` / `getBaseItemFromCompendium`: non-siege ammo uses Phase 0.1 (compendium base from pf1.weapons-and-ammo when possible). When no base (e.g. siege or custom), build from scratch with **system.subType**, **system.extraType**, etc. |
| 6.2 | **Siege ammo structure** | `item-factory.js` | For ammo that is siege: **type**: loot, **system.subType**: "ammo", **system.extraType**: "siege", **system.weight.value** = caliber (lb), optional **system.tags** (e.g. ammo-weight:N). **unidentified.name**: "cannonball" or "siege ammo". Support in `buildSystemData` (new loot/ammo branch) and/or a dedicated `buildLootData` / `buildSiegeAmmoData`. |

### Phase 7 – Compendium import policy

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 7.1 | **Do not overwrite valid fields** | `item-factory.js` | When applying LLM to a compendium base, **do not overwrite** valid fields that the learnings document (e.g. conditionals, damage types like ALL, change targets tac/nac/allSavingThrows/skill.per, circumstance type) unless the user/LLM explicitly provides a replacement. Prefer **merge**: e.g. merge changes/contextNotes arrays; merge actions (keep base conditionals/attackName/extraAttacks when not in LLM). |
| 7.2 | **Normalize legacy on import** | `item-factory.js` / `pf1-item-schema.js` | When building changes from compendium or LLM, normalize **aac** → **ac** (already in schema after 1.2). Document in schema that this normalization is applied. |

### Phase 8 – Verification and docs

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 8.1 | **Verification** | Manual / tests | After implementation: (1) Schema: allowed change targets and types include checklist entries. (2) Factory: conditionals, attackName, extraAttacks, damage types ALL, changes, contextNotes are not stripped; multiple entries allowed. (3) Import: compendium base + LLM preserves documented fields. |
| 8.2 | **Update IMPROVEMENTS_AND_LEARNINGS.md** | `IMPROVEMENTS_AND_LEARNINGS.md` | Add a short section referencing this plan and the checklist, and that tac, nac, allSavingThrows, skill.per, circumstance, ALL, conditionals, slotless, cannons, siege ammo, and tattoos are now supported. |

---

## File summary

| File | Changes |
|------|---------|
| `scripts/data/pf1-item-schema.js` | Add tac, nac, init, flySpeed; aac→ac; alchemical; optional context-note target comment. |
| `scripts/data/pf1-weapon-abilities.js` (new) | Canonical PF1 weapon special abilities (id, name, bonus, keywords, damage formulas); optional `pf1-armor-abilities.js` for armor. |
| `scripts/factories/item-factory.js` | Phase 0: loot/ammo compendium base, HP/hardness from enhancement, size, unidentified. Phase 3A: match mechanical.effects + level to canonical abilities; apply registry abilities (with tier choice, e.g. Flaming Burst for level 15). Slot "slotless"; unidentified.name; damage ALL; preserve/merge conditionals; cannon; loot/siege; compendium-import merge. |
| `scripts/utils/ability-matcher.js` (new, optional) | Normalize free text + item level/enhancement to canonical ability IDs; tier selection (e.g. Flaming vs Flaming Burst by level). |
| `IMPROVEMENTS_AND_LEARNINGS.md` | Note implementation of checklist and new options. |

---

## Checklist mapping (quick reference)

- **pf1-magic-item-gen learnings** → Phase 0 (ammo from compendium, HP/hardness, size, unidentified, optional material check).
- **§1 Change targets** → Phase 1 (schema) + Phase 2 (multi-change, no strip).
- **§2 Change types** → Phase 1 (alchemical).
- **§3 Context note targets** → Phase 1 (docs) + Phase 2 (already supported).
- **§4 Damage types ALL** → Phase 3.1.
- **Canonical PF1 ability matching** (user says "flaming level 15" → Flaming Burst) → Phase 3A.
- **§5 Weapon conditionals** → Phase 3.2, 3.3, 7.1.
- **§6 Weapon flavor** → Phase 3.3, 7.1.
- **§7 Equipment slots** → Phase 2.2, 2.3, 4.1, 4.2.
- **§8 Multiple changes** → Phase 2.1.
- **§9 Cannons** → Phase 5.
- **§10 Siege ammo** → Phase 6.
- **§11 Tattoos** → Phase 4.2, 2.3.
- **§12 Compendium import** → Phase 7.

Once these are done, the options from the learnings are **available to Spacebone** after import or create.
