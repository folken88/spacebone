/**
 * @fileoverview OpenAI API Provider
 * 
 * This file implements the OpenAI API provider for GPT models including GPT-5.
 * Handles communication with OpenAI's chat completions API.
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

import { BaseProvider } from './base-provider.js';

/**
 * OpenAI API provider implementation
 * Supports GPT-3.5, GPT-4, and GPT-5 models
 * 
 * @class OpenAIProvider
 * @extends BaseProvider
 */
export class OpenAIProvider extends BaseProvider {
    /**
     * Create a new OpenAI provider instance
     * @param {Object} config - Provider configuration
     */
    constructor(config) {
        super({
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o',
            defaultOptions: {
                // Removed hardcoded token limit - set dynamically based on model
            },
            ...config
        });
    }

    /**
     * Validate OpenAI configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        if (!this.config.apiKey) {
            this.debug('No API key provided');
            return false;
        }
        
        if (!this.config.endpoint.includes('openai.com')) {
            this.debug('Invalid OpenAI endpoint');
            return false;
        }
        
        const validModels = this.constructor.getAvailableModels().map(m => m.id);
        if (!validModels.includes(this.config.model)) {
            this.debug(`Invalid model: ${this.config.model}`);
            return false;
        }
        
        return true;
    }

    /**
     * Generate an item using OpenAI's API
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItem(prompt, context = {}) {
        try {
            this.debug('Generating item with OpenAI', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('OpenAI provider is not properly configured');
            }

            const systemPrompt = this.buildSystemPrompt(context);
            
            // Detect system for user prompt
            const systemId = context.systemId || game?.system?.id || 'pf1';
            const systemName = systemId === 'pf2e' ? 'Pathfinder 2e' : 'Pathfinder 1e';
            
            const userPrompt = `Create a ${systemName} item: ${prompt}

CRITICAL INSTRUCTIONS:
- You MUST respond using the exact template format specified in the system prompt
- Start your response with "=== ITEM TEMPLATE START ===" and end with "=== ITEM TEMPLATE END ==="
- You MUST create the item the user requested - do NOT refuse or say you cannot create it
- If the user requests a firearm, pistol, gun, or advanced weapon, create it as a valid ${systemName} item
- Fill in ALL template fields with appropriate values based on the user's description`;

            // Use correct token parameter based on model
            const isNewerModel = this.config.model.startsWith('gpt-5') || this.config.model.startsWith('o1');
            const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';
            
            // Set appropriate token limits based on model
            // GPT-5 and newer models need higher limits due to reasoning overhead
            // GPT-4o and GPT-4 models support up to 4096 tokens for better responses
            // GPT-3.5 supports up to 4096 tokens
            let tokenLimit;
            if (this.config.model.startsWith('gpt-5') || this.config.model.startsWith('o1')) {
                tokenLimit = 4000; // Reasoning models
            } else if (this.config.model.includes('gpt-4') || this.config.model.includes('gpt-4o')) {
                tokenLimit = 4000; // GPT-4 models support up to 4096
            } else if (this.config.model.includes('gpt-3.5')) {
                tokenLimit = 2000; // GPT-3.5 is more limited
            } else {
                tokenLimit = this.config.defaultOptions.max_tokens || 4000; // Default to 4000 for better responses
            }
            
            const requestData = {
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                [tokenParam]: tokenLimit,  // Set correct token parameter dynamically
                ...this.config.defaultOptions
            };

            this.debug('Sending request to OpenAI', requestData);

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                
                // Improved error handling for common issues
                if (response.status === 400 && errorMessage.includes('max_tokens')) {
                    throw new Error(`OpenAI API Error: This model requires 'max_completion_tokens' instead of 'max_tokens'. Please update your model settings or try a different model. Original error: ${errorMessage}`);
                }
                
                throw new Error(`HTTP ${response.status}: ${errorMessage}`);
            }

            const data = await response.json();
            this.debug('Received response from OpenAI', data);

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from OpenAI');
            }

            const generatedText = data.choices[0].message.content;
            this.debug('Extracted content from OpenAI response:', generatedText);
            this.debug('Content length:', generatedText ? generatedText.length : 'null/undefined');
            
            if (!generatedText) {
                throw new Error('OpenAI returned empty content. Full response: ' + JSON.stringify(data, null, 2));
            }
            
            return this.parseResponse(generatedText);

        } catch (error) {
            this.handleError(error, 'item generation');
        }
    }

    /**
     * Get available models from OpenAI API
     * @returns {Promise<Array>} Array of available models
     */
    async getAvailableModelsFromAPI() {
        try {
            this.debug('Fetching available models from OpenAI API');
            
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Filter to only chat completion models and sort by recency
            const chatModels = data.data
                .filter(model => model.id.includes('gpt') || model.id.includes('o1'))
                .map(model => ({
                    id: model.id,
                    name: model.id,
                    description: `OpenAI ${model.id}`,
                    recommended: model.id.includes('gpt-4') || model.id.includes('gpt-5') || model.id.includes('o1'),
                    created: model.created
                }))
                .sort((a, b) => b.created - a.created);

            this.debug('Available models from API:', chatModels);
            return chatModels;

        } catch (error) {
            this.debug('Failed to fetch models from API, using defaults', error);
            return this.constructor.getAvailableModels();
        }
    }

