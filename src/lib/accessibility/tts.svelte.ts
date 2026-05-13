/**
 * Text-to-Speech Service auf Basis der Web Speech API.
 *
 * Liest den Inhalt des <main>-Elements (oder einen übergebenen Text)
 * in deutscher Sprache vor. Funktioniert offline und ist kostenlos.
 */

import { browser } from '$app/environment';

export type TTSStatus = 'idle' | 'speaking' | 'paused';

interface TTSState {
	status: TTSStatus;
	rate: number;
	pitch: number;
	volume: number;
	supported: boolean;
	voices: SpeechSynthesisVoice[];
	selectedVoiceURI: string | null;
}

function createTTS() {
	const state = $state<TTSState>({
		status: 'idle',
		rate: 1,
		pitch: 1,
		volume: 1,
		supported: false,
		voices: [],
		selectedVoiceURI: null
	});

	let currentUtterance: SpeechSynthesisUtterance | null = null;

	function loadVoices() {
		if (!browser || !('speechSynthesis' in window)) return;
		const all = window.speechSynthesis.getVoices();
		// Bevorzuge deutsche Stimmen
		const german = all.filter((v: SpeechSynthesisVoice) =>
			v.lang?.toLowerCase().startsWith('de')
		);
		state.voices = german.length > 0 ? german : all;
		if (!state.selectedVoiceURI && state.voices.length > 0) {
			// Wenn möglich eine lokale deutsche Stimme bevorzugen
			const preferred =
				state.voices.find(
					(v: SpeechSynthesisVoice) => v.lang?.toLowerCase().startsWith('de') && v.localService
				) ||
				state.voices.find((v: SpeechSynthesisVoice) =>
					v.lang?.toLowerCase().startsWith('de')
				) ||
				state.voices[0];
			state.selectedVoiceURI = preferred?.voiceURI ?? null;
		}
	}

	function init() {
		if (!browser) return;
		if (!('speechSynthesis' in window)) {
			state.supported = false;
			return;
		}
		state.supported = true;
		loadVoices();
		// Stimmen werden asynchron geladen
		window.speechSynthesis.onvoiceschanged = () => loadVoices();
	}

	/** Extrahiert lesbaren Text aus einem Container. Überschriften werden mit Pausen versehen. */
	function extractReadableText(root: HTMLElement): string {
		// Klonen, damit wir destruktive Operationen machen können
		const clone = root.cloneNode(true) as HTMLElement;
		// Unerwünschte Elemente entfernen
		const kill = clone.querySelectorAll(
			'script, style, noscript, nav, [aria-hidden="true"], [data-tts-skip], .a11y-widget, svg, button[aria-label]'
		);
		kill.forEach((el) => el.remove());
		// Nach Überschriften kleine Pausen einfügen
		clone.querySelectorAll('h1, h2, h3, h4, h5, h6, li, p').forEach((el) => {
			el.textContent = (el.textContent ?? '').trim() + '. ';
		});
		return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
	}

	function speak(text: string) {
		if (!browser || !state.supported) return;
		stop();
		if (!text) return;

		// Lange Texte in Chunks teilen (einige Browser brechen bei > ~200 Zeichen ab)
		const chunks = splitIntoChunks(text, 200);
		let i = 0;

		const speakNext = () => {
			if (i >= chunks.length) {
				state.status = 'idle';
				currentUtterance = null;
				return;
			}
			const utter = new SpeechSynthesisUtterance(chunks[i]);
			utter.lang = 'de-DE';
			utter.rate = state.rate;
			utter.pitch = state.pitch;
			utter.volume = state.volume;
			const voice = state.voices.find(
				(v: SpeechSynthesisVoice) => v.voiceURI === state.selectedVoiceURI
			);
			if (voice) utter.voice = voice;
			utter.onend = () => {
				i++;
				speakNext();
			};
			utter.onerror = () => {
				state.status = 'idle';
				currentUtterance = null;
			};
			currentUtterance = utter;
			window.speechSynthesis.speak(utter);
		};

		state.status = 'speaking';
		speakNext();
	}

	function splitIntoChunks(text: string, max: number): string[] {
		const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
		const out: string[] = [];
		let buf = '';
		for (const s of sentences) {
			if ((buf + s).length > max) {
				if (buf) out.push(buf.trim());
				buf = s;
			} else {
				buf += s;
			}
		}
		if (buf.trim()) out.push(buf.trim());
		return out;
	}

	function readMain() {
		if (!browser) return;
		const main = document.querySelector('main');
		if (!main) return;
		const text = extractReadableText(main as HTMLElement);
		speak(text);
	}

	function readSelection() {
		if (!browser) return;
		const sel = window.getSelection()?.toString().trim();
		if (sel) {
			speak(sel);
			return true;
		}
		return false;
	}

	function pause() {
		if (!browser || !state.supported) return;
		if (state.status === 'speaking') {
			window.speechSynthesis.pause();
			state.status = 'paused';
		}
	}

	function resume() {
		if (!browser || !state.supported) return;
		if (state.status === 'paused') {
			window.speechSynthesis.resume();
			state.status = 'speaking';
		}
	}

	function stop() {
		if (!browser || !state.supported) return;
		window.speechSynthesis.cancel();
		state.status = 'idle';
		currentUtterance = null;
	}

	function setRate(v: number) {
		state.rate = Math.min(2, Math.max(0.5, v));
	}

	function setVoice(uri: string) {
		state.selectedVoiceURI = uri;
	}

	return {
		get state() {
			return state;
		},
		init,
		speak,
		readMain,
		readSelection,
		pause,
		resume,
		stop,
		setRate,
		setVoice
	};
}

export const tts = createTTS();
