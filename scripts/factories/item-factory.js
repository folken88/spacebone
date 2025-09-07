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
            let pf1Data;

            // For weapons and armor, start with a base item from compendium
            if (itemData.type === 'weapon' || itemData.type === 'armor') {
                pf1Data = await this.getBaseItemFromCompendium(itemData);
                if (pf1Data) {
                    // Modify the base item with our generated data
                    this.enhanceBaseItem(pf1Data, itemData);
                } else {
                    // Fallback to custom creation if no base found
                    pf1Data = this.buildCustomItem(itemData);
                }
            } else {
                // For equipment/consumables, build from scratch
                pf1Data = this.buildCustomItem(itemData);
            }

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
     * Get a base item from PF1 compendiums
     * @param {Object} itemData - LLM generated item data
     * @returns {Promise<Object|null>} Base item from compendium or null
     */
    async getBaseItemFromCompendium(itemData) {
        try {
            let packName;
            if (itemData.type === 'weapon') {
                packName = 'pf1.weapons-and-ammo';
            } else if (itemData.type === 'armor') {
                packName = 'pf1.armors-and-shields';
            } else {
                return null;
            }

            const pack = game.packs.get(packName);
            if (!pack) {
                console.warn(`Spacebone | Compendium ${packName} not found`);
                return null;
            }

            const index = await pack.getDocuments();
            const baseItem = index.find(item => {
                if (item.type !== itemData.type) return false;
                
                // Match by name or subtype
                const itemName = item.name.toLowerCase();
                const subType = itemData.subType.toLowerCase();
                
                return itemName.includes(subType) || 
                       subType.includes(itemName) ||
                       item.system.baseTypes?.some(bt => bt.toLowerCase() === subType);
            });

            if (baseItem) {
                console.log(`Spacebone | Found base item: ${baseItem.name} for ${itemData.subType}`);
                return baseItem.toObject();
            }

            return null;

        } catch (error) {
            console.error('Spacebone | Error loading base item from compendium:', error);
            return null;
        }
    }

    /**
     * Enhance a base item with LLM-generated data
     * @param {Object} baseItem - Base item from compendium
     * @param {Object} itemData - LLM generated item data
     */
    enhanceBaseItem(baseItem, itemData) {
        // Update basic properties
        baseItem.name = itemData.name;
        baseItem.img = this.getDefaultIcon(itemData.type, itemData.subType);
        
        // Update system data
        baseItem.system.description = {
            value: this.formatDescription(itemData),
            chat: "",
            unidentified: baseItem.system.description?.unidentified || ""
        };
        
        baseItem.system.price = itemData.price || baseItem.system.price;
        baseItem.system.weight.value = itemData.weight || baseItem.system.weight.value;
        
        // Add enhancement bonus for weapons/armor
        if (itemData.enhancement) {
            if (itemData.type === 'weapon') {
                baseItem.system.enh = itemData.enhancement;
                baseItem.system.masterwork = true;
                if (!baseItem.system.material.addon.includes('magic')) {
                    baseItem.system.material.addon.push('magic');
                }
            } else if (itemData.type === 'armor') {
                baseItem.system.armor = baseItem.system.armor || {};
                baseItem.system.armor.enh = itemData.enhancement;
                baseItem.system.masterwork = true;
                if (!baseItem.system.material.addon.includes('magic')) {
                    baseItem.system.material.addon.push('magic');
                }
            }
        }

        // Add caster level and aura
        if (itemData.casterLevel) {
            baseItem.system.cl = itemData.casterLevel;
        }
        
        if (itemData.aura) {
            const auraParts = itemData.aura.split(' ');
            baseItem.system.aura = {
                custom: false,
                school: auraParts[1] || 'universal',
                strength: auraParts[0] || 'faint'
            };
        }

        // Add creation requirements and cost
        if (itemData.requirements) {
            baseItem.system.requirements = itemData.requirements;
        }
        if (itemData.creationCost) {
            baseItem.system.creationCost = itemData.creationCost;
        }

        // Add our module flags
        baseItem.flags = baseItem.flags || {};
        baseItem.flags[this.moduleId] = {
            generated: true,
            version: "1.0.0",
            originalData: itemData
        };
    }

    /**
     * Build a custom item from scratch (fallback method)
     * @param {Object} itemData - LLM generated item data
     * @returns {Object} Custom item data
     */
    buildCustomItem(itemData) {
        return {
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
            const weaponData = this.buildWeaponData(itemData);
            Object.assign(systemData, weaponData);
            
            // Add weapon actions
            systemData.actions = this.buildWeaponActions(itemData);
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
     * Build weapon-specific system data
     * @param {Object} itemData - Raw item data
     * @returns {Object} Weapon system data
     */
    buildWeaponData(itemData) {
        const weaponInfo = this.getWeaponInfo(itemData.subType);
        
        return {
            weaponSubtype: weaponInfo.category || 'melee',
            proficient: true,
            held: weaponInfo.hands === 2 ? '2h' : (weaponInfo.hands === 1.5 ? '1h' : '1h'),
            hands: weaponInfo.hands || 1,
            subType: weaponInfo.proficiency || 'martial',
            baseTypes: [weaponInfo.baseType || itemData.subType],
            weaponGroups: weaponInfo.groups || [],
            enh: itemData.enhancement || 0,
            material: {
                base: { value: "steel", custom: false },
                normal: { value: "", custom: false },
                addon: itemData.enhancement > 0 ? ["magic"] : []
            }
        };
    }

    /**
     * Build weapon actions (attack mechanics)
     * @param {Object} itemData - Raw item data
     * @returns {Array} Weapon actions array
     */
    buildWeaponActions(itemData) {
        const weaponInfo = this.getWeaponInfo(itemData.subType);
        
        return [{
            _id: this.generateActionId(),
            ability: {
                attack: "_default",
                critMult: weaponInfo.critMult || 2,
                damage: "str"
            },
            actionType: "mwak",
            activation: {
                type: "attack",
                unchained: { type: "attack" }
            },
            damage: {
                parts: [{
                    formula: `sizeRoll(${weaponInfo.damage.dice}, ${weaponInfo.damage.sides}, @size)`,
                    types: [weaponInfo.damageType || "slashing"]
                }]
            },
            duration: { units: "inst" },
            extraAttacks: { type: "standard" },
            name: "Attack",
            range: {
                units: weaponInfo.range || "melee",
                value: weaponInfo.rangeValue || "0"
            }
        }];
    }

    /**
     * Get weapon mechanical information
     * @param {string} weaponType - Weapon type/subtype
     * @returns {Object} Weapon mechanics data
     */
    getWeaponInfo(weaponType) {
        const weaponData = {
            // Two-Handed Weapons
            'greataxe': {
                damage: { dice: 1, sides: 12 },
                critMult: 3,
                damageType: 'slashing',
                hands: 2,
                category: '2h',
                proficiency: 'martial',
                baseType: 'Greataxe',
                groups: ['axes']
            },
            'greatsword': {
                damage: { dice: 2, sides: 6 },
                critMult: 2,
                damageType: 'slashing',
                hands: 2,
                category: '2h',
                proficiency: 'martial',
                baseType: 'Greatsword',
                groups: ['heavy blades']
            },
            'greatclub': {
                damage: { dice: 1, sides: 10 },
                critMult: 2,
                damageType: 'bludgeoning',
                hands: 2,
                category: '2h',
                proficiency: 'martial',
                baseType: 'Greatclub',
                groups: ['clubs']
            },
            
            // One-Handed Weapons
            'longsword': {
                damage: { dice: 1, sides: 8 },
                critMult: 2,
                damageType: 'slashing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Longsword',
                groups: ['heavy blades']
            },
            'battleaxe': {
                damage: { dice: 1, sides: 8 },
                critMult: 3,
                damageType: 'slashing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Battleaxe',
                groups: ['axes']
            },
            'scimitar': {
                damage: { dice: 1, sides: 6 },
                critMult: 2,
                damageType: 'slashing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Scimitar',
                groups: ['heavy blades']
            },
            'rapier': {
                damage: { dice: 1, sides: 6 },
                critMult: 2,
                damageType: 'piercing',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Rapier',
                groups: ['light blades']
            },
            'warhammer': {
                damage: { dice: 1, sides: 8 },
                critMult: 3,
                damageType: 'bludgeoning',
                hands: 1,
                category: 'melee',
                proficiency: 'martial',
                baseType: 'Warhammer',
                groups: ['hammers']
            },
            
            // Light Weapons
            'dagger': {
                damage: { dice: 1, sides: 4 },
                critMult: 2,
                damageType: 'piercing',
                hands: 1,
                category: 'light',
                proficiency: 'simple',
                baseType: 'Dagger',
                groups: ['light blades']
            },
            'shortsword': {
                damage: { dice: 1, sides: 6 },
                critMult: 2,
                damageType: 'piercing',
                hands: 1,
                category: 'light',
                proficiency: 'martial',
                baseType: 'Short sword',
                groups: ['light blades']
            },
            
            // Ranged Weapons
            'longbow': {
                damage: { dice: 1, sides: 8 },
                critMult: 3,
                damageType: 'piercing',
                hands: 2,
                category: 'ranged',
                proficiency: 'martial',
                baseType: 'Longbow',
                groups: ['bows'],
                range: 'ft',
                rangeValue: '100'
            },
            'shortbow': {
                damage: { dice: 1, sides: 6 },
                critMult: 3,
                damageType: 'piercing',
                hands: 2,
                category: 'ranged',
                proficiency: 'martial',
                baseType: 'Shortbow',
                groups: ['bows'],
                range: 'ft',
                rangeValue: '60'
            }
        };

        // Normalize the weapon type for lookup
        const normalizedType = weaponType.toLowerCase();
        
        // Return specific weapon data or default to longsword-like stats
        return weaponData[normalizedType] || {
            damage: { dice: 1, sides: 8 },
            critMult: 2,
            damageType: 'slashing',
            hands: 1,
            category: 'melee',
            proficiency: 'martial',
            baseType: weaponType,
            groups: []
        };
    }

    /**
     * Generate a unique action ID
     * @returns {string} Random action ID
     */
    generateActionId() {
        return Math.random().toString(36).substring(2, 18);
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
