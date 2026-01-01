/**
 * MCP Helper Utility for Spacebone
 * Provides utilities to test and verify MCP connection and query FoundryVTT data
 * 
 * @author Folken Games
 * @version 1.0.0
 */

export class MCPHelper {
    constructor() {
        this.mcpEndpoint = 'ws://localhost:31415/foundry-mcp';
        this.isConnected = false;
        this.ws = null;
    }

    /**
     * Test MCP connection
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        try {
            // Try to connect via WebSocket
            return new Promise((resolve) => {
                const ws = new WebSocket(this.mcpEndpoint);
                
                ws.onopen = () => {
                    console.log('Spacebone | MCP connection successful');
                    this.isConnected = true;
                    this.ws = ws;
                    ws.close();
                    resolve(true);
                };
                
                ws.onerror = (error) => {
                    console.warn('Spacebone | MCP connection failed:', error);
                    this.isConnected = false;
                    resolve(false);
                };
                
                ws.onclose = () => {
                    this.isConnected = false;
                };
                
                // Timeout after 2 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        console.warn('Spacebone | MCP connection timeout');
                        ws.close();
                        resolve(false);
                    }
                }, 2000);
            });
        } catch (error) {
            console.warn('Spacebone | MCP connection error:', error);
            return false;
        }
    }

    /**
     * Query FoundryVTT data via MCP (if available)
     * @param {string} query - Query type (e.g., 'actors', 'items', 'compendiums')
     * @param {Object} params - Query parameters
     * @returns {Promise<Object|null>} Query result or null if MCP unavailable
     */
    async queryFoundryData(query, params = {}) {
        if (!this.isConnected) {
            const connected = await this.testConnection();
            if (!connected) {
                console.warn('Spacebone | MCP not available, cannot query FoundryVTT data');
                return null;
            }
        }

        // If MCP is available, we could use it here
        // For now, fall back to direct FoundryVTT API access
        return this.queryFoundryDirectly(query, params);
    }

    /**
     * Query FoundryVTT directly (fallback when MCP unavailable)
     * @param {string} query - Query type
     * @param {Object} params - Query parameters
     * @returns {Promise<Object|null>} Query result
     */
    async queryFoundryDirectly(query, params = {}) {
        try {
            switch (query) {
                case 'actors':
                    return this.queryActors(params);
                case 'items':
                    return this.queryItems(params);
                case 'compendiums':
                    return this.queryCompendiums(params);
                case 'pf2e-items':
                    return this.queryPF2eItems(params);
                case 'pf2e-actors':
                    return this.queryPF2eActors(params);
                default:
                    console.warn(`Spacebone | Unknown query type: ${query}`);
                    return null;
            }
        } catch (error) {
            console.error('Spacebone | Error querying FoundryVTT:', error);
            return null;
        }
    }

    /**
     * Query actors from world
     * @param {Object} params - Query parameters
     * @returns {Promise<Array>} Array of actors
     */
    async queryActors(params = {}) {
        if (!game.actors) return [];
        
        const actors = game.actors.contents || [];
        const type = params.type;
        const level = params.level;
        
        let filtered = actors;
        if (type) {
            filtered = filtered.filter(a => a.type === type);
        }
        if (level !== undefined) {
            filtered = filtered.filter(a => a.system.details?.level?.value === level);
        }
        
        return filtered.map(a => ({
            name: a.name,
            type: a.type,
            level: a.system.details?.level?.value,
            id: a.id
        }));
    }

    /**
     * Query items from world
     * @param {Object} params - Query parameters
     * @returns {Promise<Array>} Array of items
     */
    async queryItems(params = {}) {
        if (!game.items) return [];
        
        const items = game.items.contents || [];
        const type = params.type;
        
        let filtered = items;
        if (type) {
            filtered = filtered.filter(i => i.type === type);
        }
        
        return filtered.map(i => ({
            name: i.name,
            type: i.type,
            id: i.id
        }));
    }

    /**
     * Query available compendiums
     * @param {Object} params - Query parameters
     * @returns {Promise<Array>} Array of compendium info
     */
    async queryCompendiums(params = {}) {
        if (!game.packs) return [];
        
        const packs = Array.from(game.packs.values());
        const system = params.system || game.system.id;
        
        let filtered = packs;
        if (system) {
            filtered = packs.filter(p => p.metadata.packageType === 'system' || p.metadata.id?.startsWith(system));
        }
        
        return filtered.map(p => ({
            id: p.metadata.id,
            name: p.metadata.label,
            type: p.metadata.packageType,
            documentName: p.metadata.documentName
        }));
    }

    /**
     * Query PF2e items from compendiums
     * @param {Object} params - Query parameters (type, name, level)
     * @returns {Promise<Array>} Array of PF2e items
     */
    async queryPF2eItems(params = {}) {
        const results = [];
        const packNames = ['pf2e.equipment-srd', 'pf2e.equipment', 'pf2e.consumables'];
        
        for (const packName of packNames) {
            const pack = game.packs.get(packName);
            if (!pack) continue;
            
            try {
                const documents = await pack.getDocuments();
                let filtered = documents;
                
                if (params.type) {
                    filtered = filtered.filter(doc => doc.type === params.type);
                }
                if (params.name) {
                    const nameLower = params.name.toLowerCase();
                    filtered = filtered.filter(doc => doc.name.toLowerCase().includes(nameLower));
                }
                if (params.level !== undefined) {
                    filtered = filtered.filter(doc => {
                        const itemLevel = doc.system?.level?.value || 0;
                        return itemLevel <= params.level + 2;
                    });
                }
                
                results.push(...filtered.map(doc => ({
                    name: doc.name,
                    type: doc.type,
                    level: doc.system?.level?.value || 0,
                    compendium: packName,
                    id: doc.id
                })));
            } catch (error) {
                console.warn(`Spacebone | Error querying ${packName}:`, error);
            }
        }
        
        return results;
    }

