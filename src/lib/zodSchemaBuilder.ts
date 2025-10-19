import { z } from 'zod';
import type { FormField } from '$lib/types/directus-schema';

export const buildZodSchema = (fields: FormField[]) => {
	const schema: Record<string, z.ZodTypeAny> = {};

	fields.forEach((field) => {
		let fieldSchema: z.ZodTypeAny;

		switch (field.type) {
			case 'checkbox':
				fieldSchema = z.boolean().default(false);
				break;

			case 'checkbox_group':
				fieldSchema = z.array(z.string()).default([]);
				break;

			case 'radio':
				fieldSchema = z.string();
				break;

			case 'file':
				if (field.required) {
					fieldSchema = z.instanceof(File, {
						message: `${field.label || field.name} ist erforderlich.`,
					});
				} else {
					fieldSchema = z
						.instanceof(File, {
							message: `${field.label || field.name} muss eine gültige Datei sein`,
						})
						.or(z.undefined());
				}
				break;

			default:
				fieldSchema = z.string();
				break;
		}

		if (field.validation) {
			const rules = field.validation.split('|');
			rules.forEach((rule) => {
				const [ruleName, ruleValue] = rule.split(':');
				const normalizedRule = ruleName.toLowerCase();

				if (fieldSchema instanceof z.ZodString) {
					switch (normalizedRule) {
						case 'email':
							fieldSchema = fieldSchema.email(`${field.label || field.name} muss eine gültige E-Mail sein.`);
							break;

						case 'url':
							fieldSchema = fieldSchema.url(`${field.label || field.name} muss eine gültige URL sein.`);
							break;

						case 'min': {
							const min = parseInt(ruleValue, 10);
							fieldSchema = fieldSchema.min(min, `${field.label || field.name} muss mindestens ${min} Zeichen enthalten.`);
							break;
						}

						case 'max': {
							const max = parseInt(ruleValue, 10);
							fieldSchema = fieldSchema.max(max, `${field.label || field.name} darf maximal ${max} Zeichen enthalten`);
							break;
						}
						case 'length': {
							const length = parseInt(ruleValue, 10);
							fieldSchema = fieldSchema.length(
								length,
								`${field.label || field.name} muss genau ${length} Zeichen enthalten`,
							);
							break;
						}

						default:
							console.warn(`Unknown validation rule: ${ruleName}`);
					}
				}
			});
		}

		if (field.required) {
			if (fieldSchema instanceof z.ZodString) {
				fieldSchema = fieldSchema.nonempty(`${field.label || field.name} ist erforderlich.`);
			}
		} else {
			// Allow empty strings or undefined for optional fields
			fieldSchema = fieldSchema.or(z.literal('')).or(z.undefined());
		}

		if (field.name) {
			schema[field.name] = fieldSchema;
		}
	});

	return z.object(schema);
};
