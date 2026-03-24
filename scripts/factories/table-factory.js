/**
 * Roll Table Factory for Spacebone Item Creator
 * Converts LLM-generated data into proper FoundryVTT RollTable documents
 *
 * @author Folken Games
 * @version 1.0.0
 */

export class TableFactory {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Create a RollTable from LLM-generated data
     * @param {Object} tableData - Raw table data from LLM
     * @param {string} tableData.name - Table name
     * @param {string} tableData.formula - Dice formula (e.g. "1d20")
     * @param {string} [tableData.description] - Table description
     * @param {Array<Object>} tableData.entries - Table entries
     * @param {number[]} tableData.entries[].range - [low, high] range for the entry
     * @param {string} tableData.entries[].text - Result text
     * @param {number} [tableData.entries[].weight] - Weight for weighted tables
     * @returns {Promise<RollTable>} Created RollTable document
     */
    async createTable(tableData) {
        try {
            const name = tableData.name || 'Unnamed Table';
            const formula = tableData.formula || '1d20';
            const description = tableData.description || '';
            const entries = tableData.entries || [];

            if (entries.length === 0) {
                console.error('Spacebone | Cannot create table with no entries');
                throw new Error('Table must have at least one entry');
            }

            // Normalize entries: fill in missing ranges if needed
            const normalizedEntries = this._normalizeEntries(entries, formula);

            // Deduplicate entries with identical ranges
            const dedupedEntries = this._deduplicateEntries(normalizedEntries);

            // Build the results array for RollTable creation
            const results = dedupedEntries.map((entry, i) => ({
                type: 0, // FOUNDRY.TABLE_RESULT_TYPES.TEXT
                text: entry.text,
                range: entry.range,
                weight: entry.weight || 1,
                drawn: false
            }));

            const table = await RollTable.create({
                name: name,
                formula: formula,
                description: description,
                displayRoll: true,
                results: results
            });

            console.log(`Spacebone | Created RollTable "${name}" with ${results.length} entries`);

            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log('Spacebone | RollTable data:', table.toObject());
            }

            return table;

        } catch (error) {
            console.error('Spacebone | Error creating RollTable:', error);
            throw error;
        }
    }

    /**
     * Normalize entries by filling in missing ranges based on the formula.
     * If entries already have valid ranges, they are returned as-is.
     * If ranges are missing, they are auto-calculated by distributing
     * the formula range evenly across entries.
     * @param {Array<Object>} entries - Raw entries from LLM
     * @param {string} formula - Dice formula (e.g. "1d20")
     * @returns {Array<Object>} Entries with guaranteed range arrays
     */
    _normalizeEntries(entries, formula) {
        // Check if all entries already have valid ranges
        const allHaveRanges = entries.every(
            e => Array.isArray(e.range) && e.range.length === 2
                && Number.isFinite(e.range[0]) && Number.isFinite(e.range[1])
        );

        if (allHaveRanges) {
            return entries.map(e => ({
                text: e.text || '',
                range: [e.range[0], e.range[1]],
                weight: e.weight || 1
            }));
        }

        // Auto-calculate ranges from formula
        const maxValue = this._getFormulaMax(formula);
        const count = entries.length;

        if (count === 0) return [];

        // Distribute the range evenly across entries
        const rangePerEntry = Math.floor(maxValue / count);
        const remainder = maxValue % count;

        let current = 1;
        return entries.map((entry, i) => {
            const low = current;
            // Give the first 'remainder' entries one extra value each
            const span = rangePerEntry + (i < remainder ? 1 : 0);
            const high = low + span - 1;
            current = high + 1;

            return {
                text: entry.text || '',
                range: [low, high],
                weight: entry.weight || 1
            };
        });
    }

    /**
     * Remove duplicate entries that share the same range.
     * Keeps the first occurrence when ranges are identical.
     * @param {Array<Object>} entries - Normalized entries
     * @returns {Array<Object>} Deduplicated entries
     */
    _deduplicateEntries(entries) {
        const seen = new Set();
        const result = [];

        for (const entry of entries) {
            const key = `${entry.range[0]}-${entry.range[1]}`;
            if (seen.has(key)) {
                console.log(`Spacebone | Skipping duplicate table entry for range [${entry.range[0]}, ${entry.range[1]}]`);
                continue;
            }
            seen.add(key);
            result.push(entry);
        }

        return result;
    }

    /**
     * Parse a dice formula to determine the maximum possible value.
     * Supports simple formulas like "1d20", "2d6", "1d100".
     * Falls back to 20 if the formula cannot be parsed.
     * @param {string} formula - Dice formula string
     * @returns {number} Maximum possible roll value
     */
    _getFormulaMax(formula) {
        if (!formula || typeof formula !== 'string') return 20;

        // Match patterns like "1d20", "2d6", "1d100"
        const match = formula.match(/^(\d+)d(\d+)$/i);
        if (match) {
            const numDice = parseInt(match[1]) || 1;
            const dieFaces = parseInt(match[2]) || 20;
            return numDice * dieFaces;
        }

        // Try evaluating with Roll if available for complex formulas
        try {
            const roll = new Roll(formula);
            if (roll.terms && roll.terms.length > 0) {
                let max = 0;
                for (const term of roll.terms) {
                    if (term.faces) {
                        max += (term.number || 1) * term.faces;
                    } else if (typeof term.number === 'number') {
                        max += term.number;
                    }
                }
                if (max > 0) return max;
            }
        } catch (e) {
            // Ignore parsing errors
        }

        return 20;
    }
}
