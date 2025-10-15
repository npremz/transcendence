import type { GameState, Side, SkillType } from "./types";
import { SMASH_COOLDOWN, SMASH_TIMING_WINDOW, SMASH_SPEED_MULTIPLIER, DASH_COOLDOWN, DASH_DURATION, DASH_SPEED } from "./constants";

export const activateSkill = (state: GameState, side: Side): void => {
	const skillType = state.selectedSkills[side];
	const skill = state.skillStates[side];
	
	if (state.clock < skill.availableAt) {
		return;
	}

	const cooldown = skillType === 'smash' ? SMASH_COOLDOWN : DASH_COOLDOWN;
	skill.lastActivationAt = state.clock;
	skill.availableAt = state.clock + cooldown;
	skill.lastPressAt = state.clock;
};

export const isSmashActive = (state: GameState, side: Side): boolean => {
	if (state.selectedSkills[side] !== 'smash') return false;
	const skill = state.skillStates[side];
	return (state.clock - skill.lastActivationAt) <= SMASH_TIMING_WINDOW;
};

export const isDashActive = (state: GameState, side: Side): boolean => {
	if (state.selectedSkills[side] !== 'dash') return false;
	const skill = state.skillStates[side];
	return (state.clock - skill.lastActivationAt) <= DASH_DURATION;
};

export const getSmashSpeedMultiplier = (): number => {
	return SMASH_SPEED_MULTIPLIER;
};

export const getDashSpeed = (): number => {
	return DASH_SPEED;
};

export const getSkillCooldown = (skillType: SkillType): number => {
	return skillType === 'smash' ? SMASH_COOLDOWN : DASH_COOLDOWN;
};

