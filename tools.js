// Lumira - Functional Tools Implementation
class ToolManager {
    constructor() {
        this.activeModal = null;
        this.initializeTools();
    }

    initializeTools() {
        this.tools = {
            weather: new WeatherTool(),
            translator: new TranslatorTool(),
            calculator: new CalculatorTool(),
            converter: new ConverterTool(),
            stocks: new StocksTool()
        };
    }

    openTool(toolName) {
        if (this.tools[toolName]) {
            this.tools[toolName].open();
        }
    }

    closeModal() {
        if (this.activeModal) {
            this.activeModal.classList.remove('active');
            this.activeModal = null;
        }
    }
}

// Weather Tool
class WeatherTool {
    constructor() {
        this.createModal();
    }

    createModal() {
        this.modal = this.createModalElement('weather-modal', 'Weather', `
            <div class="form-group">
                <label class="form-label">Location</label>
                <div style="display: flex; gap: var(--space-2);">
                    <input type="text" class="form-input" id="weather-location" placeholder="Enter city name or use current location" style="flex: 1;">
                    <button class="btn btn-secondary" onclick="weatherTool.getCurrentLocation()" title="Use current location">
                        <i class="fas fa-location-arrow"></i>
                    </button>
                </div>
            </div>
            <button class="btn btn-primary" onclick="weatherTool.getWeather()">
                <i class="fas fa-search"></i> Get Weather
            </button>
            <div id="weather-result" class="mt-4"></div>
        `);
    }

