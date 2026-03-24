/**
 * PF1 Actor Clone Factory for Spacebone Item Creator
 * Deep-clones an existing actor and applies LLM-generated mutations
 *
 * @author Folken Games
 * @version 1.1.0
 */

export class PF1CloneFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Check if debug mode is on
     * @returns {boolean}
     */
    get debugMode() {
        try { return game.settings.get(this.moduleId, 'debugMode'); }
        catch { return false; }
    }

    /**
     * Log a debug message (always logs key steps, verbose data only in debug mode)
     * @param {string} msg
     * @param {any} [data]
     */
    _log(msg, data) {
        if (data !== undefined && this.debugMode) {
            console.log(`Spacebone Clone | ${msg}`, data);
        } else {
            console.log(`Spacebone Clone | ${msg}`);
        }
    }

    /**
     * Clone an existing actor and apply mutations from LLM output
     * @param {string} sourceActorId - ID of the actor to clone
     * @param {Object} mutations - Mutation data from LLM
     * @returns {Promise<Actor>} Newly created Actor document
     */
    async cloneAndMutate(sourceActorId, mutations = {}) {
        try {
            // 1. Get the source actor
            const sourceActor = game.actors.get(sourceActorId);
            if (!sourceActor) {
                throw new Error(`Source actor not found: ${sourceActorId}`);
            }

            this._log(`Cloning "${sourceActor.name}" (${sourceActorId})`);
            this._log('Mutations from LLM:', mutations);

            // 2. Deep clone the actor's full data
            const sourceObj = sourceActor.toObject();
            this._log(`Source has ${sourceObj.items?.length || 0} items, HP: ${sourceObj.system?.attributes?.hp?.value}/${sourceObj.system?.attributes?.hp?.max}`);

            const cloneData = foundry.utils.deepClone(sourceObj);

            // 3. Remove the top-level _id so Foundry generates a new one
            delete cloneData._id;

            // 4. Clean item _ids — Foundry needs fresh IDs for embedded documents
            if (cloneData.items && Array.isArray(cloneData.items)) {
                this._log(`Clone has ${cloneData.items.length} items before mutations`);
                for (const item of cloneData.items) {
                    delete item._id;
                }
            } else {
                this._log('WARNING: cloneData.items is missing or not an array!');
                cloneData.items = [];
            }

            // 5. Apply simple detail mutations (name, gender, deity, etc.)
            this._applyDetailMutations(cloneData, mutations);

            // 6. Apply race swap if specified and different
            if (mutations.race) {
                await this._applyRaceSwap(cloneData, sourceActor, mutations.race);
            }

            // 7. Update biography with personality/appearance
            if (mutations.personality || mutations.appearance) {
                this._applyBiography(cloneData, mutations);
            }

            this._log(`Final clone has ${cloneData.items.length} items`);
            if (this.debugMode) {
                this._log('Item names:', cloneData.items.map(i => `${i.type}: ${i.name}`));
            }

            // 8. Create the new actor
            const newActor = await Actor.create(cloneData, { renderSheet: true });

            if (newActor) {
                this._log(`SUCCESS: Created "${newActor.name}" (${newActor.id}) with ${newActor.items.size} items`);
            } else {
                this._log('ERROR: Actor.create returned null');
            }

            return newActor;

        } catch (error) {
            console.error('Spacebone Clone | Error:', error);
            throw error;
        }
    }

    /**
     * Apply simple detail field mutations to the clone data
     * @param {Object} cloneData - Mutable clone data object
     * @param {Object} mutations - LLM mutation data
     */
    _applyDetailMutations(cloneData, mutations) {
        if (mutations.name) {
            cloneData.name = mutations.name;
            this._log(`Name: "${mutations.name}"`);
        }

        // Ensure system.details exists
        if (!cloneData.system) cloneData.system = {};
        if (!cloneData.system.details) cloneData.system.details = {};

        const d = cloneData.system.details;

        if (mutations.gender !== undefined) d.gender = mutations.gender;
        if (mutations.deity !== undefined) d.deity = mutations.deity;
        if (mutations.alignment !== undefined) d.alignment = this._parseAlignment(mutations.alignment);
        if (mutations.age !== undefined) d.age = String(mutations.age);
        if (mutations.height !== undefined) d.height = mutations.height;
        if (mutations.weight !== undefined) d.weight = mutations.weight;

        this._log('Applied detail mutations');
    }

    /**
     * Apply a race swap — remove old race + racial feats, add new ones from compendium
     * @param {Object} cloneData - Mutable clone data object
     * @param {Actor} sourceActor - Original source actor
     * @param {string} newRaceName - Name of the new race
     */
    async _applyRaceSwap(cloneData, sourceActor, newRaceName) {
        const currentRaceItem = sourceActor.items.find(i => i.type === 'race');
        const currentRaceName = currentRaceItem?.name || '';

        if (currentRaceName.toLowerCase() === newRaceName.toLowerCase()) {
            this._log(`Race unchanged ("${currentRaceName}"), skipping swap`);
            return;
        }

        this._log(`Race swap: "${currentRaceName}" → "${newRaceName}"`);

        const itemsBefore = cloneData.items.length;

        // Remove old race item
        cloneData.items = cloneData.items.filter(i => i.type !== 'race');
        this._log(`Removed race items: ${itemsBefore - cloneData.items.length}`);

        // Remove old racial feats (feats with subType 'racial' that reference old race)
        const racialFeatsBefore = cloneData.items.filter(i =>
            i.type === 'feat' && (i.system?.subType === 'racial' || i.system?.featType === 'racial')
        );
        if (racialFeatsBefore.length > 0) {
            this._log(`Found ${racialFeatsBefore.length} racial feats to remove:`, racialFeatsBefore.map(f => f.name));
            cloneData.items = cloneData.items.filter(i => {
                if (i.type !== 'feat') return true;
                const sub = i.system?.subType || i.system?.featType || '';
                return sub !== 'racial';
            });
        }

        // Search compendium for new race
        const newRaceItem = await this._findCompendiumRace(newRaceName);
        if (newRaceItem) {
            delete newRaceItem._id;
            cloneData.items.push(newRaceItem);
            this._log(`Added new race: "${newRaceItem.name}"`);
        } else {
            this._log(`WARNING: Race "${newRaceName}" not found in compendium!`);
        }

        // Search for racial feats for the new race
        const racialFeats = await this._findRacialFeats(newRaceName);
        if (racialFeats.length > 0) {
            for (const feat of racialFeats) {
                delete feat._id;
                cloneData.items.push(feat);
            }
            this._log(`Added ${racialFeats.length} racial feats:`, racialFeats.map(f => f.name));
        }
    }

    /**
     * Search pf1.races compendium for a race by name
     * @param {string} raceName
     * @returns {Promise<Object|null>}
     */
    async _findCompendiumRace(raceName) {
        try {
            const pack = game.packs.get('pf1.races');
            if (!pack) {
                this._log('ERROR: pf1.races compendium not found');
                return null;
            }

            const documents = await pack.getDocuments();
            this._log(`Searching ${documents.length} races for "${raceName}"`);

            // Exact match first
            let raceDoc = documents.find(d => d.name.toLowerCase() === raceName.toLowerCase());

            // Partial match fallback
            if (!raceDoc) {
                raceDoc = documents.find(d => d.name.toLowerCase().includes(raceName.toLowerCase()));
                if (raceDoc) this._log(`Partial match: "${raceDoc.name}"`);
            }

            if (!raceDoc) return null;

            return raceDoc.toObject();
        } catch (error) {
            console.error('Spacebone Clone | Error searching races:', error);
            return null;
        }
    }

    /**
     * Search for racial feats for a given race
     * @param {string} raceName
     * @returns {Promise<Array<Object>>}
     */
    async _findRacialFeats(raceName) {
        const results = [];
        const raceNameLower = raceName.toLowerCase();

        // Only search pf-content.pf-racial-traits (the main racial traits pack)
        const packIds = ['pf-content.pf-racial-traits'];

        for (const packId of packIds) {
            try {
                const pack = game.packs.get(packId);
                if (!pack) continue;

                const documents = await pack.getDocuments();
                const matches = documents.filter(d => {
                    const nameLower = d.name.toLowerCase();
                    return nameLower.includes(raceNameLower);
                });

                this._log(`Found ${matches.length} racial traits in ${packId} for "${raceName}"`);

                for (const match of matches) {
                    results.push(match.toObject());
                }
            } catch (error) {
                console.error(`Spacebone Clone | Error searching ${packId}:`, error);
            }
        }

        return results;
    }

    /**
     * Update biography with personality and appearance
     * @param {Object} cloneData
     * @param {Object} mutations
     */
    _applyBiography(cloneData, mutations) {
        if (!cloneData.system) cloneData.system = {};
        if (!cloneData.system.details) cloneData.system.details = {};
        if (!cloneData.system.details.biography) cloneData.system.details.biography = {};

        const existing = cloneData.system.details.biography.value || '';
        const parts = [];

        if (existing) parts.push(existing);
        if (mutations.appearance) parts.push(`<h3>Appearance</h3><p>${this._escapeHtml(mutations.appearance)}</p>`);
        if (mutations.personality) parts.push(`<h3>Personality</h3><p>${this._escapeHtml(mutations.personality)}</p>`);
        if (mutations.ethnicity) parts.push(`<h3>Origin</h3><p>${this._escapeHtml(mutations.ethnicity)}</p>`);

        cloneData.system.details.biography.value = parts.join('\n');
        this._log('Updated biography');
    }

    /**
     * Parse alignment abbreviation to PF1 format
     * @param {string} alignment
     * @returns {string}
     */
    _parseAlignment(alignment) {
        if (!alignment) return 'tn';
        const map = {
            'lg': 'lg', 'lawful good': 'lg',
            'ng': 'ng', 'neutral good': 'ng',
            'cg': 'cg', 'chaotic good': 'cg',
            'ln': 'ln', 'lawful neutral': 'ln',
            'tn': 'tn', 'true neutral': 'tn', 'n': 'tn', 'neutral': 'tn',
            'cn': 'cn', 'chaotic neutral': 'cn',
            'le': 'le', 'lawful evil': 'le',
            'ne': 'ne', 'neutral evil': 'ne',
            'ce': 'ce', 'chaotic evil': 'ce'
        };
        return map[alignment.toLowerCase().trim()] || alignment.toLowerCase().trim();
    }

    /**
     * Escape HTML special characters
     * @param {string} text
     * @returns {string}
     */
    _escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}
