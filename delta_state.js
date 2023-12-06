class GroceryList {
  constructor(name) {
    this.listName = name;
    this.products = {};
    this.commits = {
      FIRST_COMMIT: {
        changes: {
          added: {},
          removed: {},
          updated: {}
        }
      }
    };
    this.commitTimeline = ["FIRST_COMMIT"];
    this.lastCommitId = "FIRST_COMMIT";
    this.startCommit();
  }


  addProduct(productName, quantity) {

    if (this.doesProductExist(productName)) {
      console.error("ERROR: Trying to add item that already exists on list")
      return this
    }

    const addedChanges = this.currentChanges.changes.added;
    const removedChanges = this.currentChanges.changes.removed;
    const updatedChanges = this.currentChanges.changes.updated;

    // Check if the product is marked for removal in the same commit
    if (removedChanges && removedChanges.hasOwnProperty(productName)) {
      const currentQuantity = this.products[productName] || 0;

      if (quantity !== currentQuantity) {
        // If the quantity is different, treat it as an update in the updated changes
        updatedChanges[productName] = {
          oldQuantity: currentQuantity,
          newQuantity: quantity
        };
      }

      // Remove it from the removed changes
      delete removedChanges[productName];
    } else {

      // Otherwise, add the product to the added changes
      addedChanges[productName] = quantity;

    }

    this.hasUnsavedChanges = true;

    return this;
  }

  removeProduct(productName) {

    if (!this.doesProductExist(productName)) {
      console.error("ERROR: Trying to remove item that is not on list")
      return this
    }

    const addedChanges = this.currentChanges.changes.added;
    const updatedChanges = this.currentChanges.changes.updated;
    const removedChanges = this.currentChanges.changes.removed;

    if (addedChanges && addedChanges.hasOwnProperty(productName)) {
      // If the product is in the added changes, remove it from there
      delete addedChanges[productName];
    } else {
      // Otherwise, mark it as removed in the removed changes
      removedChanges[productName] = 0;
    }

    // if updates were queued to the item, just removed them because item it's being deleted
    if (updatedChanges && updatedChanges.hasOwnProperty(productName)) {
      // If the product is in the updated changes, remove it from there
      delete updatedChanges[productName];
    }

    this.hasUnsavedChanges = true;

    return this;
  }


  updateProductCount(productName, newQuantity) {

    if (!this.doesProductExist(productName)) {
      console.error("ERROR: Trying to update item that is not on list")
      return this
    }


    const addedChanges = this.currentChanges.changes.added;
    const updatedChanges = this.currentChanges.changes.updated;

    if (addedChanges && addedChanges.hasOwnProperty(productName)) {
      // If the product is already added, update the quantity in the added section
      addedChanges[productName] = newQuantity;
    } else {
      // Otherwise, update the quantity in the updated section
      const currentQuantity = this.products[productName] || 0;
      updatedChanges[productName] = {
        oldQuantity: currentQuantity,
        newQuantity
      };
    }

    this.hasUnsavedChanges = true;

    return this;
  }

  startCommit() {
    this.currentChanges = {
      changes: {
        added: {},
        removed: {},
        updated: {},
      },
    };

    this.hasUnsavedChanges = false

    return this;
  }


  commit() {
    // Create a new commit
    const commitId = `commit_${this.commitTimeline.length}`;
    this.commits[commitId] = {
      changes: {
        added: {},
        removed: {},
        updated: {},
      },
    };

    // Apply the specified changes to the new commit
    if (this.currentChanges) {
      // Update the changes only in the final commit
      Object.assign(
        this.commits[commitId].changes.added,
        this.currentChanges.changes.added
      );
      Object.assign(
        this.commits[commitId].changes.removed,
        this.currentChanges.changes.removed
      );
      Object.assign(
        this.commits[commitId].changes.updated,
        this.currentChanges.changes.updated
      );

      // Update the products field with the changes in the final commit
      Object.keys(this.currentChanges.changes.added).forEach((productName) => {
        this.products[productName] = this.currentChanges.changes.added[productName];
      });

      Object.keys(this.currentChanges.changes.updated).forEach((productName) => {
        this.products[productName] = this.currentChanges.changes.updated[productName].newQuantity;
      });

      // Remove the products that were marked as removed in the final commit
      Object.keys(this.currentChanges.changes.removed).forEach((productName) => {
        delete this.products[productName];
      });

      // Reset the current commit
      this.currentChanges = null;
    }

    // Update the commit timeline and last commit ID
    this.commitTimeline.push(commitId);
    this.lastCommitId = commitId;

    // Start a new commit automatically
    this.startCommit();

    return this;
  }

  readGroceryList() {
    console.log(JSON.stringify(this, null, 2));
  }

  doesProductExist(productName) {
    // Check if the product exists in the current list
    if (this.currentChanges) {
      const current = this.currentChanges;
      if (
        current.changes.added.hasOwnProperty(productName) ||
        current.changes.updated.hasOwnProperty(productName)
      ) {
        return true;
      }
    }

    // Check if the product exists in the current products
    if (this.products && this.products.hasOwnProperty(productName)) {
      return true;
    }

    return false;
  }


}

// Example Usage:

// Create a new grocery list with the FIRST_COMMIT
const myList = new GroceryList("LISTA NOVA");

// Add products to the temporary "current commit"
myList.addProduct("batata frita", 3);
myList.addProduct("milk", 1);

// Remove a product from the temporary "current commit"
myList.removeProduct("batata frita");

// Update the count of an existing product in the temporary "current commit"
myList.updateProductCount("milk", 2);

// Make a commit to apply the changes
myList.commit()

// Read and print the grocery list after making the commit
myList.readGroceryList();