    getCurrentLocation() {
        const resultDiv = document.getElementById('weather-result');
        const locationInput = document.getElementById('weather-location');
        
        if (!navigator.geolocation) {
            resultDiv.innerHTML = `
                <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); text-align: center;">
                    <div style="color: var(--error); margin-bottom: var(--space-2);">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p style="color: var(--text-primary);">Geolocation not supported by this browser</p>
                </div>
            `;
            return;
        }

        resultDiv.innerHTML = '<div class="loading"></div> Getting your location...';
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                try {
                    // Get location name from coordinates
                    const response = await fetch(
                        `${CONFIG.WEATHER_API_URL}/${lat},${lon}?format=j1`
                    );
                    
                    if (!response.ok) {
                        throw new Error('Unable to get location data');
                    }

                    const data = await response.json();
                    const locationName = `${data.nearest_area[0].areaName[0].value}, ${data.nearest_area[0].country[0].value}`;
                    
                    locationInput.value = locationName;
                    this.displayWeather(data);
                } catch (error) {
                    console.error('Location error:', error);
                    resultDiv.innerHTML = `
                        <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); text-align: center;">
                            <div style="color: var(--error); margin-bottom: var(--space-2);">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <p style="color: var(--text-primary);">Unable to get weather for your location</p>
                            <p style="color: var(--text-secondary); font-size: 14px;">${error.message}</p>
                        </div>
                    `;
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Location access denied';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                
                resultDiv.innerHTML = `
                    <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); text-align: center;">
                        <div style="color: var(--error); margin-bottom: var(--space-2);">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <p style="color: var(--text-primary);">Cannot access location</p>
                        <p style="color: var(--text-secondary); font-size: 14px;">${errorMessage}</p>
                    </div>
                `;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    async getWeather() {
        const location = document.getElementById('weather-location').value.trim();
        if (!location) return;

        const resultDiv = document.getElementById('weather-result');
        resultDiv.innerHTML = '<div class="loading"></div> Getting weather data...';

        try {
            // Using wttr.in free weather service
            const response = await fetch(
                `${CONFIG.WEATHER_API_URL}/${encodeURIComponent(location)}?format=j1`
            );
            
            if (!response.ok) {
                throw new Error('Weather data not found for this location');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error[0].msg || 'Invalid location');
            }
            
            this.displayWeather(data);
        } catch (error) {
            console.error('Weather API error:', error);
            resultDiv.innerHTML = `
                <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); text-align: center;">
                    <div style="color: var(--error); margin-bottom: var(--space-2);">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p style="color: var(--text-primary); margin-bottom: var(--space-1);">Weather data unavailable</p>
                    <p style="color: var(--text-secondary); font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    }

    displayWeather(data) {
        const resultDiv = document.getElementById('weather-result');
        const current = data.current_condition[0];
        const location = data.nearest_area[0];
        
        const temp = current.temp_C;
        const feelsLike = current.FeelsLikeC;
        const humidity = current.humidity;
        const description = current.weatherDesc[0].value;
        const windSpeed = current.windspeedKmph;
        const windDir = current.winddir16Point;
        
        // Weather condition icons mapping
        const weatherIcons = {
            'Sunny': '☀️',
            'Clear': '☀️',
            'Partly cloudy': '⛅',
            'Partly Cloudy': '⛅',
            'Cloudy': '☁️',
            'Overcast': '☁️',
            'Light rain': '🌦️',
            'Moderate rain': '🌧️',
            'Heavy rain': '🌧️',
            'Light snow': '🌨️',
            'Moderate snow': '❄️',
            'Heavy snow': '❄️',
            'Thunderstorm': '⛈️',
            'Fog': '🌫️',
            'Mist': '🌫️'
        };
        
        const icon = weatherIcons[description] || '🌤️';

        resultDiv.innerHTML = `
            <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); text-align: center;">
                <h3 style="color: var(--text-primary); margin-bottom: var(--space-2);">${location.areaName[0].value}, ${location.country[0].value}</h3>
                <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-2); margin-bottom: var(--space-2);">
                    <span style="font-size: 40px;">${icon}</span>
                    <span style="font-size: 32px; font-weight: 600; color: var(--text-primary);">${temp}°C</span>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: var(--space-2);">${description}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); font-size: 14px;">
                    <div>
                        <div style="color: var(--text-secondary);">Feels like</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${feelsLike}°C</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Humidity</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${humidity}%</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Wind</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${windSpeed} km/h ${windDir}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Visibility</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${current.visibility} km</div>
                    </div>
                </div>
            </div>
        `;
    }

    open() {
        toolManager.activeModal = this.modal;
        this.modal.classList.add('active');
        document.getElementById('weather-location').focus();
    }

    createModalElement(id, title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = id;
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="toolManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
}

// Translator Tool
class TranslatorTool {
    constructor() {
        this.createModal();
    }

    createModal() {
        this.modal = this.createModalElement('translator-modal', 'Translator', `
            <div class="form-group">
                <label class="form-label">From</label>
                <select class="form-select" id="translate-from">
                    <option value="auto">Auto-detect</option>
                    <option value="ar">Arabic</option>
                    <option value="bg">Bulgarian</option>
                    <option value="cs">Czech</option>
                    <option value="da">Danish</option>
                    <option value="de">German</option>
                    <option value="el">Greek</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="et">Estonian</option>
                    <option value="fi">Finnish</option>
                    <option value="fr">French</option>
                    <option value="hu">Hungarian</option>
                    <option value="id">Indonesian (Bahasa Indonesia)</option>
                    <option value="it">Italian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="lt">Lithuanian</option>
                    <option value="lv">Latvian</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="pt">Portuguese</option>
                    <option value="ro">Romanian</option>
                    <option value="ru">Russian</option>
                    <option value="sk">Slovak</option>
                    <option value="sl">Slovenian</option>
                    <option value="sv">Swedish</option>
                    <option value="th">Thai</option>
                    <option value="tr">Turkish</option>
                    <option value="uk">Ukrainian</option>
                    <option value="vi">Vietnamese</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                    <option value="zh-TW">Chinese (Traditional)</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">To</label>
                <select class="form-select" id="translate-to">
                    <option value="ar">Arabic</option>
                    <option value="bg">Bulgarian</option>
                    <option value="cs">Czech</option>
                    <option value="da">Danish</option>
                    <option value="de">German</option>
                    <option value="el">Greek</option>
                    <option value="en" selected>English</option>
                    <option value="es">Spanish</option>
                    <option value="et">Estonian</option>
                    <option value="fi">Finnish</option>
                    <option value="fr">French</option>
                    <option value="hu">Hungarian</option>
                    <option value="id">Indonesian (Bahasa Indonesia)</option>
                    <option value="it">Italian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="lt">Lithuanian</option>
                    <option value="lv">Latvian</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="pt">Portuguese</option>
                    <option value="ro">Romanian</option>
                    <option value="ru">Russian</option>
                    <option value="sk">Slovak</option>
                    <option value="sl">Slovenian</option>
                    <option value="sv">Swedish</option>
                    <option value="th">Thai</option>
                    <option value="tr">Turkish</option>
                    <option value="uk">Ukrainian</option>
                    <option value="vi">Vietnamese</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                    <option value="zh-TW">Chinese (Traditional)</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Text to translate</label>
                <textarea class="form-input" id="translate-text" rows="4" placeholder="Enter text to translate..."></textarea>
            </div>
            <button class="btn btn-primary" onclick="translatorTool.translate()">
                <i class="fas fa-language"></i> Translate
            </button>
            <div id="translation-result" class="mt-4"></div>
        `);
    }

    async translate() {
        const text = document.getElementById('translate-text').value.trim();
        const fromLang = document.getElementById('translate-from').value;
        const toLang = document.getElementById('translate-to').value;
        
        if (!text) return;

        const resultDiv = document.getElementById('translation-result');
        resultDiv.innerHTML = '<div class="loading"></div> Translating...';

        try {
            const langPair = fromLang === 'auto' ? toLang : `${fromLang}|${toLang}`;
            const response = await fetch(
                `${CONFIG.TRANSLATION_API_URL}?q=${encodeURIComponent(text)}&langpair=${langPair}`
            );
            
            const data = await response.json();
            
            if (data.responseStatus === 200) {
                this.displayTranslation(data.responseData.translatedText, data.responseData.match || 1);
            } else {
                throw new Error(data.responseDetails || 'Translation failed');
            }
        } catch (error) {
            console.error('Translation error:', error);
            resultDiv.innerHTML = `
                <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); text-align: center;">
                    <div style="color: var(--error); margin-bottom: var(--space-2);">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p style="color: var(--text-primary); margin-bottom: var(--space-1);">Translation unavailable</p>
                    <p style="color: var(--text-secondary); font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    }

