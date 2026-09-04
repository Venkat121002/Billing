export const handleEnterToNext = (e) => {
    if (e.key === 'Enter') {
        const target = e.target;

        // Allow new lines in textareas
        if (target.tagName === 'TEXTAREA') return;

        // Only handle for inputs and selects
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;

        // Prevent default form submission or button trigger
        e.preventDefault();

        // Find all potential focusable elements
        const allElements = Array.from(document.querySelectorAll('input, select, textarea'));

        // Filter for elements we want to focus (skip disabled, hidden, and buttons)
        const focusable = allElements.filter(el =>
            // !el.readOnly &&
            !el.disabled &&
            el.type !== 'hidden' &&
            el.type !== 'submit' &&
            el.type !== 'button' &&
            el.tabIndex !== -1 &&
            el.offsetParent !== null // ensure element is visible
        );

        const currentIndex = focusable.indexOf(target);

        if (currentIndex > -1 && currentIndex < focusable.length - 1) {
            // Focus the next element
            focusable[currentIndex + 1].focus();
        }
    }
};
