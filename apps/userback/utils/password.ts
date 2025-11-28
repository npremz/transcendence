import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

/**
 * Hash un mot de passe avec PBKDF2
 */
export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const iterations = 120000;
	const digest = 'sha512';
	const hash = pbkdf2Sync(password, salt, iterations, 64, digest).toString('hex');

	return `pbkdf2$${digest}$${iterations}$${salt}$${hash}`;
}

/**
 * Vérifie un mot de passe contre son hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
	try {
		const parts = storedHash.split('$');
		if (parts.length !== 5 || parts[0] !== 'pbkdf2') {
			return false;
		}

		const [, digest, iterationsStr, salt, hash] = parts;
		const iterations = parseInt(iterationsStr, 10);

		if (isNaN(iterations)) {
			return false;
		}

		const verifyHash = pbkdf2Sync(password, salt, iterations, 64, digest).toString('hex');
		
		// Utilise timingSafeEqual pour éviter les timing attacks
		const storedBuffer = Buffer.from(hash, 'hex');
		const verifyBuffer = Buffer.from(verifyHash, 'hex');

		if (storedBuffer.length !== verifyBuffer.length) {
			return false;
		}

		return timingSafeEqual(storedBuffer, verifyBuffer);
	} catch (error) {
		return false;
	}
}

/**
 * Valide la force d'un mot de passe
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
	if (password.length < 6) {
		return { valid: false, error: 'password must be at least 6 characters' };
	}

	if (!/\d/.test(password)) {
		return { valid: false, error: 'password must include at least one digit' };
	}

	if (!/[A-Z]/.test(password)) {
		return { valid: false, error: 'password must include at least one uppercase letter' };
	}

	return { valid: true };
}