    displayTranslation(translatedText, confidence) {
        const resultDiv = document.getElementById('translation-result');
        const confidencePercent = Math.round(confidence * 100);
        
        resultDiv.innerHTML = `
            <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4);">
                <div style="color: var(--text-secondary); font-size: 12px; margin-bottom: var(--space-2);">
                    Translation (${confidencePercent}% confidence)
                </div>
                <div style="color: var(--text-primary); font-size: 16px; line-height: 1.5;">
                    ${translatedText}
                </div>
            </div>
        `;
    }

    open() {
        toolManager.activeModal = this.modal;
        this.modal.classList.add('active');
        document.getElementById('translate-text').focus();
    }

    createModalElement(id, title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = id;
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="toolManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
}

// Calculator Tool
class CalculatorTool {
    constructor() {
        this.display = '0';
        this.previousValue = null;
        this.currentOperation = null;
        this.waitingForNewNumber = false;
        this.shouldResetDisplay = false;
        this.createModal();
    }

    createModal() {
        this.modal = this.createModalElement('calculator-modal', 'Calculator', `
            <div id="calculator" style="max-width: 300px; margin: 0 auto;">
                <div id="calc-display" style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-4); text-align: right; font-family: var(--font-mono); font-size: 24px; color: var(--text-primary); min-height: 60px; display: flex; align-items: center; justify-content: flex-end; overflow: hidden;">0</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2);">
                    <button class="calc-btn calc-clear" onclick="calculatorTool.allClear()">AC</button>
                    <button class="calc-btn calc-operation" onclick="calculatorTool.toggleSign()">±</button>
                    <button class="calc-btn calc-operation" onclick="calculatorTool.percentage()">%</button>
                    <button class="calc-btn calc-operation" onclick="calculatorTool.setOperation('÷')">÷</button>
                    
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('7')">7</button>
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('8')">8</button>
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('9')">9</button>
                    <button class="calc-btn calc-operation" onclick="calculatorTool.setOperation('×')">×</button>
                    
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('4')">4</button>
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('5')">5</button>
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('6')">6</button>
                    <button class="calc-btn calc-operation" onclick="calculatorTool.setOperation('-')">-</button>
                    
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('1')">1</button>
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('2')">2</button>
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputNumber('3')">3</button>
                    <button class="calc-btn calc-operation" onclick="calculatorTool.setOperation('+')">+</button>
                    
                    <button class="calc-btn calc-number" style="grid-column: span 2;" onclick="calculatorTool.inputNumber('0')">0</button>
                    <button class="calc-btn calc-number" onclick="calculatorTool.inputDecimal()">.</button>
                    <button class="calc-btn calc-equals" onclick="calculatorTool.calculate()">=</button>
                </div>
            </div>
            <style>
                .calc-btn {
                    height: 50px;
                    border: none;
                    border-radius: var(--radius-md);
                    font-size: 18px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    user-select: none;
                }
                .calc-number {
                    background: var(--bg-elevated);
                    color: var(--text-primary);
                }
                .calc-number:hover {
                    background: var(--bg-secondary);
                }
                .calc-number:active {
                    transform: scale(0.95);
                }
                .calc-operation {
                    background: var(--accent-primary);
                    color: white;
                }
                .calc-operation:hover {
                    background: var(--accent-hover);
                }
                .calc-operation:active {
                    transform: scale(0.95);
                }
                .calc-equals {
                    background: var(--success);
                    color: white;
                }
                .calc-equals:hover {
                    background: #28B946;
                }
                .calc-equals:active {
                    transform: scale(0.95);
                }
                .calc-clear {
                    background: var(--error);
                    color: white;
                }
                .calc-clear:hover {
                    background: #E5392E;
                }
                .calc-clear:active {
                    transform: scale(0.95);
                }
            </style>
        `);
    }

