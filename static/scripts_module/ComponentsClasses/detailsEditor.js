// FILE 1: static/js/detailsEditor.js
// PURPOSE: Manages opening/closing the editor and saving to server
// CREATE THIS NEW FILE

import { queryService } from "../../common/script.js";

export default class DetailsEditor {
  constructor() {
    this.currentSectionId = null;
    this.editorInstance = null;
    this.originalData = null;
  }

  /**
   * Open the editor for a specific section
   */
  init(sectionId) {
    this.currentSectionId = sectionId;
    console.log("Initializing editor for section:", sectionId);
    // Get the main Alpine component
    const planComponent = Alpine.$data(
      document.querySelector('[x-data*="ele:"]')
    );
    const sectionData = planComponent.sections[sectionId].data;

    // Store original for cancel
    this.originalData = JSON.parse(JSON.stringify(sectionData));

    // Switch to editor mode
    planComponent.mode = "editor";

    // Wait for Alpine to render, then initialize editor
    this.$nextTick(() => {
      this.editorInstance = Alpine.$data(
        document.querySelector('[x-data*="createSectionDetailsEditor"]')
      );

      if (this.editorInstance) {
        this.editorInstance.section = sectionData.section;
        this.editorInstance.details = JSON.parse(
          JSON.stringify(sectionData.detail || [])
        );
        this.editorInstance.originalDetails = JSON.parse(
          JSON.stringify(sectionData.detail || [])
        );
        this.editorInstance.sectionId = sectionId;
      }
    });
  }

  /**
   * Save edited details to server
   */
  async saveDetails(updatedDetails) {
    if (!this.currentSectionId) {
      console.error("No section selected");
      return;
    }
    eleObj.$data.mode = "details";
    console.log(eleObj.$refs);

    const url = `/diet/collections/plans/sections/${this.currentSectionId}/`;
    console.log(url);
    return await queryService.query(
      ["updateDetails", this.currentSectionId, url],
      {
        queryFn: queryService.createQueryFn(
          url,
          "patch",
          JSON.stringify({ detail: updatedDetails })
        ),
        force: true,
        onSuccess: (ctx) => {
          console.log("Details saved successfully", eleObj);

          if (eleObj.$data.sections[this.currentSectionId]) {
            eleObj.$data.sections[this.currentSectionId].data.detail =
              updatedDetails;
          }

          const targetRef = eleObj.$refs[`section-${this.currentSectionId}`];
          if (targetRef && eleObj.swapContent) {
            eleObj.swapContent(ctx.data, targetRef.children[1]);
          }

          // Close editor
          let page = eleObj.sectionNavigator.getSectionPage(`section-${this.currentSectionId}`, eleObj.mode);
          eleObj.updateData(page);
          eleObj.onPaginate(undefined , page);
          this.cleanup();

          return ctx.data;
        },
        onError: (ctx) => {
          console.error("Error saving:", ctx);
          alert("Error saving changes. Please try again.");
        },
      }
    );
  }

  /**
   * Cancel editing and revert changes
   */
  cancel() {
    const planComponent = Alpine.$data(
      document.querySelector('[x-data*="ele:"]')
    );

    // Restore original data
    if (this.originalData && this.currentSectionId) {
      planComponent.sections[this.currentSectionId].data = JSON.parse(
        JSON.stringify(this.originalData)
      );
    }

    // Close editor
    planComponent.mode = "details";
    this.cleanup();
  }

  /**
   * Clean up state
   */
  cleanup() {
    this.currentSectionId = null;
    this.editorInstance = null;
    this.originalData = null;
  }

  /**
   * Helper for Alpine nextTick
   */
  $nextTick(callback) {
    if (typeof Alpine !== "undefined" && Alpine.nextTick) {
      Alpine.nextTick(callback);
    } else {
      setTimeout(callback, 0);
    }
  }
}
