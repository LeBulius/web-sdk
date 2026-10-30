<script lang="ts">
	import { stateSound } from 'state-shared';
	import { Info } from 'lucide-svelte';
	import SettingsRowInfo from './settings/SettingsRowInfo.svelte';
	import SettingsRowMusicVolume from './settings/SettingsRowMusicVolume.svelte';
	import SettingsRowSfxVolume from './settings/SettingsRowSfxVolume.svelte';
</script>

<!-- Settings Panel — assembled from focused row sub-components -->
<div class="min-w-[180px] rounded-lg bg-gray-900/75 p-4 shadow-xl text-left">
	<div class="flex flex-col gap-4">
		<SettingsRowInfo />
		<SettingsRowMusicVolume />
		<SettingsRowSfxVolume />
	</div>
</div>
