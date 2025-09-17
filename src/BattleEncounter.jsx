import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import images
import caveClan3 from './assets/3_cave_clan.jpg';
import caveClan2 from './assets/2_cave_clan.jpg';
import caveClan1 from './assets/1_cave_clan.jpg';
import caveClan0 from './assets/0_cave_clan.jpg';
import heroImage from './assets/hero.png';

// Geometry (apex bottom-center; 0° up; + right; - left)
const ARC_DEG = 90;
const MIN_ANGLE = -ARC_DEG / 2; // -45
const MAX_ANGLE =  ARC_DEG / 2; // +45

const size   = 200;        // radar svg size
const cx     = size / 2;
const cy     = size;       // apex
const radius = size * 0.9;

// Calculate the actual bounds needed for the radar
const leftBound = cx + Math.cos(Math.PI * (90 - (-45)) / 180) * radius;  // -27.28
const rightBound = cx + Math.cos(Math.PI * (90 - 45) / 180) * radius;    // 227.28
const topBound = cy - Math.sin(Math.PI * (90 - 0) / 180) * radius;       // 20

// Adjust viewBox to include the full radar with some padding
const padding = 10;
const viewBoxX = Math.floor(leftBound) - padding;  // -37
const viewBoxY = Math.floor(topBound) - padding;   // 10
const viewBoxWidth = Math.ceil(rightBound - leftBound) + 2 * padding;  // 274
const viewBoxHeight = Math.ceil(cy - topBound) + padding;  // 190

const deg2rad = (d) => (d * Math.PI) / 180;

function polarToXY(angleDeg, rFrac) {
  const a = deg2rad(90 - angleDeg);     // SVG y+ is down
  return { x: cx + Math.cos(a) * radius * rFrac,
           y: cy - Math.sin(a) * radius * rFrac };
}

function wedgePath(startDeg, endDeg) {
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const left  = polarToXY(startDeg, 1);
  const right = polarToXY(endDeg, 1);
  // apex -> left edge -> ARC across TOP (sweep=1) -> back to apex
  return `M ${cx} ${cy} L ${left.x} ${left.y} A ${radius} ${radius} 0 ${largeArc} 1 ${right.x} ${right.y} Z`;
}

