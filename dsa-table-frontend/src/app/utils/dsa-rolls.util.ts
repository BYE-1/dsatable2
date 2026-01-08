import { CombatTalent, Weapon } from '../models/character.model';

export interface AttackParryContext {
  heroName: string;
  wearingArmour: boolean;
  armourBe: number;
  wounds: number;
}

/**
 * Pure DSA-style AT/PA roll logic mirrored from the backend rollAtPa method.
 * Returns the final chat message to display.
 */
export function rollAttackOrParry(
  context: AttackParryContext,
  weapon: Weapon,
  combatTalent: CombatTalent,
  isAttack: boolean,
  mod: number = 0,
  bonusDmg: number = 0
): string {
  const hero = context;
  let value: number;
  let dmg = (weapon.damageBonus || 0) + bonusDmg;
  const applyBe = !!hero.wearingArmour;
  const armourBe = hero.armourBe || 0;

  if (isAttack) {
    // Attack branch: mod += BE/2, wounds*2
    if (applyBe) {
      mod += Math.floor(armourBe / 2);
    }
    mod += (hero.wounds || 0) * 2;

    value = (combatTalent.attack || 0) + (weapon.atMod || 0) - mod;

    // Roll damage dice: numberOfDice x d6
    const diceCount = weapon.numberOfDice && weapon.numberOfDice > 0 ? weapon.numberOfDice : 1;
    for (let i = 0; i < diceCount; i++) {
      dmg += randomD(6);
    }

    // Attack d20 roll
    const atRoll = randomD(20);

    const critRoll = () => randomD(20);
    let critMsg = '';
    if (atRoll === 1) {
      const c = critRoll();
      if (c <= value) {
        critMsg = 'kritisch ';
        dmg *= 2;
      } else {
        critMsg = 'nicht kritisch ';
      }
    }

    let fail = '';
    if (atRoll === 20) {
      const c = critRoll();
      if (c > value) {
        fail = ' (Patzer)';
      } else {
        fail = ' (Kein Patzer)';
      }
    }

    const sb: string[] = [];
    sb.push(`${hero.heroName}s `);
    sb.push(`${weapon.name}-Angriff `);
    if (mod !== 0) {
      sb.push(String(mod));
      sb.push(' ');
    }
    sb.push('(');
    sb.push(String(atRoll));
    if (applyBe) {
      sb.push('b');
    }
    sb.push(') ');

    if (atRoll <= value && atRoll !== 20) {
      sb.push('trifft ');
      sb.push(critMsg);
      sb.push('mit ');
      sb.push(String(dmg));
      sb.push(' Schaden');
    } else {
      sb.push('verfehlt');
      sb.push(fail);
    }

    return sb.join('');
  } else {
    // Parry branch: mod += BE/2 + BE%2, wounds*2
    if (applyBe) {
      mod += Math.floor(armourBe / 2) + (armourBe % 2);
    }
    mod += (hero.wounds || 0) * 2;

    value = (combatTalent.parry || 0) + (weapon.paMod || 0) - mod;

    const paRoll = randomD(20);
    const rollStr = `${paRoll}${applyBe ? 'b' : ''}`;

    const success = paRoll <= value;
    return `${hero.heroName}s Parade (${rollStr}) ` +
      (success ? ' war erfolgreich ' : 'schlägt fehl');
  }
}

export function randomD(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}


