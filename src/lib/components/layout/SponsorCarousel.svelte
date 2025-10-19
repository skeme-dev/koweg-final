<script lang="ts" generics="T">
	import { tick } from 'svelte';
	import type { Snippet } from 'svelte';

	/**
	 * Carousel.svelte — Svelte 5 (Runes + Snippets)
	 *
	 * - Marquee‑Modus (kontinuierlich, per `speed` in px/s)
	 * - Normaler Slide‑Modus (Pfeile/Dots, optional Autoplay)
	 * - Snippet‑API (Svelte 5): Übergib einen `item`‑Snippet, optional generisch getypt
	 */

	// Props via $props (Svelte 5)
	interface Props {
		items: T[];
		marquee?: boolean;
		speed?: number; // px pro Sekunde (nur Marquee)
		gap?: number; // Abstand zwischen Slides
		slidesToShow?: number; // nur normaler Modus
		loop?: boolean; // normaler Modus: Wrap von Ende zu Anfang
		autoplay?: boolean; // normaler Modus: auto weiter
		interval?: number; // Autoplay‑Intervall (ms)
		pauseOnHover?: boolean; // sowohl Marquee als auch Autoplay pausieren
		showArrows?: boolean;
		showIndicators?: boolean;

		// Snippets (Svelte 5)
		item?: Snippet<[T, number]>; // (value, index) -> Markup
		children?: Snippet; // ungenutzt, nur zur Vollständigkeit
	}

	let {
		items,
		marquee = false,
		speed = 60,
		gap = 16,
		slidesToShow = 1,
		loop = true,
		autoplay = false,
		interval = 4000,
		pauseOnHover = true,
		showArrows = true,
		showIndicators = true,
		item
	}: Props = $props();

	// State via $state
	let current = $state(0); // aktiver Index im normalen Modus
	let hovering = $state(false);

	// Element‑Refs
	let containerEl: HTMLDivElement | undefined;
	let trackEl: HTMLDivElement | undefined = $state();
	let loopEl: HTMLDivElement | undefined = $state(); // erste Kopie im Marquee‑Track

	// Messwerte
	let slideWidth = $state(0); // Schrittweite je Slide inkl. Gap
	let contentWidth = $state(0); // Breite einer Loop‑Kopie (für Marquee)

	// Derived
	let duration = $derived(contentWidth > 0 && speed > 0 ? contentWidth / speed : 0); // s
	let pages = $derived(
		Math.max(1, loop ? items.length : Math.max(1, items.length - slidesToShow + 1))
	);

	function measure() {
		// Slidebreite (sichtbare Slide inkl. Gap als Schrittweite)
		const firstSlide = trackEl?.querySelector('.slide') as HTMLElement | null;
		if (firstSlide) {
			slideWidth = firstSlide.offsetWidth + gap;
		}
		// Marquee‑Inhaltbreite einer Loop‑Kopie
		if (loopEl) {
			contentWidth = loopEl.scrollWidth + gap; // +gap sorgt für nahtlosen Übergang
		}
	}

	// Resize‑Observer mit Cleanup via $effect
	let resizeObs: ResizeObserver | undefined;
	$effect(() => {
		// Referenzen lesen, damit Effekt neu läuft, wenn sie sich ändern
		containerEl;
		loopEl;

		resizeObs = new ResizeObserver(() => measure());
		if (containerEl) resizeObs.observe(containerEl);
		if (loopEl) resizeObs.observe(loopEl);

		// Initial messen nach Render
		tick().then(measure);

		return () => {
			resizeObs?.disconnect();
			resizeObs = undefined;
		};
	});

	// Bei Änderungen an items/gap/slidesToShow neu messen
	$effect(() => {
		items.length;
		gap;
		slidesToShow;
		marquee; // Abhängigkeiten registrieren
		tick().then(measure);
	});

	// Autoplay (nur normaler Modus)
	let autoplayTimer: ReturnType<typeof setInterval> | undefined;
	$effect(() => {
		// Abhängigkeiten: autoplay, interval, marquee
		autoplay;
		interval;
		marquee;

		if (!marquee && autoplay) {
			const id = setInterval(() => {
				if (pauseOnHover && hovering) return;
				next();
			}, interval);
			autoplayTimer = id;
			return () => clearInterval(id);
		}
	});

	// Navigation (normaler Modus)
	function next() {
		if (items.length === 0) return;
		if (loop) current = (current + 1) % items.length;
		else current = Math.min(current + 1, Math.max(0, items.length - slidesToShow));
	}
	function prev() {
		if (items.length === 0) return;
		if (loop) current = (current - 1 + items.length) % items.length;
		else current = Math.max(0, current - 1);
	}
	function goTo(i: number) {
		if (items.length === 0) return;
		if (loop) current = ((i % items.length) + items.length) % items.length;
		else current = Math.max(0, Math.min(i, Math.max(0, items.length - slidesToShow)));
	}

	// Simple Swipe
	let dragging = $state(false);
	let startX = $state(0);
	let dragDelta = $state(0);

	function onPointerDown(e: PointerEvent) {
		if (marquee) return; // kein Drag im Marquee‑Modus
		dragging = true;
		startX = e.clientX;
		dragDelta = 0;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		trackEl?.style.setProperty('--dragging', '1');
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		dragDelta = e.clientX - startX;
		const base = -current * (slideWidth || 0);
		trackEl?.style.setProperty('--drag-offset', `${base + dragDelta}px`);
	}
	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		trackEl?.style.removeProperty('--dragging');
		trackEl?.style.removeProperty('--drag-offset');
		const threshold = Math.max(40, (slideWidth || 0) * 0.15);
		if (dragDelta > threshold) prev();
		else if (dragDelta < -threshold) next();
		dragDelta = 0;
	}
