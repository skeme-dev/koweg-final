import { PUBLIC_DIRECTUS_URL } from '$env/static/public';
import { type DirectusFile } from '../types/directus-schema';

export function getDirectusAssetURL(
	fileOrString: string | DirectusFile | null | undefined
): string {
	if (!fileOrString) return '';

	if (typeof fileOrString === 'string') {
		return `${PUBLIC_DIRECTUS_URL}/assets/${fileOrString}`;
	}

	return `${PUBLIC_DIRECTUS_URL}/assets/${fileOrString.id}`;
}

/**
 * Ermittelt Ziel-URL und Download-Flag für einen Navigationseintrag.
 * Reihenfolge: hinterlegte Datei > Abteilung > interne Seite > URL.
 */
export function getNavigationLink(item: {
	file?: { id: string } | null;
	department?: { slug?: string | null } | null;
	page?: { permalink?: string | null } | null;
	url?: string | null;
}): { href: string; isDownload: boolean, target: '_blank' | '_self' } {
	if (item?.file?.id) {
		// `?download` setzt Content-Disposition: attachment – das `download`-Attribut
		// allein greift bei der fremden Directus-Origin nicht.
		return { href: `${getDirectusAssetURL(item.file.id)}?download`, isDownload: true, target: '_self' };
	}

	if (item?.department?.slug) {
		return { href: `/abteilungen/${item.department.slug}`, isDownload: false, target: '_self' };
	}

	return { href: item?.page?.permalink ?? item?.url ?? '#', isDownload: false, target: item?.url ? '_blank' : '_self' };
}
