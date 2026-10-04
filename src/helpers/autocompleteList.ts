// A scrollable replacement for the suggestion popup of Enketo's autocomplete select1 widget
// (XLSForm `appearance = autocomplete`, e.g. Patient Registry's "Tentative diagnosis").
//
// enketo-core's widget renders the choices as a native <datalist> on a fake text input. Electron
// does not use Chrome's datalist dropdown - it draws its own autofill popup, which cannot be
// scrolled, so on a long choice list only the first screenful of options was ever reachable.
// (enketo-core still ships a jQuery fallback dropdown, jquery.relevant-dropdown, but it no longer
// wires it up, it only opens on keyup, and its up-arrow handler throws on an undeclared variable.)
//
// This takes over the popup: the fake input's `list` attribute is removed as soon as it is
// interacted with (which stops Electron's popup), and a fixed-position list is shown instead,
// filled from the same <datalist>. Picking an option writes the label into the fake input and fires
// `input`, exactly what typing a matching label does, so the widget's own label -> value mapping
// still sets the field. Listeners are delegated from the form container, so they keep working when
// the widget rebuilds its fake input (dynamic itemsets) or a repeat adds a new instance.

const INPUT_SELECTOR = 'input.autocomplete';
const MAX_LIST_HEIGHT = 300;
const VIEWPORT_MARGIN = 8;

