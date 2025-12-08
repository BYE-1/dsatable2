import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

export interface AvatarOptions {
  hair: string;
  skin: string;
  clothC: string;
  hairColour: string;
  mouth: string;
  ears: string;
  eyebrows: string;
  weapon: string;
  equip: string[];
}

export interface AvatarPreset {
  name: string;
  options: AvatarOptions;
}

@Component({
  selector: 'app-avatar-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avatar-editor.component.html',
  styleUrl: './avatar-editor.component.scss'
})
export class AvatarEditorComponent implements OnInit {
  @Input() initialAvatarUrl?: string;
  @Input() showBorderColor: boolean = false;
  @Input() borderColor: string = '#ffffff';
  @Input() compact: boolean = false;
  @Input() title: string = 'Edit Avatar';
  
  @Output() avatarSaved = new EventEmitter<{ avatarUrl: string; borderColor?: string }>();
  @Output() canceled = new EventEmitter<void>();

  avatarOptions: AvatarOptions = {
    hair: '',
    skin: '#ffd9b5',
    clothC: '#00cc00',
    hairColour: '#f3bf00',
    mouth: 'up',
    ears: 'none',
    eyebrows: 'none',
    weapon: 'none',
    equip: []
  };

  currentBorderColor: string = '#ffffff';
  selectedPreset: string = 'custom';

  predefinedPresets: AvatarPreset[] = [
    {
      name: 'Custom',
      options: {
        hair: '',
        skin: '#ffd9b5',
        clothC: '#00cc00',
        hairColour: '#f3bf00',
        mouth: 'up',
        ears: 'none',
        eyebrows: 'none',
        weapon: 'none',
        equip: []
      }
    },
    {
      name: 'Warrior',
      options: {
        hair: 'short_ruffled',
        skin: '#ffd9b5',
        clothC: '#979695',
        hairColour: '#654321',
        mouth: 'straight',
        ears: 'normal',
        eyebrows: 'straight',
        weapon: 'sword',
        equip: ['shoulder_pads', 'helmet']
      }
    },
    {
      name: 'Mage',
      options: {
        hair: 'long',
        skin: '#ffd9b5',
        clothC: '#4b0082',
        hairColour: '#ffffff',
        mouth: 'up',
        ears: 'pointy',
        eyebrows: 'straight',
        weapon: 'mage_staff',
        equip: []
      }
    },
    {
      name: 'Ranger',
      options: {
        hair: 'undercut',
        skin: '#d4a574',
        clothC: '#228b22',
        hairColour: '#8b4513',
        mouth: 'straight',
        ears: 'normal',
        eyebrows: 'straight',
        weapon: 'bow',
        equip: []
      }
    },
    {
      name: 'Barbarian',
      options: {
        hair: 'tomahawk',
        skin: '#d4a574',
        clothC: '#8b0000',
        hairColour: '#000000',
        mouth: 'down',
        ears: 'normal',
        eyebrows: 'down',
        weapon: 'axe',
        equip: ['shoulder_pads']
      }
    },
    {
      name: 'Rogue',
      options: {
        hair: 'short_curly',
        skin: '#ffd9b5',
        clothC: '#2f2f2f',
        hairColour: '#000000',
        mouth: 'straight',
        ears: 'normal',
        eyebrows: 'straight',
        weapon: 'sword',
        equip: []
      }
    },
    {
      name: 'Bandit',
      options: {
        hair: 'bald',
        skin: '#ffd9b5',
        clothC: '#812709',
        hairColour: '#000000',
        mouth: 'covered',
        ears: 'none',
        eyebrows: 'down',
        weapon: 'axe',
        equip: []
      }
    },
    {
      name: 'Goblin (green)',
      options: {
        hair: 'bald',
        skin: '#1ca800',
        clothC: '#812709',
        hairColour: '#000000',
        mouth: 'up',
        ears: 'pointy',
        eyebrows: 'down',
        weapon: 'sword',
        equip: []
      }
    },
    {
      name: 'Goblin (red)',
      options: {
        hair: 'bald',
        skin: '#db1600',
        clothC: '#812709',
        hairColour: '#000000',
        mouth: 'up',
        ears: 'pointy',
        eyebrows: 'down',
        weapon: 'sword',
        equip: []
      }
    }
  ];

