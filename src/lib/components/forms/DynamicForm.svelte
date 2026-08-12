<script lang="ts">
	import { dev } from '$app/environment';
	import setAttr from '$lib/directus/visualEditing';
	import type { FormField as FormFieldType } from '$lib/types/directus-schema';
	import { buildZodSchema } from '$lib/zodSchemaBuilder';
	import Button from '../blocks/Button.svelte';
	import Field from './FormField.svelte';
	import { superForm, superValidate } from 'sveltekit-superforms';
	import SuperDebug from 'sveltekit-superforms';

	import { zodClient, zod } from 'sveltekit-superforms/adapters';
	import { onMount } from 'svelte';
	import { HONEYPOT_FIELD_NAME } from '$lib/forms/constants';

	interface DynamicFormProps {
		fields: FormFieldType[];
		onSubmit: (data: Record<string, any>, meta: { token: string; honeypot: string }) => void;
		submitLabel: string;
		id: string;
	}

	const { fields, onSubmit, submitLabel, id }: DynamicFormProps = $props();

	const sortedFields = [...fields].sort((a, b) => (a.sort || 0) - (b.sort || 0));
	const formSchema = buildZodSchema(fields);

	const defaultValues = fields.reduce<Record<string, any>>((defaults, field) => {
		if (!field.name) return defaults;
		switch (field.type) {
			case 'checkbox':
				defaults[field.name] = false;
				break;
			case 'checkbox_group':
				defaults[field.name] = [];
				break;
			case 'radio':
				defaults[field.name] = '';
				break;
			default:
				defaults[field.name] = '';
				break;
		}

		return defaults;
	}, {});

	const form = superForm(defaultValues, {
		validators: zodClient(formSchema),
		SPA: true
	});

	const { enhance, submit, form: formData, errors, validateForm } = $derived(form);

	let token = $state('');

	onMount(() => {
		fetch('/api/forms/token')
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data?.token) token = data.token;
			})
			.catch(() => {
				// Token bleibt leer -> Server lehnt ab, Nutzer laedt neu
			});
	});

	const onsubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		const f = await validateForm();
		$errors = f.errors;
		if (!f.valid) return;

		const formEl = e.currentTarget as HTMLFormElement;
		const honeypot =
			(formEl.elements.namedItem(HONEYPOT_FIELD_NAME) as HTMLInputElement | null)?.value ?? '';

		onSubmit($formData, { token, honeypot });
	};
</script>

<form
	class="flex flex-wrap gap-4"
	{onsubmit}
	data-directus={setAttr({
		collection: 'forms',
		item: id,
		fields: 'fields',
		mode: 'popover'
	})}
>
	<!-- Honeypot: fuer Menschen unsichtbar, von Bots gern ausgefuellt -->
	<div class="absolute left-[-9999px] top-[-9999px] h-px w-px overflow-hidden" aria-hidden="true">
		<label>
			Website
			<input type="text" name={HONEYPOT_FIELD_NAME} tabindex="-1" autocomplete="off" />
		</label>
	</div>

	{#each sortedFields as field (field.id)}
		<Field {field} {form} />
	{/each}

	<div class="w-full">
		<div
			data-directus={setAttr({
				collection: 'forms',
				item: id,
				fields: 'submit_label',
				mode: 'popover'
			})}
		>
			<Button
				type="submit"
				icon="arrow"
				label={submitLabel}
				iconPosition="right"
				id={`submit-${submitLabel.replace(/\s+/g, '-').toLowerCase()}`}
			></Button>
		</div>
	</div>

	<!-- HIDE FORM DEBUGGER -->
	<!-- {#if dev}
		<div class="flex w-full flex-col gap-2 rounded-xl bg-red-200 p-2">
			<p class="text-center text-red-500">Form Debugger. This is not displayed in production</p>
			{#await superValidate($formData, zod(formSchema)) then r}
				<SuperDebug data={r} />
			{/await}
		</div>
	{/if} -->
</form>
