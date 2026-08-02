import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { type BlockPost, type PageBlock, type Post, type Schema } from '../types/directus-schema';
import { useDirectus } from './directus';
import { type QueryFilter, aggregate, readItem, readSingleton } from '@directus/sdk';

/**
 * Deep-Queries, deren Syntax das SDK-Typing nicht kennt (Punkt-Notation über eine
 * Junction, `item:<collection>` für M2A). Beide sind zur Laufzeit gültig.
 */
const teamsDeep = {
	// Trainer nach dem sort-Feld der Junction teams_directus_users; eine Person
	// kann in mehreren Mannschaften stehen und dort unterschiedlich einsortiert sein
	trainers: { _sort: ['sort'] },
	related_posts: { _sort: ['sort', '-published_at'] },
	// manuelle Reihenfolge der Trainings pro Team über das sort-Feld der Junction
	// teams_trainings_1; trainings_id.day als Fallback für noch unsortierte Zeilen
	trainings: { _sort: ['sort', 'trainings_id.day'] }
} as any;

const blocksDeep = {
	blocks: {
		_sort: ['sort'],
		_filter: { hide_block: { _neq: true } },
		'item:block_gallery': { items: { _sort: ['sort'] } },
		'item:block_pricing': { pricing_cards: { _sort: ['sort'] } },
		'item:block_hero': { button_group: { buttons: { _sort: ['sort'] } } },
		'item:block_form': { form: { fields: { _sort: ['sort'] } } },
		'item:block_timeline': { timeline_items: { _sort: ['sort'] } },
		'item:block_person_gallery': { related_person: { _sort: ['sort'] } },
		'item:block_sponsor_gallery': { items: { _sort: ['sort'] } },
		'item:block_team_gallery': { items: { _sort: ['sort'] } },
		'item:block_opening_time': { openings: { _sort: ['sort'] } }
	}
} as any;

export const fetchTeamsData = async (fetch: RequestEvent['fetch']) => {
	const { getDirectus, readItems } = useDirectus();

	const directus = getDirectus(fetch);

	const teamsData = await directus.request(
		readItems('teams', {
			sort: ['sort'],
			fields: [
				'id',
				'sort',
				'status',
				'title',
				'slug',
				'description',
				{
					image: ['id']
				},
				{
					// M2M über die Junction teams_directus_users
					trainers: [
						'sort',
						'funktion',
						{
							directus_users_id: [
								'first_name',
								'last_name',
								'email',
								'title',
								{
									avatar: ['id']
								}
							]
						}
					]
				},
				{
					related_department: ['id', 'title', 'slug']
				},
				{
					related_posts: [
						'id',
						'description',
						'title',
						'slug',
						{
							image: ['id']
						}
					]
				},
				{
					// M2M über die Junction teams_trainings_1
					trainings: [
					"sort",
						{
							trainings_id: [
								'id',
								'sort',
								'title',
								'day',
								{
									location: ['title', 'link', { image: ['id'] }]
								},
								'min_age',
								'max_age',
								'start',
								'end'
							]
						}
					]
				}
			],
			deep: teamsDeep
		})
	);

	// Junction-Zeilen auf die verknüpften Datensätze reduzieren, damit die
	// Komponenten weiterhin flache Listen bekommen
	return teamsData.map((team: any) => ({
		...team,
		trainings: (team.trainings ?? [])
			.map((entry: any) => entry?.trainings_id)
			.filter(Boolean),
		trainers: (team.trainers ?? [])
			.filter((entry: any) => entry?.directus_users_id)
			.map((entry: any) => ({
				...entry.directus_users_id,
				// die Funktion in genau dieser Mannschaft schlägt den allgemeinen
				// Titel der Person (PersonCard zeigt beides über dem Namen)
				title: entry.funktion || entry.directus_users_id.title
			}))
	}));
};

export const fetchDepartmentsData = async (fetch: RequestEvent['fetch']) => {
	const { getDirectus, readItems } = useDirectus();

	const directus = getDirectus(fetch);

	const departmentsData = await directus.request(
		readItems('departments', {
			sort: ['sort'],
			fields: [
				'id',
				'status',
				'title',
				'description',
				'slug',
				{
					hero_image: ['id']
				},
				{
					leader: [
						'first_name',
						'last_name',
						'email',
						'title',
						'department_sort',
						{
							avatar: ['id']
						}
					]
				},
				{
					teams: [
						'id',
						'sort',
						'status',
						'title',
						'slug',
						'description',
						{
							image: ['id']
						}
					]
				},
				{
					related_posts: [
						'id',
						'description',
						'title',
						'slug',
						{
							image: ['id']
						}
					]
				}
			],
			deep: {
				teams: { _sort: ['sort'] },
				// Leiter/zugeordnete User nach dem o2m-Sortierfeld department_sort
				leader: { _sort: ['department_sort'] },
				related_posts: { _sort: ['sort', '-published_at'] }
			}
		})
	);
	return departmentsData;
};