</script>

<div
	class="carousel"
	bind:this={containerEl}
	onmouseenter={() => (hovering = true)}
	onmouseleave={() => (hovering = false)}
	aria-roledescription="carousel"
	role="region"
>
	<div
		class="viewport"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
	>
		{#if !marquee}
			<div
				class="track"
				bind:this={trackEl}
				style="--gap:{gap}px; --slides:{Math.max(
					1,
					+slidesToShow
				)}; --step:{slideWidth}px; --index:{current};"
				aria-live="polite"
			>
				{#each items as itemValue, index (index)}
					<div class="slide">
						{#if item}
							{@render item(itemValue, index)}
						{:else}
							<div class="fallback">{String(itemValue)}</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div
				class="track marquee"
				bind:this={trackEl}
				style="--gap:{gap}px; --play:{pauseOnHover && hovering
					? 'paused'
					: 'running'}; --dur:{Math.max(0.1, +duration)}s; --loop:{Math.max(0, +contentWidth)};"
				aria-hidden="true"
			>
				<div class="loop" bind:this={loopEl}>
					{#each items as itemValue, index (index)}
						<div class="slide">
							{#if item}
								{@render item(itemValue, index)}
							{:else}
								<div class="fallback">{String(itemValue)}</div>
							{/if}
						</div>
					{/each}
				</div>
				<div class="loop" aria-hidden="true">
					{#each items as itemValue, index (index)}
						<div class="slide">
							{#if item}
								{@render item(itemValue, index)}
							{:else}
								<div class="fallback">{String(itemValue)}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if !marquee && showArrows}
		<button class="nav prev" aria-label="Zurück" onclick={prev}>‹</button>
		<button class="nav next" aria-label="Weiter" onclick={next}>›</button>
	{/if}

	{#if !marquee && showIndicators}
		<div class="indicators" role="tablist" aria-label="Folienindizes">
			{#each Array(pages) as _, i}
				<button
					class="dot {i === current % pages ? 'active' : ''}"
					role="tab"
					aria-selected={i === current % pages}
					aria-label={`Gehe zu Folie ${i + 1}`}
					onclick={() => goTo(i)}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel {
		position: relative;
		width: 100%;
		user-select: none;
	}
	.viewport {
		overflow: hidden;
		width: 100%;
		touch-action: pan-y;
	}

	.track {
		display: flex;
		align-items: stretch;
		gap: var(--gap, 16px);
		will-change: transform;
		/* Drag/Index‑Interpolation über CSS‑Variablen */
		--tx: calc(
			var(--dragging, 0) * var(--drag-offset, 0px) + (1 - var(--dragging, 0)) *
				calc(-1 * var(--step, 0px) * var(--index, 0))
		);
		transform: translateX(var(--tx));
		transition: transform 380ms cubic-bezier(0.22, 0.61, 0.36, 1);
	}

	/* Normaler Modus: feste Anzahl sichtbarer Slides */
	.track:not(.marquee) .slide {
		flex: 0 0 calc((100% - (var(--slides, 1) - 1) * var(--gap, 16px)) / var(--slides, 1));
	}

	.slide {
		min-width: 0;
	}

	/* Marquee‑Animation: Track übersetzt um Breite EINER Loop‑Kopie */
	.track.marquee {
		animation: marquee var(--dur, 20s) linear infinite;
		animation-play-state: var(--play, running);
	}
	.track.marquee .loop {
		display: flex;
		align-items: stretch;
		gap: var(--gap, 16px);
	}
	@keyframes marquee {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(calc(-1px * var(--loop)));
		}
	}

	/* Navigation */
	.nav {
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		background: rgba(0, 0, 0, 0.55);
		color: white;
		border: none;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.nav:hover {
		background: rgba(0, 0, 0, 0.7);
	}
	.nav.prev {
		left: 8px;
	}
	.nav.next {
		right: 8px;
	}

	.indicators {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 8px;
		display: flex;
		gap: 8px;
		justify-content: center;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		border: none;
		background: rgba(255, 255, 255, 0.5);
	}
	.dot.active {
		background: white;
	}

	.fallback {
		padding: 12px 20px;
		background: #111;
		color: #fff;
		border-radius: 12px;
		white-space: nowrap;
	}
</style>