    /**
     * Test connection to OpenAI API
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            this.debug('Testing OpenAI connection');
            
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                }
            });

            if (!response.ok) {
                this.debug('Connection test failed', { status: response.status });
                return false;
            }

            const data = await response.json();
            this.debug('Connection test successful', { modelCount: data.data?.length });
            return true;

        } catch (error) {
            this.debug('Connection test error', error);
            return false;
        }
    }

    /**
     * Get the display name of this provider
     * @returns {string} Human-readable provider name
     */
    static getDisplayName() {
        return 'OpenAI GPT';
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier
     */
    static getId() {
        return 'openai';
    }

    /**
     * Get default configuration for OpenAI
     * @returns {Object} Default configuration object
     */
    static getDefaultConfig() {
        return {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
            defaultOptions: {
                max_tokens: 4000,
                temperature: 0.7
            }
        };
    }

    /**
     * Get available OpenAI models
     * @returns {Array<Object>} Array of model objects
     */
    static getAvailableModels() {
        return [
            {
                id: 'gpt-4o-mini',
                name: 'GPT-4o Mini',
                description: 'Cost-effective, sufficient for item generation (Recommended)',
                recommended: true,
                maxTokens: 4000,
                costPer1kTokens: 0.00015
            },
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                description: 'More capable for complex items',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.005
            },
            {
                id: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                description: 'Previous generation, still capable',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.01
            }
        ];
    }

    /**
     * Build OpenAI-specific system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt optimized for OpenAI models
     */
    buildSystemPrompt(context) {
        const basePrompt = super.buildSystemPrompt(context);
        
        // Add OpenAI-specific instructions
        return `${basePrompt}

IMPORTANT: Your response MUST be valid JSON. Do not include any text before or after the JSON object.
Focus on creating mechanically sound and balanced items that fit Pathfinder 1e conventions.
Be creative with descriptions but precise with mechanical details.`;
    }