function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const BattleEncounter = () => {
  // Game state
  const [enemies, setEnemies] = useState(3);
  const [health, setHealth] = useState(6);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'victory', 'defeat'
  const [cursorAngle, setCursorAngle] = useState(MIN_ANGLE);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastMissTime, setLastMissTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hitFeedback, setHitFeedback] = useState(null);
  const [activeEnemyIndex, setActiveEnemyIndex] = useState(0);
  const [touchingEnemies, setTouchingEnemies] = useState(new Set());
  const [poppingEnemies, setPoppingEnemies] = useState(new Set());
  const [fadingEnemies, setFadingEnemies] = useState(new Set());
  const [animatingEnemies, setAnimatingEnemies] = useState(new Set());
  const [deadEnemies, setDeadEnemies] = useState(new Set());
  const [isTouching, setIsTouching] = useState(false);
  
  // Refs
  const animationRef = useRef();
  const cursorDirectionRef = useRef(1);
  const lastClickTimeRef = useRef(0);
  
  // Configuration parameters
  const config = {
    cursorSpeed: 0.8,
    hitThreshold: 8,
    animationDuration: 300,
    enemyPositions: [
      { angle: -25, radius: 0.55 },
      { angle:  10, radius: 0.75 },
      { angle:  35, radius: 0.45 }
    ]
  };
  
  // Flavor text based on enemy count and game state
  const getFlavorText = () => {
    console.log('getFlavorText - isPaused:', isPaused, 'lastMissTime:', lastMissTime, 'hitFeedback:', hitFeedback, 'enemies:', enemies);
    
    if (isPaused && lastMissTime > 0) {
      console.log('Showing miss text');
      return "a miss. you brace for their attack";
    }
    if (hitFeedback?.type === 'hit') {
      // Show killing feedback - use the count after the kill
      const remainingEnemies = enemies - 1;
      console.log('Showing hit text, remaining enemies:', remainingEnemies);
      switch (remainingEnemies) {
        case 2: return "direct hit! the leader falls.";
        case 1: return "another one down. two to go.";
        case 0: return "that's two. just one left.";
        default: return "direct hit!";
      }
    }
    console.log('Showing default text for enemies:', enemies);
    switch (enemies) {
      case 3: return "a cave clan descends upon you — take out their leader first.";
      case 2: return "one down. two to go. hit the one flanking from the right.";
      case 1: return "that's two. just one left.";
      case 0: return "that's all of them. what did they leave?";
      default: return "";
    }
  };
  
  // Get battle image based on enemy count
  const getBattleImage = () => {
    switch (enemies) {
      case 3: return caveClan3;
      case 2: return caveClan2;
      case 1: return caveClan1;
      case 0: return caveClan0;
      default: return caveClan3;
    }
  };

  
  // Check if cursor is near an enemy
  const isCursorNearEnemy = (enemyAngle) => {
    const diff = angleDiff(cursorAngle, enemyAngle);
    const isNear = diff <= config.hitThreshold;
    console.log(`isCursorNearEnemy: cursor=${cursorAngle}, enemy=${enemyAngle}, diff=${diff}, threshold=${config.hitThreshold}, near=${isNear}`);
    return isNear;
  };
  
  // Handle enemy kill
  const killEnemy = useCallback((enemyIndex = activeEnemyIndex) => {
    if (enemies > 0) {
      // Clear any previous miss state
      setLastMissTime(0);
      // Show hit feedback
      setHitFeedback({ type: 'hit', enemyIndex: enemyIndex });
      setIsPaused(true);
      
      // Stop cursor
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Start pop animation
      console.log('Starting pop animation for enemy:', enemyIndex);
      setPoppingEnemies(prev => new Set([...prev, enemyIndex]));
      setAnimatingEnemies(prev => new Set([...prev, enemyIndex]));
      
      
      // After pop animation, start fade
      setTimeout(() => {
        setPoppingEnemies(prev => {
          const newSet = new Set(prev);
          newSet.delete(enemyIndex);
          return newSet;
        });
        console.log('Starting fade animation for enemy:', enemyIndex);
        setFadingEnemies(prev => new Set([...prev, enemyIndex]));
        
        // After fade, mark enemy as dead and resume
        setTimeout(() => {
          console.log('Marking enemy as dead:', enemyIndex);
          setDeadEnemies(prev => new Set([...prev, enemyIndex]));
          setEnemies(prev => prev - 1);
          setActiveEnemyIndex(prev => Math.min(prev, enemies - 2));
          setHitFeedback(null);
          setFadingEnemies(prev => {
            const newSet = new Set(prev);
            newSet.delete(enemyIndex);
            return newSet;
          });
          setAnimatingEnemies(prev => {
            const newSet = new Set(prev);
            newSet.delete(enemyIndex);
            return newSet;
          });
          setIsPaused(false);
          setIsAnimating(true);
          
          // Shake animation
          setTimeout(() => setIsAnimating(false), config.animationDuration);
          
          // Check for victory
          if (enemies === 1) {
            setTimeout(() => setGameState('victory'), 500);
          }
        }, 800); // Fade duration
      }, 600); // Pop duration
    }
  }, [enemies, config.animationDuration]);
  
  // Handle miss
  const handleMiss = useCallback(() => {
    setHealth(prev => Math.max(0, prev - 1));
    setLastMissTime(Date.now());
    setIsPaused(true);
    
    // Stop cursor
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Show miss feedback
    setHitFeedback({ type: 'miss' });
    
    setTimeout(() => {
      setHitFeedback(null);
      setIsPaused(false);
      
      // Check for defeat
      if (health <= 1) {
        setGameState('defeat');
      }
    }, 1000);
  }, [health]);
  
  // Handle attack (click or touch)
  const handleAttack = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 200) return; // Prevent double clicks/touches
    lastClickTimeRef.current = now;
    
    if (gameState !== 'playing' || isPaused) return;
    
    console.log('Attack detected, cursor angle:', cursorAngle);
    
    // Check if cursor is near any live enemy
    let hitEnemyIndex = -1;
    for (let i = 0; i < config.enemyPositions.length; i++) {
      // Skip dead enemies
      if (deadEnemies.has(i)) continue;
      
      const enemyAngle = config.enemyPositions[i].angle;
      const isNear = isCursorNearEnemy(enemyAngle);
      console.log(`Enemy ${i}: angle=${enemyAngle}, cursor=${cursorAngle}, near=${isNear}, dead=${deadEnemies.has(i)}`);
      if (isNear) {
        hitEnemyIndex = i;
        break;
      }
    }
    
    console.log('Hit enemy index:', hitEnemyIndex);
    
    if (hitEnemyIndex !== -1) {
      // Kill the specific enemy that was hit
      console.log('Killing enemy:', hitEnemyIndex);
      killEnemy(hitEnemyIndex);
    } else {
      // Miss - take damage
      console.log('Miss detected');
      handleMiss();
    }
  };

  // Handle click (for mouse)
  const handleClick = (e) => {
    e.preventDefault();
    handleAttack();
  };

  // Handle touch (for mobile)
  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsTouching(true);
    handleAttack();
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsTouching(false);
  };
  
  // Reset game
  const resetGame = () => {
    setEnemies(3);
    setHealth(6);
    setGameState('playing');
    setCursorAngle(MIN_ANGLE);
    setIsAnimating(false);
    setLastMissTime(0);
    setIsPaused(false);
    setHitFeedback(null);
    setActiveEnemyIndex(0);
    setTouchingEnemies(new Set());
    setPoppingEnemies(new Set());
    setFadingEnemies(new Set());
    setAnimatingEnemies(new Set());
    setDeadEnemies(new Set());
    setIsTouching(false);
    cursorDirectionRef.current = 1;
  };
  
  // Cursor animation
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    const step = () => {
      setCursorAngle(prev => {
        let next = prev + cursorDirectionRef.current * config.cursorSpeed;
        if (next >= MAX_ANGLE) { 
          next = MAX_ANGLE; 
          cursorDirectionRef.current = -1;
        }
        if (next <= MIN_ANGLE) { 
          next = MIN_ANGLE; 
          cursorDirectionRef.current = 1;
        }
        return next;
      });
      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
    return () => animationRef.current && cancelAnimationFrame(animationRef.current);
  }, [gameState, isPaused, config.cursorSpeed]);

  // Track touching enemies for highlighting only
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    
    const currentTouching = new Set();
    
    // Check which enemies the cursor is currently touching
    config.enemyPositions.forEach((enemy, i) => {
      // Skip dead enemies
      if (deadEnemies.has(i)) return;
      
      if (isCursorNearEnemy(enemy.angle)) {
        currentTouching.add(i);
      }
    });
    
    // Update currently touching enemies
    setTouchingEnemies(currentTouching);
  }, [cursorAngle, enemies, gameState, isPaused, deadEnemies]);
  
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      {/* Battle Artwork - Larger Vertical Image */}
      <div className="mb-4">
        <div 
          className="relative overflow-hidden rounded-lg"
          style={{
            filter: hitFeedback?.type === 'miss' ? 'brightness(2) saturate(0)' : 'none'
          }}
        >
          <img
            src={getBattleImage()}
            alt="Battle scene"
            className="w-80 h-80 sm:w-96 sm:h-96 object-cover"
          />
        </div>
      </div>
      
      {/* Flavor Text */}
      <div className="mb-6 text-center max-w-2xl px-4">
        <p className="text-base font-medium">
          {gameState === 'victory' ? "victory! the area is clear." : 
           gameState === 'defeat' ? "defeat. the cave clan overwhelms you." : 
           getFlavorText()}
        </p>
      </div>
      
       {/* Radar Wedge */}
       <div className="relative mb-6 w-80 sm:w-96 flex justify-center">
         <svg
           width={viewBoxWidth}
           height={viewBoxHeight}
           viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
           onClick={handleClick}
           onTouchStart={handleTouchStart}
           onTouchEnd={handleTouchEnd}
           className="cursor-pointer touch-manipulation select-none w-full max-w-sm"
           style={{ touchAction: 'manipulation' }}
         >
           {/* wedge */}
           <path
             d={wedgePath(MIN_ANGLE, MAX_ANGLE)}
             fill={isTouching ? "#4a4a4a" : "#3f3b38"}
             stroke={isTouching ? "#ffffff" : "#9a9a9a"}
             strokeWidth={isTouching ? 3 : 2}
             className="transition-all duration-150"
           />
           {/* edges */}
           {(() => {
             const leftEdge = polarToXY(MIN_ANGLE, 1);
             const rightEdge = polarToXY(MAX_ANGLE, 1);
             return (
               <>
                 <line
                   x1={cx} y1={cy}
                   x2={leftEdge.x} y2={leftEdge.y}
                   stroke="white"
                   strokeWidth={isTouching ? 3 : 2}
                   className="transition-all duration-150"
                 />
                 <line
                   x1={cx} y1={cy}
                   x2={rightEdge.x} y2={rightEdge.y}
                   stroke="white"
                   strokeWidth={isTouching ? 3 : 2}
                   className="transition-all duration-150"
                 />
               </>
             );
           })()}
           {/* enemies */}
           {config.enemyPositions.map((enemy, i) => {
             // Skip dead enemies unless they're animating
             if (deadEnemies.has(i) && !poppingEnemies.has(i) && !fadingEnemies.has(i)) {
               return null;
             }
             
             const p = polarToXY(enemy.angle, enemy.radius);
             const isTouching = touchingEnemies.has(i);
             const isPopping = poppingEnemies.has(i);
             const isFading = fadingEnemies.has(i);
             const hit = hitFeedback?.type === 'hit' && hitFeedback?.enemyIndex === i;
             
             // Debug logging
             if (isPopping || isFading) {
               console.log(`Enemy ${i}: popping=${isPopping}, fading=${isFading}, hit=${hit}`);
             }
             
             let fill = '#6B7280'; 
             if (isTouching) fill = '#10B981'; 
             if (hit || isPopping) fill = '#EF4444';
             
             const opacity = isFading ? 0 : 1;
             const scale = isPopping ? 2.0 : 1;
             
             return (
               <circle 
                 key={i} 
                 cx={p.x} 
                 cy={p.y} 
                 r={8 * scale} 
                 fill={fill} 
                 opacity={opacity}
                 className={`transition-all duration-300 ${isTouching ? 'animate-pulse' : ''} ${isPopping ? 'animate-ping' : ''}`} 
               />
             );
           })}
           {/* cursor */}
           {(() => {
             const p = polarToXY(cursorAngle, 1);
             return <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="white" strokeWidth={2} className="transition-all duration-75" />;
           })()}
         </svg>
       </div>
      
      {/* Player Info Section - Below Radar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Player Avatar */}
        <div className="flex-shrink-0">
          <img
            src={heroImage}
            alt="Player"
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
          />
        </div>
        
        {/* Health Bar */}
        <div className="flex gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={`w-4 h-4 border border-gray-600 ${
                i < health ? 'bg-red-700' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Reset Button */}
      <button
        onClick={resetGame}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-base"
      >
        Reset Game
      </button>
      
      {/* Game State Display */}
      {gameState !== 'playing' && (
        <div className="mt-4 text-center">
          <p className="text-lg font-bold">
            {gameState === 'victory' ? '🎉 Victory!' : '💀 Defeat!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BattleEncounter;
