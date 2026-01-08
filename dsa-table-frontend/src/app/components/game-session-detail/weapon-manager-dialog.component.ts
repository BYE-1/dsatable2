import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character, Weapon } from '../../models/character.model';

@Component({
  selector: 'app-weapon-manager-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weapon-manager-dialog.component.html',
  styleUrl: './weapon-manager-dialog.component.scss'
})
export class WeaponManagerDialogComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Input() character: Character | null = null;
  @Input() weapons: Weapon[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Weapon[]>();

  editableWeapons: Weapon[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] || changes['weapons']) {
      if (this.visible) {
        // Deep copy weapons into editable list when dialog opens
        this.editableWeapons = (this.weapons || []).map(w => ({ ...w }));
      } else {
        this.editableWeapons = [];
      }
    }
  }

  addWeaponRow(): void {
    this.editableWeapons.push({
      name: '',
      atMod: 0,
      paMod: 0,
      numberOfDice: 1,
      damageBonus: 0,
      iniMod: 0,
      combatTalent: ''
    });
  }

  removeWeaponRow(index: number): void {
    if (index < 0 || index >= this.editableWeapons.length) return;
    this.editableWeapons.splice(index, 1);
  }

  cancel(): void {
    this.closed.emit();
  }

  save(): void {
    // Remove rows without a name
    const cleaned = this.editableWeapons.filter(w => (w.name || '').trim().length > 0);

    // Normalize numeric fields and combat talent string
    const normalized: Weapon[] = cleaned.map(w => ({
      ...w,
      atMod: Number(w.atMod) || 0,
      paMod: Number(w.paMod) || 0,
      numberOfDice: Math.max(1, Number(w.numberOfDice) || 1),
      damageBonus: Number(w.damageBonus) || 0,
      iniMod: Number(w.iniMod) || 0,
      combatTalent: (w.combatTalent || '').trim()
    }));

    this.saved.emit(normalized);
  }
}


