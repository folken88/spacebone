/**
 * PF1 Special Materials System
 * Based on pf1-magic-item-gen implementation with enhancements for Spacebone
 * 
 * Material properties:
 * - weightMod: multiplier for weight (0.5 = half weight)
 * - hardness: material hardness value
 * - hp: hit points per inch of thickness
 * - masterwork: whether material forces masterwork quality
 * - armorCategoryReduction: reduces armor category (heavy→medium→light)
 * - armorDexBonus: bonus to max dex for armor
 * - armorCheckPenaltyReduction: reduction to armor check penalty
 * - spellFailureReduction: reduction to spell failure percentage
 * - priceModifier: cost modification (flat, weight-based, or multiplier)
 * - specialProperties: array of special material effects
 */

export const SPECIAL_MATERIALS = {
    // Base/Standard Materials
    'none': {
        id: 'none',
        name: 'Standard Material',
        description: 'Standard steel, leather, or other common materials.',
        weightMod: 1.0,
        hardness: 0, // Will use base item hardness
        hp: 0, // Will use base item HP
        masterwork: false,
        priceModifier: { type: 'flat', value: 0 },
        specialProperties: []
    },

    // Precious Metals
    'mithral': {
        id: 'mithral',
        name: 'Mithral',
        description: 'A rare, silvery metal that is lighter than steel but just as hard. Mithral armor is one category lighter than normal for movement purposes.',
        weightMod: 0.5,
        hardness: 15,
        hp: 30,
        masterwork: true,
        armorCategoryReduction: true,
        armorDexBonus: 2,
        armorCheckPenaltyReduction: 3,
        spellFailureReduction: 10,
        priceModifier: { 
            type: 'flat', 
            value: { weapon: 500, lightArmor: 1000, mediumArmor: 4000, heavyArmor: 9000, shield: 1000 }
        },
        specialProperties: ['silver_equivalent']
    },

    'adamantine': {
        id: 'adamantine',
        name: 'Adamantine',
        description: 'An ultrahard metal that fell from the heavens. Adamantine weapons bypass hardness less than 20, and armor provides damage reduction.',
        weightMod: 1.0,
        hardness: 20,
        hp: 40,
        masterwork: true,
        priceModifier: { 
            type: 'flat', 
            value: { weapon: 3000, lightArmor: 5000, mediumArmor: 10000, heavyArmor: 15000, shield: 2000 }
        },
        specialProperties: ['bypass_hardness_20', 'damage_reduction']
    },

    'cold_iron': {
        id: 'cold_iron',
        name: 'Cold Iron',
        description: 'Iron forged in cold conditions, effective against fey and certain extraplanar creatures.',
        weightMod: 1.0,
        hardness: 10,
        hp: 30,
        masterwork: false,
        priceModifier: { type: 'multiplier', value: 2 },
        enchantmentCost: 2000, // Extra cost to enchant
        specialProperties: ['cold_iron_bypass']
    },

    'silver': {
        id: 'silver',
        name: 'Alchemical Silver',
        description: 'Silver bonded to steel through alchemy, effective against lycanthropes and certain undead.',
        weightMod: 1.0,
        hardness: 8,
        hp: 10,
        masterwork: false,
        priceModifier: { 
            type: 'flat', 
            value: { light: 20, '1h': 90, '2h': 180, ammo: 2 }
        },
        specialProperties: ['silver_bypass', 'damage_penalty_1']
    },

    // Exotic Materials
    'darkwood': {
        id: 'darkwood',
        name: 'Darkwood',
        description: 'A rare magical wood as hard as normal wood but very light. Only usable for shields and weapon hafts.',
        weightMod: 0.5,
        hardness: 5,
        hp: 10,
        masterwork: true,
        priceModifier: { type: 'flat', value: { shield: 257 } },
        specialProperties: ['wood_only'],
        applicableTypes: ['shield', 'weapon_haft']
    },

    'dragonhide': {
        id: 'dragonhide',
        name: 'Dragonhide',
        description: 'Scales and hide from a dragon, naturally resistant to one energy type.',
        weightMod: 1.0,
        hardness: 10,
        hp: 10,
        masterwork: false,
        priceModifier: { type: 'multiplier', value: 2 },
        specialProperties: ['energy_resistance_5'],
        applicableTypes: ['armor']
    },

    // Campaign-Specific Materials (inspired by sample items)
    'skymetal': {
        id: 'skymetal',
        name: 'Skymetal',
        description: 'Extraterrestrial metal from Numeria, constructed with unknown techniques. Contains technological components.',
        weightMod: 0.8,
        hardness: 14,
        hp: 22,
        masterwork: true,
        priceModifier: { type: 'flat', value: { weapon: 8000 } },
        specialProperties: ['technological', 'compass_built_in', 'survival_bonus_2']
    },

    'sea_steel': {
        id: 'sea_steel',
        name: 'Sea-Steel',
        description: 'Magically hardened deep-sea coral that appears like polished steel with an iridescent sheen.',
        weightMod: 0.9, // Naturally buoyant
        hardness: 8,
        hp: 15,
        masterwork: true,
        priceModifier: { type: 'flat', value: { weapon: 375 } }, // 450-75 base cost
        specialProperties: ['underwater_no_penalty', 'corrosion_resistant']
    },

    'living_steel': {
        id: 'living_steel',
        name: 'Living Steel',
        description: 'Glossy green metal that slowly repairs itself over time.',
        weightMod: 1.0,
        hardness: 15,
        hp: 35,
        masterwork: false,
        priceModifier: { type: 'flat', value: { weapon: 500, shield: 100 } },
        specialProperties: ['self_repair_2hp_day', 'damages_metal_weapons']
    },

    'bone': {
        id: 'bone',
        name: 'Bone',
        description: 'Specially treated and hardened bone, lighter than metal but more fragile.',
        weightMod: 0.5,
        hardness: 5, // Half of base item hardness
        hp: 0, // Uses base item HP
        masterwork: false,
        priceModifier: { type: 'flat', value: 0 },
        specialProperties: ['fragile'],
        hardnessModifier: 'half'
    },

    'obsidian': {
        id: 'obsidian',
        name: 'Obsidian',
        description: 'Volcanic glass that can be worked to an incredibly sharp edge.',
        weightMod: 0.75,
        hardness: 5,
        hp: 1,
        masterwork: false,
        priceModifier: { type: 'flat', value: { weapon: 20 } },
        specialProperties: ['fragile', 'razor_sharp'],
        hardnessModifier: 'half'
    }
};

