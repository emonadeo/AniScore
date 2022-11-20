import './play.scss';

import { batch, Component, createMemo, createSignal, onMount } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { Anime as AnimeComponent } from 'src/components/Anime';
import { Keybinds } from 'src/components/Keybinds';
import { Anime } from 'src/util/anime';
import { createTree, Tree } from 'src/util/tree';

interface Props {
	source: Anime[];
	onDone: (list: Anime[]) => void;
}

export const Play: Component<Props> = function (props) {
	const [list, setList] = createSignal<Anime[]>([]);
	const [tree, setTree] = createSignal<Tree>({ index: 0 });

	const [progress, setProgress] = createSignal<number>(0);
	const maxProgress = createMemo<number>(() => {
		let sum = 0;
		for (let i = 1; i < props.source.length; i++) {
			sum += Math.floor(Math.log2(i)) + 1;
		}
		return sum;
	});

	const [localProgress, setLocalProgress] = createSignal<number>(0);
	const maxLocalProgress = createMemo<number>(() => Math.ceil(Math.log2(list().length)));

	const challenger = () => list().at(tree().index || 0) || props.source[0];
	const challengee = () => {
		tree(); // Refresh when tree changes to trigger animation
		return { ...(props.source[list().length] || props.source[0]) };
	};

	onMount(() => {
		if (props.source.length === 0) {
			console.error('List is empty.');
			return;
		}
		const initialList = [props.source[0]];
		// Initialize
		batch(() => {
			setList(initialList);
			setTree(createTree(list()) as Tree); // TODO: null safety
		});

		// TODO: Remove DEBUG
		// const test = setInterval(() => {
		// 	commit(false);
		// 	if (list().length === props.source.length) {
		// 		clearInterval(test);
		// 	}
		// }, 1);
	});

	function commit(above: boolean) {
		setProgress((p) => p + 1);
		setLocalProgress((p) => p + 1);

		const t = tree();
		const next = above ? t.above : t.below;

		// Enter next layer of binary tree
		if (next) {
			setTree(next);
			return;
		}

		// Insert into list after reaching final layer
		const l = list().slice();
		let pos = t.index;
		if (!above) pos += 1;
		l.splice(pos, 0, challengee());
		setList(l);

		// Boost progress bar if less steps were required than the theoretical maximum
		setProgress((p) => p + (maxLocalProgress() - localProgress()));

		// Done Condition
		if (l.length === props.source.length) {
			console.log(`🎉 Done in ${progress()} steps!`);
			props.onDone(list());
			setTree({ index: 0 }); // TODO: Remove
			return;
		}

		// Reset tree after inserting anime
		setTree(createTree(list()) as Tree); // TODO: null safety
		setLocalProgress(0);
	}

	function onLeft() {
		commit(false);
	}

	function onRight() {
		commit(true);
	}

	return (
		<div class="view-play">
			<div class="progress">
				<label for="bar" class="type-label-lg">
					{progress()} / {maxProgress()}
				</label>
				<progress id="bar" max={maxProgress()} value={progress()} />
			</div>
			<div class="duel">
				<Transition name="swap">
					<AnimeComponent class="left" anime={challenger()} onClick={onLeft} />
				</Transition>
				<Transition name="swap">
					<AnimeComponent class="right" anime={challengee()} onClick={onRight} />
				</Transition>
				<Keybinds keybinds={{ j: onLeft, k: onRight }} />
			</div>
		</div>
	);
};
