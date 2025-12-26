import './style.css'
import * as nbt from 'prismarine-nbt';
import pako from 'pako';
import { Buffer } from 'buffer';

// Polyfill Buffer for the browser environment
window.Buffer = Buffer;

const treeEl = document.getElementById('nbt-tree');
const saveBtn = document.getElementById('save-btn');
const termListEl = document.getElementById('term-list');

// Global State
let currentNbtData = null;
let currentFileName = 'level.dat';
let isLittleEndian = false;
let bedrockHeader = null; // Stores the 8-byte header if found
let nbtStartOffset = 0;   // Where the NBT data starts in the original file

// --- Terminology Definition (Updated for Bedrock) ---
const TERM_DEFINITIONS = {
    'RandomSeed': {
        desc: 'The DNA of your world generation. Changing this allows you to generate same terrain in a new world.',
        type: 'Long'
    },
    'DayTime': {
        desc: 'Total ticks since world start. 24000 ticks = 1 day.',
        type: 'Long'
    },
    'allowCommands': {
        desc: 'Unlocks the ability to use /gamemode, /give, etc. (Check NocheatsEnabled too).',
        type: 'Byte (0 or 1)'
    },
    'GameType': {
        desc: 'The game mode. 0=Survival, 1=Creative, 2=Adventure, 3=Spectator.',
        type: 'Int'
    },
    'RainTime': {
        desc: 'Ticks until rain stops or starts.',
        type: 'Int'
    },
    'LevelName': {
        desc: 'The name of the world as it appears in the menu.',
        type: 'String'
    },
    'StorageVersion': {
        desc: 'Crucial. Tells Minecraft which engine version to use to read the world. DO NOT TOUCH unless you know why. (Usually 8 or 9 for modern Bedrock).',
        type: 'Int (Warning)'
    },
    'NocheatsEnabled': {
        desc: 'Unlocks the ability to use /gamemode, /give, etc.',
        type: 'Byte'
    },
    'NoeduOffer': {
        desc: 'If set to 1, it enables Chemistry and Lab tables (Education Edition features).',
        type: 'Int'
    },
    'Nospawnradius': {
        desc: 'The size of the "safe zone" at world spawn where blocks can\'t be broken by non-OPs.',
        type: 'Int'
    },
    'NetherScale': {
        desc: 'Usually 8. It means traveling 1 block in the Nether is 8 blocks in the Overworld.',
        type: 'Int'
    },
    'ConfirmedPlatformLockedContent': {
        desc: 'If this is true, the world might be locked to a specific mash-up pack or marketplace map.',
        type: 'Byte'
    },
    'Prid': {
        desc: 'A unique ID used for multiplayer/Realms identification.',
        type: 'String'
    },
    'Player': {
        desc: 'Contains the inventory, coordinates, health, and armor of the host player.',
        type: 'Compound'
    },
    'experiments': {
        desc: 'Contains flags for upcoming features (e.g. caves_and_cliffs).',
        type: 'Compound'
    },
    'flatWorldOptions': {
        desc: 'Stores the specific layer string for Superflat worlds.',
        type: 'String'
    },
    'Data': {
        desc: 'The main container for all level data (Java Edition mostly).',
        type: 'Compound'
    }
};

// --- Initialization ---
function init() {
    renderGlossary();

    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    saveBtn.addEventListener('click', handleSave);
}

// --- Logic ---

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentFileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    bedrockHeader = null;
    isLittleEndian = false;
    nbtStartOffset = 0;

    // --- Bedrock Detection Logic ---
    try {
        const potentialVersion = buffer.readInt32LE(0);
        const potentialLength = buffer.readInt32LE(4);

        if (potentialVersion > 0 && potentialVersion < 100 && potentialLength <= buffer.length - 8) {
            console.log(`Bedrock Header Detected! Version: ${potentialVersion}, Length: ${potentialLength}`);
            bedrockHeader = buffer.subarray(0, 8);
            buffer = buffer.subarray(8);
            isLittleEndian = true;
            nbtStartOffset = 8;
        }
    } catch (err) { }

    // Fallback detection
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        console.log("GZip Detected - Assuming Java Edition (Big Endian)");
        isLittleEndian = false;
    } else if (!isLittleEndian) {
        console.log("No Header, No GZip. Trying Little Endian first.");
        isLittleEndian = true;
    }

    console.log(`Parsing with LittleEndian=${isLittleEndian}`);

    nbt.parse(buffer, isLittleEndian, (err, data) => {
        if (err) {
            console.warn("First parse attempt failed. Retrying with opposite endianness...");
            isLittleEndian = !isLittleEndian;
            nbt.parse(buffer, isLittleEndian, (retryErr, retryData) => {
                if (retryErr) {
                    console.error(retryErr);
                    alert("Error parsing NBT file.");
                    return;
                }
                onParseSuccess(retryData);
            });
            return;
        }
        onParseSuccess(data);
    });
}

