<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Accessibility,
		Play,
		Pause,
		Square,
		Volume2,
		Type,
		Contrast,
		Zap,
		Link as LinkIcon,
		MousePointer2,
		RotateCcw,
		X,
		BookOpen
	} from '@lucide/svelte';
	import { a11y, type FontScale } from '$lib/accessibility/accessibility.svelte';
	import { tts } from '$lib/accessibility/tts.svelte';

	let open = $state(false);
	let panelEl: HTMLDivElement | null = $state(null);
	let buttonEl: HTMLButtonElement | null = $state(null);

	onMount(() => {
		a11y.hydrate();
		tts.init();
	});

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
		buttonEl?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			close();
		}
	}

	function onClickOutside(e: MouseEvent) {
		if (!open) return;
		const target = e.target as Node;
		if (panelEl && !panelEl.contains(target) && buttonEl && !buttonEl.contains(target)) {
			open = false;
		}
	}

	const fontOptions: { value: FontScale; label: string }[] = [
		{ value: 100, label: 'A' },
		{ value: 115, label: 'A+' },
		{ value: 130, label: 'A++' },
		{ value: 150, label: 'A+++' }
	];

	function handleReadPage() {
		if (tts.state.status === 'speaking') {
			tts.pause();
		} else if (tts.state.status === 'paused') {
			tts.resume();
		} else {
			// Erst versuchen eine markierte Stelle zu lesen, sonst den gesamten Main-Inhalt
			if (!tts.readSelection()) {
				tts.readMain();
			}
		}
	}
</script>

<svelte:window on:keydown={onKeydown} on:click={onClickOutside} />

