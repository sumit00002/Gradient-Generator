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
        savedGradients: document.getElementById('savedGradients')
    };

    // State
    let state = {
        gradientType: 'linear',
        angle: 90,
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
        control.className = 'color-picker-container mb-4';
        control.dataset.id = stop.id;
        
        control.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <label class="text-sm font-medium text-gray-700">Color Stop ${stop.id}</label>
                ${stop.id > 2 ? `<button class="delete-stop text-red-500 hover:text-red-700 text-sm" data-id="${stop.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>` : ''}
            </div>
            <div class="flex items-center mb-1">
                <input type="color" value="${stop.color}" class="color-input w-8 h-8 cursor-pointer mr-2">
                <input type="text" value="${stop.color}" class="color-hex px-2 py-1 border border-gray-300 rounded-md text-sm flex-grow">
                <input type="number" min="0" max="100" value="${stop.opacity * 100}" class="opacity-input ml-2 w-16 px-2 py-1 border border-gray-300 rounded-md text-sm">
            </div>
            <div class="relative mt-2 h-2 bg-gray-200 rounded-full">
                <div class="absolute top-0 bottom-0 left-0 right-0" style="background: linear-gradient(to right, ${state.colorStops[0].color}, ${state.colorStops[state.colorStops.length - 1].color})"></div>
                <div class="color-stop-handle" style="left: ${stop.position}%" data-id="${stop.id}"></div>
            </div>
            <input type="range" min="0" max="100" value="${stop.position}" class="position-slider w-full mt-2">
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
            stop.opacity = parseInt(this.value) / 100;
            updateGradient();
        });
        
        positionSlider.addEventListener('input', function() {
            const id = parseInt(control.dataset.id);
            const stop = state.colorStops.find(s => s.id === id);
            stop.position = parseInt(this.value);
            handle.style.left = `${stop.position}%`;
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
        const container = handle.parentElement;
        let isDragging = false;
        
        handle.addEventListener('mousedown', function(e) {
            isDragging = true;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
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
        }
    }

    function updateGradient() {
        // Sort color stops by position
        state.colorStops.sort((a, b) => a.position - b.position);
        
        // Generate gradient string based on type
        let gradientString;
        if (state.gradientType === 'linear') {
            gradientString = `linear-gradient(${state.angle}deg, `;
            gradientString += state.colorStops.map(stop => {
                const rgba = hexToRgba(stop.color, stop.opacity);
                return `${rgba} ${stop.position}%`;
            }).join(', ');
            gradientString += ')';
        } else {
            gradientString = `radial-gradient(circle, `;
            gradientString += state.colorStops.map(stop => {
                const rgba = hexToRgba(stop.color, stop.opacity);
                return `${rgba} ${stop.position}%`;
            }).join(', ');
            gradientString += ')';
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
                // This is a simplified version - Tailwind doesn't support dynamic gradients
                outputText = `You'll need to add this to your Tailwind config:\n\nmodule.exports = {
  theme: {
    extend: {
      backgroundImage: {
        'my-gradient': '${gradientString}'
      }
    }
  }
}`;
                break;
            case 'react':
                outputText = `<div style={{ 
  background: '${gradientString}'
}}></div>`;
                break;
            case 'js':
                outputText = `element.style.background = '${gradientString}';`;
                break;
            default:
                outputText = `background: ${gradientString};`;
        }
        
        elements.cssOutput.textContent = outputText;
        
        // Update position slider backgrounds
        document.querySelectorAll('.color-picker-container').forEach(container => {
            const gradientPreview = container.querySelector('.color-stop-handle').parentElement;
            const firstColor = state.colorStops[0].color;
            const lastColor = state.colorStops[state.colorStops.length - 1].color;
            gradientPreview.style.background = `linear-gradient(to right, ${firstColor}, ${lastColor})`;
        });
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
        // Generate random colors
        state.colorStops.forEach(stop => {
            stop.color = getRandomColor();
            stop.opacity = 1;
            if (stop.id === 1) stop.position = 0;
            else if (stop.id === state.colorStops.length) stop.position = 100;
            else stop.position = Math.floor(Math.random() * 100);
        });
        
        // Random angle for linear gradients
        if (state.gradientType === 'linear') {
            state.angle = Math.floor(Math.random() * 360);
            elements.angleInput.value = state.angle;
            elements.angleValue.textContent = state.angle;
        }
        
        // Update UI
        initColorControls();
        updateGradient();
    }

    function addColorStop() {
        const newId = state.colorStops.length > 0 ? 
            Math.max(...state.colorStops.map(s => s.id)) + 1 : 1;
        
        // Position new stop in the middle of the two surrounding stops
        let position = 50;
        if (state.colorStops.length >= 2) {
            const middleIndex = Math.floor(state.colorStops.length / 2);
            const prevPos = state.colorStops[middleIndex - 1].position;
            const nextPos = state.colorStops[middleIndex].position;
            position = Math.round((prevPos + nextPos) / 2);
        }
        
        const newStop = {
            id: newId,
            color: getRandomColor(),
            position: position,
            opacity: 1
        };
        
        state.colorStops.push(newStop);
        createColorControl(newStop);
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
        
        // Disable angle for radial gradients
        elements.angleInput.disabled = type === 'radial';
        
        updateGradient();
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
            angle: state.angle,
            colorStops: [...state.colorStops],
            createdAt: new Date().toISOString()
        };
        
        // Check if this gradient is already saved
        const isDuplicate = state.savedGradients.some(saved => {
            return JSON.stringify(saved.colorStops) === JSON.stringify(gradient.colorStops) &&
                   saved.type === gradient.type &&
                   saved.angle === gradient.angle;
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
            const gradientString = gradient.type === 'linear' ?
                `linear-gradient(${gradient.angle}deg, ` +
                gradient.colorStops.map(stop => `${hexToRgba(stop.color, stop.opacity)} ${stop.position}%`).join(', ') +
                ')' :
                `radial-gradient(circle, ` +
                gradient.colorStops.map(stop => `${hexToRgba(stop.color, stop.opacity)} ${stop.position}%`).join(', ') +
                ')';
            
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
        state.angle = gradient.angle;
        state.colorStops = gradient.colorStops.map(stop => ({...stop}));
        
        // Update UI
        elements.angleInput.value = state.angle;
        elements.angleValue.textContent = state.angle;
        elements.linearType.classList.toggle('active', state.gradientType === 'linear');
        elements.radialType.classList.toggle('active', state.gradientType === 'radial');
        elements.angleInput.disabled = state.gradientType === 'radial';
        
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
            const canvasGradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
            );
            
            state.colorStops.forEach(stop => {
                canvasGradient.addColorStop(stop.position / 100, hexToRgba(stop.color, stop.opacity));
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