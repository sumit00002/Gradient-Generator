document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        gradientPreview: document.getElementById('gradientPreview'),
        cssOutput: document.getElementById('cssOutput'),
        copyBtn: document.getElementById('copyBtn'),
        randomBtn: document.getElementById('randomBtn'),
        saveBtn: document.getElementById('saveBtn'),
        angleInput: document.getElementById('angle'),
        angleValue: document.getElementById('angleValue'),
        colorControls: document.getElementById('colorControls'),
        addColorBtn: document.getElementById('addColorBtn'),
        linearType: document.getElementById('linearType'),
        radialType: document.getElementById('radialType'),
        presetGradients: document.getElementById('presetGradients'),
        directionBtns: document.querySelectorAll('.direction-btn'),
        exportFormatBtns: document.querySelectorAll('.export-format'),
        toast: document.getElementById('toast'),
        historyPanel: document.getElementById('historyPanel'),
        historyToggleBtn: document.getElementById('historyToggleBtn'),
        closeHistoryBtn: document.getElementById('closeHistoryBtn'),
        savedGradients: document.getElementById('savedGradients'),
        repeatingLinear: document.getElementById('repeatingLinear'),
        repeatingRadial: document.getElementById('repeatingRadial'),
        shapeRadial: document.getElementById('shapeRadial'), // New: Shape for radial
        sizeRadial: document.getElementById('sizeRadial'),   // New: Size for radial
    };

    // State
    let state = {
        gradientType: 'linear',
        repeating: false,
        angle: 90,
        radialShape: 'circle', // circle or ellipse
        radialSize: 'closest-side', // closest-side, farthest-side, closest-corner, farthest-corner
        colorStops: [
            { id: 1, color: '#3b82f6', position: 0, opacity: 1 },
            { id: 2, color: '#8b5cf6', position: 100, opacity: 1 }
        ],
        currentFormat: 'css',
        savedGradients: JSON.parse(localStorage.getItem('savedGradients')) || []
    };

    // Initialize
    initColorControls();
    updateGradient();
    renderPresetGradients();
    renderSavedGradients();
    updateRadialControlsVisibility();

    // Event Listeners
    elements.angleInput.addEventListener('input', function() {
        state.angle = this.value;
        elements.angleValue.textContent = this.value;
        updateGradient();
    });

    elements.copyBtn.addEventListener('click', copyCSSToClipboard);
    elements.randomBtn.addEventListener('click', generateRandomGradient);
    elements.saveBtn.addEventListener('click', saveCurrentGradient);
    elements.addColorBtn.addEventListener('click', addColorStop);
    elements.linearType.addEventListener('click', () => setGradientType('linear'));
    elements.radialType.addEventListener('click', () => setGradientType('radial'));
    elements.repeatingLinear.addEventListener('change', () => { state.repeating = elements.repeatingLinear.checked; updateGradient(); });
    elements.repeatingRadial.addEventListener('change', () => { state.repeating = elements.repeatingRadial.checked; updateGradient(); });
    elements.shapeRadial.addEventListener('change', () => { state.radialShape = elements.shapeRadial.value; updateGradient(); });
    elements.sizeRadial.addEventListener('change', () => { state.radialSize = elements.sizeRadial.value; updateGradient(); });
    elements.gradientPreview.addEventListener('click', downloadAsPNG);
    elements.historyToggleBtn.addEventListener('click', toggleHistoryPanel);
    elements.closeHistoryBtn.addEventListener('click', toggleHistoryPanel);

    elements.directionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            state.angle = parseInt(this.dataset.angle);
            elements.angleInput.value = state.angle;
            elements.angleValue.textContent = state.angle;
            updateGradient();

            // Update active state
            elements.directionBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    elements.exportFormatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            state.currentFormat = this.dataset.format;
            updateGradient();

            // Update active state
            elements.exportFormatBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Functions
    function initColorControls() {
        elements.colorControls.innerHTML = '';
        state.colorStops.forEach(stop => {
            createColorControl(stop);
        });
    }

    function createColorControl(stop) {
        const control = document.createElement('div');
        control.className = 'color-picker-container mb-6 p-4 bg-gray-50 rounded-md border border-gray-200';
        control.dataset.id = stop.id;

        control.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-gray-700">Stop #${stop.id}</label>
                ${stop.id > 2 ? `<button class="delete-stop text-red-500 hover:text-red-700 text-sm" data-id="${stop.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>` : ''}
            </div>
            <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
                <div class="flex items-center">
                    <input type="color" value="${stop.color}" class="color-input w-10 h-10 cursor-pointer mr-2">
                    <input type="text" value="${stop.color}" class="color-hex px-2 py-1 border border-gray-300 rounded-md text-sm flex-grow">
                </div>
            </div>
            <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Opacity</label>
                <input type="number" min="0" max="100" value="${stop.opacity * 100}" class="opacity-input w-full px-2 py-1 border border-gray-300 rounded-md text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Position (%)</label>
                <div class="relative h-6 bg-gray-200 rounded-full mb-1">
                    <div class="absolute top-0 bottom-0 left-0 right-0 rounded-full" style="background: linear-gradient(to right, ${state.colorStops.slice().sort((a, b) => a.position - b.position).map(s => s.color).join(', ')})"></div>
                    <div class="color-stop-handle absolute top-1/2 left-${stop.position}% transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-grab shadow" style="left: ${stop.position}%;" data-id="${stop.id}"></div>
                </div>
                <input type="range" min="0" max="100" value="${stop.position}" class="position-slider w-full">
            </div>
        `;

        elements.colorControls.appendChild(control);

        // Add event listeners to the new controls
        const colorInput = control.querySelector('.color-input');
        const colorHex = control.querySelector('.color-hex');
        const opacityInput = control.querySelector('.opacity-input');
        const positionSlider = control.querySelector('.position-slider');
        const deleteBtn = control.querySelector('.delete-stop');
        const handle = control.querySelector('.color-stop-handle');

        colorInput.addEventListener('input', function() {
            const id = parseInt(control.dataset.id);
            const stop = state.colorStops.find(s => s.id === id);
            stop.color = this.value;
            colorHex.value = this.value;
            updateGradient();
        });

        colorHex.addEventListener('input', function() {
            if (isValidHex(this.value)) {
                const id = parseInt(control.dataset.id);
                const stop = state.colorStops.find(s => s.id === id);
                stop.color = normalizeHex(this.value);
                colorInput.value = stop.color;
                updateGradient();
            }
        });

        opacityInput.addEventListener('input', function() {
            const id = parseInt(control.dataset.id);
            const stop = state.colorStops.find(s => s.id === id);
            stop.opacity = parseFloat(this.value) / 100;
            updateGradient();
        });

        positionSlider.addEventListener('input', function() {
            const id = parseInt(control.dataset.id);
            const stop = state.colorStops.find(s => s.id === id);
            stop.position = parseInt(this.value);
            handle.style.left = `${this.value}%`;
            updateGradient();
        });

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                removeColorStop(id);
            });
        }

        // Make handle draggable
        makeDraggable(handle, positionSlider);
    }

    function makeDraggable(handle, slider) {
        const container = handle.parentElement.parentElement; // Go up to the container of the handle
        let isDragging = false;

        handle.addEventListener('mousedown', function(e) {
            isDragging = true;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            handle.classList.add('cursor-grabbing');
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isDragging) return;

            const containerRect = container.getBoundingClientRect();
            let pos = (e.clientX - containerRect.left) / containerRect.width;
            pos = Math.max(0, Math.min(1, pos));
            const percentage = Math.round(pos * 100);

            const id = parseInt(handle.dataset.id);
            const stop = state.colorStops.find(s => s.id === id);
            stop.position = percentage;
            handle.style.left = `${percentage}%`;
            slider.value = percentage;
            updateGradient();
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            handle.classList.remove('cursor-grabbing');
        }
    }

    function updateGradient() {
        // Sort color stops by position
        state.colorStops.sort((a, b) => a.position - b.position);

        // Generate gradient string based on type
        let gradientString;
        const stops = state.colorStops.map(stop => {
            const rgba = hexToRgba(stop.color, stop.opacity);
            return `${rgba} ${stop.position}%`;
        }).join(', ');

        if (state.gradientType === 'linear') {
            const repeating = state.repeating ? 'repeating-' : '';
            gradientString = `${repeating}linear-gradient(${state.angle}deg, ${stops})`;
        } else {
            const repeating = state.repeating ? 'repeating-' : '';
            gradientString = `${repeating}radial-gradient(${state.radialShape} ${state.radialSize}, ${stops})`;
        }

        // Update preview
        elements.gradientPreview.style.backgroundImage = gradientString;

        // Update output based on current format
        let outputText;
        switch (state.currentFormat) {
            case 'css':
                outputText = `background: ${gradientString};`;
                break;
            case 'tailwind':
                outputText = `/* Add this to your tailwind.config.js */\nmodule.exports = {\n  theme: {\n    extend: {\n      backgroundImage: {\n        'my-gradient': '${gradientString}',\n      },\n    },\n  },\n  plugins: [],\n}`;
                outputText += `\n\n/* Use it like this in your HTML/JSX */\n<div className="bg-my-gradient h-48 w-96"></div>`;
                break;
            case 'react':
                outputText = `<div style={{ background: '${gradientString}', width: '300px', height: '200px' }}></div>`;
                break;
            case 'js':
                outputText = `const element = document.getElementById('yourElementId');\nelement.style.background = '${gradientString}';`;
                break;
            default:
                outputText = `background: ${gradientString};`;
        }

        elements.cssOutput.textContent = outputText;
    }

    function copyCSSToClipboard() {
        const cssText = elements.cssOutput.textContent;

        navigator.clipboard.writeText(cssText).then(() => {
            showToast('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy');
        });
    }

    function generateRandomGradient() {
        const numStops = Math.floor(Math.random() * 3) + 2; // 2 to 4 color stops
        state.colorStops = Array.from({ length: numStops }, (_, i) => ({
            id: i + 1,
            color: getRandomColor(),
            position: Math.round((i / (numStops - 1)) * 100),
            opacity: Math.random()
        })).sort((a, b) => a.position - b.position);

        if (state.gradientType === 'linear') {
            state.angle = Math.floor(Math.random() * 360);
            elements.angleInput.value = state.angle;
            elements.angleValue.textContent = state.angle;
        }

        initColorControls();
        updateGradient();
    }

    function addColorStop() {
        const newId = state.colorStops.length > 0 ?
            Math.max(...state.colorStops.map(s => s.id)) + 1 : 1;

        let position = 50;
        if (state.colorStops.length >= 2) {
            // Find a gap to place the new stop
            state.colorStops.sort((a, b) => a.position - b.position);
            let bestGapIndex = -1;
            let maxGap = -1;
            for (let i = 0; i < state.colorStops.length - 1; i++) {
                const gap = state.colorStops[i + 1].position - state.colorStops[i].position;
                if (gap > maxGap) {
                    maxGap = gap;
                    bestGapIndex = i;
                }
            }
            if (bestGapIndex !== -1) {
                position = Math.round((state.colorStops[bestGapIndex].position + state.colorStops[bestGapIndex + 1].position) / 2);
            } else {
                position = 50;
            }
        }

        const newStop = {
            id: newId,
            color: getRandomColor(),
            position: position,
            opacity: 1
        };

        state.colorStops.push(newStop);
        initColorControls();
        updateGradient();
    }

    function removeColorStop(id) {
        if (state.colorStops.length <= 2) {
            showToast('You need at least 2 color stops');
            return;
        }

        state.colorStops = state.colorStops.filter(stop => stop.id !== id);
        initColorControls();
        updateGradient();
    }

    function setGradientType(type) {
        state.gradientType = type;

        // Update UI
        elements.linearType.classList.toggle('active', type === 'linear');
        elements.radialType.classList.toggle('active', type === 'radial');
        document.getElementById('linearControls').classList.toggle('hidden', type !== 'linear');
        document.getElementById('radialControls').classList.toggle('hidden', type !== 'radial');

        updateGradient();
    }

    function updateRadialControlsVisibility() {
        document.getElementById('linearControls').classList.toggle('hidden', state.gradientType !== 'linear');
        document.getElementById('radialControls').classList.toggle('hidden', state.gradientType !== 'radial');
    }

    function renderPresetGradients() {
        const presets = [
            { name: 'Sunset', colors: ['#FF5F6D', '#FFC371'] },
            { name: 'Ocean', colors: ['#00c6ff', '#0072ff'] },
            { name: 'Emerald', colors: ['#11998e', '#38ef7d'] },
            { name: 'Purple', colors: ['#7F00FF', '#E100FF'] },
            { name: 'Peach', colors: ['#FFD194', '#D1913C'] },
            { name: 'Mint', colors: ['#4AC29A', '#BDFFF3'] },
            { name: 'Bloody', colors: ['#f85032', '#e73827'] },
            { name: 'Deep Sea', colors: ['#2b5876', '#4e4376'] },
            { name: 'Citrus', colors: ['#FDC830', '#F37335'] }
        ];

        elements.presetGradients.innerHTML = '';

        presets.forEach((preset, index) => {
            const gradient = `linear-gradient(90deg, ${preset.colors[0]}, ${preset.colors[1]})`;

            const presetEl = document.createElement('div');
            presetEl.className = 'preset-gradient';
            presetEl.style.background = gradient;
            presetEl.title = preset.name;
            presetEl.dataset.index = index;

            presetEl.addEventListener('click', () => {
                state.colorStops = [
                    { id: 1, color: preset.colors[0], position: 0, opacity: 1 },
                    { id: 2, color: preset.colors[1], position: 100, opacity: 1 }
                ];
                state.angle = 90;
                elements.angleInput.value = 90;
                elements.angleValue.textContent = 90;

                initColorControls();
                updateGradient();
                showToast(`Loaded ${preset.name} gradient`);
            });

            elements.presetGradients.appendChild(presetEl);
        });
    }

    function saveCurrentGradient() {
        const gradient = {
            type: state.gradientType,
            repeating: state.repeating,
            angle: state.angle,
            radialShape: state.radialShape,
            radialSize: state.radialSize,
            colorStops: [...state.colorStops],
            createdAt: new Date().toISOString()
        };

        // Check if this gradient is already saved
        const isDuplicate = state.savedGradients.some(saved => {
            return JSON.stringify(saved.colorStops) === JSON.stringify(gradient.colorStops) &&
                   saved.type === gradient.type &&
                   saved.angle === gradient.angle &&
                   saved.repeating === gradient.repeating &&
                   saved.radialShape === gradient.radialShape &&
                   saved.radialSize === gradient.radialSize;
        });

        if (isDuplicate) {
            showToast('This gradient is already saved');
            return;
        }

        state.savedGradients.unshift(gradient);
        if (state.savedGradients.length > 10) {
            state.savedGradients.pop();
        }

        localStorage.setItem('savedGradients', JSON.stringify(state.savedGradients));
        renderSavedGradients();
        showToast('Gradient saved to history');
    }

    function renderSavedGradients() {
        elements.savedGradients.innerHTML = '';

        if (state.savedGradients.length === 0) {
            elements.savedGradients.innerHTML = '<p class="text-gray-500 text-center py-4">No saved gradients yet</p>';
            return;
        }

        state.savedGradients.forEach((gradient, index) => {
            const stops =  gradient.colorStops.map(stop => `${hexToRgba(stop.color, stop.opacity)} ${stop.position}%`).join(', ');
            const gradientString = gradient.type === 'linear' ?
                (gradient.repeating ? 'repeating-' : '') + `linear-gradient(${gradient.angle}deg, ${stops})` :
                (gradient.repeating ? 'repeating-' : '') + `radial-gradient(${gradient.radialShape} ${gradient.radialSize}, ${stops})`;

            const gradientEl = document.createElement('div');
            gradientEl.className = 'p-3 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer';
            gradientEl.style.background = gradientString;
            gradientEl.style.height = '60px';
            gradientEl.style.position = 'relative';

            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 rounded-lg';
            overlay.innerHTML = `
                <div class="absolute bottom-1 left-1 right-1 flex justify-between items-center text-white text-xs">
                    <span>${new Date(gradient.createdAt).toLocaleTimeString()}</span>
                    <button class="delete-saved bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center" data-index="${index}">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            `;

            gradientEl.appendChild(overlay);

            gradientEl.addEventListener('click', () => {
                loadSavedGradient(index);
            });

            elements.savedGradients.appendChild(gradientEl);
        });
    }

    function loadSavedGradient(index) {
        const gradient = state.savedGradients[index];

        state.gradientType = gradient.type;
        state.repeating = gradient.repeating;
        state.angle = gradient.angle;
        state.radialShape = gradient.radialShape;
        state.radialSize = gradient.radialSize;
        state.colorStops = gradient.colorStops.map(stop => ({...stop}));

        // Update UI
        elements.angleInput.value = state.angle;
        elements.angleValue.textContent = state.angle;
        elements.linearType.classList.toggle('active', state.gradientType === 'linear');
        elements.radialType.classList.toggle('active', state.gradientType === 'radial');
        elements.repeatingLinear.checked = state.repeating && state.gradientType === 'linear';
        elements.repeatingRadial.checked = state.repeating && state.gradientType === 'radial';
        elements.shapeRadial.value = state.radialShape;
        elements.sizeRadial.value = state.radialSize;
        updateRadialControlsVisibility();

        initColorControls();
        updateGradient();
        toggleHistoryPanel();
        showToast('Gradient loaded');
    }

    function toggleHistoryPanel() {
        elements.historyPanel.classList.toggle('translate-x-full');
    }

    function downloadAsPNG() {
        const canvas = document.createElement('canvas');
        canvas.width = elements.gradientPreview.offsetWidth;
        canvas.height = elements.gradientPreview.offsetHeight;

        const ctx = canvas.getContext('2d');
        const gradient = window.getComputedStyle(elements.gradientPreview).backgroundImage;

        // Create gradient on canvas
        if (state.gradientType === 'linear') {
            const angleRad = (state.angle - 90) * Math.PI / 180;
            const x1 = canvas.width / 2 + Math.cos(angleRad) * canvas.width / 2;
            const y1 = canvas.height / 2 + Math.sin(angleRad) * canvas.height / 2;
            const x2 = canvas.width / 2 - Math.cos(angleRad) * canvas.width / 2;
            const y2 = canvas.height / 2 - Math.sin(angleRad) * canvas.height / 2;

            const canvasGradient = ctx.createLinearGradient(x1, y1, x2, y2);
            state.colorStops.forEach(stop => {
                canvasGradient.addColorStop(stop.position / 100, hexToRgba(stop.color, stop.opacity));
            });

            ctx.fillStyle = canvasGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
             // For radial gradients
            const canvasGradient = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                0,
                canvas.width / 2,
                canvas.height / 2,
                Math.max(canvas.width, canvas.height) / 2
            );
            state.colorStops.forEach(stop => {
                canvasGradient.addColorStop(stop.position/100, hexToRgba(stop.color, stop.opacity));
            });
            ctx.fillStyle = canvasGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Download
        const link = document.createElement('a');
        link.download = 'gradient.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.classList.remove('hidden');
        elements.toast.classList.add('show');

        setTimeout(() => {
            elements.toast.classList.remove('show');
            setTimeout(() => elements.toast.classList.add('hidden'), 300);
        }, 2000);
    }

    // Utility Functions
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    function isValidHex(color) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(color);
    }

    function normalizeHex(color) {
        if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        return color;
    }

    function hexToRgba(hex, opacity = 1) {
        let r = 0, g = 0, b = 0;

        // 3 digits
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        }
        // 6 digits
        else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }

        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Handle delete saved gradients
    elements.savedGradients.addEventListener('click', function(e) {
        if (e.target.closest('.delete-saved')) {
            e.stopPropagation();
            const index = parseInt(e.target.closest('.delete-saved').dataset.index);
            state.savedGradients.splice(index, 1);
            localStorage.setItem('savedGradients', JSON.stringify(state.savedGradients));
            renderSavedGradients();
            showToast('Gradient deleted');
        }
    });
});