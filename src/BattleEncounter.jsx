import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import images
import caveClan3 from './assets/3_cave_clan.jpg';
import caveClan2 from './assets/2_cave_clan.jpg';
import caveClan1 from './assets/1_cave_clan.jpg';
import caveClan0 from './assets/0_cave_clan.jpg';
import heroImage from './assets/hero.png';

// Geometry (apex bottom-center; 0° up; + right; - left)
const ARC_DEG = 90; // Perfect 90° sector
const MIN_ANGLE = -ARC_DEG / 2; // -45
const MAX_ANGLE =  ARC_DEG / 2; // +45

const size   = 540;        // radar svg size (3x larger for better visibility)
const cx     = size / 2;
const cy     = size * 0.5; // center vertically (not at bottom) - moved up to make radar taller
const radius = size * 0.5; // outer radius (top arc) - increased for more height
const bottomRadius = radius * 0.3; // bottom arc (smaller fraction for more height)
const innerRadius = radius * 0.6; // inner guide arc radius
const midRadius = radius * 0.8;   // middle guide arc radius

// Calculate the actual bounds needed for the radar
const leftBound = cx + Math.cos(Math.PI * (90 - MIN_ANGLE) / 180) * radius;
const rightBound = cx + Math.cos(Math.PI * (90 - MAX_ANGLE) / 180) * radius;
const topBound = cy - Math.sin(Math.PI * (90 - 0) / 180) * radius;
const bottomBound = cy + Math.sin(Math.PI * (90 - 0) / 180) * bottomRadius;

// Adjust viewBox to start at the actual top of the radar content
const padding = 5;
const viewBoxX = Math.floor(leftBound) - padding;
const viewBoxY = Math.floor(topBound); // Start at the actual top of the radar
const viewBoxWidth = Math.ceil(rightBound - leftBound) + 2 * padding;
const viewBoxHeight = Math.ceil(bottomBound - topBound) + padding; // Only add padding at bottom

const deg2rad = (d) => (d * Math.PI) / 180;

function polarToXY(angleDeg, rFrac) {
  const a = deg2rad(90 - angleDeg);     // SVG y+ is down
  return { x: cx + Math.cos(a) * radius * rFrac,
           y: cy - Math.sin(a) * radius * rFrac };
}

// Generate random enemy positions with constraints
function generateRandomEnemyPositions(numEnemies = 3) {
  const positions = [];
  const minRadius = 0.4; // Minimum distance from center (avoid bottom edge)
  const maxRadius = 0.9; // Maximum distance from center (avoid top edge)
  const minAngleSeparation = 20; // Minimum degrees between nodes
  const minRadiusSeparation = 0.15; // Minimum radius separation (15% of total radius)
  const edgeBuffer = 5; // Degrees buffer from sector edges
  
  // Define safe angle range (avoiding sector edges)
  const safeMinAngle = MIN_ANGLE + edgeBuffer;
  const safeMaxAngle = MAX_ANGLE - edgeBuffer;
  
  // Pre-allocate radius ranges to ensure separation
  const radiusRanges = [];
  const totalRadiusRange = maxRadius - minRadius;
  const rangeSize = totalRadiusRange / numEnemies;
  
  for (let i = 0; i < numEnemies; i++) {
    const rangeStart = minRadius + i * rangeSize;
    const rangeEnd = minRadius + (i + 1) * rangeSize;
    radiusRanges.push({ start: rangeStart, end: rangeEnd });
  }
  
  for (let i = 0; i < numEnemies; i++) {
    let attempts = 0;
    let validPosition = false;
    let newPosition;
    
    // Use the pre-allocated radius range for this enemy
    const radiusRange = radiusRanges[i];
    
    while (!validPosition && attempts < 50) {
      // Generate random angle within safe range
      const angle = safeMinAngle + Math.random() * (safeMaxAngle - safeMinAngle);
      
      // Generate random radius within the allocated range
      const radius = radiusRange.start + Math.random() * (radiusRange.end - radiusRange.start);
      
      newPosition = { angle, radius };
      
      // Check if this position conflicts with existing positions
      validPosition = true;
      for (const existingPos of positions) {
        // Check horizontal separation (considering curved reticle)
        const angleDiff = Math.abs(angle - existingPos.angle);
        if (angleDiff < minAngleSeparation) {
          validPosition = false;
          break;
        }
        
        // Check radius separation to prevent multiple highlights
        const radiusDiff = Math.abs(radius - existingPos.radius);
        if (radiusDiff < minRadiusSeparation) {
          validPosition = false;
          break;
        }
        
        // Additional check: ensure nodes aren't too close in actual distance
        const pos1 = polarToXY(angle, radius);
        const pos2 = polarToXY(existingPos.angle, existingPos.radius);
        const distance = Math.sqrt(
          Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
        );
        
        // Minimum distance of 40 pixels between nodes
        if (distance < 40) {
          validPosition = false;
          break;
        }
      }
      
      attempts++;
    }
    
    // If we couldn't find a valid position after 50 attempts, use a fallback
    if (!validPosition) {
      // Use evenly spaced positions as fallback
      const angleStep = (safeMaxAngle - safeMinAngle) / (numEnemies - 1);
      const fallbackAngle = safeMinAngle + i * angleStep;
      const fallbackRadius = radiusRange.start + (radiusRange.end - radiusRange.start) * 0.5;
      newPosition = { angle: fallbackAngle, radius: fallbackRadius };
    }
    
    positions.push(newPosition);
  }
  
  return positions;
}

