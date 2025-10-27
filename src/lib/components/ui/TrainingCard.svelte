<script lang="ts">
	let { data }: TrainingCardProps = $props();

	interface TrainingCardProps {
		data: {
			schedule: {
				title?: string;
				day: string;
				start: string;
				end: string;
				location: {
					title: string;
					link: string;
				};
				min_age?: number;
				max_age?: number;
			};
		};
	}

	const dayTranslations = {
		mon: "Montag",
		tue: "Dienstag",
		wed: "Mittwoch",
		thu: "Donnerstag",
		fri: "Freitag",
		sat: "Samstag",
		sun: "Sonntag"
	}

	const { schedule } = $derived(data);
</script>  

<div class="flex w-full flex-col md:space-y-0">
	<div class="relative flex bg-[#eee] p-6 md:w-full">
		<div class="flex flex-1 flex-col space-y-3">
			<h1 class="text-2xl font-semibold">{dayTranslations[schedule.day]}</h1>
			<span class="text-lg"
				>{schedule.start.split(':').slice(0, 2).join(':')} - {schedule.end
					.split(':')
					.slice(0, 2)
					.join(':')} Uhr</span
			>
			<a
				href={schedule.location.link}
				class="group w-fit text-lg font-semibold transition duration-300"
				>{schedule.location.title}
				<!-- <svg
								width="18"
								height="18"
								viewBox="0 0 18 18"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M14.5358 11.5357L14.5358 5.46452C14.5357 4.93419 14.325 4.42561 13.95 4.05061C13.575 3.67561 13.0664 3.4649 12.5361 3.46482L6.46488 3.46482L6.46488 5.46452L11.1219 5.46452L3.34371 13.2427L4.75792 14.6569L12.5361 6.87873L12.5361 11.5357L14.5358 11.5357Z"
									fill="#000"
								/>
							</svg> -->
				<span
					class="block h-0.5 w-full max-w-0 bg-black transition-all duration-500 group-hover:max-w-full"
				></span>
			</a>
		</div>
		<div class="">
			<svg
				class=""
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g clip-path="url(#clip0_945_1108)">
					<circle cx="12" cy="12" r="11" stroke="black" stroke-width="2" />
					<path d="M12.0112 7L12 12.6361" stroke="black" stroke-width="2" stroke-linecap="round" />
					<path d="M15 16L12 13" stroke="black" stroke-width="2" stroke-linecap="round" />
					<rect x="11" y="9" width="1" height="4" fill="black" />
				</g>
				<defs>
					<clipPath id="clip0_945_1108">
						<rect width="24" height="24" fill="white" />
					</clipPath>
				</defs>
			</svg>
		</div>
	</div>
</div>
