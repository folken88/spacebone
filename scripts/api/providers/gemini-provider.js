/**
 * @fileoverview Google Gemini API Provider
 * 
 * This file implements the Google Gemini API provider for Gemini 2.0 models.
 * Handles communication with Google's generative AI API.
 * 
 * @author Spacebone Development Team
 * @version 1.0.0
 * @since 2025-09-01
 */

import { BaseProvider } from './base-provider.js';

/**
 * Google Gemini API provider implementation
 * Supports Gemini 1.5 and Gemini 2.0 models
 * 
 * @class GeminiProvider
 * @extends BaseProvider
 */
export class GeminiProvider extends BaseProvider {
    /**
     * Create a new Gemini provider instance
     * @param {Object} config - Provider configuration
     */
    constructor(config) {
        super({
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            model: 'gemini-2.0-pro',
            defaultOptions: {
                temperature: 0.7,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 4000  // Increased for better item generation quality
            },
            ...config
        });
    }

    /**
     * Validate Gemini configuration
     * @returns {boolean} True if configuration is valid
     */
    validateConfiguration() {
        if (!this.config.apiKey) {
            this.debug('GeminiProvider: API key is missing. Please enter your Gemini API key in the module settings.');
            return false;
        }
        
        if (!this.config.endpoint.includes('googleapis.com')) {
            this.debug('GeminiProvider: Invalid endpoint configuration. Expected googleapis.com domain.');
            return false;
        }
        
        const validModels = this.constructor.getAvailableModels().map(m => m.id);
        if (!validModels.includes(this.config.model)) {
            this.debug(`GeminiProvider: Invalid model "${this.config.model}". Available models: ${validModels.join(', ')}`);
            return false;
        }
        
        return true;
    }