function wedgePath(startDeg, endDeg) {
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const topLeft = polarToXY(startDeg, 1);
  const topRight = polarToXY(endDeg, 1);
  const bottomLeft = polarToXY(startDeg, bottomRadius / radius);
  const bottomRight = polarToXY(endDeg, bottomRadius / radius);
  
  // Create pill-shaped sector: top arc -> right side -> bottom arc -> left side -> close
  return `M ${topLeft.x} ${topLeft.y} A ${radius} ${radius} 0 ${largeArc} 1 ${topRight.x} ${topRight.y} L ${bottomRight.x} ${bottomRight.y} A ${bottomRadius} ${bottomRadius} 0 ${largeArc} 0 ${bottomLeft.x} ${bottomLeft.y} Z`;
}

function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Helper function to create guide arc path
function guideArcPath(arcRadius) {
  const left = polarToXY(MIN_ANGLE, arcRadius / radius);
  const right = polarToXY(MAX_ANGLE, arcRadius / radius);
  const largeArc = Math.abs(MAX_ANGLE - MIN_ANGLE) > 180 ? 1 : 0;
  // Create circular arc with same center (cx, cy) for perfect concentricity
  return `M ${left.x} ${left.y} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${right.x} ${right.y}`;
}

// Helper function to create reticle arc path
function reticleArcPath(currentRadius) {
  const left = polarToXY(MIN_ANGLE, currentRadius / radius);
  const right = polarToXY(MAX_ANGLE, currentRadius / radius);
  const largeArc = Math.abs(MAX_ANGLE - MIN_ANGLE) > 180 ? 1 : 0;
  return `M ${left.x} ${left.y} A ${currentRadius} ${currentRadius} 0 ${largeArc} 1 ${right.x} ${right.y}`;
}

