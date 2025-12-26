# EmandoMundus - NBT Editor 💎⛏️

**EmandoMundus** is a high-performance, client-side NBT Editor designed for **Minecraft Bedrock Edition** directly in your browser. It specializes in editing `level.dat` files with support for Deep Nested editing, Little Endian parsing, and safety features.

![Editor Preview](https://via.placeholder.com/800x400?text=EmandoMundus+Editor)

## ✨ Features

*   **Universal Support**: Auto-detects **Bedrock (Little Endian)** and **Java (Big Endian)** formats.
*   **Deep Editing**: Fully recursive tree view allows you to edit nested compounds like `Player`, `experiments`, and `abilities`.
*   **Safe Saving**:
    *   Preserves the specific Bedrock 8-byte header (Version + Length).
    *   Automatically recalculates header length to prevent world corruption.
    *   Prevents accidental double-compression on Bedrock files.
*   **Knowledge Base**: Built-in definitions for obscure tags like `NetherScale`, `RandomSeed`, and `StorageVersion`.
*   **Performance**: Built with **Vite** + **Tailwind CSS** for instant load times and 60fps UI.

## 🚀 How to Use

1.  Open the [Live Editor](https://0Jos-hua0.github.io/MineCraft_NBT_Editor/).
2.  Drag and drop your `level.dat` file.
    *   *Location (Windows):* `%localappdata%\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\minecraftWorlds`
3.  Edit values (e.g., change `GameType` to `1` for Creative).
4.  Click **Save & Download**.
5.  Replace your old `level.dat` (Always backup first!).

## 🛠️ Development

This project is built with:
*   [Vite](https://vitejs.dev/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [prismarine-nbt](https://github.com/PrismarineJS/prismarine-nbt)

### Setup
```bash
git clone https://github.com/0Jos-hua0/MineCraft_NBT_Editor.git
cd MineCraft_NBT_Editor
npm install
npm run dev
```

## ⚠️ Warning
Editing `level.dat` can corrupt your world save. **ALWAYS make a backup** of your world folder before using this tool.

---
*Created by Antigravity Agent*
