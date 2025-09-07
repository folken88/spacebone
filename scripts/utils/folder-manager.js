/**
 * Folder Manager for Spacebone Item Creator
 * Manages folder creation and organization for generated items
 * 
 * @author Folken Games
 * @version 1.0.0
 */

export class FolderManager {
    constructor() {
        this.moduleId = 'folken-games-spacebone';
    }

    /**
     * Ensure a folder exists for storing generated items
     * @param {string} folderName - Name of the folder to create/find
     * @returns {Promise<Folder>} The folder object
     */
    async ensureFolder(folderName) {
        // First, try to find existing folder
        let folder = game.folders.find(f => 
            f.type === "Item" && 
            f.name === folderName && 
            f.flags?.[this.moduleId]?.isSpaceboneFolder
        );

        if (folder) {
            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log(`Spacebone | Using existing folder: ${folder.name}`);
            }
            return folder;
        }

        // Create new folder if it doesn't exist
        try {
            folder = await Folder.create({
                name: folderName,
                type: "Item",
                color: "#8b5cf6", // Purple color to distinguish Spacebone folders
                parent: null,
                flags: {
                    [this.moduleId]: {
                        isSpaceboneFolder: true,
                        createdAt: Date.now(),
                        version: "1.0.0"
                    }
                }
            });

            ui.notifications.info(`Created new folder: ${folderName}`);
            
            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log(`Spacebone | Created new folder:`, folder);
            }