const BattleEncounter = () => {
  // Game state
  const [enemies, setEnemies] = useState(3);
  const [health, setHealth] = useState(5);
  const [gameState, setGameState] = useState('playing'); // 'playing', 'victory', 'defeat'
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
  const [reticleRadius, setReticleRadius] = useState(bottomRadius);
  const [reticleDirection, setReticleDirection] = useState(1);
  const [currentWeapon, setCurrentWeapon] = useState(0);
  const [enemyPositions, setEnemyPositions] = useState([]);
  const [chain, setChain] = useState([]); // Array of enemy indices in the chain
  const [chainedEnemies, setChainedEnemies] = useState(new Set()); // Set of chained enemy indices
  
  // Refs
  const lastClickTimeRef = useRef(0);
  const reticleAnimationRef = useRef();
  const reticleDirectionRef = useRef(1);
  
  // Configuration parameters
  const config = {
    cursorSpeed: 0.8,
    hitThreshold: 15, // Increased threshold for easier hitting
    animationDuration: 300,
    reticleSpeed: 1.2, // Speed of reticle movement
  };

  // Weapon data
  const weapons = [
    { name: "plasma arc", image: "🔫", radarType: "moving" },
    { name: "laser rifle", image: "⚡", radarType: "bouncing" },
    { name: "energy cannon", image: "💥", radarType: "chaining" },
    { name: "plasma blade", image: "⚔️", radarType: "static" }
  ];
  
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

  
  // Check if reticle is near an enemy based on both angle and radius proximity
  const isReticleNearEnemy = (enemyAngle, enemyRadius) => {
    // Convert enemy radius to actual pixel radius
    const enemyPixelRadius = enemyRadius * radius;
    
    // Check if reticle radius is close to enemy radius (within hit threshold)
    const radiusDiff = Math.abs(reticleRadius - enemyPixelRadius);
    const isRadiusClose = radiusDiff <= config.hitThreshold;
    
    // For now, we'll consider any enemy in the radar sector as "in angle range"
    // since the reticle sweeps across the entire sector
    const isAngleClose = enemyAngle >= MIN_ANGLE && enemyAngle <= MAX_ANGLE;
    
    // Debug logging
    if (isRadiusClose) {
      console.log(`Hit check: enemyRadius=${enemyPixelRadius}, reticleRadius=${reticleRadius}, diff=${radiusDiff}, threshold=${config.hitThreshold}, angle=${enemyAngle}`);
    }
    
    return isRadiusClose && isAngleClose;
  };
  
  // Handle enemy kill
  const killEnemy = useCallback((enemyIndex = activeEnemyIndex) => {
    if (enemies > 0) {
      // Clear any previous miss state
      setLastMissTime(0);
      // Show hit feedback
      setHitFeedback({ type: 'hit', enemyIndex: enemyIndex });
      setIsPaused(true);
      
      // Stop reticle animation
      if (reticleAnimationRef.current) {
        cancelAnimationFrame(reticleAnimationRef.current);
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
    
    // Stop reticle animation
    if (reticleAnimationRef.current) {
      cancelAnimationFrame(reticleAnimationRef.current);
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
  
  // Handle chain hit for energy cannon
  const handleChainHit = useCallback((enemyIndex) => {
    if (chainedEnemies.has(enemyIndex)) {
      // Enemy already in chain, ignore
      return;
    }
    
    console.log('Adding enemy to chain:', enemyIndex);
    const newChain = [...chain, enemyIndex];
    const newChainedEnemies = new Set([...chainedEnemies, enemyIndex]);
    
    setChain(newChain);
    setChainedEnemies(newChainedEnemies);
    
    // Check if chain is complete (all 3 enemies)
    if (newChain.length === 3) {
      console.log('Chain complete! Killing all enemies');
      // Kill all enemies in the chain
      setTimeout(() => {
        newChain.forEach((enemyIdx, index) => {
          setTimeout(() => {
            killEnemy(enemyIdx);
          }, index * 200); // Stagger the kills slightly
        });
        
        // Clear chain after all enemies are killed
        setTimeout(() => {
          setChain([]);
          setChainedEnemies(new Set());
        }, 1000);
      }, 500);
    }
  }, [chain, chainedEnemies]);
  
  // Handle chain miss for energy cannon
  const handleChainMiss = useCallback(() => {
    console.log('Chain miss - breaking chain and taking damage');
    
    // Take damage
    setHealth(prev => Math.max(0, prev - 1));
    setLastMissTime(Date.now());
    setIsPaused(true);
    
    // Stop reticle animation
    if (reticleAnimationRef.current) {
      cancelAnimationFrame(reticleAnimationRef.current);
    }
    
    // Show miss feedback
    setHitFeedback({ type: 'miss' });
    
    // Clear the chain
    setChain([]);
    setChainedEnemies(new Set());
    
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
    
    const currentWeaponData = weapons[currentWeapon];
    console.log('Attack detected, weapon:', currentWeaponData.name, 'radar type:', currentWeaponData.radarType);
    
    // For moving radar weapons (plasma arc), bouncing radar weapons (laser rifle), and chaining radar weapons (energy cannon), check reticle position
    if (currentWeaponData.radarType === 'moving' || currentWeaponData.radarType === 'bouncing' || currentWeaponData.radarType === 'chaining') {
      console.log('Moving radar - checking reticle position, radius:', reticleRadius);
      
      // Check if reticle is near any live enemy
      let hitEnemyIndex = -1;
      for (let i = 0; i < enemyPositions.length; i++) {
        // Skip dead enemies
        if (deadEnemies.has(i)) continue;
        
        const enemy = enemyPositions[i];
        const isNear = isReticleNearEnemy(enemy.angle, enemy.radius);
        console.log(`Enemy ${i}: angle=${enemy.angle}, radius=${enemy.radius}, reticle=${reticleRadius}, near=${isNear}, dead=${deadEnemies.has(i)}`);
        if (isNear) {
          hitEnemyIndex = i;
          break;
        }
      }
      
      console.log('Hit enemy index:', hitEnemyIndex);
      
      if (hitEnemyIndex !== -1) {
        if (currentWeaponData.radarType === 'chaining') {
          // Energy cannon: add to chain instead of killing immediately
          handleChainHit(hitEnemyIndex);
        } else {
          // Plasma arc and laser rifle: kill the specific enemy that was hit
          console.log('Killing enemy:', hitEnemyIndex);
          killEnemy(hitEnemyIndex);
        }
      } else {
        if (currentWeaponData.radarType === 'chaining') {
          // Energy cannon: miss breaks the chain
          handleChainMiss();
        } else {
          // Plasma arc and laser rifle: miss - take damage
          console.log('Miss detected');
          handleMiss();
        }
      }
    } else {
      // For static radar weapons, no attack functionality yet
      console.log('Static radar weapon - attack not implemented yet');
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
  
  // Weapon cycling functions
  const cycleWeaponLeft = () => {
    setCurrentWeapon(prev => (prev - 1 + weapons.length) % weapons.length);
  };

  const cycleWeaponRight = () => {
    setCurrentWeapon(prev => (prev + 1) % weapons.length);
  };

  // Reset game
  const resetGame = () => {
    setEnemies(3);
    setHealth(5);
    setGameState('playing');
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
    setReticleRadius(bottomRadius);
    setReticleDirection(1);
    reticleDirectionRef.current = 1;
    setCurrentWeapon(0);
    setChain([]);
    setChainedEnemies(new Set());
    // Generate new random enemy positions
    setEnemyPositions(generateRandomEnemyPositions(3));
  };
  

  // Initialize enemy positions on component mount
  useEffect(() => {
    setEnemyPositions(generateRandomEnemyPositions(3));
  }, []);

  // Reset reticle when switching weapons
  useEffect(() => {
    // Stop any existing animation
    if (reticleAnimationRef.current) {
      cancelAnimationFrame(reticleAnimationRef.current);
    }
    
    // Reset reticle to bottom and direction to up
    setReticleRadius(bottomRadius);
    setReticleDirection(1);
    reticleDirectionRef.current = 1;
    setChain([]);
    setChainedEnemies(new Set());
  }, [currentWeapon]);

  // Track touching enemies for highlighting only
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    
    const currentTouching = new Set();
    const currentWeaponData = weapons[currentWeapon];
    
    // For moving radar weapons (plasma arc), bouncing radar weapons (laser rifle), and chaining radar weapons (energy cannon), check reticle position
    if (currentWeaponData.radarType === 'moving' || currentWeaponData.radarType === 'bouncing' || currentWeaponData.radarType === 'chaining') {
      enemyPositions.forEach((enemy, i) => {
        // Skip dead enemies
        if (deadEnemies.has(i)) return;
        
        if (isReticleNearEnemy(enemy.angle, enemy.radius)) {
          currentTouching.add(i);
        }
      });
    }
    // For static radar weapons, no highlighting (can be extended later)
    
    // Update currently touching enemies
    setTouchingEnemies(currentTouching);
  }, [reticleRadius, enemies, gameState, isPaused, deadEnemies, currentWeapon, enemyPositions]);

  // Reticle animation - for weapons with moving radar (plasma arc) and bouncing radar (laser rifle)
  useEffect(() => {
    const shouldAnimate = gameState === 'playing' && !isPaused;
    
    if (!shouldAnimate) return;
    
    const step = () => {
      // Get current weapon data fresh on each frame to handle weapon switching
      const currentWeaponData = weapons[currentWeapon];
      
      // Check if current weapon should animate
      if (!(currentWeaponData.radarType === 'moving' || currentWeaponData.radarType === 'bouncing' || currentWeaponData.radarType === 'chaining')) {
        return; // Stop animation for static weapons
      }
      
      setReticleRadius(prev => {
        let next = prev + reticleDirectionRef.current * config.reticleSpeed;
        
        if (currentWeaponData.radarType === 'moving') {
          // Plasma arc behavior: goes from bottom to top, then resets to bottom
          if (next >= radius) {
            next = bottomRadius; // Reset to bottom instead of reversing
            setReticleDirection(1); // Keep going up
            reticleDirectionRef.current = 1;
          }
          if (next <= bottomRadius) {
            next = bottomRadius;
            setReticleDirection(1);
            reticleDirectionRef.current = 1;
          }
        } else if (currentWeaponData.radarType === 'bouncing') {
          // Laser rifle behavior: bounces between top and bottom
          if (next >= radius) {
            reticleDirectionRef.current = -1; // Reverse direction to go down (immediate)
            setReticleDirection(-1); // Update state for consistency
            next = radius - config.reticleSpeed; // Move slightly away from top
          }
          if (next <= bottomRadius) {
            reticleDirectionRef.current = 1; // Reverse direction to go up (immediate)
            setReticleDirection(1); // Update state for consistency
            next = bottomRadius + config.reticleSpeed; // Move slightly away from bottom
          }
        } else if (currentWeaponData.radarType === 'chaining') {
          // Energy cannon behavior: moves like plasma arc (bottom to top, reset)
          if (next >= radius) {
            next = bottomRadius; // Reset to bottom instead of reversing
            setReticleDirection(1); // Keep going up
            reticleDirectionRef.current = 1;
          }
          if (next <= bottomRadius) {
            next = bottomRadius;
            setReticleDirection(1);
            reticleDirectionRef.current = 1;
          }
        }
        
        return next;
      });
      reticleAnimationRef.current = requestAnimationFrame(step);
    };
    reticleAnimationRef.current = requestAnimationFrame(step);
    return () => reticleAnimationRef.current && cancelAnimationFrame(reticleAnimationRef.current);
  }, [gameState, isPaused, currentWeapon]);
  
  
  return (
    <div className="min-h-screen bg-gray-950 text-white p-2 flex flex-col items-center">
      {/* Battle Artwork - Larger Vertical Image */}
      <div className="mb-0">
        <div 
          className="relative overflow-hidden rounded-lg border border-white"
          style={{
            filter: hitFeedback?.type === 'miss' ? 'brightness(2) saturate(0)' : 'none'
          }}
        >
          <img
            src={getBattleImage()}
            alt="Battle scene"
            className="w-96 h-96 sm:w-[28rem] sm:h-[28rem] object-cover"
          />
          {/* Gradient overlay for bottom transparency */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-950 to-transparent"></div>
        </div>
      </div>
      
      {/* Flavor Text */}
      <div className="mb-0 text-center max-w-2xl px-4 -mt-1">
        <p className="text-sm font-medium leading-tight">
          {gameState === 'victory' ? "victory! the area is clear." : 
           gameState === 'defeat' ? "defeat. the cave clan overwhelms you." : 
           getFlavorText()}
        </p>
      </div>
      
      {/* Radar Wedge */}
      <div className="relative z-10 mb-1 w-96 sm:w-[28rem] flex justify-center h-auto mt-2">
         <svg
           width="100%"
           height="auto"
           viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
           onClick={handleClick}
           onTouchStart={handleTouchStart}
           onTouchEnd={handleTouchEnd}
           className="cursor-pointer touch-manipulation select-none w-full max-w-sm"
           style={{ touchAction: 'manipulation' }}
         >
           {/* Main pill-shaped sector */}
           <path
             d={wedgePath(MIN_ANGLE, MAX_ANGLE)}
             fill={isTouching ? "#4a4a4a" : "#3f3b38"}
             stroke={isTouching ? "#ffffff" : "#9a9a9a"}
             strokeWidth={isTouching ? 3 : 2}
             className="transition-all duration-150"
           />
           
           {/* Guide arcs (concentric circular arcs) */}
           <path
             d={guideArcPath(innerRadius)}
             fill="none"
             stroke="#666666"
             strokeWidth="1"
             opacity="0.3"
           />
           <path
             d={guideArcPath(midRadius)}
             fill="none"
             stroke="#666666"
             strokeWidth="1"
             opacity="0.3"
           />
           
           {/* Reticle arc (follows circular curvature) */}
           <path
             d={reticleArcPath(reticleRadius)}
             fill="none"
             stroke="white"
             strokeWidth="2"
             opacity="0.8"
           />
           
           {/* Chain lines for energy cannon */}
           {chain.length > 1 && weapons[currentWeapon].radarType === 'chaining' && chain.map((enemyIndex, i) => {
             if (i === 0) return null; // Skip first element
             const prevEnemy = enemyPositions[chain[i - 1]];
             const currentEnemy = enemyPositions[enemyIndex];
             
             if (!prevEnemy || !currentEnemy) return null;
             
             const prevPos = polarToXY(prevEnemy.angle, prevEnemy.radius);
             const currentPos = polarToXY(currentEnemy.angle, currentEnemy.radius);
             
             return (
               <line
                 key={`chain-${i}`}
                 x1={prevPos.x}
                 y1={prevPos.y}
                 x2={currentPos.x}
                 y2={currentPos.y}
                 stroke="#10B981"
                 strokeWidth="3"
                 opacity="0.8"
                 className="animate-pulse"
               />
             );
           })}
           
           {/* Enemy nodes */}
           {enemyPositions.map((enemy, i) => {
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
             
             let fill = '#9CA3AF'; // Soft gray
             let stroke = '#6B7280'; // Subtle halo
             if (isTouching) {
               fill = '#10B981'; 
               stroke = '#059669';
             }
             if (hit || isPopping) {
               fill = '#EF4444';
               stroke = '#DC2626';
             }
             if (chainedEnemies.has(i)) {
               fill = '#10B981'; // Green for chained enemies
               stroke = '#059669';
             }
             
             const opacity = isFading ? 0 : 1;
             const scale = isPopping ? 2.0 : 1;
             
             return (
               <g key={i}>
                 {/* Outer glow */}
                 <circle 
                   cx={p.x} 
                   cy={p.y} 
                   r={16 * scale} 
                   fill="none"
                   stroke={stroke}
                   strokeWidth="1"
                   opacity={opacity * 0.3}
                   className="transition-all duration-300"
                 />
                 {/* Halo */}
                 <circle 
                   cx={p.x} 
                   cy={p.y} 
                   r={12 * scale} 
                   fill="none"
                   stroke={stroke}
                   strokeWidth="2"
                   opacity={opacity * 0.6}
                   className="transition-all duration-300"
                 />
                 {/* Main node */}
                 <circle 
                   cx={p.x} 
                   cy={p.y} 
                   r={8 * scale} 
                   fill={fill} 
                   opacity={opacity}
                   className={`transition-all duration-300 ${isTouching ? 'animate-pulse enemy-glow-touching' : isPopping ? 'animate-ping enemy-glow-hit' : 'enemy-glow'}`} 
                 />
               </g>
             );
           })}
           
         </svg>
       </div>

      {/* Player Info Section - Below Radar */}
      <div className="flex items-center gap-3 -mt-[8.25rem] mb-1 justify-center">
        {/* Player Avatar */}
        <div className="flex-shrink-0">
          <img
            src={heroImage}
            alt="Player"
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
          />
        </div>
        
        {/* Health Bar */}
        <div className="w-48">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`h-4 border border-gray-600 rounded-sm ${
                  i < health ? 'bg-red-700' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Weapon Section */}
      <div className="relative z-20 flex items-center gap-5 mb-1">
        {/* Left Arrow Button */}
        <button
          onClick={cycleWeaponLeft}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
        >
          <span className="text-white text-xl">‹</span>
        </button>

        {/* Weapon Display */}
        <div className="bg-amber-900 border border-amber-700 rounded-lg p-4 min-w-64 text-center">
          <div className="text-6xl mb-3">{weapons[currentWeapon].image}</div>
          <div className="text-white text-base font-medium">{weapons[currentWeapon].name}</div>
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={cycleWeaponRight}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
        >
          <span className="text-white text-xl">›</span>
        </button>
      </div>
      
      {/* Reset Button */}
      <button
        onClick={resetGame}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-lg"
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
