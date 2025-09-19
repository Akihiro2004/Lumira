// Lumira - Main Application Logic
class LumiraApp {
    constructor() {
        this.currentApiKeyIndex = 0;
        this.currentSearchMode = 'all';
        this.lastSearchResults = [];
        this.searchHistory = [];
        this.isVoiceSupported = false;
        this.recognition = null;
        this.debounceTimer = null;
        
        this.initializeApp();
    }

    async initializeApp() {
        this.setupEventListeners();
        this.initializeVoiceSearch();
        this.loadSearchHistory();
        this.loadTheme();
        
        // Focus search input
        document.getElementById('search-input').focus();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const voiceBtn = document.getElementById('voice-btn');

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });

        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        searchBtn.addEventListener('click', () => this.performSearch());
        voiceBtn.addEventListener('click', () => this.startVoiceSearch());

        // AI functionality
        const aiInput = document.getElementById('ai-input');
        const aiSendBtn = document.getElementById('ai-send-btn');

        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.askAI();
            }
        });

        aiSendBtn.addEventListener('click', () => this.askAI());

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.addEventListener('click', () => this.toggleTheme());

        // Tool cards
        document.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                const toolName = card.dataset.tool;
                toolManager.openTool(toolName);
            });
        });

        // Global shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        });
    }

    handleSearchInput(query) {
        // Debounce search suggestions
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (query.length > 1) {
                this.showSearchSuggestions(query);
            } else {
                this.hideSearchSuggestions();
            }
        }, CONFIG.UI.DEBOUNCE_DELAY);
    }

    showSearchSuggestions(query) {
        // Simple search suggestions based on history and common queries
        const suggestions = this.generateSuggestions(query);
        
        if (suggestions.length > 0) {
            this.displaySuggestions(suggestions);
        } else {
            this.hideSearchSuggestions();
        }
    }

    generateSuggestions(query) {
        const commonSuggestions = [
            'weather today',
            'latest news',
            'stock market',
            'currency converter',
            'translate text',
            'what is artificial intelligence',
            'how to learn programming',
            'best restaurants near me'
        ];

        const historyMatches = this.searchHistory.filter(item => 
            item.toLowerCase().includes(query.toLowerCase())
        );

        const commonMatches = commonSuggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(query.toLowerCase())
        );

        return [...new Set([...historyMatches, ...commonMatches])]
            .slice(0, CONFIG.APP.SEARCH_SUGGESTIONS_LIMIT);
    }

    displaySuggestions(suggestions) {
        // Create suggestions dropdown if it doesn't exist
        let dropdown = document.getElementById('search-suggestions');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'search-suggestions';
            dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-top: none;
                border-radius: 0 0 var(--radius-lg) var(--radius-lg);
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                max-height: 300px;
                overflow-y: auto;
            `;
            document.querySelector('.search-container').appendChild(dropdown);
        }

        dropdown.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" style="
                padding: var(--space-3) var(--space-4);
                cursor: pointer;
                transition: background var(--transition-fast);
                display: flex;
                align-items: center;
                gap: var(--space-3);
                color: var(--text-secondary);
            " onmouseover="this.style.background='var(--bg-elevated)'; this.style.color='var(--text-primary)'" 
               onmouseout="this.style.background='transparent'; this.style.color='var(--text-secondary)'"
               onclick="app.selectSuggestion('${suggestion}')">
                <i class="fas fa-search" style="color: var(--text-tertiary); font-size: 12px;"></i>
                ${suggestion}
            </div>
        `).join('');

        dropdown.style.display = 'block';
    }

    selectSuggestion(suggestion) {
        document.getElementById('search-input').value = suggestion;
        this.hideSearchSuggestions();
        this.performSearch();
    }

    hideSearchSuggestions() {
        const dropdown = document.getElementById('search-suggestions');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    async performSearch() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;

        // Add to search history
        this.addToSearchHistory(query);
        this.hideSearchSuggestions();

        // Show results layout
        document.querySelector('.results-layout').style.display = 'grid';
        document.querySelector('.tools-section').style.display = 'none';

        // Show loading state
        this.showSearchLoading();

        try {
            // Check if it's a natural language question
            if (this.isNaturalLanguageQuery(query)) {
                await this.getDirectAIResponse(query);
            }

            // Perform web search
            const results = await this.searchWeb(query);
            this.displaySearchResults(results);
            
            // Generate AI summary if we have results
            if (results && results.length > 0) {
                await this.generateAISummary(results, query);
            }

        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError('Search failed. Please try again.');
        }
    }

    isNaturalLanguageQuery(query) {
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'should', 'is', 'are', 'does', 'do'];
        const lowerQuery = query.toLowerCase();
        return questionWords.some(word => lowerQuery.startsWith(word)) || 
               lowerQuery.includes('?') || 
               lowerQuery.includes('explain') || 
               lowerQuery.includes('tell me');
    }

    async getDirectAIResponse(query) {
        try {
            const prompt = `
            Answer this question directly and comprehensively: "${query}"
            
            Provide a clear, accurate, and helpful response. Use current information when possible.
            If this is a how-to question, provide step-by-step instructions.
            Be conversational but informative.
            
            Today's date: ${new Date().toLocaleDateString()}
            `;

            const response = await this.callGeminiAPI(prompt);
            this.updateAIResponse(response, true);
        } catch (error) {
            console.error('Direct AI response error:', error);
        }
    }

    async searchWeb(query) {
        const apiKey = CONFIG.GOOGLE_API_KEYS[this.currentApiKeyIndex];
        const searchType = this.getSearchTypeParam();
        
        let url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${CONFIG.SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}${searchType}&num=${CONFIG.APP.RESULTS_PER_PAGE}`;

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 403) {
                    this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % CONFIG.GOOGLE_API_KEYS.length;
                    return this.searchWeb(query); // Retry with next API key
                }
                throw new Error(`Search API error: ${response.status}`);
            }

            const data = await response.json();
            this.lastSearchResults = data.items || [];
            return this.lastSearchResults;
            
        } catch (error) {
            console.error('Web search error:', error);
            throw error;
        }
    }

    getSearchTypeParam() {
        switch(this.currentSearchMode) {
            case 'images': return '&searchType=image';
            case 'videos': return '&searchType=video';
            case 'news': return '&tbm=nws';
            default: return '';
        }
    }

    displaySearchResults(results) {
        const container = document.getElementById('results-list');
        const countElement = document.getElementById('results-count');
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary);">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: var(--space-4); opacity: 0.5;"></i>
                    <p>No results found. Try different keywords.</p>
                </div>
            `;
            countElement.textContent = '0 results';
            return;
        }

        countElement.textContent = `${results.length} results`;

        container.innerHTML = results.map((result, index) => {
            const favicon = this.getFavicon(result.link);
            return `
                <div class="result-item" onclick="window.open('${result.link}', '_blank')">
                    <a href="${result.link}" target="_blank" class="result-title" onclick="event.stopPropagation()">
                        ${result.title}
                    </a>
                    <div class="result-url">
                        <img src="${favicon}" width="16" height="16" style="margin-right: var(--space-2); border-radius: 2px;" onerror="this.style.display='none'">
                        ${result.displayLink}
                    </div>
                    <div class="result-description">${result.snippet}</div>
                </div>
            `;
        }).join('');
    }

    getFavicon(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23666"/></svg>';
        }
    }

    async generateAISummary(results, query) {
        this.updateAIResponse('<div class="loading"></div> Analyzing search results...', false);

        try {
            let searchContent = "";
            results.slice(0, 5).forEach((result, index) => {
                searchContent += `${index + 1}. ${result.title}\n${result.snippet}\nSource: ${result.displayLink}\n\n`;
            });

            const prompt = `
            Based on the search query: "${query}" and the following search results, provide a comprehensive summary.

            Search Results:
            ${searchContent}

            Instructions:
            1. Provide a clear, concise summary of what the search results reveal
            2. Highlight key insights and important information
            3. If there are conflicting information, mention it
            4. Suggest follow-up questions or related topics
            5. Use formatting like **bold** for emphasis
            6. Keep it conversational and helpful

            Today's date: ${new Date().toLocaleDateString()}
            `;

            const summary = await this.callGeminiAPI(prompt);
            this.updateAIResponse(summary, false);

        } catch (error) {
            console.error('AI summary error:', error);
            this.updateAIResponse('Unable to generate summary. You can ask me specific questions about the search results.', false);
        }
    }

    async askAI() {
        const question = document.getElementById('ai-input').value.trim();
        if (!question) return;

        const aiInput = document.getElementById('ai-input');
        const aiSendBtn = document.getElementById('ai-send-btn');

        // Show loading state
        aiInput.disabled = true;
        aiSendBtn.disabled = true;
        aiSendBtn.innerHTML = '<div class="loading"></div>';

        try {
            let context = "";
            if (this.lastSearchResults.length > 0) {
                context = "Recent search results context:\n";
                this.lastSearchResults.slice(0, 3).forEach((result, index) => {
                    context += `${index + 1}. ${result.title}: ${result.snippet}\n`;
                });
                context += "\n";
            }

            const prompt = `
            ${context}User question: "${question}"

            Provide a helpful, accurate, and detailed response. If the question relates to the search results above, 
            reference them. Use current information when possible.
            Be conversational, informative, and helpful. Use **bold** for emphasis.
            
            Today's date: ${new Date().toLocaleDateString()}
            `;

            const response = await this.callGeminiAPI(prompt);
            this.updateAIResponse(response, false);
            aiInput.value = '';

        } catch (error) {
            console.error('AI question error:', error);
            this.updateAIResponse('Sorry, I encountered an error. Please try asking again.', false);
        } finally {
            aiInput.disabled = false;
            aiSendBtn.disabled = false;
            aiSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            aiInput.focus();
        }
    }

    async callGeminiAPI(prompt) {
        const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    }

    updateAIResponse(content, isDirectAnswer = false) {
        const aiResponse = document.getElementById('ai-response');
        const formattedContent = this.formatAIResponse(content);
        aiResponse.innerHTML = formattedContent;
        
        if (isDirectAnswer) {
            aiResponse.style.background = 'linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(88, 86, 214, 0.1))';
            aiResponse.style.border = '1px solid var(--accent-primary)';
        } else {
            aiResponse.style.background = 'var(--bg-elevated)';
            aiResponse.style.border = '1px solid var(--border-color)';
        }
    }

    formatAIResponse(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n- /g, '\n• ')
            .replace(/\n/g, '<br>')
            .replace(/```(.*?)```/gs, '<code style="background: var(--bg-primary); padding: var(--space-2); border-radius: var(--radius-sm); display: block; margin: var(--space-2) 0; font-family: var(--font-mono);">$1</code>')
            .replace(/`(.*?)`/g, '<code style="background: var(--bg-primary); padding: 2px var(--space-1); border-radius: 3px; font-family: var(--font-mono);">$1</code>');
    }

    showSearchLoading() {
        const container = document.getElementById('results-list');
        const countElement = document.getElementById('results-count');
        
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-8);">
                <div class="loading" style="margin: 0 auto var(--space-4);"></div>
                <p style="color: var(--text-secondary);">Searching...</p>
            </div>
        `;
        countElement.textContent = 'Searching...';
    }

    showSearchError(message) {
        const container = document.getElementById('results-list');
        const countElement = document.getElementById('results-count');
        
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-8); color: var(--error);">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: var(--space-4); opacity: 0.7;"></i>
                <p>${message}</p>
            </div>
        `;
        countElement.textContent = 'Error';
    }

    // Voice Search
    initializeVoiceSearch() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.isVoiceSupported = true;
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('search-input').value = transcript;
                this.performSearch();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                document.getElementById('voice-btn').innerHTML = '<i class="fas fa-microphone"></i>';
            };

            this.recognition.onend = () => {
                document.getElementById('voice-btn').innerHTML = '<i class="fas fa-microphone"></i>';
            };
        } else {
            document.getElementById('voice-btn').style.display = 'none';
        }
    }

    startVoiceSearch() {
        if (this.recognition && this.isVoiceSupported) {
            document.getElementById('voice-btn').innerHTML = '<i class="fas fa-stop"></i>';
            this.recognition.start();
        }
    }

    // Search History
    addToSearchHistory(query) {
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        this.searchHistory.unshift(query);
        this.searchHistory = this.searchHistory.slice(0, CONFIG.APP.SEARCH_HISTORY_LIMIT);
        localStorage.setItem(CONFIG.UI.HISTORY_STORAGE_KEY, JSON.stringify(this.searchHistory));
    }

    loadSearchHistory() {
        const saved = localStorage.getItem(CONFIG.UI.HISTORY_STORAGE_KEY);
        if (saved) {
            this.searchHistory = JSON.parse(saved);
        }
    }

    // Theme Management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(CONFIG.UI.THEME_STORAGE_KEY, newTheme);
        
        const themeIcon = document.querySelector('#theme-toggle i');
        themeIcon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem(CONFIG.UI.THEME_STORAGE_KEY) || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.querySelector('#theme-toggle i');
        themeIcon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LumiraApp();
});