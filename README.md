# West End - Battle Encounter Game

A React-based battle encounter game where you must defeat enemies using a radar-style targeting system.

## Game Description

This is a tactical battle game where you control a hero facing off against a cave clan. The game features:
- A radar wedge interface for targeting enemies
- Dynamic battle scenes with different enemy counts
- Health system and strategic combat
- Real-time cursor movement and timing-based gameplay

## How to Run

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   The game will automatically open at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## How to Play

1. **Objective:** Defeat all 3 enemies to win
2. **Controls:** Click when the white cursor line is near a red enemy dot
3. **Strategy:** 
   - The cursor oscillates back and forth in the radar wedge
   - Time your clicks to hit enemies when they're highlighted in green
   - Missing enemies will damage your health
   - You have 6 health points - lose them all and you're defeated

## Game Features

- **Dynamic Battle Scenes:** Different images show based on remaining enemy count
- **Flavor Text:** Contextual messages guide your strategy
- **Health System:** Visual health bar shows remaining life
- **Smooth Animations:** Cursor movement and hit feedback
- **Reset Functionality:** Start over anytime with the reset button

## Project Structure

```
west_end/
├── src/
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles with Tailwind
├── BattleEncounter.jsx  # Main game component
├── *.jpg               # Battle scene images
├── hero.png            # Player character image
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── README.md           # This file
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **SVG** - Game graphics and radar interface

Enjoy the game!


























