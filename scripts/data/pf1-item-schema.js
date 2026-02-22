/**
 * PF1 item schema knowledge (derived from live Foundry VTT items via MCP).
 * Use these shapes and constants so Spacebone output matches PF1 expectations.
 * @author Folken Games
 */

/** PF1 change entry: conditional modifier applied to a target. */
export const CHANGE_SHAPE = {
    _id: '',
    formula: '0',
    target: 'misc',
    type: 'untyped',
    operator: 'add',
    priority: 0,
    value: 0
};

/** Common PF1 change targets (Shackles + Carrion Crown: belts, rings, Spell Prism, Muleback Cords, etc.). */
export const CHANGE_TARGETS = {
    ac: 'ac',
    deflectionAC: 'ac',
    dex: 'dex',
    str: 'str',
    con: 'con',
    int: 'int',
    wis: 'wis',
    cha: 'cha',
    ref: 'ref',
    fort: 'fort',
    will: 'will',
    allSavingThrows: 'allSavingThrows',
    skill_acr: 'skill.acr',
    skill_clm: 'skill.clm',
    skill_ste: 'skill.ste',
    skill_hea: 'skill.hea',
    chaSkills: 'chaSkills',
    landSpeed: 'landSpeed',
    swimSpeed: 'swimSpeed',
    carryStr: 'carryStr',
    dc_school_evo: 'dc.school.evo',
    sdamage: 'sdamage',
    misc: 'misc'
};

/** PF1 modifier types for changes (type field). */
export const CHANGE_MODIFIER_TYPES = [
    'untyped', 'deflection', 'enh', 'competence', 'insight', 'resist',
    'circumstance', 'natural', 'dodge', 'armor', 'shield', 'size', 'luck', 'moral'
];

/** PF1 context note: conditional text (e.g. "Chelish Agent: +2 on persuasion vs Chelish Citizens."). */
export const CONTEXT_NOTE_SHAPE = { text: '', target: 'misc' };

/** PF1 uses object (charges / communal pool). Empty when no charges. */
export const USES_SHAPE = {
    value: null,
    per: '',
    autoDeductChargesCost: '',
    maxFormula: '',
    rechargeFormula: '',
    pricePerUse: 0
};

/** PF1 HP object for items that can be damaged. */
export const HP_SHAPE = { base: 0, offset: 0, max: 0, value: 0 };

/** PF1 hardness object. */
export const HARDNESS_SHAPE = { base: 0, total: 0 };

/** PF1 aura: school abbreviations used in live data. Some items use school "misc" (e.g. Wild armor). */
export const AURA_SCHOOLS = {
    abjuration: 'abj',
    conjuration: 'con',
    divination: 'div',
    enchantment: 'enc',
    evocation: 'evo',
    illusion: 'ill',
    necromancy: 'nec',
    transmutation: 'trs',
    universal: 'universal',
    misc: 'misc'
};

/** Aura strength values. */
export const AURA_STRENGTHS = ['faint', 'moderate', 'strong', 'overwhelming'];

/**
 * Normalize a change target from LLM/schema (e.g. "skill.ste" or "stealth") to PF1 target.
 * @param {string} raw - Raw target (e.g. "ac", "dex", "skill.ste", "chaSkills")
 * @returns {string} PF1 target string
 */
export function normalizeChangeTarget(raw) {
    if (!raw || typeof raw !== 'string') return 'misc';
    const t = raw.trim().toLowerCase();
    if (t === 'ac' || t === 'armor class') return 'ac';
    if (t === 'ref' || t === 'reflex') return 'ref';
    if (t === 'fort' || t === 'fortitude') return 'fort';
    if (t === 'will') return 'will';
    if (t === 'saves' || t === 'all saving throws') return 'allSavingThrows';
    if (t === 'stealth' || t === 'ste') return 'skill.ste';
    if (t === 'acrobatics' || t === 'acr') return 'skill.acr';
    if (t === 'climb' || t === 'clm') return 'skill.clm';
    if (t === 'heal' || t === 'hea') return 'skill.hea';
    if (t === 'cha skills' || t === 'chaskills') return 'chaSkills';
    if (t === 'land speed' || t === 'landspeed') return 'landSpeed';
    if (t === 'carry' || t === 'carrying capacity' || t === 'carrystr') return 'carryStr';
    if (t === 'swim speed' || t === 'swimspeed') return 'swimSpeed';
    if (t.startsWith('skill.')) return t;
    if (['dex', 'str', 'con', 'int', 'wis', 'cha'].includes(t)) return t;
    return t || 'misc';
}

/**
 * Normalize modifier type to PF1 (type field).
 * @param {string} raw - Raw modifier (e.g. "deflection", "competence", "enhancement")
 * @returns {string} PF1 type string
 */
export function normalizeModifierType(raw) {
    if (!raw || typeof raw !== 'string') return 'untyped';
    const m = raw.trim().toLowerCase();
    if (m === 'enhancement' || m === 'enh') return 'enh';
    if (m === 'deflection') return 'deflection';
    if (m === 'competence') return 'competence';
    if (m === 'insight') return 'insight';
    if (m === 'resistance' || m === 'resist') return 'resist';
    if (m === 'circumstance') return 'circumstance';
    if (CHANGE_MODIFIER_TYPES.includes(m)) return m;
    return 'untyped';
}