    updateDisplay() {
        const displayElement = document.getElementById('calc-display');
        if (displayElement) {
            // Format large numbers with commas and limit decimal places
            let displayValue = this.display;
            if (!isNaN(displayValue) && displayValue !== '') {
                const num = parseFloat(displayValue);
                if (Math.abs(num) >= 1000000000) {
                    displayValue = num.toExponential(6);
                } else if (num % 1 === 0) {
                    displayValue = num.toLocaleString();
                } else {
                    displayValue = parseFloat(num.toFixed(10)).toString();
                }
            }
            displayElement.textContent = displayValue;
        }
    }

    inputNumber(num) {
        if (this.shouldResetDisplay || this.display === '0') {
            this.display = num;
            this.shouldResetDisplay = false;
        } else {
            // Limit display length
            if (this.display.length < 12) {
                this.display += num;
            }
        }
        this.updateDisplay();
    }

    inputDecimal() {
        if (this.shouldResetDisplay) {
            this.display = '0.';
            this.shouldResetDisplay = false;
        } else if (this.display.indexOf('.') === -1) {
            this.display += '.';
        }
        this.updateDisplay();
    }

    setOperation(operation) {
        if (this.currentOperation && !this.shouldResetDisplay) {
            this.calculate();
        }
        
        this.previousValue = parseFloat(this.display);
        this.currentOperation = operation;
        this.shouldResetDisplay = true;
    }

    calculate() {
        if (this.currentOperation && this.previousValue !== null) {
            const currentValue = parseFloat(this.display);
            let result;

            try {
                switch (this.currentOperation) {
                    case '+':
                        result = this.previousValue + currentValue;
                        break;
                    case '-':
                        result = this.previousValue - currentValue;
                        break;
                    case '×':
                        result = this.previousValue * currentValue;
                        break;
                    case '÷':
                        if (currentValue === 0) {
                            this.display = 'Error';
                            this.updateDisplay();
                            this.reset();
                            return;
                        }
                        result = this.previousValue / currentValue;
                        break;
                    default:
                        return;
                }

                // Handle very large or very small numbers
                if (Math.abs(result) > 999999999999 || (Math.abs(result) < 0.000000001 && result !== 0)) {
                    this.display = result.toExponential(6);
                } else {
                    this.display = result.toString();
                }

            } catch (error) {
                this.display = 'Error';
            }

            this.previousValue = null;
            this.currentOperation = null;
            this.shouldResetDisplay = true;
            this.updateDisplay();
        }
    }

    toggleSign() {
        if (this.display !== '0') {
            if (this.display.charAt(0) === '-') {
                this.display = this.display.slice(1);
            } else {
                this.display = '-' + this.display;
            }
            this.updateDisplay();
        }
    }

