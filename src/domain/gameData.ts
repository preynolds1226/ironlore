export const ACHIEVEMENTS = {
  featured: [
    { id: 'f1', icon: '🏆', name: 'First Blood', desc: 'Complete your first workout', reward: 100, unlocked: true, category: 'Strength' },
    { id: 'f2', icon: '🔥', name: 'Iron Will', desc: 'Maintain a 30 day streak', reward: 500, unlocked: false, progress: 17, total: 30, category: 'Streak' },
    { id: 'f3', icon: '🥩', name: 'Protein King', desc: 'Hit 200g protein 7 days straight', reward: 300, unlocked: false, progress: 4, total: 7, category: 'Nutrition' },
    { id: 'f4', icon: '👑', name: 'Dawn Warrior', desc: 'Log 50 workouts before 6 AM', reward: 750, unlocked: false, progress: 23, total: 50, category: 'Streak' },
  ],
  Strength: [
    { id: 's1', icon: '💪', name: 'First Blood', desc: 'Complete your first workout', reward: 100, unlocked: true },
    { id: 's2', icon: '🏋️', name: 'Iron Chest', desc: 'Bench press your bodyweight', reward: 200, unlocked: true },
    { id: 's3', icon: '⚔️', name: 'Steel Chest', desc: 'Bench press 1.5x bodyweight', reward: 350, unlocked: false, progress: 185, total: 270 },
    { id: 's4', icon: '👑', name: 'Immortal Bench', desc: 'Bench 225 for 10 reps', reward: 600, unlocked: false, progress: 185, total: 225 },
    { id: 's5', icon: '🦵', name: 'Iron Legs', desc: 'Squat your bodyweight', reward: 200, unlocked: true },
    { id: 's6', icon: '💀', name: 'Earth Shaker', desc: 'Squat 315 lbs', reward: 500, unlocked: false, progress: 205, total: 315 },
    { id: 's7', icon: '⛓️', name: 'Iron Back', desc: 'Deadlift 1.5x bodyweight', reward: 250, unlocked: false, progress: 225, total: 270 },
    { id: 's8', icon: '🔱', name: 'The Unmovable', desc: 'Deadlift 405 lbs', reward: 750, unlocked: false, progress: 225, total: 405 },
    { id: 's9', icon: '💯', name: 'Century', desc: 'Complete 100 total workouts', reward: 1000, unlocked: false, progress: 34, total: 100 },
  ],
  Nutrition: [
    { id: 'n1', icon: '🥩', name: 'Protein Rookie', desc: 'Hit protein goal for the first time', reward: 50, unlocked: true },
    { id: 'n2', icon: '🍗', name: 'Protein Warrior', desc: 'Hit 200g protein 7 days straight', reward: 300, unlocked: false, progress: 4, total: 7 },
    { id: 'n3', icon: '👑', name: 'Protein King', desc: 'Hit 200g protein 30 days straight', reward: 1000, unlocked: false, progress: 4, total: 30 },
    { id: 'n4', icon: '⚡', name: 'Calorie Crusher', desc: 'Hit calorie goal 14 days straight', reward: 400, unlocked: false, progress: 3, total: 14 },
    { id: 'n5', icon: '🧬', name: 'Macro Master', desc: 'Hit all macros in one day', reward: 200, unlocked: true },
  ],
  Streak: [
    { id: 'st1', icon: '🔥', name: 'On Fire', desc: 'Log in 7 days in a row', reward: 150, unlocked: true },
    { id: 'st2', icon: '💥', name: 'Iron Will', desc: '30 day streak', reward: 500, unlocked: false, progress: 17, total: 30 },
    { id: 'st3', icon: '🌅', name: 'Dawn Warrior', desc: '50 workouts before 6 AM', reward: 750, unlocked: false, progress: 23, total: 50 },
    { id: 'st4', icon: '🏅', name: 'Unstoppable', desc: '100 day streak', reward: 2000, unlocked: false, progress: 17, total: 100 },
  ],
};

