/**
 * Compendium base item mapping for Spacebone
 * Used to clone a compendium item as base then modify with LLM data.
 * Pack names must exist in the world (e.g. pf1.items, pf-content.pf-wondrous).
 * @author Folken Games
 */

/** Preferred base item names per (type, subType/slot) for equipment and consumables */
export const EQUIPMENT_BASE_PREFERENCES = {
    pack: 'pf1.items',
    /** subType (lowercase) -> preferred compendium item name to find */
    bySubType: {
        ring: 'Ring of Protection +1',
        headband: 'Headband of Alluring Charisma +2',
        belt: 'Belt of Giant Strength +2',
        cloak: 'Cloak of Resistance +1',
        amulet: 'Amulet of Natural Armor +1',
        bracers: 'Bracers of Armor +1',
        boots: 'Boots of the Winterlands',
        gloves: 'Glove of Storing',
        wondrous: 'Glove of Storing',
        'wondrous item': 'Glove of Storing',
        none: 'Glove of Storing'
    },
    /** slot (lowercase) -> preferred name when subType doesn't match */
    bySlot: {
        ring: 'Ring of Protection +1',
        head: 'Headband of Alluring Charisma +2',
        belt: 'Belt of Giant Strength +2',
        shoulders: 'Cloak of Resistance +1',
        neck: 'Amulet of Natural Armor +1',
        wrists: 'Bracers of Armor +1',
        feet: 'Boots of the Winterlands',
        hands: 'Glove of Storing',
        none: 'Glove of Storing'
    }
};

/** Fallback pack for more wondrous variety (if available) */
export const EQUIPMENT_FALLBACK_PACK = 'pf-content.pf-wondrous';

/** Consumable base: pack and preferred name by subType */
export const CONSUMABLE_BASE_PREFERENCES = {
    pack: 'pf1.items',
    bySubType: {
        potion: 'Potion of Cure Light Wounds',
        scroll: 'Scroll of Cure Light Wounds',
        wand: 'Wand of Magic Missile',
        oil: 'Oil of Magic Weapon',
        poison: 'Antitoxin',
        drug: 'Antitoxin'
    }
};

/** Packs to try for consumables (first found wins) */
export const CONSUMABLE_PACKS_TO_TRY = ['pf1.items', 'Folkens-PF1-SharedData.folkenpf1items', 'pf-content.pf-items'];
