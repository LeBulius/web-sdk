<script lang="ts">
	import { X } from 'lucide-svelte';

	let { onClose }: { onClose: () => void } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-md sm:p-8">
	<!-- Close Button -->
	<button
		onclick={onClose}
		class="fixed right-4 top-4 z-[60] flex h-12 w-12 items-center justify-center transition-opacity hover:opacity-80"
		aria-label="Close info modal"
	>
		<X class="h-10 w-10 text-white" strokeWidth={3} />
	</button>

	<!-- Scrollable Content Box -->
	<div class="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-gray-700 bg-gray-900 p-6 md:p-10 shadow-2xl text-white">
		<h1 class="text-3xl font-black text-cyan-400 text-center tracking-tight mb-10">Paytable & Game Rules</h1>

		<div class="space-y-12">

			<!-- ── PAYTABLE ── -->
			<section>
				<h2 class="text-xl font-bold mb-4 pb-2 border-b border-gray-700">Symbol Payouts</h2>
				<p class="text-sm text-gray-400 mb-4">Payouts shown as a multiplier of your total bet for matching symbols on a payline left to right.</p>
				<div class="overflow-hidden rounded-xl border border-gray-700">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-gray-800 text-gray-400 text-xs uppercase tracking-widest">
								<th class="px-4 py-3 text-left">Symbol</th>
								<th class="px-4 py-3 text-center">3×</th>
								<th class="px-4 py-3 text-center">4×</th>
								<th class="px-4 py-3 text-center">5×</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-700/50">
							<tr class="bg-gray-900 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 font-bold text-yellow-300">💎 Diamond</td>
								<td class="px-4 py-3 text-center">500×</td>
								<td class="px-4 py-3 text-center">1,000×</td>
								<td class="px-4 py-3 text-center text-cyan-400 font-bold">5,000×</td>
							</tr>
							<tr class="bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 font-bold text-purple-300">🔮 Crystal</td>
								<td class="px-4 py-3 text-center">200×</td>
								<td class="px-4 py-3 text-center">400×</td>
								<td class="px-4 py-3 text-center">1,500×</td>
							</tr>
							<tr class="bg-gray-900 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 font-bold text-red-300">❤️ Heart</td>
								<td class="px-4 py-3 text-center">100×</td>
								<td class="px-4 py-3 text-center">250×</td>
								<td class="px-4 py-3 text-center">750×</td>
							</tr>
							<tr class="bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 font-bold text-blue-300">🔵 Sphere</td>
								<td class="px-4 py-3 text-center">50×</td>
								<td class="px-4 py-3 text-center">125×</td>
								<td class="px-4 py-3 text-center">400×</td>
							</tr>
							<tr class="bg-gray-900 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 font-bold text-green-300">🍀 Clover</td>
								<td class="px-4 py-3 text-center">25×</td>
								<td class="px-4 py-3 text-center">75×</td>
								<td class="px-4 py-3 text-center">200×</td>
							</tr>
							<tr class="bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 text-gray-300">🅰 Ace</td>
								<td class="px-4 py-3 text-center">10×</td>
								<td class="px-4 py-3 text-center">25×</td>
								<td class="px-4 py-3 text-center">75×</td>
							</tr>
							<tr class="bg-gray-900 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 text-gray-300">🅺 King</td>
								<td class="px-4 py-3 text-center">8×</td>
								<td class="px-4 py-3 text-center">20×</td>
								<td class="px-4 py-3 text-center">60×</td>
							</tr>
							<tr class="bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
								<td class="px-4 py-3 text-gray-300">🅠 Queen</td>
								<td class="px-4 py-3 text-center">5×</td>
								<td class="px-4 py-3 text-center">15×</td>
								<td class="px-4 py-3 text-center">40×</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<!-- Special Symbols -->
			<section>
				<h2 class="text-xl font-bold mb-4 pb-2 border-b border-gray-700">Special Symbols</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
						<p class="text-2xl mb-2">⚡</p>
						<h3 class="font-bold text-cyan-300 mb-1">Wild</h3>
						<p class="text-sm text-gray-400">Substitutes for all regular symbols. Cannot replace Scatter or Bonus symbols.</p>
					</div>
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
						<p class="text-2xl mb-2">🌀</p>
						<h3 class="font-bold text-cyan-300 mb-1">Scatter</h3>
						<p class="text-sm text-gray-400">3 or more anywhere triggers Free Spins. Pays anywhere — no payline required.</p>
					</div>
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
						<p class="text-2xl mb-2">🎯</p>
						<h3 class="font-bold text-cyan-300 mb-1">Bonus</h3>
						<p class="text-sm text-gray-400">Land 3 Bonus symbols to trigger the pick-and-click bonus game for instant prizes.</p>
					</div>
				</div>
			</section>

			<!-- ── GAME RULES ── -->
			<section>
				<h2 class="text-xl font-bold mb-4 pb-2 border-b border-gray-700">How to Play</h2>
				<div class="space-y-3 text-sm text-gray-300 leading-relaxed">
					<p>Select your bet using the controls at the bottom and press spin. Wins occur when matching symbols appear consecutively on a payline from the leftmost reel.</p>
					<p>Use <strong class="text-white">Turbo</strong> (⚡) to speed up animations, or <strong class="text-white">Autoplay</strong> to run uninterrupted spins.</p>
				</div>
			</section>

			<section>
				<h2 class="text-xl font-bold mb-3 pb-2 border-b border-gray-700">Tumble Mechanic</h2>
				<p class="text-sm text-gray-300 leading-relaxed">Every win triggers a <strong class="text-white">Tumble</strong> — winning symbols are removed and replaced by new ones cascading from above. Tumbles continue until no new wins form, all on a single paid spin.</p>
			</section>

			<section>
				<h2 class="text-xl font-bold mb-4 pb-2 border-b border-gray-700">Bonus Features</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
						<h3 class="font-bold text-cyan-300 mb-2">Extra Chance</h3>
						<p class="text-sm text-gray-400">Cost: <span class="text-white font-bold">3× bet.</span> Adds extra Scatters to the reels, doubling your Free Spins trigger chance.</p>
					</div>
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
						<h3 class="font-bold text-cyan-300 mb-2">Engine Bonus</h3>
						<p class="text-sm text-gray-400">Cost: <span class="text-white font-bold">100× bet.</span> 10 Free Spins. Every winning tumble increases a permanent multiplier by +1× (no cap).</p>
					</div>
					<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
						<h3 class="font-bold text-cyan-300 mb-2">Nitro Bonus</h3>
						<p class="text-sm text-gray-400">Cost: <span class="text-white font-bold">300× bet.</span> Moving Wild frames and a grid multiplier starting at 10×. Maximum volatility.</p>
					</div>
				</div>
			</section>

			<section class="border-t border-gray-800 pt-6">
				<h2 class="text-xl font-bold mb-3">Return to Player (RTP)</h2>
				<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-5 text-sm text-gray-300 space-y-1">
					<p>Theoretical RTP: <span class="text-white font-bold">96.50%</span></p>
					<p>Maximum Win: <span class="text-white font-bold">10,000× total bet</span></p>
					<p>Min Bet: <span class="text-white font-bold">$0.10</span> · Max Bet: <span class="text-white font-bold">$250.00</span></p>
					<p class="text-gray-500 text-xs pt-2">Please gamble responsibly.</p>
				</div>
			</section>

		</div>
	</div>
</div>