export const SHOP_ITEMS = {
  Armor: [
    { id: 'a1', icon: '🛡️', name: 'Starter Iron Armor', desc: 'The armor of a warrior just beginning their journey', price: 0, owned: true, equipped: true, category: 'Armor' },
    { id: 'a2', icon: '⚫', name: 'Obsidian Plate', desc: 'Forged from the darkest iron, worn by battle-hardened warriors', price: 500, owned: false, equipped: false, category: 'Armor' },
    { id: 'a3', icon: '🔴', name: 'Crimson Warlord Set', desc: 'The armor of a thousand victories', price: 1200, owned: false, equipped: false, category: 'Armor' },
    { id: 'a4', icon: '✨', name: 'Legendary Ironborn', desc: 'Worn only by those who have reached the pinnacle of strength', price: 3000, owned: false, equipped: false, category: 'Armor' },
  ],
  Companions: [
    { id: 'c1', icon: '🐺', name: 'Iron Wolf', desc: 'A loyal wolf that walks beside you on your journey', price: 800, owned: false, equipped: false, category: 'Companions' },
    { id: 'c2', icon: '🐦', name: 'Battle Raven', desc: 'A raven that scouts your enemies and returns with knowledge', price: 1500, owned: false, equipped: false, category: 'Companions' },
    { id: 'c3', icon: '🐉', name: 'Shadow Drake', desc: 'A young dragon bonded to your strength', price: 5000, owned: false, equipped: false, category: 'Companions' },
    { id: 'c4', icon: '🦅', name: 'Storm Eagle', desc: 'Soars above the battlefield, marking the path to glory', price: 2000, owned: false, equipped: false, category: 'Companions' },
  ],
  Titles: [
    { id: 't1', icon: '📜', name: 'The Ironborn', desc: 'Born of iron and forged in fire', price: 0, owned: true, equipped: true, category: 'Titles' },
    { id: 't2', icon: '📜', name: 'Protein King', desc: 'Awarded to those who never miss their macros', price: 400, owned: false, equipped: false, category: 'Titles' },
    { id: 't3', icon: '📜', name: 'The Unbroken', desc: 'For those who have never missed a day', price: 600, owned: false, equipped: false, category: 'Titles' },
    { id: 't4', icon: '📜', name: 'Dawn Warrior', desc: 'Rises before the sun to forge their destiny', price: 800, owned: false, equipped: false, category: 'Titles' },
    { id: 't5', icon: '📜', name: 'Ironlore Legend', desc: 'Reserved for those who have reached max level', price: 5000, owned: false, equipped: false, category: 'Titles' },
  ],
  Backgrounds: [
    { id: 'bg1', icon: '🌑', name: 'Dark Forge', desc: 'The ancient forge where iron becomes legend', price: 0, owned: true, equipped: true, category: 'Backgrounds' },
    { id: 'bg2', icon: '🌋', name: 'Volcanic Throne', desc: 'A throne carved from volcanic rock at the edge of the world', price: 700, owned: false, equipped: false, category: 'Backgrounds' },
    { id: 'bg3', icon: '❄️', name: 'Frozen Tundra', desc: 'The frozen wastes where only the strongest survive', price: 700, owned: false, equipped: false, category: 'Backgrounds' },
    { id: 'bg4', icon: '⚡', name: 'Storm Peak', desc: 'The highest mountain, struck by lightning eternally', price: 1000, owned: false, equipped: false, category: 'Backgrounds' },
  ],
  'Weapon Skins': [
    { id: 'w1', icon: '⚔️', name: 'Iron Blade', desc: 'A simple iron sword, reliable and true', price: 0, owned: true, equipped: true, category: 'Weapon Skins' },
    { id: 'w2', icon: '🗡️', name: 'Shadow Dagger', desc: 'Strikes from the darkness before you see it coming', price: 600, owned: false, equipped: false, category: 'Weapon Skins' },
    { id: 'w3', icon: '🔱', name: 'Trident of Valor', desc: 'Forged by the sea warriors of old', price: 1500, owned: false, equipped: false, category: 'Weapon Skins' },
    { id: 'w4', icon: '⚡', name: 'Lightning Sword', desc: 'Crackles with the power of a thousand storms', price: 2500, owned: false, equipped: false, category: 'Weapon Skins' },
  ],
};

export const CLASSES = [
  {
    id: 'warrior',
    icon: '⚔️',
    name: 'Warrior',
    tagline: 'Forge your body in iron and fire',
    desc: 'Built for the barbell. Strength and muscle are your obsession.',
    coach: '"No excuses. Add weight."',
    color: '#c94c4c',
    stats: { Strength: 5, Vitality: 4, Endurance: 2, Focus: 2 },
    best: 'Powerlifters · Bodybuilders · Strength athletes',
  },
  {
    id: 'ranger',
    icon: '🏹',
    name: 'Ranger',
    tagline: 'Swift, lean, and relentless',
    desc: 'Cardio is your weapon. Endurance and fat loss define your path.',
    coach: '"Consistency over intensity."',
    color: '#4cc97a',
    stats: { Strength: 2, Vitality: 4, Endurance: 5, Focus: 3 },
    best: 'Runners · Cyclists · Fat loss focus',
  },
  {
    id: 'monk',
    icon: '🧘',
    name: 'Monk',
    tagline: 'The body follows the mind',
    desc: 'Balance, mindfulness, and wellness. All stats grow in harmony.',
    coach: '"The body follows the mind."',
    color: '#7ab0e8',
    stats: { Strength: 3, Vitality: 3, Endurance: 3, Focus: 5 },
    best: 'Yoga · Meditation · Wellness focus',
  },
  {
    id: 'berserker',
    icon: '🔥',
    name: 'Berserker',
    tagline: 'You were born for this',
    desc: 'Maximum intensity. All stats grow faster — but consistency is everything.',
    coach: '"YOU WERE BORN FOR THIS."',
    color: '#f97316',
    stats: { Strength: 4, Vitality: 3, Endurance: 4, Focus: 3 },
    best: 'HIIT · CrossFit · Sport athletes',
  },
];

export const GOAL_PATHS = [
  { id: 'ironborn', icon: '🏋️', name: 'Ironborn', desc: 'Build maximum strength and muscle mass', color: '#c94c4c' },
  { id: 'blade', icon: '🗡️', name: 'Blade', desc: 'Cut body fat and get lean and defined', color: '#c9a84c' },
  { id: 'monk', icon: '☯️', name: 'Monk Path', desc: 'Balanced wellness, mind and body together', color: '#7ab0e8' },
  { id: 'warrior', icon: '⚡', name: 'Warrior', desc: 'Athletic performance and sport-specific training', color: '#4cc97a' },
  { id: 'builder', icon: '🔄', name: 'Builder', desc: 'Body recomposition — gain muscle, lose fat simultaneously', color: '#a855f7' },
];

