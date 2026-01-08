export interface Character {
  id?: number;
  name: string;
  race?: string;
  culture?: string;
  profession?: string;
  gender?: string;
  archetype?: string;
  xp?: number;
  currentLife?: number;
  totalLife?: number;
  currentAsp?: number;
  currentKarma?: number;
  initiative?: number;
  armourBe?: number;
  wearingArmour?: boolean;
  wounds?: number;
  notes?: string;
  avatarUrl?: string;
  ownerId?: number;
  properties?: HeroProperty[];
  talents?: Talent[];
  spells?: Spell[];
  combatTalents?: CombatTalent[];
  weapons?: Weapon[];
  advantages?: Advantage[];
  specialities?: Speciality[];
}

export interface HeroProperty {
  id?: number;
  name: string;
  value: number;
}

export interface Talent {
  id?: number;
  name: string;
  check: string;
  value: number;
}

export interface Spell {
  id?: number;
  name: string;
  check: string;
  value: number;
}

export interface CombatTalent {
  id?: number;
  name: string;
  attack: number;
  parry: number;
}

export interface Weapon {
  id?: number;
  name: string;
  atMod: number;
  paMod: number;
  numberOfDice: number;
  damageBonus: number;
  iniMod: number;
  combatTalent: string;
}

export interface Advantage {
  id?: number;
  name: string;
  text?: string;
  additionalText?: string[];
}

export interface Speciality {
  id?: number;
  name: string;
}


