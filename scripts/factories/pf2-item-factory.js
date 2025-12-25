/**
 * PF2e Item Factory for Spacebone Item Creator
 * Converts LLM-generated data into proper PF2e FoundryVTT items
 * 
 * @author Folken Games
 * @version 1.0.0
 */

export class PF2ItemFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Create a PF2e item from LLM-generated data
     * @param {Object} itemData - Raw item data from LLM
     * @returns {Promise<Object>} PF2e-formatted item data
     */
    async createPF2Item(itemData) {
        try {
            let pf2Data;

            // Check if this is a shield (shields are armor type in PF2e)
            const subType = (itemData.subType || '').toLowerCase();
            const isShield = subType.includes('shield') || itemData.type === 'shield';

            // For weapons and armor (including shields), try to get base item from compendium
            if (itemData.type === 'weapon' || itemData.type === 'armor' || isShield) {
                pf2Data = await this.getBaseItemFromCompendium(itemData);
                if (pf2Data) {
                    // Modify the base item with our generated data
                    this.enhanceBaseItem(pf2Data, itemData);
                } else {
                    // Fallback to custom creation if no base found
                    pf2Data = this.buildCustomItem(itemData);
                }
            } else {
                // For equipment/consumables, build from scratch
                pf2Data = this.buildCustomItem(itemData);
            }

            // Ensure shield properties are set if this is a shield
            if (isShield && pf2Data.system) {
                this.ensureShieldProperties(pf2Data, itemData);
            }

            // Validate the created item data
            this.validateItemData(pf2Data);
            
            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log('Spacebone | Created PF2e item data:', pf2Data);
            }

            return pf2Data;

        } catch (error) {
            console.error('Spacebone | Error creating PF2e item:', error);
            throw error;
        }
    }

    /**
     * Get a base item from PF2e compendiums
     * @param {Object} itemData - LLM generated item data
     * @returns {Promise<Object|null>} Base item from compendium or null
     */
    async getBaseItemFromCompendium(itemData) {
        try {
            // Check if this is a shield
            const subType = (itemData.subType || '').toLowerCase();
            const isShield = subType.includes('shield') || itemData.type === 'shield';
            
            // Try multiple compendiums in order of preference
            const packNames = [];
            if (itemData.type === 'weapon' || itemData.type === 'armor' || isShield) {
                packNames.push('pf2e.equipment-srd');
                packNames.push('pf2e.equipment');
                packNames.push('pf2e.action-macros'); // Sometimes items are here
            } else if (itemData.type === 'consumable') {
                packNames.push('pf2e.equipment-srd');
                packNames.push('pf2e.consumables');
            } else {
                packNames.push('pf2e.equipment-srd');
                packNames.push('pf2e.equipment');
            }

            // Try each compendium
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const index = await pack.getDocuments();
                
                // Find matching items
                const matchingItems = index.filter(item => {
                    // For shields, check if item is armor type with shield category
                    if (isShield) {
                        if (item.type !== 'armor') return false;
                        const itemCategory = item.system?.armor?.category || '';
                        if (itemCategory !== 'shield') return false;
                    } else {
                        if (item.type !== itemData.type) return false;
                    }
                    
                    // Match by name or subtype
                    const itemName = item.name.toLowerCase();
                    const searchSubType = subType || '';
                    const searchName = (itemData.name || '').toLowerCase();
                    
                    // For shields, try to match common shield names
                    if (isShield) {
                        // Try to match shield type (steel shield, wooden shield, etc.)
                        const shieldTypes = ['steel shield', 'wooden shield', 'buckler', 'tower shield'];
                        const matchesShieldType = shieldTypes.some(type => 
                            itemName.includes(type) && searchSubType.includes(type.replace(' shield', ''))
                        );
                        
                        return matchesShieldType ||
                               itemName.includes(searchSubType) || 
                               searchSubType.includes(itemName.replace(' shield', '')) ||
                               itemName.includes(searchName) ||
                               searchName.includes(itemName) ||
                               (searchSubType && itemName.includes('shield'));
                    }
                    
                    // Try multiple matching strategies for other items
                    return itemName.includes(searchSubType) || 
                           searchSubType.includes(itemName) ||
                           itemName.includes(searchName) ||
                           searchName.includes(itemName);
                });
                
                if (matchingItems.length > 0) {
                    // Use the best match (exact name match preferred)
                    const searchName = (itemData.name || '').toLowerCase();
                    const exactMatch = matchingItems.find(item => 
                        item.name.toLowerCase() === searchName
                    );
                    const baseItem = exactMatch || matchingItems[0];
                    
                    // Convert to item data format
                    const baseItemData = baseItem.toObject();
                    
                    if (game.settings.get(this.moduleId, 'debugMode')) {
                        console.log(`Spacebone | Found base item: ${baseItem.name} from ${packName}`);
                    }
                    
                    return baseItemData;
                }
            }
            
            return null;

        } catch (error) {
            console.error('Spacebone | Error getting base item from compendium:', error);
            return null;
        }
    }

    /**
     * Analyze a PF2e item to understand its structure
     * Useful for learning how real PF2e items are structured
     * @param {string} itemName - Name of item to analyze
     * @param {string} itemType - Type of item (weapon, armor, equipment, consumable)
     * @returns {Promise<Object|null>} Analyzed item structure or null
     */
    async analyzePF2Item(itemName, itemType = 'weapon') {
        try {
            const packNames = ['pf2e.equipment-srd', 'pf2e.equipment', 'pf2e.consumables'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const index = await pack.getDocuments();
                const item = index.find(i => 
                    i.type === itemType && 
                    i.name.toLowerCase().includes(itemName.toLowerCase())
                );
                
                if (item) {
                    const itemData = item.toObject();
                    const analysis = {
                        name: itemData.name,
                        type: itemData.type,
                        system: {
                            level: itemData.system?.level,
                            price: itemData.system?.price,
                            traits: itemData.system?.traits,
                            bulk: itemData.system?.bulk,
                            description: itemData.system?.description,
                            // Type-specific fields
                            weaponType: itemData.system?.weaponType,
                            damage: itemData.system?.damage,
                            armorType: itemData.system?.armorType,
                            armor: itemData.system?.armor,
                            // Rule elements for automation
                            rules: itemData.system?.rules || []
                        }
                    };
                    
                    if (game.settings.get(this.moduleId, 'debugMode')) {
                        console.log(`Spacebone | Analyzed PF2e item:`, analysis);
                    }
                    
                    return analysis;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Spacebone | Error analyzing PF2e item:', error);
            return null;
        }
    }

    /**
     * Enhance a base item with LLM-generated data
     * @param {Object} baseItemData - Base item data from compendium
     * @param {Object} itemData - LLM generated item data
     */
    enhanceBaseItem(baseItemData, itemData) {
        // Ensure system object exists
        if (!baseItemData.system) {
            baseItemData.system = {};
        }

        // Update name
        if (itemData.name) {
            baseItemData.name = itemData.name;
        }

        // Update description (preserve existing structure)
        if (itemData.description) {
            if (!baseItemData.system.description) {
                baseItemData.system.description = { value: '', gm: '' };
            }
            // Combine with existing description if present
            const existingDesc = baseItemData.system.description.value || '';
            baseItemData.system.description.value = itemData.description + (existingDesc ? '\n\n' + existingDesc : '');
            baseItemData.system.description.gm = itemData.description;
        }

        // Update level if provided
        if (itemData.level !== undefined) {
            const level = this.parseLevel(itemData.level);
            if (!baseItemData.system.level) {
                baseItemData.system.level = { value: level };
            } else {
                baseItemData.system.level.value = level;
            }
        }

        // Update price if provided
        if (itemData.price) {
            baseItemData.system.price = this.parsePrice(itemData.price);
        }

        // Update rarity if provided
        if (itemData.rarity) {
            if (!baseItemData.system.traits) {
                baseItemData.system.traits = { value: [], rarity: 'common' };
            }
            baseItemData.system.traits.rarity = itemData.rarity.toLowerCase();
        }

        // Update traits (merge with existing)
        if (itemData.traits) {
            if (!baseItemData.system.traits) {
                baseItemData.system.traits = { value: [], rarity: 'common' };
            }
            const newTraits = this.parseTraits(itemData.traits);
            const existingTraits = baseItemData.system.traits.value || [];
            // Merge traits, avoiding duplicates
            const mergedTraits = [...new Set([...existingTraits, ...newTraits])];
            baseItemData.system.traits.value = mergedTraits;
        }

        // Update bulk if provided
        if (itemData.bulk) {
            baseItemData.system.bulk = this.parseBulk(itemData.bulk);
        }

        // Apply runes if provided (for weapons/armor)
        if (itemData.runes && (itemData.type === 'weapon' || itemData.type === 'armor')) {
            this.applyRunes(baseItemData, itemData.runes);
        }

        // Check if this is a shield
        const subType = (itemData.subType || '').toLowerCase();
        const isShield = subType.includes('shield') || itemData.type === 'shield';

        // Apply weapon-specific data
        if (itemData.type === 'weapon' && itemData.weaponData) {
            this.applyWeaponData(baseItemData, itemData.weaponData);
        }

        // Apply armor-specific data (including shields)
        if ((itemData.type === 'armor' || isShield) && itemData.armorData) {
            this.applyArmorData(baseItemData, itemData.armorData);
        }

        // Ensure shield properties are set if this is a shield
        if (isShield) {
            this.ensureShieldProperties(baseItemData, itemData);
        }

        // Add rule elements for automation if mechanical effects are described
        if (itemData.mechanicalEffects) {
            this.addRuleElements(baseItemData, itemData.mechanicalEffects);
        }
    }

    /**
     * Build a custom item from scratch
     * @param {Object} itemData - LLM generated item data
     * @returns {Object} PF2e-formatted item data
     */
    buildCustomItem(itemData) {
        const level = this.parseLevel(itemData.level || 1);
        const rarity = (itemData.rarity || 'common').toLowerCase();
        const traits = this.parseTraits(itemData.traits || '');
        
        const baseData = {
            name: itemData.name || 'Unnamed Item',
            type: this.mapItemType(itemData.type),
            system: {
                description: {
                    value: itemData.description || '',
                    gm: itemData.description || ''
                },
                price: this.parsePrice(itemData.price || '0 gp'),
                level: {
                    value: level
                },
                traits: {
                    value: traits,
                    rarity: rarity
                },
                bulk: this.parseBulk(itemData.bulk || 'L')
            }
        };

        // Check if this is a shield
        const subType = (itemData.subType || '').toLowerCase();
        const isShield = subType.includes('shield') || itemData.type === 'shield';

        // Add type-specific data
        if (itemData.type === 'weapon') {
            baseData.system = {
                ...baseData.system,
                ...this.buildWeaponData(itemData)
            };
        } else if (itemData.type === 'armor' || isShield) {
            baseData.system = {
                ...baseData.system,
                ...this.buildArmorData(itemData)
            };
            
            // Apply armor data if provided
            if (itemData.armorData) {
                this.applyArmorData(baseData, itemData.armorData);
            }
            
            // Ensure shield properties are set if this is a shield
            if (isShield) {
                this.ensureShieldProperties(baseData, itemData);
            }
        } else if (itemData.type === 'equipment') {
            baseData.system = {
                ...baseData.system,
                ...this.buildEquipmentData(itemData)
            };
        } else if (itemData.type === 'consumable') {
            baseData.system = {
                ...baseData.system,
                ...this.buildConsumableData(itemData)
            };
        }

        return baseData;
    }

    /**
     * Map item type to PF2e type
     * @param {string} type - Item type from LLM
     * @returns {string} PF2e item type
     */
    mapItemType(type) {
        const typeMap = {
            'weapon': 'weapon',
            'armor': 'armor',
            'equipment': 'equipment',
            'consumable': 'consumable',
            'loot': 'equipment'
        };
        return typeMap[type] || 'equipment';
    }

    /**
     * Build weapon data for PF2e
     * @param {Object} itemData - LLM generated item data
     * @returns {Object} Weapon system data
     */
    buildWeaponData(itemData) {
        const subType = (itemData.subType || '').toLowerCase();
        const isFirearm = subType.includes('pistol') || subType.includes('gun') || 
                         subType.includes('firearm') || subType.includes('arquebus') ||
                         subType.includes('musket') || subType.includes('revolver') ||
                         subType.includes('pepperbox');
        
        // Default weapon data
        const weaponData = {
            weaponType: {
                value: this.mapWeaponType(itemData.subType || 'simple')
            },
            damage: {
                dice: 1,
                die: 'd4',
                damageType: 'slashing'
            },
            range: null,
            reload: {
                value: null
            }
        };
        
        // Set defaults for firearms
        if (isFirearm) {
            weaponData.damage.damageType = 'piercing';
            weaponData.reload.value = 1; // Default reload 1 for pistols
            weaponData.range = 30; // Default range for pistols
        }
        
        return weaponData;
    }

    /**
     * Map weapon subtype to PF2e weapon type
     * @param {string} subType - Weapon subtype
     * @returns {string} PF2e weapon type
     */
    mapWeaponType(subType) {
        // Basic mapping - will be expanded
        const subTypeLower = (subType || '').toLowerCase();
        
        // Firearms and advanced weapons
        if (subTypeLower.includes('pistol') || subTypeLower.includes('gun') || 
            subTypeLower.includes('firearm') || subTypeLower.includes('arquebus') ||
            subTypeLower.includes('musket') || subTypeLower.includes('revolver') ||
            subTypeLower.includes('pepperbox')) {
            return 'advanced';
        }
        
        // Standard weapon types
        if (subTypeLower.includes('simple')) return 'simple';
        if (subTypeLower.includes('martial')) return 'martial';
        if (subTypeLower.includes('advanced')) return 'advanced';
        
        // Default to simple for unknown types
        return 'simple';
    }

    /**
     * Build armor data for PF2e
     * @param {Object} itemData - LLM generated item data
     * @returns {Object} Armor system data
     */
    buildArmorData(itemData) {
        const subType = (itemData.subType || '').toLowerCase();
        const isShield = subType.includes('shield') || itemData.type === 'shield';
        
        if (isShield) {
            // Shields have different properties than armor
            return {
                armorType: {
                    value: 'shield'
                },
                category: 'shield',
                // Shield AC bonus (default +1 for basic shield)
                value: 1,
                // Shield HP (default 20 for basic shield)
                hp: 20,
                // Shield hardness (default 5 for basic shield)
                hardness: 5,
                // Broken threshold (default 10, which is half HP)
                brokenThreshold: 10,
                // Speed penalty (shields don't have speed penalty in PF2e)
                speedPenalty: 0,
                // Strength requirement (null for shields)
                strength: null,
                // Dex cap (null for shields)
                dexCap: null,
                // Check penalty (null for shields)
                checkPenalty: null
            };
        } else {
            // Regular armor
            return {
                armorType: {
                    value: this.mapArmorType(itemData.subType || 'light')
                },
                category: this.mapArmorCategory(itemData.subType || 'light'),
                value: 0, // AC bonus
                strength: null,
                dexCap: null,
                checkPenalty: 0,
                speedPenalty: 0
            };
        }
    }

    /**
     * Map armor subtype to PF2e armor type
     * @param {string} subType - Armor subtype
     * @returns {string} PF2e armor type
     */
    mapArmorType(subType) {
        const subTypeLower = (subType || '').toLowerCase();
        if (subTypeLower.includes('light')) return 'light';
        if (subTypeLower.includes('medium')) return 'medium';
        if (subTypeLower.includes('heavy')) return 'heavy';
        return 'light';
    }

    /**
     * Map armor subtype to PF2e armor category
     * @param {string} subType - Armor subtype
     * @returns {string} PF2e armor category
     */
    mapArmorCategory(subType) {
        const subTypeLower = (subType || '').toLowerCase();
        if (subTypeLower.includes('shield')) return 'shield';
        return this.mapArmorType(subType);
    }

    /**
     * Build equipment data for PF2e
     * @param {Object} itemData - LLM generated item data
     * @returns {Object} Equipment system data
     */
    buildEquipmentData(itemData) {
        return {
            usage: {
                value: 'held-in-one-hand'
            },
            bulk: {
                value: 'L'
            }
        };
    }

    /**
     * Build consumable data for PF2e
     * @param {Object} itemData - LLM generated item data
     * @returns {Object} Consumable system data
     */
    buildConsumableData(itemData) {
        return {
            consumableType: {
                value: this.mapConsumableType(itemData.subType || 'potion')
            },
            charges: {
                value: 1,
                max: 1
            }
        };
    }

    /**
     * Map consumable subtype to PF2e consumable type
     * @param {string} subType - Consumable subtype
     * @returns {string} PF2e consumable type
     */
    mapConsumableType(subType) {
        const subTypeLower = (subType || '').toLowerCase();
        if (subTypeLower.includes('potion')) return 'potion';
        if (subTypeLower.includes('scroll')) return 'scroll';
        if (subTypeLower.includes('wand')) return 'wand';
        if (subTypeLower.includes('talisman')) return 'talisman';
        return 'other';
    }

    /**
     * Parse price string to PF2e price format
     * @param {string|Object} priceStr - Price string (e.g., "100 gp") or price object
     * @returns {Object} PF2e price object
     */
    parsePrice(priceStr) {
        // If already an object, return it
        if (typeof priceStr === 'object' && priceStr !== null) {
            return priceStr;
        }
        
        // Parse string format
        const match = String(priceStr).match(/(\d+)\s*(cp|sp|gp|pp)/i);
        if (match) {
            return {
                value: parseInt(match[1]),
                denomination: match[2].toLowerCase()
            };
        }
        
        // Try to extract just a number
        const numMatch = String(priceStr).match(/(\d+)/);
        if (numMatch) {
            return {
                value: parseInt(numMatch[1]),
                denomination: 'gp'
            };
        }
        
        return { value: 0, denomination: 'gp' };
    }
    
    /**
     * Parse traits string to array
     * @param {string} traitsStr - Comma-separated traits
     * @returns {Array<string>} Array of trait IDs
     */
    parseTraits(traitsStr) {
        if (!traitsStr) return [];
        if (Array.isArray(traitsStr)) return traitsStr;
        
        return String(traitsStr)
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);
    }
    
    /**
     * Parse bulk string to PF2e bulk format
     * @param {string} bulkStr - Bulk string (e.g., "L", "1", "2")
     * @returns {Object} PF2e bulk object
     */
    parseBulk(bulkStr) {
        if (typeof bulkStr === 'object' && bulkStr !== null) {
            return bulkStr;
        }
        
        const bulk = String(bulkStr).trim().toUpperCase();
        if (bulk === 'L' || bulk === 'LIGHT') {
            return { value: null }; // Light bulk
        }
        
        const numMatch = bulk.match(/(\d+)/);
        if (numMatch) {
            return { value: parseInt(numMatch[1]) };
        }
        
        return { value: null }; // Default to light
    }
    
    /**
     * Apply runes to weapon or armor
     * @param {Object} itemData - Item data to modify
     * @param {string} runesStr - Runes description string
     */
    applyRunes(itemData, runesStr) {
        if (!runesStr) return;
        
        const runesLower = String(runesStr).toLowerCase();
        
        if (itemData.type === 'weapon') {
            itemData.system = itemData.system || {};
            itemData.system.potencyRune = itemData.system.potencyRune || { value: null };
            itemData.system.strikingRune = itemData.system.strikingRune || { value: null };
            itemData.system.propertyRune1 = itemData.system.propertyRune1 || { value: null };
            itemData.system.propertyRune2 = itemData.system.propertyRune2 || { value: null };
            itemData.system.propertyRune3 = itemData.system.propertyRune3 || { value: null };
            itemData.system.propertyRune4 = itemData.system.propertyRune4 || { value: null };
            
            // Parse potency runes
            if (runesLower.includes('+1') || runesLower.includes('potency +1')) {
                itemData.system.potencyRune.value = 1;
            } else if (runesLower.includes('+2') || runesLower.includes('potency +2')) {
                itemData.system.potencyRune.value = 2;
            } else if (runesLower.includes('+3') || runesLower.includes('potency +3')) {
                itemData.system.potencyRune.value = 3;
            }
            
            // Parse striking runes
            if (runesLower.includes('major striking') || runesLower.includes('striking major')) {
                itemData.system.strikingRune.value = 'majorStriking';
            } else if (runesLower.includes('greater striking') || runesLower.includes('striking greater')) {
                itemData.system.strikingRune.value = 'greaterStriking';
            } else if (runesLower.includes('striking')) {
                itemData.system.strikingRune.value = 'striking';
            }
            
            // Parse property runes
            const propertyRunes = [];
            if (runesLower.includes('flaming')) propertyRunes.push('flaming');
            if (runesLower.includes('frost') || runesLower.includes('icy')) propertyRunes.push('frost');
            if (runesLower.includes('shock') || runesLower.includes('lightning')) propertyRunes.push('shock');
            if (runesLower.includes('corrosive') || runesLower.includes('acid')) propertyRunes.push('corrosive');
            if (runesLower.includes('thundering')) propertyRunes.push('thundering');
            if (runesLower.includes('ghost touch')) propertyRunes.push('ghostTouch');
            if (runesLower.includes('returning')) propertyRunes.push('returning');
            
            propertyRunes.forEach((rune, index) => {
                if (index < 4) {
                    itemData.system[`propertyRune${index + 1}`].value = rune;
                }
            });
        } else if (itemData.type === 'armor') {
            itemData.system = itemData.system || {};
            itemData.system.potencyRune = itemData.system.potencyRune || { value: null };
            itemData.system.resiliencyRune = itemData.system.resiliencyRune || { value: null };
            itemData.system.propertyRune1 = itemData.system.propertyRune1 || { value: null };
            itemData.system.propertyRune2 = itemData.system.propertyRune2 || { value: null };
            itemData.system.propertyRune3 = itemData.system.propertyRune3 || { value: null };
            itemData.system.propertyRune4 = itemData.system.propertyRune4 || { value: null };
            
            // Parse potency runes
            if (runesLower.includes('+1') || runesLower.includes('potency +1')) {
                itemData.system.potencyRune.value = 1;
            } else if (runesLower.includes('+2') || runesLower.includes('potency +2')) {
                itemData.system.potencyRune.value = 2;
            } else if (runesLower.includes('+3') || runesLower.includes('potency +3')) {
                itemData.system.potencyRune.value = 3;
            }
            
            // Parse resilient runes
            if (runesLower.includes('major resilient')) {
                itemData.system.resiliencyRune.value = 'majorResilient';
            } else if (runesLower.includes('greater resilient')) {
                itemData.system.resiliencyRune.value = 'greaterResilient';
            } else if (runesLower.includes('resilient')) {
                itemData.system.resiliencyRune.value = 'resilient';
            }
        }
    }
    
    /**
     * Apply weapon-specific data
     * @param {Object} itemData - Item data to modify
     * @param {string} weaponDataStr - Weapon data description
     */
    applyWeaponData(itemData, weaponDataStr) {
        if (!weaponDataStr) return;
        
        itemData.system = itemData.system || {};
        itemData.system.damage = itemData.system.damage || {};
        itemData.system.weaponType = itemData.system.weaponType || {};
        
        // Parse damage dice
        const diceMatch = weaponDataStr.match(/(\d+)d(\d+)/i);
        if (diceMatch) {
            itemData.system.damage.dice = parseInt(diceMatch[1]);
            itemData.system.damage.die = `d${diceMatch[2]}`;
        }
        
        // Parse damage type
        if (weaponDataStr.match(/piercing|p/i)) {
            itemData.system.damage.damageType = 'piercing';
        } else if (weaponDataStr.match(/slashing|s/i)) {
            itemData.system.damage.damageType = 'slashing';
        } else if (weaponDataStr.match(/bludgeoning|b/i)) {
            itemData.system.damage.damageType = 'bludgeoning';
        }
        
        // Parse weapon traits
        const traits = [];
        if (weaponDataStr.match(/finesse/i)) traits.push('finesse');
        if (weaponDataStr.match(/agile/i)) traits.push('agile');
        if (weaponDataStr.match(/versatile/i)) traits.push('versatile');
        if (weaponDataStr.match(/thrown/i)) traits.push('thrown');
        if (weaponDataStr.match(/reach/i)) traits.push('reach');
        if (weaponDataStr.match(/trip/i)) traits.push('trip');
        if (weaponDataStr.match(/disarm/i)) traits.push('disarm');
        
        if (traits.length > 0) {
            itemData.system.traits = itemData.system.traits || {};
            itemData.system.traits.value = [
                ...(itemData.system.traits.value || []),
                ...traits
            ];
        }
    }
    
    /**
     * Apply armor-specific data
     * @param {Object} itemData - Item data to modify
     * @param {string} armorDataStr - Armor data description
     */
    applyArmorData(itemData, armorDataStr) {
        if (!armorDataStr) return;
        
        itemData.system = itemData.system || {};
        itemData.system.armor = itemData.system.armor || {};
        
        const isShield = armorDataStr.toLowerCase().includes('shield') || 
                        itemData.type === 'shield' ||
                        (itemData.subType || '').toLowerCase().includes('shield');
        
        if (isShield) {
            // Shield-specific parsing
            itemData.system.armor.category = 'shield';
            itemData.system.armor.armorType = { value: 'shield' };
            
            // Parse AC bonus (shields use "value" not "acBonus")
            const acMatch = armorDataStr.match(/ac\s*(?:bonus|value)?\s*(?:\+)?(\d+)/i) || 
                           armorDataStr.match(/(?:\+)(\d+)\s*(?:to\s*)?ac/i);
            if (acMatch) {
                itemData.system.armor.value = parseInt(acMatch[1]);
            } else {
                // Default shield AC if not specified
                itemData.system.armor.value = itemData.system.armor.value || 1;
            }
            
            // Parse Dex cap (shields can have dex cap)
            const dexMatch = armorDataStr.match(/dex\s*(?:cap|max)\s*(?:\+)?(\d+)/i);
            if (dexMatch) {
                itemData.system.armor.dexCap = parseInt(dexMatch[1]);
            }
            
            // Shields don't have check penalty or speed penalty in PF2e
            itemData.system.armor.checkPenalty = null;
            itemData.system.armor.speedPenalty = 0;
        } else {
            // Regular armor parsing
            // Parse AC bonus
            const acMatch = armorDataStr.match(/\+(\d+)\s*ac/i);
            if (acMatch) {
                itemData.system.armor.value = parseInt(acMatch[1]);
            }
            
            // Parse Dex cap
            const dexMatch = armorDataStr.match(/dex\s*(?:cap|max)\s*(\d+)/i);
            if (dexMatch) {
                itemData.system.armor.dexCap = parseInt(dexMatch[1]);
            }
            
            // Parse check penalty
            const checkMatch = armorDataStr.match(/check\s*penalty\s*(-?\d+)/i);
            if (checkMatch) {
                itemData.system.armor.checkPenalty = parseInt(checkMatch[1]);
            }
            
            // Parse speed penalty
            const speedMatch = armorDataStr.match(/speed\s*penalty\s*(-?\d+)/i);
            if (speedMatch) {
                itemData.system.armor.speedPenalty = parseInt(speedMatch[1]);
            }
            
            // Parse armor category
            if (armorDataStr.match(/light/i)) {
                itemData.system.armor.category = 'light';
            } else if (armorDataStr.match(/medium/i)) {
                itemData.system.armor.category = 'medium';
            } else if (armorDataStr.match(/heavy/i)) {
                itemData.system.armor.category = 'heavy';
            }
        }
    }

    /**
     * Ensure shield properties are properly set
     * @param {Object} itemData - Item data to modify
     * @param {Object} itemData - Original LLM data
     */
    ensureShieldProperties(itemData, originalData) {
        if (!itemData.system) {
            itemData.system = {};
        }
        
        if (!itemData.system.armor) {
            itemData.system.armor = {};
        }
        
        // Ensure shield category
        itemData.system.armor.category = 'shield';
        if (!itemData.system.armor.armorType) {
            itemData.system.armor.armorType = { value: 'shield' };
        }
        
        // Set default shield AC if not set
        if (!itemData.system.armor.value && itemData.system.armor.value !== 0) {
            itemData.system.armor.value = 1; // Default basic shield AC
        }
        
        // Set shield HP (default 20 for basic shield, scales with level)
        if (!itemData.system.hp) {
            const level = itemData.system.level?.value || 1;
            // HP scales: level 1-5: 20, 6-10: 30, 11-15: 40, 16-20: 50
            let hp = 20;
            if (level >= 16) hp = 50;
            else if (level >= 11) hp = 40;
            else if (level >= 6) hp = 30;
            
            itemData.system.hp = {
                value: hp,
                max: hp
            };
        }
        
        // Set shield hardness (default 5 for basic shield, scales with level)
        if (!itemData.system.hardness) {
            const level = itemData.system.level?.value || 1;
            // Hardness scales: level 1-5: 5, 6-10: 7, 11-15: 9, 16-20: 11
            let hardness = 5;
            if (level >= 16) hardness = 11;
            else if (level >= 11) hardness = 9;
            else if (level >= 6) hardness = 7;
            
            itemData.system.hardness = hardness;
        }
        
        // Set broken threshold (half of max HP)
        if (itemData.system.hp && itemData.system.hp.max) {
            itemData.system.armor.brokenThreshold = Math.floor(itemData.system.hp.max / 2);
        } else {
            itemData.system.armor.brokenThreshold = 10; // Default
        }
        
        // Ensure shield-specific properties
        itemData.system.armor.checkPenalty = null; // Shields don't have check penalty
        itemData.system.armor.speedPenalty = 0; // Shields don't have speed penalty
        itemData.system.armor.strength = null; // Shields don't have strength requirement
    }

    /**
     * Parse level from string or number
     * @param {string|number} level - Item level
     * @returns {number} Item level
     */
    parseLevel(level) {
        if (typeof level === 'number') return level;
        const match = String(level).match(/(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }

    /**
     * Add rule elements for PF2e automation
     * Rule elements enable automatic bonuses, effects, and calculations
     * @param {Object} itemData - Item data to modify
     * @param {string} mechanicalEffects - Description of mechanical effects
     */
    addRuleElements(itemData, mechanicalEffects) {
        if (!itemData.system) {
            itemData.system = {};
        }
        
        if (!itemData.system.rules) {
            itemData.system.rules = [];
        }
        
        const effects = mechanicalEffects.toLowerCase();
        
        // Parse common bonuses from mechanical effects
        // AC bonuses
        const acMatch = effects.match(/(?:\+|\+)(\d+)\s*(?:to\s*)?ac|ac\s*(?:bonus|increase)\s*(?:of\s*)?(?:\+|\+)?(\d+)/i);
        if (acMatch) {
            const bonus = parseInt(acMatch[1] || acMatch[2]);
            itemData.system.rules.push({
                key: 'FlatModifier',
                selector: 'ac',
                value: bonus,
                type: 'item'
            });
        }
        
        // Save bonuses
        const saveMatch = effects.match(/(?:\+|\+)(\d+)\s*(?:to\s*)?(?:all\s*)?saves?|saves?\s*(?:bonus|increase)\s*(?:of\s*)?(?:\+|\+)?(\d+)/i);
        if (saveMatch) {
            const bonus = parseInt(saveMatch[1] || saveMatch[2]);
            ['fortitude', 'reflex', 'will'].forEach(save => {
                itemData.system.rules.push({
                    key: 'FlatModifier',
                    selector: save,
                    value: bonus,
                    type: 'item'
                });
            });
        }
        
        // Skill bonuses
        const skillMatch = effects.match(/(?:\+|\+)(\d+)\s*(?:to\s*)?(\w+)\s*(?:skill|checks?)/i);
        if (skillMatch) {
            const bonus = parseInt(skillMatch[1]);
            const skill = skillMatch[2].toLowerCase();
            itemData.system.rules.push({
                key: 'FlatModifier',
                selector: skill,
                value: bonus,
                type: 'item'
            });
        }
        
        // Ability score bonuses
        const abilityMatch = effects.match(/(?:\+|\+)(\d+)\s*(?:to\s*)?(?:strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha)/i);
        if (abilityMatch) {
            const bonus = parseInt(abilityMatch[1]);
            const ability = abilityMatch[2]?.toLowerCase() || '';
            const abilityMap = {
                'str': 'strength', 'strength': 'strength',
                'dex': 'dexterity', 'dexterity': 'dexterity',
                'con': 'constitution', 'constitution': 'constitution',
                'int': 'intelligence', 'intelligence': 'intelligence',
                'wis': 'wisdom', 'wisdom': 'wisdom',
                'cha': 'charisma', 'charisma': 'charisma'
            };
            const fullAbility = abilityMap[ability] || ability;
            if (fullAbility) {
                itemData.system.rules.push({
                    key: 'FlatModifier',
                    selector: fullAbility,
                    value: bonus,
                    type: 'item'
                });
            }
        }
        
        // Resistance
        const resistMatch = effects.match(/resistance\s*(?:to\s*)?(\w+)\s*(?:damage)?\s*(?:\+|\+)?(\d+)/i);
        if (resistMatch) {
            const damageType = resistMatch[1].toLowerCase();
            const value = parseInt(resistMatch[2] || '5');
            itemData.system.rules.push({
                key: 'Resistance',
                type: damageType,
                value: value
            });
        }
        
        // Note: More complex rule elements (like spell effects, conditions, etc.)
        // would require more sophisticated parsing or manual specification
    }

    /**
     * Validate item data structure
     * @param {Object} itemData - Item data to validate
     */
    validateItemData(itemData) {
        if (!itemData.name) {
            itemData.name = 'Unnamed Item';
        }
        if (!itemData.type) {
            itemData.type = 'equipment';
        }
        if (!itemData.system) {
            itemData.system = {};
        }
        if (!itemData.system.description) {
            itemData.system.description = { value: '', gm: '' };
        }
        if (!itemData.system.level) {
            itemData.system.level = { value: 1 };
        }
        if (!itemData.system.traits) {
            itemData.system.traits = { value: [], rarity: 'common' };
        }
        if (!itemData.system.rules) {
            itemData.system.rules = [];
        }
    }
}