    /**
     * Generate an item using Gemini's API
     * @param {string} prompt - The user's item description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated item data
     */
    async generateItem(prompt, context = {}) {
        try {
            this.debug('Generating item with Gemini', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('Gemini provider is not properly configured');
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

            // Use proper role-based structure for better context management
            const requestData = {
                contents: [
                    {
                        role: 'user',  // Gemini API uses 'user' role for instructions
                        parts: [
                            {
                                text: systemPrompt
                            }
                        ]
                    },
                    {
                        role: 'user',
                        parts: [
                            {
                                text: userPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: this.config.defaultOptions.temperature,
                    topK: this.config.defaultOptions.topK,
                    topP: this.config.defaultOptions.topP,
                    maxOutputTokens: this.config.defaultOptions.maxOutputTokens,
                    candidateCount: 1
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_ONLY_HIGH'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_ONLY_HIGH'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_ONLY_HIGH'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_ONLY_HIGH'
                    }
                ]
            };

            const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
            
            this.debug('Sending request to Gemini', { url, requestData });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Translate common API errors to user-friendly messages
                switch (response.status) {
                    case 400:
                        throw new Error('Your prompt may contain unsafe content or be too complex. Please try a simpler description.');
                    case 401:
                        throw new Error('Invalid API key. Please check your Gemini API key in the module settings.');
                    case 403:
                        throw new Error('Access denied. Your API key may not have permission to use this model.');
                    case 429:
                        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                    case 500:
                        throw new Error('Gemini server error. Please try again in a moment.');
                    case 503:
                        throw new Error('Gemini service temporarily unavailable. Please try again later.');
                    default:
                        throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
                }
            }

            const data = await response.json();
            this.debug('Received response from Gemini', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                throw new Error('Invalid response format from Gemini');
            }

            const generatedText = data.candidates[0].content.parts[0].text;
            return this.parseResponse(generatedText);

        } catch (error) {
            this.handleError(error, 'item generation');
        }
    }

    /**
     * Test connection to Gemini API
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            this.debug('Testing Gemini connection');
            
            const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: 'Test'
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 10
                    }
                })
            });

            if (!response.ok) {
                this.debug('Connection test failed', { status: response.status });
                return false;
            }

            const data = await response.json();
            this.debug('Connection test successful', data);
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
        return 'Google Gemini';
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier
     */
    static getId() {
        return 'gemini';
    }

    /**
     * Get default configuration for Gemini
     * @returns {Object} Default configuration object
     */
    static getDefaultConfig() {
        return {
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
            model: 'gemini-2.0-pro',
            defaultOptions: {
                temperature: 0.7,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2000
            }
        };
    }

    /**
     * Get available Gemini models
     * @returns {Array<Object>} Array of model objects
     */
    static getAvailableModels() {
        return [
            {
                id: 'gemini-2.0-flash',
                name: 'Gemini 2.0 Flash',
                description: 'Fast and cost-effective, sufficient for item generation (Recommended)',
                recommended: true,
                maxTokens: 4000,
                costPer1kTokens: 0.0001
            },
            {
                id: 'gemini-2.5-pro',
                name: 'Gemini 2.5 Pro',
                description: 'Most capable Gemini for complex creations',
                recommended: false,
                maxTokens: 8000,
                costPer1kTokens: 0.007
            },
            {
                id: 'gemini-2.0-pro',
                name: 'Gemini 2.0 Pro',
                description: 'Previous generation, still capable',
                recommended: false,
                maxTokens: 4000,
                costPer1kTokens: 0.02
            }
        ];
    }

    /**
     * Build Gemini-specific system prompt
     * @param {Object} context - Generation context
     * @returns {string} System prompt optimized for Gemini models
     */
    buildSystemPrompt(context) {
        const basePrompt = super.buildSystemPrompt(context);
        
        // Add Gemini-specific instructions
        return `${basePrompt}

RESPONSE FORMAT REQUIREMENTS:
- Generate ONLY valid JSON without any markdown formatting or code blocks
- Do not include backticks, "json" labels, or any other text
- Ensure the JSON is properly formatted and parseable
- Focus on mechanical accuracy for Pathfinder 1e rules

Gemini, please create a detailed and mechanically sound Pathfinder 1e item that would enhance gameplay.`;
    }

    /**
     * Generate actor data using Gemini
     * @param {string} prompt - The user's actor description prompt
     * @param {Object} context - Additional context for generation
     * @returns {Promise<Object>} Generated actor data
     */
    async generateActor(prompt, context = {}) {
        try {
            this.debug('Generating actor with Gemini', { prompt, context });
            
            if (!this.isConfigured) {
                throw new Error('Gemini provider is not properly configured');
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

            const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FoundryVTT-Spacebone/1.0.0'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `${systemPrompt}\n\n${userPrompt}`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 4000,
                        temperature: this.config.defaultOptions.temperature || 0.7
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            this.debug('Received response from Gemini', data);

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                throw new Error('Invalid response format from Gemini');
            }

            const generatedText = data.candidates[0].content.parts[0].text;
            return this.parseActorResponse(generatedText);

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

    async _callGemini(systemPrompt, userPrompt) {
        const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
            })
        });
        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    async generateShip(prompt, context = {}) {
        if (!this.isConfigured) throw new Error('Gemini not configured');
        const text = await this._callGemini(this.buildShipPrompt(context), `Create a ship: ${prompt}\n\nUse the exact template format.`);
        const match = text.match(/=== SHIP TEMPLATE START ===([\s\S]*?)=== SHIP TEMPLATE END ===/);
        if (!match) throw new Error('Template format not followed');
        return this.parseShipTemplate(match[1].trim());
    }

    async generateTable(prompt, context = {}) {
        if (!this.isConfigured) throw new Error('Gemini not configured');
        const text = await this._callGemini(this.buildTablePrompt(context), `Create a roll table: ${prompt}\n\nUse the exact template format.`);
        const match = text.match(/=== TABLE TEMPLATE START ===([\s\S]*?)=== TABLE TEMPLATE END ===/);
        if (!match) throw new Error('Template format not followed');
        return this.parseTableTemplate(match[1].trim());
    }

    async generateClone(prompt, context = {}) {
        if (!this.isConfigured) throw new Error('Gemini not configured');
        const text = await this._callGemini(this.buildClonePrompt(context), `Apply these changes: ${prompt}\n\nUse the exact template format.`);
        const match = text.match(/=== CLONE TEMPLATE START ===([\s\S]*?)=== CLONE TEMPLATE END ===/);
        if (!match) throw new Error('Template format not followed');
        return this.parseCloneTemplate(match[1].trim());
    }
}
