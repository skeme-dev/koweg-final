<script lang="ts">
	import setAttr from '$lib/directus/visualEditing';
	import { cn } from '$lib/utils';
	import Headline from '../ui/Headline.svelte';
	import Tagline from '../ui/Tagline.svelte';

	interface Cell {
		value?: string | null;
	}
	interface Row {
		cells?: Cell[] | null;
	}

	interface TableData {
		id: string;
		tagline?: string | null;
		headline?: string | null;
		caption?: string | null;
		variant?: 'default' | 'striped' | 'bordered' | null;
		has_header_row?: boolean | null;
		has_header_column?: boolean | null;
		content?: Row[] | null;
	}

	let { data }: { data: TableData } = $props();

	const {
		id,
		tagline,
		headline,
		caption,
		variant = 'striped',
		has_header_row = true,
		has_header_column = false
	} = $derived(data);

	// Rohdaten (Repeater aus Directus) auf eine reine string[][]-Matrix normalisieren
	const rows = $derived.by(() =>
		(data.content ?? [])
			.map((row) => (row?.cells ?? []).map((cell) => cell?.value ?? ''))
			.filter((row) => row.length > 0)
	);

	const headerRow = $derived(has_header_row && rows.length > 0 ? rows[0] : null);
	const bodyRows = $derived(has_header_row ? rows.slice(1) : rows);
	const columnCount = $derived(rows.reduce((max, row) => Math.max(max, row.length), 0));
	const columns = $derived(Array.from({ length: columnCount }, (_, i) => i));

	const cellBorder = $derived(
		variant === 'bordered' ? 'border border-gray-muted/40' : 'border-b border-gray-muted/30'
	);
</script>

{#if rows.length}
	<section class="space-y-6">
		{#if tagline}
			<Tagline
				{tagline}
				data-directus={setAttr({
					collection: 'block_table',
					item: id,
					fields: 'tagline',
					mode: 'popover'
				})}
			/>
		{/if}
		{#if headline}
			<Headline
				{headline}
				data-directus={setAttr({
					collection: 'block_table',
					item: id,
					fields: 'headline',
					mode: 'popover'
				})}
			/>
		{/if}

		<figure class="space-y-3">
			<div
				class="w-full overflow-x-auto rounded-xl ring-1 ring-gray-muted/40"
				data-directus={setAttr({
					collection: 'block_table',
					item: id,
					fields: ['content', 'variant', 'has_header_row', 'has_header_column'],
					mode: 'drawer'
				})}
			>
				<table class="w-full border-collapse text-left text-foreground">
					{#if headerRow}
						<thead>
							<tr>
								{#each columns as c (c)}
									<th
										scope="col"
										class={cn(
											'bg-accent px-4 py-3 font-heading text-sm font-semibold uppercase tracking-wide text-white',
											cellBorder
										)}
									>
										{headerRow[c] ?? ''}
									</th>
								{/each}
							</tr>
						</thead>
					{/if}
					<tbody>
						{#each bodyRows as row, r (r)}
							<tr
								class={cn(
									'align-top',
									variant === 'striped' && r % 2 === 1 && 'bg-background-muted'
								)}
							>
								{#each columns as c (c)}
									{#if has_header_column && c === 0}
										<th scope="row" class={cn('px-4 py-3 font-semibold', cellBorder)}>
											{row[c] ?? ''}
										</th>
									{:else}
										<td class={cn('px-4 py-3', cellBorder)}>
											{row[c] ?? ''}
										</td>
									{/if}
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if caption}
				<figcaption
					class="text-sm text-gray-muted"
					data-directus={setAttr({
						collection: 'block_table',
						item: id,
						fields: 'caption',
						mode: 'popover'
					})}
				>
					{caption}
				</figcaption>
			{/if}
		</figure>
	</section>
{/if}
