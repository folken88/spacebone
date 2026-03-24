/**
 * Ship Factory for Spacebone
 * Creates ship-combat-pf1 ship actors from LLM-generated data
 *
 * @author Folken Games
 * @version 1.0.0
 */

export class ShipFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Ship class definitions matching ShipConstants.js in ship-combat-pf1
     */
    static SHIP_CLASSES = {
        skiff:   { hp: 200,  ac: 10, maxSpeed: 5,  turnRate: 4, gunDeck: 1,  crewMin: 2,  crewMax: 6,  cargo: 2 },
        sloop:   { hp: 500,  ac: 12, maxSpeed: 11, turnRate: 3, gunDeck: 4,  crewMin: 6,  crewMax: 16, cargo: 10 },
        brig:    { hp: 800,  ac: 14, maxSpeed: 9,  turnRate: 2, gunDeck: 8,  crewMin: 12, crewMax: 24, cargo: 30 },
        frigate: { hp: 1200, ac: 16, maxSpeed: 13, turnRate: 2, gunDeck: 16, crewMin: 18, crewMax: 36, cargo: 60 },
        galleon: { hp: 1800, ac: 18, maxSpeed: 7,  turnRate: 1, gunDeck: 24, crewMin: 24, crewMax: 48, cargo: 120 },
        manowar: { hp: 2500, ac: 20, maxSpeed: 10, turnRate: 1, gunDeck: 32, crewMin: 30, crewMax: 60, cargo: 200 }
    };

    /**
     * Cannon templates by faction and caliber
     */
    static CANNON_TEMPLATES = {
        chelish: {
            'long12':    { name: 'Chelish Long 12',     damage: '6d6',  crit: 20, critMult: 4, range: 200, weight: 2000, price: 4000, sound: 'cannon_12_pound01.mp3' },
            '18pounder': { name: 'Chelish 18 Pounder',  damage: '10d6', crit: 20, critMult: 2, range: 200, weight: 3000, price: 6000, sound: 'cannon_massive_boom_32lbs01.mp3' },
            '24pounder': { name: 'Chelish 24 Pounder',  damage: '12d6', crit: 20, critMult: 4, range: 200, weight: 4000, price: 8000, sound: 'cannon_massive_boom_32lbs01.mp3' },
            '32pounder': { name: 'Chelish 32 Pounder',  damage: '14d6', crit: 20, critMult: 4, range: 200, weight: 5000, price: 10000, sound: 'cannon_massive_boom_32lbs01.mp3' }
        },
        andoran: {
            'liberty1':  { name: 'Liberty Gun Mk I',    damage: '4d6',  crit: 20, critMult: 3, range: 200, weight: 800, price: 600, sound: 'cannon_12_pound_andoran_sonic_boom_mk3.mp3' },
            'liberty2':  { name: 'Liberty Gun Mk II',   damage: '6d6',  crit: 20, critMult: 3, range: 200, weight: 800, price: 1200, sound: 'cannon_12_pound_andoran_sonic_boom_mk3.mp3' },
            'liberty3':  { name: 'Liberty Gun Mk III',  damage: '8d6',  crit: 19, critMult: 3, range: 200, weight: 800, price: 1800, sound: 'cannon_12_pound_andoran_sonic_boom_mk3.mp3', magical: true, cl: 5, aura: 'trs' }
        },
        taldor: {
            '9hammer':   { name: 'Taldor 9 Pound Hammer', damage: '6d6', crit: 20, critMult: 3, range: 200, weight: 1500, price: 3000, sound: 'cannon_12_pound01.mp3' }
        },
        bronze: {
            '9pounder':  { name: 'Bronze Fleet 9 pounder', damage: '6d6', crit: 20, critMult: 3, range: 200, weight: 1500, price: 3000, sound: 'cannon_12_pound01.mp3' }
        },
        shackles: {
            'carronade': { name: 'Shackles Carronade',  damage: '8d6',  crit: 20, critMult: 3, range: 150, weight: 1200, price: 2000, sound: 'cannon_12_pound01.mp3' },
            'long9':     { name: 'Long Nine',           damage: '6d6',  crit: 20, critMult: 4, range: 250, weight: 1800, price: 3500, sound: 'cannon_12_pound01.mp3' }
        }
    };

    /**
     * Default ammo loadout per caliber
     */
    static AMMO_DEFAULTS = {
        '7':  { round: 800, chain: 600, grape: 400 },
        '9':  { round: 800, chain: 600, grape: 400 },
        '12': { round: 600, chain: 500, grape: 400 },
        '18': { round: 500, chain: 400, grape: 350 },
        '24': { round: 400, chain: 350, grape: 300 },
        '32': { round: 350, chain: 300, grape: 250 }
    };

    /**
     * Wood types by faction
     */
    static WOOD_TYPES = {
        chelish: 'Chelish Oak Plank',
        andoran: 'Sargavan Mahogany Plank',
        taldor: 'Sargavan Mahogany Plank',
        bronze: 'Mwangi Teak Plank',
        shackles: 'Mwangi Teak Plank',
        default: 'Mwangi Teak Plank'
    };

    /**
     * Check if ship-combat-pf1 module is active
     * @returns {boolean}
     */
    static isShipCombatActive() {
        return game.modules.get('ship-combat-pf1')?.active ?? false;
    }

    /**
     * Create a ship actor from LLM-generated data
     * @param {Object} shipData - Parsed ship data from LLM
     * @returns {Promise<Actor|null>} Created ship actor
     */
    async createShip(shipData) {
        try {
            if (!ShipFactory.isShipCombatActive()) {
                ui.notifications.error('Ship Combat PF1 module is not active. Cannot create ships.');
                return null;
            }

            const shipClass = this.resolveShipClass(shipData.shipClass || shipData.class || 'brig');
            const classStats = ShipFactory.SHIP_CLASSES[shipClass];

            if (!classStats) {
                console.error(`Spacebone | Unknown ship class: ${shipClass}`);
                ui.notifications.error(`Unknown ship class: ${shipClass}`);
                return null;
            }

            const faction = (shipData.faction || 'shackles').toLowerCase();
            const shipName = shipData.name || `Unnamed ${shipClass.charAt(0).toUpperCase() + shipClass.slice(1)}`;

            console.log(`Spacebone | Creating ${faction} ${shipClass}: "${shipName}"`);

            // Build items array
            const items = [];

            // Add cannons
            const cannons = this.buildCannons(shipData, faction, classStats);
            items.push(...cannons);

            // Add ammunition
            const ammo = this.buildAmmunition(shipData, cannons);
            items.push(...ammo);

            // Add repair materials
            const materials = this.buildRepairMaterials(faction, shipClass);
            items.push(...materials);

            // Add sails
            items.push(this.buildSails(shipName, shipClass));

            // Build the actor data
            const actorData = {
                name: shipName,
                type: 'ship-combat-pf1.ship',
                img: shipData.image || 'icons/svg/ship.svg',
                system: {
                    shipClass: shipClass,
                    attributes: {
                        hp: {
                            value: classStats.hp,
                            max: classStats.hp,
                            temp: 0
                        }
                    }
                },
                items: items,
                ownership: { default: 0 }
            };

            const actor = await Actor.create(actorData, { renderSheet: true });

            if (actor) {
                console.log(`Spacebone | Created ship: ${actor.name} (${shipClass}, ${classStats.hp} HP, ${cannons.length} cannon types)`);
                ui.notifications.info(`Created ship: ${actor.name}`);
            }

            return actor;

        } catch (error) {
            console.error('Spacebone | Error creating ship:', error);
            ui.notifications.error(`Failed to create ship: ${error.message}`);
            return null;
        }
    }

    /**
     * Resolve ship class name to a valid key
     * @param {string} input - Ship class from LLM
     * @returns {string} Resolved ship class key
     */
    resolveShipClass(input) {
        const normalized = input.toLowerCase().trim().replace(/[^a-z]/g, '');
        const aliases = {
            'skiff': 'skiff', 'dinghy': 'skiff', 'rowboat': 'skiff',
            'sloop': 'sloop', 'cutter': 'sloop', 'schooner': 'sloop',
            'brig': 'brig', 'brigantine': 'brig', 'corvette': 'brig',
            'frigate': 'frigate',
            'galleon': 'galleon', 'carrack': 'galleon', 'greatship': 'galleon',
            'manowar': 'manowar', 'manofwar': 'manowar', 'warship': 'manowar', 'dreadnought': 'manowar'
        };
        return aliases[normalized] || 'brig';
    }

    /**
     * Build cannon weapon items from ship data
     * @param {Object} shipData - Ship data from LLM
     * @param {string} faction - Ship faction
     * @param {Object} classStats - Ship class statistics
     * @returns {Array<Object>} Array of weapon item data objects
     */
    buildCannons(shipData, faction, classStats) {
        const items = [];
        const factionCannons = ShipFactory.CANNON_TEMPLATES[faction] || ShipFactory.CANNON_TEMPLATES.shackles;

        // If LLM specified cannon configuration
        if (shipData.cannons && Array.isArray(shipData.cannons)) {
            for (const cannon of shipData.cannons) {
                const template = this.findCannonTemplate(cannon.type || cannon.name, faction);
                if (template) {
                    items.push(this.buildCannonItem(template, cannon.quantity || 1));
                }
            }
        }

        // If no cannons specified or none found, use faction defaults
        if (items.length === 0) {
            const defaultCannon = Object.values(factionCannons)[0];
            if (defaultCannon) {
                items.push(this.buildCannonItem(defaultCannon, classStats.gunDeck));
            }
        }

        return items;
    }

    /**
     * Find a cannon template by name/type, searching the given faction first then all factions
     * @param {string} cannonName - Cannon name or type from LLM
     * @param {string} preferredFaction - Faction to search first
     * @returns {Object|null} Cannon template
     */
    findCannonTemplate(cannonName, preferredFaction) {
        const normalized = cannonName.toLowerCase();

        // Search preferred faction first
        const factionTemplates = ShipFactory.CANNON_TEMPLATES[preferredFaction] || {};
        for (const [key, template] of Object.entries(factionTemplates)) {
            if (normalized.includes(key) || normalized.includes(template.name.toLowerCase()) || template.name.toLowerCase().includes(normalized)) {
                return template;
            }
        }

        // Search all factions
        for (const [factionKey, templates] of Object.entries(ShipFactory.CANNON_TEMPLATES)) {
            for (const [key, template] of Object.entries(templates)) {
                if (normalized.includes(key) || normalized.includes(template.name.toLowerCase()) || template.name.toLowerCase().includes(normalized)) {
                    return template;
                }
            }
        }

        return null;
    }

    /**
     * Build a single cannon weapon item
     * @param {Object} template - Cannon template from CANNON_TEMPLATES
     * @param {number} quantity - Number of this cannon type
     * @returns {Object} Weapon item data
     */
    buildCannonItem(template, quantity) {
        const soundBase = 'modules/ship-combat-pf1/art/audio/cannonfire/';

        return {
            name: template.name,
            type: 'weapon',
            img: 'icons/weapons/artillery/cannon-simple.webp',
            system: {
                description: { value: `<p>${template.name} — ${template.damage} damage, range ${template.range} ft.</p>` },
                quantity: quantity,
                weight: { value: template.weight },
                price: template.price,
                equipped: true,
                carried: true,
                identified: true,
                masterwork: true,
                enh: template.magical ? 1 : null,
                cl: template.cl || 0,
                aura: template.aura ? { custom: false, school: template.aura } : { custom: false, school: '' },
                proficient: true,
                subType: 'siege',
                weaponSubtype: 'direct',
                baseTypes: ['Cannon'],
                ammo: { type: 'siege' },
                held: '1h',
                hands: 1,
                actions: [{
                    _id: foundry.utils.randomID(),
                    name: 'Attack',
                    img: 'icons/weapons/artillery/cannon-simple.webp',
                    actionType: 'rwak',
                    activation: { cost: 1, type: 'attack' },
                    duration: { units: 'inst' },
                    range: { value: String(template.range), units: 'ft', maxIncrements: 10 },
                    damage: {
                        parts: [{ formula: template.damage, types: ['bludgeoning', 'piercing'] }],
                        critParts: [],
                        nonCritParts: []
                    },
                    ability: {
                        critRange: template.crit,
                        critMult: template.critMult,
                        damageMult: null
                    },
                    soundEffect: soundBase + template.sound,
                    extraAttacks: { type: 'standard', formula: {} }
                }],
                showInQuickbar: true,
                tag: template.name.replace(/[^a-zA-Z0-9]/g, '').replace(/^(.)/, (m) => m.toLowerCase()),
                weaponGroups: { base: [] },
                material: { base: { value: 'steel', custom: false }, normal: { value: '', custom: false }, addon: [] },
                properties: {}
            }
        };
    }

    /**
     * Build ammunition loot items
     * @param {Object} shipData - Ship data from LLM
     * @param {Array} cannons - Built cannon items
     * @returns {Array<Object>} Array of ammo loot items
     */
    buildAmmunition(shipData, cannons) {
        const items = [];

        // Determine caliber from cannon names
        const calibers = new Set();
        for (const cannon of cannons) {
            const name = cannon.name.toLowerCase();
            if (name.includes('32') || name.includes('massive')) calibers.add('32');
            else if (name.includes('24')) calibers.add('24');
            else if (name.includes('18')) calibers.add('18');
            else if (name.includes('long 12') || name.includes('12')) calibers.add('12');
            else if (name.includes('9') || name.includes('hammer')) calibers.add('9');
            else calibers.add('7');
        }

        for (const caliber of calibers) {
            const defaults = ShipFactory.AMMO_DEFAULTS[caliber] || ShipFactory.AMMO_DEFAULTS['9'];

            items.push({
                name: `Round Shot ${caliber}lbs`,
                type: 'loot',
                img: 'icons/weapons/ammunition/bullets-round-gray.webp',
                system: { quantity: defaults.round, weight: { value: 0.5 }, price: 0, equipped: false, identified: true }
            });
            items.push({
                name: `Chain Shot ${caliber}lbs`,
                type: 'loot',
                img: 'icons/weapons/ammunition/bullets-round-gray.webp',
                system: { quantity: defaults.chain, weight: { value: 0.5 }, price: 0, equipped: false, identified: true }
            });
            items.push({
                name: `Grape Shot ${caliber}lbs`,
                type: 'loot',
                img: 'icons/weapons/ammunition/bullets-round-gray.webp',
                system: { quantity: defaults.grape, weight: { value: 0.5 }, price: 0, equipped: false, identified: true }
            });
        }

        return items;
    }

    /**
     * Build repair material loot items
     * @param {string} faction - Ship faction
     * @param {string} shipClass - Ship class
     * @returns {Array<Object>} Array of material loot items
     */
    buildRepairMaterials(faction, shipClass) {
        const woodType = ShipFactory.WOOD_TYPES[faction] || ShipFactory.WOOD_TYPES.default;
        const sizeMultiplier = { skiff: 0.2, sloop: 0.5, brig: 1, frigate: 1.5, galleon: 2, manowar: 3 };
        const mult = sizeMultiplier[shipClass] || 1;

        return [
            {
                name: woodType,
                type: 'loot',
                img: 'icons/commodities/wood/wood-pile-brown.webp',
                system: { quantity: Math.round(500 * mult), weight: { value: 5 }, price: 1, equipped: false, identified: true }
            },
            {
                name: 'Siltstone Slabs',
                type: 'loot',
                img: 'icons/commodities/stone/masonry-block-brown.webp',
                system: { quantity: Math.round(120000 * mult), weight: { value: 0.01 }, price: 0, equipped: false, identified: true }
            }
        ];
    }

    /**
     * Build sail equipment item
     * @param {string} shipName - Ship name
     * @param {string} shipClass - Ship class
     * @returns {Object} Sail equipment item data
     */
    buildSails(shipName, shipClass) {
        return {
            name: `${shipName} Sails`,
            type: 'equipment',
            img: 'icons/commodities/cloth/cloth-bolt-white.webp',
            system: {
                description: { value: `<p>Standard ${shipClass} rigging and sails.</p>` },
                subType: 'other',
                slot: 'slotless',
                equipmentSubtype: 'lightArmor',
                equipped: true,
                carried: true,
                identified: true,
                weight: { value: 0 },
                price: 0,
                hands: 0,
                armor: { value: 0, dex: null, acp: 0, enh: 0 }
            }
        };
    }
}
