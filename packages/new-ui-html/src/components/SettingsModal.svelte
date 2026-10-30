<script lang="ts">
	import { Info, Music, Volume2 } from 'lucide-svelte';
	import BaseOverlay from './BaseOverlay.svelte';
	import BaseModalCard from './BaseModalCard.svelte';
	import BaseModalTitle from './BaseModalTitle.svelte';
	import BaseVolumeSlider from './BaseVolumeSlider.svelte';
	import { stateSound } from 'state-shared';
	import { i18nDerived } from '../i18n/i18nDerived';

	type Props = { isOpen: boolean; onClose: () => void; onOpenInfo: () => void };
	const { isOpen, onClose, onOpenInfo }: Props = $props();
</script>

<!-- Settings panel: navigation to Info, music volume, and sound effect volume. -->
{#if isOpen}
	<BaseOverlay onclick={onClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div onclick={(e) => e.stopPropagation()}>
			<BaseModalCard dark maxWidth="240px">
				<div class="p-4 flex flex-col gap-3">
					<BaseModalTitle dark>{i18nDerived.settings()}</BaseModalTitle>

					<!-- Info shortcut -->
					<button
						onclick={() => { onClose(); onOpenInfo(); }}
						class="flex w-full items-center gap-3 rounded-md p-2 text-white transition-colors hover:bg-gray-800 hover:text-cyan-400"
					>
						<Info class="h-6 w-6" />
						<span class="text-sm font-medium">{i18nDerived.info()}</span>
					</button>

					<BaseVolumeSlider
						label={i18nDerived.musicVolume()}
						value={stateSound.volumeValueMusic}
						onchange={(v) => (stateSound.volumeValueMusic = v)}
					>
						{#snippet icon()}<Music class="h-6 w-6" />{/snippet}
					</BaseVolumeSlider>

					<BaseVolumeSlider
						label={i18nDerived.soundEffectVolume()}
						value={stateSound.volumeValueSoundEffect}
						onchange={(v) => (stateSound.volumeValueSoundEffect = v)}
					>
						{#snippet icon()}<Volume2 class="h-6 w-6" />{/snippet}
					</BaseVolumeSlider>
				</div>
			</BaseModalCard>
		</div>
	</BaseOverlay>
{/if}