function onParseSuccess(data) {
    console.log("Parsed NBT:", data);
    currentNbtData = data;

    let contentToEdit = data.value;

    // Auto-drill for Java
    if (contentToEdit.Data && contentToEdit.Data.type === 'compound') {
        contentToEdit = contentToEdit.Data.value;
    }

    renderEditor(contentToEdit);
    saveBtn.disabled = false;
    saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}

function renderGlossary() {
    termListEl.innerHTML = Object.entries(TERM_DEFINITIONS).map(([key, def]) => `
        <div class="border-l-2 border-minecraft-accent pl-3">
            <span class="text-minecraft-key font-mono block">${key}</span>
            <span class="text-xs text-gray-400">${def.desc}</span>
        </div>
    `).join('');
}

function getTermDefinition(key) {
    return TERM_DEFINITIONS[key] ? TERM_DEFINITIONS[key].desc : "No definition available.";
}

// --- Render Logic (Recursive) ---

function renderEditor(data) {
    treeEl.innerHTML = '';
    const container = renderNode(data, 'root', 0);
    treeEl.appendChild(container);

    const statusEl = document.getElementById('file-status');
    if (statusEl) statusEl.textContent = `Loaded: ${currentFileName} (${isLittleEndian ? 'Bedrock/LE' : 'Java/BE'})`;
}

function renderNode(tags, path, depth) {
    const container = document.createElement('div');
    container.className = "space-y-1";

    Object.entries(tags).forEach(([key, tag]) => {
        const currentPath = `${path}.${key}`;

        if (tag.type === 'compound') {
            const wrapper = document.createElement('details');
            wrapper.className = "group border-l border-gray-700 ml-1 open:bg-transparent";
            wrapper.style.marginLeft = `${depth > 0 ? 12 : 0}px`;

            const summary = document.createElement('summary');
            summary.className = "cursor-pointer p-2 hover:bg-gray-800 text-minecraft-key font-bold select-none flex items-center gap-2";
            summary.innerHTML = `
                <span class="opacity-50 text-[10px] transition-transform group-open:rotate-90">▶</span>
                <span>${key}</span>
                <span class="text-gray-500 text-xs font-normal italic">(${Object.keys(tag.value).length} items)</span>
            `;

            wrapper.appendChild(summary);

            const childrenContainer = renderNode(tag.value, currentPath, depth + 1);
            childrenContainer.className += " pl-2 border-l border-gray-800";
            wrapper.appendChild(childrenContainer);

            container.appendChild(wrapper);
            return;
        }

        const row = createTagRow(key, tag, currentPath, depth);
        container.appendChild(row);
    });

    return container;
}

