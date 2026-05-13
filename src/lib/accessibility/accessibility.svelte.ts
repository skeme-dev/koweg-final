/**
 * Barrierefreiheits-Store (Svelte 5 Runes)
 *
 * Speichert alle A11y-Einstellungen in localStorage und wendet
 * entsprechende CSS-Klassen auf das <html>-Element an.
 */

import { browser } from '$app/environment';

export type FontScale = 100 | 115 | 130 | 150;

export interface A11ySettings {
	fontScale: FontScale;
	highContrast: boolean;
	dyslexiaFont: boolean;
	reduceMotion: boolean;
	highlightLinks: boolean;
	largeCursor: boolean;
}

const STORAGE_KEY = 'koweg-a11y-settings';

const DEFAULTS: A11ySettings = {
	fontScale: 100,
	highContrast: false,
	dyslexiaFont: false,
	reduceMotion: false,
	highlightLinks: false,
	largeCursor: false
};

function loadInitial(): A11ySettings {
	if (!browser) return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		const parsed = JSON.parse(raw) as Partial<A11ySettings>;
		return { ...DEFAULTS, ...parsed };
	} catch {
		return { ...DEFAULTS };
	}
}

function createA11yStore() {
	const state = $state<A11ySettings>(loadInitial());

	function persist() {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			/* Quota oder disabled – einfach ignorieren */
		}
	}

	function applyToDocument() {
		if (!browser) return;
		const html = document.documentElement;

		// Font scale
		html.classList.remove('a11y-font-115', 'a11y-font-130', 'a11y-font-150');
		if (state.fontScale === 115) html.classList.add('a11y-font-115');
		else if (state.fontScale === 130) html.classList.add('a11y-font-130');
		else if (state.fontScale === 150) html.classList.add('a11y-font-150');

		html.classList.toggle('a11y-high-contrast', state.highContrast);
		html.classList.toggle('a11y-dyslexia', state.dyslexiaFont);
		html.classList.toggle('a11y-reduce-motion', state.reduceMotion);
		html.classList.toggle('a11y-highlight-links', state.highlightLinks);
		html.classList.toggle('a11y-large-cursor', state.largeCursor);
	}

	return {
		get settings() {
			return state;
		},
		set fontScale(v: FontScale) {
			state.fontScale = v;
			persist();
			applyToDocument();
		},
		setFontScale(v: FontScale) {
			state.fontScale = v;
			persist();
			applyToDocument();
		},
		toggle(key: keyof Omit<A11ySettings, 'fontScale'>) {
			state[key] = !state[key];
			persist();
			applyToDocument();
		},
		reset() {
			Object.assign(state, DEFAULTS);
			persist();
			applyToDocument();
		},
		/** Einmalig nach Mount vom Client aufrufen, damit die Klassen gesetzt werden. */
		hydrate() {
			if (!browser) return;
			// Respektiere System-Präferenz für reduzierte Animationen, wenn noch nichts gespeichert ist
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
				state.reduceMotion = true;
			}
			applyToDocument();
		}
	};
}

export const a11y = createA11yStore();
