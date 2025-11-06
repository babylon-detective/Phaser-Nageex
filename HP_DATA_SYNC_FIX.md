# HP Data Synchronization Fix

## Problem
Battle damage was not being reflected in WorldScene and MenuScene. When party members took damage in BattleScene, the HP would reset when returning to WorldScene or viewing stats in MenuScene.

## Root Cause
**Data was being updated in one location but read from another:**

1. **BattleScene** applied damage to local character objects
2. **WorldScene** received HP states and updated **PartyManager** only
3. **MenuScene** read from **PartyLeadershipManager** (different data source)
4. Result: MenuScene showed stale data, HP appeared to reset

## Solution

### 1. WorldScene - Dual Update System
**File:** `src/scenes/WorldScene.js`

```javascript
applyPartyHPStates(hpStates) {
    // Update player HP in BOTH locations
    if (hpStates.playerHP !== undefined) {
        gameStateManager.updatePlayerHealth(hpStates.playerHP);
        partyLeadershipManager.updateMemberStats('player', {
            health: hpStates.playerHP,
            maxHealth: hpStates.playerMaxHP
        });
    }
    
    // Update party member HP in BOTH locations
    hpStates.partyMembers.forEach(memberHP => {
        // Update PartyManager (for world visuals)
        const npcData = this.partyManager.getRecruitableNPC(memberHP.id);
        if (npcData) {
            npcData.stats.health = memberHP.currentHP;
            npcData.isDowned = memberHP.isDowned;
        }
        
        // Update PartyLeadershipManager (for MenuScene)
        partyLeadershipManager.updateMemberStats(memberHP.id, {
            health: memberHP.currentHP,
            maxHealth: memberHP.maxHP
        });
    });
}
```

### 2. MenuScene - Fresh Data Fetching
**File:** `src/scenes/MenuScene.js`

```javascript
showCharacterStats(member, index) {
    // Fetch LATEST stats from PartyLeadershipManager
    const freshParty = partyLeadershipManager.getParty();
    const freshMember = freshParty[index];
    
    // Use fresh stats instead of stale snapshot
    stats = freshMember ? freshMember.stats : member.stats;
    currentHP = stats.health;
    maxHP = stats.maxHealth;
}
```

### 3. BattleScene - Bug Fix
**File:** `src/scenes/BattleScene.js`

**Before:**
```javascript
character.memberData = {
    ...memberData,
    currentHP: memberData.stats.health,
    maxHP: memberData.stats.health  // ❌ WRONG!
};
```

**After:**
```javascript
character.memberData = {
    ...memberData,
    currentHP: memberData.stats.health,
    maxHP: memberData.stats.maxHealth || memberData.stats.health  // ✅ CORRECT
};
```

### 4. PartyManager - Data Structure
**File:** `src/managers/PartyManager.js`

Added `maxHealth` field to all recruitable NPCs:

```javascript
const recruitables = [
    {
        id: 'warrior',
        stats: {
            health: 120,
            maxHealth: 120,  // ✅ Added
            attack: 15,
            defense: 10,
            level: 1
        }
    },
    // ... mage and ranger also updated
];
```

## Data Flow (After Fix)

```
┌─────────────┐
│ BattleScene │ Damage applied to characters
└──────┬──────┘
       │
       │ HP states passed on battle end
       ↓
┌─────────────────────┐
│ WorldScene          │
│ applyPartyHPStates()│
└──────┬──────┬───────┘
       │      │
       │      └────────────────────────┐
       ↓                               ↓
┌────────────────┐          ┌─────────────────────────┐
│ PartyManager   │          │ PartyLeadershipManager  │
│ (world visuals)│          │ (persistent data)       │
└────────────────┘          └───────────┬─────────────┘
                                        │
                                        │ MenuScene reads from here
                                        ↓
                            ┌─────────────────────┐
                            │ MenuScene           │
                            │ Fresh stats fetched │
                            └─────────────────────┘
```

## Testing Checklist

- [x] Player takes damage in battle → HP persists to WorldScene
- [x] Player takes damage in battle → HP shows correctly in MenuScene
- [x] Party member takes damage → HP persists to WorldScene
- [x] Party member takes damage → HP shows correctly in MenuScene
- [x] Character gets downed (0 HP) → Downed state persists
- [x] Multiple battles in sequence → HP damage accumulates correctly
- [x] MenuScene shows correct current/max HP bars
- [x] BattleScene starts with correct HP from previous battle

## Key Managers

### GameStateManager
- Stores player stats (level, XP, HP, attack, defense, speed)
- Authoritative source for player data
- Persists across all scenes

### PartyLeadershipManager
- Stores party order and member stats
- Handles leadership rotation (Q/E keys)
- Authoritative source for party member data
- Used by MenuScene

### PartyManager
- Manages recruitable NPC sprites in WorldScene
- Handles recruitment mechanics
- Stores visual state (sprite references, downed status)
- Updated in parallel with PartyLeadershipManager

## Impact
✅ HP damage now persists correctly across all scenes  
✅ MenuScene always shows current HP values  
✅ Downed status is properly maintained  
✅ No more HP "reset" bugs  
✅ Consistent data across BattleScene → WorldScene → MenuScene