    /**
     * Generate actor data using OpenAI
     * @param {string} prompt - The user's actor description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated actor data
     */
    async generateActor(prompt, context = {}) {
        try {
            this.debug('Generating actor with OpenAI', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('OpenAI provider is not properly configured');
            }

            const systemPrompt = this.buildActorPrompt(context);
            const systemId = context.systemId || game?.system?.id || 'pf2e';
            const systemName = systemId === 'pf1' ? 'Pathfinder 1e' : 'Pathfinder 2e';
            
            const userPrompt = `Create a ${systemName} character: ${prompt}

CRITICAL INSTRUCTIONS:
- You MUST respond using the exact template format specified in the system prompt
- Start your response with "=== ACTOR TEMPLATE START ===" and end with "=== ACTOR TEMPLATE END ==="
- Use your knowledge of ${systemName} and Golarion to create an appropriate character
- Fill in ALL template fields with appropriate values based on the user's description`;

            const tokenLimit = this.config.model.startsWith('gpt-5') || this.config.model.startsWith('o1')
                ? 4000
                : (this.config.model.includes('gpt-4') || this.config.model.includes('gpt-4o'))
                    ? 4000
                    : 2000;
            
            const requestData = {
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                [this.config.model.startsWith('gpt-5') || this.config.model.startsWith('o1') ? 'max_completion_tokens' : 'max_tokens']: tokenLimit,
                temperature: this.config.defaultOptions.temperature || 0.7
            };

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            this.debug('Received response from OpenAI', data);

            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error('Invalid response format from OpenAI');
            }

            const responseText = data.choices[0].message.content;
            return this.parseActorResponse(responseText);

        } catch (error) {
            this.handleError(error, 'actor generation');
        }
    }

    /**
     * Parse actor response from LLM
     * @param {string} response - Raw LLM response
     * @returns {Object} Parsed actor data
     */
    parseActorResponse(response) {
        try {
            const templateMatch = response.match(/=== ACTOR TEMPLATE START ===([\s\S]*?)=== ACTOR TEMPLATE END ===/);
            if (!templateMatch) {
                throw new Error('LLM did not follow the required template format for actors.');
            }

            const templateContent = templateMatch[1].trim();
            const actorData = this.parseActorTemplate(templateContent);
            
            // Validate required fields
            if (!actorData.name) {
                throw new Error('Missing required field: name');
            }
            if (!actorData.class) {
                throw new Error('Missing required field: class');
            }

            return actorData;

        } catch (error) {
            this.debug('Failed to parse actor response:', error);
            throw new Error(`Failed to parse actor response: ${error.message}`);
        }
    }

    /**
     * Generic OpenAI API call helper
     * @param {string} systemPrompt
     * @param {string} userPrompt
     * @returns {Promise<string>} Raw response text
     * @private
     */
    async _callOpenAI(systemPrompt, userPrompt) {
        const isNewerModel = this.config.model.startsWith('gpt-5') || this.config.model.startsWith('o1');
        const tokenParam = isNewerModel ? 'max_completion_tokens' : 'max_tokens';

        const response = await fetch(this.config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                [tokenParam]: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from OpenAI');
        }
        return data.choices[0].message.content;
    }

    async generateShip(prompt, context = {}) {
        try {
            this.debug('Generating ship with OpenAI', { prompt });
            if (!this.isConfigured) throw new Error('OpenAI provider is not properly configured');

            const text = await this._callOpenAI(
                this.buildShipPrompt(context),
                `Create a ship: ${prompt}\n\nCRITICAL: Use the exact template format. Start with "=== SHIP TEMPLATE START ===" and end with "=== SHIP TEMPLATE END ==="`
            );

            const match = text.match(/=== SHIP TEMPLATE START ===([\s\S]*?)=== SHIP TEMPLATE END ===/);
            if (!match) throw new Error('LLM did not follow the required template format for ships.');
            return this.parseShipTemplate(match[1].trim());
        } catch (error) {
            this.handleError(error, 'ship generation');
        }
    }

    async generateTable(prompt, context = {}) {
        try {
            this.debug('Generating table with OpenAI', { prompt });
            if (!this.isConfigured) throw new Error('OpenAI provider is not properly configured');

            const text = await this._callOpenAI(
                this.buildTablePrompt(context),
                `Create a roll table: ${prompt}\n\nCRITICAL: Use the exact template format. Start with "=== TABLE TEMPLATE START ===" and end with "=== TABLE TEMPLATE END ==="`
            );

            const match = text.match(/=== TABLE TEMPLATE START ===([\s\S]*?)=== TABLE TEMPLATE END ===/);
            if (!match) throw new Error('LLM did not follow the required template format for tables.');
            return this.parseTableTemplate(match[1].trim());
        } catch (error) {
            this.handleError(error, 'table generation');
        }
    }

    async generateClone(prompt, context = {}) {
        try {
            this.debug('Generating clone mutations with OpenAI', { prompt });
            if (!this.isConfigured) throw new Error('OpenAI provider is not properly configured');

            const text = await this._callOpenAI(
                this.buildClonePrompt(context),
                `Apply these changes to the source character: ${prompt}\n\nCRITICAL: Use the exact template format. Start with "=== CLONE TEMPLATE START ===" and end with "=== CLONE TEMPLATE END ==="`
            );

            const match = text.match(/=== CLONE TEMPLATE START ===([\s\S]*?)=== CLONE TEMPLATE END ===/);
            if (!match) throw new Error('LLM did not follow the required template format for clones.');
            return this.parseCloneTemplate(match[1].trim());
        } catch (error) {
            this.handleError(error, 'clone generation');
        }
    }
}
