/**
 * Canonical PF1 weapon special abilities for Spacebone (aligned with pf1-magic-item-gen).
 * Used to map user/LLM intent (e.g. "flaming", "fire", level 15) to official ability and tier (Flaming vs Flaming Burst).
 * @author Folken Games
 */

/**
 * Single ability: id, display name, bonus equivalent, keywords for matching, damage formulas.
 * @typedef {Object} WeaponAbilityEntry
 * @property {string} id - Unique id (e.g. 'flaming', 'flamingburst')
 * @property {string} output - Display name (e.g. 'Flaming Burst')
 * @property {number} bonus - Enhancement bonus equivalent (1-5)
 * @property {string[]} keywords - Match when mechanical.effects contains any of these (lowercase)
 * @property {string} formula - Normal hit damage formula (e.g. '1d6')
 * @property {string} type - Damage type (e.g. 'fire')
 * @property {string} [critFormula] - Critical hit extra damage (burst abilities)
 * @property {string} [family] - Family id for tier choice (e.g. 'flaming' → pick flaming or flamingburst by level)
 */

/** Base (bonus 1) and burst (bonus 2) share same family; matcher picks by level/enhancement. */
export const PF1_WEAPON_ABILITIES = [
    { id: 'flaming', output: 'Flaming', bonus: 1, family: 'flaming', keywords: ['flaming', 'fire', 'burns', 'flame'], formula: '1d6', type: 'fire' },
    { id: 'flamingburst', output: 'Flaming Burst', bonus: 2, family: 'flaming', keywords: ['flaming burst', 'flaming burst', 'flame burst'], formula: '1d6', type: 'fire', critFormula: '1d10' },
    { id: 'frost', output: 'Frost', bonus: 1, family: 'frost', keywords: ['frost', 'icy', 'cold', 'freeze'], formula: '1d6', type: 'cold' },
    { id: 'icyburst', output: 'Icy Burst', bonus: 2, family: 'frost', keywords: ['icy burst', 'frost burst', 'ice burst'], formula: '1d6', type: 'cold', critFormula: '1d10' },
    { id: 'shock', output: 'Shock', bonus: 1, family: 'shock', keywords: ['shock', 'shocking', 'electricity', 'lightning'], formula: '1d6', type: 'electricity' },
    { id: 'shockingburst', output: 'Shocking Burst', bonus: 2, family: 'shock', keywords: ['shocking burst', 'shock burst'], formula: '1d6', type: 'electricity', critFormula: '1d10' },
    { id: 'corrosive', output: 'Corrosive', bonus: 1, family: 'corrosive', keywords: ['corrosive', 'acid'], formula: '1d6', type: 'acid' },
    { id: 'corrosiveburst', output: 'Corrosive Burst', bonus: 2, family: 'corrosive', keywords: ['corrosive burst', 'acid burst'], formula: '1d6', type: 'acid', critFormula: '1d10' },
    { id: 'thundering', output: 'Thundering', bonus: 1, keywords: ['thundering', 'thunder', 'sonic'], formula: '1d8', type: 'sonic' },
    { id: 'holy', output: 'Holy', bonus: 2, keywords: ['holy', 'good'], formula: '2d6', type: 'positive' },
    { id: 'unholy', output: 'Unholy', bonus: 2, keywords: ['unholy', 'evil'], formula: '2d6', type: 'negative' },
    { id: 'axiomatic', output: 'Axiomatic', bonus: 2, keywords: ['axiomatic', 'lawful'], formula: '2d6', type: 'lawful' },
    { id: 'anarchic', output: 'Anarchic', bonus: 2, keywords: ['anarchic', 'chaotic'], formula: '2d6', type: 'chaotic' },
    { id: 'vicious', output: 'Vicious', bonus: 2, keywords: ['vicious'], formula: '2d6', type: 'untyped' },
    { id: 'wounding', output: 'Wounding', bonus: 2, keywords: ['wounding', 'bleed'], formula: '1', type: 'bleed' }
];

/** Family → burst ability id (burst ids are not always family+burst, e.g. icyburst not frostburst). */
export const BURST_ABILITY_IDS = { flaming: 'flamingburst', frost: 'icyburst', shock: 'shockingburst', corrosive: 'corrosiveburst' };

/**
 * Resolve (effects text, item level, enhancement) to a list of canonical ability IDs.
 * For burst families: if level >= 10 or enhancement >= 2, prefer burst; else base.
 * @param {string} mechanicalEffects - Raw mechanical effects text (e.g. from LLM)
 * @param {number} [itemLevel] - Item level 1-20
 * @param {number} [enhancement] - Enhancement bonus
 * @returns {string[]} Ability ids to apply (e.g. ['flamingburst'])
 */
export function matchCanonicalWeaponAbilities(mechanicalEffects, itemLevel = 0, enhancement = 0) {
    if (!mechanicalEffects || typeof mechanicalEffects !== 'string') return [];
    const text = mechanicalEffects.toLowerCase();
    const useBurstTier = (itemLevel >= 10 || enhancement >= 2);
    const applied = new Set();

    for (const ability of PF1_WEAPON_ABILITIES) {
        const matches = ability.keywords.some(kw => text.includes(kw));
        if (!matches) continue;
        if (ability.family && BURST_ABILITY_IDS[ability.family]) {
            const burstId = BURST_ABILITY_IDS[ability.family];
            const burstEntry = PF1_WEAPON_ABILITIES.find(a => a.id === burstId);
            const baseId = ability.family;
            const baseEntry = PF1_WEAPON_ABILITIES.find(a => a.id === baseId);
            const explicitlyBurst = burstEntry && burstEntry.keywords.some(kw => text.includes(kw));
            if (explicitlyBurst && burstEntry) {
                applied.add(burstEntry.id);
            } else if (useBurstTier && burstEntry) {
                applied.add(burstEntry.id);
            } else if (baseEntry) {
                applied.add(baseEntry.id);
            }
        } else {
            applied.add(ability.id);
        }
    }
    return [...applied];
}

/**
 * Get ability entry by id.
 * @param {string} id - Ability id
 * @returns {WeaponAbilityEntry|undefined}
 */
export function getWeaponAbilityById(id) {
    return PF1_WEAPON_ABILITIES.find(a => a.id === id);
}