  ngOnInit(): void {
    this.currentBorderColor = this.borderColor;
    
    // Parse existing avatar URL if provided
    if (this.initialAvatarUrl && this.initialAvatarUrl.includes('?')) {
      try {
        const url = new URL(this.initialAvatarUrl, window.location.origin);
        this.avatarOptions.hair = url.searchParams.get('hair') || '';
        this.avatarOptions.skin = url.searchParams.get('skin') || '#ffd9b5';
        this.avatarOptions.clothC = url.searchParams.get('clothC') || '#00cc00';
        this.avatarOptions.hairColour = url.searchParams.get('hairColour') || '#f3bf00';
        this.avatarOptions.mouth = url.searchParams.get('mouth') || 'up';
        this.avatarOptions.ears = url.searchParams.get('ears') || 'none';
        this.avatarOptions.eyebrows = url.searchParams.get('eyebrows') || 'none';
        this.avatarOptions.weapon = url.searchParams.get('weapon') || 'none';
        const equipParam = url.searchParams.get('equip');
        this.avatarOptions.equip = equipParam ? equipParam.split(',') : [];
      } catch (e) {
        // If URL parsing fails, reset to defaults
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
    
    // Check if current options match any preset
    this.detectPreset();
  }

  private detectPreset(): void {
    for (const preset of this.predefinedPresets) {
      if (preset.name !== 'Custom' && this.optionsMatch(preset.options, this.avatarOptions)) {
        this.selectedPreset = preset.name;
        return;
      }
    }
    this.selectedPreset = 'custom';
  }

  resetToDefaults(): void {
    this.avatarOptions = {
      hair: '',
      skin: '#ffd9b5',
      clothC: '#00cc00',
      hairColour: '#f3bf00',
      mouth: 'up',
      ears: 'none',
      eyebrows: 'none',
      weapon: 'none',
      equip: []
    };
  }

  toggleEquip(equip: string): void {
    const index = this.avatarOptions.equip.indexOf(equip);
    if (index > -1) {
      this.avatarOptions.equip.splice(index, 1);
    } else {
      this.avatarOptions.equip.push(equip);
    }
    this.checkPresetMatch();
  }

  onOptionChange(): void {
    this.checkPresetMatch();
  }

  private checkPresetMatch(): void {
    if (this.selectedPreset === 'custom') {
      return;
    }
    
    const preset = this.predefinedPresets.find(p => p.name === this.selectedPreset);
    if (preset) {
      const matches = this.optionsMatch(preset.options, this.avatarOptions);
      if (!matches) {
        this.selectedPreset = 'custom';
      }
    }
  }

  private optionsMatch(preset: AvatarOptions, current: AvatarOptions): boolean {
    return preset.hair === current.hair &&
           preset.skin === current.skin &&
           preset.clothC === current.clothC &&
           preset.hairColour === current.hairColour &&
           preset.mouth === current.mouth &&
           preset.ears === current.ears &&
           preset.eyebrows === current.eyebrows &&
           preset.weapon === current.weapon &&
           preset.equip.length === current.equip.length &&
           preset.equip.every(e => current.equip.includes(e));
  }

  isEquipSelected(equip: string): boolean {
    return this.avatarOptions.equip.includes(equip);
  }

  onPresetChange(): void {
    if (this.selectedPreset === 'custom') {
      return;
    }
    
    const preset = this.predefinedPresets.find(p => p.name === this.selectedPreset);
    if (preset) {
      this.avatarOptions = { ...preset.options };
    }
  }

  getPreviewUrl(): string {
    const params = new URLSearchParams();
    if (this.avatarOptions.hair) params.set('hair', this.avatarOptions.hair);
    if (this.avatarOptions.skin) params.set('skin', this.avatarOptions.skin);
    if (this.avatarOptions.clothC) params.set('clothC', this.avatarOptions.clothC);
    if (this.avatarOptions.hairColour) params.set('hairColour', this.avatarOptions.hairColour);
    if (this.avatarOptions.mouth) params.set('mouth', this.avatarOptions.mouth);
    if (this.avatarOptions.ears) params.set('ears', this.avatarOptions.ears);
    if (this.avatarOptions.eyebrows) params.set('eyebrows', this.avatarOptions.eyebrows);
    if (this.avatarOptions.weapon) params.set('weapon', this.avatarOptions.weapon);
    if (this.avatarOptions.equip.length > 0) {
      params.set('equip', this.avatarOptions.equip.join(','));
    }
    const queryString = params.toString();
    return `${environment.apiUrl}/char${queryString ? '?' + queryString : ''}`;
  }

  buildAvatarUrl(): string {
    const params = new URLSearchParams();
    if (this.avatarOptions.hair) params.set('hair', this.avatarOptions.hair);
    if (this.avatarOptions.skin !== '#ffd9b5') params.set('skin', this.avatarOptions.skin);
    if (this.avatarOptions.clothC !== '#00cc00') params.set('clothC', this.avatarOptions.clothC);
    if (this.avatarOptions.hairColour !== '#f3bf00') params.set('hairColour', this.avatarOptions.hairColour);
    if (this.avatarOptions.mouth !== 'up') params.set('mouth', this.avatarOptions.mouth);
    if (this.avatarOptions.ears !== 'none') params.set('ears', this.avatarOptions.ears);
    if (this.avatarOptions.eyebrows !== 'none') params.set('eyebrows', this.avatarOptions.eyebrows);
    if (this.avatarOptions.weapon !== 'none') params.set('weapon', this.avatarOptions.weapon);
    if (this.avatarOptions.equip.length > 0) {
      params.set('equip', this.avatarOptions.equip.join(','));
    }
    const queryString = params.toString();
    return queryString ? `/api/char?${queryString}` : '/api/char';
  }

  onSave(): void {
    const avatarUrl = this.buildAvatarUrl();
    const result: { avatarUrl: string; borderColor?: string } = { avatarUrl };
    
    if (this.showBorderColor) {
      result.borderColor = this.currentBorderColor;
    }
    
    this.avatarSaved.emit(result);
  }

  onCancel(): void {
    this.canceled.emit();
  }
  
  // Expose for external save button if needed
  save(): void {
    this.onSave();
  }
}