    percentage() {
        const value = parseFloat(this.display);
        this.display = (value / 100).toString();
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    allClear() {
        this.display = '0';
        this.previousValue = null;
        this.currentOperation = null;
        this.shouldResetDisplay = false;
        this.updateDisplay();
    }

    reset() {
        this.previousValue = null;
        this.currentOperation = null;
        this.shouldResetDisplay = false;
    }

    open() {
        toolManager.activeModal = this.modal;
        this.modal.classList.add('active');
        this.updateDisplay();
    }

    createModalElement(id, title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = id;
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="toolManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
}

// Unit Converter Tool
class ConverterTool {
    constructor() {
        this.conversions = {
            length: {
                name: 'Length',
                units: {
                    'm': { name: 'Meters', factor: 1 },
                    'km': { name: 'Kilometers', factor: 1000 },
                    'cm': { name: 'Centimeters', factor: 0.01 },
                    'mm': { name: 'Millimeters', factor: 0.001 },
                    'ft': { name: 'Feet', factor: 0.3048 },
                    'in': { name: 'Inches', factor: 0.0254 },
                    'yd': { name: 'Yards', factor: 0.9144 },
                    'mi': { name: 'Miles', factor: 1609.34 }
                }
            },
            weight: {
                name: 'Weight',
                units: {
                    'kg': { name: 'Kilograms', factor: 1 },
                    'g': { name: 'Grams', factor: 0.001 },
                    'lb': { name: 'Pounds', factor: 0.453592 },
                    'oz': { name: 'Ounces', factor: 0.0283495 },
                    't': { name: 'Tonnes', factor: 1000 }
                }
            },
            temperature: {
                name: 'Temperature',
                special: true
            }
        };
        this.createModal();
    }

    createModal() {
        this.modal = this.createModalElement('converter-modal', 'Unit Converter', `
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="converter-category" onchange="converterTool.updateUnits()">
                    <option value="length">Length</option>
                    <option value="weight">Weight</option>
                    <option value="temperature">Temperature</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">From</label>
                <div style="display: flex; gap: var(--space-2);">
                    <input type="number" class="form-input" id="converter-from-value" placeholder="0" oninput="converterTool.convert()">
                    <select class="form-select" id="converter-from-unit" onchange="converterTool.convert()"></select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">To</label>
                <div style="display: flex; gap: var(--space-2);">
                    <input type="number" class="form-input" id="converter-to-value" readonly>
                    <select class="form-select" id="converter-to-unit" onchange="converterTool.convert()"></select>
                </div>
            </div>
        `);
        this.updateUnits();
    }

    updateUnits() {
        const category = document.getElementById('converter-category').value;
        const fromSelect = document.getElementById('converter-from-unit');
        const toSelect = document.getElementById('converter-to-unit');

        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        if (category === 'temperature') {
            const tempUnits = [
                { value: 'c', name: 'Celsius' },
                { value: 'f', name: 'Fahrenheit' },
                { value: 'k', name: 'Kelvin' }
            ];

            tempUnits.forEach(unit => {
                fromSelect.innerHTML += `<option value="${unit.value}">${unit.name}</option>`;
                toSelect.innerHTML += `<option value="${unit.value}">${unit.name}</option>`;
            });
        } else {
            const units = this.conversions[category].units;
            
            Object.keys(units).forEach(key => {
                const unit = units[key];
                fromSelect.innerHTML += `<option value="${key}">${unit.name}</option>`;
                toSelect.innerHTML += `<option value="${key}">${unit.name}</option>`;
            });
        }

        this.convert();
    }

    convert() {
        const value = parseFloat(document.getElementById('converter-from-value').value) || 0;
        const category = document.getElementById('converter-category').value;
        const fromUnit = document.getElementById('converter-from-unit').value;
        const toUnit = document.getElementById('converter-to-unit').value;

        let result;

        if (category === 'temperature') {
            result = this.convertTemperature(value, fromUnit, toUnit);
        } else {
            const fromFactor = this.conversions[category].units[fromUnit].factor;
            const toFactor = this.conversions[category].units[toUnit].factor;
            result = (value * fromFactor) / toFactor;
        }

        document.getElementById('converter-to-value').value = result.toFixed(6).replace(/\.?0+$/, '');
    }

    convertTemperature(value, from, to) {
        let celsius;

        // Convert to Celsius first
        switch (from) {
            case 'c': celsius = value; break;
            case 'f': celsius = (value - 32) * 5/9; break;
            case 'k': celsius = value - 273.15; break;
        }

        // Convert from Celsius to target
        switch (to) {
            case 'c': return celsius;
            case 'f': return celsius * 9/5 + 32;
            case 'k': return celsius + 273.15;
        }
    }

    open() {
        toolManager.activeModal = this.modal;
        this.modal.classList.add('active');
        document.getElementById('converter-from-value').focus();
    }

    createModalElement(id, title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = id;
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="toolManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
}

// Stocks Tool
class StocksTool {
    constructor() {
        this.createModal();
    }

    createModal() {
        this.modal = this.createModalElement('stocks-modal', 'Stock Tracker', `
            <div class="form-group">
                <label class="form-label">Stock Symbol</label>
                <input type="text" class="form-input" id="stock-symbol" placeholder="e.g., AAPL, GOOGL, TSLA" style="text-transform: uppercase;">
            </div>
            <button class="btn btn-primary" onclick="stocksTool.getStock()">
                <i class="fas fa-chart-line"></i> Get Stock Data
            </button>
            <div id="stock-result" class="mt-4"></div>
        `);
    }

    async getStock() {
        const symbol = document.getElementById('stock-symbol').value.trim().toUpperCase();
        if (!symbol) return;

        const resultDiv = document.getElementById('stock-result');
        resultDiv.innerHTML = '<div class="loading"></div> Getting stock data...';

        try {
            // Using Alpha Vantage API
            const response = await fetch(
                `${CONFIG.STOCK_API_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${CONFIG.STOCK_API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error('Stock API request failed');
            }

            const data = await response.json();
            
            if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
                this.displayStock(data['Global Quote']);
            } else if (data['Error Message']) {
                throw new Error('Stock symbol not found');
            } else if (data['Note']) {
                throw new Error('API rate limit exceeded. Please try again later.');
            } else {
                throw new Error('Stock data not available');
            }
        } catch (error) {
            console.error('Stock API error:', error);
            resultDiv.innerHTML = `
                <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4); text-align: center;">
                    <div style="color: var(--error); margin-bottom: var(--space-2);">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p style="color: var(--text-primary); margin-bottom: var(--space-1);">Stock data unavailable</p>
                    <p style="color: var(--text-secondary); font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    }

    displayStock(data) {
        const resultDiv = document.getElementById('stock-result');
        const symbol = data['01. symbol'];
        const price = parseFloat(data['05. price']).toFixed(2);
        const change = parseFloat(data['09. change']).toFixed(2);
        const changePercent = data['10. change percent'].replace('%', '');
        const isPositive = parseFloat(change) >= 0;

        resultDiv.innerHTML = `
            <div style="background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-4);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
                    <h3 style="color: var(--text-primary); font-size: 20px;">${symbol}</h3>
                    <div style="color: ${isPositive ? 'var(--success)' : 'var(--error)'}; font-size: 14px;">
                        ${isPositive ? '↗' : '↘'} ${change} (${changePercent})
                    </div>
                </div>
                <div style="font-size: 32px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-2);">
                    $${price}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); font-size: 14px;">
                    <div>
                        <div style="color: var(--text-secondary);">High</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${data['03. high']}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Low</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${data['04. low']}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Open</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${data['02. open']}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary);">Volume</div>
                        <div style="color: var(--text-primary); font-weight: 500;">${parseInt(data['06. volume']).toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
    }

    open() {
        toolManager.activeModal = this.modal;
        this.modal.classList.add('active');
        document.getElementById('stock-symbol').focus();
    }

    createModalElement(id, title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = id;
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="toolManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }
}

// Initialize tools when DOM is loaded
let toolManager;
let weatherTool, translatorTool, calculatorTool, converterTool, stocksTool;

document.addEventListener('DOMContentLoaded', () => {
    toolManager = new ToolManager();
    weatherTool = toolManager.tools.weather;
    translatorTool = toolManager.tools.translator;
    calculatorTool = toolManager.tools.calculator;
    converterTool = toolManager.tools.converter;
    stocksTool = toolManager.tools.stocks;

    // Close modal when clicking overlay
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            toolManager.closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && toolManager.activeModal) {
            toolManager.closeModal();
        }
    });
});