<script lang="ts">
	import type { FormField } from '$lib/types/directus-schema';
	import { cn } from '$lib/utils';
	import { CheckCircle } from '@lucide/svelte';
	import DynamicForm from './DynamicForm.svelte';
	import { goto } from '$app/navigation';

	interface FormBuilderProps {
		class?: string;
		form: {
			id: string;
			on_success?: 'redirect' | 'message' | null;
			sort?: number | null;
			submit_label?: string;
			success_message?: string | null;
			title?: string | null;
			success_redirect_url?: string | null;
			is_active?: boolean | null;
			fields: FormField[];
		};
	}

	const { form, class: className }: FormBuilderProps = $props();

	let isSubmitted = $state(false);
	let error = $state<string | null>(null);

	/**
	 * Geht über den eigenen Server (/api/forms/submit), nicht direkt an
	 * Directus: der Token bleibt dadurch serverseitig. Welche Felder gültig
	 * sind, entscheidet der Server anhand der Formular-Definition.
	 */
	const handleSubmit = async (data: Record<string, any>) => {
		try {
			const payload = new FormData();
			payload.append('form', form.id);

			for (const [name, value] of Object.entries(data)) {
				if (value === undefined || value === null) continue;
				if (value instanceof File) {
					payload.append(`file:${name}`, value);
				} else {
					payload.append(`value:${name}`, value.toString());
				}
			}

			const response = await fetch('/api/forms/submit', { method: 'POST', body: payload });
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message ?? 'Formular konnte nicht abgesendet werden.');
			}

			if (form.on_success === 'redirect' && form.success_redirect_url) {
				if (form.success_redirect_url.startsWith('/')) {
					goto(form.success_redirect_url);
				} else {
					window.location.href = form.success_redirect_url; // TODO check if internal or external
				}
			} else {
				isSubmitted = true;
			}
		} catch (err) {
			console.error('Error submitting form:', err);
			// Der Server formuliert verwertbare Hinweise ("… ist erforderlich",
			// "Datei ist größer als 5 MB") - die sind hilfreicher als ein pauschaler Satz.
			error =
				err instanceof Error && err.message
					? err.message
					: 'Formular konnte nicht abgesendet werden. Bitte versuche es später nochmal.';
		}
	};
</script>

{#if form.is_active}
	{#if isSubmitted}
		<div class="flex flex-col items-center justify-center space-y-4 p-6 text-center">
			<CheckCircle class="size-12 text-green-500" />
			<p class="text-gray-600">
				{form.success_message || 'Das Formular wurde erfolgreich abgesendet.'}
			</p>
		</div>
	{:else}
		<div class={cn('border-input space-y-6 rounded-lg border p-8', className)}>
			{#if error}
				<div class="rounded-md bg-red-100 p-4 text-red-500">
					<strong>Fehler:</strong>
					{error}
				</div>
			{/if}
			<DynamicForm
				fields={form.fields}
				onSubmit={handleSubmit}
				submitLabel={form.submit_label || 'Absenden'}
				id={form.id}
			/>
		</div>
	{/if}
{/if}