            return folder;

        } catch (error) {
            console.error('Spacebone | Error creating folder:', error);
            
            // Fallback: try to find any folder with the same name
            folder = game.folders.find(f => f.type === "Item" && f.name === folderName);
            
            if (folder) {
                console.warn(`Spacebone | Using existing non-Spacebone folder: ${folder.name}`);
                return folder;
            }

            throw new Error(`Failed to create or find folder: ${folderName}`);
        }
    }

    /**
     * Create a dated subfolder within the main Spacebone folder
     * @param {string} parentFolderName - Name of the parent folder
     * @param {string} subfolderName - Name of the subfolder (optional, defaults to current date)
     * @returns {Promise<Folder>} The subfolder object
     */
    async createDatedSubfolder(parentFolderName, subfolderName = null) {
        const parentFolder = await this.ensureFolder(parentFolderName);
        
        if (!subfolderName) {
            const date = new Date();
            subfolderName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        // Check if subfolder already exists
        let subfolder = game.folders.find(f => 
            f.type === "Item" && 
            f.name === subfolderName && 
            f.parent?.id === parentFolder.id
        );

        if (subfolder) {
            return subfolder;
        }

        // Create the subfolder
        try {
            subfolder = await Folder.create({
                name: subfolderName,
                type: "Item",
                color: "#a855f7", // Slightly different purple for subfolders
                parent: parentFolder.id,
                flags: {
                    [this.moduleId]: {
                        isSpaceboneSubfolder: true,
                        createdAt: Date.now(),
                        version: "1.0.0"
                    }
                }
            });

            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log(`Spacebone | Created dated subfolder: ${subfolder.name}`);
            }

            return subfolder;

        } catch (error) {
            console.error('Spacebone | Error creating subfolder:', error);
            // Fallback to parent folder
            return parentFolder;
        }
    }

    /**
     * Organize items by type within a folder
     * @param {Folder} parentFolder - The parent folder
     * @param {string} itemType - Type of items to organize
     * @returns {Promise<Folder>} The type-specific folder
     */
    async ensureTypeFolder(parentFolder, itemType) {
        const typeFolderName = this.getTypeFolderName(itemType);
        
        // Check if type folder already exists
        let typeFolder = game.folders.find(f => 
            f.type === "Item" && 
            f.name === typeFolderName && 
            f.parent?.id === parentFolder.id
        );

        if (typeFolder) {
            return typeFolder;
        }

        // Create type folder
        try {
            typeFolder = await Folder.create({
                name: typeFolderName,
                type: "Item",
                color: this.getTypeColor(itemType),
                parent: parentFolder.id,
                flags: {
                    [this.moduleId]: {
                        isSpaceboneTypeFolder: true,
                        itemType: itemType,
                        createdAt: Date.now(),
                        version: "1.0.0"
                    }
                }
            });

            if (game.settings.get(this.moduleId, 'debugMode')) {
                console.log(`Spacebone | Created type folder: ${typeFolder.name}`);
            }

            return typeFolder;

        } catch (error) {
            console.error('Spacebone | Error creating type folder:', error);
            // Fallback to parent folder
            return parentFolder;
        }
    }

    /**
     * Get the display name for item type folders
     * @param {string} itemType - The item type
     * @returns {string} Display name for the folder
     */
    getTypeFolderName(itemType) {
        const typeNames = {
            'equipment': 'Equipment & Wondrous Items',
            'weapon': 'Weapons',
            'armor': 'Armor & Shields',
            'consumable': 'Consumables',
            'loot': 'Treasure & Loot'
        };

        return typeNames[itemType] || 'Miscellaneous';
    }

    /**
     * Get color for item type folders
     * @param {string} itemType - The item type
     * @returns {string} Hex color code
     */
    getTypeColor(itemType) {
        const typeColors = {
            'equipment': "#3b82f6", // Blue
            'weapon': "#ef4444",    // Red
            'armor': "#10b981",     // Green
            'consumable': "#f59e0b", // Orange
            'loot': "#eab308"       // Yellow
        };

        return typeColors[itemType] || "#6b7280"; // Gray for miscellaneous
    }

    /**
     * Clean up empty Spacebone folders
     * @returns {Promise<number>} Number of folders cleaned up
     */
    async cleanupEmptyFolders() {
        if (!game.user.isGM) {
            console.warn('Spacebone | Only GMs can clean up folders');
            return 0;
        }

        const spaceboneFolders = game.folders.filter(f => 
            f.type === "Item" && 
            (f.flags?.[this.moduleId]?.isSpaceboneFolder || 
             f.flags?.[this.moduleId]?.isSpaceboneSubfolder ||
             f.flags?.[this.moduleId]?.isSpaceboneTypeFolder)
        );

        let cleanedCount = 0;

        for (const folder of spaceboneFolders) {
            // Check if folder is empty (no items and no non-empty subfolders)
            const items = game.items.filter(i => i.folder?.id === folder.id);
            const subfolders = game.folders.filter(f => f.parent?.id === folder.id);
            
            const hasItems = items.length > 0;
            const hasNonEmptySubfolders = subfolders.some(sf => {
                const subItems = game.items.filter(i => i.folder?.id === sf.id);
                return subItems.length > 0;
            });

            if (!hasItems && !hasNonEmptySubfolders) {
                try {
                    await folder.delete();
                    cleanedCount++;
                    console.log(`Spacebone | Cleaned up empty folder: ${folder.name}`);
                } catch (error) {
                    console.error(`Spacebone | Error deleting folder ${folder.name}:`, error);
                }
            }
        }

        if (cleanedCount > 0) {
            ui.notifications.info(`Cleaned up ${cleanedCount} empty Spacebone folders`);
        }

        return cleanedCount;
    }

    /**
     * Get statistics about Spacebone folders and items
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const spaceboneFolders = game.folders.filter(f => 
            f.type === "Item" && 
            f.flags?.[this.moduleId]
        );

        const spaceboneItems = game.items.filter(i => 
            i.flags?.[this.moduleId]?.generated
        );

        const itemsByType = spaceboneItems.reduce((acc, item) => {
            const type = item.type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        return {
            totalFolders: spaceboneFolders.length,
            totalItems: spaceboneItems.length,
            itemsByType: itemsByType,
            folders: spaceboneFolders.map(f => ({
                id: f.id,
                name: f.name,
                itemCount: game.items.filter(i => i.folder?.id === f.id).length
            }))
        };
    }
}
