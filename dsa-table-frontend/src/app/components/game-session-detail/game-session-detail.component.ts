import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameSessionService } from '../../services/game-session.service';
import { CharacterService } from '../../services/character.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { GameSession } from '../../models/game-session.model';
import { Character } from '../../models/character.model';
import { ChatComponent } from '../chat/chat.component';
import { BattlemapComponent } from '../battlemap/battlemap.component';
import { environment } from '../../../environments/environment';
import { Subscription, interval, forkJoin, of } from 'rxjs';
import { switchMap, startWith, map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-game-session-detail',
  standalone: true,
  imports: [CommonModule, ChatComponent, BattlemapComponent, FormsModule],
  templateUrl: './game-session-detail.component.html',
  styleUrl: './game-session-detail.component.scss'
})
export class GameSessionDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chatComponent') chatComponent!: ChatComponent;
  @ViewChild('talentInput') talentInput!: ElementRef<HTMLInputElement>;
  @ViewChild('talentWrapper') talentWrapper!: ElementRef<HTMLDivElement>;
  
  session: GameSession | null = null;
  characters: Character[] = [];
  loading = false;
  error: string | null = null;
  sessionId: number | null = null;
  currentUserId: number | null = null;
  showCustomRoll = false;
  customDiceSides = 20;
  
  // Character selection for joining session
  showCharacterSelection = false;
  availableCharacters: Character[] = [];
  selectedCharacterId: number | null = null;
  joiningSession = false;
  myCharacter: Character | null = null;
  
  // Polling subscriptions
  private charactersPollingSubscription?: Subscription;
  private sessionPollingSubscription?: Subscription;
  
  // Owner information cache
  private ownerNames: Map<number, string> = new Map();
  
  // Talent rolling
  selectedTalentId: number | null = null;
  talentSearchTerm: string = '';
  showTalentDropdown: boolean = false;
  highlightedTalentIndex: number = -1;
  dropdownPosition: { left: number; bottom: number; width: number } = { left: 0, bottom: 0, width: 0 };

  // Character stat modifications
  showLifeMod: boolean = false;
  showAspMod: boolean = false;
  showWoundsMod: boolean = false;
  showBeMod: boolean = false;
  showRest: boolean = false;
  lifeModValue: number = 0;
  aspModValue: number = 0;
  woundsValue: number | null = null;
  beModValue: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameSessionService: GameSessionService,
    private characterService: CharacterService,
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.currentUserId = currentUser.id;
    }

    this.route.params.subscribe(params => {
      this.sessionId = +params['id'];
      if (this.sessionId) {
        this.loadSession();
        this.loadCharacters();
        this.startPolling();
      }
    });
  }

  ngAfterViewInit(): void {
    // ViewChild is now available
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  startPolling(): void {
    if (!this.sessionId) return;

    // Poll for characters every 5 seconds
    this.charactersPollingSubscription = interval(5000).pipe(
      startWith(0),
      switchMap(() => {
        if (!this.sessionId) return [];
        return this.characterService.getAllCharacters(undefined, this.sessionId);
      })
    ).subscribe({
      next: (data: Character[]) => {
        // Only update if characters have changed
        const currentIds = this.characters.map(c => c.id).sort().join(',');
        const newIds = data.map(c => c.id).sort().join(',');
        
        if (currentIds !== newIds || this.characters.length !== data.length) {
          // Sort by initiative (descending), then by name
          this.characters = data.sort((a, b) => {
            const initA = a.initiative ?? 0;
            const initB = b.initiative ?? 0;
            if (initA !== initB) {
              return initB - initA; // Higher initiative first
            }
            return (a.name || '').localeCompare(b.name || '');
          });
          // Load owner names for any new characters
          this.loadOwnerNames(this.characters);
        } else {
          // Even if IDs are the same, update data in case stats changed
          // Merge updates to preserve any local state
          data.forEach(newChar => {
            const existing = this.characters.find(c => c.id === newChar.id);
            if (existing) {
              // Update properties but preserve order
              Object.assign(existing, newChar);
            }
          });
          // Re-sort in case initiative values changed
          this.characters.sort((a, b) => {
            const initA = a.initiative ?? 0;
            const initB = b.initiative ?? 0;
            if (initA !== initB) {
              return initB - initA;
            }
            return (a.name || '').localeCompare(b.name || '');
          });
        }
      },
      error: (err: any) => {
        console.error('Error polling characters:', err);
      }
    });

    // Poll for session data every 5 seconds to get updated players list
    this.sessionPollingSubscription = interval(5000).pipe(
      startWith(0),
      switchMap(() => {
        if (!this.sessionId) return [];
        return this.gameSessionService.getSessionById(this.sessionId);
      })
    ).subscribe({
      next: (data: GameSession) => {
        // Only update if players list has changed
        const currentPlayerIds = this.session?.players?.map(p => p.id).sort().join(',') || '';
        const newPlayerIds = data.players?.map(p => p.id).sort().join(',') || '';
        
        if (currentPlayerIds !== newPlayerIds) {
          this.session = data;
          // When players list changes, immediately reload characters
          // as a new player might have joined with a character
          this.loadCharacters();
          // Also reload owner names for new characters
          this.loadOwnerNames(this.characters);
        } else {
          // Update session data but preserve structure
          if (this.session) {
            this.session.players = data.players;
            this.session.gameMaster = data.gameMaster;
          }
        }
      },
      error: (err: any) => {
        console.error('Error polling session:', err);
      }
    });
  }

  stopPolling(): void {
    if (this.charactersPollingSubscription) {
      this.charactersPollingSubscription.unsubscribe();
      this.charactersPollingSubscription = undefined;
    }
    if (this.sessionPollingSubscription) {
      this.sessionPollingSubscription.unsubscribe();
      this.sessionPollingSubscription = undefined;
    }
  }

  loadSession(): void {
    if (!this.sessionId) return;

    this.loading = true;
    this.error = null;

    this.gameSessionService.getSessionById(this.sessionId).subscribe({
      next: (data: GameSession) => {
        this.session = data;
        this.loading = false;
        // Check if user needs to join after session is loaded
        this.checkIfJoined();
      },
      error: (err: any) => {
        this.error = 'Failed to load game session.';
        this.loading = false;
        console.error('Error loading game session:', err);
      }
    });
  }

  loadCharacters(): void {
    if (!this.sessionId) return;

    this.characterService.getAllCharacters(undefined, this.sessionId).subscribe({
      next: (data: Character[]) => {
        // Check if characters have actually changed before updating
        const currentIds = this.characters.map(c => c.id).sort().join(',');
        const newIds = data.map(c => c.id).sort().join(',');
        const hasChanged = currentIds !== newIds || this.characters.length !== data.length;
        
        // Sort by initiative (descending), then by name
        const sortedData = data.sort((a, b) => {
          const initA = a.initiative ?? 0;
          const initB = b.initiative ?? 0;
          if (initA !== initB) {
            return initB - initA; // Higher initiative first
          }
          return (a.name || '').localeCompare(b.name || '');
        });
        
        if (hasChanged) {
          // Replace entire array if characters changed
          this.characters = sortedData;
        } else {
          // Update existing characters in place to preserve any local state
          sortedData.forEach(newChar => {
            const existing = this.characters.find(c => c.id === newChar.id);
            if (existing) {
              Object.assign(existing, newChar);
            }
          });
          // Re-sort in case initiative values changed
          this.characters.sort((a, b) => {
            const initA = a.initiative ?? 0;
            const initB = b.initiative ?? 0;
            if (initA !== initB) {
              return initB - initA;
            }
            return (a.name || '').localeCompare(b.name || '');
          });
        }
        
        // Load owner information for characters
        this.loadOwnerNames(this.characters);
      },
      error: (err: any) => {
        console.error('Error loading characters:', err);
      }
    });
  }

  loadOwnerNames(characters: Character[]): void {
    // Get unique owner IDs
    const ownerIds = new Set<number>();
    characters.forEach(char => {
      if (char.ownerId) {
        ownerIds.add(char.ownerId);
      }
    });

    // Remove IDs we already have
    ownerIds.forEach(id => {
      if (this.ownerNames.has(id)) {
        ownerIds.delete(id);
      }
    });

    if (ownerIds.size === 0) {
      return;
    }

    // Fetch all owners in parallel
    const ownerRequests = Array.from(ownerIds).map(id =>
      this.userService.getUserById(id).pipe(
        map(user => ({ id, displayName: user.displayName })),
        catchError(() => of({ id, displayName: '' }))
      )
    );

    forkJoin(ownerRequests).subscribe({
      next: (owners) => {
        owners.forEach(owner => {
          if (owner.displayName) {
            this.ownerNames.set(owner.id, owner.displayName);
          }
        });
      },
      error: (err) => {
        console.error('Error loading owner names:', err);
      }
    });
  }

  isGameMaster(): boolean {
    return this.session?.gameMaster?.id === this.currentUserId;
  }

  deleteSession(): void {
    if (!this.sessionId) return;
    
    if (confirm('Are you sure you want to delete this game session?')) {
      this.gameSessionService.deleteSession(this.sessionId).subscribe({
        next: () => {
          this.router.navigate(['/sessions']);
        },
        error: (err: any) => {
          alert('Failed to delete game session.');
          console.error('Error deleting game session:', err);
        }
      });
    }
  }

  editSession(): void {
    if (this.sessionId) {
      this.router.navigate(['/sessions', this.sessionId, 'edit']);
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  rollDice(sides: number): void {
    if (!this.sessionId || !this.chatComponent) return;
    
    // Calculate result immediately
    const result = Math.floor(Math.random() * sides) + 1;
    const message = `🎲 Rolled d${sides}: ${result}`;
    
    // Send message directly through chat component for immediate display
    this.chatComponent.sendMessage(message);
  }

  rollCustomDice(): void {
    if (this.customDiceSides >= 2 && this.customDiceSides <= 1000) {
      this.rollDice(this.customDiceSides);
      this.showCustomRoll = false;
    }
  }

  checkIfJoined(): void {
    if (!this.sessionId || !this.currentUserId) return;

    const isGM = this.session?.gameMaster?.id === this.currentUserId;
    
    // Skip API call for GMs - they don't need to join with a character
    if (isGM) {
      this.showCharacterSelection = false;
      return;
    }
    
    // Check if user has a character in this session
    this.gameSessionService.getMyCharacter(this.sessionId).subscribe({
      next: (character: Character | null) => {
        if (character) {
          this.myCharacter = character;
          this.showCharacterSelection = false;
          // Load full character data with properties and talents
          if (character.id) {
            this.loadFullCharacter(character.id);
          }
        } else {
          // Non-GM users need to join, show character selection
          this.loadAvailableCharacters();
          this.showCharacterSelection = true;
        }
      },
      error: (err: any) => {
        // If error, assume user hasn't joined
        this.loadAvailableCharacters();
        this.showCharacterSelection = true;
      }
    });
  }

  loadAvailableCharacters(): void {
    if (!this.currentUserId) return;

    this.characterService.getAllCharacters(this.currentUserId).subscribe({
      next: (data: Character[]) => {
        this.availableCharacters = data;
        if (data.length > 0) {
          this.selectedCharacterId = data[0].id || null;
        }
      },
      error: (err: any) => {
        console.error('Error loading available characters:', err);
      }
    });
  }

  joinSession(): void {
    if (!this.sessionId || !this.selectedCharacterId || this.joiningSession) return;

    this.joiningSession = true;
    this.gameSessionService.joinSession(this.sessionId, this.selectedCharacterId).subscribe({
      next: (session: GameSession) => {
        this.session = session;
        this.showCharacterSelection = false;
        this.joiningSession = false;
        // Reload characters to show the newly joined one
        this.loadCharacters();
        // Reload session to update players list
        this.loadSession();
        // Reload my character with full data
        this.checkIfJoined();
      },
      error: (err: any) => {
        this.error = 'Failed to join session.';
        this.joiningSession = false;
        console.error('Error joining session:', err);
      }
    });
  }

  loadFullCharacter(characterId: number): void {
    this.characterService.getCharacterById(characterId).subscribe({
      next: (character: Character) => {
        this.myCharacter = character;
      },
      error: (err: any) => {
        console.error('Error loading full character:', err);
      }
    });
  }

  onTalentSelectionChange(value: number | null): void {
    this.showTalentDropdown = false;
    this.talentSearchTerm = '';
  }

  getFilteredTalents(): any[] {
    if (!this.myCharacter?.talents) return [];
    if (!this.talentSearchTerm.trim()) {
      return this.myCharacter.talents.filter(t => t.id !== undefined && t.id !== null);
    }
    const searchLower = this.talentSearchTerm.toLowerCase();
    return this.myCharacter.talents.filter(t => 
      t.id !== undefined && 
      t.id !== null &&
      (t.name.toLowerCase().includes(searchLower) || 
       (t.check && t.check.toLowerCase().includes(searchLower)))
    );
  }

  selectTalent(talentId: number): void {
    this.selectedTalentId = talentId;
    this.showTalentDropdown = false;
    this.talentSearchTerm = '';
  }

  getSelectedTalentName(): string {
    if (!this.selectedTalentId || !this.myCharacter?.talents) return 'Select a talent...';
    const talent = this.myCharacter.talents.find(t => t.id === this.selectedTalentId);
    if (!talent) return 'Select a talent...';
    return `${talent.name} (${talent.check}) - ${talent.value}`;
  }

  onTalentInputFocus(): void {
    this.showTalentDropdown = true;
    this.highlightedTalentIndex = -1;
    this.calculateDropdownPosition();
  }

  calculateDropdownPosition(): void {
    if (!this.talentInput || !this.talentWrapper) {
      setTimeout(() => this.calculateDropdownPosition(), 50);
      return;
    }

    const inputElement = this.talentInput.nativeElement;
    const rect = inputElement.getBoundingClientRect();
    
    this.dropdownPosition = {
      left: rect.left,
      bottom: window.innerHeight - rect.top,
      width: rect.width
    };
  }

  onTalentInputChange(): void {
    this.highlightedTalentIndex = -1;
    
    // Open dropdown if it's not already open and there are filtered results
    if (!this.showTalentDropdown) {
      const filteredTalents = this.getFilteredTalents();
      if (filteredTalents.length > 0 || this.talentSearchTerm.trim().length > 0) {
        this.showTalentDropdown = true;
        this.calculateDropdownPosition();
      }
    }
  }

  onTalentInputBlur(): void {
    // Delay closing dropdown to allow click events on options to fire
    setTimeout(() => {
      this.showTalentDropdown = false;
      this.highlightedTalentIndex = -1;
    }, 200);
  }

  onTalentInputKeyDown(event: KeyboardEvent): void {
    const filteredTalents = this.getFilteredTalents();
    
    // Handle Enter key: roll if talent selected, or select from dropdown if open
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.showTalentDropdown && filteredTalents.length > 0) {
        // Dropdown is open: select highlighted talent
        if (this.highlightedTalentIndex >= 0 && this.highlightedTalentIndex < filteredTalents.length) {
          this.selectTalent(filteredTalents[this.highlightedTalentIndex].id!);
        } else if (filteredTalents.length === 1) {
          // Only one result: select it
          this.selectTalent(filteredTalents[0].id!);
        }
      } else if (this.selectedTalentId) {
        // Talent is selected and dropdown is closed: perform roll
        this.rollTalentCheck();
      }
      return;
    }
    
    if (!this.showTalentDropdown || filteredTalents.length === 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.showTalentDropdown = true;
        this.highlightedTalentIndex = event.key === 'ArrowDown' ? 0 : filteredTalents.length - 1;
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedTalentIndex = (this.highlightedTalentIndex + 1) % filteredTalents.length;
        this.scrollToHighlightedTalent();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedTalentIndex = this.highlightedTalentIndex <= 0 
          ? filteredTalents.length - 1 
          : this.highlightedTalentIndex - 1;
        this.scrollToHighlightedTalent();
        break;
      case 'Escape':
        event.preventDefault();
        this.showTalentDropdown = false;
        this.highlightedTalentIndex = -1;
        break;
    }
  }

  scrollToHighlightedTalent(): void {
    // Scroll the highlighted option into view
    setTimeout(() => {
      const dropdown = document.querySelector('.talent-dropdown');
      const highlighted = dropdown?.querySelector('.talent-option.highlighted') as HTMLElement;
      if (highlighted && dropdown) {
        highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }

  isTalentHighlighted(index: number): boolean {
    return this.highlightedTalentIndex === index;
  }

  rollTalentCheck(mod: number = 0): void {
    // Same check as regular dice roll
    if (!this.sessionId || !this.chatComponent) {
      console.error('Missing requirements:', { sessionId: this.sessionId, chatComponent: !!this.chatComponent });
      return;
    }

    if (!this.myCharacter) {
      console.error('No character loaded');
      return;
    }

    // Validate selectedTalentId
    if (!this.selectedTalentId || isNaN(Number(this.selectedTalentId))) {
      console.error('No valid talent selected:', this.selectedTalentId);
      return;
    }

    // Ensure selectedTalentId is a number
    const talentId = Number(this.selectedTalentId);
    if (isNaN(talentId)) {
      console.error('Invalid talent ID:', this.selectedTalentId);
      return;
    }
    
    // Try multiple comparison methods to handle type mismatches
    const talent = this.myCharacter.talents?.find(t => {
      return t.id === talentId || 
             Number(t.id) === talentId || 
             t.id === Number(talentId) ||
             String(t.id) === String(talentId);
    });
    
    if (!talent) {
      const errorMsg = `❌ Talent not found (ID: ${this.selectedTalentId})`;
      console.error('Talent not found');
      this.chatComponent.sendMessage(errorMsg);
      this.selectedTalentId = null;
      return;
    }

    // Parse check string (format: "MU/IN/GE" or "(MU/IN/GE)")
    const checkStr = talent.check || '';
    const cleanCheck = checkStr.replace(/[()]/g, '').trim();
    const properties = cleanCheck.split('/').map(p => p.trim());


    if (properties.length !== 3) {
      const message = `❌ Invalid talent check format: ${talent.check} (expected 3 properties, got ${properties.length})`;
      console.error('Invalid check format:', message);
      this.chatComponent.sendMessage(message);
      this.selectedTalentId = null;
      return;
    }

    if (!this.myCharacter.properties || this.myCharacter.properties.length === 0) {
      const message = `❌ Character properties not loaded`;
      console.error('Character properties not loaded');
      this.chatComponent.sendMessage(message);
      this.selectedTalentId = null;
      return;
    }

    // Map property abbreviations to property names
    const propertyMap: { [key: string]: string[] } = {
      'MU': ['Mut', 'Courage', 'MU'],
      'KL': ['Klugheit', 'Wisdom', 'KL'],
      'IN': ['Intuition', 'IN'],
      'CH': ['Charisma', 'CH'],
      'FF': ['Fingerfertigkeit', 'Dexterity', 'FF'],
      'GE': ['Gewandtheit', 'Agility', 'GE'],
      'KO': ['Konstitution', 'Constitution', 'KO'],
      'KK': ['Körperkraft', 'Strength', 'KK'],
      'MR': ['Magieresistenz', 'Magic Resistance', 'MR'],
      'LEP': ['Lebensenergie', 'Life', 'LEP'],
      'AUP': ['Ausdauer', 'Endurance', 'AUP'],
      'ASP': ['Astralenergie', 'Magic Energy', 'ASP'],
      'KE': ['Karmaenergie', 'Karma', 'KE'],
      'SO': ['Sozialstatus', 'Social Standing', 'SO']
    };

    // Get property values by abbreviation
    const getPropertyValue = (abbr: string): number => {
      const abbrUpper = abbr.toUpperCase().trim();
      const possibleNames = propertyMap[abbrUpper] || [abbrUpper];
      
      const prop = this.myCharacter!.properties!.find(p => {
        const propName = p.name.toUpperCase();
        return possibleNames.some(name => 
          propName === name.toUpperCase() || 
          propName.startsWith(name.toUpperCase()) ||
          propName.includes(name.toUpperCase())
        );
      });
      return prop?.value || 0;
    };

    // Apply modifiers according to Java logic:
    // mod += hero.getWounds()*2;
    // (Armor BE would be added here if applicable, but talents don't have BE)
    let accumulatedMod = mod; // Start with the mod parameter
    accumulatedMod += (this.myCharacter.wounds || 0) * 2;
    
    // Calculate totalMod = abilityValue - mod
    const totalMod = talent.value - accumulatedMod;
    
    // result = Math.max(totalMod, 0) - this is the INITIAL result
    let result = Math.max(totalMod, 0);
    
    // diff = totalMod < 0 ? -totalMod : 0
    const diff = totalMod < 0 ? -totalMod : 0;

    // Roll dice for each property (3 dice for talents)
    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;
    const roll3 = Math.floor(Math.random() * 20) + 1;

    const prop1Value = getPropertyValue(properties[0]);
    const prop2Value = getPropertyValue(properties[1]);
    const prop3Value = getPropertyValue(properties[2]);

    // Calculate result based on DSA logic
    // For each die: r = prop.getValue() - diff - diceRoll
    // result += Math.min(r, 0)
    const r1 = prop1Value - diff - roll1;
    const r2 = prop2Value - diff - roll2;
    const r3 = prop3Value - diff - roll3;
    
    result += Math.min(r1, 0);
    result += Math.min(r2, 0);
    result += Math.min(r3, 0);

    // Cap result at ability value
    if (result > talent.value) {
      result = talent.value;
    }
    
    const finalResult = result;

    // Format message similar to Java code
    // Format: "HeroName 🎲 TalentName (roll1|roll2|roll3) = result"
    const characterName = this.myCharacter.name;
    const talentName = talent.name;
    // Show modifier in message if non-zero
    const modStr = accumulatedMod !== 0 ? (accumulatedMod < 0 ? `${accumulatedMod}` : `+${accumulatedMod}`) : '';
    
    const message = `${characterName} 🎲 ${talentName} (${roll1}|${roll2}|${roll3})${modStr ? modStr : ''} = ${finalResult}`;

    // Use the same approach as regular dice rolls - send via chat component
    if (!this.chatComponent) {
      if (this.sessionId) {
        // Fallback to chat service if component not available
        this.chatService.sendMessage(this.sessionId, message).subscribe({
          error: (err: any) => console.error('Error sending message:', err)
        });
      }
    } else {
      try {
        this.chatComponent.sendMessage(message);
      } catch (error) {
        console.error('Error in sendMessage:', error);
      }
    }
    
    this.selectedTalentId = null;
  }

  quickModifyLife(amount: number): void {
    this.lifeModValue = (this.lifeModValue || 0) + amount;
  }

  modifyLife(): void {
    if (!this.myCharacter || !this.myCharacter.id || this.lifeModValue === 0) return;
    
    const newValue = (this.myCharacter.currentLife || 0) + this.lifeModValue;
    const updatedCharacter = { ...this.myCharacter, currentLife: Math.max(0, newValue) };
    
    this.characterService.updateCharacter(this.myCharacter.id, updatedCharacter).subscribe({
      next: (character: Character) => {
        this.myCharacter = character;
        const message = `${character.name} ${this.lifeModValue >= 0 ? '+' : ''}${this.lifeModValue} Life = ${character.currentLife}`;
        if (this.chatComponent) {
          this.chatComponent.sendMessage(message);
        }
        this.lifeModValue = 0;
        // Reload characters to update the list
        this.loadCharacters();
      },
      error: (err: any) => {
        console.error('Error updating life:', err);
      }
    });
  }

  quickModifyAsp(amount: number): void {
    this.aspModValue = (this.aspModValue || 0) + amount;
  }

  modifyAsp(): void {
    if (!this.myCharacter || !this.myCharacter.id || this.aspModValue === 0) return;
    
    const newValue = (this.myCharacter.currentAsp || 0) + this.aspModValue;
    const updatedCharacter = { ...this.myCharacter, currentAsp: Math.max(0, newValue) };
    
    this.characterService.updateCharacter(this.myCharacter.id, updatedCharacter).subscribe({
      next: (character: Character) => {
        this.myCharacter = character;
        const message = `${character.name} ${this.aspModValue >= 0 ? '+' : ''}${this.aspModValue} ASP = ${character.currentAsp}`;
        if (this.chatComponent) {
          this.chatComponent.sendMessage(message);
        }
        this.aspModValue = 0;
        // Reload characters to update the list
        this.loadCharacters();
      },
      error: (err: any) => {
        console.error('Error updating ASP:', err);
      }
    });
  }

  onWoundsFocus(): void {
    // Initialize with current wounds value when focusing
    if (this.myCharacter && this.woundsValue === null) {
      this.woundsValue = this.myCharacter.wounds ?? 0;
    }
  }

  setWounds(): void {
    if (!this.myCharacter || !this.myCharacter.id || this.woundsValue === null) {
      this.woundsValue = null;
      return;
    }
    
    const newValue = Math.max(0, this.woundsValue);
    const oldValue = this.myCharacter.wounds || 0;
    
    // Only update if the value actually changed
    if (newValue === oldValue) {
      this.woundsValue = null;
      return;
    }
    
    const updatedCharacter = { ...this.myCharacter, wounds: newValue };
    
    this.characterService.updateCharacter(this.myCharacter.id, updatedCharacter).subscribe({
      next: (character: Character) => {
        this.myCharacter = character;
        const change = newValue - oldValue;
        const message = `${character.name} ${change >= 0 ? '+' : ''}${change} Wounds = ${character.wounds}`;
        if (this.chatComponent) {
          this.chatComponent.sendMessage(message);
        }
        this.woundsValue = null;
        // Reload characters to update the list
        this.loadCharacters();
      },
      error: (err: any) => {
        console.error('Error updating wounds:', err);
        this.woundsValue = null;
      }
    });
  }

  quickModifyBe(amount: number): void {
    this.beModValue = (this.beModValue || 0) + amount;
  }

  modifyBe(): void {
    if (!this.myCharacter || !this.myCharacter.id || !this.myCharacter.wearingArmour || this.beModValue === 0) return;
    
    const newValue = (this.myCharacter.armourBe || 0) + this.beModValue;
    const updatedCharacter = { ...this.myCharacter, armourBe: Math.max(0, newValue) };
    
    this.characterService.updateCharacter(this.myCharacter.id, updatedCharacter).subscribe({
      next: (character: Character) => {
        this.myCharacter = character;
        const message = `${character.name} ${this.beModValue >= 0 ? '+' : ''}${this.beModValue} BE = ${character.armourBe}`;
        if (this.chatComponent) {
          this.chatComponent.sendMessage(message);
        }
        this.beModValue = 0;
        // Reload characters to update the list
        this.loadCharacters();
      },
      error: (err: any) => {
        console.error('Error updating BE:', err);
      }
    });
  }

  performRest(): void {
    if (!this.myCharacter || !this.myCharacter.id) return;
    
    // Rest typically restores some life and ASP
    // For now, we'll restore 1 Life and 1 ASP per rest
    const newLife = Math.min((this.myCharacter.currentLife || 0) + 1, this.getMaxLife());
    const newAsp = Math.min((this.myCharacter.currentAsp || 0) + 1, this.getMaxAsp());
    const updatedCharacter = { 
      ...this.myCharacter, 
      currentLife: newLife,
      currentAsp: newAsp
    };
    
    this.characterService.updateCharacter(this.myCharacter.id, updatedCharacter).subscribe({
      next: (character: Character) => {
        this.myCharacter = character;
        const message = `${character.name} 🛌 Rest: +1 Life (${character.currentLife}), +1 ASP (${character.currentAsp})`;
        if (this.chatComponent) {
          this.chatComponent.sendMessage(message);
        }
        // Reload characters to update the list
        this.loadCharacters();
      },
      error: (err: any) => {
        console.error('Error performing rest:', err);
      }
    });
  }

  getMaxLife(): number {
    // Get max life from properties (LEP - Lebensenergie)
    if (!this.myCharacter?.properties) return 999;
    const lep = this.myCharacter.properties.find(p => 
      p.name.toUpperCase().includes('LEP') || 
      p.name.toUpperCase().includes('LEBENSENERGIE') ||
      p.name.toUpperCase().includes('LIFE')
    );
    return lep?.value || 999;
  }

  getMaxAsp(): number {
    // Get max ASP from properties (ASP - Astralenergie)
    if (!this.myCharacter?.properties) return 999;
    const asp = this.myCharacter.properties.find(p => 
      p.name.toUpperCase().includes('ASP') || 
      p.name.toUpperCase().includes('ASTRALENERGIE') ||
      p.name.toUpperCase().includes('MAGIC')
    );
    return asp?.value || 999;
  }

  getAvatarUrl(character: Character): string {
    if (character.avatarUrl && character.avatarUrl.trim() !== '') {
      // If it's a relative URL, prepend the API base URL
      if (character.avatarUrl.startsWith('/')) {
        return `${environment.apiUrl}${character.avatarUrl.replace('/api', '')}`;
      }
      return character.avatarUrl;
    }
    return `${environment.apiUrl}/char`;
  }

  getLifePercentage(character: Character): number {
    if (!character.totalLife || character.totalLife === 0) {
      return 100;
    }
    const current = character.currentLife ?? 0;
    return Math.max(0, Math.min(100, (current / character.totalLife) * 100));
  }

  isMyCharacter(character: Character): boolean {
    return character.ownerId === this.currentUserId;
  }

  isOwnerOnline(character: Character): boolean {
    if (!character.ownerId || !this.session?.players) {
      return false;
    }
    // Check if the character owner is in the session players list
    return this.session.players.some(player => player.id === character.ownerId);
  }

  getCharacterNameClass(character: Character): string {
    // Priority: own character (blue) takes precedence over online owner (green)
    if (this.isMyCharacter(character)) {
      return 'character-name-own';
    }
    if (this.isOwnerOnline(character)) {
      return 'character-name-online';
    }
    return '';
  }

  getCharacterOwnerName(character: Character): string {
    if (!character.ownerId) {
      return '';
    }
    // First check the session players (for active players)
    if (this.session?.players) {
      const owner = this.session.players.find(p => p.id === character.ownerId);
      if (owner?.displayName) {
        return owner.displayName;
      }
    }
    // Then check the cached owner names
    return this.ownerNames.get(character.ownerId) || '';
  }

  onCharacterDragStart(event: DragEvent, character: Character): void {
    if (!event.dataTransfer || !character.id) return;
    
    // Store character data in the drag event
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify({
      characterId: character.id,
      characterName: character.name,
      avatarUrl: this.getAvatarUrl(character)
    }));
    
    // Create a custom drag image (optional - can use the avatar itself)
    if (event.target instanceof HTMLImageElement) {
      const dragImage = event.target.cloneNode(true) as HTMLImageElement;
      dragImage.style.width = '40px';
      dragImage.style.height = '40px';
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      event.dataTransfer.setDragImage(dragImage, 20, 20);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  }

  onCharacterDragEnd(event: DragEvent): void {
    // Cleanup if needed
  }
}

