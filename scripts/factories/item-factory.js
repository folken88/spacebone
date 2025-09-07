/**
 * Item Factory for Spacebone Item Creator
 * Converts LLM-generated data into proper PF1 FoundryVTT items
 * 
 * @author Folken Games
 * @version 1.0.0
 */

export class ItemFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Create a PF1 item from LLM-generated data
     * @param {Object} itemData - Raw item data from LLM
     * @returns {Promise<Object>} PF1-formatted item data
     */
    async createPF1Item(itemData) {
        try {
            const pf1Data = {
                name: itemData.name,
                type: this.mapItemType(itemData.type),
                img: this.getDefaultIcon(itemData.type, itemData.subType),
                system: this.buildSystemData(itemData),
                flags: {
                    [this.moduleId]: {
                        generated: true,
                        version: "1.0.0",
                        originalData: itemData
                    }
                }
            };

            // Validate the created item data
            this.validateItemData(pf1Data);
            
            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log('Spacebone | Created PF1 item data:', pf1Data);
            }

            return pf1Data;

        } catch (error) {
            console.error('Spacebone | Error creating PF1 item:', error);
            throw error;
        }
    }

    /**
     * Map generic item type to PF1 item type
     * @param {string} type - Generic item type
     * @returns {string} PF1 item type
     */
    mapItemType(type) {
        const typeMap = {
            'equipment': 'equipment',
            'weapon': 'weapon',
            'armor': 'equipment',
            'consumable': 'consumable',
            'loot': 'loot'
        };

        return typeMap[type] || 'equipment';
    }

    /**
     * Get default icon for item type
     * @param {string} type - Item type
     * @param {string} subType - Item subtype
     * @returns {string} Icon path
     */
    getDefaultIcon(type, subType) {
        // Comprehensive PF1 system icon mapping using actual system icons
        const iconMap = {
            'weapon': {
                // Swords
                'longsword': 'systems/pf1/icons/items/weapons/longsword.png',
                'shortsword': 'systems/pf1/icons/items/weapons/sword-short.PNG',
                'greatsword': 'systems/pf1/icons/items/weapons/greatsword.PNG',
                'scimitar': 'systems/pf1/icons/items/weapons/scimitar.PNG',
                'rapier': 'systems/pf1/icons/items/weapons/rapier.PNG',
                'falchion': 'systems/pf1/icons/items/weapons/falchion.PNG',
                'katana': 'systems/pf1/icons/items/weapons/katana.png',
                'cutlass': 'systems/pf1/icons/items/weapons/cutlass.PNG',
                'bastard sword': 'systems/pf1/icons/items/weapons/sword-bastard.PNG',
                'two-bladed sword': 'systems/pf1/icons/items/weapons/sword-two-bladed.png',
                
                // Axes
                'greataxe': 'systems/pf1/icons/items/weapons/greataxe.png',
                'battleaxe': 'systems/pf1/icons/items/weapons/battleaxe.PNG',
                'handaxe': 'systems/pf1/icons/items/weapons/handaxe.png',
                'throwing axe': 'systems/pf1/icons/items/weapons/axe-throwing.png',
                'dwarven waraxe': 'systems/pf1/icons/items/weapons/waraxe-dwarven.PNG',
                
                // Hammers & Maces
                'warhammer': 'systems/pf1/icons/items/weapons/warhammer.png',
                'light hammer': 'systems/pf1/icons/items/weapons/hammer-light.PNG',
                'heavy mace': 'systems/pf1/icons/items/weapons/mace-heavy.PNG',
                'light mace': 'systems/pf1/icons/items/weapons/mace-light.png',
                'morningstar': 'systems/pf1/icons/items/weapons/morningstar.PNG',
                'club': 'systems/pf1/icons/items/weapons/club.PNG',
                'greatclub': 'systems/pf1/icons/items/weapons/greatclub.png',
                
                // Spears & Polearms
                'spear': 'systems/pf1/icons/items/weapons/spear.png',
                'longspear': 'systems/pf1/icons/items/weapons/longspear.PNG',
                'shortspear': 'systems/pf1/icons/items/weapons/shortspear.PNG',
                'javelin': 'systems/pf1/icons/items/weapons/javelin.PNG',
                'lance': 'systems/pf1/icons/items/weapons/lance.PNG',
                'trident': 'systems/pf1/icons/items/weapons/trident.PNG',
                'halberd': 'systems/pf1/icons/items/weapons/halberd.PNG',
                'glaive': 'systems/pf1/icons/items/weapons/glaive.png',
                
                // Bows & Ranged
                'longbow': 'systems/pf1/icons/items/weapons/longbow.PNG',
                'shortbow': 'systems/pf1/icons/items/weapons/shortbow.PNG',
                'heavy crossbow': 'systems/pf1/icons/items/weapons/crossbow-heavy.PNG',
                'light crossbow': 'systems/pf1/icons/items/weapons/crossbow-light.PNG',
                'hand crossbow': 'systems/pf1/icons/items/weapons/crossbow-hand.PNG',
                'sling': 'systems/pf1/icons/items/weapons/sling.png',
                
                // Daggers & Light Blades
                'dagger': 'systems/pf1/icons/items/weapons/dagger.PNG',
                'kukri': 'systems/pf1/icons/items/weapons/kukri.PNG',
                'punching dagger': 'systems/pf1/icons/items/weapons/dagger-punching.PNG',
                
                // Exotic & Special
                'whip': 'systems/pf1/icons/items/weapons/whip.png',
                'net': 'systems/pf1/icons/items/weapons/net.png',
                'quarterstaff': 'systems/pf1/icons/items/weapons/quarterstaff.png',
                'scythe': 'systems/pf1/icons/items/weapons/scythe.PNG',
                'sickle': 'systems/pf1/icons/items/weapons/sickle.png',
                'kama': 'systems/pf1/icons/items/weapons/kama.png',
                'nunchaku': 'systems/pf1/icons/items/weapons/nunchaku.png',
                'sai': 'systems/pf1/icons/items/weapons/sai.png',
                
                // Flails
                'heavy flail': 'systems/pf1/icons/items/weapons/flail-heavy.png',
                'light flail': 'systems/pf1/icons/items/weapons/flail-light.PNG',
                'dire flail': 'systems/pf1/icons/items/weapons/flail-dire.png',
                
                // Picks
                'heavy pick': 'systems/pf1/icons/items/weapons/pick-heavy.png',
                'light pick': 'systems/pf1/icons/items/weapons/pick-light.PNG',
                
                // Default weapon
                'default': 'systems/pf1/icons/items/weapons/longsword.png'
            },
            
            'armor': {
                // Light Armor
                'padded': 'systems/pf1/icons/items/armor/padded.png',
                'leather': 'systems/pf1/icons/items/armor/leather.PNG',
                'studded leather': 'systems/pf1/icons/items/armor/studded-leather.PNG',
                'chain shirt': 'systems/pf1/icons/items/armor/chain-shirt.png',
                
                // Medium Armor
                'hide': 'systems/pf1/icons/items/armor/hide-armor.PNG',
                'scale mail': 'systems/pf1/icons/items/armor/scale-mail.png',
                'chainmail': 'systems/pf1/icons/items/armor/chain-mail.png',
                'breastplate': 'systems/pf1/icons/items/armor/breastplate.PNG',
                
                // Heavy Armor
                'splint mail': 'systems/pf1/icons/items/armor/splint-mail.png',
                'banded mail': 'systems/pf1/icons/items/armor/banded-mail.PNG',
                'half plate': 'systems/pf1/icons/items/armor/half-plate.png',
                'full plate': 'systems/pf1/icons/items/armor/fullplate.PNG',
                
                // Shields
                'buckler': 'systems/pf1/icons/items/armor/buckler.PNG',
                'light shield': 'systems/pf1/icons/items/armor/shield-light-wood.png',
                'light metal shield': 'systems/pf1/icons/items/armor/shield-light-metal.png',
                'light wooden shield': 'systems/pf1/icons/items/armor/shield-light-wood.png',
                'heavy shield': 'systems/pf1/icons/items/armor/shield-heavy-wood.png',
                'heavy metal shield': 'systems/pf1/icons/items/armor/shield-heavy-metal.png',
                'heavy wooden shield': 'systems/pf1/icons/items/armor/shield-heavy-wood.png',
                'heavy steel shield': 'systems/pf1/icons/items/armor/shield-heavy-metal.png',
                'tower shield': 'systems/pf1/icons/items/armor/shield-tower.PNG',
                
                // Default armor
                'default': 'systems/pf1/icons/items/armor/leather.PNG'
            },
            
            'equipment': {
                // Wondrous Items
                'wondrous': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                'wondrous item': 'systems/pf1/icons/items/inventory/bag-simple.jpg',
                
                // Jewelry
                'ring': 'systems/pf1/icons/items/jewelry/ring-gold.jpg',
                'amulet': 'systems/pf1/icons/items/jewelry/amulet-blue.jpg',
                'necklace': 'systems/pf1/icons/items/jewelry/necklace-teeth.jpg',
                'pendant': 'systems/pf1/icons/items/jewelry/pendant-blue.jpg',
                
                // Magic Items
                'rod': 'systems/pf1/icons/items/inventory/rod-star.jpg',
                'staff': 'systems/pf1/icons/items/inventory/staff-simple.jpg',
                'wand': 'systems/pf1/icons/items/inventory/wand-carved.jpg',
                
                // Clothing & Equipment
                'belt': 'systems/pf1/icons/items/equipment/belt-plain.jpg',
                'boots': 'systems/pf1/icons/items/equipment/boots-leather.jpg',
                'cloak': 'systems/pf1/icons/items/equipment/cloak-plain.jpg',
                'gloves': 'systems/pf1/icons/items/equipment/gloves.jpg',
                'bracers': 'systems/pf1/icons/items/equipment/bracers-leather.jpg',
                'helmet': 'systems/pf1/icons/items/equipment/helmet-steel.jpg',
                
                // Default equipment
                'default': 'systems/pf1/icons/items/inventory/bag-simple.jpg'
            },
            
            'consumable': {
                'potion': 'systems/pf1/icons/items/potions/minor-blue.jpg',
                'scroll': 'systems/pf1/icons/items/inventory/scroll-bound.jpg',
                'wand': 'systems/pf1/icons/items/inventory/wand-carved.jpg',
                'default': 'systems/pf1/icons/items/potions/minor-blue.jpg'
            },
            
            'loot': {
                'gem': 'systems/pf1/icons/items/inventory/gem-01.jpg',
                'art': 'systems/pf1/icons/items/inventory/ornament-gold.jpg',
                'trade': 'systems/pf1/icons/items/inventory/ingot-steel.jpg',
                'default': 'systems/pf1/icons/items/inventory/gem-01.jpg'
            }
        };

        // Normalize subType for lookup
        const normalizedSubType = subType ? subType.toLowerCase() : '';
        
        // Try specific subtype first
        if (iconMap[type] && iconMap[type][normalizedSubType]) {
            return iconMap[type][normalizedSubType];
        }
        
        // Fall back to type default, then global default
        if (iconMap[type] && iconMap[type]['default']) {
            return iconMap[type]['default'];
        }
        
        // Final fallback
        return 'systems/pf1/icons/items/inventory/bag-simple.jpg';
    }

    /**
     * Build PF1 system data from item data based on pf1-magic-item-gen structure
     * @param {Object} itemData - Raw item data
     * @returns {Object} PF1 system data
     */
    buildSystemData(itemData) {
        const systemData = {
            description: {
                value: this.formatDescription(itemData),
                chat: "",
                unidentified: ""
            },
            price: itemData.price || 0,
            weight: {
                value: itemData.weight || 0
            },
            identified: true,
            masterwork: itemData.masterwork || false,
            quantity: 1,
            hp: {
                max: 10,
                value: 10
            },
            hardness: 10,
            material: {
                normal: {
                    value: "",
                    custom: false
                },
                addon: []
            },
            unidentified: {
                name: itemData.name,
                price: itemData.price || 0
            }
        };

        // Add equipment-specific data
        if (itemData.type === 'equipment' || itemData.type === 'armor') {
            systemData.subType = itemData.subType || 'wondrous';
            systemData.slot = itemData.slot || 'none';
            systemData.equipped = false;
            systemData.armor = this.buildArmorData(itemData);
            
            if (itemData.enhancement) {
                systemData.armor.enh = itemData.enhancement;
            }
        }

        // Add weapon-specific data
        if (itemData.type === 'weapon') {
            systemData.weaponSubtype = itemData.weaponSubtype || 'melee';
            systemData.proficient = true;
            
            if (itemData.enhancement) {
                systemData.enh = itemData.enhancement;
            }
        }

        // Add consumable-specific data
        if (itemData.type === 'consumable') {
            systemData.consumableType = itemData.subType || 'potion';
            systemData.uses = this.buildUsesData(itemData);
        }

        // Add activation data
        if (itemData.activation) {
            systemData.activation = this.buildActivationData(itemData.activation);
        }

        // Add changes (mechanical effects)
        if (itemData.changes && itemData.changes.length > 0) {
            systemData.changes = this.buildChangesData(itemData.changes);
        }

        // Add context notes
        if (itemData.contextNotes && itemData.contextNotes.length > 0) {
            systemData.contextNotes = this.buildContextNotes(itemData.contextNotes);
        }

        // Add magic item data
        if (itemData.casterLevel) {
            systemData.cl = itemData.casterLevel;
            systemData.aura = {
                school: this.extractAuraSchool(itemData.aura),
                strength: this.extractAuraStrength(itemData.aura),
                custom: false
            };
            
            // Mark as magical
            systemData.material.addon.push('magic');
        }

        // Add creation requirements and costs
        if (itemData.requirements) {
            systemData.requirements = itemData.requirements;
        }

        if (itemData.creationCost) {
            systemData.creationCost = itemData.creationCost;
        }

        // Add size data
        systemData.size = itemData.size || 'med';

        return systemData;
    }

    /**
     * Format item description with proper HTML
     * @param {Object} itemData - Item data
     * @returns {string} Formatted description
     */
    formatDescription(itemData) {
        let description = `<p>${itemData.description}</p>`;

        // Add aura information
        if (itemData.aura) {
            description += `<p><strong>Aura:</strong> ${itemData.aura}</p>`;
        }

        // Add caster level
        if (itemData.casterLevel) {
            description += `<p><strong>Caster Level:</strong> ${itemData.casterLevel}</p>`;
        }

        // Add requirements
        if (itemData.requirements) {
            description += `<p><strong>Requirements:</strong> ${itemData.requirements}</p>`;
        }

        // Add creation cost
        if (itemData.creationCost) {
            description += `<p><strong>Creation Cost:</strong> ${itemData.creationCost} gp</p>`;
        }

        return description;
    }

    /**
     * Build armor data for equipment
     * @param {Object} itemData - Item data
     * @returns {Object} Armor data
     */
    buildArmorData(itemData) {
        return {
            value: 0,
            dex: null,
            check: 0,
            spell: 0,
            type: itemData.type === 'armor' ? (itemData.subType || 'light') : 'misc'
        };
    }

    /**
     * Build activation data
     * @param {Object} activation - Activation data
     * @returns {Object} PF1 activation data
     */
    buildActivationData(activation) {
        return {
            cost: activation.cost || 1,
            type: activation.type || 'standard',
            condition: activation.condition || ''
        };
    }

    /**
     * Build uses data for consumables
     * @param {Object} itemData - Item data
     * @returns {Object} Uses data
     */
    buildUsesData(itemData) {
        if (!itemData.uses) {
            return {
                value: 0,
                max: 0,
                per: null,
                autoDeductCharges: false
            };
        }

        return {
            value: itemData.uses.max || 0,
            max: itemData.uses.max || 0,
            per: itemData.uses.per || null,
            autoDeductCharges: itemData.uses.autoDeductCharges || false
        };
    }

    /**
     * Build changes data for mechanical effects
     * @param {Array} changes - Changes array
     * @returns {Array} PF1 changes data
     */
    buildChangesData(changes) {
        return changes.map(change => ({
            formula: change.formula || "0",
            target: change.target || "misc",
            subTarget: change.subTarget || "",
            modifier: change.modifier || "untyped",
            priority: change.priority || 0,
            value: 0,
            continuous: true
        }));
    }

    /**
     * Build context notes
     * @param {Array} notes - Context notes array
     * @returns {Array} PF1 context notes
     */
    buildContextNotes(notes) {
        return notes.map(note => ({
            text: note.text || "",
            target: note.target || "misc"
        }));
    }

    /**
     * Extract aura school from aura string
     * @param {string} aura - Aura string
     * @returns {string} School name
     */
    extractAuraSchool(aura) {
        if (!aura) return '';
        
        const schools = [
            'abjuration', 'conjuration', 'divination', 'enchantment',
            'evocation', 'illusion', 'necromancy', 'transmutation'
        ];
        
        const lowerAura = aura.toLowerCase();
        return schools.find(school => lowerAura.includes(school)) || '';
    }

    /**
     * Extract aura strength from aura string
     * @param {string} aura - Aura string
     * @returns {string} Strength level
     */
    extractAuraStrength(aura) {
        if (!aura) return '';
        
        const strengths = ['faint', 'moderate', 'strong', 'overwhelming'];
        const lowerAura = aura.toLowerCase();
        return strengths.find(strength => lowerAura.includes(strength)) || 'moderate';
    }

    /**
     * Validate item data before creation
     * @param {Object} itemData - Item data to validate
     * @throws {Error} If validation fails
     */
    validateItemData(itemData) {
        if (!itemData.name) {
            throw new Error('Item name is required');
        }

        if (!itemData.type) {
            throw new Error('Item type is required');
        }

        if (!itemData.system) {
            throw new Error('Item system data is required');
        }

        // Validate price
        if (itemData.system.price < 0) {
            throw new Error('Item price cannot be negative');
        }

        // Validate weight
        if (itemData.system.weight < 0) {
            throw new Error('Item weight cannot be negative');
        }
    }
}