<div class="a11y-widget fixed bottom-4 right-4 z-[9999]">
	<!-- Toggle Button -->
	<button
		bind:this={buttonEl}
		type="button"
		onclick={toggle}
		aria-label={open ? 'Barrierefreiheit-Menü schließen' : 'Barrierefreiheit-Menü öffnen'}
		aria-expanded={open}
		aria-controls="a11y-panel"
		class="flex size-14 items-center justify-center rounded-full bg-[#161a4e] text-white shadow-lg ring-2 ring-white/20 transition-transform hover:scale-105 hover:bg-[#0f1338] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400"
	>
		<Accessibility class="size-7" />
	</button>

	<!-- Panel -->
	{#if open}
		<div
			bind:this={panelEl}
			id="a11y-panel"
			role="dialog"
			aria-label="Barrierefreiheit-Einstellungen"
			aria-modal="false"
			class="a11y-widget absolute bottom-16 right-0 w-[min(22rem,90vw)] max-h-[80vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl"
			style="color:#1a1a1a;"
		>
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
				<h2 class="text-lg font-bold" style="font-family: system-ui, sans-serif;">
					Barrierefreiheit
				</h2>
				<button
					type="button"
					onclick={close}
					aria-label="Menü schließen"
					class="rounded p-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
				>
					<X class="size-5" />
				</button>
			</div>

			<!-- Vorlesen (TTS) -->
			<section class="mb-5" aria-labelledby="a11y-tts-heading">
				<h3
					id="a11y-tts-heading"
					class="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600"
				>
					<Volume2 class="size-4" /> Vorlesen
				</h3>
				{#if tts.state.supported}
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							onclick={handleReadPage}
							class="flex items-center gap-2 rounded-lg bg-[#161a4e] px-3 py-2 text-sm font-medium text-white hover:bg-[#0f1338] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
						>
							{#if tts.state.status === 'speaking'}
								<Pause class="size-4" /> Pause
							{:else if tts.state.status === 'paused'}
								<Play class="size-4" /> Fortsetzen
							{:else}
								<BookOpen class="size-4" /> Seite vorlesen
							{/if}
						</button>
						{#if tts.state.status !== 'idle'}
							<button
								type="button"
								onclick={() => tts.stop()}
								aria-label="Vorlesen stoppen"
								class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
							>
								<Square class="size-4" /> Stopp
							</button>
						{/if}
					</div>

					<!-- Geschwindigkeit -->
					<div class="mt-3">
						<label
							for="a11y-rate"
							class="mb-1 flex items-center justify-between text-xs font-medium text-gray-700"
						>
							<span>Geschwindigkeit</span>
							<span>{tts.state.rate.toFixed(1)}×</span>
						</label>
						<input
							id="a11y-rate"
							type="range"
							min="0.5"
							max="2"
							step="0.1"
							value={tts.state.rate}
							oninput={(e) => tts.setRate(parseFloat((e.target as HTMLInputElement).value))}
							class="w-full accent-[#161a4e]"
						/>
					</div>

					{#if tts.state.voices.length > 1}
						<div class="mt-3">
							<label for="a11y-voice" class="mb-1 block text-xs font-medium text-gray-700">
								Stimme
							</label>
							<select
								id="a11y-voice"
								value={tts.state.selectedVoiceURI}
								onchange={(e) => tts.setVoice((e.target as HTMLSelectElement).value)}
								class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
							>
								{#each tts.state.voices as v (v.voiceURI)}
									<option value={v.voiceURI}>{v.name} ({v.lang})</option>
								{/each}
							</select>
						</div>
					{/if}
					<p class="mt-2 text-xs text-gray-500">
						Tipp: Markiere Text auf der Seite, um nur die Auswahl vorlesen zu lassen.
					</p>
				{:else}
					<p class="text-sm text-gray-600">
						Dein Browser unterstützt die Sprachausgabe leider nicht.
					</p>
				{/if}
			</section>

			<!-- Schriftgröße -->
			<section class="mb-5" aria-labelledby="a11y-font-heading">
				<h3
					id="a11y-font-heading"
					class="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600"
				>
					<Type class="size-4" /> Schriftgröße
				</h3>
				<div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Schriftgröße wählen">
					{#each fontOptions as opt (opt.value)}
						<button
							type="button"
							role="radio"
							aria-checked={a11y.settings.fontScale === opt.value}
							onclick={() => a11y.setFontScale(opt.value)}
							class="rounded-lg border px-2 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e] {a11y
								.settings.fontScale === opt.value
								? 'border-[#161a4e] bg-[#161a4e] text-white'
								: 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</section>

			<!-- Toggles -->
			<section class="mb-5" aria-labelledby="a11y-options-heading">
				<h3
					id="a11y-options-heading"
					class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600"
				>
					Anzeige
				</h3>
				<ul class="space-y-2">
					<li>
						<button
							type="button"
							aria-pressed={a11y.settings.highContrast}
							onclick={() => a11y.toggle('highContrast')}
							class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
						>
							<span class="flex items-center gap-2">
								<Contrast class="size-4" /> Hoher Kontrast
							</span>
							<span
								class="inline-block h-5 w-9 rounded-full transition-colors {a11y.settings
									.highContrast
									? 'bg-[#161a4e]'
									: 'bg-gray-300'}"
							>
								<span
									class="mt-0.5 block size-4 rounded-full bg-white transition-transform {a11y
										.settings.highContrast
										? 'translate-x-4'
										: 'translate-x-0.5'}"
								></span>
							</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							aria-pressed={a11y.settings.dyslexiaFont}
							onclick={() => a11y.toggle('dyslexiaFont')}
							class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
						>
							<span class="flex items-center gap-2">
								<Type class="size-4" /> Lesefreundliche Schrift
							</span>
							<span
								class="inline-block h-5 w-9 rounded-full transition-colors {a11y.settings
									.dyslexiaFont
									? 'bg-[#161a4e]'
									: 'bg-gray-300'}"
							>
								<span
									class="mt-0.5 block size-4 rounded-full bg-white transition-transform {a11y
										.settings.dyslexiaFont
										? 'translate-x-4'
										: 'translate-x-0.5'}"
								></span>
							</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							aria-pressed={a11y.settings.reduceMotion}
							onclick={() => a11y.toggle('reduceMotion')}
							class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
						>
							<span class="flex items-center gap-2">
								<Zap class="size-4" /> Animationen reduzieren
							</span>
							<span
								class="inline-block h-5 w-9 rounded-full transition-colors {a11y.settings
									.reduceMotion
									? 'bg-[#161a4e]'
									: 'bg-gray-300'}"
							>
								<span
									class="mt-0.5 block size-4 rounded-full bg-white transition-transform {a11y
										.settings.reduceMotion
										? 'translate-x-4'
										: 'translate-x-0.5'}"
								></span>
							</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							aria-pressed={a11y.settings.highlightLinks}
							onclick={() => a11y.toggle('highlightLinks')}
							class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
						>
							<span class="flex items-center gap-2">
								<LinkIcon class="size-4" /> Links hervorheben
							</span>
							<span
								class="inline-block h-5 w-9 rounded-full transition-colors {a11y.settings
									.highlightLinks
									? 'bg-[#161a4e]'
									: 'bg-gray-300'}"
							>
								<span
									class="mt-0.5 block size-4 rounded-full bg-white transition-transform {a11y
										.settings.highlightLinks
										? 'translate-x-4'
										: 'translate-x-0.5'}"
								></span>
							</span>
						</button>
					</li>
					<li>
						<button
							type="button"
							aria-pressed={a11y.settings.largeCursor}
							onclick={() => a11y.toggle('largeCursor')}
							class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
						>
							<span class="flex items-center gap-2">
								<MousePointer2 class="size-4" /> Großer Mauszeiger
							</span>
							<span
								class="inline-block h-5 w-9 rounded-full transition-colors {a11y.settings
									.largeCursor
									? 'bg-[#161a4e]'
									: 'bg-gray-300'}"
							>
								<span
									class="mt-0.5 block size-4 rounded-full bg-white transition-transform {a11y
										.settings.largeCursor
										? 'translate-x-4'
										: 'translate-x-0.5'}"
								></span>
							</span>
						</button>
					</li>
				</ul>
			</section>

			<!-- Reset -->
			<button
				type="button"
				onclick={() => a11y.reset()}
				class="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161a4e]"
			>
				<RotateCcw class="size-4" /> Einstellungen zurücksetzen
			</button>
		</div>
	{/if}
</div>