function createTagRow(key, tag, path, depth) {
    const row = document.createElement('div');
    row.className = "flex items-center justify-between p-2 hover:bg-gray-800 border-b border-gray-800/50 transition-colors";
    row.style.paddingLeft = `${depth * 16 + 8}px`;

    const info = getTermDefinition(key);

    let inputHtml = '';
    const tagType = tag.type;
    const value = tag.value;

    if (['byte', 'short', 'int', 'long', 'float', 'double'].includes(tagType)) {
        let displayVal = value;

        // Fix for [int, int] Long arrays in Bedrock
        if (Array.isArray(value) && tagType === 'long') {
            if (value.length === 2) {
                try {
                    // Reconstruct likely 64-bit value from [high, low] words
                    // Note: Depending on parsing, it might be BigEndian or LittleEndian array.
                    // Assuming prismarine-nbt output matches standard JSON repr which is [high, low].
                    const val0 = BigInt(value[0]);
                    const val1 = BigInt(value[1]);
                    // Shift high word and OR with low word (treated unsigned)
                    // If buffer was LE, prismarine might have parsed it as two LE ints?
                    // We will display raw [x, y] if unsure, but let's try a standard display.

                    // Actually, simpler to just join them for safety unless user wants editing maths.
                    // displayVal = value.join(', '); 
                    // But user specifically complained about "Nested editing coming soon" and wants editing.
                    // Let's keep it editable as comma-separated defaults for now to avoid corruption.
                    displayVal = value.join(',');
                } catch (e) {
                    displayVal = value.join(',');
                }
            } else {
                displayVal = value.join(',');
            }
        } else if (typeof value === 'bigint') {
            displayVal = value.toString();
        }

        inputHtml = `
            <input type="text" 
                   class="bg-gray-900 border border-gray-600 px-2 py-1 text-right text-minecraft-value font-mono focus:border-minecraft-accent outline-none rounded w-48 transition-all focus:w-64" 
                   value="${displayVal}" 
                   data-path="${path}"
                   placeholder="${tagType}"
                   onchange="window.updateValue('${path}', this.value, '${tagType}')">
        `;
    } else if (tagType === 'string') {
        inputHtml = `
            <input type="text" 
                   class="bg-gray-900 border border-gray-600 px-2 py-1 text-right text-yellow-300 font-mono focus:border-minecraft-accent outline-none rounded w-48 transition-all focus:w-80" 
                   value="${value}" 
                   data-path="${path}"
                   onchange="window.updateValue('${path}', this.value, 'string')">
        `;
    } else {
        inputHtml = `<span class="text-gray-500 font-mono text-xs italic">[${tagType}]</span>`;
    }

    row.innerHTML = `
        <div class="flex flex-col">
            <span class="text-minecraft-key font-mono font-bold hover:text-blue-300 transition-colors cursor-help" title="${info}">${key}</span>
            ${info !== "No definition available." ? `<span class="text-[10px] text-gray-500 truncate max-w-[200px]">${info}</span>` : ''}
        </div>
        <div>
            ${inputHtml}
        </div>
    `;

    return row;
}

// Global update function supporting paths
window.updateValue = (path, newValue, type) => {
    if (!currentNbtData) return;

    let target = currentNbtData.value;
    // Mirror the logic in onParseSuccess for root drilling
    if (target.Data && target.Data.type === 'compound') {
        target = target.Data.value;
    }

    const parts = path.split('.');
    if (parts[0] === 'root') parts.shift();

    const key = parts.pop();

    // Walk down
    for (const part of parts) {
        if (target[part] && target[part].type === 'compound') {
            target = target[part].value;
        } else {
            return;
        }
    }

    if (target[key]) {
        let val = newValue;

        if (type === 'long') {
            // Handle array input "123,456"
            if (newValue.includes(',')) {
                val = newValue.split(',').map(n => parseInt(n.trim()));
            } else {
                try { val = BigInt(newValue); } catch (e) { val = parseInt(newValue); }
            }
        } else if (['byte', 'short', 'int'].includes(type)) {
            val = parseInt(newValue);
        } else if (['float', 'double'].includes(type)) {
            val = parseFloat(newValue);
        }

        target[key].value = val;
        console.log(`Updated ${path} to`, val);
    }
};

async function handleSave() {
    if (!currentNbtData) return;
    try {
        const newNbtBuffer = nbt.writeUncompressed(currentNbtData, isLittleEndian ? 'little' : 'big');
        let finalBuffer = newNbtBuffer;

        if (bedrockHeader) {
            const newLength = newNbtBuffer.length;
            const newHeader = Buffer.alloc(8);
            bedrockHeader.copy(newHeader, 0, 0, 4);
            newHeader.writeInt32LE(newLength, 4);
            finalBuffer = Buffer.concat([newHeader, newNbtBuffer]);
        } else if (!isLittleEndian) {
            finalBuffer = Buffer.from(pako.gzip(newNbtBuffer));
        }

        const blob = new Blob([finalBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'level_edited.dat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("File Saved!");
    } catch (e) {
        console.error(e);
        alert("Failed to save: " + e.message);
    }
}

init();