/**
 * Fetches page data by permalink, including all nested blocks and dynamically fetching blog posts if required.
 */
export const fetchPageData = async (
	permalink: string,
	postPage = 1,
	fetch: RequestEvent['fetch']
) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	const pageData = await directus.request(
		readItems('pages', {
			filter: { permalink: { _eq: permalink } },
			limit: 1,
			fields: [
				'id',
				'title',
				'template',
				'permalink',
				'status',
				{
					hero_image: ['id']
				},
				{
					blocks: [
						'id',
						'background',
						'collection',
						'item',
						'sort',
						'hide_block',
						{
							item: {
								block_richtext: ['id', 'tagline', 'headline', 'content', 'alignment'],
									block_table: [
										'id',
										'tagline',
										'headline',
										'caption',
										'variant',
										'has_header_row',
										'has_header_column',
										'content'
									],
								block_gallery: [
									'id',
									'tagline',
									'headline',
									{ items: ['id', 'directus_file', 'sort'] }
								],
								block_pricing: [
									'id',
									'tagline',
									'headline',
									{
										pricing_cards: [
											'id',
											'title',
											'description',
											'price',
											'badge',
											'features',
											'is_highlighted',
											{
												button: [
													'id',
													'label',
													'variant',
													'url',
													'type',
													{ page: ['permalink'] },
													{ post: ['slug'] }
												]
											}
										]
									}
								],
								block_hero: [
									'id',
									'tagline',
									'headline',
									'description',
									'layout',
									'image',
									{
										button_group: [
											'id',
											{
												buttons: [
													'id',
													'label',
													'variant',
													'url',
													'type',
													{ page: ['permalink'] },
													{ post: ['slug'] }
												]
											}
										]
									}
								],
								block_posts: ['id', 'tagline', 'headline', 'collection', 'limit'],
								block_form: [
									'id',
									'tagline',
									'headline',
									{
										form: [
											'id',
											'title',
											'submit_label',
											'success_message',
											'on_success',
											'success_redirect_url',
											'is_active',
											{
												fields: [
													'id',
													'name',
													'type',
													'label',
													'placeholder',
													'help',
													'validation',
													'width',
													'choices',
													'required',
													'sort'
												]
											}
										]
									}
								],
								block_file_card: [
									{
										file: ['id', 'filename_download']
									}
								],
								block_timeline: [
									{
										timeline_items: [
											'sort',
											'title',
											'description',
											{
												image: ['id']
											}
										]
									}
								],
								block_location_card: [
									'id',
									'title',
									'description',
									'link',
									{
										image: ['id']
									}
								],
								block_person_gallery: [
									{
										related_person: [
											{
												related_user: [
													'first_name',
													'last_name',
													'email',
													'title',
													{
														avatar: ['id']
													}
												]
											}
										]
									}
								],
								block_person_card: [
									{
										person: [
											'first_name',
											'last_name',
											'email',
											'title',
											{
												avatar: ['id']
											}
										]
									}
								],
								block_opening_time: [
									'sort',
									{
										openings: ['value', 'label']
									}
								],
								block_sponsor_gallery: [
									'title',
									{
										items: [
										'sort',
											{
												sponsor: [
													'id',
													'title',
													'type',
													'link',
													'sort',
													{
														image: ['id']
													}
												]
											}
										]
									}
								],
								block_team_card: [
									{
										team: [
											'title',
											'slug',
											{
												image: ['id']
											}
										]
									}
								],
								block_team_gallery: [
									{
										items: [
											{
												team: [
													'title',
													'slug',
													{
														image: ['id']
													}
												]
											}
										]
									}
								]
							}
						}
					]
				}
			],
			deep: blocksDeep
		})
	);

	if (pageData.length === 0) {
		error(404, {
			message: 'Not found'
		});
	}

	const page = pageData[0];

	if (Array.isArray(page.blocks)) {
		for (const block of page.blocks as PageBlock[]) {
			if (
				block.collection === 'block_posts' &&
				typeof block.item === 'object' &&
				(block.item as BlockPost).collection === 'posts'
			) {
				const limit = (block.item as BlockPost).limit ?? 6;
				const posts = await directus.request<Post[]>(
					readItems('posts', {
						fields: ['id', 'title', 'description', 'slug', 'image', 'status', 'published_at'],
						filter: { status: { _eq: 'published' } },
						sort: ['-published_at'],
						limit,
						page: postPage
					})
				);

				(block.item as BlockPost & { posts: Post[] }).posts = posts;
			}
		}
	}

	return page;
};

