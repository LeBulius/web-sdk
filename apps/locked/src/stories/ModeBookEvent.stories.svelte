<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'LOCKED/bookEvent',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';

	import LockedStoryLocale from './LockedStoryLocale.svelte';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import {
		getEventStory,
		playEventStory,
		type BookEventStoryType,
		type EventStoryRef,
	} from './pickStoryEvent';

	setContext();

	const eventStoryArgs = (type: BookEventStoryType, n: number) =>
		templateArgs({
			skipLoadingScreen: true,
			data: { type, n },
			action: async (data: EventStoryRef) => {
				await playEventStory(getEventStory(data.type, data.n));
			},
		});

	const playTemplate = async (args: TemplateArgs<EventStoryRef>) => {
		if (!args.data) return;
		await args.action?.(args.data);
	};
</script>

{#snippet template(args: TemplateArgs<EventStoryRef>)}
	<StoryGameTemplate skipLoadingScreen={args.skipLoadingScreen} action={() => playTemplate(args)}>
		<LockedStoryLocale>
			<Game />
		</LockedStoryLocale>
	</StoryGameTemplate>
{/snippet}

<Story exportName="Reveal01" name="reveal / 01" args={eventStoryArgs('reveal', 0)} {template} />
<Story exportName="Reveal02" name="reveal / 02" args={eventStoryArgs('reveal', 1)} {template} />
<Story exportName="Reveal03" name="reveal / 03" args={eventStoryArgs('reveal', 2)} {template} />
<Story exportName="Reveal04" name="reveal / 04" args={eventStoryArgs('reveal', 3)} {template} />
<Story exportName="Reveal05" name="reveal / 05" args={eventStoryArgs('reveal', 4)} {template} />
<Story exportName="Reveal06" name="reveal / 06" args={eventStoryArgs('reveal', 5)} {template} />
<Story exportName="Reveal07" name="reveal / 07" args={eventStoryArgs('reveal', 6)} {template} />
<Story exportName="Reveal08" name="reveal / 08" args={eventStoryArgs('reveal', 7)} {template} />
<Story exportName="Reveal09" name="reveal / 09" args={eventStoryArgs('reveal', 8)} {template} />
<Story exportName="Reveal10" name="reveal / 10" args={eventStoryArgs('reveal', 9)} {template} />

<Story exportName="WinInfo01" name="winInfo / 01" args={eventStoryArgs('winInfo', 0)} {template} />
<Story exportName="WinInfo02" name="winInfo / 02" args={eventStoryArgs('winInfo', 1)} {template} />
<Story exportName="WinInfo03" name="winInfo / 03" args={eventStoryArgs('winInfo', 2)} {template} />
<Story exportName="WinInfo04" name="winInfo / 04" args={eventStoryArgs('winInfo', 3)} {template} />
<Story exportName="WinInfo05" name="winInfo / 05" args={eventStoryArgs('winInfo', 4)} {template} />
<Story exportName="WinInfo06" name="winInfo / 06" args={eventStoryArgs('winInfo', 5)} {template} />
<Story exportName="WinInfo07" name="winInfo / 07" args={eventStoryArgs('winInfo', 6)} {template} />
<Story exportName="WinInfo08" name="winInfo / 08" args={eventStoryArgs('winInfo', 7)} {template} />
<Story exportName="WinInfo09" name="winInfo / 09" args={eventStoryArgs('winInfo', 8)} {template} />
<Story exportName="WinInfo10" name="winInfo / 10" args={eventStoryArgs('winInfo', 9)} {template} />

<Story exportName="SetWin01" name="setWin / 01" args={eventStoryArgs('setWin', 0)} {template} />
<Story exportName="SetWin02" name="setWin / 02" args={eventStoryArgs('setWin', 1)} {template} />
<Story exportName="SetWin03" name="setWin / 03" args={eventStoryArgs('setWin', 2)} {template} />
<Story exportName="SetWin04" name="setWin / 04" args={eventStoryArgs('setWin', 3)} {template} />
<Story exportName="SetWin05" name="setWin / 05" args={eventStoryArgs('setWin', 4)} {template} />
<Story exportName="SetWin06" name="setWin / 06" args={eventStoryArgs('setWin', 5)} {template} />
<Story exportName="SetWin07" name="setWin / 07" args={eventStoryArgs('setWin', 6)} {template} />
<Story exportName="SetWin08" name="setWin / 08" args={eventStoryArgs('setWin', 7)} {template} />
<Story exportName="SetWin09" name="setWin / 09" args={eventStoryArgs('setWin', 8)} {template} />
<Story exportName="SetWin10" name="setWin / 10" args={eventStoryArgs('setWin', 9)} {template} />

<Story exportName="SetTotalWin01" name="setTotalWin / 01" args={eventStoryArgs('setTotalWin', 0)} {template} />
<Story exportName="SetTotalWin02" name="setTotalWin / 02" args={eventStoryArgs('setTotalWin', 1)} {template} />
<Story exportName="SetTotalWin03" name="setTotalWin / 03" args={eventStoryArgs('setTotalWin', 2)} {template} />
<Story exportName="SetTotalWin04" name="setTotalWin / 04" args={eventStoryArgs('setTotalWin', 3)} {template} />
<Story exportName="SetTotalWin05" name="setTotalWin / 05" args={eventStoryArgs('setTotalWin', 4)} {template} />
<Story exportName="SetTotalWin06" name="setTotalWin / 06" args={eventStoryArgs('setTotalWin', 5)} {template} />
<Story exportName="SetTotalWin07" name="setTotalWin / 07" args={eventStoryArgs('setTotalWin', 6)} {template} />
<Story exportName="SetTotalWin08" name="setTotalWin / 08" args={eventStoryArgs('setTotalWin', 7)} {template} />
<Story exportName="SetTotalWin09" name="setTotalWin / 09" args={eventStoryArgs('setTotalWin', 8)} {template} />
<Story exportName="SetTotalWin10" name="setTotalWin / 10" args={eventStoryArgs('setTotalWin', 9)} {template} />

<Story exportName="TumbleBoard01" name="tumbleBoard / 01" args={eventStoryArgs('tumbleBoard', 0)} {template} />
<Story exportName="TumbleBoard02" name="tumbleBoard / 02" args={eventStoryArgs('tumbleBoard', 1)} {template} />
<Story exportName="TumbleBoard03" name="tumbleBoard / 03" args={eventStoryArgs('tumbleBoard', 2)} {template} />
<Story exportName="TumbleBoard04" name="tumbleBoard / 04" args={eventStoryArgs('tumbleBoard', 3)} {template} />
<Story exportName="TumbleBoard05" name="tumbleBoard / 05" args={eventStoryArgs('tumbleBoard', 4)} {template} />
<Story exportName="TumbleBoard06" name="tumbleBoard / 06" args={eventStoryArgs('tumbleBoard', 5)} {template} />
<Story exportName="TumbleBoard07" name="tumbleBoard / 07" args={eventStoryArgs('tumbleBoard', 6)} {template} />
<Story exportName="TumbleBoard08" name="tumbleBoard / 08" args={eventStoryArgs('tumbleBoard', 7)} {template} />
<Story exportName="TumbleBoard09" name="tumbleBoard / 09" args={eventStoryArgs('tumbleBoard', 8)} {template} />
<Story exportName="TumbleBoard10" name="tumbleBoard / 10" args={eventStoryArgs('tumbleBoard', 9)} {template} />

<Story exportName="UpdateGrid01" name="updateGrid / 01" args={eventStoryArgs('updateGrid', 0)} {template} />
<Story exportName="UpdateGrid02" name="updateGrid / 02" args={eventStoryArgs('updateGrid', 1)} {template} />
<Story exportName="UpdateGrid03" name="updateGrid / 03" args={eventStoryArgs('updateGrid', 2)} {template} />
<Story exportName="UpdateGrid04" name="updateGrid / 04" args={eventStoryArgs('updateGrid', 3)} {template} />
<Story exportName="UpdateGrid05" name="updateGrid / 05" args={eventStoryArgs('updateGrid', 4)} {template} />
<Story exportName="UpdateGrid06" name="updateGrid / 06" args={eventStoryArgs('updateGrid', 5)} {template} />
<Story exportName="UpdateGrid07" name="updateGrid / 07" args={eventStoryArgs('updateGrid', 6)} {template} />
<Story exportName="UpdateGrid08" name="updateGrid / 08" args={eventStoryArgs('updateGrid', 7)} {template} />
<Story exportName="UpdateGrid09" name="updateGrid / 09" args={eventStoryArgs('updateGrid', 8)} {template} />
<Story exportName="UpdateGrid10" name="updateGrid / 10" args={eventStoryArgs('updateGrid', 9)} {template} />

<Story exportName="FireFramesPlaced01" name="fireFramesPlaced / 01" args={eventStoryArgs('fireFramesPlaced', 0)} {template} />
<Story exportName="FireFramesPlaced02" name="fireFramesPlaced / 02" args={eventStoryArgs('fireFramesPlaced', 1)} {template} />
<Story exportName="FireFramesPlaced03" name="fireFramesPlaced / 03" args={eventStoryArgs('fireFramesPlaced', 2)} {template} />
<Story exportName="FireFramesPlaced04" name="fireFramesPlaced / 04" args={eventStoryArgs('fireFramesPlaced', 3)} {template} />
<Story exportName="FireFramesPlaced05" name="fireFramesPlaced / 05" args={eventStoryArgs('fireFramesPlaced', 4)} {template} />
<Story exportName="FireFramesPlaced06" name="fireFramesPlaced / 06" args={eventStoryArgs('fireFramesPlaced', 5)} {template} />
<Story exportName="FireFramesPlaced07" name="fireFramesPlaced / 07" args={eventStoryArgs('fireFramesPlaced', 6)} {template} />
<Story exportName="FireFramesPlaced08" name="fireFramesPlaced / 08" args={eventStoryArgs('fireFramesPlaced', 7)} {template} />
<Story exportName="FireFramesPlaced09" name="fireFramesPlaced / 09" args={eventStoryArgs('fireFramesPlaced', 8)} {template} />
<Story exportName="FireFramesPlaced10" name="fireFramesPlaced / 10" args={eventStoryArgs('fireFramesPlaced', 9)} {template} />

<Story exportName="NewExpandingWilds01" name="newExpandingWilds / 01" args={eventStoryArgs('newExpandingWilds', 0)} {template} />
<Story exportName="NewExpandingWilds02" name="newExpandingWilds / 02" args={eventStoryArgs('newExpandingWilds', 1)} {template} />
<Story exportName="NewExpandingWilds03" name="newExpandingWilds / 03" args={eventStoryArgs('newExpandingWilds', 2)} {template} />
<Story exportName="NewExpandingWilds04" name="newExpandingWilds / 04" args={eventStoryArgs('newExpandingWilds', 3)} {template} />
<Story exportName="NewExpandingWilds05" name="newExpandingWilds / 05" args={eventStoryArgs('newExpandingWilds', 4)} {template} />
<Story exportName="NewExpandingWilds06" name="newExpandingWilds / 06" args={eventStoryArgs('newExpandingWilds', 5)} {template} />
<Story exportName="NewExpandingWilds07" name="newExpandingWilds / 07" args={eventStoryArgs('newExpandingWilds', 6)} {template} />
<Story exportName="NewExpandingWilds08" name="newExpandingWilds / 08" args={eventStoryArgs('newExpandingWilds', 7)} {template} />
<Story exportName="NewExpandingWilds09" name="newExpandingWilds / 09" args={eventStoryArgs('newExpandingWilds', 8)} {template} />
<Story exportName="NewExpandingWilds10" name="newExpandingWilds / 10" args={eventStoryArgs('newExpandingWilds', 9)} {template} />

<Story exportName="ContrabandSwap01" name="contrabandSwap / 01" args={eventStoryArgs('contrabandSwap', 0)} {template} />
<Story exportName="ContrabandSwap02" name="contrabandSwap / 02" args={eventStoryArgs('contrabandSwap', 1)} {template} />
<Story exportName="ContrabandSwap03" name="contrabandSwap / 03" args={eventStoryArgs('contrabandSwap', 2)} {template} />
<Story exportName="ContrabandSwap04" name="contrabandSwap / 04" args={eventStoryArgs('contrabandSwap', 3)} {template} />
<Story exportName="ContrabandSwap05" name="contrabandSwap / 05" args={eventStoryArgs('contrabandSwap', 4)} {template} />
<Story exportName="ContrabandSwap06" name="contrabandSwap / 06" args={eventStoryArgs('contrabandSwap', 5)} {template} />
<Story exportName="ContrabandSwap07" name="contrabandSwap / 07" args={eventStoryArgs('contrabandSwap', 6)} {template} />
<Story exportName="ContrabandSwap08" name="contrabandSwap / 08" args={eventStoryArgs('contrabandSwap', 7)} {template} />
<Story exportName="ContrabandSwap09" name="contrabandSwap / 09" args={eventStoryArgs('contrabandSwap', 8)} {template} />
<Story exportName="ContrabandSwap10" name="contrabandSwap / 10" args={eventStoryArgs('contrabandSwap', 9)} {template} />

<Story exportName="FreeSpinTrigger01" name="freeSpinTrigger / 01" args={eventStoryArgs('freeSpinTrigger', 0)} {template} />
<Story exportName="FreeSpinTrigger02" name="freeSpinTrigger / 02" args={eventStoryArgs('freeSpinTrigger', 1)} {template} />
<Story exportName="FreeSpinTrigger03" name="freeSpinTrigger / 03" args={eventStoryArgs('freeSpinTrigger', 2)} {template} />
<Story exportName="FreeSpinTrigger04" name="freeSpinTrigger / 04" args={eventStoryArgs('freeSpinTrigger', 3)} {template} />
<Story exportName="FreeSpinTrigger05" name="freeSpinTrigger / 05" args={eventStoryArgs('freeSpinTrigger', 4)} {template} />
<Story exportName="FreeSpinTrigger06" name="freeSpinTrigger / 06" args={eventStoryArgs('freeSpinTrigger', 5)} {template} />
<Story exportName="FreeSpinTrigger07" name="freeSpinTrigger / 07" args={eventStoryArgs('freeSpinTrigger', 6)} {template} />
<Story exportName="FreeSpinTrigger08" name="freeSpinTrigger / 08" args={eventStoryArgs('freeSpinTrigger', 7)} {template} />
<Story exportName="FreeSpinTrigger09" name="freeSpinTrigger / 09" args={eventStoryArgs('freeSpinTrigger', 8)} {template} />
<Story exportName="FreeSpinTrigger10" name="freeSpinTrigger / 10" args={eventStoryArgs('freeSpinTrigger', 9)} {template} />

<Story exportName="FreeSpinRetrigger01" name="freeSpinRetrigger / 01" args={eventStoryArgs('freeSpinRetrigger', 0)} {template} />
<Story exportName="FreeSpinRetrigger02" name="freeSpinRetrigger / 02" args={eventStoryArgs('freeSpinRetrigger', 1)} {template} />
<Story exportName="FreeSpinRetrigger03" name="freeSpinRetrigger / 03" args={eventStoryArgs('freeSpinRetrigger', 2)} {template} />
<Story exportName="FreeSpinRetrigger04" name="freeSpinRetrigger / 04" args={eventStoryArgs('freeSpinRetrigger', 3)} {template} />
<Story exportName="FreeSpinRetrigger05" name="freeSpinRetrigger / 05" args={eventStoryArgs('freeSpinRetrigger', 4)} {template} />
<Story exportName="FreeSpinRetrigger06" name="freeSpinRetrigger / 06" args={eventStoryArgs('freeSpinRetrigger', 5)} {template} />
<Story exportName="FreeSpinRetrigger07" name="freeSpinRetrigger / 07" args={eventStoryArgs('freeSpinRetrigger', 6)} {template} />
<Story exportName="FreeSpinRetrigger08" name="freeSpinRetrigger / 08" args={eventStoryArgs('freeSpinRetrigger', 7)} {template} />
<Story exportName="FreeSpinRetrigger09" name="freeSpinRetrigger / 09" args={eventStoryArgs('freeSpinRetrigger', 8)} {template} />
<Story exportName="FreeSpinRetrigger10" name="freeSpinRetrigger / 10" args={eventStoryArgs('freeSpinRetrigger', 9)} {template} />

<Story exportName="UpdateFreeSpin01" name="updateFreeSpin / 01" args={eventStoryArgs('updateFreeSpin', 0)} {template} />
<Story exportName="UpdateFreeSpin02" name="updateFreeSpin / 02" args={eventStoryArgs('updateFreeSpin', 1)} {template} />
<Story exportName="UpdateFreeSpin03" name="updateFreeSpin / 03" args={eventStoryArgs('updateFreeSpin', 2)} {template} />
<Story exportName="UpdateFreeSpin04" name="updateFreeSpin / 04" args={eventStoryArgs('updateFreeSpin', 3)} {template} />
<Story exportName="UpdateFreeSpin05" name="updateFreeSpin / 05" args={eventStoryArgs('updateFreeSpin', 4)} {template} />
<Story exportName="UpdateFreeSpin06" name="updateFreeSpin / 06" args={eventStoryArgs('updateFreeSpin', 5)} {template} />
<Story exportName="UpdateFreeSpin07" name="updateFreeSpin / 07" args={eventStoryArgs('updateFreeSpin', 6)} {template} />
<Story exportName="UpdateFreeSpin08" name="updateFreeSpin / 08" args={eventStoryArgs('updateFreeSpin', 7)} {template} />
<Story exportName="UpdateFreeSpin09" name="updateFreeSpin / 09" args={eventStoryArgs('updateFreeSpin', 8)} {template} />
<Story exportName="UpdateFreeSpin10" name="updateFreeSpin / 10" args={eventStoryArgs('updateFreeSpin', 9)} {template} />

<Story exportName="FreeSpinEnd01" name="freeSpinEnd / 01" args={eventStoryArgs('freeSpinEnd', 0)} {template} />
<Story exportName="FreeSpinEnd02" name="freeSpinEnd / 02" args={eventStoryArgs('freeSpinEnd', 1)} {template} />
<Story exportName="FreeSpinEnd03" name="freeSpinEnd / 03" args={eventStoryArgs('freeSpinEnd', 2)} {template} />
<Story exportName="FreeSpinEnd04" name="freeSpinEnd / 04" args={eventStoryArgs('freeSpinEnd', 3)} {template} />
<Story exportName="FreeSpinEnd05" name="freeSpinEnd / 05" args={eventStoryArgs('freeSpinEnd', 4)} {template} />
<Story exportName="FreeSpinEnd06" name="freeSpinEnd / 06" args={eventStoryArgs('freeSpinEnd', 5)} {template} />
<Story exportName="FreeSpinEnd07" name="freeSpinEnd / 07" args={eventStoryArgs('freeSpinEnd', 6)} {template} />
<Story exportName="FreeSpinEnd08" name="freeSpinEnd / 08" args={eventStoryArgs('freeSpinEnd', 7)} {template} />
<Story exportName="FreeSpinEnd09" name="freeSpinEnd / 09" args={eventStoryArgs('freeSpinEnd', 8)} {template} />
<Story exportName="FreeSpinEnd10" name="freeSpinEnd / 10" args={eventStoryArgs('freeSpinEnd', 9)} {template} />

<Story exportName="FinalWin01" name="finalWin / 01" args={eventStoryArgs('finalWin', 0)} {template} />
<Story exportName="FinalWin02" name="finalWin / 02" args={eventStoryArgs('finalWin', 1)} {template} />
<Story exportName="FinalWin03" name="finalWin / 03" args={eventStoryArgs('finalWin', 2)} {template} />
<Story exportName="FinalWin04" name="finalWin / 04" args={eventStoryArgs('finalWin', 3)} {template} />
<Story exportName="FinalWin05" name="finalWin / 05" args={eventStoryArgs('finalWin', 4)} {template} />
<Story exportName="FinalWin06" name="finalWin / 06" args={eventStoryArgs('finalWin', 5)} {template} />
<Story exportName="FinalWin07" name="finalWin / 07" args={eventStoryArgs('finalWin', 6)} {template} />
<Story exportName="FinalWin08" name="finalWin / 08" args={eventStoryArgs('finalWin', 7)} {template} />
<Story exportName="FinalWin09" name="finalWin / 09" args={eventStoryArgs('finalWin', 8)} {template} />
<Story exportName="FinalWin10" name="finalWin / 10" args={eventStoryArgs('finalWin', 9)} {template} />

<Story exportName="Wincap01" name="wincap / 01" args={eventStoryArgs('wincap', 0)} {template} />
<Story exportName="Wincap02" name="wincap / 02" args={eventStoryArgs('wincap', 1)} {template} />