export function attachAutocompleteLists(container: HTMLElement): () => void {
    const list = document.createElement('ul');
    list.className = 'bahis-autocomplete-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    document.body.appendChild(list);

    let activeInput: HTMLInputElement | null = null;
    let activeIndex = -1;

    const isAutocompleteInput = (el: EventTarget | null): el is HTMLInputElement =>
        el instanceof HTMLInputElement && el.matches(INPUT_SELECTOR) && container.contains(el);

    // Moves `list` to `data-list` so Electron never shows its own (unscrollable) popup for it.
    const claim = (input: HTMLInputElement) => {
        const listId = input.getAttribute('list');
        if (listId !== null) {
            input.dataset.list = listId;
            input.removeAttribute('list');
        }
    };

    // The widget has already swapped each <option>'s value for its label (keeping the real value in
    // data-value), so option.value is the text to show and to write back into the input.
    const readLabels = (input: HTMLInputElement): string[] => {
        const listId = input.dataset.list;
        if (!listId) return [];
        const datalist = container.querySelector(`datalist#${CSS.escape(listId)}`);
        if (!datalist) return [];
        return Array.from(datalist.querySelectorAll('option'))
            .filter((option) => !option.classList.contains('itemset-template'))
            .map((option) => option.value)
            .filter((label) => label.length > 0);
    };

    const items = () => Array.from(list.children) as HTMLLIElement[];

    // Mouse hover highlights without scrolling (scrolling under the pointer would move the target).
    const setActiveWithoutScroll = (index: number) => {
        const all = items();
        all[activeIndex]?.classList.remove('active');
        activeIndex = index;
        all[activeIndex]?.classList.add('active');
    };

    const setActive = (index: number) => {
        const all = items();
        all[activeIndex]?.classList.remove('active');
        activeIndex = all.length ? Math.max(0, Math.min(index, all.length - 1)) : -1;
        const item = all[activeIndex];
        if (item) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        }
    };

    const position = () => {
        if (!activeInput || list.hidden) return;
        const rect = activeInput.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            close();
            return;
        }
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
        const spaceAbove = rect.top - VIEWPORT_MARGIN;
        const openUp = spaceBelow < Math.min(MAX_LIST_HEIGHT, list.scrollHeight) && spaceAbove > spaceBelow;
        list.style.left = `${rect.left}px`;
        list.style.width = `${rect.width}px`;
        list.style.maxHeight = `${Math.min(MAX_LIST_HEIGHT, openUp ? spaceAbove : spaceBelow)}px`;
        list.style.top = openUp ? '' : `${rect.bottom}px`;
        list.style.bottom = openUp ? `${window.innerHeight - rect.top}px` : '';
    };

    const render = () => {
        if (!activeInput) return;
        const labels = readLabels(activeInput);
        const text = activeInput.value.trim();
        // A field that already holds a valid choice shows every option (with that one highlighted),
        // so the agent can scroll to a different one without first clearing the input.
        const showAll = text === '' || labels.includes(activeInput.value);
        const needle = text.toLowerCase();
        const shown = showAll ? labels : labels.filter((label) => label.toLowerCase().includes(needle));

        list.replaceChildren(
            ...shown.map((label) => {
                const li = document.createElement('li');
                li.setAttribute('role', 'option');
                li.textContent = label;
                return li;
            }),
        );
        activeIndex = -1;
        list.hidden = shown.length === 0;
        list.scrollTop = 0;
        position();
        const selected = shown.indexOf(activeInput.value);
        if (selected >= 0) setActive(selected);
    };

    const open = (input: HTMLInputElement) => {
        if (input.readOnly || input.disabled || input.classList.contains('disabled')) return;
        claim(input);
        activeInput = input;
        render();
    };

    function close() {
        list.hidden = true;
        list.replaceChildren();
        activeIndex = -1;
        activeInput = null;
    }

    const choose = (label: string) => {
        const input = activeInput;
        if (!input) return;
        input.value = label;
        // handleInput re-renders the still-open list for this event; close() below then hides it.
        input.dispatchEvent(new Event('input', { bubbles: true }));
        close();
    };

    // Claim on pointerdown too (capture phase, before the click that would open Electron's popup);
    // focusin alone covers keyboard focus.
    const handlePointerDown = (event: PointerEvent) => {
        if (isAutocompleteInput(event.target)) claim(event.target);
    };

    const handleFocusIn = (event: FocusEvent) => {
        if (isAutocompleteInput(event.target)) open(event.target);
    };

    const handleClick = (event: MouseEvent) => {
        // Reopens the list after it was closed (Escape, or a choice) without leaving the field.
        if (isAutocompleteInput(event.target) && (event.target !== activeInput || list.hidden)) open(event.target);
    };

    const handleFocusOut = (event: FocusEvent) => {
        if (isAutocompleteInput(event.target) && event.target === activeInput) close();
    };

    const handleInput = (event: Event) => {
        if (!isAutocompleteInput(event.target)) return;
        if (event.target !== activeInput) {
            open(event.target);
        } else {
            render();
        }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (!isAutocompleteInput(event.target)) return;
        if (event.target !== activeInput || list.hidden) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                open(event.target);
            }
            return;
        }
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setActive(activeIndex + 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                setActive(activeIndex - 1);
                break;
            case 'PageDown':
                event.preventDefault();
                setActive(activeIndex + 10);
                break;
            case 'PageUp':
                event.preventDefault();
                setActive(activeIndex - 10);
                break;
            case 'Enter':
                if (activeIndex >= 0) {
                    event.preventDefault();
                    choose(items()[activeIndex].textContent ?? '');
                }
                break;
            case 'Escape':
                event.preventDefault();
                close();
                break;
        }
    };

    // Keep focus in the input while interacting with the list (scrollbar drags included), so
    // focusout doesn't close it before the click lands.
    const handleListMouseDown = (event: MouseEvent) => event.preventDefault();

    const handleListClick = (event: MouseEvent) => {
        const item = (event.target as HTMLElement).closest('li');
        if (item && list.contains(item)) choose(item.textContent ?? '');
    };

    const handleListMouseOver = (event: MouseEvent) => {
        const item = (event.target as HTMLElement).closest('li');
        if (item && list.contains(item)) setActiveWithoutScroll(items().indexOf(item as HTMLLIElement));
    };

    // The form scrolls inside the app layout, not the window, so listen to scrolls anywhere (capture)
    // to keep the fixed-position list attached to its input - ignoring the list's own scrolling.
    const handleScroll = (event: Event) => {
        if (event.target !== list) position();
    };

    container.addEventListener('pointerdown', handlePointerDown, true);
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    container.addEventListener('click', handleClick);
    container.addEventListener('input', handleInput);
    container.addEventListener('keydown', handleKeyDown);
    list.addEventListener('mousedown', handleListMouseDown);
    list.addEventListener('click', handleListClick);
    list.addEventListener('mouseover', handleListMouseOver);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', position);

    return () => {
        container.removeEventListener('pointerdown', handlePointerDown, true);
        container.removeEventListener('focusin', handleFocusIn);
        container.removeEventListener('focusout', handleFocusOut);
        container.removeEventListener('click', handleClick);
        container.removeEventListener('input', handleInput);
        container.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', position);
        list.remove();
    };
}