/**
 * Fetches global site data, header navigation, and footer navigation.
 */
export const fetchSiteData = async (fetch: RequestEvent['fetch']) => {
	const { getDirectus } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const [globals, headerNavigation, footerNavigation] = await Promise.all([
			directus.request(
				readSingleton('globals', {
					fields: [
						'id',
						'title',
						'description',
						'logo',
						'logo_dark_mode',
						'social_links',
						'accent_color',
						'favicon',
						{
							main_sponsors: ['id', 'title', 'type', 'link', 'sort', { image: ['id'] }]
						},
						'hero_image_text',
						'about_text',
						{
							shown_posts: [
								'id',
								'description',
								'title',
								'slug',
								{
									image: ['id']
								}
							]
						}
					],
					deep: {
						main_sponsors: { _sort: ['sort'] },
						shown_posts: { _sort: ['sort', '-published_at'] }
					}
				})
			),
			directus.request(
				readItem('navigation', 'main', {
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								'url',
								{
									page: ['permalink'],
									department: ['id', 'slug'],
									file: ['id', 'filename_download'],
									children: [
										'id',
										'title',
										'url',
										{
											page: ['permalink'],
											department: ['id', 'slug'],
											file: ['id', 'filename_download']
										}
									]
								}
							]
						}
					],
					deep: { items: { _sort: ['sort'], children: { _sort: ['sort'] } } }
				})
			),
			directus.request(
				readItem('navigation', 'footer', {
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								'url',
								{
									page: ['permalink'],
									file: ['id', 'filename_download'],
									children: [
										'id',
										'title',
										'url',
										{ page: ['permalink'], file: ['id', 'filename_download'] }
									]
								}
							]
						}
					],
					deep: { items: { _sort: ['sort'], children: { _sort: ['sort'] } } }
				})
			)
		]);

		return { globals, headerNavigation, footerNavigation };
	} catch (error) {
		console.error('Error fetching site data:', error);
		throw new Error('Failed to fetch site data');
	}
};

/**
 * Fetches a single blog post by slug. Handles live preview mode
 */
export const fetchPostBySlug = async (
	slug: string,
	options: { draft?: boolean },
	fetch: RequestEvent['fetch']
) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const filter: QueryFilter<Schema, Post> = options?.draft
			? { slug: { _eq: slug } }
			: { slug: { _eq: slug }, status: { _eq: 'published' } };

		const posts = await directus.request(
			readItems('posts', {
				filter,
				limit: 1,
				fields: [
					'id',
					'title',
					'content',
					'status',
					'image',
					'description',
					'author',
					'seo',
					'related_department',
					'related_team'
				]
			})
		);

		const post = posts[0];

		if (!post) {
			console.error(`No post found with slug: ${slug}`);

			return null;
		}

		return post;
	} catch (error) {
		console.error(`Error fetching post with slug "${slug}":`, error);
		throw new Error(`Failed to fetch post with slug "${slug}"`);
	}
};

/**
 * Fetches related blog posts excluding the given ID.
 */

// TODO fetch related posts based on deparrtment or team
export const fetchRelatedPosts = async (
	excludeId: string,
	relatedDepartmentId: string,
	relatedTeamId: string,
	fetch: RequestEvent['fetch']
) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const relatedPosts = await directus.request(
			readItems('posts', {
				filter: {
					_or: [
						{
							related_department: {
								id: { _eq: relatedDepartmentId }
							}
						},
						{
							related_team: {
								id: { _eq: relatedTeamId }
							}
						}
					],
					id: { _neq: excludeId }
				},
				fields: ['id', 'title', 'image', 'slug'],
				sort: ['sort', '-published_at'],
				limit: 2
			})
		);

		return relatedPosts;
	} catch (error) {
		console.error('Error fetching related posts:', error);
		throw new Error('Failed to fetch related posts');
	}
};

/**
 * Fetches author details by ID.
 */
export const fetchAuthorById = async (authorId: string, fetch: RequestEvent['fetch']) => {
	const { getDirectus, readUser } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const author = await directus.request(
			readUser(authorId, {
				fields: ['first_name', 'last_name', 'avatar']
			})
		);

		return author;
	} catch (error) {
		console.error(`Error fetching author with ID "${authorId}":`, error);
		throw new Error(`Failed to fetch author with ID "${authorId}"`);
	}
};

