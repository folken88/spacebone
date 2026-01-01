/**
 * PF2e Actor Factory for Spacebone Item Creator
 * Converts LLM-generated data into proper PF2e FoundryVTT actors
 * 
 * @author Folken Games
 * @version 1.0.0
 */

export class PF2ActorFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Create a PF2e actor from LLM-generated data
     * @param {Object} actorData - Raw actor data from LLM
     * @returns {Promise<Object>} PF2e-formatted actor data
     */
    async createPF2Actor(actorData) {
        try {
            const actorType = this.determineActorType(actorData);
            const isNPC = actorType === 'npc';
            
            // Build base actor structure - different for NPCs vs PCs
            const baseActor = {
                name: actorData.name || 'Unnamed Character',
                type: actorType,
                img: actorData.image || 'icons/svg/mystery-man.svg',
                system: {
                    details: {
                        level: {
                            value: this.parseLevel(actorData.level || 1),
                            min: 1
                        },
                        languages: {
                            value: this.parseLanguages(actorData.languages || []),
                            details: ''
                        }
                    }
                },
                items: [],
                effects: [],
                flags: {},
                ownership: {
                    default: 0
                }
            };

            // NPCs have simplified structure
            if (isNPC) {
                return await this.buildNPCActor(baseActor, actorData);
            } else {
                return await this.buildPCActor(baseActor, actorData);
            }
        } catch (error) {
            console.error('Spacebone | Error creating PF2e actor:', error);
            throw error;
        }
    }

    /**
     * Build a PC (character) actor
     * @param {Object} baseActor - Base actor structure
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Object>} Complete PC actor data
     */
    async buildPCActor(baseActor, actorData) {
        baseActor.system.details = {
            ...baseActor.system.details,
            ancestry: {
                value: actorData.ancestry || ''
            },
            class: {
                value: actorData.class || ''
            },
            background: {
                value: actorData.background || ''
            },
            deity: {
                value: actorData.deity || '',
                image: actorData.deityImage || ''
            },
            biography: {
                appearance: actorData.appearance || '',
                backstory: actorData.backstory || '',
                attitude: actorData.attitude || actorData.personality || '',
                beliefs: actorData.beliefs || '',
                likes: actorData.likes || '',
                dislikes: actorData.dislikes || '',
                catchphrases: actorData.catchphrases || '',
                campaignNotes: '',
                allies: '',
                enemies: '',
                organizations: '',
                visibility: {
                    appearance: true,
                    backstory: false,
                    personality: false,
                    campaign: false
                }
            },
            ethnicity: {
                value: actorData.ethnicity || ''
            },
            gender: {
                value: actorData.gender || ''
            },
            age: {
                value: actorData.age || ''
            },
            height: {
                value: actorData.height || ''
            },
            weight: {
                value: actorData.weight || ''
            },
            nationality: {
                value: actorData.nationality || ''
            },
            keyability: {
                value: this.getKeyAbility(actorData.class || '')
            },
            alliance: 'party',
            xp: {
                value: 0,
                min: 0,
                max: 1000,
                pct: 0
            }
        };

        baseActor.system.attributes = {
            hp: {
                value: this.calculateHP(actorData),
                temp: 0,
                max: this.calculateHP(actorData)
            },
            bonusbulk: 0
        };

        baseActor.system.initiative = {
            statistic: 'perception'
        };

        // Build abilities - ensure they're parsed correctly
        if (game.settings.get(this.moduleId, 'debugMode')) {
            console.log('Spacebone | Actor data abilities:', actorData.abilities);
        }
        baseActor.system.abilities = this.buildAbilities(actorData, false); // false = use scores for PCs
        if (game.settings.get(this.moduleId, 'debugMode')) {
            console.log('Spacebone | Built abilities:', baseActor.system.abilities);
        }
        baseActor.system.skills = this.buildSkills(actorData, false); // false = use ranks for PCs
        baseActor.system.saves = {
            fortitude: { rank: 0, value: 0 },
            reflex: { rank: 0, value: 0 },
            will: { rank: 0, value: 0 }
        };

        baseActor.system.resources = {
            heroPoints: {
                value: 1,
                max: 3
            },
            focus: {
                value: 1
            }
        };

        baseActor.system.build = {
            attributes: {
                boosts: {}
            }
        };

        baseActor.system.crafting = {
            formulas: []
        };

        baseActor.system.customModifiers = {};
        baseActor.system.exploration = [];

        // Add character creation items from compendiums (background, ancestry, heritage, class)
        const characterItems = await this.getCharacterCreationItems(actorData);
        baseActor.items = [...characterItems];

        // Add appropriate equipment based on level and class
        const equipmentItems = await this.getAppropriateEquipment(actorData);
        baseActor.items = [...baseActor.items, ...equipmentItems];

        // Add additional items if specified (equipment, etc.)
        if (actorData.items) {
            const additionalItems = await this.buildItems(actorData.items, actorData);
            baseActor.items = [...baseActor.items, ...additionalItems];
        }

        // Validate the created actor data
        this.validateActorData(baseActor);
        
        if (game.settings.get(this.moduleId, 'debugMode')) {
            console.log('Spacebone | Created PF2e actor data:', baseActor);
        }

        return baseActor;
    }

    /**
     * Build an NPC actor with simplified structure
     * @param {Object} baseActor - Base actor structure
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Object>} Complete NPC actor data
     */
    async buildNPCActor(baseActor, actorData) {
        const level = this.parseLevel(actorData.level || 1);
        
        // NPCs use simplified details structure
        baseActor.system.details = {
            ...baseActor.system.details,
            blurb: this.buildNPCBlurb(actorData),
            publicNotes: this.buildNPCPublicNotes(actorData),
            privateNotes: '',
            publication: {
                title: '',
                authors: '',
                license: 'OGL',
                remaster: false
            }
        };

        // NPCs use ability modifiers directly, not scores
        baseActor.system.abilities = this.buildAbilities(actorData, true); // true = use modifiers for NPCs
        
        // NPCs use base skill values directly
        baseActor.system.skills = this.buildSkills(actorData, true); // true = use base values for NPCs
        
        // NPCs have simplified attributes
        baseActor.system.attributes = {
            hp: {
                value: this.calculateNPCHP(level, actorData),
                temp: 0,
                max: this.calculateNPCHP(level, actorData),
                details: ''
            },
            ac: {
                value: this.calculateNPCAC(level, actorData),
                details: ''
            },
            allSaves: {
                value: ''
            },
            speed: {
                value: 25,
                otherSpeeds: [],
                details: ''
            },
            immunities: [],
            resistances: [],
            weaknesses: []
        };

        baseActor.system.initiative = {
            statistic: 'perception'
        };

        baseActor.system.perception = {
            details: '',
            mod: this.calculateNPCPerception(level, actorData),
            senses: [],
            vision: true
        };

        baseActor.system.saves = {
            fortitude: {
                value: this.calculateNPCSave(level, 'fortitude', actorData),
                saveDetail: ''
            },
            reflex: {
                value: this.calculateNPCSave(level, 'reflex', actorData),
                saveDetail: ''
            },
            will: {
                value: this.calculateNPCSave(level, 'will', actorData),
                saveDetail: ''
            }
        };

        baseActor.system.traits = {
            value: [],
            rarity: 'common',
            size: {
                value: 'med'
            }
        };

        baseActor.system.resources = {};

        // Add appropriate equipment for NPCs too
        const equipmentItems = await this.getAppropriateEquipment(actorData);
        baseActor.items = [...equipmentItems];

        return baseActor;
    }

    /**
     * Build NPC blurb (brief description)
     * @param {Object} actorData - LLM-generated actor data
     * @returns {string} NPC blurb
     */
    buildNPCBlurb(actorData) {
        const parts = [];
        if (actorData.appearance) parts.push(actorData.appearance);
        if (actorData.backstory) parts.push(actorData.backstory);
        return parts.join(' ') || 'A simple NPC.';
    }

    /**
     * Build NPC public notes
     * @param {Object} actorData - LLM-generated actor data
     * @returns {string} NPC public notes
     */
    buildNPCPublicNotes(actorData) {
        const parts = [];
        if (actorData.personality) parts.push(`<p><strong>Personality:</strong> ${actorData.personality}</p>`);
        if (actorData.backstory && actorData.backstory.length > 100) {
            parts.push(`<p>${actorData.backstory}</p>`);
        }
        return parts.join('\n') || '';
    }

    /**
     * Calculate NPC HP (simplified formula)
     * @param {number} level - NPC level
     * @param {Object} actorData - Actor data
     * @returns {number} HP value
     */
    calculateNPCHP(level, actorData) {
        const className = (actorData.class || '').toLowerCase();
        const conMod = this.getAbilityModifier(actorData.abilities?.con || 10);
        
        // NPC HP: 6 + (level * 8) + (level * conMod)
        return 6 + (level * 8) + (level * conMod);
    }

    /**
     * Calculate NPC AC
     * @param {number} level - NPC level
     * @param {Object} actorData - Actor data
     * @returns {number} AC value
     */
    calculateNPCAC(level, actorData) {
        const dexMod = this.getAbilityModifier(actorData.abilities?.dex || 10);
        // NPC AC: 15 + level + dexMod (simplified)
        return 15 + level + dexMod;
    }

    /**
     * Calculate NPC Perception
     * @param {number} level - NPC level
     * @param {Object} actorData - Actor data
     * @returns {number} Perception modifier
     */
    calculateNPCPerception(level, actorData) {
        const wisMod = this.getAbilityModifier(actorData.abilities?.wis || 10);
        // NPC Perception: level + wisMod
        return level + wisMod;
    }

    /**
     * Calculate NPC save
     * @param {number} level - NPC level
     * @param {string} saveType - Save type (fortitude/reflex/will)
     * @param {Object} actorData - Actor data
     * @returns {number} Save value
     */
    calculateNPCSave(level, saveType, actorData) {
        const abilityMap = {
            'fortitude': 'con',
            'reflex': 'dex',
            'will': 'wis'
        };
        const ability = abilityMap[saveType] || 'con';
        const abilityMod = this.getAbilityModifier(actorData.abilities?.[ability] || 10);
        // NPC Save: level + abilityMod
        return level + abilityMod;
    }

    /**
     * Determine actor type from data
     * @param {Object} actorData - LLM generated actor data
     * @returns {string} Actor type
     */
    determineActorType(actorData) {
        const type = (actorData.type || '').toLowerCase();
        if (type.includes('npc') || type.includes('creature') || type.includes('monster')) {
            return 'npc';
        }
        if (type.includes('familiar') || type.includes('companion')) {
            return 'familiar';
        }
        return 'character'; // Default to PC
    }

    /**
     * Parse level from string or number
     * @param {string|number} level - Actor level
     * @returns {number} Actor level
     */
    parseLevel(level) {
        if (typeof level === 'number') return Math.max(1, Math.min(20, level));
        const match = String(level).match(/(\d+)/);
        return match ? Math.max(1, Math.min(20, parseInt(match[1]))) : 1;
    }

    /**
     * Parse languages array
     * @param {string|Array} languages - Languages string or array
     * @returns {Array<string>} Array of language IDs
     */
    parseLanguages(languages) {
        if (Array.isArray(languages)) return languages;
        if (!languages) return ['common'];
        
        const langMap = {
            'common': 'common',
            'dwarven': 'dwarven',
            'elven': 'elven',
            'gnomish': 'gnomish',
            'halfling': 'halfling',
            'orcish': 'orcish',
            'goblin': 'goblin',
            'draconic': 'draconic',
            'infernal': 'infernal',
            'celestial': 'celestial',
            'abyssal': 'abyssal',
            'kelish': 'kelish',
            'taldane': 'taldane',
            'varisian': 'varisian',
            'sylvan': 'sylvan',
            'undercommon': 'undercommon'
        };
        
        const langs = String(languages).toLowerCase().split(/[,;]/).map(l => l.trim());
        const result = ['common']; // Always include common
        
        langs.forEach(lang => {
            const normalized = lang.toLowerCase();
            if (langMap[normalized] && !result.includes(langMap[normalized])) {
                result.push(langMap[normalized]);
            }
        });
        
        return result;
    }

    /**
     * Get key ability for a class
     * @param {string} className - Class name
     * @returns {string} Key ability abbreviation
     */
    getKeyAbility(className) {
        const classMap = {
            'alchemist': 'int',
            'barbarian': 'str',
            'bard': 'cha',
            'champion': 'str',
            'cleric': 'wis',
            'druid': 'wis',
            'fighter': 'str',
            'gunslinger': 'dex',
            'inventor': 'int',
            'investigator': 'int',
            'magus': 'int',
            'monk': 'str',
            'oracle': 'cha',
            'psychic': 'int',
            'ranger': 'dex',
            'rogue': 'dex',
            'sorcerer': 'cha',
            'summoner': 'cha',
            'swashbuckler': 'dex',
            'witch': 'int',
            'wizard': 'int'
        };
        
        const normalized = className.toLowerCase();
        for (const [key, value] of Object.entries(classMap)) {
            if (normalized.includes(key)) {
                return value;
            }
        }
        
        return 'str'; // Default
    }

    /**
     * Calculate HP based on level and class
     * @param {Object} actorData - Actor data
     * @returns {number} HP value
     */
    calculateHP(actorData) {
        const level = this.parseLevel(actorData.level || 1);
        const className = (actorData.class || '').toLowerCase();
        const conMod = this.getAbilityModifier(actorData.abilities?.con || 10);
        
        // Base HP per class (at level 1)
        const baseHP = {
            'fighter': 10,
            'barbarian': 12,
            'champion': 10,
            'monk': 10,
            'ranger': 10,
            'rogue': 8,
            'swashbuckler': 10,
            'investigator': 8,
            'gunslinger': 10,
            'inventor': 8,
            'alchemist': 8,
            'bard': 8,
            'cleric': 8,
            'druid': 8,
            'oracle': 8,
            'psychic': 8,
            'sorcerer': 6,
            'summoner': 8,
            'witch': 6,
            'wizard': 6,
            'magus': 8
        };
        
        // Find matching class
        let hpPerLevel = 8; // Default
        for (const [key, value] of Object.entries(baseHP)) {
            if (className.includes(key)) {
                hpPerLevel = value;
                break;
            }
        }
        
        // Calculate: base HP + (level - 1) * hpPerLevel + (level * conMod)
        return hpPerLevel + ((level - 1) * hpPerLevel) + (level * conMod);
    }

    /**
     * Get ability modifier from score
     * @param {number} score - Ability score
     * @returns {number} Modifier
     */
    getAbilityModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    /**
     * Build abilities object
     * @param {Object} actorData - Actor data
     * @param {boolean} isNPC - Whether this is an NPC (uses mods) or PC (uses scores)
     * @returns {Object} Abilities object
     */
    buildAbilities(actorData, isNPC = false) {
        const abilities = actorData.abilities || {};
        
        // Debug: log what abilities we received
        console.log('Spacebone | Building abilities from actorData.abilities:', abilities);
        console.log('Spacebone | Full actorData:', actorData);
        
        // Ensure we have numeric values - handle both object and string parsing
        let str = 10, dex = 10, con = 10, int = 10, wis = 10, cha = 10;
        
        if (abilities && typeof abilities === 'object') {
            str = parseInt(abilities.str) || 10;
            dex = parseInt(abilities.dex) || 10;
            con = parseInt(abilities.con) || 10;
            int = parseInt(abilities.int) || 10;
            wis = parseInt(abilities.wis) || 10;
            cha = parseInt(abilities.cha) || 10;
        } else if (typeof abilities === 'string') {
            // If abilities is a string, try to parse it
            const parsed = this.parseAbilities(abilities);
            str = parsed.str;
            dex = parsed.dex;
            con = parsed.con;
            int = parsed.int;
            wis = parsed.wis;
            cha = parsed.cha;
        }
        
        if (isNPC) {
            // NPCs use modifiers directly
            return {
                str: { mod: this.getAbilityModifier(str) },
                dex: { mod: this.getAbilityModifier(dex) },
                con: { mod: this.getAbilityModifier(con) },
                int: { mod: this.getAbilityModifier(int) },
                wis: { mod: this.getAbilityModifier(wis) },
                cha: { mod: this.getAbilityModifier(cha) }
            };
        } else {
            // PCs use ability scores
            return {
                str: { value: str },
                dex: { value: dex },
                con: { value: con },
                int: { value: int },
                wis: { value: wis },
                cha: { value: cha }
            };
        }
    }

    /**
     * Build skills object
     * @param {Object} actorData - Actor data
     * @param {boolean} isNPC - Whether this is an NPC (uses base) or PC (uses ranks)
     * @returns {Object} Skills object
     */
    buildSkills(actorData, isNPC = false) {
        const skills = {
            acrobatics: isNPC ? { base: 0 } : { rank: 0 },
            arcana: isNPC ? { base: 0 } : { rank: 0 },
            athletics: isNPC ? { base: 0 } : { rank: 0 },
            crafting: isNPC ? { base: 0 } : { rank: 0 },
            deception: isNPC ? { base: 0 } : { rank: 0 },
            diplomacy: isNPC ? { base: 0 } : { rank: 0 },
            intimidation: isNPC ? { base: 0 } : { rank: 0 },
            medicine: isNPC ? { base: 0 } : { rank: 0 },
            nature: isNPC ? { base: 0 } : { rank: 0 },
            occultism: isNPC ? { base: 0 } : { rank: 0 },
            performance: isNPC ? { base: 0 } : { rank: 0 },
            religion: isNPC ? { base: 0 } : { rank: 0 },
            society: isNPC ? { base: 0 } : { rank: 0 },
            stealth: isNPC ? { base: 0 } : { rank: 0 },
            survival: isNPC ? { base: 0 } : { rank: 0 },
            thievery: isNPC ? { base: 0 } : { rank: 0 }
        };
        
        // Set trained skills if specified
        if (actorData.trainedSkills) {
            const trained = Array.isArray(actorData.trainedSkills) 
                ? actorData.trainedSkills 
                : String(actorData.trainedSkills).split(',').map(s => s.trim().toLowerCase());
            
            const level = this.parseLevel(actorData.level || 1);
            
            trained.forEach(skill => {
                if (skills[skill]) {
                    if (isNPC) {
                        // NPCs use base values (level + ability mod)
                        skills[skill].base = level;
                    } else {
                        // PCs use ranks
                        skills[skill].rank = 1; // Trained
                    }
                }
            });
        }
        
        return skills;
    }

    /**
     * Get character creation items (background, ancestry, heritage, class) from compendiums
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Array>} Array of character creation items
     */
    async getCharacterCreationItems(actorData) {
        const items = [];
        
        try {
            // Get ancestry
            if (actorData.ancestry) {
                const ancestry = await this.getAncestryFromCompendium(actorData.ancestry);
                if (ancestry) {
                    items.push(ancestry);
                    console.log(`Spacebone | Added ancestry: ${ancestry.name}`);
                } else {
                    console.warn(`Spacebone | Could not find ancestry: ${actorData.ancestry}`);
                }
            }

            // Get heritage (if specified)
            if (actorData.heritage && actorData.heritage.trim()) {
                const heritage = await this.getHeritageFromCompendium(actorData.heritage, actorData.ancestry);
                if (heritage) {
                    items.push(heritage);
                    console.log(`Spacebone | Added heritage: ${heritage.name}`);
                } else {
                    console.warn(`Spacebone | Could not find heritage: ${actorData.heritage}`);
                }
            }

            // Get background
            if (actorData.background) {
                const background = await this.getBackgroundFromCompendium(actorData.background);
                if (background) {
                    items.push(background);
                    console.log(`Spacebone | Added background: ${background.name}`);
                } else {
                    console.warn(`Spacebone | Could not find background: ${actorData.background}`);
                }
            }

            // Get class
            if (actorData.class) {
                const classItem = await this.getClassFromCompendium(actorData.class);
                if (classItem) {
                    items.push(classItem);
                    console.log(`Spacebone | Added class: ${classItem.name}`);
                } else {
                    console.warn(`Spacebone | Could not find class: ${actorData.class}`);
                }
            }

            // Get deity (if specified and applicable)
            if (actorData.deity && actorData.deity.trim()) {
                const deity = await this.getDeityFromCompendium(actorData.deity);
                if (deity) {
                    items.push(deity);
                    console.log(`Spacebone | Added deity: ${deity.name}`);
                } else {
                    console.warn(`Spacebone | Could not find deity: ${actorData.deity}`);
                }
            }

        } catch (error) {
            console.warn('Spacebone | Error getting character creation items:', error);
        }

        return items;
    }

    /**
     * Get ancestry from compendium
     * @param {string} ancestryName - Name of the ancestry
     * @returns {Promise<Object|null>} Ancestry item or null
     */
    async getAncestryFromCompendium(ancestryName) {
        try {
            // Try different possible compendium names
            const packNames = ['pf2e.ancestries', 'pf2e.ancestries-srd', 'pf2e.ancestryfeatures'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) {
                    if (game.settings.get(this.moduleId, 'debugMode')) {
                        console.log(`Spacebone | Compendium ${packName} not found`);
                    }
                    continue;
                }

                const index = await pack.getIndex();
                const normalizedName = ancestryName.toLowerCase();
                
                // Find matching ancestry - try exact match first, then partial
                let match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName === normalizedName;
                });

                // If no exact match, try partial
                if (!match) {
                    match = index.find(entry => {
                        const entryName = entry.name.toLowerCase();
                        return entryName.includes(normalizedName) ||
                               normalizedName.includes(entryName);
                    });
                }

                if (match) {
                    const ancestry = await pack.getDocument(match._id);
                    if (ancestry) {
                        return ancestry.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn(`Spacebone | Error getting ancestry ${ancestryName}:`, error);
        }
        return null;
    }

    /**
     * Get heritage from compendium
     * @param {string} heritageName - Name of the heritage
     * @param {string} ancestryName - Name of the ancestry (for filtering)
     * @returns {Promise<Object|null>} Heritage item or null
     */
    async getHeritageFromCompendium(heritageName, ancestryName) {
        try {
            const packNames = ['pf2e.heritages', 'pf2e.heritages-srd'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const index = await pack.getIndex();
                const normalizedHeritage = heritageName.toLowerCase();
                
                // Find matching heritage
                const match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName === normalizedHeritage || 
                           entryName.includes(normalizedHeritage) ||
                           normalizedHeritage.includes(entryName);
                });

                if (match) {
                    const heritage = await pack.getDocument(match._id);
                    if (heritage) {
                        return heritage.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn(`Spacebone | Error getting heritage ${heritageName}:`, error);
        }
        return null;
    }

    /**
     * Get background from compendium
     * @param {string} backgroundName - Name of the background
     * @returns {Promise<Object|null>} Background item or null
     */
    async getBackgroundFromCompendium(backgroundName) {
        try {
            // Try different possible compendium names
            const packNames = ['pf2e.backgrounds', 'pf2e.backgrounds-srd'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) {
                    if (game.settings.get(this.moduleId, 'debugMode')) {
                        console.log(`Spacebone | Compendium ${packName} not found`);
                    }
                    continue;
                }

                const index = await pack.getIndex();
                const normalizedName = backgroundName.toLowerCase();
                
                // Find matching background - try exact match first
                let match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName === normalizedName;
                });

                // If no exact match, try partial
                if (!match) {
                    match = index.find(entry => {
                        const entryName = entry.name.toLowerCase();
                        return entryName.includes(normalizedName) ||
                               normalizedName.includes(entryName);
                    });
                }

                if (match) {
                    const background = await pack.getDocument(match._id);
                    if (background) {
                        return background.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn(`Spacebone | Error getting background ${backgroundName}:`, error);
        }
        return null;
    }

    /**
     * Get class from compendium
     * @param {string} className - Name of the class
     * @returns {Promise<Object|null>} Class item or null
     */
    async getClassFromCompendium(className) {
        try {
            // Try different possible compendium names
            const packNames = ['pf2e.classes', 'pf2e.classes-srd'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) {
                    if (game.settings.get(this.moduleId, 'debugMode')) {
                        console.log(`Spacebone | Compendium ${packName} not found`);
                    }
                    continue;
                }

                const index = await pack.getIndex();
                const normalizedName = className.toLowerCase();
                
                // Find matching class - try exact match first
                let match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName === normalizedName;
                });

                // If no exact match, try partial
                if (!match) {
                    match = index.find(entry => {
                        const entryName = entry.name.toLowerCase();
                        return entryName.includes(normalizedName) ||
                               normalizedName.includes(entryName);
                    });
                }

                if (match) {
                    const classItem = await pack.getDocument(match._id);
                    if (classItem) {
                        return classItem.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn(`Spacebone | Error getting class ${className}:`, error);
        }
        return null;
    }

    /**
     * Get deity from compendium
     * @param {string} deityName - Name of the deity
     * @returns {Promise<Object|null>} Deity item or null
     */
    async getDeityFromCompendium(deityName) {
        try {
            const packNames = ['pf2e.deities', 'pf2e.deities-srd'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const index = await pack.getIndex();
                const normalizedName = deityName.toLowerCase();
                
                // Find matching deity
                const match = index.find(entry => {
                    const entryName = entry.name.toLowerCase();
                    return entryName === normalizedName || 
                           entryName.includes(normalizedName) ||
                           normalizedName.includes(entryName);
                });

                if (match) {
                    const deity = await pack.getDocument(match._id);
                    if (deity) {
                        return deity.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn(`Spacebone | Error getting deity ${deityName}:`, error);
        }
        return null;
    }

    /**
     * Get appropriate equipment for the actor based on level and class
     * @param {Object} actorData - LLM-generated actor data
     * @returns {Promise<Array>} Array of equipment items
     */
    async getAppropriateEquipment(actorData) {
        const items = [];
        const level = this.parseLevel(actorData.level || 1);
        const className = (actorData.class || '').toLowerCase();
        
        // Calculate number of items: approximately 1 per 3 levels (minimum 1)
        const numItems = Math.max(1, Math.floor(level / 3) + 1);
        
        console.log(`Spacebone | Getting equipment for level ${level} ${className} (target: ${numItems} items)`);
        
        try {
            // Always try to get a weapon (appropriate for class)
            const weapon = await this.getAppropriateWeapon(className, level);
            if (weapon) {
                items.push(weapon);
                console.log(`Spacebone | Added weapon: ${weapon.name}`);
            } else {
                console.warn(`Spacebone | Could not find weapon for ${className}`);
            }

            // Get armor if martial class (Fighter, Champion, Ranger, etc.)
            const isMartial = ['fighter', 'champion', 'ranger', 'barbarian', 'monk', 'rogue', 'swashbuckler', 'gunslinger'].some(c => className.includes(c));
            if (isMartial && items.length < numItems) {
                const armor = await this.getAppropriateArmor(className, level);
                if (armor) {
                    items.push(armor);
                    console.log(`Spacebone | Added armor: ${armor.name}`);
                } else {
                    console.warn(`Spacebone | Could not find armor for ${className}`);
                }
            }

            // Get a potion or consumable
            if (items.length < numItems) {
                const consumable = await this.getAppropriateConsumable(level);
                if (consumable) {
                    items.push(consumable);
                    console.log(`Spacebone | Added consumable: ${consumable.name}`);
                } else {
                    console.warn(`Spacebone | Could not find consumable`);
                }
            }

            // Get tools or equipment appropriate for class
            if (items.length < numItems) {
                const tool = await this.getAppropriateTool(className, level);
                if (tool) {
                    items.push(tool);
                    console.log(`Spacebone | Added tool/equipment: ${tool.name}`);
                } else {
                    console.warn(`Spacebone | Could not find tool for ${className}`);
                }
            }

            // Fill remaining slots with general equipment
            while (items.length < numItems) {
                const equipment = await this.getRandomEquipment(level);
                if (equipment) {
                    items.push(equipment);
                    console.log(`Spacebone | Added equipment: ${equipment.name}`);
                } else {
                    console.warn(`Spacebone | Could not find more equipment (have ${items.length}/${numItems})`);
                    break; // No more items available
                }
            }

            console.log(`Spacebone | Equipment selection complete: ${items.length} items added`);
        } catch (error) {
            console.warn('Spacebone | Error getting appropriate equipment:', error);
        }

        return items;
    }

    /**
     * Get appropriate weapon for class and level
     * @param {string} className - Class name
     * @param {number} level - Character level
     * @returns {Promise<Object|null>} Weapon item or null
     */
    async getAppropriateWeapon(className, level) {
        try {
            const packNames = ['pf2e.equipment-srd', 'pf2e.equipment'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) {
                    if (game.settings.get(this.moduleId, 'debugMode')) {
                        console.log(`Spacebone | Compendium ${packName} not found for weapons`);
                    }
                    continue;
                }

                // Use getDocuments() instead of getIndex() to get full item data
                const documents = await pack.getDocuments();
                const index = documents.map(doc => ({ _id: doc.id, name: doc.name, type: doc.type, system: doc.system }));
                
                // Define weapon preferences by class
                const weaponPreferences = {
                    'fighter': ['longsword', 'greatsword', 'rapier', 'warhammer', 'glaive'],
                    'rogue': ['rapier', 'shortsword', 'dagger', 'shortbow'],
                    'ranger': ['longbow', 'shortbow', 'longsword', 'rapier'],
                    'barbarian': ['greatsword', 'greataxe', 'maul', 'warhammer'],
                    'champion': ['longsword', 'warhammer', 'shield'],
                    'monk': ['unarmed', 'monk', 'nunchaku', 'bo staff'],
                    'gunslinger': ['pistol', 'musket', 'arquebus'],
                    'wizard': ['staff', 'dagger', 'crossbow'],
                    'sorcerer': ['staff', 'dagger'],
                    'cleric': ['mace', 'warhammer', 'scimitar'],
                    'druid': ['staff', 'scimitar', 'sickle'],
                    'bard': ['rapier', 'whip', 'shortbow'],
                    'alchemist': ['dagger', 'crossbow'],
                    'investigator': ['rapier', 'shortsword', 'crossbow']
                };

                // Find preferred weapons for this class
                let preferredWeapons = ['longsword', 'rapier', 'dagger']; // Default
                for (const [key, weapons] of Object.entries(weaponPreferences)) {
                    if (className.includes(key)) {
                        preferredWeapons = weapons;
                        break;
                    }
                }

                // Try to find a preferred weapon
                for (const weaponName of preferredWeapons) {
                    const match = documents.find(doc => {
                        if (doc.type !== 'weapon') return false;
                        const entryName = doc.name.toLowerCase();
                        return entryName.includes(weaponName) || weaponName.includes(entryName);
                    });

                    if (match) {
                        const itemLevel = match.system?.level?.value || 0;
                        if (itemLevel <= level + 2) { // Allow slightly higher level items
                            return match.toObject();
                        }
                    }
                }

                // Fallback: get any simple weapon
                const simpleWeapon = documents.find(doc => {
                    if (doc.type !== 'weapon') return false;
                    return doc.system?.category === 'simple' || doc.name.toLowerCase().includes('dagger');
                });

                if (simpleWeapon) {
                    return simpleWeapon.toObject();
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting weapon:', error);
        }
        return null;
    }

    /**
     * Get appropriate armor for class and level
     * @param {string} className - Class name
     * @param {number} level - Character level
     * @returns {Promise<Object|null>} Armor item or null
     */
    async getAppropriateArmor(className, level) {
        try {
            const packNames = ['pf2e.equipment-srd', 'pf2e.equipment'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const documents = await pack.getDocuments();
                
                // Define armor preferences by class
                const armorPreferences = {
                    'fighter': ['full plate', 'breastplate', 'chain mail'],
                    'champion': ['full plate', 'breastplate'],
                    'ranger': ['studded leather', 'hide', 'leather'],
                    'rogue': ['leather', 'studded leather'],
                    'barbarian': ['hide', 'studded leather'],
                    'monk': ['unarmored'], // Monks typically don't wear armor
                    'gunslinger': ['leather', 'studded leather']
                };

                // Find preferred armor for this class
                let preferredArmor = ['leather', 'studded leather', 'chain shirt']; // Default
                for (const [key, armors] of Object.entries(armorPreferences)) {
                    if (className.includes(key)) {
                        preferredArmor = armors;
                        break;
                    }
                }

                // Try to find preferred armor
                for (const armorName of preferredArmor) {
                    if (armorName === 'unarmored') continue; // Skip unarmored for now
                    
                    const match = documents.find(doc => {
                        if (doc.type !== 'armor') return false;
                        const entryName = doc.name.toLowerCase();
                        return entryName.includes(armorName) || armorName.includes(entryName);
                    });

                    if (match) {
                        const itemLevel = match.system?.level?.value || 0;
                        if (itemLevel <= level + 2) {
                            return match.toObject();
                        }
                    }
                }

                // Fallback: get any light armor
                const lightArmor = documents.find(doc => {
                    if (doc.type !== 'armor') return false;
                    return doc.system?.category === 'light' || doc.name.toLowerCase().includes('leather');
                });

                if (lightArmor) {
                    return lightArmor.toObject();
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting armor:', error);
        }
        return null;
    }

    /**
     * Get appropriate consumable (potion, etc.) for level
     * @param {number} level - Character level
     * @returns {Promise<Object|null>} Consumable item or null
     */
    async getAppropriateConsumable(level) {
        try {
            const packNames = ['pf2e.equipment-srd', 'pf2e.consumables', 'pf2e.equipment'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const documents = await pack.getDocuments();
                
                // Prefer healing potions
                const consumableTypes = ['potion of healing', 'healing potion', 'elixir of life', 'antidote'];
                
                for (const consumableName of consumableTypes) {
                    const match = documents.find(doc => {
                        if (doc.type !== 'consumable') return false;
                        const entryName = doc.name.toLowerCase();
                        return entryName.includes(consumableName) || consumableName.includes(entryName);
                    });

                    if (match) {
                        const itemLevel = match.system?.level?.value || 0;
                        if (itemLevel <= level + 2) {
                            return match.toObject();
                        }
                    }
                }

                // Fallback: any consumable
                const anyConsumable = documents.find(doc => doc.type === 'consumable');
                if (anyConsumable) {
                    const itemLevel = anyConsumable.system?.level?.value || 0;
                    if (itemLevel <= level + 2) {
                        return anyConsumable.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting consumable:', error);
        }
        return null;
    }

    /**
     * Get appropriate tool or equipment for class
     * @param {string} className - Class name
     * @param {number} level - Character level
     * @returns {Promise<Object|null>} Tool/equipment item or null
     */
    async getAppropriateTool(className, level) {
        try {
            const packNames = ['pf2e.equipment-srd', 'pf2e.equipment'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const documents = await pack.getDocuments();
                
                // Define tool preferences by class
                const toolPreferences = {
                    'rogue': ['thieves tools', 'lockpick', 'climbing kit'],
                    'ranger': ['climbing kit', 'survival kit', 'hunting trap'],
                    'alchemist': ['alchemist tools', 'formula book'],
                    'wizard': ['spellbook', 'formula book'],
                    'investigator': ['thieves tools', 'formula book'],
                    'fighter': ['climbing kit', 'healers tools'],
                    'cleric': ['healers tools', 'religious symbol']
                };

                // Find preferred tools for this class
                let preferredTools = ['backpack', 'rope', 'torch']; // Default
                for (const [key, tools] of Object.entries(toolPreferences)) {
                    if (className.includes(key)) {
                        preferredTools = tools;
                        break;
                    }
                }

                // Try to find preferred tool
                for (const toolName of preferredTools) {
                    const match = documents.find(doc => {
                        if (doc.type !== 'equipment') return false;
                        const entryName = doc.name.toLowerCase();
                        return entryName.includes(toolName) || toolName.includes(entryName);
                    });

                    if (match) {
                        const itemLevel = match.system?.level?.value || 0;
                        if (itemLevel <= level + 2) {
                            return match.toObject();
                        }
                    }
                }

                // Fallback: basic equipment
                const basicEquipment = ['backpack', 'rope', 'torch', 'rations'];
                for (const itemName of basicEquipment) {
                    const match = documents.find(doc => {
                        const entryName = doc.name.toLowerCase();
                        return entryName.includes(itemName);
                    });

                    if (match) {
                        return match.toObject();
                    }
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting tool:', error);
        }
        return null;
    }

    /**
     * Get random equipment for level
     * @param {number} level - Character level
     * @returns {Promise<Object|null>} Equipment item or null
     */
    async getRandomEquipment(level) {
        try {
            const packNames = ['pf2e.equipment-srd', 'pf2e.equipment'];
            
            for (const packName of packNames) {
                const pack = game.packs.get(packName);
                if (!pack) continue;

                const documents = await pack.getDocuments();
                
                // Get random equipment (not weapons/armor)
                const equipment = documents.filter(doc => {
                    if (doc.type === 'weapon' || doc.type === 'armor') return false;
                    if (doc.type === 'consumable') return false;
                    const itemLevel = doc.system?.level?.value || 0;
                    if (itemLevel > level + 2) return false;
                    return true;
                });

                if (equipment.length > 0) {
                    const randomItem = equipment[Math.floor(Math.random() * equipment.length)];
                    return randomItem.toObject();
                }
            }
        } catch (error) {
            console.warn('Spacebone | Error getting random equipment:', error);
        }
        return null;
    }

    /**
     * Parse abilities string into object (helper method)
     * @param {string} abilitiesStr - Abilities string (e.g., "STR: 12, DEX: 18, CON: 14")
     * @returns {Object} Abilities object
     */
    parseAbilities(abilitiesStr) {
        const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        
        if (!abilitiesStr || typeof abilitiesStr !== 'string') {
            return abilities;
        }
        
        const matches = abilitiesStr.matchAll(/(STR|DEX|CON|INT|WIS|CHA):\s*(\d+)/gi);
        for (const match of matches) {
            const ability = match[1].toLowerCase();
            const value = parseInt(match[2]);
            if (ability in abilities && !isNaN(value)) {
                abilities[ability] = value;
            }
        }
        
        return abilities;
    }

    /**
     * Build items array for actor
     * @param {Array} itemsData - Items data from LLM
     * @param {Object} actorData - Full actor data
     * @returns {Promise<Array>} Items array
     */
    async buildItems(itemsData, actorData) {
        const items = [];
        
        // This will be expanded to create actual PF2e items
        // For now, return empty array - items will be added via compendium lookup
        // or created as needed
        
        return items;
    }

    /**
     * Validate actor data structure
     * @param {Object} actorData - Actor data to validate
     */
    validateActorData(actorData) {
        if (!actorData.name) {
            actorData.name = 'Unnamed Character';
        }
        if (!actorData.type) {
            actorData.type = 'character';
        }
        if (!actorData.system) {
            actorData.system = {};
        }
        if (!actorData.system.details) {
            actorData.system.details = { level: { value: 1, min: 1 } };
        }
        if (!actorData.items) {
            actorData.items = [];
        }
    }
}

