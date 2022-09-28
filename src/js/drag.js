import { floor, HTML, INSERT_BEFORE, ROOT } from "./constants";
import { getPlaceholderPosition } from "./position";
import { scroll } from "./scroll";
import { getBounds, getParent, getScrollableAncestors, insertElement } from "./utils/dom";
import { validateEvent } from "./utils/util";

export const sort = (tartib) => {

    const list = tartib.el;

    let draggedItem;

    let placeholder;

    let draggedItemRect;

    let scrollableAncestors;

    let startX;

    let startY;

    let cursorX;

    let cursorY;

    let startMoving = false;

    let isDragging = false;


    /**
     * Starts dragging.
     *
     * @param {Event} e - Mousedown.
     */
    const dragStart = e => {

        e = validateEvent(e);

        if (! e) {
            return;
        }

        let target = e.target;

        draggedItem = target.closest('.tartib__item');

        if (draggedItem) {
            placeholder = draggedItem.cloneNode();
            placeholder.classList.add('tartib__placeholder');

            draggedItemRect = getBounds(draggedItem);
            startX = e.clientX;
            startY = e.clientY;

            cursorX = startX - draggedItemRect.left;
            cursorY = startY - draggedItemRect.top;

            scrollableAncestors = getScrollableAncestors(list);

            // console.log(scrollableAncestors);
            isDragging = true;
        }
    }


    /**
     * Drags item.
     *
     * @param {Event} e - Mousemove.
     */
    const dragMove = e => {
        if (isDragging) {


            let { target, clientX: mouseX, clientY: mouseY } = e;


            if (! startMoving) {
                draggedItem.classList.add('tartib__item--dragged');
                draggedItem.style.width = draggedItemRect.width + 'px';
                draggedItem.style.height = draggedItemRect.height + 'px';

                insertElement(INSERT_BEFORE, draggedItem, placeholder);

                placeholder.style.height = draggedItemRect.height + 'px';
                startMoving = true;
            }

            // Move Item.
            draggedItem.style.top = mouseY - cursorY + 'px';
            draggedItem.style.left = mouseX - cursorX + 'px';

            let itemBounds = getBounds(draggedItem);
            let { top, right, bottom, left } = getBounds(placeholder);
            let isSortingY = mouseX <= floor(right) && mouseX >= floor(left);
            let isSortingX = mouseY <= floor(bottom) && mouseY >= floor(top);

            /**
             * Scroll to view where to drop.
             */
            scrollableAncestors.forEach(scrollable => {
                let bounds = getBounds(scrollable);

                if (scrollable === HTML) {
                    let domHeight = HTML.clientHeight;

                    bounds = {
                        top: 0,
                        left: 0,
                        right: bounds.right,
                        width: bounds.width,
                        bottom: domHeight,
                        height: domHeight
                    }
                }

                // Scroll Vertically.
                if (isSortingY) {
                    scroll(scrollable, bounds, itemBounds, true);
                }

                // Scroll Horizontally.
                if (isSortingX) {
                    scroll(scrollable, bounds, itemBounds, false);
                }
            });

            /**
             * Sort items.
             */
            if (target.closest('.tartib__item') && target !== placeholder) {
                let targetBounds = getBounds(target);
                let position;

                // Sorting item diagonally.
                if (! isSortingX && ! isSortingY) {
                    // Get position horizontally, pass it to the vertical position.
                    position = getPlaceholderPosition(targetBounds, startY, mouseY, true, getPlaceholderPosition(targetBounds, startX, mouseX));
                } else {
                    // Sorting item vertically.
                    if (! isSortingX) {
                        position = getPlaceholderPosition(targetBounds, startY, mouseY, true);
                    }

                    // Sorting item horizontally.
                    if (! isSortingY) {
                        position = getPlaceholderPosition(targetBounds, startX, mouseX);
                    }
                }

                if (position) {
                    insertElement(position, target, placeholder);
                    startY = mouseY;
                    startX = mouseX;
                }
            }
        }
    }

    /**
     * Ends drag.
     *
     * @param {Event} e - Mouseup.
     */
    const dragEnd = e => {
        if (isDragging) {
            draggedItem.style = '';
            draggedItem.classList.remove('tartib__item--dragged');
            if (getParent(placeholder) === list) {
                list.replaceChild(draggedItem, placeholder);
            }
            isDragging = startMoving = false;
        }
    }


    list.addEventListener('mousedown', dragStart);

    ROOT.addEventListener('pointermove', dragMove, { passive: false });

    ROOT.addEventListener('mouseup', dragEnd);
}