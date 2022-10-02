import { ELEVATION_CLASSNAME, ITEM_DRAGGED_CLASSNAME, ITEM_SELECTOR, PLACEHOLDER_CLASSNAME } from "../utils/classes";
import { getPlaceholderPosition } from "../placeholder/position";
import { autoScroll } from "../scroll/autoScroll";
import { classList, getBounds, getElement, getItem, getParent, inlineStyles } from "../utils/dom";
import { getDragPoint } from "../utils/dragPoint";
import { EventBinder } from "./events/binder";
import { toArray } from "../utils/array";
import { getScrollableAncestors } from "../scroll/scrollable";
import { insertPlaceholder } from "../placeholder/insert";
import { CHANGE_EVENT, END_EVENT, HTML, INSERT_BEFORE, MOVE_EVENT, ROOT, SORT_EVENT, START_EVENT } from "../constants";



export const sortable = (tartib) => {

    const { el: list, config, _e: { _emit } } = tartib;

    const floor = Math.floor;

    const eventBinder = EventBinder();

    let draggedItem;

    let placeholder;

    let scrollableAncestors;

    let itemClassList;

    let itemBounds;

    let startList;

    let startPoint = {}

    let dragPoint = {}

    let eventObject;

    let startMoving = false;

    let isDragging = false;


    /**
     * Starts dragging.
     *
     * @param {Event} e - Mousedown.
     */
    const dragStart = e => {

        let { dragHandle, dragFrom, disabled, autoScroll } = config;
        let target = e.target;

        draggedItem = getItem(target);

        if (disabled || !draggedItem || (dragHandle && target !== getElement(dragHandle, draggedItem))) {
            return;
        }

        draggedItem.releasePointerCapture(e.pointerId);
        placeholder = draggedItem.cloneNode();
        startList = toArray(getElement(ITEM_SELECTOR, list, true));

        itemClassList = classList(draggedItem);

        startPoint = {
            x: e.clientX,
            y: e.clientY
        }

        eventObject = {
            target: draggedItem,
            relatedTarget: null,
            placeholder,
            el: list,
            items: startList
        }

        dragPoint = getDragPoint(dragHandle ? target : draggedItem, dragFrom, startPoint);
        scrollableAncestors = autoScroll ? getScrollableAncestors(list) : [];
        isDragging = true;
    }

    /**
     * Drags item.
     *
     * @param {Event} e - Mousemove.
     */
    const dragMove = e => {
        if (isDragging) {
            let { target: relatedTarget, clientX: mouseX, clientY: mouseY } = e;
            let data;

            if (! startMoving) {

                setItemPosition(mouseX, mouseY);

                let { cursor, elevation, placeholder: placeholderClassname, opacity, active } = config;
                let { width, height, x, y } = getBounds(draggedItem);

                height += 'px';
                width += 'px';

                inlineStyles(draggedItem, {
                    width,
                    height,
                    opacity: opacity > 0 && opacity < 1 ? opacity : false,
                });
                inlineStyles(HTML, { cursor });
                inlineStyles(placeholder, { height });

                _emit(START_EVENT, eventObject, { x, y });

                itemClassList._add([ITEM_DRAGGED_CLASSNAME, elevation && ELEVATION_CLASSNAME, active]);

                classList(placeholder)._add(placeholderClassname || PLACEHOLDER_CLASSNAME);
                insertPlaceholder(INSERT_BEFORE, draggedItem, placeholder);
                startMoving = true;
            }
            // Move Item.
            itemBounds = getBounds(draggedItem);
            setItemPosition(mouseX, mouseY, config.axis);

            data = {
                x: itemBounds.x,
                y: itemBounds.y
            }

            _emit(MOVE_EVENT, eventObject, data, { relatedTarget });

            /**
             * Scroll to view where to drop.
             */
            autoScroll(scrollableAncestors, itemBounds);

            relatedTarget = getItem(relatedTarget);

            if (list.contains(relatedTarget) && relatedTarget !== placeholder) {
                let bounds = getBounds(relatedTarget);
                let { top, right, bottom, left } = getBounds(placeholder);
                let movingVertically = mouseX <= floor(right) && mouseX >= floor(left);
                let movingHorizontally = mouseY <= floor(bottom) && mouseY >= floor(top);
                let position;

                // Sorting item diagonally.
                if (! movingHorizontally && ! movingVertically) {
                    // Get position horizontally, pass it to the vertical position.
                    position = getPlaceholderPosition(bounds, startPoint, mouseY, 'y', getPlaceholderPosition(bounds, startPoint, mouseX, 'x'));
                } else {
                    // Sorting item vertically.
                    if (! movingHorizontally) {
                        position = getPlaceholderPosition(bounds, startPoint, mouseY, 'y');
                    }

                    // Sorting item horizontally.
                    if (! movingVertically) {
                        position = getPlaceholderPosition(bounds, startPoint, mouseX, 'x');
                    }
                }

                if (position) {
                    insertPlaceholder(position, relatedTarget, placeholder);
                    startPoint.y = mouseY;
                    startPoint.x = mouseX;

                    _emit(SORT_EVENT, eventObject, data, { relatedTarget });
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

            if (getParent(placeholder) === list) {
                list.replaceChild(draggedItem, placeholder);
                placeholder = null;
            }

            let endList = toArray(getElement(ITEM_SELECTOR, list, true));
            let data = {
                placeholder,
                x: itemBounds.x,
                y: itemBounds.y,
                items: endList
            }

            inlineStyles(draggedItem);
            inlineStyles(HTML, { cursor: '' });

            itemClassList._remove([ITEM_DRAGGED_CLASSNAME, ELEVATION_CLASSNAME, config.active]);

            if (startList.some((item, index) => item !== endList[index])) {
                _emit(CHANGE_EVENT, eventObject, data);
            }

            if (startMoving) {
                _emit(END_EVENT, eventObject, data);
            }

            isDragging = startMoving = false;
        }
    }

    /**
     * Sets item position.
     *
     * @param {Number} x - Mouse X coordinate.
     * @param {Number} y - Mouse Y coordinate.
     * @param {Object} axis - Axis option.
     */
    const setItemPosition = (x, y, axis) => {
        if (axis !== 'x') {
            draggedItem.style.top = y - dragPoint.y + 'px';
        }

        if (axis !== 'y') {
            draggedItem.style.left = x - dragPoint.x + 'px';
        }
    }

    eventBinder._bind(list, 'pointerdown', dragStart);
    eventBinder._bind(ROOT, 'pointermove', dragMove);
    eventBinder._bind(ROOT, 'pointerup', dragEnd);
}