    /**
     * Query PF2e actors from compendiums
     * @param {Object} params - Query parameters (type, name, level)
     * @returns {Promise<Array>} Array of PF2e actors
     */
    async queryPF2eActors(params = {}) {
        const results = [];
        const packNames = ['pf2e.ancestries', 'pf2e.ancestries-srd', 'pf2e.classes', 'pf2e.classes-srd', 'pf2e.backgrounds', 'pf2e.backgrounds-srd'];
        
        for (const packName of packNames) {
            const pack = game.packs.get(packName);
            if (!pack) continue;
            
            try {
                const documents = await pack.getDocuments();
                let filtered = documents;
                
                if (params.type) {
                    filtered = filtered.filter(doc => doc.type === params.type);
                }
                if (params.name) {
                    const nameLower = params.name.toLowerCase();
                    filtered = filtered.filter(doc => doc.name.toLowerCase().includes(nameLower));
                }
                
                results.push(...filtered.map(doc => ({
                    name: doc.name,
                    type: doc.type,
                    compendium: packName,
                    id: doc.id
                })));
            } catch (error) {
                console.warn(`Spacebone | Error querying ${packName}:`, error);
            }
        }
        
        return results;
    }

    /**
     * Verify a created actor matches expected structure
     * @param {Actor} actor - The actor to verify
     * @param {Object} expectedData - Expected actor data
     * @returns {Object} Verification result
     */
    async verifyActor(actor, expectedData = {}) {
        const result = {
            valid: true,
            issues: [],
            details: {}
        };

        if (!actor) {
            result.valid = false;
            result.issues.push('Actor is null or undefined');
            return result;
        }

        // Check name
        if (expectedData.name && actor.name !== expectedData.name) {
            result.issues.push(`Name mismatch: expected "${expectedData.name}", got "${actor.name}"`);
        }

        // Check type
        if (expectedData.type && actor.type !== expectedData.type) {
            result.issues.push(`Type mismatch: expected "${expectedData.type}", got "${actor.type}"`);
        }

        // Check level
        if (expectedData.level !== undefined) {
            const actorLevel = actor.system.details?.level?.value;
            if (actorLevel !== expectedData.level) {
                result.issues.push(`Level mismatch: expected ${expectedData.level}, got ${actorLevel}`);
            }
        }

        // Check abilities (for PCs)
        if (actor.type === 'character' && actor.system.abilities) {
            const abilities = actor.system.abilities;
            const hasAbilities = Object.values(abilities).some(abil => {
                if (abil.value !== undefined) return abil.value > 0;
                if (abil.mod !== undefined) return true;
                return false;
            });
            
            if (!hasAbilities) {
                result.valid = false;
                result.issues.push('PC actor has no ability scores set');
            }
        }

        // Check items
        const itemCount = actor.items?.size || 0;
        result.details.itemCount = itemCount;
        
        if (itemCount === 0) {
            result.issues.push('Actor has no items');
        } else {
            // Check for character creation items
            const hasAncestry = actor.items.some(i => i.type === 'ancestry');
            const hasClass = actor.items.some(i => i.type === 'class');
            const hasBackground = actor.items.some(i => i.type === 'background');
            
            if (actor.type === 'character') {
                if (!hasAncestry) result.issues.push('Missing ancestry item');
                if (!hasClass) result.issues.push('Missing class item');
                if (!hasBackground) result.issues.push('Missing background item');
            }
            
            // Check for equipment
            const hasWeapon = actor.items.some(i => i.type === 'weapon');
            const hasArmor = actor.items.some(i => i.type === 'armor');
            const hasEquipment = actor.items.some(i => i.type === 'equipment' || i.type === 'consumable');
            
            result.details.hasWeapon = hasWeapon;
            result.details.hasArmor = hasArmor;
            result.details.hasEquipment = hasEquipment;
            
            if (!hasWeapon && !hasArmor && !hasEquipment) {
                result.issues.push('Actor has no equipment items');
            }
        }

        if (result.issues.length > 0) {
            result.valid = false;
        }

        return result;
    }

    /**
     * Verify a created item matches expected structure
     * @param {Item} item - The item to verify
     * @param {Object} expectedData - Expected item data
     * @returns {Object} Verification result
     */
    async verifyItem(item, expectedData = {}) {
        const result = {
            valid: true,
            issues: [],
            details: {}
        };

        if (!item) {
            result.valid = false;
            result.issues.push('Item is null or undefined');
            return result;
        }

        // Check name
        if (expectedData.name && item.name !== expectedData.name) {
            result.issues.push(`Name mismatch: expected "${expectedData.name}", got "${item.name}"`);
        }

        // Check type
        if (expectedData.type && item.type !== expectedData.type) {
            result.issues.push(`Type mismatch: expected "${expectedData.type}", got "${item.type}"`);
        }

        // Check level (for PF2e)
        if (expectedData.level !== undefined && item.system?.level) {
            const itemLevel = item.system.level.value;
            if (itemLevel !== expectedData.level) {
                result.issues.push(`Level mismatch: expected ${expectedData.level}, got ${itemLevel}`);
            }
        }

        // Check system data exists
        if (!item.system) {
            result.valid = false;
            result.issues.push('Item has no system data');
        }

        if (result.issues.length > 0) {
            result.valid = false;
        }

        return result;
    }
}