/**
 * Fetches paginated blog posts. - Runs Client side
 */
export const fetchPaginatedPosts = async (limit: number, page: number) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);
	try {
		const response = await directus.request(
			readItems('posts', {
				limit,
				page,
				sort: ['-published_at'],
				fields: ['id', 'title', 'description', 'slug', 'image'],
				filter: { status: { _eq: 'published' } }
			})
		);

		return response;
	} catch (error) {
		console.error('Error fetching paginated posts:', error);
		throw new Error('Failed to fetch paginated posts');
	}
};

/**
 * Fetches the total number of published blog posts. - Runs Client side
 */
export const fetchTotalPostCount = async (): Promise<number> => {
	const { getDirectus } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const response = await directus.request(
			aggregate('posts', {
				aggregate: { count: '*' },
				filter: { status: { _eq: 'published' } }
			})
		);

		return Number(response[0]?.count) || 0;
	} catch (error) {
		console.error('Error fetching total post count:', error);

		return 0;
	}
};

// ──────────────────────────────────────────────
// Event Fetchers
// ──────────────────────────────────────────────

const eventListFields = [
	'id',
	'title',
	'slug',
	'description',
	{ image: ['id'] },
	'type',
	'start_date',
	'end_date',
	{location: ["title", "link"]},
	'max_participants'
] as const;

/**
 * Transforms flat location_title/location_link into nested location object
 * so that existing components can use event.location.title / event.location.link
 */
function transformEvent(event: any) {
	const { location_title, location_link, ...rest } = event;
	return {
		...rest,
		location: location_title
			? { title: location_title, link: location_link ?? undefined }
			: undefined
	};
}

/**
 * Fetches all published events sorted by start_date.
 */
export const fetchAllEvents = async (fetch: RequestEvent['fetch']) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const events = await directus.request(
			readItems('events', {
				filter: { status: { _eq: 'published' } },
				sort: ['start_date'],
				fields: eventListFields
			})
		);

		return events.map(transformEvent);
	} catch (err) {
		console.error('Error fetching all events:', err);
		return [];
	}
};

/**
 * Fetches a single event by slug with full content and registration form.
 */
export const fetchEventBySlug = async (slug: string, fetch: RequestEvent['fetch']) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const events = await directus.request(
			readItems('events', {
				filter: { slug: { _eq: slug }, status: { _eq: 'published' } },
				limit: 1,
				fields: [
					'id',
					'title',
					'slug',
					'description',
					'content',
					{ image: ['id'] },
					'type',
					'start_date',
					'end_date',
					{location: ["title", "link"]},
					'max_participants',
					{
						registration_form: [
							'id',
							'title',
							'submit_label',
							'success_message',
							'on_success',
							'success_redirect_url',
							'is_active',
							{
								fields: [
									'id',
									'name',
									'type',
									'label',
									'placeholder',
									'help',
									'validation',
									'width',
									'choices',
									'required',
									'sort'
								]
							}
						]
					}
				],
				deep: { registration_form: { fields: { _sort: ['sort'] } } }
			})
		);

		const event = events[0];
		if (!event) return null;
		return transformEvent(event);
	} catch (err) {
		console.error(`Error fetching event with slug "${slug}":`, err);
		return null;
	}
};

/**
 * Fetches published events for a specific department.
 */
export const fetchEventsByDepartment = async (
	departmentId: string,
	fetch: RequestEvent['fetch']
) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const events = await directus.request(
			readItems('events', {
				filter: {
					status: { _eq: 'published' },
					related_department: { _eq: departmentId }
				},
				sort: ['start_date'],
				fields: eventListFields
			})
		);

		return events.map(transformEvent);
	} catch (err) {
		console.error('Error fetching events for department:', err);
		return [];
	}
};

/**
 * Fetches published events for a specific team.
 */
export const fetchEventsByTeam = async (teamId: string, fetch: RequestEvent['fetch']) => {
	const { getDirectus, readItems } = useDirectus();
	const directus = getDirectus(fetch);

	try {
		const events = await directus.request(
			readItems('events', {
				filter: {
					status: { _eq: 'published' },
					related_team: { _eq: teamId }
				},
				sort: ['start_date'],
				fields: eventListFields
			})
		);

		return events.map(transformEvent);
	} catch (err) {
		console.error('Error fetching events for team:', err);
		return [];
	}
};
