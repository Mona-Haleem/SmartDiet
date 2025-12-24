// FILE: static/js/sectionDetailsEditor.js
// FIXED: Alpine-safe detail content editor that preserves refs and bindings

export function createSectionDetailsEditor() {
  return {
    section: "",
    details: [],
    activeDetailIndex: null,
    showFormatBar: false,
    formatBarPosition: { x: 0, y: 0 },
    savedSelection: null,

    init() {
      this.$el.addEventListener("mouseup", (e) => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          // Save the selection before it gets lost
          this.savedSelection = this.saveSelection();
          
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          this.formatBarPosition = {
            x: rect.left + rect.width / 2,
            y: rect.top + window.scrollY - 50,
          };
          this.showFormatBar = true;
        } else {
          if (!e.target.closest('.format-bar')) {
            this.showFormatBar = false;
            this.savedSelection = null;
          }
        }
      });

      // Close format bar when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest('.format-bar') && !e.target.closest('.editable-content')) {
          this.showFormatBar = false;
          this.savedSelection = null;
        }
      });
    },

    saveSelection() {
      const sel = window.getSelection();
      if (sel.rangeCount === 0) return null;
      
      const range = sel.getRangeAt(0);
      const editableEl = range.startContainer.nodeType === 3
        ? range.startContainer.parentElement.closest(".editable-content")
        : range.startContainer.closest(".editable-content");
      
      if (!editableEl) return null;

      const preRange = range.cloneRange();
      preRange.selectNodeContents(editableEl);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      const end = start + range.toString().length;

      return { editableEl, start, end };
    },

    restoreSelection() {
      if (!this.savedSelection) return null;
      
      const { editableEl, start, end } = this.savedSelection;
      
      // Ensure the element still exists
      if (!document.contains(editableEl)) return null;

      let charCount = 0;
      const range = document.createRange();
      let startNode = null, endNode = null;
      let startOffset = 0, endOffset = 0;

      const walk = (node) => {
        if (node.nodeType === 3) {
          const len = node.textContent.length;
          if (!startNode && charCount + len >= start) {
            startNode = node;
            startOffset = start - charCount;
          }
          if (!endNode && charCount + len >= end) {
            endNode = node;
            endOffset = end - charCount;
            return true; // Stop walking
          }
          charCount += len;
        } else if (node.nodeType === 1) {
          for (let child of node.childNodes) {
            if (walk(child)) return true;
          }
        }
      };

      walk(editableEl);

      if (startNode && endNode) {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
      }

      return null;
    },

    applyFormat(formatType, value = null) {
      // Restore the saved selection
      const range = this.restoreSelection();
      if (!range) {
        this.showFormatBar = false;
        return;
      }

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      const editableEl = this.savedSelection.editableEl;
      const detailEl = editableEl.closest("[data-detail-index]");
      const detailIndex = parseInt(detailEl.dataset.detailIndex);
      
      // Get the correct model
      let targetModel = this.details[detailIndex];
      if (targetModel.type === 'ul' || targetModel.type === 'ol') {
        const listItemEl = editableEl.closest('li[data-item-index]');
        if (listItemEl) {
          const itemIndex = parseInt(listItemEl.dataset.itemIndex);
          if (itemIndex !== undefined && itemIndex !== null) {
            targetModel = targetModel.content[itemIndex];
          }
        }
      }

      // Sync current DOM content to model
      this.syncContentFromDOM(targetModel, editableEl);

      const isColor = formatType === 'color';
      const effect = isColor ? null : this.formatToEffect(formatType);

      // Calculate offsets from saved selection
      const offsets = { start: this.savedSelection.start, end: this.savedSelection.end };

      let shouldRemove = false;
      if (!isColor) {
        const fragments = this.getFragmentsInRange(targetModel, offsets.start, offsets.end);
        shouldRemove = fragments.length > 0 && fragments.every(f => (f.effects || []).includes(effect));
      }

      // Apply the formatting
      this.processEffectWithOffsets(targetModel, offsets.start, offsets.end, effect, isColor, value, shouldRemove);

      // CRITICAL: Let Alpine handle the update through reactivity
      // Don't manually update innerHTML - just trigger Alpine's reactivity
      // Alpine will re-render using x-html="renderContent(detail)" which preserves refs
      
      // Force Alpine to detect the change
      this.$nextTick(() => {
        // Alpine's x-html binding will automatically update the content
        // without breaking refs or event listeners
      });
      
      // Clear selection and close bar
      selection.removeAllRanges();
      this.showFormatBar = false;
      this.savedSelection = null;
    },

    processEffectWithOffsets(model, selStart, selEnd, effect, isColor, colorValue, shouldRemove) {
      // Ensure content is in fragment format
      if (typeof model.content === "string") {
        model.content = [{ effects: ["Default"], content: model.content, color: null }];
      }

      let currentPos = 0;
      const newFragments = [];

      model.content.forEach(frag => {
        const text = frag.content || "";
        const fragStart = currentPos;
        const fragEnd = currentPos + text.length;
        currentPos = fragEnd;

        const overlapStart = Math.max(fragStart, selStart);
        const overlapEnd = Math.min(fragEnd, selEnd);

        if (overlapStart < overlapEnd) {
          const localStart = overlapStart - fragStart;
          const localEnd = overlapEnd - fragStart;

          // Before selection
          if (localStart > 0) {
            newFragments.push({ ...frag, content: text.substring(0, localStart) });
          }

          // Inside selection - apply formatting
          let effects = [...(frag.effects || ["Default"])].filter(e => e !== "Default");
          let finalColor = frag.color || null;

          if (isColor) {
            finalColor = colorValue;
          } else {
            if (shouldRemove) {
              effects = effects.filter(e => e !== effect);
            } else {
              if (!effects.includes(effect)) effects.push(effect);
            }
          }
          
          newFragments.push({ 
            effects: effects.length ? effects : ["Default"], 
            content: text.substring(localStart, localEnd),
            color: finalColor ?? "#000",
            type :"p"
          });

          // After selection
          if (localEnd < text.length) {
            newFragments.push({ ...frag, content: text.substring(localEnd) });
          }
        } else {
          newFragments.push(frag);
        }
      });

      model.content = this.mergeAdjacentFragments(newFragments);
    },

    mergeAdjacentFragments(frags) {
      return frags.reduce((acc, curr) => {
        if (!acc.length) return [curr];
        const prev = acc[acc.length - 1];
        
        const sameEffects = JSON.stringify(prev.effects) === JSON.stringify(curr.effects);
        const sameColor = prev.color === curr.color;

        if (sameEffects && sameColor) {
          prev.content += curr.content;
        } else {
          acc.push(curr);
        }
        return acc;
      }, []);
    },

    renderContent(detail) {
      if (typeof detail.content === "string") {
        return this.escapeHtml(detail.content);
      }
      
      return (detail.content || []).map(f => {
        const classes = (f.effects || []).filter(e => e !== "Default");
        const styleAttr = f.color ? `style="color:${f.color}"` : "";
        const classAttr = classes.length ? `class="${classes.join(' ')}"` : "";
        
        if (classAttr || styleAttr) {
          return `<span ${classAttr} ${styleAttr}>${this.escapeHtml(f.content)}</span>`;
        }
        return this.escapeHtml(f.content);
      }).join("");
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    getFragmentsInRange(model, selStart, selEnd) {
      if (typeof model.content === "string") return [];
      
      let currentPos = 0;
      return (model.content || []).filter(f => {
        const len = (f.content || "").length;
        const overlap = Math.max(currentPos, selStart) < Math.min(currentPos + len, selEnd);
        currentPos += len;
        return overlap;
      });
    },

    formatToEffect(type) {
      const map = { 
        bold: "fw-bold", 
        italic: "fst-italic", 
        underline: "text-decoration-underline",
        "line-through": "text-decoration-line-through"
      };
      return map[type] || type;
    },

    syncContentFromDOM(model, el) {
      const text = el.textContent;
      if (typeof model.content === "string") {
        model.content = text;
      } else {
        const currentText = model.content.map(f => f.content).join("");
        if (currentText !== text) {
          // Text has changed, reset to simple format
          model.content = [{ effects: ["Default"], content: text, color: null }];
        }
      }
    },

    updateContent(idx, iidx, e) {
      const model = iidx !== null ? this.details[idx].content[iidx] : this.details[idx];
      this.syncContentFromDOM(model, e.target);
    },

    moveUp(idx) {
      if (idx === 0) return;
      [this.details[idx - 1], this.details[idx]] = [this.details[idx], this.details[idx - 1]];
    },

    moveDown(idx) {
      if (idx === this.details.length - 1) return;
      [this.details[idx], this.details[idx + 1]] = [this.details[idx + 1], this.details[idx]];
    },

    addParagraph() { 
      this.details.push({ type: "p", content: "" ,effect:[]}); 
    },

    addList(type) { 
      this.details.push({ type, content: [{ content: "" ,type:"p",effect:[]}] }); 
    },

    addListItem(idx) { 
      this.details[idx].content.push({ content: "" ,type:"p",effect:[]}); 
    },

    deleteDetail(idx) { 
      this.details.splice(idx, 1); 
    },

    deleteListItem(idx, iidx) { 
      if (this.details[idx].content.length === 1) {
        // If it's the last item, delete the whole list
        this.deleteDetail(idx);
      } else {
        this.details[idx].content.splice(iidx, 1);
      }
    },

    cancelEdit() { 
      window.eleObj.detailsEditor.cancel(); 
    },

    saveEdit() { 
      window.eleObj.detailsEditor.saveDetails(this.details); 
    },

    closeEditor() { 
      this.cancelEdit(); 
    }
  };
}