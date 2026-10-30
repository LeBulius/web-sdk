<script lang="ts">
	import type { LoadedAudio } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { sound, type SoundName } from '../game/sound';

	const context = getContext();

	$effect(() => {
		const loadedAudio = context.stateApp.loadedAssets['sound'] as LoadedAudio<SoundName> | undefined;
		if (!loadedAudio) return;

		const { destroy } = sound.load($state.snapshot(loadedAudio) as LoadedAudio<SoundName>);
		return () => {
			destroy();
		};
	});

	sound.enableEffect();
	sound.volumeEffect();
</script>