/**
 * Get materials applicable to a specific item type and subtype
 * @param {string} itemType - 'weapon', 'armor', 'shield', etc.
 * @param {string} itemSubtype - weapon subtype like 'light', '1h', '2h', or armor subtype
 * @returns {Array} Array of applicable materials
 */
export function getApplicableMaterials(itemType, itemSubtype = '') {
    const applicable = [];
    
    for (const [key, material] of Object.entries(SPECIAL_MATERIALS)) {
        // Check if material has type restrictions
        if (material.applicableTypes && !material.applicableTypes.some(type => {
            if (type === itemType) return true;
            if (type === 'weapon_haft' && itemType === 'weapon') return true;
            return false;
        })) {
            continue;
        }

        // Add material if applicable
        applicable.push({
            id: key,
            name: material.name,
            description: material.description
        });
    }

    return applicable;
}

/**
 * Apply material properties to item data
 * @param {Object} itemData - Item data to modify
 * @param {string} materialId - ID of material to apply
 * @returns {Object} Modified item data
 */
export function applyMaterialToItem(itemData, materialId) {
    if (!materialId || materialId === 'none') return itemData;

    const material = SPECIAL_MATERIALS[materialId];
    if (!material) return itemData;

    // Apply weight modification
    if (itemData.system.weight?.value) {
        itemData.system.weight.value = Math.round((itemData.system.weight.value * material.weightMod) * 100) / 100;
    }

    // Apply hardness
    if (material.hardness > 0) {
        itemData.system.hardness = material.hardness;
    } else if (material.hardnessModifier === 'half') {
        itemData.system.hardness = Math.floor(itemData.system.hardness / 2);
    }

    // Apply HP
    if (material.hp > 0) {
        // Calculate HP based on material vs base material ratio
        const baseHardness = 10; // Assume steel as base
        const hpRatio = material.hp / 30; // 30 is steel HP
        if (itemData.system.hp?.base) {
            itemData.system.hp.base = Math.max(1, Math.floor(itemData.system.hp.base * hpRatio));
        }
    }

    // Force masterwork if material requires it
    if (material.masterwork) {
        itemData.system.masterwork = true;
        if (!itemData.system.material.addon.includes('magic')) {
            itemData.system.material.addon.push('magic');
        }
    }

    // Apply armor-specific modifications
    if (itemData.type === 'equipment' && itemData.system.armor) {
        if (material.armorCategoryReduction) {
            // Reduce armor category for mithral
            const currentSubtype = itemData.system.equipmentSubtype;
            if (currentSubtype === 'heavyArmor') {
                itemData.system.equipmentSubtype = 'mediumArmor';
            } else if (currentSubtype === 'mediumArmor') {
                itemData.system.equipmentSubtype = 'lightArmor';
            }
        }

        if (material.armorDexBonus) {
            itemData.system.armor.dex = (itemData.system.armor.dex || 0) + material.armorDexBonus;
        }

        if (material.armorCheckPenaltyReduction) {
            itemData.system.armor.acp = Math.max(0, (itemData.system.armor.acp || 0) - material.armorCheckPenaltyReduction);
        }

        if (material.spellFailureReduction) {
            itemData.system.spellFailure = Math.max(0, (itemData.system.spellFailure || 0) - material.spellFailureReduction);
        }
    }

    // Set material in item data
    itemData.system.material = itemData.system.material || { base: { value: '', custom: false }, addon: [] };
    itemData.system.material.base.value = materialId;

    // Store material info in flags for reference
    itemData.flags = itemData.flags || {};
    itemData.flags['folken-games-spacebone'] = itemData.flags['folken-games-spacebone'] || {};
    itemData.flags['folken-games-spacebone'].material = {
        id: materialId,
        name: material.name,
        properties: material.specialProperties
    };

    return itemData;
}

/**
 * Calculate price modification from material
 * @param {string} materialId - Material ID
 * @param {Object} itemData - Item data for price calculation
 * @returns {number} Additional cost in gold pieces
 */
export function calculateMaterialCost(materialId, itemData) {
    if (!materialId || materialId === 'none') return 0;

    const material = SPECIAL_MATERIALS[materialId];
    if (!material || !material.priceModifier) return 0;

    const modifier = material.priceModifier;
    const basePrice = itemData.system.price || 0;
    const weight = itemData.system.weight?.value || 0;

    switch (modifier.type) {
        case 'flat':
            if (typeof modifier.value === 'number') return modifier.value;
            
            // Find appropriate flat cost based on item type/subtype
            const itemType = itemData.type;
            const subtype = itemData.system.weaponSubtype || itemData.system.equipmentSubtype;
            
            if (typeof modifier.value === 'object') {
                return modifier.value[subtype] || modifier.value[itemType] || modifier.value.weapon || 0;
            }
            return 0;

        case 'weight':
            return weight * (modifier.value || 0);

        case 'multiplier':
            return basePrice * (modifier.value - 1); // Return additional cost

        default:
            return 0;
    }
}
